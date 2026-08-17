import { browser } from '$app/environment';
import { lang } from '$lib/stores/preferences.store';
import { get } from 'svelte/store';

const pad2 = (value: number) => String(value).padStart(2, '0');

const isVietnameseTag = (code: string) => {
  const normalized = code.toLowerCase().replaceAll('_', '-');
  return normalized === 'vi' || normalized.startsWith('vi-');
};

const readUiLanguage = (): string => {
  try {
    const uiLang = get(lang)?.trim();
    if (uiLang && uiLang !== 'default' && uiLang !== 'dev') {
      return uiLang;
    }
  } catch {
    // store chưa sẵn
  }

  if (browser) {
    const docLang = document.documentElement.lang?.trim();
    if (docLang) {
      return docLang;
    }
  }

  return '';
};

const firstNavigatorLanguage = (): string => {
  if (!browser) {
    return '';
  }

  const codes = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  const vietnamese = codes.find((code) => isVietnameseTag(code));
  return vietnamese || codes[0] || '';
};

/** Locale dùng để format ngày/giờ: setting tường minh, ngôn ngữ UI, rồi trình duyệt. */
export const resolveFormatLocale = (stored?: string | null): string => {
  if (stored && stored !== 'default') {
    return isVietnameseTag(stored) ? 'vi-VN' : stored.replaceAll('_', '-');
  }

  const uiLang = readUiLanguage();
  if (uiLang) {
    return isVietnameseTag(uiLang) ? 'vi-VN' : uiLang.replaceAll('_', '-');
  }

  const nav = firstNavigatorLanguage();
  if (nav) {
    return isVietnameseTag(nav) ? 'vi-VN' : nav;
  }

  return 'en-US';
};

export const isVietnameseLocale = (stored?: string | null): boolean => {
  if (stored && stored !== 'default' && isVietnameseTag(stored)) {
    return true;
  }

  const uiLang = readUiLanguage();
  if (uiLang && isVietnameseTag(uiLang)) {
    return true;
  }

  return isVietnameseTag(resolveFormatLocale(stored));
};

type DateParts = { year: number; month: number; day: number };
type TimeParts = { hour: number; minute: number; second: number };
type DateTimeParts = DateParts & TimeParts;

const partsFromDate = (date: Date): DateTimeParts => ({
  year: date.getFullYear(),
  month: date.getMonth() + 1,
  day: date.getDate(),
  hour: date.getHours(),
  minute: date.getMinutes(),
  second: date.getSeconds(),
});

/** ngày/tháng/năm — `17/08/2026` */
export const formatDateParts = (parts: DateParts, stored?: string | null): string => {
  const locale = resolveFormatLocale(stored);
  if (isVietnameseTag(locale)) {
    return `${pad2(parts.day)}/${pad2(parts.month)}/${parts.year}`;
  }

  return new Date(parts.year, parts.month - 1, parts.day).toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/** giờ:phút:giây — `16:38:05` */
export const formatTimeParts = (parts: TimeParts, stored?: string | null): string => {
  const locale = resolveFormatLocale(stored);
  if (isVietnameseTag(locale)) {
    return `${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`;
  }

  return new Date(1970, 0, 1, parts.hour, parts.minute, parts.second).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/** ngày/tháng/năm giờ:phút:giây — `17/08/2026 16:38:05` */
export const formatDateTimeParts = (parts: DateTimeParts, stored?: string | null): string =>
  `${formatDateParts(parts, stored)} ${formatTimeParts(parts, stored)}`;

/** Tháng năm — `Tháng 8 năm 2026` */
export const formatMonthYearParts = (parts: { year: number; month: number }, stored?: string | null): string => {
  const locale = resolveFormatLocale(stored);
  if (isVietnameseTag(locale)) {
    return `Tháng ${parts.month} năm ${parts.year}`;
  }

  return new Date(parts.year, parts.month - 1, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
};

export const formatDate = (date: Date, stored?: string | null): string => formatDateParts(partsFromDate(date), stored);

export const formatTime = (date: Date, stored?: string | null): string => formatTimeParts(partsFromDate(date), stored);

export const formatDateTime = (date: Date, stored?: string | null): string =>
  formatDateTimeParts(partsFromDate(date), stored);

export const formatMonthYear = (date: Date, stored?: string | null): string =>
  formatMonthYearParts({ year: date.getFullYear(), month: date.getMonth() + 1 }, stored);
