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
