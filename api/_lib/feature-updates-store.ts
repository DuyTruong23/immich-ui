import { getEnv } from './email.js';
import {
  DEFAULT_FEATURE_UPDATES,
  normalizeFeatureUpdatesConfig,
  parseFeatureUpdatesConfig,
  type FeatureUpdatesConfig,
} from './feature-updates-config.js';

const BLOB_PATHNAME = 'feature-updates/config.json';
const BLOB_READ_TIMEOUT_MS = 2500;
const BLOB_WRITE_TIMEOUT_MS = 10000;

let memoryConfig: FeatureUpdatesConfig | null = null;

const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('blob read timed out')), ms);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const readEnvConfig = (): FeatureUpdatesConfig | null => {
  const raw = getEnv('FEATURE_UPDATES_CONFIG');
  if (!raw) {
    return null;
  }

  return parseFeatureUpdatesConfig(raw);
};

const readBlobConfig = async (): Promise<FeatureUpdatesConfig | null> => {
  const token = getEnv('BLOB_READ_WRITE_TOKEN');
  if (!token) {
    return null;
  }

  try {
    const { head } = await import('@vercel/blob');
    const blob = await withTimeout(head(BLOB_PATHNAME, { token }), BLOB_READ_TIMEOUT_MS);
    const response = await withTimeout(fetch(blob.url, { cache: 'no-store' }), BLOB_READ_TIMEOUT_MS);
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

  const { put } = await import('@vercel/blob');
  await withTimeout(
    put(BLOB_PATHNAME, JSON.stringify(config, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      token,
    }),
    BLOB_WRITE_TIMEOUT_MS,
  );
  memoryConfig = config;
};
