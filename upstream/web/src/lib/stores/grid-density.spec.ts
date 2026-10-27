import { describe, expect, it } from 'vitest';
import {
  GRID_COLUMNS_MAX,
  GRID_COLUMNS_MAX_WIDE,
  GRID_COLUMNS_MIN,
  clampGridColumns,
  getDefaultGridColumns,
  getGridColumnsMax,
  readStoredGridOffset,
  resolveGridColumns,
} from './grid-density.svelte';

const storage = (values: Record<string, string>) => ({
  getItem: (key: string) => (values[key] ?? null),
});

describe('grid density columns', () => {
  it('clamps to 3–6', () => {
    expect(clampGridColumns(2)).toBe(GRID_COLUMNS_MIN);
    expect(clampGridColumns(3)).toBe(3);
    expect(clampGridColumns(6)).toBe(6);
    expect(clampGridColumns(9)).toBe(GRID_COLUMNS_MAX);
  });

  it('allows up to 10 columns from 768px wide', () => {
    expect(getGridColumnsMax(767)).toBe(GRID_COLUMNS_MAX);
    expect(getGridColumnsMax(768)).toBe(GRID_COLUMNS_MAX_WIDE);
    expect(clampGridColumns(9, 1024)).toBe(9);
    expect(clampGridColumns(12, 1024)).toBe(GRID_COLUMNS_MAX_WIDE);
    expect(clampGridColumns(2, 1024)).toBe(GRID_COLUMNS_MIN);
  });

  it('derives the default from the width', () => {
    expect(getDefaultGridColumns(390)).toBe(4);
    expect(getDefaultGridColumns(767)).toBe(4);
    expect(getDefaultGridColumns(768)).toBe(5);
    expect(getDefaultGridColumns(1024)).toBe(6);
    expect(getDefaultGridColumns(1366)).toBe(9);
    expect(getDefaultGridColumns(2560)).toBe(GRID_COLUMNS_MAX_WIDE);
  });

  it('applies the pinch offset on top of the width default, clamped per width', () => {
    expect(resolveGridColumns(390, 0)).toBe(4);
    expect(resolveGridColumns(1024, 0)).toBe(6);
    expect(resolveGridColumns(1024, 2)).toBe(8);
    expect(resolveGridColumns(390, 2)).toBe(6);
    expect(resolveGridColumns(390, 5)).toBe(GRID_COLUMNS_MAX);
    expect(resolveGridColumns(1366, -10)).toBe(GRID_COLUMNS_MIN);
  });

  it('reads the stored offset and migrates the legacy absolute value', () => {
    expect(readStoredGridOffset(storage({}))).toBe(0);
    expect(readStoredGridOffset(storage({ 'pg-grid-columns-offset': '2' }))).toBe(2);
    expect(readStoredGridOffset(storage({ 'pg-grid-columns': '5' }))).toBe(1);
    expect(readStoredGridOffset(storage({ 'pg-grid-columns': '3' }))).toBe(-1);
    expect(readStoredGridOffset(storage({ 'pg-grid-columns': '9' }))).toBe(2);
    expect(readStoredGridOffset(storage({ 'pg-grid-columns': 'abc' }))).toBe(0);
    expect(readStoredGridOffset(storage({ 'pg-grid-columns': '' }))).toBe(0);
  });
});
