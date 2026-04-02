# 🌍 HintLocale v2.1

Zero-dependency client-side locale detection. Identifies the user's **languages** and **country** using browser signals — no server, no cookies, no API calls.

Works in **browsers** and **Node.js** from a single file (~24 KB, ~8 KB gzipped).

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
