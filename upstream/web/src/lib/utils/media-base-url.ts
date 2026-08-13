import { getBaseUrl } from '@immich/sdk';
import { PUBLIC_IMMICH_MEDIA_URL } from '$env/static/public';

const directMediaOrigin = PUBLIC_IMMICH_MEDIA_URL.trim().replace(/\/$/, '');

/** Base URL cho media (ảnh/video) — bỏ qua Vercel proxy khi set PUBLIC_IMMICH_MEDIA_URL */
export const getMediaBaseUrl = (): string => {
  if (!directMediaOrigin) {
    return getBaseUrl();
  }

  return `${directMediaOrigin}/api`;
};
