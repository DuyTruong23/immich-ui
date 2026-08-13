import 'svelte-i18n';
import type en from '$i18n/en.json';

/// <reference types="@sveltejs/kit" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare namespace App {
  interface PageData {
    meta: {
      title: string;
      description?: string;
      imageUrl?: string;
    };
  }

  interface Error {
    message: string;
    stack?: string;
    code?: string | number;
  }
}

declare module '$env/static/public' {
  export const PUBLIC_IMMICH_PAY_HOST: string;
  export const PUBLIC_IMMICH_BUY_HOST: string;
  export const PUBLIC_IMMICH_SERVER_URL: string;
  export const PUBLIC_IMMICH_MEDIA_URL: string;
  export const PUBLIC_APP_NAME: string;
  export const PUBLIC_COMPANY_NAME: string;
  export const PUBLIC_THEME: string;
  export const PUBLIC_DEFAULT_THEME: string;
  export const PUBLIC_DEFAULT_LANGUAGE: string;
  export const PUBLIC_ENABLE_ANALYTICS: string;
  export const PUBLIC_ENABLE_ADMIN: string;
  export const PUBLIC_ENABLE_EXPERIMENTAL: string;
  export const PUBLIC_ENABLE_MEMORIES: string;
  export const PUBLIC_ENABLE_PARTNER: string;
  export const PUBLIC_ENABLE_SHARING: string;
  export const PUBLIC_ENABLE_MAP: string;
  export const PUBLIC_ENABLE_PEOPLE: string;
  export const PUBLIC_ENABLE_SEARCH: string;
  export const PUBLIC_ENABLE_TRASH: string;
  export const PUBLIC_ENABLE_UTILITIES: string;
  export const PUBLIC_ENABLE_WORKFLOWS: string;
  export const PUBLIC_ENABLE_SHARED_LINKS: string;
  export const PUBLIC_ENABLE_FOLDERS: string;
  export const PUBLIC_ENABLE_TAGS: string;
  export const PUBLIC_ENABLE_ARCHIVE: string;
  export const PUBLIC_ENABLE_DASHBOARD: string;
}

interface Element {
  // Make optional, because it's unavailable on iPhones.
  requestFullscreen?(options?: FullscreenOptions): Promise<void>;
}

type NestedKeys<T, K = keyof T> = K extends keyof T & string
  ? `${K}` | (T[K] extends object ? `${K}.${NestedKeys<T[K]>}` : never)
  : never;

declare module 'svelte-i18n' {
  import type { InterpolationValues } from '$lib/elements/format-message';
  import type { Readable } from 'svelte/store';

  type Translations = NestedKeys<typeof en>;

  interface MessageObject {
    id: Translations;
    locale?: string;
    format?: string;
    default?: string;
    values?: InterpolationValues;
  }

  type MessageFormatter = (id: Translations | MessageObject, options?: Omit<MessageObject, 'id'>) => string;

  const format: Readable<MessageFormatter>;
  const t: Readable<MessageFormatter>;
  const _: Readable<MessageFormatter>;
}
