import type { Handle } from '@sveltejs/kit';

const beVietnamProRegular = '/branding/fonts/BeVietnamPro/BeVietnamPro-Regular.ttf';
const beVietnamProMedium = '/branding/fonts/BeVietnamPro/BeVietnamPro-Medium.ttf';

export const handle = (async ({ event, resolve }) => {
  return resolve(event, {
    transformPageChunk: ({ html }) => {
      return html
        .replace('%app.font%', () => beVietnamProRegular)
        .replace('%app.monofont%', () => beVietnamProMedium);
    },
  });
}) satisfies Handle;
