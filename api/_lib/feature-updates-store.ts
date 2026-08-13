import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEnv } from './email';
import {
  DEFAULT_FEATURE_UPDATES,
  normalizeFeatureUpdatesConfig,
  parseFeatureUpdatesConfig,
  type FeatureUpdatesConfig,
} from './feature-updates-config';

const BLOB_PATHNAME = 'feature-updates/config.json';
const rootDir = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const LOCAL_CONFIG_PATH = path.join(rootDir, '.data/feature-updates/config.json');

let memoryConfig: FeatureUpdatesConfig | null = null;

const isVercelRuntime = (): boolean => getEnv('VERCEL') === '1';

const readEnvConfig = (): FeatureUpdatesConfig | null => {
  const raw = getEnv('FEATURE_UPDATES_CONFIG');
  if (!raw) {
    return null;
  }

  return parseFeatureUpdatesConfig(raw);
};

const readLocalFileConfig = async (): Promise<FeatureUpdatesConfig | null> => {
  if (isVercelRuntime()) {
    return null;
  }

  try {
    const raw = await fs.readFile(LOCAL_CONFIG_PATH, 'utf8');
    return normalizeFeatureUpdatesConfig(JSON.parse(raw));
  } catch {
    return null;
  }
};

const writeLocalFileConfig = async (config: FeatureUpdatesConfig): Promise<void> => {
  if (isVercelRuntime()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }

  await fs.mkdir(path.dirname(LOCAL_CONFIG_PATH), { recursive: true });
  await fs.writeFile(LOCAL_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  memoryConfig = config;
};

const readBlobConfig = async (): Promise<FeatureUpdatesConfig | null> => {
  const token = getEnv('BLOB_READ_WRITE_TOKEN');
  if (!token) {
    return null;
  }

  try {
    const { head } = await import('@vercel/blob');
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
  if (memoryConfig) {
    return memoryConfig;
  }

  const blobConfig = await readBlobConfig();
  if (blobConfig) {
    memoryConfig = blobConfig;
    return blobConfig;
  }

  const localConfig = await readLocalFileConfig();
  if (localConfig) {
    memoryConfig = localConfig;
    return localConfig;
  }

  const envConfig = readEnvConfig();
  if (envConfig) {
    return envConfig;
  }

  return DEFAULT_FEATURE_UPDATES;
};

export const writeFeatureUpdatesConfig = async (config: FeatureUpdatesConfig): Promise<void> => {
  const token = getEnv('BLOB_READ_WRITE_TOKEN');
  if (token) {
    const { put } = await import('@vercel/blob');
    await put(BLOB_PATHNAME, JSON.stringify(config, null, 2), {
      access: 'public',
      contentType: 'application/json',
      token,
      allowOverwrite: true,
    });
    memoryConfig = config;
    return;
  }

  await writeLocalFileConfig(config);
};
