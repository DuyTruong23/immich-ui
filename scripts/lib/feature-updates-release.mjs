/** Pure helpers for feature-update release (version bump + changelog). */

const INCLUDE_TYPES = new Set(['feat', 'fix', 'improve', 'perf']);
const SKIP_TYPES = new Set(['chore', 'docs', 'ci', 'test', 'style', 'refactor', 'build', 'revert']);
const SKIP_SCOPES = new Set([
  'admin',
  'api',
  'ci',
  'script',
  'scripts',
  'config',
  'patch',
  'upstream',
  'release',
  'git',
  'build',
  'dx',
  'infra',
]);

const CONVENTIONAL_RE = /^(?<type>feat|fix|improve|perf|chore|docs|ci|test|style|refactor|build|revert)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?:\s*(?<title>.+)$/i;
const MERGE_RE = /^(merge\b|merged?\s+in\b)/i;

/** Admin / nội bộ codebase — không hiện trên modal user. */
const INTERNAL_OR_ADMIN_RE =
  /\b(admin|quản trị|\/admin\b|codebase|upstream|prepare:custom|github actions?|workflow|changelog|generate changelog|merge develop|typecheck|eslint|prettier|typescript|tsconfig|vite|blob|vercel secret|đồng bộ bản copy|overlay upstream|script(s)?|ci\/cd)\b/i;

/**
 * @param {string} version
 * @returns {{ major: number, minor: number, patch: number }}
 */
export const parseVersion = (version) => {
  const [major = 0, minor = 0, patch = 0] = String(version ?? '')
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);

  return { major, minor, patch };
};

/**
 * @param {{ major: number, minor: number, patch: number }} parts
 * @returns {string}
 */
export const formatVersion = ({ major, minor, patch }) => `v${major}.${minor}.${patch}`;

/** @param {string} version */
export const bumpPatch = (version) => {
  const parts = parseVersion(version);
  return formatVersion({ ...parts, patch: parts.patch + 1 });
};

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export const compareVersion = (a, b) => {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (left.major !== right.major) {
    return left.major - right.major;
  }
  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }
  return left.patch - right.patch;
};

/** @param {string} message */
export const isReleaseCommit = (message) => /^\s*chore\(release\)/i.test(String(message ?? ''));

/** @param {string} subject */
export const parseConventionalSubject = (subject) => {
  const trimmed = String(subject ?? '').trim();
  const match = CONVENTIONAL_RE.exec(trimmed);
  if (!match?.groups) {
    return { type: '', scope: '', title: trimmed, breaking: false };
  }

  return {
    type: match.groups.type.toLowerCase(),
    scope: match.groups.scope?.trim() ?? '',
    title: match.groups.title.trim(),
    breaking: Boolean(match.groups.breaking),
  };
};

/**
 * Chỉ giữ thay đổi UI/UX mà user thường thấy — bỏ admin và việc nội bộ repo.
 * @param {string} subject
 * @param {string} [body]
 */
export const isUserFacingUiChange = (subject, body = '') => {
  const { type, scope, title } = parseConventionalSubject(subject);
  if (SKIP_SCOPES.has(scope.toLowerCase())) {
    return false;
  }

  const haystack = [scope, title, body].filter(Boolean).join('\n');
  if (INTERNAL_OR_ADMIN_RE.test(haystack)) {
    return false;
  }

  if (type && !INCLUDE_TYPES.has(type)) {
    return false;
  }

  return Boolean(title);
};

/** @param {string} subject */
export const shouldIncludeCommit = (subject, body = '') => {
  const trimmed = String(subject ?? '').trim();
  if (!trimmed || MERGE_RE.test(trimmed) || isReleaseCommit(trimmed)) {
    return false;
  }

  const { type, title } = parseConventionalSubject(trimmed);
  if (!title) {
    return false;
  }
  if (SKIP_TYPES.has(type)) {
    return false;
  }
  if (INCLUDE_TYPES.has(type) || !type) {
    return isUserFacingUiChange(trimmed, body);
  }

  return false;
};

/**
 * @param {string} subject
 * @param {string} [body]
 * @returns {{ title: string, detail?: string } | null}
 */
export const commitToItem = (subject, body = '') => {
  if (!shouldIncludeCommit(subject, body)) {
    return null;
  }

  const { title } = parseConventionalSubject(subject);
  if (!title) {
    return null;
  }

  const detail = String(body ?? '')
    .split(/\n{2,}/)[0]
    ?.replace(/^Signed-off-by:.*$/gim, '')
    .trim();

  return detail ? { title, detail } : { title };
};

/**
 * Parse `git log --format=%s%x1f%b%x1e`.
 * @param {string} raw
 * @returns {{ subject: string, body: string }[]}
 */
export const parseGitLog = (raw) =>
  String(raw ?? '')
    .split('\x1e')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [subject = '', body = ''] = entry.split('\x1f');
      return { subject: subject.trim(), body: body.trim() };
    });

/**
 * @param {string} raw
 * @returns {{ title: string, detail?: string }[]}
 */
export const commitsToItems = (raw) => {
  const seen = new Set();
  const items = [];

  for (const { subject, body } of parseGitLog(raw)) {
    const item = commitToItem(subject, body);
    if (!item) {
      continue;
    }

    const key = item.title.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    items.push(item);
  }

  return items;
};

/**
 * @param {unknown} value
 * @returns {{ title: string, detail?: string } | null}
 */
export const normalizePendingItem = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = /** @type {Record<string, unknown>} */ (value);
  if (record.draft === true) {
    return null;
  }

  const title = typeof record.title === 'string' ? record.title.trim() : '';
  if (!title || title === 'Mô tả ngắn tính năng (tiếng Việt)') {
    return null;
  }

  const detail = typeof record.detail === 'string' ? record.detail.trim() : '';
  if (!isUserFacingUiChange(title, detail)) {
    return null;
  }

  return detail ? { title, detail } : { title };
};

/**
 * @param {unknown} value
 * @returns {{ title: string, detail?: string }[]}
 */
export const normalizePendingFile = (value) => {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const record = /** @type {Record<string, unknown>} */ (value);
  if (Array.isArray(record.items)) {
    return record.items
      .map((item) => normalizePendingItem(item))
      .filter((item) => item !== null);
  }

  const item = normalizePendingItem(record);
  return item ? [item] : [];
};

/**
 * @param {Array<{ name: string, value: unknown }>} files
 * @returns {{ title: string, detail?: string }[]}
 */
export const collectPendingItems = (files) => {
  const seen = new Set();
  const items = [];

  for (const file of files) {
    for (const item of normalizePendingFile(file.value)) {
      const key = item.title.toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      items.push(item);
    }
  }

  return items;
};

/**
 * @param {{
 *   current: {
 *     version: string,
 *     items: { title: string, detail?: string }[],
 *     releases?: { version: string, items: { title: string, detail?: string }[] }[],
 *   },
 *   pendingItems: { title: string, detail?: string }[],
 *   commitItems: { title: string, detail?: string }[],
 *   releasedAt: string,
 * }} input
 */
export const buildRelease = ({ current, pendingItems, commitItems, releasedAt }) => {
  const items = pendingItems.length > 0 ? pendingItems : commitItems;
  const nextItems = items.length > 0 ? items : current.items;
  const version = bumpPatch(current.version);
  const previousReleases =
    Array.isArray(current.releases) && current.releases.length > 0
      ? current.releases
      : [{ version: current.version, items: current.items }];
  const releases = [
    { version, items: nextItems },
    ...previousReleases.filter((release) => release.version !== version),
  ];

  return {
    version,
    items: nextItems,
    releases,
    releasedAt,
    source: pendingItems.length > 0 ? 'pending' : commitItems.length > 0 ? 'commits' : 'unchanged',
  };
};
