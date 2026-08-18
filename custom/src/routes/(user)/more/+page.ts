import { authenticate } from '$lib/utils/auth';

export const load = async ({ url }: { url: URL }) => {
  await authenticate(url);

  return {
    meta: { title: 'More' },
  };
};
