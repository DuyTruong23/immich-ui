import { getEnv, json, ResendSendError, sendViaResend } from './_lib/email.js';
import { verifySession } from './_lib/immich-auth.js';

export const config = {
  runtime: 'edge',
};

type NotifyBody = {
  userAgent?: string;
  accessToken?: string;
};

const isEnabled = (): boolean => {
  const value = getEnv('LOGIN_NOTIFY_ENABLED')?.toLowerCase();
  return value === 'true' || value === '1';
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const buildEmailHtml = (user: { name: string; email: string; isAdmin: boolean }, userAgent: string | undefined, appName: string): string => {
  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const role = user.isAdmin ? 'Admin' : 'User';

  return `
    <div style="line-height: 1.6; color: #111;">
      <h2 style="margin-bottom: 0.5rem;">Có người dùng vừa đăng nhập</h2>
      <p style="color: #555; margin-top: 0;">Thông báo từ <strong>${escapeHtml(appName)}</strong></p>
      <table style="border-collapse: collapse; margin: 1rem 0;">
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Tên</td><td><strong>${escapeHtml(user.name)}</strong></td></tr>
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Email</td><td>${escapeHtml(user.email)}</td></tr>
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Vai trò</td><td>${role}</td></tr>
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Thời gian</td><td>${time}</td></tr>
        ${userAgent ? `<tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Thiết bị</td><td style="font-size: 0.875rem;">${escapeHtml(userAgent)}</td></tr>` : ''}
      </table>
    </div>
  `.trim();
};

/** POST /api/notify-login — gửi email cho admin sau khi xác minh session Immich */
export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!isEnabled()) {
    return json({ ok: true, skipped: true, reason: 'disabled' });
  }

  const adminEmail = getEnv('ADMIN_NOTIFY_EMAIL');
  const fromEmail = getEnv('LOGIN_NOTIFY_FROM');
  const appName = getEnv('PUBLIC_APP_NAME') ?? 'WeGallery';

  if (!adminEmail || !fromEmail) {
    return json({ error: 'Email notification is not configured' }, 503);
  }

  let body: NotifyBody = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text) as NotifyBody;
    }
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const user = await verifySession(body.accessToken, request.headers.get('cookie') ?? undefined);
  if (!user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const sent = await sendViaResend({
      to: adminEmail,
      from: fromEmail,
      subject: `[${appName}] Đăng nhập: ${user.name} (${user.email})`,
      html: buildEmailHtml(user, body.userAgent, appName),
    });

    return json({ ok: true, sent: true, emailId: sent.id });
  } catch (error) {
    console.error('[notify-login]', error);

    if (error instanceof ResendSendError) {
      const reason =
        error.message === 'RESEND_API_KEY is not configured'
          ? 'missing_resend_api_key'
          : 'resend_rejected';

      return json(
        {
          error: 'Failed to send notification email',
          reason,
          detail: error.detail ?? error.message,
        },
        502,
      );
    }

    return json({ error: 'Failed to send notification email', reason: 'unexpected' }, 502);
  }
}
