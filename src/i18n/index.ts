/**
 * i18n — user-facing copy for the three portal languages.
 *
 * The PHP version kept three near-identical copies of the whole page, one per
 * language, and they had already drifted apart. Here there is one template and
 * three string tables, and because every table has to satisfy the `Strings`
 * interface below, a missing or misspelled key is a compile error rather than a
 * blank spot on a page nobody checked.
 */

import type { Category, Status, Urgency } from '../config';
import { en } from './en';
import { fr } from './fr';
import { rw } from './rw';
import { sw } from './sw';

export const LOCALES = ['rw', 'en', 'fr', 'sw'] as const;
export type Locale = (typeof LOCALES)[number];

/** Default locale. Kinyarwanda, matching index.php having been the landing page. */
export const DEFAULT_LOCALE: Locale = 'rw';

/** Strings the browser script needs. Serialised into a data attribute, because
 *  the CSP forbids inline scripts and this keeps that promise intact. */
export interface ClientStrings {
  emptyRef: string;
  networkError: string;
  invalidRef: string;
  copied: string;
  copyFailed: string;
  detailsHeader: string;
  timelineHeader: string;
  labelRef: string;
  labelCategory: string;
  labelUrgency: string;
  labelLocation: string;
  labelSector: string;
  labelDetails: string;
  labelDate: string;
  timelineSubmitted: string;
  timelineProgress: string;
  timelineResolved: string;
  timelineNotDone: string;
  noMatches: string;
  searchCleared: string;
  categories: Record<Category, string>;
  urgencies: Record<Urgency, string>;
}

/** Title and meta description for one page. */
export interface PageMeta {
  title: string;
  description: string;
}

export interface Strings {
  /** BCP 47 value for the <html lang> attribute. */
  htmlLang: string;
  /** Short code shown in the language switcher. */
  shortCode: string;
  /** Native name, used in the language switcher on every page. */
  nativeName: string;
  pageTitle: string;
  metaDescription: string;
  skipLink: string;

  /**
   * Per-page title and description. The portal is four pages now — home,
   * report, track and the public feed — and each needs its own, so the browser
   * tab and any shared link say which page it actually is.
   */
  pages: {
    home: PageMeta;
    report: PageMeta;
    track: PageMeta;
    feed: PageMeta;
  };

  masthead: {
    operator: string;
    description: string;
    chooseLanguage: string;
  };

  nav: {
    label: string;
    menu: string;
    closeMenu: string;
    home: string;
    track: string;
    report: string;
    reports: string;
    admin: string;
  };

  /** Content that exists only on the landing page. */
  home: {
    howHeading: string;
    howIntro: string;
    steps: ReadonlyArray<{ title: string; body: string }>;
    recentHeading: string;
    recentIntro: string;
    viewAll: string;
    ctaHeading: string;
    ctaBody: string;
    ctaButton: string;
  };

  hero: {
    eyebrow: string;
    heading: string;
    lead: string;
    reportCta: string;
    trackCta: string;
  };

  stats: {
    heading: string;
    total: string;
    pending: string;
    resolved: string;
    rate: string;
    noData: string;
  };

  tracker: {
    heading: string;
    intro: string;
    inputLabel: string;
    inputHint: string;
    placeholder: string;
    submit: string;
    working: string;
    resultsLabel: string;
    /** Shown in place of the description when the reporter left it blank. */
    noDetails: string;
  };

  form: {
    heading: string;
    intro: string;
    categoryLegend: string;
    urgencyLegend: string;
    optional: string;
    requiredNote: string;
    locationLabel: string;
    locationHint: string;
    locationPlaceholder: string;
    sectorLabel: string;
    sectorPlaceholder: string;
    /** Structured administrative location, added with the leader roles. */
    districtLabel: string;
    chooseDistrict: string;
    sectorOnlyLabel: string;
    chooseSector: string;
    cellLabel: string;
    cellHint: string;
    cellPlaceholder: string;
    villageLabel: string;
    villagePlaceholder: string;
    detailsLabel: string;
    detailsPlaceholder: string;
    contactHeading: string;
    privacyNotice: string;
    nameLabel: string;
    namePlaceholder: string;
    contactLabel: string;
    contactPlaceholder: string;
    submit: string;
    submitting: string;
  };

  success: {
    heading: string;
    body: string;
    refLabel: string;
    keepSafe: string;
    copy: string;
    track: string;
    another: string;
  };

  feed: {
    heading: string;
    searchLabel: string;
    searchPlaceholder: string;
    empty: string;
    noMatches: string;
    defaultSector: string;
  };

  categories: Record<Category, string>;
  urgencies: Record<Urgency, string>;
  statuses: Record<Status, string>;

  footer: {
    operatorLine: string;
    description: string;
    resourcesHeading: string;
    partnersHeading: string;
    cityLink: string;
    remaLink: string;
    adminLink: string;
    dataNote: string;
  };

  /** Messages produced by the server. These were the $CK_STRINGS array. */
  errors: {
    unknownRef: string;
    trackLimited: string;
    submitLimited: string;
    invalidInput: string;
    submitError: string;
    sessionExpired: string;
  };

  client: ClientStrings;
}

const TABLES: Record<Locale, Strings> = { rw, en, fr, sw };

/** Strings for a locale. */
export function strings(locale: Locale): Strings {
  return TABLES[locale];
}

/** Narrow an untrusted route parameter to a Locale, or undefined. */
export function asLocale(value: unknown): Locale | undefined {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value) ? (value as Locale) : undefined;
}

/**
 * Pick a locale from the Accept-Language header, for the bare "/" route.
 * Falls back to the default rather than guessing from anything less explicit.
 */
export function negotiateLocale(acceptLanguage: string | undefined): Locale {
  if (acceptLanguage === undefined) return DEFAULT_LOCALE;

  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam === undefined ? 1 : Number.parseFloat(qParam.trim().slice(2));
      return { tag: tag.toLowerCase(), q: Number.isNaN(q) ? 0 : q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split('-')[0];
    const match = asLocale(base);
    if (match !== undefined) return match;
  }
  return DEFAULT_LOCALE;
}

/** Every locale plus its names, for rendering the switcher. */
export function languageOptions(): ReadonlyArray<{
  locale: Locale;
  nativeName: string;
  htmlLang: string;
  shortCode: string;
}> {
  return LOCALES.map((locale) => ({
    locale,
    nativeName: TABLES[locale].nativeName,
    htmlLang: TABLES[locale].htmlLang,
    shortCode: TABLES[locale].shortCode,
  }));
}
