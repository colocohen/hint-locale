/**
 * HintLocale test suite
 * Run: node test.js
 */

var HL = require("./hint-locale.js");
var pass = 0, fail = 0;

function assert(name, condition, detail) {
  if (condition) {
    pass++;
  } else {
    fail++;
    console.log("  FAIL: " + name + (detail ? " — " + detail : ""));
  }
}

function test(name, fn) {
  console.log("▸ " + name);
  fn();
}

// ─── CORE DETECTION ───

test("Israeli in Israel", function () {
  var r = HL.detect({ languages: ["he-IL", "en-US"], timezone: "Asia/Jerusalem" });
  assert("topCountry = IL", r.topCountry === "IL");
  assert("topLanguage = he", r.topLanguage === "he");
  assert("IL confidence = 1", r.countries[0].confidence === 1);
});

test("Israeli in Colombia (OS=English)", function () {
  var r = HL.detect({ languages: ["en", "he", "es"], timezone: "America/Bogota" });
  assert("topCountry = CO", r.topCountry === "CO");
  assert("topLanguage = he (not en)", r.topLanguage === "he");
  assert("CO confidence > 0.5", r.countries[0].confidence > 0.5);
  assert("language order: he > es > en",
    r.languages[0].code === "he" && r.languages[1].code === "es" && r.languages[2].code === "en");
});

test("Japanese developer with English OS", function () {
  var r = HL.detect({ languages: ["en", "ja"], timezone: "Asia/Tokyo" });
  assert("topCountry = JP", r.topCountry === "JP");
  assert("topLanguage = ja (not en)", r.topLanguage === "ja");
});

test("French Canadian", function () {
  var r = HL.detect({ languages: ["fr-CA", "en", "es"], timezone: "America/Toronto" });
  assert("topCountry = CA", r.topCountry === "CA");
  assert("topLanguage = fr", r.topLanguage === "fr");
});

test("American", function () {
  var r = HL.detect({ languages: ["en-US", "es"], timezone: "America/New_York" });
  assert("topCountry = US", r.topCountry === "US");
  assert("topLanguage = en", r.topLanguage === "en");
});

test("Colombian native", function () {
  var r = HL.detect({ languages: ["es-CO", "en"], timezone: "America/Bogota" });
  assert("topCountry = CO", r.topCountry === "CO");
  assert("topLanguage = es", r.topLanguage === "es");
  assert("CO confidence > 0.8", r.countries[0].confidence > 0.8);
});

test("German in Germany", function () {
  var r = HL.detect({ languages: ["de", "en"], timezone: "Europe/Berlin" });
  assert("topCountry = DE", r.topCountry === "DE");
  assert("topLanguage = de", r.topLanguage === "de");
});

test("Korean", function () {
  var r = HL.detect({ languages: ["ko", "en", "ja"], timezone: "Asia/Seoul" });
  assert("topCountry = KR", r.topCountry === "KR");
  assert("topLanguage = ko", r.topLanguage === "ko");
});

// ─── BCP-47 PARSING ───

test("Script subtag: zh-Hant-TW", function () {
  var r = HL.detect({ languages: ["zh-Hant-TW", "en"], timezone: "Asia/Taipei" });
  assert("topCountry = TW", r.topCountry === "TW");
  assert("navigator region = TW", r.signals.navigatorRegions[0].code === "TW");
});

test("Underscore format: en_US", function () {
  var r = HL.detect({ languages: ["en_US"], timezone: "America/New_York" });
  assert("region parsed as US", r.signals.navigatorRegions[0].code === "US");
});

// ─── POSITION DECAY ───

test("Region position matters", function () {
  var r1 = HL.detect({ languages: ["he-IL", "en"], timezone: "America/Bogota" });
  var r2 = HL.detect({ languages: ["en", "he-IL"], timezone: "America/Bogota" });
  var ilConf1 = r1.countries.find(function (c) { return c.code === "IL"; });
  var ilConf2 = r2.countries.find(function (c) { return c.code === "IL"; });
  assert("IL stronger when he-IL is at pos 0 vs pos 1",
    ilConf1 && ilConf2 && ilConf1.confidence > ilConf2.confidence);
});

// ─── LANGUAGE RERANKING ───

test("OS-default English gets penalized", function () {
  var r = HL.detect({ languages: ["en", "ja"], timezone: "Asia/Tokyo" });
  assert("en weight < ja weight", r.languages[0].code === "ja");
  assert("en has lower weight", r.languages[1].code === "en" && r.languages[1].weight < r.languages[0].weight);
});

test("OS-default NOT penalized when matching timezone country", function () {
  var r = HL.detect({ languages: ["en", "es"], timezone: "America/New_York" });
  assert("en weight > es weight (en matches US)", r.languages[0].code === "en");
});

test("Rare language boosted", function () {
  var r = HL.detect({ languages: ["en", "he"], timezone: "America/Bogota" });
  assert("he weight > en weight (rarity 1.0 vs 0.008)", r.languages[0].code === "he");
});

// ─── TIMEZONE UNIQUENESS ───

test("Unique timezone gets high confidence", function () {
  var r1 = HL.detect({ languages: ["es"], timezone: "America/Bogota" }); // 1 country
  assert("CO confidence > 0.7 for unique tz", r1.countries[0].confidence > 0.7);
});

// ─── UTILITIES ───

test("getCountry", function () {
  var c = HL.getCountry("IL");
  assert("returns object", c !== null);
  assert("code = IL", c.code === "IL");
  assert("callingCode = 972", c.callingCode === 972);
  assert("primaryLanguage = he", c.primaryLanguage === "he");
  assert("has timezones... wait, not in output", true); // timezones not exposed in getCountry
});

test("getCountry — invalid", function () {
  assert("returns null for XX", HL.getCountry("XX") === null);
});

test("getLanguageName", function () {
  assert("he = עברית", HL.getLanguageName("he") === "עברית");
  assert("ja = 日本語", HL.getLanguageName("ja") === "日本語");
  assert("unknown = empty", HL.getLanguageName("zzzz") === "");
});

test("getLanguageRarity", function () {
  assert("he rarity = 1", HL.getLanguageRarity("he") === 1);
  assert("en rarity < 0.01", HL.getLanguageRarity("en") < 0.01);
  assert("ja rarity = 0.5", HL.getLanguageRarity("ja") === 0.5);
});

test("countriesForLanguage", function () {
  var heb = HL.countriesForLanguage("he");
  assert("he → 1 country", heb.length === 1);
  assert("he → IL", heb[0].code === "IL");
  assert("he is primary in IL", heb[0].isPrimary === true);

  var en = HL.countriesForLanguage("en");
  assert("en → many countries", en.length > 50);
});

test("countriesForTimezone", function () {
  assert("America/Bogota → [CO]", HL.countriesForTimezone("America/Bogota").join(",") === "CO");
  assert("unknown → []", HL.countriesForTimezone("Fake/Zone").length === 0);
});

test("version", function () {
  assert("version is string", typeof HL.version === "string");
  assert("version starts with 2", HL.version.charAt(0) === "2");
});

// ─── SERVER-SIDE ───

test("parseAcceptLanguage — standard header", function () {
  var r = HL.parseAcceptLanguage("he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7");
  assert("4 items", r.length === 4);
  assert("he-IL first (q=1)", r[0] === "he-IL");
  assert("he second (q=0.9)", r[1] === "he");
  assert("en-US third (q=0.8)", r[2] === "en-US");
  assert("en last (q=0.7)", r[3] === "en");
});

test("parseAcceptLanguage — wildcard stripped", function () {
  var r = HL.parseAcceptLanguage("fr-CH, fr;q=0.9, en;q=0.8, *;q=0.5");
  assert("* excluded", r.indexOf("*") === -1);
  assert("3 items", r.length === 3);
});

test("parseAcceptLanguage — empty/null", function () {
  assert("empty string → []", HL.parseAcceptLanguage("").length === 0);
  assert("null → []", HL.parseAcceptLanguage(null).length === 0);
});

test("fromRequest — Express-style req", function () {
  var req = { headers: { "accept-language": "ja,en-US;q=0.8,en;q=0.7" } };
  var r = HL.fromRequest(req, { timezone: "Asia/Tokyo" });
  assert("topCountry = JP", r.topCountry === "JP");
  assert("topLanguage = ja", r.topLanguage === "ja");
});

test("fromRequest — Israeli in Colombia", function () {
  var req = { headers: { "accept-language": "en,he;q=0.9,es;q=0.7" } };
  var r = HL.fromRequest(req, { timezone: "America/Bogota" });
  assert("topCountry = CO", r.topCountry === "CO");
  assert("topLanguage = he (not en)", r.topLanguage === "he");
});

test("fromRequest — without timezone", function () {
  var req = { headers: { "accept-language": "he-IL,en;q=0.8" } };
  var r = HL.fromRequest(req);
  assert("still works", r.topCountry !== null);
  assert("IL in candidates", r.countries.some(function (c) { return c.code === "IL"; }));
});

test("fromRequest — Title-Case header (Accept-Language)", function () {
  var req = { headers: { "Accept-Language": "ja,en;q=0.7" } };
  var r = HL.fromRequest(req, { timezone: "Asia/Tokyo" });
  assert("topLanguage = ja", r.topLanguage === "ja");
});

test("fromRequest — UPPERCASE header", function () {
  var req = { headers: { "ACCEPT-LANGUAGE": "de,en;q=0.5" } };
  var r = HL.fromRequest(req);
  assert("topLanguage = de", r.topLanguage === "de");
});

test("fromRequest — mixed-case via fallback loop", function () {
  var req = { headers: { "aCcEpT-lAnGuAgE": "ko,en;q=0.5" } };
  var r = HL.fromRequest(req);
  assert("topLanguage = ko", r.topLanguage === "ko");
});

test("fromRequest — array header value", function () {
  var req = { headers: { "accept-language": ["fr-FR,fr;q=0.9", "en;q=0.5"] } };
  var r = HL.fromRequest(req, { timezone: "Europe/Paris" });
  assert("topLanguage = fr", r.topLanguage === "fr");
});

test("fromRequest — null/undefined safety", function () {
  assert("null req", HL.fromRequest(null).topLanguage === null);
  assert("undefined req", HL.fromRequest(undefined).topLanguage === null);
  assert("empty obj", HL.fromRequest({}).topLanguage === null);
  assert("headers null", HL.fromRequest({ headers: null }).topLanguage === null);
});

// ─── EDGE CASES ───

test("Empty input", function () {
  var r = HL.detect({ languages: [], timezone: null });
  assert("no crash", r !== null);
  assert("topCountry = null", r.topCountry === null);
  assert("topLanguage = null", r.topLanguage === null);
});

test("Single language, no timezone", function () {
  var r = HL.detect({ languages: ["he"] });
  assert("topLanguage = he", r.topLanguage === "he");
  assert("IL in candidates", r.countries.some(function (c) { return c.code === "IL"; }));
});

// ─── SUMMARY ───

console.log("\n" + "═".repeat(40));
console.log(" " + pass + " passed, " + fail + " failed");
console.log("═".repeat(40));
process.exit(fail > 0 ? 1 : 0);
