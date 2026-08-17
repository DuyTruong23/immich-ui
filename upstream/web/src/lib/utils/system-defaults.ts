import { browser } from '$app/environment';
import { PUBLIC_DEFAULT_LANGUAGE } from '$env/static/public';
import { defaultLang } from '$lib/constants';
import { convertBCP47, getPreferredLocale, langCodes } from '$lib/utils/i18n';
import { getAppConfig } from '@photo-gallery/config';
import { themeManager, ThemePreference } from '@immich/ui';

/** Map `vi-VN` / `en-US` / env code → locale file Immich có sẵn (`vi`, `en`, …). */
export const resolveAvailableLanguage = (code: string | undefined): string | undefined => {
  if (!code) {
    return undefined;
  }

  const converted = convertBCP47(code.trim());
  if (!converted) {
    return undefined;
  }

  if (langCodes.includes(converted)) {
    return converted;
  }

  const prefix = converted.split('-')[0];
  if (prefix && langCodes.includes(prefix)) {
    return prefix;
  }

  return langCodes.find((item) => converted.startsWith(`${item}-`));
};

/**
 * Ngôn ngữ lần đầu vào app: ngôn ngữ hệ thống (iOS / Android / laptop),
 * rồi `PUBLIC_DEFAULT_LANGUAGE`, rồi English.
 */
export const resolveDefaultLanguage = (): string => {
  const fromBrowser = browser ? resolveAvailableLanguage(getPreferredLocale()) : undefined;
  const fromEnv = resolveAvailableLanguage(PUBLIC_DEFAULT_LANGUAGE);
  return fromBrowser || fromEnv || defaultLang.code;
};

const themePreferenceFromConfig = (theme: 'light' | 'dark' | 'system'): ThemePreference => {
  if (theme === 'light') {
    return ThemePreference.Light;
  }
  if (theme === 'dark') {
    return ThemePreference.Dark;
  }
  return ThemePreference.System;
};

/**
 * Theme lần đầu vào app: `PUBLIC_THEME` (mặc định `system` = prefers-color-scheme).
 * Không ghi đè nếu user đã chọn theme trong settings / onboarding.
 */
export const applyDefaultThemePreference = (): void => {
  if (!browser) {
    return;
  }

  try {
    if (localStorage.getItem('immich-ui-theme') != null) {
      return;
    }
  } catch {
    themeManager.setPreference(ThemePreference.System);
    return;
  }

  try {
    const { theme } = getAppConfig().publicEnv;
    themeManager.setPreference(themePreferenceFromConfig(theme));
  } catch {
    themeManager.setPreference(ThemePreference.System);
  }
};
