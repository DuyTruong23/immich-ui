#!/usr/bin/env node
/**
 * Đo nhanh performance production + phân tích bundle + rút gọn báo cáo Lighthouse.
 *
 * Usage:
 *   pnpm perf:audit                                   # TTFB (5 mẫu) cho các endpoint production
 *   pnpm perf:audit --base https://gallery-app.pp.ua --samples 10
 *   pnpm perf:audit --bundle                          # kích thước JS/CSS trong upstream/web/build (chạy `pnpm build` trước)
 *   pnpm perf:audit --lighthouse-summary path/to/report.json
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const median = (values) => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const summarize = (samples) => ({
  min: Math.min(...samples),
  median: median(samples),
  max: Math.max(...samples),
  count: samples.length,
});

export const formatBytes = (bytes) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export const rankChunks = (entries, limit = 12) => [...entries].sort((a, b) => b.gzip - a.gzip).slice(0, limit);

export const totalsByType = (entries) => {
  const totals = { js: { raw: 0, gzip: 0, count: 0 }, css: { raw: 0, gzip: 0, count: 0 } };
  for (const entry of entries) {
    const bucket = entry.path.endsWith('.css') ? totals.css : totals.js;
    bucket.raw += entry.raw;
    bucket.gzip += entry.gzip;
    bucket.count += 1;
  }
  return totals;
};

export const summarizeLighthouse = (report) => {
  const audit = (id) => report.audits?.[id]?.numericValue ?? null;
  const score = report.categories?.performance?.score;
  return {
    performanceScore: typeof score === 'number' ? Math.round(score * 100) : null,
    fcpMs: audit('first-contentful-paint'),
    lcpMs: audit('largest-contentful-paint'),
    tbtMs: audit('total-blocking-time'),
    cls: audit('cumulative-layout-shift'),
    speedIndexMs: audit('speed-index'),
    ttiMs: audit('interactive'),
    totalBytes: audit('total-byte-weight'),
  };
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

const getArg = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const hasFlag = (name) => process.argv.includes(name);

const buildTargets = (base) => {
  const mediaOrigin = (process.env.PUBLIC_IMMICH_MEDIA_URL ?? '').trim().replace(/\/$/, '');
  const serverOrigin = (process.env.IMMICH_SERVER_URL ?? '').trim().replace(/\/$/, '');
  const targets = [
    { label: 'Trang chủ (Vercel static)', url: `${base}/` },
    { label: 'REST qua Vercel proxy', url: `${base}/api/server/ping` },
  ];
  if (mediaOrigin) {
    targets.push({ label: 'Media origin (tunnel)', url: `${mediaOrigin}/api/server/ping` });
  }
  if (serverOrigin && serverOrigin !== mediaOrigin) {
    targets.push({ label: 'Immich trực tiếp (tunnel)', url: `${serverOrigin}/api/server/ping` });
  }
  return targets;
};

const timeRequest = async (url) => {
  const start = performance.now();
  const response = await fetch(url, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(30_000) });
  const ttfb = performance.now() - start;
  await response.arrayBuffer();
  const total = performance.now() - start;
  return {
    ttfb,
    total,
    status: response.status,
    vercel: response.headers.get('x-vercel-id'),
    cfRay: response.headers.get('cf-ray'),
    cfCache: response.headers.get('cf-cache-status'),
    encoding: response.headers.get('content-encoding'),
  };
};

const runTtfb = async () => {
  loadEnvFile(resolve(root, '.env'));
  const base = (getArg('--base') ?? process.env.PERF_BASE_URL ?? 'https://gallery-app.pp.ua').replace(/\/$/, '');
  const samples = Number(getArg('--samples') ?? 5);
  const targets = buildTargets(base);

  console.log(`TTFB (${samples} mẫu, tuần tự) — ${new Date().toISOString()}`);
  for (const target of targets) {
    const results = [];
    for (let i = 0; i < samples; i++) {
      try {
        results.push(await timeRequest(target.url));
      } catch (error) {
        console.log(`  ${target.label}: lỗi ${error.message}`);
      }
    }
    if (results.length === 0) {
      continue;
    }
    const ttfb = summarize(results.map((r) => r.ttfb));
    const total = summarize(results.map((r) => r.total));
    const last = results.at(-1);
    const pop = last.cfRay ? last.cfRay.split('-').at(-1) : '-';
    const region = last.vercel ? last.vercel.split('::')[0] : '-';
    console.log(
      `  ${target.label.padEnd(28)} HTTP ${last.status}  TTFB min/med/max ${ttfb.min.toFixed(0)}/${ttfb.median.toFixed(0)}/${ttfb.max.toFixed(0)} ms  total med ${total.median.toFixed(0)} ms  cf-pop ${pop}  vercel ${region}  cf-cache ${last.cfCache ?? '-'}  enc ${last.encoding ?? '-'}`,
    );
    console.log(`    ${target.url}`);
  }
};

const collectBundle = (dir) => {
  const entries = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (name.endsWith('.js') || name.endsWith('.css')) {
        const content = readFileSync(full);
        entries.push({ path: relative(dir, full).replaceAll('\\', '/'), raw: content.length, gzip: gzipSync(content).length });
      }
    }
  };
  walk(dir);
  return entries;
};

const runBundle = () => {
  const dir = resolve(root, 'upstream/web/build/_app/immutable');
  if (!existsSync(dir)) {
    console.error('Chưa có build — chạy `pnpm build` trước.');
    // Dùng exitCode (không gọi process.exit()) cho đồng bộ với phần còn lại của script.
    process.exitCode = 1;
    return;
  }
  const entries = collectBundle(dir);
  const totals = totalsByType(entries);
  console.log(`Bundle (${dir})`);
  console.log(`  JS : ${totals.js.count} file, raw ${formatBytes(totals.js.raw)}, gzip ${formatBytes(totals.js.gzip)}`);
  console.log(`  CSS: ${totals.css.count} file, raw ${formatBytes(totals.css.raw)}, gzip ${formatBytes(totals.css.gzip)}`);
  console.log('  Chunk lớn nhất (gzip):');
  for (const entry of rankChunks(entries, 12)) {
    console.log(`    ${formatBytes(entry.gzip).padStart(10)}  (raw ${formatBytes(entry.raw).padStart(10)})  ${entry.path}`);
  }
};

const runLighthouseSummary = (file) => {
  const report = JSON.parse(readFileSync(resolve(file), 'utf8'));
  const summary = summarizeLighthouse(report);
  console.log(`Lighthouse ${report.finalDisplayedUrl ?? report.requestedUrl ?? ''} (${report.configSettings?.formFactor ?? '?'})`);
  console.log(`  Performance ${summary.performanceScore ?? '-'}/100`);
  console.log(`  FCP ${summary.fcpMs?.toFixed(0)} ms · LCP ${summary.lcpMs?.toFixed(0)} ms · TBT ${summary.tbtMs?.toFixed(0)} ms · CLS ${summary.cls?.toFixed(3)} · SI ${summary.speedIndexMs?.toFixed(0)} ms · TTI ${summary.ttiMs?.toFixed(0)} ms`);
  console.log(`  Tổng tải ${summary.totalBytes === null ? '-' : formatBytes(summary.totalBytes)}`);
};

const main = async () => {
  if (hasFlag('--bundle')) {
    runBundle();
    return;
  }
  const lighthouseFile = getArg('--lighthouse-summary');
  if (lighthouseFile) {
    runLighthouseSummary(lighthouseFile);
    return;
  }
  await runTtfb();
};

const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error);
    // Dùng exitCode thay vì process.exit(): trên Windows, exit ngay sau fetch lỗi gây assertion của libuv (exit 127).
    process.exitCode = 1;
  });
}
