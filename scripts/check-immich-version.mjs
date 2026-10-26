#!/usr/bin/env node
/**
 * Kiểm tra version Immich: web + SDK trong repo, server đang chạy, release mới nhất trên GitHub.
 *
 * Usage:
 *   pnpm check:version
 *   node scripts/check-immich-version.mjs --url https://immich.gallery-app.pp.ua
 *   IMMICH_SERVER_URL=http://localhost:2283 node scripts/check-immich-version.mjs
 *
 * Exit code: 0 OK · 1 không gọi được server · 2 web và server lệch major.minor
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GITHUB_LATEST_RELEASE = 'https://api.github.com/repos/immich-app/immich/releases/latest';

/** @typedef {{ major: number; minor: number; patch: number; prerelease: string | null }} Version */

/**
 * "v3.3.5" | "3.3.0-rc.0" | { major, minor, patch, prerelease } → Version. Trả null nếu không đọc được.
 * @returns {Version | null}
 */
export const parseVersion = (input) => {
  if (input && typeof input === 'object') {
    const { major, minor, patch, prerelease } = input;
    if ([major, minor, patch].every((n) => Number.isInteger(n))) {
      return { major, minor, patch, prerelease: prerelease || null };
    }
    return null;
  }

  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(String(input ?? '').trim());
  if (!match) {
    return null;
  }

  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), prerelease: match[4] ?? null };
};

export const formatVersion = (version) => {
  if (!version) {
    return 'n/a';
  }
  const base = `${version.major}.${version.minor}.${version.patch}`;
  return version.prerelease ? `${base}-${version.prerelease}` : base;
};

/** -1 nếu a < b, 0 nếu bằng, 1 nếu a > b. Prerelease đứng trước bản chính thức cùng số. */
export const compareVersions = (a, b) => {
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) {
      return a[key] < b[key] ? -1 : 1;
    }
  }
  if (a.prerelease === b.prerelease) {
    return 0;
  }
  if (!a.prerelease) {
    return 1;
  }
  if (!b.prerelease) {
    return -1;
  }
  return a.prerelease < b.prerelease ? -1 : 1;
};

/** Tổng hợp trạng thái. `latest` có thể undefined/null khi GitHub không trả lời. */
export const buildReport = ({ web, sdk, server, latest }) => {
  const sameMinor = Boolean(web && server && web.major === server.major && web.minor === server.minor);
  const status = server ? (sameMinor ? 'match' : 'mismatch') : 'server-unreachable';
  const updateAvailable = Boolean(latest && server && compareVersions(latest, server) > 0);
  return { web, sdk, server, latest: latest ?? null, status, updateAvailable };
};

const loadEnvFile = (filePath) => {
  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

const readPackageVersion = (relativePath) => {
  const file = resolve(root, relativePath);
  if (!existsSync(file)) {
    return null;
  }
  return parseVersion(JSON.parse(readFileSync(file, 'utf8')).version);
};

const fetchJson = async (url, headers = {}) => {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${url}`);
  }
  return response.json();
};

const getArg = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const printReport = (report, serverUrl, latestPublishedAt) => {
  const latestLabel = report.latest
    ? `v${formatVersion(report.latest)}${latestPublishedAt ? ` (${latestPublishedAt})` : ''}`
    : 'không lấy được';
  const rows = [
    ['Web (upstream/web)', formatVersion(report.web)],
    ['SDK (@immich/sdk)', formatVersion(report.sdk)],
    [`Server (${serverUrl})`, formatVersion(report.server)],
    ['GitHub release mới nhất', latestLabel],
  ];
  const width = Math.max(...rows.map(([label]) => label.length));

  console.log('Immich version');
  for (const [label, value] of rows) {
    console.log(`  ${label.padEnd(width)}  ${value}`);
  }
  console.log('');

  if (report.status === 'server-unreachable') {
    console.log('Trạng thái: KHÔNG gọi được server.');
  } else if (report.status === 'mismatch') {
    console.log(
      `Trạng thái: LỆCH — web ${formatVersion(report.web)} vs server ${formatVersion(report.server)}. Sync upstream theo docs/Upgrade.md.`,
    );
  } else {
    console.log('Trạng thái: web và server cùng major.minor.');
  }

  if (report.updateAvailable) {
    console.log(`Có bản Immich mới v${formatVersion(report.latest)} — quy trình nâng cấp: docs/Upgrade.md`);
  }
};

const main = async () => {
  loadEnvFile(resolve(root, '.env'));
  const serverUrl = (getArg('--url') ?? process.env.IMMICH_SERVER_URL ?? 'http://localhost:2283').replace(/\/$/, '');

  const web = readPackageVersion('upstream/web/package.json');
  const sdk = readPackageVersion('upstream/packages/sdk/package.json');

  let server = null;
  try {
    server = parseVersion(await fetchJson(`${serverUrl}/api/server/version`));
  } catch (error) {
    console.error(`Không gọi được ${serverUrl}/api/server/version: ${error.message}`);
  }

  let latest = null;
  let latestPublishedAt;
  try {
    const release = await fetchJson(GITHUB_LATEST_RELEASE, {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'photo-gallery-ui-version-check',
    });
    latest = parseVersion(release.tag_name);
    latestPublishedAt = typeof release.published_at === 'string' ? release.published_at.slice(0, 10) : undefined;
  } catch (error) {
    console.error(`Không lấy được release GitHub: ${error.message}`);
  }

  const report = buildReport({ web, sdk, server, latest });
  printReport(report, serverUrl, latestPublishedAt);

  // Dùng exitCode thay vì process.exit(): trên Windows, exit ngay sau fetch lỗi gây assertion của libuv (exit 127).
  if (report.status === 'server-unreachable') {
    process.exitCode = 1;
  } else if (report.status === 'mismatch') {
    process.exitCode = 2;
  }
};

const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
