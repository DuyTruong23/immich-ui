/**
 * Reload do app chủ động (chunk JS cũ sau deploy, trang bảo trì).
 * Thêm `_pg=<timestamp>` để tránh bfcache; `hooks.client.ts` xóa param này ngay sau khi boot.
 */
export const reloadApp = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const next = new URL(location.href);
  next.searchParams.set('_pg', String(Date.now()));
  location.replace(`${next.pathname}${next.search}${next.hash}`);
};
