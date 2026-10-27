import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatBytes, median, rankChunks, summarize, summarizeLighthouse, totalsByType } from './perf-audit.mjs';

test('median: lẻ, chẵn, rỗng', () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([]), 0);
});

test('summarize trả min/median/max/count', () => {
  assert.deepEqual(summarize([300, 100, 200]), { min: 100, median: 200, max: 300, count: 3 });
});

test('formatBytes', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(3 * 1024 * 1024), '3.00 MB');
});

test('rankChunks xếp theo gzip giảm dần và cắt theo limit', () => {
  const entries = [
    { path: 'a.js', raw: 10, gzip: 3 },
    { path: 'b.js', raw: 10, gzip: 9 },
    { path: 'c.css', raw: 10, gzip: 5 },
  ];
  assert.deepEqual(
    rankChunks(entries, 2).map((e) => e.path),
    ['b.js', 'c.css'],
  );
});

test('totalsByType gộp js và css', () => {
  const entries = [
    { path: 'a.js', raw: 10, gzip: 3 },
    { path: 'b.js', raw: 20, gzip: 6 },
    { path: 'c.css', raw: 5, gzip: 2 },
  ];
  assert.deepEqual(totalsByType(entries), {
    js: { raw: 30, gzip: 9, count: 2 },
    css: { raw: 5, gzip: 2, count: 1 },
  });
});

test('summarizeLighthouse rút các chỉ số chính', () => {
  const report = {
    categories: { performance: { score: 0.87 } },
    audits: {
      'first-contentful-paint': { numericValue: 1234 },
      'largest-contentful-paint': { numericValue: 2345 },
      'total-blocking-time': { numericValue: 150 },
      'cumulative-layout-shift': { numericValue: 0.01 },
      'speed-index': { numericValue: 2000 },
      interactive: { numericValue: 3000 },
      'total-byte-weight': { numericValue: 1_500_000 },
    },
  };
  assert.deepEqual(summarizeLighthouse(report), {
    performanceScore: 87,
    fcpMs: 1234,
    lcpMs: 2345,
    tbtMs: 150,
    cls: 0.01,
    speedIndexMs: 2000,
    ttiMs: 3000,
    totalBytes: 1_500_000,
  });
});
