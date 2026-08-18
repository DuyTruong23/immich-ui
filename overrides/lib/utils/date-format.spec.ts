import { describe, expect, it } from 'vitest';
import {
  displayToIsoInput,
  formatDate,
  formatDateTime,
  formatMonthYear,
  formatTime,
  isoInputToDisplay,
} from './date-format';

const sample = new Date(2026, 7, 17, 16, 38, 5);

describe('Vietnamese system date formats', () => {
  it('formats date as ngày/tháng/năm', () => {
    expect(formatDate(sample, 'vi')).toBe('17/08/2026');
    expect(formatDate(sample, 'vi-VN')).toBe('17/08/2026');
  });

  it('formats time as giờ:phút:giây', () => {
    expect(formatTime(sample, 'vi-VN')).toBe('16:38:05');
  });

  it('formats datetime as ngày/tháng/năm giờ:phút:giây', () => {
    expect(formatDateTime(sample, 'vi-VN')).toBe('17/08/2026 16:38:05');
  });

  it('formats month year as Tháng năm', () => {
    expect(formatMonthYear(sample, 'vi-VN')).toBe('Tháng 8 năm 2026');
  });

  it('keeps ngày/tháng/năm when locale tag is vi regardless of default', () => {
    expect(formatDate(sample, 'vi')).toBe('17/08/2026');
    expect(formatDateTime(sample, 'vi')).toBe('17/08/2026 16:38:05');
  });
});

describe('Vietnamese date input conversions', () => {
  it('converts ISO date/datetime to ngày/tháng/năm', () => {
    expect(isoInputToDisplay('2026-08-17', 'date')).toBe('17/08/2026');
    expect(isoInputToDisplay('2026-08-17T16:38:05.123', 'datetime-local')).toBe('17/08/2026 16:38:05');
    expect(isoInputToDisplay('2026-08-17T16:38', 'datetime-local')).toBe('17/08/2026 16:38:00');
  });

  it('parses ngày/tháng/năm back to ISO', () => {
    expect(displayToIsoInput('17/08/2026', 'date')).toBe('2026-08-17');
    expect(displayToIsoInput('17/8/2026 16:38:05', 'datetime-local')).toBe('2026-08-17T16:38:05.000');
    expect(displayToIsoInput('17-08-2026 16:38', 'datetime-local')).toBe('2026-08-17T16:38:00.000');
    expect(displayToIsoInput('2026-08-17T16:38:05', 'datetime-local')).toBe('2026-08-17T16:38:05.000');
    expect(displayToIsoInput('32/08/2026', 'date')).toBeNull();
  });
});
