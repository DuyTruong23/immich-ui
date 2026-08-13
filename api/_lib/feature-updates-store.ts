import { head, put } from '@vercel/blob';
import { getEnv } from './email';
import {
  DEFAULT_FEATURE_UPDATES,
  normalizeFeatureUpdatesConfig,
  parseFeatureUpdatesConfig,
  type FeatureUpdatesConfig,
} from './feature-updates-config';

const BLOB_PATHNAME = 'feature-updates/config.json';

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
    const blob = await head(BLOB_PATHNAME, { token });
    const response = await fetch(blob.url, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }

    return normalizeFeatureUpdatesConfig(await response.json());
  } catch {
    return null;
  }
};

export const readFeatureUpdatesConfig = async (): Promise<FeatureUpdatesConfig> => {
  const blobConfig = await readBlobConfig();
  if (blobConfig) {
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

  await put(BLOB_PATHNAME, JSON.stringify(config, null, 2), {
    access: 'public',
    contentType: 'application/json',
    token,
    allowOverwrite: true,
  });
};
