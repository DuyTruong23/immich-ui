import type { Handle } from '@sveltejs/kit';
import { PUBLIC_IMMICH_MEDIA_URL } from '$env/static/public';
import { buildMediaOriginHints } from '$lib/utils/media-origin-hints';

const sfProRegular = '/branding/fonts/SFPro/SF-Pro-Text-Regular.woff2';
const sfProMedium = '/branding/fonts/SFPro/SF-Pro-Text-Medium.woff2';
const charsetTag = '<meta charset="utf-8" />';

export const handle = (async ({ event, resolve }) => {
  const mediaHints = buildMediaOriginHints(PUBLIC_IMMICH_MEDIA_URL);

  return resolve(event, {
    transformPageChunk: ({ html }) => {
      return html
        .replace('%app.font%', () => sfProRegular)
        .replace('%app.monofont%', () => sfProMedium)
        .replace(charsetTag, () => (mediaHints ? `${charsetTag}\n    ${mediaHints}` : charsetTag));
    },
  });
}) satisfies Handle;
