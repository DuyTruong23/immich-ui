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
<div style="max-width: 520px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); color: #1f2937;">
  
  <!-- Header Card -->
  <div style="padding: 20px 24px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
    <div style="font-size: 13px; font-weight: 600; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
      Thông báo hệ thống
    </div>
    <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #111827; line-height: 1.3;">
      ${escapeHtml(user.name)} vừa đăng nhập
    </h2>
  </div>

  <!-- Content Body -->
  <div style="padding: 20px 24px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 8px 0; color: #6b7280; width: 100px; vertical-align: top;">Họ và tên</td>
        <td style="padding: 8px 0; font-weight: 600; color: #111827;">${escapeHtml(user.name)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">Email</td>
        <td style="padding: 8px 0;">
          <a href="mailto:${escapeHtml(user.email)}" style="color: #2563eb; text-decoration: none; font-weight: 500;">
            ${escapeHtml(user.email)}
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">Vai trò</td>
        <td style="padding: 8px 0;">
          <span style="display: inline-block; padding: 2px 10px; background-color: #e0e7ff; color: #3730a3; font-size: 12px; font-weight: 600; border-radius: 9999px;">
            ${role}
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">Thời gian</td>
        <td style="padding: 8px 0; color: #374151;">${time}</td>
      </tr>
      ${userAgent ? `
      <tr>
        <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">Thiết bị</td>
        <td style="padding: 8px 0;">
          <div style="background-color: #f3f4f6; padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #4b5563; word-break: break-all; line-height: 1.4;">
            ${escapeHtml(userAgent)}
          </div>
        </td>
      </tr>
      ` : ''}
    </table>
  </div>

</div>`.trim();
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
      subject: `[${appName}] ${user.name} đã đăng nhập`,
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
