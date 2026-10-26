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
  // eslint-disable-next-line unicorn/no-document-cookie -- cần set cookie thật để kiểm tra #hasAuthCookie
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
