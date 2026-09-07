import { DateTime } from 'luxon';
import { get } from 'svelte/store';
import { dateFormats } from '$lib/constants';
import { locale } from '$lib/stores/preferences.store';
import {
  formatDate,
  formatMonthYearParts,
  isVietnameseLocale,
  resolveFormatLocale,
} from '$lib/utils/date-format';

export function parseUtcDate(date: string) {
  return DateTime.fromISO(date, { zone: 'UTC' }).toUTC();
}

export const getShortDateRange = (startTimestamp: string, endTimestamp: string) => {
  const stored = get(locale);
  const resolved = resolveFormatLocale(stored);
  let startDate = DateTime.fromISO(startTimestamp).setZone('UTC');
  let endDate = DateTime.fromISO(endTimestamp).setZone('UTC');

  startDate = startDate.setLocale(resolved);
  endDate = endDate.setLocale(resolved);

  if (isVietnameseLocale(stored)) {
    const endLabel = formatMonthYearParts({ year: endDate.year, month: endDate.month }, stored);
    if (startDate.year === endDate.year && startDate.month === endDate.month) {
      return endLabel;
    }
    if (startDate.year === endDate.year) {
      return `Tháng ${startDate.month} - ${endLabel}`;
    }
    return `${formatMonthYearParts({ year: startDate.year, month: startDate.month }, stored)} - ${endLabel}`;
  }

  const endDateLocalized = endDate.toLocaleString({
    month: 'short',
    year: 'numeric',
  });

  if (startDate.year === endDate.year) {
    if (startDate.month === endDate.month) {
      // Same year and month.
      // e.g.: aug. 2024
      return endDateLocalized;
    }

    // Same year but different month.
    // e.g.: jul. - sept. 2024
    const startMonthLocalized = startDate.toLocaleString({
      month: 'short',
    });
    return `${startMonthLocalized} - ${endDateLocalized}`;
  }

  // Different year.
  // e.g.: feb. 2021 - sept. 2024
  const startDateLocalized = startDate.toLocaleString({
    month: 'short',
    year: 'numeric',
  });
  return `${startDateLocalized} - ${endDateLocalized}`;
};

const formatAlbumDate = (date?: string) => {
  if (!date) {
    return;
  }

  // without timezone
  const localDate = date.replace(/Z$/, '').replace(/\+.+$/, '');
  if (!localDate) {
    return;
  }

  const stored = get(locale);
  if (isVietnameseLocale(stored)) {
    return formatDate(new Date(localDate), stored);
  }

  return new Date(localDate).toLocaleDateString(resolveFormatLocale(stored), dateFormats.album);
};

export const getAlbumDateRange = (album: { startDate?: string; endDate?: string }) => {
  const start = formatAlbumDate(album.startDate);
  const end = formatAlbumDate(album.endDate);

  if (start && end && start !== end) {
    return `${start} - ${end}`;
  }

  if (start) {
    return start;
  }

  return '';
};

/**
 * Use this to convert from "5pm EST" to "5pm UTC"
 *
 * Useful with some APIs where you want to query by "today", but the values in the database are stored as UTC
 */
export const asLocalTimeISO = (date: DateTime<true>) =>
  (date.setZone('utc', { keepLocalTime: true }) as DateTime<true>).toISO();

const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

type DayOfWeek = (typeof days)[number];
export const dayOfWeek = (day: DayOfWeek, options?: { locale?: string; style?: 'long' | 'short' | 'narrow' }) => {
  const fmt = new Intl.DateTimeFormat(options?.locale ? resolveFormatLocale(options.locale) : options?.locale, {
    weekday: options?.style ?? 'long',
    timeZone: 'UTC',
  });
  // 2021-08-01 is a Sunday
  return fmt.format(new Date(Date.UTC(2021, 7, 1 + days.indexOf(day))));
};
