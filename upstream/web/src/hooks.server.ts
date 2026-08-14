import type { Handle } from '@sveltejs/kit';

const sfProRegular = '/branding/fonts/SFPro/SF-Pro-Text-Regular.woff2';
const sfProMedium = '/branding/fonts/SFPro/SF-Pro-Text-Medium.woff2';

export const handle = (async ({ event, resolve }) => {
  return resolve(event, {
    transformPageChunk: ({ html }) => {
      return html
        .replace('%app.font%', () => sfProRegular)
        .replace('%app.monofont%', () => sfProMedium);
    },
  });
}) satisfies Handle;
