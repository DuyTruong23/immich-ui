import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildReport, compareVersions, formatVersion, parseVersion } from './check-immich-version.mjs';

test('parseVersion đọc tag có v, prerelease và object từ /api/server/version', () => {
  assert.deepEqual(parseVersion('v3.3.5'), { major: 3, minor: 3, patch: 5, prerelease: null });
  assert.deepEqual(parseVersion('3.3.0-rc.0'), { major: 3, minor: 3, patch: 0, prerelease: 'rc.0' });
  assert.deepEqual(parseVersion({ major: 3, minor: 1, patch: 0, prerelease: null }), {
    major: 3,
    minor: 1,
    patch: 0,
    prerelease: null,
  });
  assert.equal(parseVersion('abc'), null);
  assert.equal(parseVersion(undefined), null);
});

test('compareVersions xếp prerelease trước bản chính thức', () => {
  assert.equal(compareVersions(parseVersion('3.1.0'), parseVersion('3.3.5')), -1);
  assert.equal(compareVersions(parseVersion('3.3.5'), parseVersion('3.3.5')), 0);
  assert.equal(compareVersions(parseVersion('3.3.0-rc.0'), parseVersion('3.3.0')), -1);
  assert.equal(compareVersions(parseVersion('4.0.0'), parseVersion('3.9.9')), 1);
});

test('buildReport báo khớp và có bản mới', () => {
  const report = buildReport({
    web: parseVersion('3.1.0'),
    sdk: parseVersion('3.1.0'),
    server: parseVersion('3.1.0'),
    latest: parseVersion('v3.3.5'),
  });
  assert.equal(report.status, 'match');
  assert.equal(report.updateAvailable, true);
});

test('buildReport báo lệch khi web và server khác minor', () => {
  const report = buildReport({
    web: parseVersion('3.1.0'),
    sdk: parseVersion('3.1.0'),
    server: parseVersion('3.3.5'),
    latest: undefined,
  });
  assert.equal(report.status, 'mismatch');
  assert.equal(report.updateAvailable, false);
});

test('buildReport báo không gọi được server', () => {
  const report = buildReport({ web: parseVersion('3.1.0'), sdk: null, server: null, latest: null });
  assert.equal(report.status, 'server-unreachable');
});

test('formatVersion', () => {
  assert.equal(formatVersion(parseVersion('3.3.0-rc.0')), '3.3.0-rc.0');
  assert.equal(formatVersion(null), 'n/a');
});
