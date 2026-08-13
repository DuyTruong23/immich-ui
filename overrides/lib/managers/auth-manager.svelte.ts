import {
  createSession,
  getAboutInfo,
  getMyPreferences,
  getMyUser,
  logout,
  type UserAdminResponseDto,
  type UserPreferencesResponseDto,
} from '@immich/sdk';
import { getAppConfig } from '@photo-gallery/config';
import {
  beginBrowserSession,
  clearSessionActive,
  isActiveBrowserSession,
} from '$custom/hooks/session-auth';
import {
  clearDevSession,
  isUiDevMode,
  restoreDevSession,
} from '$custom/hooks/ui-dev-mode';
import { clearStoredAccessToken } from '$custom/hooks/access-token';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { eventManager } from '$lib/managers/event-manager.svelte';
import { Route } from '$lib/route';
import { isCrossOriginMediaBase } from '$lib/utils/media-base-url';
import { isSharedLinkRoute } from '$lib/utils/navigation';

const MEDIA_SESSION_DURATION_SECONDS = 60 * 60;

class AuthManager {
  isPurchased = $state(false);
  isSharedLink = $derived(isSharedLinkRoute(page.route?.id));
  params = $derived.by(() => {
    if (this.isSharedLink) {
      return { key: page.params.key, slug: page.params.slug };
    }

    if (isCrossOriginMediaBase() && this.#mediaSessionKey) {
      return { sessionKey: this.#mediaSessionKey };
    }

    return {};
  });

  #user = $state<UserAdminResponseDto>();
  #preferences = $state<UserPreferencesResponseDto>();
  #mediaSessionKey = $state<string | undefined>();
  #mediaSessionPromise: Promise<void> | undefined;

  get authenticated() {
    return !!(this.#user && this.#preferences);
  }

  get user() {
    if (!this.#user) {
      throw new TypeError('AuthManager.user is undefined');
    }

    return this.#user;
  }

  get preferences() {
    if (!this.#preferences) {
      throw new TypeError('AuthManager.preferences is undefined');
    }

    return this.#preferences;
  }

  constructor() {
    eventManager.on({
      SessionDelete: () => goto(Route.logout()),
    });
  }

  async load() {
    if (authManager.authenticated) {
      await this.ensureMediaSessionKey();
      return;
    }

    if (isUiDevMode()) {
      restoreDevSession();
      return;
    }

    if (this.#isSessionOnlyAuth()) {
      beginBrowserSession();
      if (!isActiveBrowserSession()) {
        return;
      }
    }

    if (!this.#hasAuthCookie()) {
      return;
    }

    return this.refresh();
  }

  async refresh() {
    if (isUiDevMode()) {
      restoreDevSession();
      return;
    }

    try {
      const [user, preferences] = await Promise.all([getMyUser(), getMyPreferences()]);
      this.#preferences = preferences;
      this.#user = user;

      if (user.license?.activatedAt) {
        this.isPurchased = true;
      } else {
        const serverInfo = await getAboutInfo().catch(() => {});
        if (serverInfo?.licensed) {
          this.isPurchased = true;
        }
      }

      eventManager.emit('AuthUserLoaded', user);
      await this.ensureMediaSessionKey();
    } catch {
      // noop
    }
  }

  /** Token cho media cross-subdomain — cookie login không gửi sang api.* */
  async ensureMediaSessionKey(): Promise<void> {
    if (!browser || this.isSharedLink || !this.authenticated || !isCrossOriginMediaBase()) {
      return;
    }

    if (this.#mediaSessionKey) {
      return;
    }

    if (this.#mediaSessionPromise) {
      return this.#mediaSessionPromise;
    }

    this.#mediaSessionPromise = (async () => {
      try {
        const session = await createSession({
          sessionCreateDto: {
            duration: MEDIA_SESSION_DURATION_SECONDS,
            deviceOS: 'Web',
            deviceType: 'Browser',
          },
        });
        this.#mediaSessionKey = session.token;
      } catch (error) {
        console.warn('Failed to create media session key', error);
      } finally {
        this.#mediaSessionPromise = undefined;
      }
    })();

    return this.#mediaSessionPromise;
  }

  setUser(user: UserAdminResponseDto) {
    this.#user = user;
  }

  setPreferences(preferences: UserPreferencesResponseDto) {
    this.#preferences = preferences;
  }

  async logout() {
    if (isUiDevMode()) {
      clearDevSession();
      this.isPurchased = false;
      this.reset();
      eventManager.emit('AuthLogout');
      await goto(Route.login());
      return;
    }

    let redirectUri = Route.login();

    try {
      const response = await logout();
      if (response.redirectUri) {
        redirectUri = response.redirectUri;
      }
    } catch {
      // noop
    }

    if (redirectUri.startsWith('/')) {
      this.isPurchased = false;

      this.reset();
      eventManager.emit('AuthLogout');

      await goto(redirectUri);
    } else {
      location.assign(redirectUri);
    }
  }

  reset() {
    this.#user = undefined;
    this.#preferences = undefined;
    this.#mediaSessionKey = undefined;
    this.#mediaSessionPromise = undefined;
    clearStoredAccessToken();

    if (this.#isSessionOnlyAuth()) {
      clearSessionActive();
    }
  }

  #isSessionOnlyAuth() {
    try {
      return getAppConfig().publicEnv.sessionOnlyAuth;
    } catch {
      return false;
    }
  }

  #hasAuthCookie() {
    if (!browser) {
      return;
    }

    for (const cookie of document.cookie.split('; ')) {
      const [name] = cookie.split('=', 1);
      if (name === 'immich_is_authenticated') {
        return true;
      }
    }

    return false;
  }
}

export const authManager = new AuthManager();
