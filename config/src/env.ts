/** Biến môi trường public — SvelteKit inject lúc build qua $env/static/public */

export interface PublicEnv {
  immichServerUrl: string;
  appName: string;
  companyName: string;
  theme: 'light' | 'dark' | 'system';
  defaultTheme: 'light' | 'dark';
  defaultLanguage: string;
  enableAnalytics: boolean;
  enableAdmin: boolean;
  enableExperimental: boolean;
  sessionOnlyAuth: boolean;
  enableLoginNotify: boolean;
  uiDevMode: boolean;
}

const readBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === '') {
    return fallback;
  }
  return value === 'true' || value === '1';
};

const readTheme = (value: string | undefined): PublicEnv['theme'] => {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return 'system';
};

/** Runtime config từ biến môi trường PUBLIC_* (SvelteKit) hoặc fallback dev */
export const createPublicEnv = (env: Record<string, string | undefined>): PublicEnv => ({
  immichServerUrl: env.PUBLIC_IMMICH_SERVER_URL ?? '',
  appName: env.PUBLIC_APP_NAME ?? 'Photo Gallery',
  companyName: env.PUBLIC_COMPANY_NAME ?? '',
  theme: readTheme(env.PUBLIC_THEME),
  defaultTheme: env.PUBLIC_DEFAULT_THEME === 'light' ? 'light' : 'dark',
  defaultLanguage: env.PUBLIC_DEFAULT_LANGUAGE ?? 'en',
  enableAnalytics: readBool(env.PUBLIC_ENABLE_ANALYTICS, false),
  enableAdmin: readBool(env.PUBLIC_ENABLE_ADMIN, true),
  enableExperimental: readBool(env.PUBLIC_ENABLE_EXPERIMENTAL, false),
  sessionOnlyAuth: readBool(env.PUBLIC_SESSION_ONLY_AUTH, false),
  enableLoginNotify: readBool(env.PUBLIC_ENABLE_LOGIN_NOTIFY, false),
  uiDevMode: readBool(env.PUBLIC_UI_DEV_MODE, false),
});

/** Dev proxy target — map từ VITE_IMMICH_API_URL hoặc IMMICH_SERVER_URL */
export const resolveImmichServerUrl = (): string => {
  return (
    process.env.IMMICH_SERVER_URL ??
    process.env.VITE_IMMICH_API_URL ??
    process.env.PUBLIC_IMMICH_SERVER_URL ??
    'http://localhost:2283'
  );
};
