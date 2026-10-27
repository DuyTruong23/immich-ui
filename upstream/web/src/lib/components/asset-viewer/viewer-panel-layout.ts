/**
 * Bố cục panel phụ của asset viewer (info / editor / activity).
 *
 * Desktop: cột cạnh media trong grid `grid-cols-4` của #immich-asset-viewer (giữ như upstream).
 * Mobile viewer — `(pointer: coarse), (max-width: 767px)`, xem branding/src/fluent/viewer.css:
 * overlay `absolute z-40`, không bị auto-place vào cột ngầm thứ 5 (360px ăn hết màn phone) và
 * nằm trên navbar overlay (z-30) nên header/nút đóng của panel không bị che.
 * Phone: bottom sheet; tablet cảm ứng (md+): drawer cạnh cuối.
 */
export type ViewerPanelKind = 'detail' | 'editor' | 'activity';

const DESKTOP_PANEL_CLASS: Record<ViewerPanelKind, string> = {
  detail: 'row-span-4 row-start-1 w-90',
  editor: 'row-span-4 row-start-1 w-100',
  activity: 'row-span-5 row-start-1 w-90 md:w-115',
};

const MOBILE_PANEL_BASE_CLASS =
  'asset-viewer-sheet absolute inset-x-0 bottom-0 z-40 w-full rounded-t-2xl md:inset-x-auto md:inset-y-0 md:inset-e-0 md:rounded-none';

// detail: nội dung tự cao → max-h; editor/activity dùng h-full bên trong nên cần chiều cao xác định
const MOBILE_PANEL_SIZE_CLASS: Record<ViewerPanelKind, string> = {
  detail: 'max-h-[85dvh] md:max-h-none md:w-90',
  editor: 'h-[50dvh] md:h-auto md:w-100',
  activity: 'h-[70dvh] md:h-auto md:w-115',
};

export const getViewerPanelLayoutClass = (kind: ViewerPanelKind, isMobileViewer: boolean): string =>
  isMobileViewer ? `${MOBILE_PANEL_BASE_CLASS} ${MOBILE_PANEL_SIZE_CLASS[kind]}` : DESKTOP_PANEL_CLASS[kind];

export type SwipeBackState = {
  isMobileViewer: boolean;
  slideshowIdle: boolean;
  isShowEditor: boolean;
  isFaceEditMode: boolean;
  isPanelOpen: boolean;
};

/**
 * Vuốt mép để đóng viewer: chỉ mobile viewer (desktop không render dải mép nuốt click),
 * tắt khi panel phụ đang mở để vuốt không đóng nhầm cả viewer.
 */
export const isSwipeBackEnabled = (state: SwipeBackState): boolean =>
  state.isMobileViewer && state.slideshowIdle && !state.isShowEditor && !state.isFaceEditMode && !state.isPanelOpen;
