/**
 * Thẻ <link> mở sẵn kết nối (DNS + TLS) tới media origin — chèn vào <head> lúc build qua hooks.server.ts.
 * Không đặt `crossorigin`: <img>/<video> fetch kiểu no-CORS, kết nối preconnect có crossorigin sẽ không được tái dùng.
 */
export const buildMediaOriginHints = (mediaUrl: string | undefined): string => {
  const trimmed = (mediaUrl ?? '').trim().replace(/\/$/, '');
  if (!trimmed) {
    return '';
  }

  let origin: string;
  try {
    origin = new URL(trimmed).origin;
  } catch {
    return '';
  }

  return `<link rel="preconnect" href="${origin}" />\n    <link rel="dns-prefetch" href="${origin}" />`;
};
