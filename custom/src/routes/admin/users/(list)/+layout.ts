import { searchUsersAdmin } from '@immich/sdk';
import type { PageServerLoad } from './$types';

export const load = (async () => {
  const users = await searchUsersAdmin({ withDeleted: false });
  return {
    users,
    meta: { title: 'Users' },
  };
}) satisfies PageServerLoad;
