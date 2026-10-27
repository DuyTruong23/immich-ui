#!/usr/bin/env node
// Tính tương phản WCAG 2.x cho cặp màu ở theme sáng và tối của WeGallery.
// Dùng: node contrast.mjs <fg>/<bg> [<fg>/<bg> …] [--min 4.5]
//   fg, bg là tên token (bỏ hoặc giữ "--", vd. md-sys-color-on-surface) hoặc mã hex (#fff, #6750a4).
// Giá trị token đọc từ branding/src/m3/tokens.css và branding/src/m3/immich-bridge.css,
// theo alias var(--x) trong cùng theme. Thoát mã 1 nếu có cặp dưới ngưỡng.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const FILES = ['branding/src/m3/tokens.css', 'branding/src/m3/immich-bridge.css'];

const args = process.argv.slice(2);
let min = 4.5;
const pairs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--min') min = Number(args[++i]);
  else pairs.push(args[i]);
}
if (pairs.length === 0) {
  console.error('Dùng: node contrast.mjs <fg>/<bg> [...] [--min 4.5]');
  process.exit(2);
}

// Tách các khối selector { … } ở mọi mức lồng, gán theme theo selector chứa ".dark" hay không.
const vars = { light: {}, dark: {} };
for (const rel of FILES) {
  const css = fs.readFileSync(path.join(root, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const selector = m[1].trim();
    const theme = /\.dark\b/.test(selector) && !/:not\(\.dark\)/.test(selector) ? 'dark' : 'light';
    for (const decl of m[2].split(';')) {
      const d = decl.match(/^\s*--([\w-]+)\s*:\s*(.+?)\s*$/s);
      if (d) vars[theme][d[1]] = d[2];
    }
  }
}

const resolve = (token, theme, depth = 0) => {
  if (/^#|^rgb/i.test(token)) return token;
  const name = token.replace(/^--/, '');
  const raw = vars[theme][name] ?? vars.light[name];
  if (raw === undefined) return null;
  const alias = raw.match(/^var\(--([\w-]+)\)$/);
  if (alias && depth < 16) return resolve(alias[1], theme, depth + 1);
  return raw;
};

const toRgb = (value) => {
  if (!value) return null;
  let h = value.trim();
  const rgb = h.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  if (!h.startsWith('#')) return null;
  h = h.slice(1);
  if (h.length === 3 || h.length === 4) h = [...h.slice(0, 3)].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

const luminance = ([r, g, b]) => {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

const ratio = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

let failed = 0;
for (const pair of pairs) {
  const [fg, bg] = pair.split('/');
  const row = [];
  for (const theme of ['light', 'dark']) {
    const fv = resolve(fg, theme);
    const bv = resolve(bg, theme);
    const f = toRgb(fv);
    const b = toRgb(bv);
    if (!f || !b) {
      row.push(`${theme}: không đọc được (${fg}=${fv ?? '?'}, ${bg}=${bv ?? '?'}; màu có alpha/color-mix cần kiểm tay)`);
      continue;
    }
    const r = ratio(f, b);
    const ok = r >= min;
    if (!ok) failed++;
    row.push(`${theme}: ${r.toFixed(2)}:1 ${ok ? 'OK' : `< ${min}`} (${fv} / ${bv})`);
  }
  console.log(`${pair}\n  ${row.join('\n  ')}`);
}
process.exit(failed ? 1 : 0);
