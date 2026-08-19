import { redirect } from '@sveltejs/kit';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { Route } from '$lib/route';
import type { PageLoad } from './$types';

export const load = (async () => {
  await authManager.load();

  if (!authManager.authenticated) {
    redirect(307, Route.login());
  }

  return {
    meta: {
      title: 'Cook',
    },
  };
}) satisfies PageLoad;
