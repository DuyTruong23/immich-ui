import type { PublicEnv } from './env.js';

export type FeatureKey =
  | 'memories'
  | 'partner'
  | 'sharing'
  | 'map'
  | 'people'
  | 'admin'
  | 'search'
  | 'explore'
  | 'trash'
  | 'utilities'
  | 'workflows'
  | 'sharedLinks'
  | 'folders'
  | 'tags'
  | 'archive'
  | 'dashboard'
  | 'sharedFavorites';

export type FeatureFlags = Record<FeatureKey, boolean>;

const readFlag = (env: Record<string, string | undefined>, key: string, fallback: boolean): boolean => {
  const value = env[key];
  if (value === undefined || value === '') {
    return fallback;
  }
  return value === 'true' || value === '1';
};

/** Feature flags từ biến môi trường PUBLIC_ENABLE_* */
export const createFeatureFlags = (env: Record<string, string | undefined>, publicEnv: PublicEnv): FeatureFlags => ({
  memories: readFlag(env, 'PUBLIC_ENABLE_MEMORIES', true),
  partner: readFlag(env, 'PUBLIC_ENABLE_PARTNER', true),
  sharing: readFlag(env, 'PUBLIC_ENABLE_SHARING', true),
  map: readFlag(env, 'PUBLIC_ENABLE_MAP', true),
  people: readFlag(env, 'PUBLIC_ENABLE_PEOPLE', true),
  admin: readFlag(env, 'PUBLIC_ENABLE_ADMIN', publicEnv.enableAdmin),
  search: readFlag(env, 'PUBLIC_ENABLE_SEARCH', true),
  explore: readFlag(env, 'PUBLIC_ENABLE_EXPLORE', true),
  trash: readFlag(env, 'PUBLIC_ENABLE_TRASH', true),
  utilities: readFlag(env, 'PUBLIC_ENABLE_UTILITIES', true),
  workflows: readFlag(env, 'PUBLIC_ENABLE_WORKFLOWS', true),
  sharedLinks: readFlag(env, 'PUBLIC_ENABLE_SHARED_LINKS', true),
  folders: readFlag(env, 'PUBLIC_ENABLE_FOLDERS', true),
  tags: readFlag(env, 'PUBLIC_ENABLE_TAGS', true),
  archive: readFlag(env, 'PUBLIC_ENABLE_ARCHIVE', true),
  dashboard: readFlag(env, 'PUBLIC_ENABLE_DASHBOARD', true),
  sharedFavorites: readFlag(env, 'PUBLIC_ENABLE_SHARED_FAVORITES', true),
});

/** Route patterns bị vô hiệu hóa khi feature flag = false */
export const disabledRoutePatterns: Record<FeatureKey, RegExp[]> = {
  memories: [/^\/memory(\/|$)/],
  partner: [/^\/partners(\/|$)/],
  sharing: [/^\/sharing(\/|$)/],
  map: [/^\/map(\/|$|#)/],
  people: [/^\/people(\/|$)/],
  admin: [/^\/admin(\/|$)/],
  search: [/^\/search(\/|$)/],
  explore: [/^\/explore(\/|$)/],
  trash: [/^\/trash(\/|$)/],
  utilities: [/^\/utilities(\/|$)/],
  workflows: [/^\/workflows(\/|$)/],
  sharedLinks: [/^\/shared-links(\/|$)/, /^\/share(\/|$)/, /^\/s(\/|$)/],
  folders: [/^\/folders(\/|$)/],
  tags: [/^\/tags(\/|$)/],
  archive: [/^\/archive(\/|$)/],
  dashboard: [/^\/dashboard(\/|$)/],
  sharedFavorites: [/^\/shared-favorites(\/|$)/],
};

export const isRouteEnabled = (pathname: string, flags: FeatureFlags): boolean => {
  for (const [key, patterns] of Object.entries(disabledRoutePatterns) as [FeatureKey, RegExp[]][]) {
    if (flags[key]) {
      continue;
    }
    if (patterns.some((pattern) => pattern.test(pathname))) {
      return false;
    }
  }
  return true;
};

export const firstDisabledFeatureForPath = (pathname: string, flags: FeatureFlags): FeatureKey | null => {
  for (const [key, patterns] of Object.entries(disabledRoutePatterns) as [FeatureKey, RegExp[]][]) {
    if (flags[key]) {
      continue;
    }
    if (patterns.some((pattern) => pattern.test(pathname))) {
      return key;
    }
  }
  return null;
};
