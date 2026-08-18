import { browser } from '$app/environment';

export const GRID_COLUMNS_MIN = 3;
export const GRID_COLUMNS_MAX = 6;
export const GRID_COLUMNS_DEFAULT = 4;

const STORAGE_KEY = 'pg-grid-columns';

export const clampGridColumns = (value: number): number =>
  Math.min(GRID_COLUMNS_MAX, Math.max(GRID_COLUMNS_MIN, Math.round(value)));

const readStoredColumns = (): number => {
  if (!browser) {
    return GRID_COLUMNS_DEFAULT;
  }

  try {
    const parsed = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(parsed)) {
      return clampGridColumns(parsed);
    }
  } catch {
    // localStorage unavailable
  }

  return GRID_COLUMNS_DEFAULT;
};

class GridDensityManager {
  columns = $state(readStoredColumns());

  setColumns(next: number): boolean {
    const clamped = clampGridColumns(next);
    if (clamped === this.columns) {
      return false;
    }

    this.columns = clamped;
    if (browser) {
      try {
        localStorage.setItem(STORAGE_KEY, String(clamped));
      } catch {
        // localStorage unavailable
      }
    }
    return true;
  }
}

export const gridDensityManager = new GridDensityManager();
