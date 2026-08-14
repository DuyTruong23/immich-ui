#!/usr/bin/env node
/**
 * Bump feature-update version and generate modal items.
 *
 * Usage:
 *   node scripts/release-feature-updates.mjs
 *   node scripts/release-feature-updates.mjs --dry-run
 *   RELEASE_FROM=<sha> RELEASE_TO=HEAD node scripts/release-feature-updates.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildRelease,
  collectPendingItems,
  commitsToItems,
  isReleaseCommit,
} from './lib/feature-updates-release.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CURRENT_PATH = path.join(ROOT, 'custom/src/data/feature-updates.json');
const PENDING_DIR = path.join(ROOT, 'feature-updates/pending');
const SKIP_PENDING_NAMES = new Set(['.gitkeep', '_template.json', 'README.md']);
const BLOB_PATHNAME = 'feature-updates/config.json';
const BLOB_API_URL = 'https://vercel.com/api/blob';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');

const git = (gitArgs, fallback = '') => {
  try {
    return execFileSync('git', gitArgs, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return fallback;
  }
};

const readCurrent = () => {
  const raw = JSON.parse(readFileSync(CURRENT_PATH, 'utf8'));
  if (!raw?.version || !Array.isArray(raw.items)) {
    throw new Error(`Invalid release file: ${CURRENT_PATH}`);
  }

  return raw;
};

const readPendingFiles = () => {
  if (!existsSync(PENDING_DIR)) {
    return [];
  }

  return readdirSync(PENDING_DIR)
    .filter((name) => name.endsWith('.json') && !SKIP_PENDING_NAMES.has(name))
    .map((name) => {
      const filePath = path.join(PENDING_DIR, name);
      try {
        return { name, path: filePath, value: JSON.parse(readFileSync(filePath, 'utf8')) };
      } catch (error) {
        console.warn(`[release] Skip invalid pending file ${name}:`, error);
        return null;
      }
    })
    .filter((file) => file !== null);
};

const resolveRange = () => {
  const to = process.env.RELEASE_TO?.trim() || 'HEAD';
  const fromEnv = process.env.RELEASE_FROM?.trim();
  if (fromEnv && !/^0+$/.test(fromEnv)) {
    return { from: fromEnv, to };
  }

  const lastTag = git(['describe', '--tags', '--abbrev=0', '--match', 'v*']);
  if (lastTag) {
    return { from: lastTag, to };
  }

  const previous = git(['rev-parse', 'HEAD^']);
  return { from: previous || '', to };
};

const readCommitLog = (from, to) => {
  if (!from) {
    return '';
  }

  return git(['log', '--format=%s%x1f%b%x1e', `${from}..${to}`]);
};

const writeRelease = (release) => {
  const published = {
    version: release.version,
    items: release.items,
  };

  writeFileSync(CURRENT_PATH, `${JSON.stringify(published, null, 2)}\n`, 'utf8');
};

const clearPending = (files) => {
  for (const file of files) {
    unlinkSync(file.path);
  }
};

const publishBlob = async (config) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    console.log('[release] BLOB_READ_WRITE_TOKEN not set — skip live publish');
    return false;
  }

  const params = new URLSearchParams({ pathname: BLOB_PATHNAME });
  const response = await fetch(`${BLOB_API_URL}/?${params.toString()}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      'x-api-version': '7',
      'x-content-type': 'application/json',
      'x-add-random-suffix': '0',
      'x-allow-overwrite': '1',
      'x-vercel-blob-access': 'public',
    },
    body: JSON.stringify(config, null, 2),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Blob put failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }

  console.log('[release] Published to Vercel Blob');
  return true;
};

const headMessage = git(['log', '-1', '--pretty=%s']);
if (isReleaseCommit(headMessage)) {
  console.log('[release] HEAD is already a release commit — skip');
  process.exit(0);
}

const current = readCurrent();
const pendingFiles = readPendingFiles();
const pendingItems = collectPendingItems(pendingFiles);
const { from, to } = resolveRange();
const commitItems = commitsToItems(readCommitLog(from, to));
const release = buildRelease({
  current,
  pendingItems,
  commitItems,
  releasedAt: new Date().toISOString(),
});

console.log(`[release] ${current.version} → ${release.version} (source: ${release.source})`);
console.log(`[release] range ${from || '(none)'}..${to}`);
console.log(`[release] pending files: ${pendingFiles.length}, items: ${release.items.length}`);
for (const item of release.items) {
  console.log(`  - ${item.title}`);
}

if (dryRun) {
  console.log('[release] dry-run — no files written');
  process.exit(0);
}

writeRelease(release);
clearPending(pendingFiles);

try {
  await publishBlob({ version: release.version, items: release.items });
} catch (error) {
  console.warn('[release] Blob publish failed (git file still updated):', error);
}

console.log(`[release] wrote ${path.relative(ROOT, CURRENT_PATH)}`);
