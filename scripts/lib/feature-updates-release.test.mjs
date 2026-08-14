import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildRelease,
  bumpPatch,
  collectPendingItems,
  commitsToItems,
  commitToItem,
  compareVersion,
  isReleaseCommit,
  normalizePendingFile,
  parseConventionalSubject,
  parseVersion,
  shouldIncludeCommit,
} from './feature-updates-release.mjs';

describe('version', () => {
  it('parses and bumps patch', () => {
    assert.deepEqual(parseVersion('v1.0.3'), { major: 1, minor: 0, patch: 3 });
    assert.equal(bumpPatch('v1.0.3'), 'v1.0.4');
    assert.equal(bumpPatch('1.0.9'), 'v1.0.10');
  });

  it('compares versions', () => {
    assert.ok(compareVersion('v1.0.4', 'v1.0.3') > 0);
    assert.equal(compareVersion('v1.0.3', '1.0.3'), 0);
    assert.ok(compareVersion('v1.0.3', 'v1.1.0') < 0);
  });
});

describe('commit filtering', () => {
  it('keeps feat/fix/improve/perf', () => {
    assert.equal(shouldIncludeCommit('feat: Cho phép đổi avatar'), true);
    assert.equal(shouldIncludeCommit('fix(video): tải nhanh hơn trên mobile'), true);
    assert.equal(shouldIncludeCommit('improve: form đăng nhập'), true);
    assert.equal(shouldIncludeCommit('perf(mobile): giảm preload'), true);
  });

  it('skips chore/docs/merge/release', () => {
    assert.equal(shouldIncludeCommit('chore: bump deps'), false);
    assert.equal(shouldIncludeCommit('docs: cập nhật README'), false);
    assert.equal(shouldIncludeCommit('Merge branch develop into main'), false);
    assert.equal(shouldIncludeCommit('chore(release): v1.0.4'), false);
    assert.equal(isReleaseCommit('chore(release): v1.0.4'), true);
  });

  it('skips admin and codebase changes', () => {
    assert.equal(shouldIncludeCommit('feat(admin): thêm tab tính năng cập nhật'), false);
    assert.equal(shouldIncludeCommit('feat: giao diện admin dễ đọc hơn trên mobile'), false);
    assert.equal(shouldIncludeCommit('fix: admin login không crash dashboard'), false);
    assert.equal(shouldIncludeCommit('feat: tự tăng version và generate changelog khi merge develop'), false);
    assert.equal(shouldIncludeCommit('fix: đồng bộ lịch sử releases với v1.0.6 sau merge'), false);
    assert.equal(shouldIncludeCommit('feat: đăng ký email nhận thông báo tính năng'), true);
    assert.equal(shouldIncludeCommit('feat(upstream): sync overlay prepare:custom'), false);
    assert.equal(shouldIncludeCommit('feat: Cho phép đổi avatar', 'Sửa trang /admin'), false);
  });

  it('parses conventional subject', () => {
    assert.deepEqual(parseConventionalSubject('feat(custom): Cho phép đổi avatar'), {
      type: 'feat',
      scope: 'custom',
      title: 'Cho phép đổi avatar',
      breaking: false,
    });
  });

  it('maps commit body to detail and strips git trailers', () => {
    assert.deepEqual(commitToItem('feat: Cho phép đổi avatar', 'Vào Cài đặt → Tài khoản.'), {
      title: 'Cho phép đổi avatar',
      detail: 'Vào Cài đặt → Tài khoản.',
    });
    assert.deepEqual(
      commitToItem('feat: Cho phép đổi avatar', 'Co-authored-by: Cursor <cursoragent@cursor.com>'),
      { title: 'Cho phép đổi avatar' },
    );
  });
});

describe('pending files', () => {
  it('reads single item and skips drafts', () => {
    assert.deepEqual(normalizePendingFile({ title: 'Mục A', detail: 'Chi tiết' }), [
      { title: 'Mục A', detail: 'Chi tiết' },
    ]);
    assert.deepEqual(normalizePendingFile({ draft: true, title: 'Mục A' }), []);
    assert.deepEqual(normalizePendingFile({ title: 'Mô tả ngắn tính năng (tiếng Việt)' }), []);
  });

  it('reads item arrays and dedupes', () => {
    const items = collectPendingItems([
      { name: 'a.json', value: { items: [{ title: 'Một' }, { title: 'Hai' }] } },
      { name: 'b.json', value: { title: 'Một' } },
    ]);
    assert.deepEqual(items, [{ title: 'Một' }, { title: 'Hai' }]);
  });
});

describe('buildRelease', () => {
  const current = {
    version: 'v1.0.3',
    items: [{ title: 'Cũ' }],
  };

  it('prefers pending items over commits', () => {
    const release = buildRelease({
      current,
      pendingItems: [{ title: 'Mới từ nhánh' }],
      commitItems: [{ title: 'Từ commit' }],
      releasedAt: '2026-08-14T00:00:00.000Z',
    });

    assert.equal(release.version, 'v1.0.4');
    assert.equal(release.source, 'pending');
    assert.deepEqual(release.items, [{ title: 'Mới từ nhánh' }]);
    assert.deepEqual(release.releases, [
      { version: 'v1.0.4', items: [{ title: 'Mới từ nhánh' }] },
      { version: 'v1.0.3', items: [{ title: 'Cũ' }] },
    ]);
  });

  it('falls back to conventional commits', () => {
    const items = commitsToItems(`feat: Cho phép đổi avatar\x1fChi tiết avatar\x1echore: ignore\x1f\x1e`);
    assert.deepEqual(items, [{ title: 'Cho phép đổi avatar', detail: 'Chi tiết avatar' }]);

    const release = buildRelease({
      current,
      pendingItems: [],
      commitItems: items,
      releasedAt: '2026-08-14T00:00:00.000Z',
    });
    assert.equal(release.source, 'commits');
    assert.equal(release.items[0].title, 'Cho phép đổi avatar');
  });

  it('does not bump version when nothing user-facing', () => {
    const release = buildRelease({
      current,
      pendingItems: [],
      commitItems: [],
      releasedAt: '2026-08-14T00:00:00.000Z',
    });

    assert.equal(release.version, 'v1.0.3');
    assert.equal(release.source, 'unchanged');
    assert.deepEqual(release.items, current.items);
  });

  it('prepends a new version and keeps older releases', () => {
    const release = buildRelease({
      current: {
        version: 'v1.0.5',
        items: [{ title: 'Video' }],
        releases: [
          { version: 'v1.0.5', items: [{ title: 'Video' }] },
          { version: 'v1.0.4', items: [{ title: 'Avatar' }] },
        ],
      },
      pendingItems: [{ title: 'Email thông báo' }],
      commitItems: [],
      releasedAt: '2026-08-14T00:00:00.000Z',
    });

    assert.equal(release.version, 'v1.0.6');
    assert.deepEqual(release.releases, [
      { version: 'v1.0.6', items: [{ title: 'Email thông báo' }] },
      { version: 'v1.0.5', items: [{ title: 'Video' }] },
      { version: 'v1.0.4', items: [{ title: 'Avatar' }] },
    ]);
  });
});
