#!/usr/bin/env node
/**
 * Test luồng email nhận thông báo tính năng mới.
 *
 * Usage:
 *   npx tsx scripts/test-feature-update-subscribe.mjs
 *   npx tsx scripts/test-feature-update-subscribe.mjs --email truongduy.fw@gmail.com
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

loadEnvFile(resolve(root, '.env.vercel.test'));
loadEnvFile(resolve(root, '.env.production'));
loadEnvFile(resolve(root, '.env'));

const args = process.argv.slice(2);
const emailIndex = args.indexOf('--email');
const subscriberEmail = (emailIndex >= 0 ? args[emailIndex + 1] : args[0])?.trim() || 'truongduy.fw@gmail.com';

const { sendViaResend } = await import('../api/_lib/email.ts');
const { buildFeatureUpdateNotifyHtml } = await import('../api/_lib/feature-update-notify.ts');
const release = JSON.parse(readFileSync(resolve(root, 'custom/src/data/feature-updates.json'), 'utf8'));

const adminEmail = process.env.ADMIN_NOTIFY_EMAIL?.trim();
const fromEmail = process.env.LOGIN_NOTIFY_FROM?.trim() || process.env.FEEDBACK_NOTIFY_FROM?.trim();
const appName = process.env.PUBLIC_APP_NAME?.trim() || 'Photo Gallery';
const appUrl = (process.env.PUBLIC_APP_URL?.trim() || 'https://gallery-app.pp.ua').replace(/\/$/, '');

console.log('==> feature-update subscribe / notify test');
console.log(`Subscriber: ${subscriberEmail}`);
console.log(`ADMIN_NOTIFY_EMAIL: ${adminEmail ? '(set)' : '(missing)'}`);
console.log(`RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '(set)' : '(missing)'}`);
console.log(`LOGIN_NOTIFY_FROM: ${fromEmail ? '(set)' : '(missing)'}`);
console.log(`Changelog version: ${release.version}`);

if (!process.env.RESEND_API_KEY || !fromEmail) {
  console.error('\n✗ Thiếu RESEND_API_KEY hoặc LOGIN_NOTIFY_FROM trong .env/.env.production');
  process.exit(1);
}

const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

console.log('\n--- 1) Báo admin: user vừa đăng ký email nhận thông báo ---');
if (!adminEmail) {
  console.warn('Bỏ qua: ADMIN_NOTIFY_EMAIL chưa set');
} else {
  const adminSent = await sendViaResend({
    to: adminEmail,
    from: fromEmail,
    subject: `[${appName}] Email nhận thông báo mới: ${subscriberEmail}`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #111;">
        <h2 style="margin-bottom: 0.5rem;">User đăng ký nhận changelog</h2>
        <p style="color: #555; margin-top: 0;">Từ <strong>${appName}</strong> (test script)</p>
        <table style="border-collapse: collapse; margin: 1rem 0;">
          <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Email nhận thông báo</td><td><strong>${subscriberEmail}</strong></td></tr>
          <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Tài khoản</td><td>Test script</td></tr>
          <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Thời gian</td><td>${time}</td></tr>
        </table>
      </div>
    `.trim(),
  });
  console.log('Admin notify sent', adminSent.id ? `(id: ${adminSent.id})` : '');
}

console.log('\n--- 2) Gửi changelog version mới tới subscriber ---');
const changelogSent = await sendViaResend({
  to: subscriberEmail,
  from: fromEmail,
  subject: `[${appName}] Tính năng mới ${release.version}`,
  html: buildFeatureUpdateNotifyHtml({
    appName,
    appUrl,
    email: subscriberEmail,
    version: release.version,
    items: release.items,
  }),
});
console.log('Changelog sent', changelogSent.id ? `(id: ${changelogSent.id})` : '');

console.log('\n✓ Đã gửi 2 email. Kiểm tra hộp thư (và spam) của:');
if (adminEmail) {
  console.log(`  - Admin: ${adminEmail} (thông báo user vừa đăng ký)`);
}
console.log(`  - Subscriber: ${subscriberEmail} (changelog ${release.version})`);
