#!/usr/bin/env node
/**
 * Test POST /api/notify-login (Resend email admin khi login).
 *
 * Usage:
 *   npx tsx scripts/test-notify-login.mjs
 *   npx tsx scripts/test-notify-login.mjs --token <accessToken>
 *   IMMICH_TEST_EMAIL=x IMMICH_TEST_PASSWORD=y npx tsx scripts/test-notify-login.mjs
 *   npx tsx scripts/test-notify-login.mjs --url https://gallery-app.pp.ua
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
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

const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const remoteUrl = (getArg('--url') ?? 'https://gallery-app.pp.ua').replace(/\/$/, '');
const explicitToken = getArg('--token');
const testEmail = process.env.IMMICH_TEST_EMAIL?.trim();
const testPassword = process.env.IMMICH_TEST_PASSWORD?.trim();

const printResult = (label, status, body) => {
  console.log(`\n[${label}] HTTP ${status}`);
  console.log(JSON.stringify(body, null, 2));
};

const postRemote = async (body) => {
  const response = await fetch(`${remoteUrl}/api/notify-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let parsed;
  try {
    parsed = await response.json();
  } catch {
    parsed = { raw: await response.text().catch(() => '') };
  }

  return { status: response.status, body: parsed };
};

const postLocalHandler = async (body) => {
  const handler = (await import('../api/notify-login.ts')).default;
  const response = await handler(
    new Request('http://127.0.0.1/api/notify-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

  let parsed;
  try {
    parsed = await response.json();
  } catch {
    parsed = { raw: await response.text().catch(() => '') };
  }

  return { status: response.status, body: parsed };
};

const loginImmich = async (email, password) => {
  const base = (process.env.IMMICH_SERVER_URL ?? 'https://immich.gallery-app.pp.ua').replace(/\/$/, '');
  const response = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message ?? payload.error ?? `Login failed (${response.status})`);
  }

  return payload.accessToken;
};

console.log('==> notify-login test');
console.log(`Remote URL: ${remoteUrl}`);
console.log(`IMMICH_SERVER_URL: ${process.env.IMMICH_SERVER_URL ?? '(default)'}`);
console.log(`LOGIN_NOTIFY_ENABLED: ${process.env.LOGIN_NOTIFY_ENABLED ?? '(unset)'}`);
console.log(`ADMIN_NOTIFY_EMAIL: ${process.env.ADMIN_NOTIFY_EMAIL ? '(set)' : '(missing)'}`);
console.log(`RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '(set)' : '(missing)'}`);
console.log(`LOGIN_NOTIFY_FROM: ${process.env.LOGIN_NOTIFY_FROM ? '(set)' : '(missing)'}`);

console.log('\n--- Remote: no token (expect 401 if enabled) ---');
const remoteNoToken = await postRemote({ userAgent: 'test-notify-login/1.0' });
printResult('remote/no-token', remoteNoToken.status, remoteNoToken.body);

const remoteBadToken = await postRemote({
  accessToken: 'invalid-test-token',
  userAgent: 'test-notify-login/1.0',
});
printResult('remote/invalid-token', remoteBadToken.status, remoteBadToken.body);

console.log('\n--- Local handler (production env): no token ---');
const localNoToken = await postLocalHandler({ userAgent: 'test-notify-login/1.0' });
printResult('local/no-token', localNoToken.status, localNoToken.body);

let accessToken = explicitToken?.trim();
if (!accessToken && testEmail && testPassword) {
  console.log('\n--- Immich login (IMMICH_TEST_EMAIL) ---');
  try {
    accessToken = await loginImmich(testEmail, testPassword);
    console.log('Login OK — accessToken received');
  } catch (error) {
    console.error('Login failed:', error.message);
  }
}

if (accessToken) {
  console.log('\n--- Send email test (valid token) ---');
  const remoteOk = await postRemote({
    accessToken,
    userAgent: 'test-notify-login/1.0 (E2E)',
  });
  printResult('remote/valid-token', remoteOk.status, remoteOk.body);

  const localOk = await postLocalHandler({
    accessToken,
    userAgent: 'test-notify-login/1.0 (E2E local handler)',
  });
  printResult('local/valid-token', localOk.status, localOk.body);

  if (remoteOk.body?.sent || localOk.body?.sent) {
    console.log('\n✓ Email sent — check ADMIN_NOTIFY_EMAIL inbox.');
  } else if (remoteOk.status === 502 || localOk.status === 502) {
    console.log('\n✗ Resend rejected — see detail above.');
  }
} else {
  console.log('\n--- Skip E2E email (no token) ---');
  console.log('Provide one of:');
  console.log('  --token <accessToken>');
  console.log('  IMMICH_TEST_EMAIL + IMMICH_TEST_PASSWORD');
  console.log('Or login on site → DevTools → sessionStorage pg_access_token');
}
