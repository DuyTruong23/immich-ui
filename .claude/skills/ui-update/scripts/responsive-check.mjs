// Kiểm tra responsive mobile/tablet/desktop trên dev:local (UI dev mode, dữ liệu mock).
// Chạy với cwd là thư mục đã cài playwright (ngoài repo): node <đường dẫn>/responsive-check.mjs
// Env: BASE_URL (mặc định http://127.0.0.1:5283), OUT_DIR (mặc định ./out).
// Thoát mã 1 nếu có trang không tải được — khi đó mọi số liệu "sạch" đều vô nghĩa.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

// playwright cài ở cwd, không cài trong repo
const requireFromCwd = createRequire(path.join(process.cwd(), 'noop.js'));
const pw = await import(pathToFileURL(requireFromCwd.resolve('playwright')).href);
const { chromium, webkit, devices } = pw.default ?? pw;

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5283';
const OUT = path.resolve(process.env.OUT_DIR ?? './out');
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { id: 'iphone13-portrait', engine: webkit, opts: devices['iPhone 13'] },
  { id: 'iphone13-landscape', engine: webkit, opts: devices['iPhone 13 landscape'] },
  { id: 'pixel7-portrait', engine: chromium, opts: devices['Pixel 7'] },
  { id: 'ipad-portrait', engine: webkit, opts: devices['iPad (gen 7)'] },
  { id: 'ipad-landscape', engine: webkit, opts: devices['iPad (gen 7) landscape'] },
  { id: 'desktop-1440', engine: chromium, opts: { viewport: { width: 1440, height: 900 } } },
];

const PAGES = [
  { id: 'login', path: '/auth/login', role: null },
  { id: 'photos', path: '/photos', role: 'user' },
  { id: 'favorites', path: '/favorites', role: 'user' },
  { id: 'albums', path: '/albums', role: 'user' },
  { id: 'explore', path: '/explore', role: 'user' },
  { id: 'more', path: '/more', role: 'user' },
  { id: 'dashboard', path: '/dashboard', role: 'admin' },
  { id: 'admin-users', path: '/admin/users', role: 'admin' },
];

const audit = () => {
  const doc = document.documentElement;
  const overflowX = Math.max(doc.scrollWidth, document.body.scrollWidth) - window.innerWidth;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const isVisible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  };
  const hit = (el) => {
    // vùng chạm thật: box của phần tử, mở rộng bởi ::before nếu có .pg-touch-target
    const r = el.getBoundingClientRect();
    let w = r.width, h = r.height;
    if (el.classList.contains('pg-touch-target')) {
      const b = getComputedStyle(el, '::before');
      w = Math.max(w, parseFloat(b.width) || 0);
      h = Math.max(h, parseFloat(b.height) || 0);
    }
    return { w, h };
  };
  const small = [];
  if (coarse) {
    for (const el of document.querySelectorAll('button, a[href], [role="button"], input[type="checkbox"], [role="checkbox"]')) {
      if (!isVisible(el) || el.closest('[aria-hidden="true"]')) continue;
      // bỏ phần tử bị cắt/che (vd. sidebar off-canvas): điểm giữa phải trúng chính nó
      const rr = el.getBoundingClientRect();
      const top = document.elementFromPoint(rr.left + rr.width / 2, rr.top + rr.height / 2);
      if (!top || !(top === el || el.contains(top) || top.contains(el))) continue;
      const { w, h } = hit(el);
      if (w < 43.5 || h < 43.5) {
        const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
        small.push(`${el.tagName.toLowerCase()}「${name}」${Math.round(w)}×${Math.round(h)}`);
      }
    }
  }
  const unnamed = [];
  for (const el of document.querySelectorAll('button, a[href], [role="button"]')) {
    if (!isVisible(el)) continue;
    const imgAlt = [...el.querySelectorAll('img[alt], svg[aria-label]')].map((i) => i.getAttribute('alt') || i.getAttribute('aria-label')).join(' ');
    const name = (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent || el.getAttribute('title') || imgAlt || '').trim();
    if (!name) unnamed.push(el.outerHTML.slice(0, 90));
  }
  // phần tử fixed chồng nhau (bottom nav, FAB, upload panel, header)
  const fixed = [...document.querySelectorAll('body *')].filter((el) => {
    const s = getComputedStyle(el);
    return (s.position === 'fixed' || s.position === 'sticky') && isVisible(el) && el.getBoundingClientRect().height < innerHeight * 0.9;
  });
  const overlaps = [];
  for (let i = 0; i < fixed.length; i++) {
    for (let j = i + 1; j < fixed.length; j++) {
      const a = fixed[i], b = fixed[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ix > 4 && iy > 4) {
        const tag = (el) => el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join('.')}`;
        overlaps.push(`${tag(a)} ∩ ${tag(b)} (${Math.round(ix)}×${Math.round(iy)})`);
      }
    }
  }
  const smallText = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea, select')]
    .filter(isVisible)
    .map((el) => ({ el, fs: parseFloat(getComputedStyle(el).fontSize) }))
    .filter((x) => x.fs < 16)
    .map((x) => `${x.el.tagName.toLowerCase()}[${x.el.getAttribute('name') || x.el.id || x.el.type}] ${x.fs}px`);
  return { overflowX, coarse, small: [...new Set(small)].slice(0, 25), smallCount: small.length, unnamed: unnamed.slice(0, 10), overlaps: overlaps.slice(0, 10), smallText };
};

const results = [];
for (const vp of VIEWPORTS) {
  const browser = await vp.engine.launch();
  for (const pg of PAGES) {
    const context = await browser.newContext({ ...vp.opts, locale: 'vi-VN' });
    if (pg.role) {
      await context.addInitScript((role) => sessionStorage.setItem('pg_ui_dev_role', role), pg.role);
    }
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 160)));
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 160)}`));
    let status = 'ok';
    try {
      await page.goto(BASE + pg.path, { waitUntil: 'networkidle', timeout: 60_000 });
      await page.waitForTimeout(1200);
    } catch (e) {
      status = `goto failed: ${String(e).slice(0, 120)}`;
    }
    const finalUrl = page.url().replace(BASE, '');
    const a = status === 'ok' ? await page.evaluate(audit) : null;
    const shot = path.join(OUT, `${vp.id}__${pg.id}.png`);
    await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
    results.push({ viewport: vp.id, page: pg.id, finalUrl, status, ...a, consoleErrors: consoleErrors.slice(0, 5), shot });
    await context.close();
  }
  await browser.close();
}

// viewer: mở ảnh đầu tiên rồi bật panel info trên iPhone và iPad
for (const vp of VIEWPORTS.filter((v) => ['iphone13-portrait', 'iphone13-landscape', 'ipad-portrait', 'desktop-1440'].includes(v.id))) {
  const browser = await vp.engine.launch();
  const context = await browser.newContext({ ...vp.opts, locale: 'vi-VN' });
  await context.addInitScript(() => sessionStorage.setItem('pg_ui_dev_role', 'user'));
  const page = await context.newPage();
  let status = 'ok';
  try {
    await page.goto(BASE + '/photos', { waitUntil: 'networkidle', timeout: 60_000 });
    const thumb = page.locator('[data-thumbnail-focus-container], #asset-grid [role="link"]').first();
    await thumb.waitFor({ timeout: 15_000 });
    await thumb.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, `${vp.id}__viewer.png`) });
    const info = page.getByRole('button', { name: /thông tin|info/i }).first();
    if (await info.count()) {
      await info.click();
      await page.waitForTimeout(800);
    } else {
      await page.keyboard.press('i');
      await page.waitForTimeout(800);
    }
    const panel = await page.evaluate(() => {
      const el = document.querySelector('#detail-panel');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const nav = document.querySelector('[data-testid="asset-viewer-navbar-actions"]')?.closest('nav, div');
      const navR = nav?.getBoundingClientRect();
      const s = getComputedStyle(el);
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bg: s.backgroundColor, z: s.zIndex, coveredByNav: navR ? navR.bottom > r.top + 2 && Number(getComputedStyle(nav).zIndex || 0) > Number(s.zIndex || 0) : null, vw: innerWidth, vh: innerHeight };
    });
    await page.screenshot({ path: path.join(OUT, `${vp.id}__viewer-info.png`) });
    results.push({ viewport: vp.id, page: 'viewer-info', status, panel });
  } catch (e) {
    status = `viewer failed: ${String(e).slice(0, 160)}`;
    await page.screenshot({ path: path.join(OUT, `${vp.id}__viewer-fail.png`) }).catch(() => {});
    results.push({ viewport: vp.id, page: 'viewer-info', status });
  }
  await browser.close();
}

fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
for (const r of results) {
  const flags = [];
  if (r.status !== 'ok') flags.push(r.status);
  if (r.overflowX > 1) flags.push(`overflowX ${r.overflowX}px`);
  if (r.smallCount) flags.push(`${r.smallCount} target<44`);
  if (r.unnamed?.length) flags.push(`${r.unnamed.length} no-name`);
  if (r.overlaps?.length) flags.push(`${r.overlaps.length} fixed-overlap`);
  if (r.smallText?.length) flags.push(`${r.smallText.length} input<16px`);
  if (r.consoleErrors?.length) flags.push(`${r.consoleErrors.length} console-err`);
  if (r.panel) flags.push(`panel ${r.panel.w}×${r.panel.h}@${r.panel.x},${r.panel.y} z${r.panel.z} covered=${r.panel.coveredByNav}`);
  console.log(`${r.viewport.padEnd(20)} ${r.page.padEnd(12)} ${r.finalUrl ?? ''} ${flags.join(' | ') || 'clean'}`);
}

const pagesTried = results.filter((r) => r.page !== 'viewer-info');
const pagesFailed = pagesTried.filter((r) => r.status !== 'ok');
console.log(`
pages loaded: ${pagesTried.length - pagesFailed.length}/${pagesTried.length}; screenshots + results.json in ${OUT}`);
if (pagesFailed.length) {
  console.error(`FAIL: ${pagesFailed.length} trang không tải được (server dev chết?) — chạy lại sau khi khởi động server.`);
  process.exit(1);
}
