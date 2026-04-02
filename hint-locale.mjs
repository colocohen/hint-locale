// hint-locale.mjs — ESM wrapper
// Works with: import HintLocale from 'hint-locale'
//             import { detect, fromRequest } from 'hint-locale'
//             Deno, Cloudflare Workers, <script type="module">

import _hl from './hint-locale.js';

export const detect = _hl.detect;
export const getCountry = _hl.getCountry;
export const getLanguageName = _hl.getLanguageName;
export const getLanguageRarity = _hl.getLanguageRarity;
export const countriesForLanguage = _hl.countriesForLanguage;
export const countriesForTimezone = _hl.countriesForTimezone;
export const parseAcceptLanguage = _hl.parseAcceptLanguage;
export const fromRequest = _hl.fromRequest;
export const version = _hl.version;

export default _hl;
