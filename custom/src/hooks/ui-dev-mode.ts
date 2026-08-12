import { getAppConfig } from '@photo-gallery/config';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { featureFlagsManager } from '$lib/managers/feature-flags-manager.svelte';
import { serverConfigManager } from '$lib/managers/server-config-manager.svelte';
import {
  AssetOrder,
  UserAvatarColor,
  UserStatus,
  type CalendarHeatmapResponseDto,
  type ServerConfigDto,
  type ServerFeaturesDto,
  type SessionResponseDto,
  type UserAdminResponseDto,
  type UserPreferencesResponseDto,
} from '@immich/sdk';
import { getHeatmapRange } from '$lib';

export type UiDevRole = 'admin' | 'user';

const ROLE_STORAGE_KEY = 'pg_ui_dev_role';

const DEV_ADMIN_ID = '00000000-0000-4000-8000-000000000001';
const DEV_USER_ID = '00000000-0000-4000-8000-000000000002';

export const isUiDevMode = (): boolean => {
  try {
    return getAppConfig().publicEnv.uiDevMode;
  } catch {
    return false;
  }
};

const now = () => new Date().toISOString();

const mockPreferences = (): UserPreferencesResponseDto => ({
  albums: { defaultAssetOrder: AssetOrder.Desc },
  cast: { gCastEnabled: false },
  download: { archiveSize: 0, includeEmbeddedVideos: false },
  emailNotifications: { albumInvite: false, albumUpdate: false, enabled: false },
  folders: { enabled: true, sidebarWeb: true },
  memories: { enabled: true, duration: 5 },
  people: { enabled: true, sidebarWeb: true, minimumFaces: 3 },
  purchase: { hideBuyButtonUntil: '', showSupportBadge: false },
  ratings: { enabled: true },
  sharedLinks: { enabled: true, sidebarWeb: true },
  tags: { enabled: true, sidebarWeb: true },
  recentlyAdded: { sidebarWeb: true },
});

export const createMockUser = (role: UiDevRole): UserAdminResponseDto => ({
  id: role === 'admin' ? DEV_ADMIN_ID : DEV_USER_ID,
  email: role === 'admin' ? 'dev-admin@local.ui' : 'dev-user@local.ui',
  name: role === 'admin' ? 'Dev Admin' : 'Dev User',
  profileImagePath: '',
  avatarColor: role === 'admin' ? UserAvatarColor.Primary : UserAvatarColor.Blue,
  isAdmin: role === 'admin',
  createdAt: now(),
  updatedAt: now(),
  deletedAt: null,
  oauthId: '',
  quotaUsageInBytes: 12 * 1024 ** 3,
  quotaSizeInBytes: 100 * 1024 ** 3,
  shouldChangePassword: false,
  status: UserStatus.Active,
  storageLabel: null,
  license: null,
  profileChangedAt: now(),
});

const mockServerConfig = (): ServerConfigDto => ({
  externalDomain: '',
  isInitialized: true,
  isOnboarded: true,
  loginPageMessage: '',
  maintenanceMode: false,
  mapDarkStyleUrl: '',
  mapLightStyleUrl: '',
  minFaces: 3,
  oauthButtonText: 'OAuth',
  publicUsers: false,
  trashDays: 30,
  userDeleteDelay: 7,
});

const mockServerFeatures = (): ServerFeaturesDto => ({
  configFile: false,
  duplicateDetection: true,
  email: false,
  facialRecognition: true,
  importFaces: true,
  map: true,
  oauth: false,
  oauthAutoLaunch: false,
  ocr: true,
  passwordLogin: true,
  realtimeTranscoding: true,
  reverseGeocoding: true,
  search: true,
  sidecar: true,
  smartSearch: true,
  trash: true,
});

export const getStoredDevRole = (): UiDevRole | null => {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  const role = sessionStorage.getItem(ROLE_STORAGE_KEY);
  return role === 'admin' || role === 'user' ? role : null;
};

export const clearDevSession = (): void => {
  sessionStorage.removeItem(ROLE_STORAGE_KEY);
};

export const applyDevRole = (role: UiDevRole): void => {
  sessionStorage.setItem(ROLE_STORAGE_KEY, role);
  authManager.setUser(createMockUser(role));
  authManager.setPreferences(mockPreferences());
};

export const restoreDevSession = (): boolean => {
  const role = getStoredDevRole();
  if (!role) {
    return false;
  }

  applyDevRole(role);
  return true;
};

export const bootstrapUiDevMode = (): void => {
  serverConfigManager.setDevValue(mockServerConfig());
  featureFlagsManager.setDevValue(mockServerFeatures());
};

const emptyHeatmap = (): CalendarHeatmapResponseDto => {
  const range = getHeatmapRange();
  const start = new Date(`${range.$from}T00:00:00.000Z`);
  const end = new Date(`${range.to}T00:00:00.000Z`);
  const series: CalendarHeatmapResponseDto['series'] = [];

  for (let day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    series.push({
      date: day.toISOString().slice(0, 10),
      count: 0,
    });
  }

  return {
    from: range.$from,
    to: range.to,
    series,
    totalCount: 0,
  };
};

const mockSession = (user: UserAdminResponseDto): SessionResponseDto => ({
  id: `dev-session-${user.id}`,
  appVersion: 'dev',
  createdAt: now(),
  updatedAt: now(),
  current: true,
  deviceOS: 'Windows',
  deviceType: 'Chrome',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  isPendingSyncReset: false,
});

export const getMockDashboardData = () => {
  const admin = createMockUser('admin');
  const user = createMockUser('user');

  return {
    meta: { title: 'Dashboard' },
    serverVersion: '0.0.0-dev',
    serverOnline: false,
    albumCount: 12,
    photoCount: 1284,
    videoCount: 86,
    mediaUsageBytes: 12 * 1024 ** 3,
    storageUsed: 40 * 1024 ** 3,
    storageTotal: 100 * 1024 ** 3,
    storageUsedLabel: '40 GiB',
    storageTotalLabel: '100 GiB',
    storagePercent: 40,
    storageUsedGiB: '40.0 GiB',
    storageTotalGiB: '100.0 GiB',
    mediaUsageGiB: '12.0 GiB',
    uploadHistory: emptyHeatmap(),
    userDeviceGroups: [
      { user: admin, sessions: [mockSession(admin)] },
      { user, sessions: [mockSession(user)] },
    ],
    totalSessions: 2,
  };
};
