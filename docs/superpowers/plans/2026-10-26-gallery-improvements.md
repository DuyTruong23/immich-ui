# Gallery Improvements 2026-10 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bỏ cơ chế đăng xuất khi F5, thêm công cụ kiểm tra version Immich, tăng tốc upload giữ chất lượng gốc, xem ảnh/video chất lượng cao nhưng vẫn nhanh, và có báo cáo performance website.

**Architecture:** Repo là fork Immich Web (SvelteKit 2 + Svelte 5). Code tùy biến nằm ở `custom/`, `overrides/`, `config/`, `scripts/`; `bash scripts/prepare-custom.sh` copy `custom/src/routes` → `upstream/web/src/routes`, `overrides/lib` → `upstream/web/src/lib`, `custom/src/hooks.*.ts` → `upstream/web/src/`, rồi chạy các script Python patch. Bản copy trong `upstream/web/src` **được commit** cùng file nguồn (quy ước của repo). Test chạy bằng vitest trong `upstream/web`.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript strict, vitest + happy-dom, pnpm workspace, Node 22+ (máy đang chạy Node 24), Python 3 (script patch).

**Spec:** Yêu cầu gốc của người dùng (không có spec file riêng):
1. Bỏ tính năng F5/refresh → logout.
2. Immich có update mới — kiểm tra version.
3. Tối ưu upload ảnh/video chất lượng gốc.
4. Tối ưu xem ảnh/video chất lượng gốc, cao nhất nhưng phải nhanh.
5. Kiểm tra performance website.

## Global Constraints

- **Nguồn sự thật** là `custom/`, `overrides/`, `config/`, `scripts/`. Sau khi sửa file nguồn, chạy `bash scripts/prepare-custom.sh` từ repo root rồi `git add` **cả file nguồn lẫn bản copy** trong `upstream/web/src/...` (xem commit `31f28d9c7`, `8edefb81f` làm mẫu).
- **Không bao giờ** `git add -A` / `git add .`. Chỉ `git add <đường dẫn cụ thể>`. File `.env.example` đang có sẵn một hunk đã stage của người dùng (`PUBLIC_APP_NAME=WeGallery`); Task 1 commit kèm hunk đó (đã có ruling).
- **Không sửa** file `.env`, `.env.production`, `.env.*.local` (gitignored, dữ liệu máy người dùng).
- **Chạy test từ repo root**: `pnpm --filter immich-web exec vitest run <đường dẫn tương đối upstream/web>`. **Không** `cd upstream/web` rồi chạy `pnpm exec vitest` (pnpm sẽ chạy install và fail vì workspace).
- **Type check**: `pnpm --filter immich-web exec svelte-check --no-tsconfig --fail-on-warnings --compiler-warnings "state_referenced_locally:ignore"` (≈30s). Baseline **đã có 30 ERRORS / 1 WARNING ở 12 file** (danh sách tại `.superpowers/sdd/2026-10-26-gallery-improvements/svelte-check-baseline.txt`). Yêu cầu: **không thêm lỗi mới** ở file bạn sửa/tạo; tổng ERRORS ≤ 30.
- **Lint/format file đã sửa**: `pnpm --filter immich-web exec eslint <file trong upstream/web>` và `pnpm --filter immich-web exec prettier --check <file>` (chạy trên bản copy trong `upstream/web/src`, vì eslint/prettier config nằm ở đó). Nếu prettier báo lỗi, chạy `--write` rồi copy ngược kết quả về file nguồn (hoặc sửa file nguồn rồi prepare-custom lại).
- **Commit message**: tiếng Việt, conventional: `feat(scope): …`, `fix(scope): …`, `update(scope): …`, `docs(scope): …`, `chore(scope): …`. Scope gợi ý: `auth`, `upload`, `viewer`, `perf`, `scripts`, `docs`. Kết thúc body bằng dòng `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- **i18n**: chữ mới trên UI thêm vào `upstream/i18n/en.json` và `upstream/i18n/vi.json` (key phẳng, sắp xếp theo alphabet, ví dụ `"errors.unable_to_upload_file"`). File `.ts` trong `custom/src/` **không** import `svelte-i18n`.
- **Tài liệu**: viết tiếng Việt, cùng giọng với `docs/*.md` hiện có.
- **Media origin production**: `PUBLIC_IMMICH_MEDIA_URL=https://api.gallery-app.pp.ua` (ảnh/video/upload đi thẳng tunnel, bypass Vercel); REST JSON đi `/api` same-origin qua Vercel middleware → `IMMICH_SERVER_URL=https://immich.gallery-app.pp.ua`. Server production: Immich **3.1.0**, `realtimeTranscoding=false`.
- Server/SDK version hiện tại trong repo: `upstream/web` 3.1.0, `@immich/sdk` 3.1.0. **Không** sync upstream trong plan này.
- Phiên 30 phút cho tài khoản thường (`custom/src/hooks/session-expiry.ts`) **giữ nguyên**; chỉ bỏ phần "F5 → logout".

---

### Task 1: Bỏ cơ chế session-only auth (F5 / refresh → logout)

Cơ chế hiện tại: khi `PUBLIC_SESSION_ONLY_AUTH=true`, `beginBrowserSession()` xóa cờ `pg_session_active` trong `sessionStorage` mỗi lần load trang; `authManager.load()` thấy thiếu cờ → không restore phiên (trừ admin) → user bị văng ra login khi F5. Xóa toàn bộ cơ chế này, giữ: phiên 30 phút cho user thường, admin không hết hạn, reload chủ động khi chunk cũ (`reloadApp`).

**Files:**
- Create: `custom/src/hooks/app-reload.ts`
- Delete: `custom/src/hooks/session-auth.ts`
- Modify: `custom/src/hooks/session-expiry.ts`
- Modify: `overrides/lib/managers/auth-manager.svelte.ts`
- Modify: `custom/src/routes/auth/login/+page.svelte`
- Modify: `custom/src/hooks.client.ts`, `custom/src/routes/ErrorLayout.svelte`
- Modify: `config/src/env.ts`, `custom/src/routes/+layout.ts`, `.env.example`
- Test: `overrides/lib/managers/auth-manager.spec.ts`
- Bản copy commit cùng (sau `prepare-custom`): `upstream/web/src/hooks.client.ts`, `upstream/web/src/routes/ErrorLayout.svelte`, `upstream/web/src/routes/auth/login/+page.svelte`, `upstream/web/src/routes/+layout.ts`, `upstream/web/src/lib/managers/auth-manager.svelte.ts`, `upstream/web/src/lib/managers/auth-manager.spec.ts`

**Interfaces:**
- Consumes: `markSessionExpiry`, `markSessionNoExpiry`, `isSessionExpired`, `watchSessionExpiry`, `clearSessionExpiry`, `clearSessionNoExpiry` từ `$custom/hooks/session-expiry` (đã có).
- Produces: `reloadApp(): void` từ `$custom/hooks/app-reload` (thay cho `reloadPreservingSession`). `authManager.load()` chỉ còn: hết hạn → logout; đã authenticated → return; UI dev mode → restore; có cookie `immich_is_authenticated` → `refresh()`.

- [ ] **Step 1: Viết test đặc tả hành vi giữ lại**

Test này là characterization test: pass cả trước và sau khi xóa code (vì production đang để `PUBLIC_SESSION_ONLY_AUTH=false`). Mục đích: chốt rằng sau khi xóa cơ chế, reload với cookie vẫn restore phiên và expiry 30 phút vẫn hoạt động.

Tạo `overrides/lib/managers/auth-manager.spec.ts`:

```ts
import { getMyPreferences, getMyUser } from '@immich/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { preferencesFactory } from '@test-data/factories/preferences-factory';
import { userAdminFactory } from '@test-data/factories/user-factory';

vi.mock('@immich/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@immich/sdk')>();
  return {
    ...actual,
    getMyUser: vi.fn(),
    getMyPreferences: vi.fn(),
    getAboutInfo: vi.fn().mockResolvedValue({ licensed: false }),
    logout: vi.fn().mockResolvedValue({ successful: true, redirectUri: '/auth/login' }),
  };
});

const setAuthCookie = (present: boolean) => {
  document.cookie = present
    ? 'immich_is_authenticated=true; path=/'
    : 'immich_is_authenticated=; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
};

describe('authManager.load — F5 / reload giữ phiên', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    authManager.reset();
    vi.mocked(getMyUser).mockResolvedValue(userAdminFactory.build({ isAdmin: false }));
    vi.mocked(getMyPreferences).mockResolvedValue(preferencesFactory.build());
  });

  it('khôi phục phiên từ cookie dù sessionStorage trống (sau F5)', async () => {
    setAuthCookie(true);

    await authManager.load();

    expect(getMyUser).toHaveBeenCalledTimes(1);
    expect(authManager.authenticated).toBe(true);
  });

  it('không gọi API khi không có cookie đăng nhập', async () => {
    setAuthCookie(false);

    await authManager.load();

    expect(getMyUser).not.toHaveBeenCalled();
    expect(authManager.authenticated).toBe(false);
  });

  it('vẫn đăng xuất khi phiên 30 phút đã hết hạn', async () => {
    setAuthCookie(true);
    sessionStorage.setItem('pg_session_expires_at', String(Date.now() - 1000));
    const logoutSpy = vi.spyOn(authManager, 'logout').mockResolvedValue();

    await authManager.load();

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(getMyUser).not.toHaveBeenCalled();
  });

  it('admin: refresh đánh dấu phiên không hết hạn', async () => {
    setAuthCookie(true);
    vi.mocked(getMyUser).mockResolvedValue(userAdminFactory.build({ isAdmin: true }));

    await authManager.load();

    expect(sessionStorage.getItem('pg_session_no_expiry')).toBe('1');
  });
});
```

- [ ] **Step 2: Chạy test trên code hiện tại để xác nhận test hợp lệ**

Run: `bash scripts/prepare-custom.sh && pnpm --filter immich-web exec vitest run src/lib/managers/auth-manager.spec.ts`
Expected: 4/4 PASS (characterization). Nếu test 1 hoặc 2 FAIL vì cookie trong happy-dom, sửa `setAuthCookie` (ví dụ dùng `vi.spyOn(document, 'cookie', 'get')`) và ghi vào report.

- [ ] **Step 3: Tạo `custom/src/hooks/app-reload.ts`, xóa `session-auth.ts`**

```ts
/**
 * Reload do app chủ động (chunk JS cũ sau deploy, trang bảo trì).
 * Thêm `_pg=<timestamp>` để tránh bfcache; `hooks.client.ts` xóa param này ngay sau khi boot.
 */
export const reloadApp = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const next = new URL(location.href);
  next.searchParams.set('_pg', String(Date.now()));
  location.replace(`${next.pathname}${next.search}${next.hash}`);
};
```

Xóa file: `git rm custom/src/hooks/session-auth.ts`.

Trong `custom/src/hooks.client.ts`: đổi `import { reloadPreservingSession } from '$custom/hooks/session-auth';` → `import { reloadApp } from '$custom/hooks/app-reload';` và đổi lời gọi `reloadPreservingSession();` (trong `reloadOnceForStaleChunk`) → `reloadApp();`.

Trong `custom/src/routes/ErrorLayout.svelte`: đổi import dòng 4 → `import { reloadApp } from '$custom/hooks/app-reload';`, hai chỗ gọi `reloadPreservingSession()` (dòng 27 và 41) → `reloadApp()`.

- [ ] **Step 4: Sửa `custom/src/hooks/session-expiry.ts`**

Xóa dòng 1 `import { markAdminPersistentSession } from '$custom/hooks/session-auth';` và xóa hàm:

```ts
/** Admin — không giới hạn thời gian phiên và giữ session qua reload tab */
export const enableAdminSessionPersistence = (): void => {
  markSessionNoExpiry();
  markAdminPersistentSession();
};
```

Phần còn lại giữ nguyên (`markSessionExpiry`, `markSessionNoExpiry`, `clearSessionNoExpiry`, `isSessionNoExpiry`, `clearSessionExpiry`, `isSessionExpired`, `watchSessionExpiry`).

- [ ] **Step 5: Viết lại `overrides/lib/managers/auth-manager.svelte.ts`**

Nội dung đầy đủ mới (khác bản cũ: bỏ import `getAppConfig`, bỏ import `session-auth`, bỏ `beginBrowserSession`/`#restoreAdminFromCookie`/`#isSessionOnlyAuth`, `refresh()` chỉ gọi `markSessionNoExpiry()` cho admin):

```ts
import {
  createSession,
  getAboutInfo,
  getMyPreferences,
  getMyUser,
  logout,
  type UserAdminResponseDto,
  type UserPreferencesResponseDto,
} from '@immich/sdk';
import { clearDevSession, isUiDevMode, restoreDevSession } from '$custom/hooks/ui-dev-mode';
import { clearStoredAccessToken } from '$custom/hooks/access-token';
import {
  clearSessionExpiry,
  clearSessionNoExpiry,
  isSessionExpired,
  markSessionNoExpiry,
  watchSessionExpiry,
} from '$custom/hooks/session-expiry';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { eventManager } from '$lib/managers/event-manager.svelte';
import { Route } from '$lib/route';
import { isCrossOriginMediaBase } from '$lib/utils/media-base-url';
import { isSharedLinkRoute } from '$lib/utils/navigation';

const MEDIA_SESSION_DURATION_SECONDS = 60 * 60;
const MEDIA_SESSION_TIMEOUT_MS = 4000;

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

  /** Cookie không đi kèm media cross-origin — phải có sessionKey trên URL trước khi <img> load */
  get mediaAuthReady() {
    return this.isSharedLink || !isCrossOriginMediaBase() || !!this.#mediaSessionKey || this.#mediaSessionAttempted;
  }

  #user = $state<UserAdminResponseDto>();
  #preferences = $state<UserPreferencesResponseDto>();
  #mediaSessionKey = $state<string | undefined>();
  #mediaSessionAttempted = $state(false);
  #mediaSessionPromise: Promise<void> | undefined;
  #expiryWatcherCleanup: (() => void) | undefined;

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
      AuthLogin: () => {
        void this.ensureMediaSessionKey();
        this.#startSessionExpiryWatcher();
      },
    });
  }

  /** Mỗi lần load trang (kể cả F5): có cookie Immich là khôi phục phiên — không phụ thuộc sessionStorage. */
  async load() {
    if (this.#checkSessionExpiry()) {
      return;
    }

    if (authManager.authenticated) {
      await this.ensureMediaSessionKey();
      this.#startSessionExpiryWatcher();
      return;
    }

    if (isUiDevMode()) {
      restoreDevSession();
      return;
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

      if (user.isAdmin) {
        markSessionNoExpiry();
      }

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
      this.#startSessionExpiryWatcher();
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
      const sessionPromise = createSession({
        sessionCreateDto: {
          duration: MEDIA_SESSION_DURATION_SECONDS,
          deviceOS: 'Web',
          deviceType: 'Browser',
        },
      });

      const timeoutPromise = new Promise<'timeout'>((resolve) => {
        setTimeout(() => resolve('timeout'), MEDIA_SESSION_TIMEOUT_MS);
      });

      try {
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        if (result === 'timeout') {
          void sessionPromise
            .then((session) => {
              this.#mediaSessionKey = session.token;
            })
            .catch((error) => {
              console.warn('Failed to create media session key', error);
            });
          return;
        }

        this.#mediaSessionKey = result.token;
      } catch (error) {
        console.warn('Failed to create media session key', error);
      } finally {
        this.#mediaSessionAttempted = true;
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
    this.#mediaSessionAttempted = false;
    this.#mediaSessionPromise = undefined;
    this.#stopSessionExpiryWatcher();
    clearStoredAccessToken();
    clearSessionExpiry();
    clearSessionNoExpiry();
  }

  #checkSessionExpiry(): boolean {
    if (!browser || isUiDevMode() || !isSessionExpired()) {
      return false;
    }

    void this.logout();
    return true;
  }

  #startSessionExpiryWatcher() {
    if (!browser || isUiDevMode()) {
      return;
    }

    this.#stopSessionExpiryWatcher();

    if (this.#user?.isAdmin) {
      return;
    }

    this.#expiryWatcherCleanup = watchSessionExpiry(() => {
      void this.logout();
    });
  }

  #stopSessionExpiryWatcher() {
    this.#expiryWatcherCleanup?.();
    this.#expiryWatcherCleanup = undefined;
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
```

- [ ] **Step 6: Sửa trang login `custom/src/routes/auth/login/+page.svelte`**

- Xóa dòng 8: `import { markSessionActive } from '$custom/hooks/session-auth';`
- Đổi dòng 9: `import { enableAdminSessionPersistence, markSessionExpiry } from '$custom/hooks/session-expiry';` → `import { markSessionExpiry, markSessionNoExpiry } from '$custom/hooks/session-expiry';`
- Trong `enterAs` (khoảng dòng 88-90): `enableAdminSessionPersistence();` → `markSessionNoExpiry();`
- Trong `onSuccess` (khoảng dòng 147-154) thay:

```ts
    if (user.isAdmin) {
      enableAdminSessionPersistence();
    } else {
      markSessionExpiry();
      if (publicEnv.sessionOnlyAuth) {
        markSessionActive();
      }
    }
```

bằng:

```ts
    if (user.isAdmin) {
      markSessionNoExpiry();
    } else {
      markSessionExpiry();
    }
```

`const { publicEnv } = getAppConfig();` (dòng 83) **giữ nguyên** — `publicEnv.uiDevMode` còn dùng ở dòng 167 và 306.

- [ ] **Step 7: Xóa biến môi trường `PUBLIC_SESSION_ONLY_AUTH`**

`config/src/env.ts`: xóa dòng `  sessionOnlyAuth: boolean;` trong interface và dòng `  sessionOnlyAuth: readBool(env.PUBLIC_SESSION_ONLY_AUTH, false),` trong `createPublicEnv`.

`custom/src/routes/+layout.ts`: xóa `  PUBLIC_SESSION_ONLY_AUTH,` khỏi import `$env/static/public` (dòng 29) và khỏi object truyền vào `bootstrapAppConfig` (dòng 57).

`.env.example`: xóa dòng `PUBLIC_SESSION_ONLY_AUTH=false` (dòng 54). Giữ nguyên hunk `PUBLIC_APP_NAME=WeGallery` đã stage sẵn.

Kiểm tra không còn tham chiếu: `grep -rn "sessionOnlyAuth\|SESSION_ONLY_AUTH\|session-auth\|reloadPreservingSession\|enableAdminSessionPersistence\|markSessionActive\|AdminPersistentSession" custom overrides config scripts docs .env.example` → phải rỗng.

- [ ] **Step 8: Sync, test, check**

Run:
```bash
bash scripts/prepare-custom.sh
pnpm --filter immich-web exec vitest run src/lib/managers/auth-manager.spec.ts src/lib/utils/file-uploader.spec.ts
```
Expected: tất cả PASS (file-uploader.spec dùng `authManager.reset/setUser` — xác nhận API không vỡ).

Run svelte-check (lệnh ở Global Constraints); so với baseline: không có ERROR mới trong `auth-manager.svelte.ts`, `auth-manager.spec.ts`, `hooks.client.ts`, `ErrorLayout.svelte`, `auth/login/+page.svelte`, `routes/+layout.ts`; tổng ERRORS ≤ 30. Lưu ý: lỗi `rootDir` cho `$custom/...` import trong `.svelte` là lỗi có sẵn ở baseline.

Run eslint + prettier --check cho: `upstream/web/src/lib/managers/auth-manager.svelte.ts`, `upstream/web/src/lib/managers/auth-manager.spec.ts`, `upstream/web/src/hooks.client.ts`, `upstream/web/src/routes/ErrorLayout.svelte`, `upstream/web/src/routes/auth/login/+page.svelte`, `upstream/web/src/routes/+layout.ts`.

Xác nhận `upstream/web/src/hooks.client.ts` không còn import `session-auth` (bản copy do prepare-custom tạo).

- [ ] **Step 9: Commit**

```bash
git add custom/src/hooks/app-reload.ts custom/src/hooks/session-expiry.ts custom/src/hooks.client.ts \
  custom/src/routes/ErrorLayout.svelte custom/src/routes/auth/login/+page.svelte custom/src/routes/+layout.ts \
  overrides/lib/managers/auth-manager.svelte.ts overrides/lib/managers/auth-manager.spec.ts \
  config/src/env.ts .env.example \
  upstream/web/src/hooks.client.ts upstream/web/src/routes/ErrorLayout.svelte \
  upstream/web/src/routes/auth/login/+page.svelte upstream/web/src/routes/+layout.ts \
  upstream/web/src/lib/managers/auth-manager.svelte.ts upstream/web/src/lib/managers/auth-manager.spec.ts
git status --short   # xác nhận custom/src/hooks/session-auth.ts hiện là "D " (đã git rm)
git commit -m "fix(auth): không đăng xuất khi F5 / tải lại trang

Bỏ cơ chế session-only auth (PUBLIC_SESSION_ONLY_AUTH, pg_session_active, admin persistent session).
Có cookie Immich là khôi phục phiên. Phiên 30 phút cho user thường và admin không hết hạn giữ nguyên.
reloadPreservingSession đổi tên thành reloadApp (custom/src/hooks/app-reload.ts).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Script kiểm tra version Immich

Hiện trạng đã đo (2026-10-26): repo `upstream/web` 3.1.0, `@immich/sdk` 3.1.0, server production `https://immich.gallery-app.pp.ua/api/server/version` → `{"major":3,"minor":1,"patch":0}`, GitHub release mới nhất `v3.3.5` (2026-10-21), `upstream/main` package.json `3.3.0-rc.0`. Task này thêm script tái sử dụng + ghi trạng thái vào docs. **Không** nâng upstream.

**Files:**
- Create: `scripts/check-immich-version.mjs`
- Test: `scripts/check-immich-version.test.mjs` (Node test runner, `node --test`)
- Modify: `package.json` (thêm `check:version`, `test:scripts`), `docs/Upgrade.md`, `README.md` (bảng Scripts)

**Interfaces:**
- Produces: `parseVersion(input) → {major,minor,patch,prerelease}|null`, `formatVersion(v) → string`, `compareVersions(a,b) → -1|0|1`, `buildReport({web,sdk,server,latest}) → {…, status: 'match'|'mismatch'|'server-unreachable', updateAvailable: boolean}`; script `pnpm check:version [--url <server>]`, exit 0 / 1 (server không trả lời) / 2 (web và server lệch major.minor).

- [ ] **Step 1: Viết test (RED)**

Tạo `scripts/check-immich-version.test.mjs`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildReport, compareVersions, formatVersion, parseVersion } from './check-immich-version.mjs';

test('parseVersion đọc tag có v, prerelease và object từ /api/server/version', () => {
  assert.deepEqual(parseVersion('v3.3.5'), { major: 3, minor: 3, patch: 5, prerelease: null });
  assert.deepEqual(parseVersion('3.3.0-rc.0'), { major: 3, minor: 3, patch: 0, prerelease: 'rc.0' });
  assert.deepEqual(parseVersion({ major: 3, minor: 1, patch: 0, prerelease: null }), {
    major: 3,
    minor: 1,
    patch: 0,
    prerelease: null,
  });
  assert.equal(parseVersion('abc'), null);
  assert.equal(parseVersion(undefined), null);
});

test('compareVersions xếp prerelease trước bản chính thức', () => {
  assert.equal(compareVersions(parseVersion('3.1.0'), parseVersion('3.3.5')), -1);
  assert.equal(compareVersions(parseVersion('3.3.5'), parseVersion('3.3.5')), 0);
  assert.equal(compareVersions(parseVersion('3.3.0-rc.0'), parseVersion('3.3.0')), -1);
  assert.equal(compareVersions(parseVersion('4.0.0'), parseVersion('3.9.9')), 1);
});

test('buildReport báo khớp và có bản mới', () => {
  const report = buildReport({
    web: parseVersion('3.1.0'),
    sdk: parseVersion('3.1.0'),
    server: parseVersion('3.1.0'),
    latest: parseVersion('v3.3.5'),
  });
  assert.equal(report.status, 'match');
  assert.equal(report.updateAvailable, true);
});

test('buildReport báo lệch khi web và server khác minor', () => {
  const report = buildReport({
    web: parseVersion('3.1.0'),
    sdk: parseVersion('3.1.0'),
    server: parseVersion('3.3.5'),
    latest: undefined,
  });
  assert.equal(report.status, 'mismatch');
  assert.equal(report.updateAvailable, false);
});

test('buildReport báo không gọi được server', () => {
  const report = buildReport({ web: parseVersion('3.1.0'), sdk: null, server: null, latest: null });
  assert.equal(report.status, 'server-unreachable');
});

test('formatVersion', () => {
  assert.equal(formatVersion(parseVersion('3.3.0-rc.0')), '3.3.0-rc.0');
  assert.equal(formatVersion(null), 'n/a');
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `node --test scripts/check-immich-version.test.mjs`
Expected: FAIL — `Cannot find module '.../scripts/check-immich-version.mjs'`.

- [ ] **Step 3: Viết `scripts/check-immich-version.mjs`**

```js
#!/usr/bin/env node
/**
 * Kiểm tra version Immich: web + SDK trong repo, server đang chạy, release mới nhất trên GitHub.
 *
 * Usage:
 *   pnpm check:version
 *   node scripts/check-immich-version.mjs --url https://immich.gallery-app.pp.ua
 *   IMMICH_SERVER_URL=http://localhost:2283 node scripts/check-immich-version.mjs
 *
 * Exit code: 0 OK · 1 không gọi được server · 2 web và server lệch major.minor
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GITHUB_LATEST_RELEASE = 'https://api.github.com/repos/immich-app/immich/releases/latest';

/** @typedef {{ major: number; minor: number; patch: number; prerelease: string | null }} Version */

/**
 * "v3.3.5" | "3.3.0-rc.0" | { major, minor, patch, prerelease } → Version. Trả null nếu không đọc được.
 * @returns {Version | null}
 */
export const parseVersion = (input) => {
  if (input && typeof input === 'object') {
    const { major, minor, patch, prerelease } = input;
    if ([major, minor, patch].every((n) => Number.isInteger(n))) {
      return { major, minor, patch, prerelease: prerelease || null };
    }
    return null;
  }

  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(String(input ?? '').trim());
  if (!match) {
    return null;
  }

  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), prerelease: match[4] ?? null };
};

export const formatVersion = (version) => {
  if (!version) {
    return 'n/a';
  }
  const base = `${version.major}.${version.minor}.${version.patch}`;
  return version.prerelease ? `${base}-${version.prerelease}` : base;
};

/** -1 nếu a < b, 0 nếu bằng, 1 nếu a > b. Prerelease đứng trước bản chính thức cùng số. */
export const compareVersions = (a, b) => {
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) {
      return a[key] < b[key] ? -1 : 1;
    }
  }
  if (a.prerelease === b.prerelease) {
    return 0;
  }
  if (!a.prerelease) {
    return 1;
  }
  if (!b.prerelease) {
    return -1;
  }
  return a.prerelease < b.prerelease ? -1 : 1;
};

/** Tổng hợp trạng thái. `latest` có thể undefined/null khi GitHub không trả lời. */
export const buildReport = ({ web, sdk, server, latest }) => {
  const sameMinor = Boolean(web && server && web.major === server.major && web.minor === server.minor);
  const status = server ? (sameMinor ? 'match' : 'mismatch') : 'server-unreachable';
  const updateAvailable = Boolean(latest && server && compareVersions(latest, server) > 0);
  return { web, sdk, server, latest: latest ?? null, status, updateAvailable };
};

const loadEnvFile = (filePath) => {
  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

const readPackageVersion = (relativePath) => {
  const file = resolve(root, relativePath);
  if (!existsSync(file)) {
    return null;
  }
  return parseVersion(JSON.parse(readFileSync(file, 'utf8')).version);
};

const fetchJson = async (url, headers = {}) => {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${url}`);
  }
  return response.json();
};

const getArg = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const printReport = (report, serverUrl, latestPublishedAt) => {
  const latestLabel = report.latest
    ? `v${formatVersion(report.latest)}${latestPublishedAt ? ` (${latestPublishedAt})` : ''}`
    : 'không lấy được';
  const rows = [
    ['Web (upstream/web)', formatVersion(report.web)],
    ['SDK (@immich/sdk)', formatVersion(report.sdk)],
    [`Server (${serverUrl})`, formatVersion(report.server)],
    ['GitHub release mới nhất', latestLabel],
  ];
  const width = Math.max(...rows.map(([label]) => label.length));

  console.log('Immich version');
  for (const [label, value] of rows) {
    console.log(`  ${label.padEnd(width)}  ${value}`);
  }
  console.log('');

  if (report.status === 'server-unreachable') {
    console.log('Trạng thái: KHÔNG gọi được server.');
  } else if (report.status === 'mismatch') {
    console.log(
      `Trạng thái: LỆCH — web ${formatVersion(report.web)} vs server ${formatVersion(report.server)}. Sync upstream theo docs/Upgrade.md.`,
    );
  } else {
    console.log('Trạng thái: web và server cùng major.minor.');
  }

  if (report.updateAvailable) {
    console.log(`Có bản Immich mới v${formatVersion(report.latest)} — quy trình nâng cấp: docs/Upgrade.md`);
  }
};

const main = async () => {
  loadEnvFile(resolve(root, '.env'));
  const serverUrl = (getArg('--url') ?? process.env.IMMICH_SERVER_URL ?? 'http://localhost:2283').replace(/\/$/, '');

  const web = readPackageVersion('upstream/web/package.json');
  const sdk = readPackageVersion('upstream/packages/sdk/package.json');

  let server = null;
  try {
    server = parseVersion(await fetchJson(`${serverUrl}/api/server/version`));
  } catch (error) {
    console.error(`Không gọi được ${serverUrl}/api/server/version: ${error.message}`);
  }

  let latest = null;
  let latestPublishedAt;
  try {
    const release = await fetchJson(GITHUB_LATEST_RELEASE, {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'photo-gallery-ui-version-check',
    });
    latest = parseVersion(release.tag_name);
    latestPublishedAt = typeof release.published_at === 'string' ? release.published_at.slice(0, 10) : undefined;
  } catch (error) {
    console.error(`Không lấy được release GitHub: ${error.message}`);
  }

  const report = buildReport({ web, sdk, server, latest });
  printReport(report, serverUrl, latestPublishedAt);

  if (report.status === 'server-unreachable') {
    process.exit(1);
  }
  if (report.status === 'mismatch') {
    process.exit(2);
  }
};

const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Chạy test (GREEN) và chạy thật**

Run: `node --test scripts/check-immich-version.test.mjs`
Expected: 6 pass, 0 fail.

Run: `node scripts/check-immich-version.mjs --url https://immich.gallery-app.pp.ua`
Expected: bảng 4 dòng, web/SDK/server `3.1.0`, GitHub `v3.3.5 (2026-10-21)` (hoặc mới hơn), dòng "Có bản Immich mới …", exit 0. Dán output vào report.

- [ ] **Step 5: `package.json` + docs**

`package.json` → thêm vào `scripts` (sau `"check:range"`):
```json
    "check:version": "node scripts/check-immich-version.mjs",
    "test:scripts": "node --test \"scripts/**/*.test.mjs\"",
```
Run: `pnpm test:scripts` → Expected: 6 pass.

`README.md` bảng Scripts, thêm sau dòng `pnpm sync:upstream`:
```
| `pnpm check:version` | So version Immich web/SDK trong repo với server và release mới nhất |
```

`docs/Upgrade.md` — chèn **trước** mục `## Sau khi upgrade Immich major`:

```markdown
## Kiểm tra version

```bash
pnpm check:version
# hoặc
node scripts/check-immich-version.mjs --url https://immich.gallery-app.pp.ua
```

In version `upstream/web`, `@immich/sdk`, server đang chạy (`IMMICH_SERVER_URL` trong `.env` hoặc `--url`) và release mới nhất trên GitHub. Exit code `2` khi web và server lệch major.minor, `1` khi không gọi được server.

### Trạng thái 2026-10-26

| Thành phần | Version |
|---|---|
| `upstream/web` | 3.1.0 |
| `@immich/sdk` | 3.1.0 |
| Server production (immich.gallery-app.pp.ua) | 3.1.0 |
| Release mới nhất trên GitHub | v3.3.5 (2026-10-21) |

Web và server đang khớp. Khi nâng Docker Immich lên 3.3.x, sync `upstream/` cùng lúc (checklist ở trên) vì `@immich/sdk` sinh từ OpenAPI của đúng version server; chạy `pnpm check:version` sau mỗi lần nâng để xác nhận không lệch.
```

- [ ] **Step 6: Commit**

```bash
git add scripts/check-immich-version.mjs scripts/check-immich-version.test.mjs package.json docs/Upgrade.md README.md
git commit -m "feat(scripts): thêm pnpm check:version so version Immich web/SDK với server và GitHub

Trạng thái 2026-10-26: web/SDK/server 3.1.0, release mới nhất v3.3.5. Ghi vào docs/Upgrade.md.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Tối ưu upload ảnh/video giữ chất lượng gốc

Hiện trạng: `overrides/lib/utils/file-uploader.ts` đã upload thẳng tới media origin (bypass Vercel), 1 hàng đợi `concurrency: 2`, mỗi task **tuần tự** băm SHA-1 (Worker) rồi mới upload — lúc băm thì mạng rảnh, lúc upload thì CPU rảnh. File gửi đi bị bọc `new File([assetFile], assetFile.name)` làm mất `type`. Lỗi 413 (proxy/tunnel từ chối file lớn) hiện chỉ báo "không tải lên được".

Thay đổi: tách 2 hàng đợi (băm CPU ‖ upload mạng), concurrency theo mạng/thiết bị, giữ MIME + lastModified, picker mobile liệt kê rõ HEIC/HEIF/MOV, báo lỗi 413 rõ ràng. Không nén, không đổi file — browser luôn gửi byte gốc.

**Files:**
- Create: `overrides/lib/utils/upload-strategy.ts`
- Test: `overrides/lib/utils/upload-strategy.spec.ts`
- Move + extend: `overrides/lib/utils/file-uploader.spec.ts` (nội dung hiện tại của `upstream/web/src/lib/utils/file-uploader.spec.ts` + test mới; từ nay nguồn sự thật nằm ở overrides)
- Modify: `overrides/lib/utils/file-uploader.ts`
- Modify: `upstream/i18n/en.json`, `upstream/i18n/vi.json`
- Bản copy commit cùng: `upstream/web/src/lib/utils/upload-strategy.ts`, `upstream/web/src/lib/utils/upload-strategy.spec.ts`, `upstream/web/src/lib/utils/file-uploader.ts`, `upstream/web/src/lib/utils/file-uploader.spec.ts`

**Interfaces:**
- Consumes: `NetworkQuality`, `getNetworkQuality()`, `isCoarsePointer()`, `isNarrowViewport()` từ `$lib/utils/mobile-performance.svelte`; `ExecutorQueue` (`$lib/utils/executor-queue`, có setter `concurrency`); `uploadRequest` (`$lib/utils`, reject bằng `ApiError { statusCode }`); `handleError(error, localizedMessage)` (`$lib/utils/handle-error`).
- Produces: `getUploadConcurrency(quality, coarsePointer)`, `getHashConcurrency(hardwareConcurrency)`, `buildPickerAccept(extensions, mobile)`, `cloneFileForUpload(file)`, `isPayloadTooLarge(error)`; export `uploadExecutionQueue` (UploadPanel.svelte đọc/ghi `.concurrency` — giữ tên) và `hashExecutionQueue`.

- [ ] **Step 1: Chạy spec hiện có làm baseline**

Run: `pnpm --filter immich-web exec vitest run src/lib/utils/file-uploader.spec.ts`
Expected: PASS (ghi số test vào report). Nếu FAIL ngay từ baseline → report NEEDS_CONTEXT kèm output.

- [ ] **Step 2: Viết test cho `upload-strategy` (RED)**

Tạo `overrides/lib/utils/upload-strategy.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildPickerAccept,
  cloneFileForUpload,
  getHashConcurrency,
  getUploadConcurrency,
  isPayloadTooLarge,
} from './upload-strategy';

describe('getUploadConcurrency', () => {
  it('desktop mạng nhanh: 3 stream', () => {
    expect(getUploadConcurrency('fast', false)).toBe(3);
  });

  it('mobile mạng nhanh: 2 stream', () => {
    expect(getUploadConcurrency('fast', true)).toBe(2);
  });

  it('mạng chậm hoặc save-data: tuần tự', () => {
    expect(getUploadConcurrency('slow', false)).toBe(1);
    expect(getUploadConcurrency('save-data', true)).toBe(1);
  });
});

describe('getHashConcurrency', () => {
  it('chừa 1 core cho UI, tối đa 2 worker', () => {
    expect(getHashConcurrency(8)).toBe(2);
    expect(getHashConcurrency(3)).toBe(2);
    expect(getHashConcurrency(2)).toBe(1);
    expect(getHashConcurrency(1)).toBe(1);
    expect(getHashConcurrency(undefined)).toBe(1);
  });
});

describe('buildPickerAccept', () => {
  it('desktop: chỉ danh sách đuôi file', () => {
    expect(buildPickerAccept(['.jpg', '.mp4'], false)).toBe('.jpg,.mp4');
  });

  it('mobile: image/*, video/*, HEIC/HEIF/MOV rồi tới đuôi file, không trùng', () => {
    expect(buildPickerAccept(['.jpg', '.heic', 'image/heic'], true)).toBe(
      'image/*,video/*,image/heic,image/heif,video/quicktime,.jpg,.heic',
    );
  });
});

describe('cloneFileForUpload', () => {
  it('giữ nguyên tên, MIME và lastModified', () => {
    const source = new File(['x'], 'IMG_1.HEIC', { type: 'image/heic', lastModified: 1_700_000_000_000 });
    const clone = cloneFileForUpload(source);
    expect(clone.name).toBe('IMG_1.HEIC');
    expect(clone.type).toBe('image/heic');
    expect(clone.lastModified).toBe(1_700_000_000_000);
    expect(clone.size).toBe(1);
  });
});

describe('isPayloadTooLarge', () => {
  it('nhận lỗi 413 qua statusCode (ApiError) hoặc status (HttpError)', () => {
    expect(isPayloadTooLarge({ statusCode: 413 })).toBe(true);
    expect(isPayloadTooLarge({ status: 413 })).toBe(true);
    expect(isPayloadTooLarge({ statusCode: 500 })).toBe(false);
    expect(isPayloadTooLarge(new Error('x'))).toBe(false);
    expect(isPayloadTooLarge(undefined)).toBe(false);
  });
});
```

Run: `bash scripts/prepare-custom.sh && pnpm --filter immich-web exec vitest run src/lib/utils/upload-strategy.spec.ts`
Expected: FAIL — không resolve được `./upload-strategy`.

- [ ] **Step 3: Viết `overrides/lib/utils/upload-strategy.ts`**

```ts
import type { NetworkQuality } from '$lib/utils/mobile-performance.svelte';

/**
 * Số file upload song song. Nhiều stream giúp lô file nhỏ (giới hạn bởi latency qua tunnel),
 * không tăng băng thông cho một file lớn. Mạng chậm / save-data: tuần tự.
 */
export const getUploadConcurrency = (quality: NetworkQuality, coarsePointer: boolean): number => {
  if (quality !== 'fast') {
    return 1;
  }
  return coarsePointer ? 2 : 3;
};

/** Băm SHA-1 trong Worker — chừa 1 core cho UI, tối đa 2 worker. */
export const getHashConcurrency = (hardwareConcurrency: number | undefined): number => {
  const cores = hardwareConcurrency && hardwareConcurrency > 0 ? hardwareConcurrency : 2;
  return Math.max(1, Math.min(2, cores - 1));
};

/**
 * Picker mobile: ngoài image/* + video/*, liệt kê rõ HEIC/HEIF/MOV.
 * [Unverified] Một số bản iOS chuyển HEIC→JPEG khi accept chỉ có image/*; liệt kê rõ MIME là vô hại.
 */
const MOBILE_ACCEPT = ['image/*', 'video/*', 'image/heic', 'image/heif', 'video/quicktime'];

export const buildPickerAccept = (extensions: string[], mobile: boolean): string => {
  const list = mobile ? [...MOBILE_ACCEPT, ...extensions] : [...extensions];
  return [...new Set(list)].join(',');
};

/** Bọc File giữ nguyên MIME type + lastModified để multipart part có đúng Content-Type. */
export const cloneFileForUpload = (file: File): File =>
  new File([file], file.name, { type: file.type, lastModified: file.lastModified });

/** HTTP 413 — proxy/tunnel hoặc server từ chối vì file quá lớn. */
export const isPayloadTooLarge = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const { statusCode, status } = error as { statusCode?: unknown; status?: unknown };
  return statusCode === 413 || status === 413;
};
```

Run: `bash scripts/prepare-custom.sh && pnpm --filter immich-web exec vitest run src/lib/utils/upload-strategy.spec.ts`
Expected: 10 PASS.

- [ ] **Step 4: Chuyển spec file-uploader vào overrides và thêm test mới (RED)**

Copy `upstream/web/src/lib/utils/file-uploader.spec.ts` → `overrides/lib/utils/file-uploader.spec.ts` (nguyên văn), rồi thêm 2 test vào cuối `describe('fileUploader error handling', …)` (sau test `'should accept mobile HEIC by MIME when filename has no matching extension'`):

```ts
  it('giữ nguyên MIME type của file khi gửi multipart', async () => {
    const spy = vi.spyOn(utils, 'uploadRequest').mockResolvedValue({ status: 200, data: mockUploadResponse });

    await fileUploadHandler({ files: [mockFile] });

    const formData = spy.mock.calls[0][0].data as FormData;
    const sent = formData.get('assetData') as File;
    expect(sent.name).toBe('test.jpg');
    expect(sent.type).toBe('image/jpeg');
  });

  it('báo lỗi tệp quá lớn khi upload trả 413', async () => {
    const tooLarge = Object.assign(new Error('Payload Too Large'), { statusCode: 413 });
    vi.spyOn(utils, 'uploadRequest').mockRejectedValue(tooLarge);

    await fileUploadHandler({ files: [mockFile] });

    const items = get(uploadAssetsStore);
    expect(items[0].state).toBe(UploadState.ERROR);
    expect(String(items[0].error)).toContain('upload_file_too_large');
  });
```

Run: `bash scripts/prepare-custom.sh && pnpm --filter immich-web exec vitest run src/lib/utils/file-uploader.spec.ts`
Expected: 2 test mới FAIL (`sent.type` là `''`; message chứa `unable_to_upload_file`), test cũ PASS.

- [ ] **Step 5: Viết lại `overrides/lib/utils/file-uploader.ts`**

Nội dung đầy đủ mới:

```ts
import {
  AssetMediaStatus,
  AssetUploadAction,
  AssetVisibility,
  checkBulkUpload,
  type AssetMediaResponseDto,
} from '@immich/sdk';
import { toastManager } from '@immich/ui';
import { tick } from 'svelte';
import { t } from 'svelte-i18n';
import { get } from 'svelte/store';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { uploadManager } from '$lib/managers/upload-manager.svelte';
import { addAssetsToAlbums } from '$lib/services/album.service';
import { uploadAssetsStore } from '$lib/stores/upload';
import { UploadState } from '$lib/types';
import { uploadRequest } from '$lib/utils';
import { ExecutorQueue } from '$lib/utils/executor-queue';
import { getMediaBaseUrl, isCrossOriginMediaBase } from '$lib/utils/media-base-url';
import { getNetworkQuality, isCoarsePointer, isNarrowViewport } from '$lib/utils/mobile-performance.svelte';
import {
  buildPickerAccept,
  cloneFileForUpload,
  getHashConcurrency,
  getUploadConcurrency,
  isPayloadTooLarge,
} from '$lib/utils/upload-strategy';
import { handleError } from './handle-error';

const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/jpg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],
  'image/tiff': ['.tif', '.tiff'],
  'image/bmp': ['.bmp'],
  'video/mp4': ['.mp4', '.m4v'],
  'video/quicktime': ['.mov'],
  'video/webm': ['.webm'],
  'video/x-msvideo': ['.avi'],
  'video/avi': ['.avi'],
  'video/x-matroska': ['.mkv'],
  'video/3gpp': ['.3gp'],
};

const isMobilePicker = () => isCoarsePointer() || isNarrowViewport();

const normalizeExtension = (value: string) => {
  const lower = value.toLowerCase();
  if (lower.includes('/')) {
    return lower;
  }
  return lower.startsWith('.') ? lower : `.${lower}`;
};

export const isSupportedUploadFile = (file: File, extensions: string[]): boolean => {
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  const allowed = extensions.map(normalizeExtension);

  if (allowed.some((ext) => ext.startsWith('.') && name.endsWith(ext))) {
    return true;
  }

  if (type && allowed.includes(type)) {
    return true;
  }

  const mapped = MIME_TO_EXTENSIONS[type] ?? [];
  if (mapped.some((ext) => allowed.includes(ext))) {
    return true;
  }

  return false;
};

const uploadQueryString = (params: { slug?: string; key?: string; sessionKey?: string }) => {
  const search = new URLSearchParams();
  if (params.slug) {
    search.set('slug', params.slug);
  }
  if (params.key) {
    search.set('key', params.key);
  }
  if (params.sessionKey) {
    search.set('sessionKey', params.sessionKey);
  }
  return search.toString();
};

export const addDummyItems = () => {
  uploadAssetsStore.addItem({ id: 'asset-0', file: { name: 'asset0.jpg', size: 123_456 } as File });
  uploadAssetsStore.updateItem('asset-0', { state: UploadState.PENDING });
  uploadAssetsStore.addItem({ id: 'asset-1', file: { name: 'asset1.jpg', size: 123_456 } as File });
  uploadAssetsStore.updateItem('asset-1', { state: UploadState.STARTED });
  uploadAssetsStore.updateProgress('asset-1', 75, 100);
  uploadAssetsStore.addItem({ id: 'asset-2', file: { name: 'asset2.jpg', size: 123_456 } as File });
  uploadAssetsStore.updateItem('asset-2', { state: UploadState.ERROR, error: new Error('Internal server error') });
  uploadAssetsStore.addItem({ id: 'asset-3', file: { name: 'asset3.jpg', size: 123_456 } as File });
  uploadAssetsStore.updateItem('asset-3', { state: UploadState.DUPLICATED, assetId: 'asset-2' });
  uploadAssetsStore.addItem({ id: 'asset-4', file: { name: 'asset3.jpg', size: 123_456 } as File });
  uploadAssetsStore.updateItem('asset-4', { state: UploadState.DUPLICATED, assetId: 'asset-2', isTrashed: true });
  uploadAssetsStore.addItem({ id: 'asset-10', file: { name: 'asset3.jpg', size: 123_456 } as File });
  uploadAssetsStore.updateItem('asset-10', { state: UploadState.DONE });
  uploadAssetsStore.track('error');
  uploadAssetsStore.track('success');
  uploadAssetsStore.track('duplicate');
};

// addDummyItems();

/** Hàng đợi mạng — UploadPanel.svelte đọc/ghi `.concurrency`. */
export const uploadExecutionQueue = new ExecutorQueue({
  concurrency: getUploadConcurrency(getNetworkQuality(), isCoarsePointer()),
});

/** Hàng đợi CPU — băm SHA-1 file kế tiếp trong lúc file trước đang upload. */
export const hashExecutionQueue = new ExecutorQueue({
  concurrency: getHashConcurrency(typeof navigator === 'undefined' ? undefined : navigator.hardwareConcurrency),
});

type FilePickerParam = { multiple?: boolean; extensions?: string[] };
type FileUploadParam = { multiple?: boolean; albumId?: string };

export const openFilePicker = async (options: FilePickerParam = {}) => {
  const { multiple = true, extensions } = options;

  return new Promise<File[]>((resolve, reject) => {
    try {
      const fileSelector = document.createElement('input');

      fileSelector.type = 'file';
      fileSelector.multiple = multiple;

      if (extensions) {
        fileSelector.accept = buildPickerAccept(extensions, isMobilePicker());
      }

      fileSelector.addEventListener(
        'change',
        (e: Event) => {
          fileSelector.remove();

          const target = e.target as HTMLInputElement;
          if (!target.files) {
            return;
          }

          const files = Array.from(target.files);
          resolve(files);
        },
        { passive: true },
      );

      fileSelector.addEventListener('cancel', () => fileSelector.remove(), { passive: true });

      // Safari requires the file selector to be mounted
      fileSelector.hidden = true;
      document.body.append(fileSelector);
      fileSelector.click();
    } catch (error) {
      console.log('Error selecting file', error);
      reject(error);
    }
  });
};

export const openFileUploadDialog = async (options: FileUploadParam = {}) => {
  const { albumId, multiple = true } = options;
  const extensions = uploadManager.getExtensions();
  const files = await openFilePicker({
    multiple,
    extensions,
  });

  return fileUploadHandler({ files, albumId });
};

type FileUploadHandlerParams = Omit<FileUploaderParams, 'deviceAssetId' | 'assetFile'> & {
  files: File[];
};

export const fileUploadHandler = async ({
  files,
  albumId,
  isLockedAssets = false,
}: FileUploadHandlerParams): Promise<string[]> => {
  const extensions = uploadManager.getExtensions();
  const promises = [];
  for (const file of files) {
    if (isSupportedUploadFile(file, extensions)) {
      const deviceAssetId = getDeviceAssetId(file);
      uploadAssetsStore.addItem({ id: deviceAssetId, file, albumId });
      // fileUploader tự xếp hàng từng giai đoạn (băm → upload) nên không bọc thêm queue ở đây.
      promises.push(fileUploader({ deviceAssetId, assetFile: file, albumId, isLockedAssets }));
    } else {
      toastManager.warning(get(t)('unsupported_file_type', { values: { file: file.name, type: file.type } }), {
        timeout: 10_000,
      });
    }
  }

  const results = await Promise.all(promises);
  return results.filter((result): result is string => !!result);
};

function getDeviceAssetId(asset: File) {
  return 'web-' + asset.name + '-' + asset.lastModified;
}

function hashFile(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const worker = new Worker(new URL('$lib/workers/hash-file.ts', import.meta.url), { type: 'module' });

    worker.addEventListener('message', ({ data }: MessageEvent<{ result?: string; error?: string }>) => {
      worker.terminate();

      if (data.error) {
        reject(new Error(data.error));
      } else {
        resolve(data.result!);
      }
    });

    worker.addEventListener('error', (event) => {
      worker.terminate();

      reject(new Error(event.message));
    });

    worker.postMessage(file);
  });
}

type FileUploaderParams = {
  assetFile: File;
  albumId?: string;
  replaceAssetId?: string;
  isLockedAssets?: boolean;
  // TODO rework the asset uploader and remove this
  deviceAssetId: string;
};

type UploadResult = { id: string; status: AssetMediaStatus; isTrashed?: boolean };

/** Giai đoạn 1 (CPU): băm SHA-1 trong Worker rồi hỏi server đã có file chưa. */
async function checkDuplicate(assetFile: File, deviceAssetId: string): Promise<UploadResult | undefined> {
  const $t = get(t);
  uploadAssetsStore.markStarted(deviceAssetId);
  uploadAssetsStore.updateItem(deviceAssetId, { message: $t('asset_hashing') });
  await tick();

  try {
    const checksum = await hashFile(assetFile);

    const {
      results: [checkUploadResult],
    } = await checkBulkUpload({ assetBulkUploadCheckDto: { assets: [{ id: assetFile.name, checksum }] } });
    if (checkUploadResult.action === AssetUploadAction.Reject && checkUploadResult.assetId) {
      return {
        status: AssetMediaStatus.Duplicate,
        id: checkUploadResult.assetId,
        isTrashed: checkUploadResult.isTrashed,
      };
    }
  } catch (error) {
    console.error(`Error calculating sha1 file=${assetFile.name})`, error);
  }

  return undefined;
}

type UploadFileParams = {
  assetFile: File;
  deviceAssetId: string;
  isLockedAssets: boolean;
  /** true khi không có giai đoạn băm (shared link) — đánh dấu STARTED ở đây. */
  markStarted: boolean;
};

/** Giai đoạn 2 (mạng): POST multipart tới media origin (bypass Vercel), byte gốc không chỉnh sửa. */
async function uploadFile({ assetFile, deviceAssetId, isLockedAssets, markStarted }: UploadFileParams): Promise<UploadResult> {
  const $t = get(t);
  if (markStarted) {
    uploadAssetsStore.markStarted(deviceAssetId);
  }

  const formData = new FormData();
  for (const [key, value] of Object.entries({
    fileCreatedAt: new Date(assetFile.lastModified).toISOString(),
    fileModifiedAt: new Date(assetFile.lastModified).toISOString(),
    isFavorite: 'false',
    assetData: cloneFileForUpload(assetFile),
  })) {
    formData.append(key, value);
  }

  if (isLockedAssets) {
    formData.append('visibility', AssetVisibility.Locked);
  }

  if (isCrossOriginMediaBase()) {
    await authManager.ensureMediaSessionKey();
  }

  const queryParams = uploadQueryString(authManager.params);
  const uploadHeaders: Record<string, string> = {};
  if ('sessionKey' in authManager.params && authManager.params.sessionKey) {
    uploadHeaders.Authorization = `Bearer ${authManager.params.sessionKey}`;
  }

  uploadAssetsStore.updateItem(deviceAssetId, { message: $t('asset_uploading') });
  const response = await uploadRequest<AssetMediaResponseDto>({
    url: getMediaBaseUrl() + '/assets' + (queryParams ? `?${queryParams}` : ''),
    data: formData,
    headers: uploadHeaders,
    onUploadProgress: (event) => uploadAssetsStore.updateProgress(deviceAssetId, event.loaded, event.total),
  });

  if (![200, 201].includes(response.status)) {
    throw new Error($t('errors.unable_to_upload_file'));
  }

  return response.data;
}

// TODO: should probably use the @api SDK
async function fileUploader({
  assetFile,
  deviceAssetId,
  albumId,
  isLockedAssets = false,
}: FileUploaderParams): Promise<string | undefined> {
  const $t = get(t);
  const wasInitiallyLoggedIn = !!authManager.authenticated;

  try {
    let responseData: UploadResult | undefined;
    const skipHashing = authManager.isSharedLink;

    if (!skipHashing) {
      responseData = await hashExecutionQueue.addTask(() => checkDuplicate(assetFile, deviceAssetId));
    }

    if (!responseData) {
      responseData = await uploadExecutionQueue.addTask(() =>
        uploadFile({ assetFile, deviceAssetId, isLockedAssets, markStarted: skipHashing }),
      );
    }

    if (responseData.status === AssetMediaStatus.Duplicate) {
      uploadAssetsStore.track('duplicate');
    } else {
      uploadAssetsStore.track('success');
    }

    if (albumId && !authManager.isSharedLink) {
      uploadAssetsStore.updateItem(deviceAssetId, { message: $t('asset_adding_to_album') });
      await addAssetsToAlbums([albumId], [responseData.id], { notify: false });
      uploadAssetsStore.updateItem(deviceAssetId, { message: $t('asset_added_to_album') });
    }

    uploadAssetsStore.updateItem(deviceAssetId, {
      state: responseData.status === AssetMediaStatus.Duplicate ? UploadState.DUPLICATED : UploadState.DONE,
      assetId: responseData.id,
      isTrashed: responseData.isTrashed,
    });

    if (responseData.status !== AssetMediaStatus.Duplicate) {
      setTimeout(() => {
        uploadAssetsStore.removeItem(deviceAssetId);
      }, 1000);
    }

    return responseData.id;
  } catch (error) {
    // If the user store no longer holds a user, it means they have logged out
    // In this case don't bother reporting any errors.
    if (wasInitiallyLoggedIn && !authManager.authenticated) {
      return;
    }

    const fallbackMessage = isPayloadTooLarge(error)
      ? $t('errors.upload_file_too_large')
      : $t('errors.unable_to_upload_file');
    const errorMessage = handleError(error, fallbackMessage);
    uploadAssetsStore.track('error');
    uploadAssetsStore.updateItem(deviceAssetId, { state: UploadState.ERROR, error: errorMessage });
    return;
  }
}
```

- [ ] **Step 6: i18n**

`upstream/i18n/en.json`: ngay sau dòng `"errors.unable_to_upload_file": …` thêm
```json
  "errors.upload_file_too_large": "The file is too large for the upload path (HTTP 413). Try a smaller file or upload from the mobile app.",
```
`upstream/i18n/vi.json`: ngay sau dòng `"errors.unable_to_upload_file": …` thêm
```json
  "errors.upload_file_too_large": "Tệp quá lớn, đường tải lên từ chối (HTTP 413). Hãy thử tệp nhỏ hơn hoặc tải từ ứng dụng di động.",
```
Kiểm tra JSON hợp lệ: `node -e "JSON.parse(require('fs').readFileSync('upstream/i18n/en.json','utf8'));JSON.parse(require('fs').readFileSync('upstream/i18n/vi.json','utf8'));console.log('ok')"`.

- [ ] **Step 7: Sync, test, check**

Run:
```bash
bash scripts/prepare-custom.sh
pnpm --filter immich-web exec vitest run src/lib/utils/file-uploader.spec.ts src/lib/utils/upload-strategy.spec.ts src/lib/utils/executor-queue.spec.ts
```
Expected: tất cả PASS (file-uploader: 12 test gồm 2 mới).

svelte-check: không ERROR mới trong `file-uploader.ts`, `upload-strategy.ts`, 2 spec; tổng ≤ 30. eslint + prettier --check cho 4 file trong `upstream/web/src/lib/utils/`.

Xác nhận `diff overrides/lib/utils/file-uploader.spec.ts upstream/web/src/lib/utils/file-uploader.spec.ts` rỗng.

- [ ] **Step 8: Commit**

```bash
git add overrides/lib/utils/upload-strategy.ts overrides/lib/utils/upload-strategy.spec.ts \
  overrides/lib/utils/file-uploader.ts overrides/lib/utils/file-uploader.spec.ts \
  upstream/i18n/en.json upstream/i18n/vi.json \
  upstream/web/src/lib/utils/upload-strategy.ts upstream/web/src/lib/utils/upload-strategy.spec.ts \
  upstream/web/src/lib/utils/file-uploader.ts upstream/web/src/lib/utils/file-uploader.spec.ts
git commit -m "update(upload): băm và tải lên chạy song song, giữ MIME gốc, báo rõ lỗi 413

Tách hàng đợi băm SHA-1 (CPU) và upload (mạng); số stream theo mạng/thiết bị (desktop 3, mobile 2, mạng chậm 1).
File gửi đi giữ nguyên type + lastModified. Picker mobile liệt kê rõ HEIC/HEIF/MOV.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Xem ảnh/video chất lượng cao nhất nhưng vẫn nhanh

Hiện trạng: `scripts/patch-mobile-performance.py::patch_force_compressed_media` **ép tắt** ảnh gốc / video gốc cho mọi người dùng (ghi `always-load-original-file=false`, `always-load-original-video=false` vào localStorage mỗi lần load, ẩn nút "Phát video gốc", `isPlayingOriginalVideo = $state(false)`), và trang Cài đặt custom đã bỏ 2 toggle tương ứng. Ảnh trong viewer dừng ở preview (1440px), chỉ tải gốc khi zoom.

Thay đổi:
1. Bỏ ép tắt; trả lại 2 toggle trong Cài đặt và nút "Phát video gốc" trên thanh viewer (tuỳ chọn người dùng, mặc định như upstream: tắt).
2. Ảnh: thang thumbnail → preview → **tự nâng lên gốc** sau khi preview hiện, chỉ khi mạng nhanh **và** preview nhỏ hơn vùng hiển thị × DPR (preview đủ nét thì không tải thêm — đó là phần "phải nhanh"). Zoom vẫn tải gốc như cũ.
3. `<link rel="preconnect">` tới media origin trong `<head>` (DNS + TLS mở sẵn trước ảnh đầu tiên).
4. Changelog modal + docs.

**Files:**
- Modify: `scripts/patch-mobile-performance.py` (xóa `patch_force_compressed_media` + lời gọi)
- Modify: `upstream/web/src/lib/stores/preferences.store.ts` (xóa block ép tắt — file này không có override)
- Modify: `overrides/lib/components/asset-viewer/AssetViewerNavBar.svelte`, `overrides/lib/components/asset-viewer/AssetViewer.svelte`
- Modify: `custom/src/routes/(user)/user-settings/AppSettings.svelte`
- Create: `overrides/lib/utils/image-quality.ts`, Test: `overrides/lib/utils/image-quality.spec.ts`
- Create: `overrides/lib/components/AdaptiveImage.svelte` (copy upstream + sửa)
- Create: `overrides/lib/utils/media-origin-hints.ts`, Test: `overrides/lib/utils/media-origin-hints.spec.ts`
- Modify: `custom/src/hooks.server.ts`
- Modify: `custom/src/data/feature-updates.json`, `docs/Environment.md`
- Bản copy commit cùng: `upstream/web/src/lib/components/asset-viewer/AssetViewerNavBar.svelte`, `upstream/web/src/lib/components/asset-viewer/AssetViewer.svelte`, `upstream/web/src/routes/(user)/user-settings/AppSettings.svelte`, `upstream/web/src/lib/utils/image-quality.ts`, `upstream/web/src/lib/utils/image-quality.spec.ts`, `upstream/web/src/lib/components/AdaptiveImage.svelte`, `upstream/web/src/lib/utils/media-origin-hints.ts`, `upstream/web/src/lib/utils/media-origin-hints.spec.ts`, `upstream/web/src/hooks.server.ts`, `upstream/web/src/routes/FeatureUpdateModal.svelte` không đổi (JSON đọc qua `$custom`)

**Interfaces:**
- Consumes: `getNetworkQuality(): NetworkQuality` (`$lib/utils/mobile-performance.svelte`); `AdaptiveImageLoader`, `QualityList`, `QualityConfig.onAfterLoad?: (loader) => void` (`$lib/utils/adaptive-image-loader.svelte`); `getAssetUrls(asset, sharedLink) → { thumbnail, preview, original }`; `scaleToFit/scaleToCover(size, container) → { width, height }`; `PUBLIC_IMMICH_MEDIA_URL` (`$env/static/public`, đã khai báo trong `upstream/web/src/app.d.ts`).
- Produces: `shouldUpgradeToOriginal(input): boolean` (`$lib/utils/image-quality`), `buildMediaOriginHints(mediaUrl): string` (`$lib/utils/media-origin-hints`).

- [ ] **Step 1: Test `image-quality` (RED)**

Tạo `overrides/lib/utils/image-quality.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { shouldUpgradeToOriginal } from './image-quality';

const base = {
  network: 'fast' as const,
  preview: { width: 1440, height: 1080 },
  display: { width: 1440, height: 1080 },
  devicePixelRatio: 1,
  original: { width: 6000, height: 4500 },
};

describe('shouldUpgradeToOriginal', () => {
  it('không nâng khi mạng chậm hoặc save-data', () => {
    expect(shouldUpgradeToOriginal({ ...base, network: 'slow', devicePixelRatio: 2 })).toBe(false);
    expect(shouldUpgradeToOriginal({ ...base, network: 'save-data', devicePixelRatio: 2 })).toBe(false);
  });

  it('không nâng khi preview đã phủ đủ vùng hiển thị (DPR 1)', () => {
    expect(shouldUpgradeToOriginal(base)).toBe(false);
  });

  it('nâng khi màn hình DPR 2 cần nhiều pixel hơn preview', () => {
    expect(shouldUpgradeToOriginal({ ...base, devicePixelRatio: 2 })).toBe(true);
  });

  it('không nâng khi preview chỉ thiếu trong ngưỡng 10%', () => {
    expect(shouldUpgradeToOriginal({ ...base, display: { width: 1560, height: 1170 } })).toBe(false);
    expect(shouldUpgradeToOriginal({ ...base, display: { width: 1600, height: 1200 } })).toBe(true);
  });

  it('không nâng khi ảnh gốc không lớn hơn preview', () => {
    expect(
      shouldUpgradeToOriginal({ ...base, devicePixelRatio: 2, original: { width: 1440, height: 1080 } }),
    ).toBe(false);
  });

  it('nâng khi không biết kích thước gốc nhưng preview thiếu pixel', () => {
    expect(shouldUpgradeToOriginal({ ...base, devicePixelRatio: 2, original: undefined })).toBe(true);
    expect(shouldUpgradeToOriginal({ ...base, devicePixelRatio: 2, original: { width: null, height: null } })).toBe(
      true,
    );
  });

  it('không nâng khi thiếu preview hoặc vùng hiển thị bằng 0', () => {
    expect(shouldUpgradeToOriginal({ ...base, devicePixelRatio: 2, preview: undefined })).toBe(false);
    expect(shouldUpgradeToOriginal({ ...base, devicePixelRatio: 2, preview: { width: 0, height: 0 } })).toBe(false);
    expect(shouldUpgradeToOriginal({ ...base, devicePixelRatio: 2, display: { width: 0, height: 0 } })).toBe(false);
  });
});
```

Run: `bash scripts/prepare-custom.sh && pnpm --filter immich-web exec vitest run src/lib/utils/image-quality.spec.ts`
Expected: FAIL — không resolve `./image-quality`.

- [ ] **Step 2: Viết `overrides/lib/utils/image-quality.ts`**

```ts
import type { NetworkQuality } from '$lib/utils/mobile-performance.svelte';

export type PixelSize = { width: number; height: number };

export type UpgradeToOriginalInput = {
  network: NetworkQuality;
  /** naturalWidth/naturalHeight của ảnh preview đã tải; undefined khi chưa có. */
  preview: PixelSize | undefined;
  /** Vùng hiển thị ảnh sau khi fit (CSS px). */
  display: PixelSize;
  devicePixelRatio: number;
  /** Kích thước ảnh gốc theo metadata asset, nếu biết. */
  original?: { width?: number | null; height?: number | null };
};

/** Preview thiếu dưới 10% pixel so với màn hình thì coi là đủ nét — không tải gốc. */
const UPGRADE_SLACK = 1.1;

/**
 * Chỉ tải ảnh gốc khi nó thực sự nét hơn preview trên màn hình này:
 * mạng nhanh, preview nhỏ hơn vùng hiển thị × DPR (quá ngưỡng 10%), và ảnh gốc lớn hơn preview.
 */
export const shouldUpgradeToOriginal = ({
  network,
  preview,
  display,
  devicePixelRatio,
  original,
}: UpgradeToOriginalInput): boolean => {
  if (network !== 'fast') {
    return false;
  }

  if (!preview || preview.width <= 0 || preview.height <= 0) {
    return false;
  }

  if (display.width <= 0 || display.height <= 0) {
    return false;
  }

  const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
  const neededWidth = display.width * dpr;
  const neededHeight = display.height * dpr;
  const previewSharpEnough =
    preview.width * UPGRADE_SLACK >= neededWidth && preview.height * UPGRADE_SLACK >= neededHeight;
  if (previewSharpEnough) {
    return false;
  }

  const originalWidth = original?.width ?? 0;
  const originalHeight = original?.height ?? 0;
  if (originalWidth > 0 && originalHeight > 0 && originalWidth <= preview.width && originalHeight <= preview.height) {
    return false;
  }

  return true;
};
```

Run spec → Expected: 7 PASS.

- [ ] **Step 3: Test `media-origin-hints` (RED) rồi viết hàm**

Tạo `overrides/lib/utils/media-origin-hints.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildMediaOriginHints } from './media-origin-hints';

describe('buildMediaOriginHints', () => {
  it('rỗng khi không cấu hình media URL hoặc URL không hợp lệ', () => {
    expect(buildMediaOriginHints('')).toBe('');
    expect(buildMediaOriginHints(undefined)).toBe('');
    expect(buildMediaOriginHints('   ')).toBe('');
    expect(buildMediaOriginHints('not a url')).toBe('');
  });

  it('tạo preconnect + dns-prefetch tới origin, bỏ path và dấu / cuối, không crossorigin', () => {
    const html = buildMediaOriginHints('https://api.gallery-app.pp.ua/');
    expect(html).toContain('<link rel="preconnect" href="https://api.gallery-app.pp.ua" />');
    expect(html).toContain('<link rel="dns-prefetch" href="https://api.gallery-app.pp.ua" />');
    expect(html).not.toContain('crossorigin');
    expect(buildMediaOriginHints('https://api.gallery-app.pp.ua/api')).toContain('href="https://api.gallery-app.pp.ua"');
  });
});
```

Run → Expected FAIL (module thiếu). Tạo `overrides/lib/utils/media-origin-hints.ts`:

```ts
/**
 * Thẻ <link> mở sẵn kết nối (DNS + TLS) tới media origin — chèn vào <head> lúc build qua hooks.server.ts.
 * Không đặt `crossorigin`: <img>/<video> fetch kiểu no-CORS, kết nối preconnect có crossorigin sẽ không được tái dùng.
 */
export const buildMediaOriginHints = (mediaUrl: string | undefined): string => {
  const trimmed = (mediaUrl ?? '').trim().replace(/\/$/, '');
  if (!trimmed) {
    return '';
  }

  let origin: string;
  try {
    origin = new URL(trimmed).origin;
  } catch {
    return '';
  }

  return `<link rel="preconnect" href="${origin}" />\n    <link rel="dns-prefetch" href="${origin}" />`;
};
```

Run → Expected: 2 PASS.

- [ ] **Step 4: `custom/src/hooks.server.ts` chèn hints**

Thay toàn bộ file bằng:

```ts
import { PUBLIC_IMMICH_MEDIA_URL } from '$env/static/public';
import { buildMediaOriginHints } from '$lib/utils/media-origin-hints';
import type { Handle } from '@sveltejs/kit';

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
```

- [ ] **Step 5: Bỏ ép tắt media gốc**

`scripts/patch-mobile-performance.py`: xóa toàn bộ hàm `patch_force_compressed_media` (từ `def patch_force_compressed_media(web: pathlib.Path) -> None:` đến trước `def patch_auth_manager_media_session`) và xóa dòng `    patch_force_compressed_media(web)` trong `main()`.

`upstream/web/src/lib/stores/preferences.store.ts` (dòng 130-134): xóa

```ts
if (browser) {
  localStorage.setItem('always-load-original-file', 'false');
  localStorage.setItem('always-load-original-video', 'false');
}

```

Kiểm tra `browser` còn được dùng chỗ khác trong file (`grep -n "browser" upstream/web/src/lib/stores/preferences.store.ts`); nếu chỉ còn ở dòng import thì xóa cả import `import { browser } from '$app/environment';`. So với upstream gốc: `git show v3.1.0:web/src/lib/stores/preferences.store.ts | grep -n browser` cho biết upstream có dùng hay không.

`overrides/lib/components/asset-viewer/AssetViewerNavBar.svelte` (dòng 85): `    $if: () => false,` → `    $if: () => asset.type === AssetTypeEnum.Video,` (`AssetTypeEnum` đã import ở dòng 28).

`overrides/lib/components/asset-viewer/AssetViewer.svelte` (dòng 147): `  let isPlayingOriginalVideo = $state(false);` → `  let isPlayingOriginalVideo = $state($alwaysLoadOriginalVideo);` (import có sẵn ở dòng 23).

`custom/src/routes/(user)/user-settings/AppSettings.svelte`:
- import từ `$lib/stores/preferences.store` thêm `alwaysLoadOriginalFile,` và `alwaysLoadOriginalVideo,` (đầu danh sách, giữ thứ tự alphabet).
- Trước `<Field label={$t('video_hover_setting')} …>` chèn:
```svelte
      <Field label={$t('display_original_photos')} description={$t('display_original_photos_setting_description')}>
        <Switch bind:checked={$alwaysLoadOriginalFile} />
      </Field>

```
- Sau `</Field>` của `loop_videos` chèn:
```svelte

      <Field label={$t('play_original_video')} description={$t('play_original_video_setting_description')}>
        <Switch bind:checked={$alwaysLoadOriginalVideo} />
      </Field>
```
(4 key i18n này có sẵn trong upstream/i18n.)

- [ ] **Step 6: Override `AdaptiveImage.svelte` — tự nâng lên ảnh gốc**

Xác nhận bản upstream chưa bị sửa: `diff <(git show v3.1.0:web/src/lib/components/AdaptiveImage.svelte) upstream/web/src/lib/components/AdaptiveImage.svelte` → rỗng. Copy `upstream/web/src/lib/components/AdaptiveImage.svelte` → `overrides/lib/components/AdaptiveImage.svelte` rồi sửa đúng 4 chỗ:

(a) Sau dòng `  import { AdaptiveImageLoader, type QualityList } from '$lib/utils/adaptive-image-loader.svelte';` thêm:
```ts
  import { shouldUpgradeToOriginal } from '$lib/utils/image-quality';
  import { getNetworkQuality } from '$lib/utils/mobile-performance.svelte';
```

(b) Di chuyển 3 dòng
```ts
  let thumbnailElement = $state<HTMLImageElement>();
  let previewElement = $state<HTMLImageElement>();
  let originalElement = $state<HTMLImageElement>();
```
lên ngay **trước** `const afterThumbnail = (loader: AdaptiveImageLoader) => {` (xóa ở vị trí cũ).

(c) Thay toàn bộ `const buildQualityList = () => { … };` bằng:
```ts
  // Sau khi preview hiện: nâng lên ảnh gốc nếu màn hình này cần (mạng nhanh, preview chưa đủ nét). Zoom vẫn tải gốc như cũ.
  const buildQualityList = () => {
    const assetUrls = getAssetUrls(asset, sharedLink);
    const afterPreview = (loader: AdaptiveImageLoader) => {
      if (assetUrls.preview === assetUrls.original) {
        return;
      }
      const previewSize =
        previewElement && previewElement.naturalWidth > 0
          ? { width: previewElement.naturalWidth, height: previewElement.naturalHeight }
          : undefined;
      const upgrade = shouldUpgradeToOriginal({
        network: getNetworkQuality(),
        preview: previewSize,
        display: fitSize,
        devicePixelRatio: globalThis.devicePixelRatio || 1,
        original: { width: asset.width, height: asset.height },
      });
      if (upgrade) {
        loader.trigger('original');
      }
    };
    const qualityList: QualityList = [
      {
        quality: 'thumbnail',
        url: assetUrls.thumbnail,
        onAfterLoad: afterThumbnail,
        onAfterError: afterThumbnail,
      },
      {
        quality: 'preview',
        url: assetUrls.preview,
        onAfterLoad: afterPreview,
        onAfterError: (loader) => loader.trigger('original'),
      },
      { quality: 'original', url: assetUrls.original },
    ];
    return qualityList;
  };
```

(d) Trong khối `$derived.by(() => { … })` tính `insetInlineStart, top, displayWidth, …`: thay 2 dòng
```ts
      const scaleFn = objectFit === 'cover' ? scaleToCover : scaleToFit;
      const { width, height } = scaleFn(imageDimensions, container);
```
bằng
```ts
      const { width, height } = fitSize;
```
và thêm **trước** khối `$derived.by` đó (sau `const imageDimensions = $derived.by(…)`):
```ts
  const fitSize = $derived((objectFit === 'cover' ? scaleToCover : scaleToFit)(imageDimensions, container));
```

Mọi phần khác giữ nguyên. Lưu ý `fitSize` là `$derived` đọc trong callback thường → lấy giá trị hiện tại, hợp lệ trong Svelte 5.

- [ ] **Step 7: Changelog + docs**

`custom/src/data/feature-updates.json`: chèn object mới vào **đầu** mảng `releases` (trước `"version": "v2.0.0"`):

```json
    {
      "version": "v2.1.0",
      "items": [
        {
          "title": "Không còn bị đăng xuất khi tải lại trang (F5)",
          "detail": "Phiên đăng nhập giữ nguyên khi bấm F5 hoặc mở lại tab. Tài khoản thường vẫn tự hết hạn sau 30 phút."
        },
        {
          "title": "Xem ảnh nét hơn, vẫn nhanh",
          "detail": "Ảnh hiện bản xem nhanh trước, rồi tự nâng lên ảnh gốc khi mạng nhanh và màn hình cần độ phân giải cao hơn. Trong Cài đặt có thể bật 'Hiển thị ảnh gốc' và 'Phát video gốc'."
        },
        {
          "title": "Tải ảnh/video lên nhanh hơn",
          "detail": "Băm và tải lên chạy song song; số tệp tải cùng lúc tự điều chỉnh theo mạng. Tệp quá lớn sẽ báo lỗi rõ ràng."
        }
      ]
    },
```
Kiểm tra JSON: `node -e "JSON.parse(require('fs').readFileSync('custom/src/data/feature-updates.json','utf8'));console.log('ok')"`.

`docs/Environment.md` dòng 274: thay `Tối ưu mobile / ép tắt video-ảnh gốc **không thêm biến mới**. Video trên điện thoại phụ thuộc \`PUBLIC_IMMICH_MEDIA_URL\` (đã có trên Vercel).` bằng:
`Tối ưu mobile **không thêm biến mới**. Ảnh tự nâng lên bản gốc sau preview khi mạng nhanh và màn hình cần; video gốc theo tuỳ chọn người dùng (Cài đặt → "Phát video gốc", hoặc nút trên thanh viewer). \`PUBLIC_IMMICH_MEDIA_URL\` còn được dùng để chèn \`<link rel="preconnect">\` vào \`<head>\` lúc build.`

- [ ] **Step 8: Sync, test, check, build smoke**

Run:
```bash
bash scripts/prepare-custom.sh
pnpm --filter immich-web exec vitest run src/lib/utils/image-quality.spec.ts src/lib/utils/media-origin-hints.spec.ts src/lib/utils/adaptive-image-loader.spec.ts src/lib/components/asset-viewer/preview-layout.spec.ts
```
Expected: tất cả PASS.

Xác nhận prepare-custom không ghi lại block ép tắt: `grep -n "always-load-original" upstream/web/src/lib/stores/preferences.store.ts` → chỉ còn 2 dòng `persisted<boolean>(…)`. `grep -n "\$if: () => false" upstream/web/src/lib/components/asset-viewer/AssetViewerNavBar.svelte` → rỗng.

svelte-check: không ERROR mới ở các file sửa/tạo (đặc biệt `AdaptiveImage.svelte`, `AppSettings.svelte`, `hooks.server.ts`); tổng ≤ 30. eslint + prettier --check cho bản copy trong `upstream/web/src` của: `lib/components/AdaptiveImage.svelte`, `lib/utils/image-quality.ts`, `lib/utils/image-quality.spec.ts`, `lib/utils/media-origin-hints.ts`, `lib/utils/media-origin-hints.spec.ts`, `hooks.server.ts`, `routes/(user)/user-settings/AppSettings.svelte`, `lib/components/asset-viewer/AssetViewerNavBar.svelte`, `lib/components/asset-viewer/AssetViewer.svelte`, `lib/stores/preferences.store.ts`.

Build smoke (bắt buộc — hooks.server chạy lúc prerender): `pnpm build` (chạy nền nếu > 2 phút; timeout 10 phút). Expected: exit 0, và `grep -c 'rel="preconnect"' upstream/web/build/index.html` → `1` khi `upstream/web/.env` có `PUBLIC_IMMICH_MEDIA_URL` không rỗng (file `.env` local của máy này có `PUBLIC_IMMICH_MEDIA_URL=https://api.gallery-app.pp.ua`). Ghi output vào report (file fallback có thể là `build/index.html` hoặc `build/200.html` — kiểm tra `ls upstream/web/build/*.html`).

- [ ] **Step 9: Commit**

```bash
git add scripts/patch-mobile-performance.py \
  overrides/lib/components/asset-viewer/AssetViewerNavBar.svelte overrides/lib/components/asset-viewer/AssetViewer.svelte \
  overrides/lib/components/AdaptiveImage.svelte \
  overrides/lib/utils/image-quality.ts overrides/lib/utils/image-quality.spec.ts \
  overrides/lib/utils/media-origin-hints.ts overrides/lib/utils/media-origin-hints.spec.ts \
  "custom/src/routes/(user)/user-settings/AppSettings.svelte" custom/src/hooks.server.ts \
  custom/src/data/feature-updates.json docs/Environment.md \
  upstream/web/src/lib/stores/preferences.store.ts \
  upstream/web/src/lib/components/asset-viewer/AssetViewerNavBar.svelte upstream/web/src/lib/components/asset-viewer/AssetViewer.svelte \
  upstream/web/src/lib/components/AdaptiveImage.svelte \
  upstream/web/src/lib/utils/image-quality.ts upstream/web/src/lib/utils/image-quality.spec.ts \
  upstream/web/src/lib/utils/media-origin-hints.ts upstream/web/src/lib/utils/media-origin-hints.spec.ts \
  "upstream/web/src/routes/(user)/user-settings/AppSettings.svelte" upstream/web/src/hooks.server.ts
git commit -m "update(viewer): tự nâng ảnh gốc khi màn hình cần, trả lại tuỳ chọn ảnh/video gốc

Bỏ ép tắt always-load-original (patch_force_compressed_media). Ảnh: thumbnail → preview → gốc khi mạng nhanh
và preview nhỏ hơn vùng hiển thị × DPR (ngưỡng 10%). Cài đặt có lại 'Hiển thị ảnh gốc' và 'Phát video gốc'.
Chèn preconnect tới PUBLIC_IMMICH_MEDIA_URL lúc build. Changelog v2.1.0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Kiểm tra performance website

Deliverable: `docs/Performance.md` (số đo thật + nhận xét + khuyến nghị ưu tiên) và script `pnpm perf:audit` để đo lại. Số đo sơ bộ ngày 2026-10-26 từ máy dev (1 mẫu, curl): `https://gallery-app.pp.ua/` TTFB 0.97s (x-vercel-cache HIT, `x-vercel-id: sin1`); `/api/server/ping` qua Vercel proxy 2.04s; `https://api.gallery-app.pp.ua/api/server/ping` 1.60s; `https://immich.gallery-app.pp.ua/api/server/ping` 0.43s; `cf-ray` kết thúc `-MRS` (PoP Cloudflare Marseille — đường mạng của máy đo không điển hình, phải ghi rõ trong báo cáo). Cloudflare quảng bá `alt-svc: h3`. Chrome có tại `C:\Program Files\Google\Chrome\Application\chrome.exe`.

**Files:**
- Create: `scripts/perf-audit.mjs`
- Test: `scripts/perf-audit.test.mjs`
- Create: `docs/Performance.md`
- Modify: `package.json` (thêm `perf:audit`), `README.md` (bảng Scripts + bảng Tài liệu)

**Interfaces:**
- Consumes: `.env` (`IMMICH_SERVER_URL`, `PUBLIC_IMMICH_MEDIA_URL`), build output `upstream/web/build/_app/immutable/**`.
- Produces: `median(values)`, `summarize(samples) → {min, median, max, count}`, `formatBytes(n)`, `rankChunks(entries, limit)`, `totalsByType(entries)`, `summarizeLighthouse(report)`; CLI `node scripts/perf-audit.mjs [--base URL] [--samples N] | --bundle | --lighthouse-summary <report.json>`.

- [ ] **Step 1: Test (RED)**

Tạo `scripts/perf-audit.test.mjs`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatBytes, median, rankChunks, summarize, summarizeLighthouse, totalsByType } from './perf-audit.mjs';

test('median: lẻ, chẵn, rỗng', () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([]), 0);
});

test('summarize trả min/median/max/count', () => {
  assert.deepEqual(summarize([300, 100, 200]), { min: 100, median: 200, max: 300, count: 3 });
});

test('formatBytes', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(3 * 1024 * 1024), '3.00 MB');
});

test('rankChunks xếp theo gzip giảm dần và cắt theo limit', () => {
  const entries = [
    { path: 'a.js', raw: 10, gzip: 3 },
    { path: 'b.js', raw: 10, gzip: 9 },
    { path: 'c.css', raw: 10, gzip: 5 },
  ];
  assert.deepEqual(
    rankChunks(entries, 2).map((e) => e.path),
    ['b.js', 'c.css'],
  );
});

test('totalsByType gộp js và css', () => {
  const entries = [
    { path: 'a.js', raw: 10, gzip: 3 },
    { path: 'b.js', raw: 20, gzip: 6 },
    { path: 'c.css', raw: 5, gzip: 2 },
  ];
  assert.deepEqual(totalsByType(entries), {
    js: { raw: 30, gzip: 9, count: 2 },
    css: { raw: 5, gzip: 2, count: 1 },
  });
});

test('summarizeLighthouse rút các chỉ số chính', () => {
  const report = {
    categories: { performance: { score: 0.87 } },
    audits: {
      'first-contentful-paint': { numericValue: 1234 },
      'largest-contentful-paint': { numericValue: 2345 },
      'total-blocking-time': { numericValue: 150 },
      'cumulative-layout-shift': { numericValue: 0.01 },
      'speed-index': { numericValue: 2000 },
      interactive: { numericValue: 3000 },
      'total-byte-weight': { numericValue: 1_500_000 },
    },
  };
  assert.deepEqual(summarizeLighthouse(report), {
    performanceScore: 87,
    fcpMs: 1234,
    lcpMs: 2345,
    tbtMs: 150,
    cls: 0.01,
    speedIndexMs: 2000,
    ttiMs: 3000,
    totalBytes: 1_500_000,
  });
});
```

Run: `node --test scripts/perf-audit.test.mjs` → Expected: FAIL (module thiếu).

- [ ] **Step 2: Viết `scripts/perf-audit.mjs`**

```js
#!/usr/bin/env node
/**
 * Đo nhanh performance production + phân tích bundle + rút gọn báo cáo Lighthouse.
 *
 * Usage:
 *   pnpm perf:audit                                   # TTFB (5 mẫu) cho các endpoint production
 *   pnpm perf:audit --base https://gallery-app.pp.ua --samples 10
 *   pnpm perf:audit --bundle                          # kích thước JS/CSS trong upstream/web/build (chạy `pnpm build` trước)
 *   pnpm perf:audit --lighthouse-summary path/to/report.json
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const median = (values) => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const summarize = (samples) => ({
  min: Math.min(...samples),
  median: median(samples),
  max: Math.max(...samples),
  count: samples.length,
});

export const formatBytes = (bytes) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export const rankChunks = (entries, limit = 12) => [...entries].sort((a, b) => b.gzip - a.gzip).slice(0, limit);

export const totalsByType = (entries) => {
  const totals = { js: { raw: 0, gzip: 0, count: 0 }, css: { raw: 0, gzip: 0, count: 0 } };
  for (const entry of entries) {
    const bucket = entry.path.endsWith('.css') ? totals.css : totals.js;
    bucket.raw += entry.raw;
    bucket.gzip += entry.gzip;
    bucket.count += 1;
  }
  return totals;
};

export const summarizeLighthouse = (report) => {
  const audit = (id) => report.audits?.[id]?.numericValue ?? null;
  const score = report.categories?.performance?.score;
  return {
    performanceScore: typeof score === 'number' ? Math.round(score * 100) : null,
    fcpMs: audit('first-contentful-paint'),
    lcpMs: audit('largest-contentful-paint'),
    tbtMs: audit('total-blocking-time'),
    cls: audit('cumulative-layout-shift'),
    speedIndexMs: audit('speed-index'),
    ttiMs: audit('interactive'),
    totalBytes: audit('total-byte-weight'),
  };
};

const loadEnvFile = (filePath) => {
  if (!existsSync(filePath)) {
    return;
  }
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

const getArg = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const hasFlag = (name) => process.argv.includes(name);

const buildTargets = (base) => {
  const mediaOrigin = (process.env.PUBLIC_IMMICH_MEDIA_URL ?? '').trim().replace(/\/$/, '');
  const serverOrigin = (process.env.IMMICH_SERVER_URL ?? '').trim().replace(/\/$/, '');
  const targets = [
    { label: 'Trang chủ (Vercel static)', url: `${base}/` },
    { label: 'REST qua Vercel proxy', url: `${base}/api/server/ping` },
  ];
  if (mediaOrigin) {
    targets.push({ label: 'Media origin (tunnel)', url: `${mediaOrigin}/api/server/ping` });
  }
  if (serverOrigin && serverOrigin !== mediaOrigin) {
    targets.push({ label: 'Immich trực tiếp (tunnel)', url: `${serverOrigin}/api/server/ping` });
  }
  return targets;
};

const timeRequest = async (url) => {
  const start = performance.now();
  const response = await fetch(url, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(30_000) });
  const ttfb = performance.now() - start;
  await response.arrayBuffer();
  const total = performance.now() - start;
  return {
    ttfb,
    total,
    status: response.status,
    vercel: response.headers.get('x-vercel-id'),
    cfRay: response.headers.get('cf-ray'),
    cfCache: response.headers.get('cf-cache-status'),
    encoding: response.headers.get('content-encoding'),
  };
};

const runTtfb = async () => {
  loadEnvFile(resolve(root, '.env'));
  const base = (getArg('--base') ?? process.env.PERF_BASE_URL ?? 'https://gallery-app.pp.ua').replace(/\/$/, '');
  const samples = Number(getArg('--samples') ?? 5);
  const targets = buildTargets(base);

  console.log(`TTFB (${samples} mẫu, tuần tự) — ${new Date().toISOString()}`);
  for (const target of targets) {
    const results = [];
    for (let i = 0; i < samples; i++) {
      try {
        results.push(await timeRequest(target.url));
      } catch (error) {
        console.log(`  ${target.label}: lỗi ${error.message}`);
      }
    }
    if (results.length === 0) {
      continue;
    }
    const ttfb = summarize(results.map((r) => r.ttfb));
    const total = summarize(results.map((r) => r.total));
    const last = results.at(-1);
    const pop = last.cfRay ? last.cfRay.split('-').at(-1) : '-';
    const region = last.vercel ? last.vercel.split('::')[0] : '-';
    console.log(
      `  ${target.label.padEnd(28)} HTTP ${last.status}  TTFB min/med/max ${ttfb.min.toFixed(0)}/${ttfb.median.toFixed(0)}/${ttfb.max.toFixed(0)} ms  total med ${total.median.toFixed(0)} ms  cf-pop ${pop}  vercel ${region}  cf-cache ${last.cfCache ?? '-'}  enc ${last.encoding ?? '-'}`,
    );
    console.log(`    ${target.url}`);
  }
};

const collectBundle = (dir) => {
  const entries = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (name.endsWith('.js') || name.endsWith('.css')) {
        const content = readFileSync(full);
        entries.push({ path: relative(dir, full).replaceAll('\\', '/'), raw: content.length, gzip: gzipSync(content).length });
      }
    }
  };
  walk(dir);
  return entries;
};

const runBundle = () => {
  const dir = resolve(root, 'upstream/web/build/_app/immutable');
  if (!existsSync(dir)) {
    console.error('Chưa có build — chạy `pnpm build` trước.');
    process.exit(1);
  }
  const entries = collectBundle(dir);
  const totals = totalsByType(entries);
  console.log(`Bundle (${dir})`);
  console.log(`  JS : ${totals.js.count} file, raw ${formatBytes(totals.js.raw)}, gzip ${formatBytes(totals.js.gzip)}`);
  console.log(`  CSS: ${totals.css.count} file, raw ${formatBytes(totals.css.raw)}, gzip ${formatBytes(totals.css.gzip)}`);
  console.log('  Chunk lớn nhất (gzip):');
  for (const entry of rankChunks(entries, 12)) {
    console.log(`    ${formatBytes(entry.gzip).padStart(10)}  (raw ${formatBytes(entry.raw).padStart(10)})  ${entry.path}`);
  }
};

const runLighthouseSummary = (file) => {
  const report = JSON.parse(readFileSync(resolve(file), 'utf8'));
  const summary = summarizeLighthouse(report);
  console.log(`Lighthouse ${report.finalDisplayedUrl ?? report.requestedUrl ?? ''} (${report.configSettings?.formFactor ?? '?'})`);
  console.log(`  Performance ${summary.performanceScore ?? '-'}/100`);
  console.log(`  FCP ${summary.fcpMs?.toFixed(0)} ms · LCP ${summary.lcpMs?.toFixed(0)} ms · TBT ${summary.tbtMs?.toFixed(0)} ms · CLS ${summary.cls?.toFixed(3)} · SI ${summary.speedIndexMs?.toFixed(0)} ms · TTI ${summary.ttiMs?.toFixed(0)} ms`);
  console.log(`  Tổng tải ${summary.totalBytes === null ? '-' : formatBytes(summary.totalBytes)}`);
};

const main = async () => {
  if (hasFlag('--bundle')) {
    runBundle();
    return;
  }
  const lighthouseFile = getArg('--lighthouse-summary');
  if (lighthouseFile) {
    runLighthouseSummary(lighthouseFile);
    return;
  }
  await runTtfb();
};

const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
```

Run: `node --test scripts/perf-audit.test.mjs` → Expected: 6 pass. Thêm vào `package.json` scripts (sau `check:version`): `"perf:audit": "node scripts/perf-audit.mjs",`. Run `pnpm test:scripts` → Expected: 12 pass (6 của Task 2 + 6).

- [ ] **Step 3: Đo thật**

Thư mục tạm cho report Lighthouse (git-ignored): `.superpowers/sdd/2026-10-26-gallery-improvements/perf/` (tạo bằng `mkdir -p`).

1. TTFB: `pnpm perf:audit --samples 5` → dán nguyên output vào report và vào docs.
2. Bundle: `pnpm build` (nếu Task 4 vừa build và `upstream/web/build` còn mới thì dùng lại; nếu không, chạy lại — timeout 10 phút) rồi `pnpm perf:audit --bundle`.
3. Lighthouse trang `/auth/login` (trang duy nhất không cần đăng nhập), mobile + desktop. Chạy từ repo root, Git Bash:
```bash
export CHROME_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
OUT=.superpowers/sdd/2026-10-26-gallery-improvements/perf
npx --yes lighthouse@12 https://gallery-app.pp.ua/auth/login --output=json --output=html --output-path="$OUT/login-mobile" --chrome-flags="--headless=new" --quiet
npx --yes lighthouse@12 https://gallery-app.pp.ua/auth/login --preset=desktop --output=json --output=html --output-path="$OUT/login-desktop" --chrome-flags="--headless=new" --quiet
node scripts/perf-audit.mjs --lighthouse-summary "$OUT/login-mobile.report.json"
node scripts/perf-audit.mjs --lighthouse-summary "$OUT/login-desktop.report.json"
```
Nếu `npx lighthouse` không chạy được (không tải được package, Chrome không khởi động), ghi nguyên lỗi vào docs mục Lighthouse là "Chưa đo được: <lý do>" và vẫn hoàn thành phần còn lại. Không được bịa số.
4. Ghi thêm bằng tay (curl hoặc `node -e "fetch(...)"`) header của `https://gallery-app.pp.ua/_app/version.json` và một file `/_app/immutable/...js` lấy từ `upstream/web/build/index.html`: `cache-control`, `content-encoding`, `x-vercel-cache`.

- [ ] **Step 4: Viết `docs/Performance.md`**

Cấu trúc bắt buộc (điền số đo thật từ Step 3; mọi nhận định không đo trực tiếp phải gắn nhãn `[Inference]` hoặc `[Unverified]`):

```markdown
# Performance — Photo Gallery UI

Đo ngày 2026-10-26 từ máy dev Windows (Git Bash, Node 24). Đường mạng tới Cloudflare của máy đo đi qua PoP `<cf-pop từ output>`, không đại diện cho người dùng tại Việt Nam — số tuyệt đối chỉ để so sánh tương đối giữa các đường.

## Cách đo lại

```bash
pnpm perf:audit                  # TTFB 5 mẫu
pnpm build && pnpm perf:audit --bundle
# Lighthouse: xem lệnh trong docs/superpowers/plans/2026-10-26-gallery-improvements.md (Task 5)
```

## 1. Độ trễ server (TTFB)

| Đường | HTTP | TTFB min / median / max (ms) | Ghi chú |
|---|---|---|---|
| Trang chủ (Vercel static) | … | … | x-vercel-cache … |
| REST qua Vercel proxy (`/api/server/ping`) | … | … | … |
| Media origin (`api.gallery-app.pp.ua`) | … | … | … |
| Immich trực tiếp (`immich.gallery-app.pp.ua`) | … | … | … |

Nhận xét: (so sánh median REST-qua-Vercel với Immich-trực-tiếp; chênh lệch = chi phí hop Vercel Edge → Cloudflare tunnel, trả cho **mỗi** call REST.)

## 2. Lighthouse — trang đăng nhập

| Form factor | Performance | FCP | LCP | TBT | CLS | Speed Index | Tổng tải |
|---|---|---|---|---|---|---|---|
| Mobile (mô phỏng 4G chậm) | … | … | … | … | … | … | … |
| Desktop | … | … | … | … | … | … | … |

(Hoặc: "Chưa đo được: <lý do>".)

## 3. Bundle

JS: N file, raw …, gzip …. CSS: N file, raw …, gzip ….

Top chunk (gzip): bảng 12 dòng từ `pnpm perf:audit --bundle`.

## 4. Cache & headers

| Tài nguyên | cache-control | content-encoding | x-vercel-cache |
|---|---|---|---|
| `/` | … | … | … |
| `/_app/version.json` | … | … | … |
| `/_app/immutable/...js` | … | … | … |

## 5. Những gì đã có sẵn trong code

- Service worker cache thumbnail theo chất lượng mạng (`custom/src/service-worker/index.ts`).
- Lazy-load thumbnail, giảm transition, intersection window theo mạng (`overrides/lib/utils/mobile-performance.svelte.ts`).
- Preload ảnh/video kề (`PreloadManager`, `VideoPreloadManager`).
- Media bypass Vercel qua `PUBLIC_IMMICH_MEDIA_URL`.
- Nhánh này thêm: preconnect tới media origin lúc build; ảnh tự nâng gốc chỉ khi màn hình cần; upload băm ‖ tải lên.

## 6. Khuyến nghị (ưu tiên giảm dần)

1. **REST qua Vercel proxy** — số đo mục 1. [Inference] Mỗi call REST trả thêm ≈ <median REST qua Vercel − median Immich trực tiếp> ms. Lựa chọn: (a) đặt UI và `/api` cùng domain phía Cloudflare (Worker/route chuyển `/api/*` thẳng vào tunnel, bỏ hop Vercel) — cần cấu hình Cloudflare, không đổi code; (b) giữ nguyên nhưng giảm số call khi mở app. Immich không hỗ trợ CORS nên **không** trỏ `PUBLIC_IMMICH_SERVER_URL` cross-origin (docs/Environment.md).
2. … (từ Lighthouse/bundle: ví dụ chunk lớn nhất, font preload, …)
3. …

Mỗi khuyến nghị: số đo làm căn cứ, thay đổi đề xuất, rủi ro.
```

`README.md`: thêm `| [Performance](docs/Performance.md) | Số đo TTFB / Lighthouse / bundle và khuyến nghị |` vào bảng Tài liệu, và `| \`pnpm perf:audit\` | Đo TTFB production, \`--bundle\` phân tích build |` vào bảng Scripts.

- [ ] **Step 5: Commit**

```bash
git add scripts/perf-audit.mjs scripts/perf-audit.test.mjs docs/Performance.md package.json README.md
git commit -m "docs(perf): báo cáo performance website + pnpm perf:audit

Đo TTFB các đường (Vercel static, REST qua Vercel proxy, media tunnel, Immich trực tiếp), Lighthouse trang login,
kích thước bundle; khuyến nghị theo ưu tiên.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review (đã chạy khi viết plan)

- **Spec coverage:** (1) F5 logout → Task 1. (2) Version → Task 2. (3) Upload gốc → Task 3. (4) Xem gốc nhanh → Task 4. (5) Performance → Task 5.
- **Placeholder:** Task 5 có bảng với `…` — đó là số đo chỉ có khi chạy, không phải placeholder code. Không có "TBD/TODO" ở bước code.
- **Type consistency:** `reloadApp` (Task 1) dùng ở hooks.client.ts + ErrorLayout.svelte; `markSessionNoExpiry` đã tồn tại trong session-expiry.ts; `getNetworkQuality/isCoarsePointer/isNarrowViewport` tồn tại trong mobile-performance.svelte.ts; `QualityConfig.onAfterLoad` tồn tại; `uploadExecutionQueue` giữ tên cho UploadPanel.svelte; `fitSize` khai báo trước khi dùng trong `buildQualityList` (callback chạy sau mount).
