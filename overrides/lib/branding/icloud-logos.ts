import { logoManager } from '@immich/ui';

const ICLOUD_LOGOS = {
  icon: '/branding/icloud-photos-icon.svg',
  stacked: {
    light: '/branding/icloud-photos-inline-light.svg',
    dark: '/branding/icloud-photos-inline-dark.svg',
  },
  unstacked: {
    light: '/branding/icloud-photos-inline-light.svg',
    dark: '/branding/icloud-photos-inline-dark.svg',
  },
  stacked_futo: {
    light: '/branding/icloud-photos-inline-light.svg',
    dark: '/branding/icloud-photos-inline-dark.svg',
  },
};

export const applyIcloudLogos = (): void => {
  logoManager.setLogo(ICLOUD_LOGOS);
};

// eslint-disable-next-line unicorn/no-top-level-side-effects -- module được import để áp logo ngay khi tải (routes/+layout.ts)
applyIcloudLogos();
