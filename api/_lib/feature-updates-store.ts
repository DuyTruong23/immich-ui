import { getEnv } from './email.js';
import {
  DEFAULT_FEATURE_UPDATES,
  normalizeFeatureUpdatesConfig,
  parseFeatureUpdatesConfig,
  type FeatureUpdatesConfig,
} from './feature-updates-config.js';

const BLOB_PATHNAME = 'feature-updates/config.json';
const BLOB_API_URL = 'https://vercel.com/api/blob';
const BLOB_API_VERSION = '7';
const BLOB_READ_TIMEOUT_MS = 2500;
const BLOB_WRITE_TIMEOUT_MS = 8000;

let memoryConfig: FeatureUpdatesConfig | null = null;

const fetchWithTimeout = async (url: string, init: RequestInit, ms: number): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const readEnvConfig = (): FeatureUpdatesConfig | null => {
  const raw = getEnv('FEATURE_UPDATES_CONFIG');
  if (!raw) {
    return null;
  }

  return parseFeatureUpdatesConfig(raw);
};

/** Token `vercel_blob_rw_<storeId>_<secret>` → public CDN URL, không cần SDK. */
const publicBlobUrl = (token: string): string | null => {
  const storeId = token.split('_')[3];
  if (!storeId) {
    return null;
  }

  return `https://${storeId}.public.blob.vercel-storage.com/${BLOB_PATHNAME}`;
};

const readBlobConfig = async (): Promise<FeatureUpdatesConfig | null> => {
  const token = getEnv('BLOB_READ_WRITE_TOKEN');
  if (!token) {
    return null;
  }

  const url = publicBlobUrl(token);
  if (!url) {
    return null;
  }

  try {
    const response = await fetchWithTimeout(url, { cache: 'no-store' }, BLOB_READ_TIMEOUT_MS);
    if (!response.ok) {
      return null;
    }

    return normalizeFeatureUpdatesConfig(await response.json());
  } catch {
    return null;
  }
};

export const readFeatureUpdatesConfig = async (): Promise<FeatureUpdatesConfig> => {
  if (memoryConfig) {
    return memoryConfig;
  }

  const blobConfig = await readBlobConfig();
  if (blobConfig) {
    memoryConfig = blobConfig;
    return blobConfig;
  }

  const envConfig = readEnvConfig();
  if (envConfig) {
    return envConfig;
  }

  return DEFAULT_FEATURE_UPDATES;
};

export const writeFeatureUpdatesConfig = async (config: FeatureUpdatesConfig): Promise<void> => {
  const token = getEnv('BLOB_READ_WRITE_TOKEN');
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }

  const params = new URLSearchParams({ pathname: BLOB_PATHNAME });
  const response = await fetchWithTimeout(
    `${BLOB_API_URL}/?${params.toString()}`,
    {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
        'x-api-version': BLOB_API_VERSION,
        'x-content-type': 'application/json',
        'x-add-random-suffix': '0',
        'x-allow-overwrite': '1',
        'x-vercel-blob-access': 'public',
      },
      body: JSON.stringify(config, null, 2),
    },
    BLOB_WRITE_TIMEOUT_MS,
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Blob put failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }

  memoryConfig = config;
};
