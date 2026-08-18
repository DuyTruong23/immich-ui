import { describe, expect, it } from 'vitest';
import { formatMaintenanceReturn, getMaintenanceReturnAt } from './maintenance-return';

describe('maintenance-return', () => {
  it('returns today + 3 days at 15:30', () => {
    const from = new Date('2026-08-18T10:00:00');
    const returnAt = getMaintenanceReturnAt(from);

    expect(returnAt.getFullYear()).toBe(2026);
    expect(returnAt.getMonth()).toBe(7);
    expect(returnAt.getDate()).toBe(21);
    expect(returnAt.getHours()).toBe(15);
    expect(returnAt.getMinutes()).toBe(30);
  });

  it('formats Vietnamese return date', () => {
    const returnAt = new Date('2026-08-21T15:30:00');
    const formatted = formatMaintenanceReturn(returnAt, 'vi');

    expect(formatted.date).toMatch(/21/);
    expect(formatted.time).toMatch(/15:30/);
  });

  it('formats English return date', () => {
    const returnAt = new Date('2026-08-21T15:30:00');
    const formatted = formatMaintenanceReturn(returnAt, 'en');

    expect(formatted.date).toContain('August');
    expect(formatted.time).toMatch(/3:30/);
  });
});
