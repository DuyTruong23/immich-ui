import { searchUsersAdmin } from '@immich/sdk';
import type { LayoutLoad } from './$types';

export const load = (async () => {
  const users = await searchUsersAdmin({ withDeleted: false });
  return {
    users,
    meta: { title: 'Users' },
  };
}) satisfies LayoutLoad;
