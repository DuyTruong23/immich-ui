import { browser } from '$app/environment';
import { innerWidth } from 'svelte/reactivity/window';

export const GRID_COLUMNS_MIN = 3;
/** Tối đa trên điện thoại (<768px) */
export const GRID_COLUMNS_MAX = 6;
/** Tối đa trên tablet / cửa sổ rộng (≥768px) */
export const GRID_COLUMNS_MAX_WIDE = 10;
export const GRID_COLUMNS_DEFAULT = 4;
/** Từ bề rộng này, số cột mặc định tính theo bề rộng thay vì cố định 4 */
export const GRID_WIDE_MIN_WIDTH = 768;
/** Bề rộng ô mục tiêu (px) khi tính số cột mặc định trên màn rộng */
export const GRID_WIDE_TARGET_CELL = 160;

/** Khoá cũ: số cột tuyệt đối (3–6) */
const LEGACY_STORAGE_KEY = 'pg-grid-columns';
/** Khoá mới: độ lệch so với số cột mặc định theo bề rộng — giữ lựa chọn pinch khi xoay iPad */
const OFFSET_STORAGE_KEY = 'pg-grid-columns-offset';

export const getGridColumnsMax = (width: number): number =>
  width >= GRID_WIDE_MIN_WIDTH ? GRID_COLUMNS_MAX_WIDE : GRID_COLUMNS_MAX;

export const getDefaultGridColumns = (width: number): number => {
  if (width < GRID_WIDE_MIN_WIDTH) {
    return GRID_COLUMNS_DEFAULT;
  }

  return Math.min(
    GRID_COLUMNS_MAX_WIDE,
    Math.max(GRID_COLUMNS_DEFAULT + 1, Math.round(width / GRID_WIDE_TARGET_CELL)),
  );
};

export const clampGridColumns = (value: number, width = 0): number =>
  Math.min(getGridColumnsMax(width), Math.max(GRID_COLUMNS_MIN, Math.round(value)));

export const resolveGridColumns = (width: number, offset: number): number =>
  clampGridColumns(getDefaultGridColumns(width) + offset, width);

const parseStoredNumber = (raw: string | null): number | undefined => {
  // Number(null) === 0 từng làm mặc định thành 3 cột khi chưa lưu gì
  if (raw === null || raw.trim() === '') {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** Đọc độ lệch đã lưu; chuyển đổi khoá cũ (số cột tuyệt đối) nếu chưa có khoá mới */
export const readStoredGridOffset = (storage: Pick<Storage, 'getItem'>): number => {
  const offset = parseStoredNumber(storage.getItem(OFFSET_STORAGE_KEY));
  if (offset !== undefined) {
    return Math.round(offset);
  }

  const legacy = parseStoredNumber(storage.getItem(LEGACY_STORAGE_KEY));
  if (legacy !== undefined) {
    return clampGridColumns(legacy) - GRID_COLUMNS_DEFAULT;
  }

  return 0;
};

const readInitialOffset = (): number => {
  if (!browser) {
    return 0;
  }

  try {
    return readStoredGridOffset(localStorage);
  } catch {
    // localStorage unavailable
    return 0;
  }
};

const viewportWidth = (): number => innerWidth.current ?? 0;

class GridDensityManager {
  offset = $state(readInitialOffset());

  /** Số cột theo bề rộng cửa sổ hiện tại */
  get columns(): number {
    return resolveGridColumns(viewportWidth(), this.offset);
  }

  /** Số cột cho một vùng lưới có bề rộng cụ thể (vd. timeline đã trừ sidebar) */
  columnsFor(width: number): number {
    return resolveGridColumns(width || viewportWidth(), this.offset);
  }

  setColumns(next: number): boolean {
    const width = viewportWidth();
    const clamped = clampGridColumns(next, width);
    if (clamped === this.columns) {
      return false;
    }

    this.offset = clamped - getDefaultGridColumns(width);
    if (browser) {
      try {
        localStorage.setItem(OFFSET_STORAGE_KEY, String(this.offset));
      } catch {
        // localStorage unavailable
      }
    }
    return true;
  }
}

export const gridDensityManager = new GridDensityManager();
