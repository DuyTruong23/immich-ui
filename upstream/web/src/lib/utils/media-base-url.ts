import { browser } from '$app/environment';
import { getBaseUrl } from '@immich/sdk';
import { env } from '$env/dynamic/public';

/** Base URL cho media (ảnh/video) — bỏ qua Vercel proxy khi set PUBLIC_IMMICH_MEDIA_URL */
export const getMediaBaseUrl = (): string => {
  const directMediaOrigin = (env.PUBLIC_IMMICH_MEDIA_URL ?? '').trim().replace(/\/$/, '');

  if (!directMediaOrigin) {
    return getBaseUrl();
  }

  return `${directMediaOrigin}/api`;
};

/** Media đi qua subdomain khác UI — cookie login không tự gửi, cần sessionKey trên URL */
export const isCrossOriginMediaBase = (): boolean => {
  if (!browser) {
    return false;
  }

  try {
    return new URL(getMediaBaseUrl(), location.href).origin !== location.origin;
  } catch {
    return false;
  }
};
