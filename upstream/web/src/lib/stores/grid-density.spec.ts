import { describe, expect, it } from 'vitest';
import { GRID_COLUMNS_MAX, GRID_COLUMNS_MIN, clampGridColumns } from './grid-density.svelte';

describe('grid density columns', () => {
  it('clamps to 3–6', () => {
    expect(clampGridColumns(2)).toBe(GRID_COLUMNS_MIN);
    expect(clampGridColumns(3)).toBe(3);
    expect(clampGridColumns(6)).toBe(6);
    expect(clampGridColumns(9)).toBe(GRID_COLUMNS_MAX);
  });
});
