import { goto } from '$app/navigation';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { Route } from '$lib/route';

/** Redirect non-admin users away from admin-only routes */
export const enforceAdminRoute = async (): Promise<void> => {
  if (!authManager.authenticated) {
    await authManager.load();
  }

  if (!authManager.authenticated) {
    await goto(Route.login());
    return;
  }

  if (authManager.user.isAdmin) {
    return;
  }

  await goto('/photos');
};
