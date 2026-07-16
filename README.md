# 🌍 HintLocale v2.3

Zero-dependency locale detection for **browsers and servers**. Identifies the user's **languages** and **country** using browser signals or HTTP headers — no external APIs, no cookies.

Works with `<script>`, `require()`, `import` — single file, ~28 KB (~9 KB gzipped).

## Quick start

### Browser

```html
<script src="hint-locale.js"></script>
<script>
  var result = HintLocale.detect();
  console.log(result.topCountry);  // "IL"
  console.log(result.topLanguage); // "he"
</script>
```

### Node.js

```js
const HintLocale = require('./hint-locale.js');

const result = HintLocale.detect({
  languages: ['he-IL', 'en-US'],
  timezone: 'Asia/Jerusalem'
});
// result.topCountry → "IL"  (confidence: 1.0)
```

### ES Modules

```js
import HintLocale from './hint-locale.js';
```

---

## What's new in 2.3

- **`residenceCountry`** — new result field: the country your *timezone* points to ("where you are"), separate from `topCountry` ("best overall blend of identity + location"). See [Identity vs. location](#identity-vs-location) below.
- **Modern IANA zones** — added `Europe/Kyiv` (the 2022 rename that modern Chrome/Firefox actually report), `America/Ciudad_Juarez`, `America/Coyhaique`. Old spellings still work.
- **Legacy language aliases** — `iw`→`he`, `in`→`id`, `ji`→`yi`, `fil`→`tl` (still emitted by older Java stacks and some Androids).
- **Honest confidence without a timezone** — the cross-signal bonus is no longer counted toward the theoretical max when a timezone isn't available, so perfect agreement of the *available* signals now yields confidence 1.0.
- **Correct "language of where you live" boost** — the reranking boost now derives from the timezone country itself, not from the top-ranked country (which can be region-subtag-driven).
- **Input tolerance** — `detect({ languages: "he-IL" })` (a bare string) is accepted; `Accept-Language` q-values are clamped to `[0,1]` per RFC 9110.

---

## Identity vs. location

Timezone tells you where the user **is**. Language + region subtags tell you who the user **is**. These can disagree — an Israeli living in Bogotá sends `he-IL` but reports `America/Bogota`.

HintLocale exposes both answers:

| Field | Meaning | Use for |
|---|---|---|
| `topCountry` | Best blend of all signals (explicit region subtag is weighted highest) | Content/culture personalization, default phone prefix |
| `residenceCountry` | The timezone country, `null` without a timezone | Checkout country pre-fill, shipping, currency, local regulations |

```js
HintLocale.detect({ languages: ['he-IL', 'es', 'en'], timezone: 'America/Bogota' });
// topCountry:       "IL"  — who they are
// residenceCountry: "CO"  — where they are
```

---

## How scoring works

HintLocale collects independent signals and weighs them:

| Signal | Source | Points | Why |
|---|---|---|---|
| **Region subtag** | `navigator.languages` (`en-US` → `US`) | 40 × position decay | Explicit region is the strongest user intent |
| **Timezone** | `Intl.DateTimeFormat` (`Asia/Jerusalem` → `IL`) | 30 + up to 25 uniqueness | Narrows to a small set of countries |
| **Cross-bonus** | Region + timezone both point to same country | +10 | Two independent signals agreeing = very high confidence |
| **Language match** | Country speaks one of the detected languages | up to 20 × rarity × decay | Weighted by **language rarity** (see below) |
| **Primary language** | User's language = country's primary language | +5 | Distinguishes France from Belgium for `fr` |

**Maximum score: 130.**

### Adaptive confidence

Confidence is **not** `score / 130`. The denominator adapts to which signals were actually available:

- No region subtags → the 40 (+10 cross) points are unreachable, so they're excluded from the max.
- No timezone → the 30+25 timezone points (and the +10 cross-bonus) are excluded.
- No languages → the 20+5 language points are excluded.

So confidence answers *"how well do the available signals agree?"* — `he-IL` alone, with no timezone at all, still yields confidence 1.0 because every signal that exists points to Israel.

### Language rarity — solving the "English problem"

English is spoken in **124 countries**. Hebrew in **1**. If a user's browser reports `he`, that's a near-certain signal for Israel. If it reports `en`, it tells us almost nothing.

HintLocale assigns each language a **rarity score**:

```
rarity = 1 / (number of countries speaking that language)
```

| Language | Countries | Rarity |
|---|---|---|
| Hebrew | 1 | 1.000 |
| Japanese | 2 | 0.500 |
| German | 11 | 0.091 |
| Arabic | 28 | 0.036 |
| French | 59 | 0.017 |
| English | 124 | 0.008 |

The language-match score is multiplied by this rarity (capped via `min(rarity × 3, 1)`), so rare languages contribute far more to the final score.

### Primary vs secondary language

Each country has an ordered language list. The **first language is primary** (e.g. Hebrew for Israel, French for France). When the user's language matches a country's primary language, it gets a bonus. This helps distinguish between France (French primary) and Belgium (French secondary).

### Language position decay

The user's language list is ordered by preference. `navigator.languages = ['he', 'en', 'fr']` means Hebrew is #1. Later languages contribute progressively less to scoring:

```
factor = 1 / (1 + position × 0.35)   → pos 0: ×1.00, pos 1: ×0.74, pos 2: ×0.59
```

### Language reranking

The order in `navigator.languages` is often OS-driven, not preference-driven (a Japanese developer with an English OS sends `['en', 'ja']`). The `languages` array in the result is **reranked**:

```
effectiveWeight = positionBase × tzBoost × rarityBoost × osDefaultPenalty
```

- **positionBase** — `1/(1 + pos × 0.35)`, original order still matters
- **tzBoost** — ×2.0 if the language is primary in the *timezone* country, ×1.6 if secondary there
- **rarityBoost** — `1 + rarity × 1.5` — a rare language was chosen deliberately (`he` → ×2.5, `en` → ×1.01)
- **osDefaultPenalty** — ×0.6 when a very common language (rarity < 0.02) sits at position 0 *and* isn't spoken in the timezone country — catches "English at pos 0 is just the OS language"

---

## API

### `HintLocale.detect([overrides])`

```js
HintLocale.detect({
  languages: ['he-IL', 'en-US'],  // override navigator.languages (a bare string is OK too)
  timezone: 'Asia/Jerusalem'       // override Intl timezone
});
```

Returns:

```js
{
  topCountry: "IL",           // best overall blend
  residenceCountry: "IL",     // timezone country ("where you are"), null without timezone
  topLanguage: "he",
  timezone: "Asia/Jerusalem",
  languages: [                // reranked by weight (see above)
    { code: "he", name: "עברית",  rarity: 1.0,   countriesCount: 1,
      originalPosition: 0, weight: 5.0 },
    { code: "en", name: "English", rarity: 0.008, countriesCount: 124,
      originalPosition: 1, weight: 0.9 }
  ],
  countries: [
    { code: "IL", score: 125.0, confidence: 1.0 },
    { code: "US", score: 30.2,  confidence: 0.24 }
  ],
  signals: {
    navigatorRegions: [ { code: "IL", position: 0 }, { code: "US", position: 1 } ],
    timezoneCountries: ["IL"],
    timezoneUniqueness: 1,    // 1 / number of countries sharing the timezone
    detectedLanguages: ["he", "en"]
  }
}
```

### `HintLocale.getCountry(code)`

```js
HintLocale.getCountry("IL");
// { code:"IL", numericCode:376, callingCode:972,
//   languages:["he","ar","en"], primaryLanguage:"he" }
```

### `HintLocale.getLanguageName(code)`

```js
HintLocale.getLanguageName("he"); // "עברית"
```

### `HintLocale.getLanguageRarity(code)`

```js
HintLocale.getLanguageRarity("he"); // 1.0 (unique to 1 country)
HintLocale.getLanguageRarity("en"); // 0.008 (124 countries)
```

### `HintLocale.countriesForLanguage(code)`

Returns array with primary/secondary distinction:

```js
HintLocale.countriesForLanguage("fr");
// [
//   { code: "FR", isPrimary: true },
//   { code: "BE", isPrimary: false },
//   ...
// ]
```

### `HintLocale.countriesForTimezone(tz)`

```js
HintLocale.countriesForTimezone("Europe/Berlin"); // ["DE"]
HintLocale.countriesForTimezone("Europe/Kyiv");   // ["UA"]  (Europe/Kiev also works)
```

### `HintLocale.parseAcceptLanguage(header)`

Parse an HTTP `Accept-Language` header into a sorted language array. Quality values are clamped to `[0,1]`; `*` is stripped.

```js
HintLocale.parseAcceptLanguage("he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7");
// ["he-IL", "he", "en-US", "en"]
```

### `HintLocale.fromRequest(req, [extra])`

Server-side convenience — reads the `Accept-Language` header from any HTTP request object (case-insensitive lookup, array values supported):

```js
const result = HintLocale.fromRequest(req, { timezone: "America/Bogota" });
// result.topCountry       → "IL" or "CO" depending on signals
// result.residenceCountry → "CO"
// result.topLanguage      → "he"
```

---

## Server-side usage

HintLocale works on the server by reading the `Accept-Language` HTTP header.

### Basic — raw Node.js HTTP

```js
const http = require("http");
const HintLocale = require("hint-locale");

http.createServer((req, res) => {
  const locale = HintLocale.fromRequest(req);

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    country: locale.topCountry,    // "IL"
    language: locale.topLanguage,  // "he"
    confidence: locale.countries[0]?.confidence  // 0.85
  }));
}).listen(3000);
```

Works with any Node.js HTTP request object (raw `http`, Express, Koa, Fastify, Hono).

### Language-based redirect

```js
const locale = HintLocale.fromRequest(req);
const lang = locale.topLanguage || "en";

res.writeHead(302, { Location: "/" + lang + "/" });
res.end();
// Israeli user → /he/
// Japanese user → /ja/
// Everyone else → /en/
```

### With timezone (higher accuracy)

The timezone isn't in HTTP headers, but you can send it from the client once and pass it as a cookie or query parameter:

```html
<!-- Client-side: send timezone on first visit -->
<script>
  if (!document.cookie.includes("tz=")) {
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    document.cookie = "tz=" + tz + ";path=/;max-age=31536000";
    location.reload();
  }
</script>
```

```js
// Server-side: read timezone from cookie and pass it
const cookies = parseCookies(req.headers.cookie); // your cookie parser
const locale = HintLocale.fromRequest(req, { timezone: cookies.tz });

locale.residenceCountry; // "CO" — where the user actually is
locale.topLanguage;      // "he"
```

### Without timezone

Without timezone the library still works — rare languages like Hebrew, Japanese, and Korean still give high confidence (`residenceCountry` will be `null`). Common languages like English give lower confidence since they're spoken in 124 countries.

```js
const locale = HintLocale.fromRequest(req);
// Accept-Language: he-IL,en;q=0.8
// → topCountry: "IL", confidence: 1.0 (all available signals agree)

// Accept-Language: en
// → topCountry: "US", confidence: low (English is everywhere)
```

---

## Data format (compact packed strings)

All data is stored as **packed strings** parsed once on first call:

| Data | Format | Example |
|---|---|---|
| Countries | `CC,numeric,calling,lang1.lang2\|...` pipe-delimited | `IL,376,972,he.ar.en\|US,840,1,en.es.haw.fr` |
| Timezones | `tz>CC1.CC2;tz>CC3` — inverted index | `Asia/Jerusalem>IL;Asia/Tokyo>JP` |
| Lang names | `code:name,code:name` | `he:עברית,en:English` |

Each timezone string appears **once** instead of once per country. The first language in each country's list is the primary language.

> **Note:** the timezone format supports multiple countries per zone (`tz>CC1.CC2`) and `signals.timezoneUniqueness` reflects it, but the current dataset maps each reported zone to a single country — in practice browsers (via CLDR) keep reporting country-specific zone IDs like `Europe/Oslo` even after IANA merged them into `Europe/Berlin`, so a 1:1 mapping is the accurate model of what `Intl` actually returns.

---

## Known limitations

- **Numeric UN M.49 regions** (`es-419` — Latin American Spanish) carry no single country and are ignored for region scoring; the language part (`es`) is still used.
- Timezone lookup is **case-sensitive**, matching what `Intl.DateTimeFormat().resolvedOptions().timeZone` returns.
- `Etc/UTC` / `UTC` (common on servers and VMs) map to no country — detection gracefully falls back to language signals.

---

## Use cases

- **Auto-select language** on first visit without a server round-trip
- **Pre-fill country** in registration / checkout forms — use `residenceCountry`
- **Show localized currency** before user explicitly chooses
- **A/B testing by region** — entirely client-side
- **Server-side rendering** — pass `Accept-Language` header values as overrides

---

## Browser support

Uses `var`, no arrow functions, no ES6 built-ins → works in **IE11+** and all modern browsers. Timezone detection requires `Intl.DateTimeFormat` (IE11+ / Chrome 24+ / Firefox 29+ / Safari 10+). Gracefully degrades without timezone.

---

## Changelog

### 2.3.0
- Added `residenceCountry` to `detect()` / `fromRequest()` results
- Added `Europe/Kyiv`, `America/Ciudad_Juarez`, `America/Coyhaique` (old names retained)
- Legacy language aliases: `iw`→`he`, `in`→`id`, `ji`→`yi`, `fil`→`tl`
- Confidence: cross-bonus excluded from the adaptive max when no timezone is present
- Reranking: `tzBoost` now derived from the timezone country, not the top-ranked country
- `detect({ languages: "string" })` accepted; Accept-Language q-values clamped to `[0,1]`

### 2.2.0
- Server-side support: `parseAcceptLanguage`, `fromRequest`
- Adaptive confidence max, language reranking, position decay

---

## License

MIT
