# 🌍 HintLocale v2.2

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

## How scoring works

HintLocale collects **three independent signals** and weighs them:

| Signal | Source | Points | Why |
|---|---|---|---|
| **Region subtag** | `navigator.languages` (`en-US` → `US`) | 40 | Explicit region is the strongest user intent |
| **Timezone** | `Intl.DateTimeFormat` (`Asia/Jerusalem` → `IL`) | 30 | Narrows to a small set of countries |
| **Cross-bonus** | Region + timezone both point to same country | +10 | Two independent signals agreeing = very high confidence |
| **Language match** | Country speaks one of the detected languages | up to 25 | Weighted by **language rarity** (see below) |
| **Primary language** | User's #1 language = country's primary language | 5 | Tiebreaker signal |

**Maximum score: 110** — confidence = score / 110.

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

The language-match score is multiplied by this rarity, so rare languages contribute far more to the final score.

### Primary vs secondary language

Each country has an ordered language list. The **first language is primary** (e.g. Hebrew for Israel, French for France). When the user's primary language matches a country's primary language, it gets a bonus. This helps distinguish between France (French primary) and Belgium (French secondary).

### Language position decay

The user's language list is also ordered by preference. `navigator.languages = ['he', 'en', 'fr']` means Hebrew is #1, English is #2. Later languages contribute progressively less to scoring (divided by `1 + i * 0.4`).

---

## API

### `HintLocale.detect([overrides])`

```js
HintLocale.detect({
  languages: ['he-IL', 'en-US'],  // override navigator.languages
  timezone: 'Asia/Jerusalem'       // override Intl timezone
});
```

Returns:

```js
{
  topCountry: "IL",
  topLanguage: "he",
  timezone: "Asia/Jerusalem",
  languages: [
    { code: "he", name: "עברית", rarity: 1.0, countriesCount: 1 },
    { code: "en", name: "English", rarity: 0.008, countriesCount: 124 }
  ],
  countries: [
    { code: "IL", score: 105.0, confidence: 0.95 },
    { code: "US", score: 40.2,  confidence: 0.37 }
  ],
  signals: {
    navigatorRegions: ["IL", "US"],
    timezoneCountries: ["IL"],
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
```

### `HintLocale.parseAcceptLanguage(header)`

Parse an HTTP `Accept-Language` header into a sorted language array:

```js
HintLocale.parseAcceptLanguage("he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7");
// ["he-IL", "he", "en-US", "en"]
```

### `HintLocale.fromRequest(req, [extra])`

Server-side convenience — reads the `Accept-Language` header from any HTTP request object:

```js
const result = HintLocale.fromRequest(req, { timezone: "America/Bogota" });
// result.topCountry → "CO"
// result.topLanguage → "he"
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

That's it. `fromRequest` reads the `Accept-Language` header automatically — works with any Node.js HTTP request object (raw `http`, Express, Koa, Fastify, Hono).

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

locale.topCountry;   // "CO" (much more accurate with timezone)
locale.topLanguage;  // "he"
```

### Without timezone

Without timezone the library still works — rare languages like Hebrew, Japanese, and Korean still give high confidence. Common languages like English give lower confidence since they're spoken in 124 countries.

```js
const locale = HintLocale.fromRequest(req);
// Accept-Language: he-IL,en;q=0.8
// → topCountry: "IL", confidence: 0.85 (Hebrew is unique to Israel)

// Accept-Language: en
// → topCountry: "US", confidence: 0.22 (English is everywhere — low confidence)
```

---

## Data format (compact packed strings)

All data is stored as **packed strings** parsed once on first call:

| Data | Format | Example |
|---|---|---|
| Countries | `CC,numeric,calling,lang1.lang2\|...` pipe-delimited | `IL,376,972,he.ar.en\|US,840,1,en.es.haw.fr` |
| Timezones | `tz>CC1.CC2;tz>CC3` — inverted index | `Asia/Jerusalem>IL;Asia/Tokyo>JP` |
| Lang names | `code:name,code:name` | `he:עברית,en:English` |

This eliminates all string duplication: each timezone string appears **once** instead of once per country that uses it. First language in each country's list is the primary language.

---

## Use cases

- **Auto-select language** on first visit without a server round-trip
- **Pre-fill country** in registration / checkout forms
- **Show localized currency** before user explicitly chooses
- **A/B testing by region** — entirely client-side
- **Server-side rendering** — pass `Accept-Language` header values as overrides

---

## Browser support

Uses `var`, no arrow functions, no ES6 built-ins → works in **IE11+** and all modern browsers. Timezone detection requires `Intl.DateTimeFormat` (IE11+ / Chrome 24+ / Firefox 29+ / Safari 10+). Gracefully degrades without timezone.

---

## License

MIT
