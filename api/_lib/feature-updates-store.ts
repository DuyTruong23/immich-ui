import { getBlobToken, putBlobJson } from './vercel-blob.js';
import { DEFAULT_FEATURE_UPDATES, type FeatureUpdatesConfig } from './feature-updates-config.js';

const BLOB_PATHNAME = 'feature-updates/config.json';

let memoryConfig: FeatureUpdatesConfig | null = null;

/** Modal / GET đọc file git — không lấy Blob. */
export const readFeatureUpdatesConfig = async (): Promise<FeatureUpdatesConfig> => DEFAULT_FEATURE_UPDATES;

export const writeFeatureUpdatesConfig = async (config: FeatureUpdatesConfig): Promise<void> => {
  if (!getBlobToken()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }

  await putBlobJson(BLOB_PATHNAME, config, { access: 'public' });
  memoryConfig = config;
};
