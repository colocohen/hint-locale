declare module "hint-locale" {
  export interface DetectOptions {
    /** Override navigator.languages, e.g. ["he-IL", "en-US"] */
    languages?: string[];
    /** Override Intl timezone, e.g. "Asia/Jerusalem" */
    timezone?: string;
  }

  export interface LanguageResult {
    /** ISO 639-1 code, e.g. "he" */
    code: string;
    /** Native display name, e.g. "עברית" */
    name: string;
    /** Rarity score 0–1. 1 = unique to one country, 0.008 = very common */
    rarity: number;
    /** Number of countries that speak this language */
    countriesCount: number;
    /** Original position in navigator.languages (before reranking) */
    originalPosition: number;
    /** Effective weight after reranking (higher = more likely the user's true preference) */
    weight: number;
  }

  export interface CountryResult {
    /** ISO 3166-1 alpha-2 code, e.g. "IL" */
    code: string;
    /** Raw score */
    score: number;
    /** Confidence 0–1 (score normalized against achievable max) */
    confidence: number;
  }

  export interface NavigatorRegionSignal {
    /** ISO 3166-1 alpha-2 code */
    code: string;
    /** Position in navigator.languages where this region was found */
    position: number;
  }

  export interface DetectSignals {
    navigatorRegions: NavigatorRegionSignal[];
    timezoneCountries: string[];
    timezoneUniqueness: number;
    detectedLanguages: string[];
  }

  export interface DetectResult {
    /** Reranked languages — sorted by effective weight, not original position */
    languages: LanguageResult[];
    /** Candidate countries sorted by confidence (descending) */
    countries: CountryResult[];
    /** Detected or overridden timezone string */
    timezone: string | null;
    /** Shortcut: highest-confidence country code */
    topCountry: string | null;
    /** Shortcut: highest-weight language code (after reranking) */
    topLanguage: string | null;
    /** Raw signals used for detection */
    signals: DetectSignals;
  }

  export interface CountryInfo {
    code: string;
    numericCode: number;
    callingCode: number | null;
    languages: string[];
    primaryLanguage: string | null;
  }

  export interface CountryForLanguage {
    code: string;
    isPrimary: boolean;
  }

  export interface HintLocale {
    /** Detect user's locale from browser signals or overrides */
    detect(options?: DetectOptions): DetectResult;

    /** Look up country info by ISO 3166-1 alpha-2 code */
    getCountry(code: string): CountryInfo | null;

    /** Get native display name for a language code */
    getLanguageName(code: string): string;

    /** Get rarity score for a language (1/number_of_countries) */
    getLanguageRarity(code: string): number;

    /** Get all countries that speak a language, with primary/secondary distinction */
    countriesForLanguage(code: string): CountryForLanguage[];

    /** Get all country codes matching a timezone identifier */
    countriesForTimezone(tz: string): string[];

    /** Library version */
    version: string;
  }

  const hintLocale: HintLocale;
  export default hintLocale;
  export = hintLocale;
}
