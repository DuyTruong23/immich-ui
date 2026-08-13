import { getEnv, json, sendViaResend } from './_lib/email';

export const config = {
  runtime: 'edge',
};

const DEFAULT_UPSTREAM = 'https://immich.gallery-app.pp.ua';

type ImmichUser = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

type FeedbackBody = {
  message?: string;
  userAgent?: string;
  accessToken?: string;
};

const isEnabled = (): boolean => getEnv('FEEDBACK_ENABLED') === 'true';

const getUpstreamBase = (): string => (getEnv('IMMICH_SERVER_URL') ?? DEFAULT_UPSTREAM).replace(/\/$/, '');

const verifySession = async (accessToken?: string): Promise<ImmichUser | null> => {
  const token = accessToken?.trim();
  if (!token) {
    return null;
  }

  const response = await fetch(`${getUpstreamBase()}/api/users/me`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as ImmichUser;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const buildEmailHtml = (options: {
  appName: string;
  message: string;
  user: ImmichUser | null;
  userAgent?: string;
}): string => {
  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  return `
    <div style="font-family: sans-serif; line-height: 1.6; color: #111;">
      <h2 style="margin-bottom: 0.5rem;">Đóng góp ý kiến mới</h2>
      <p style="color: #555; margin-top: 0;">Từ <strong>${escapeHtml(options.appName)}</strong></p>
      <table style="border-collapse: collapse; margin: 1rem 0;">
        ${
          options.user
            ? `<tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Người gửi</td><td><strong>${escapeHtml(options.user.name)}</strong> (${escapeHtml(options.user.email)})</td></tr>`
            : ''
        }
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Thời gian</td><td>${time}</td></tr>
        ${
          options.userAgent
            ? `<tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Thiết bị</td><td style="font-size: 0.875rem;">${escapeHtml(options.userAgent)}</td></tr>`
            : ''
        }
      </table>
      <p style="white-space: pre-wrap; background: #f5f5f5; padding: 1rem; border-radius: 0.5rem;">${escapeHtml(options.message)}</p>
    </div>
  `.trim();
};

/** POST /api/feedback — gửi ý kiến user tới admin qua Resend */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!isEnabled()) {
    return json({ ok: true, skipped: true, reason: 'disabled' });
  }

  const adminEmail = getEnv('ADMIN_NOTIFY_EMAIL');
  const fromEmail = getEnv('LOGIN_NOTIFY_FROM') ?? getEnv('FEEDBACK_NOTIFY_FROM');
  const appName = getEnv('PUBLIC_APP_NAME') ?? 'Photo Gallery';

  if (!adminEmail || !fromEmail) {
    return json({ error: 'Feedback notification is not configured' }, 503);
  }

  let body: FeedbackBody = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text) as FeedbackBody;
    }
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const message = body.message?.trim();
  if (!message) {
    return json({ error: 'Message is required' }, 400);
  }

  const user = await verifySession(body.accessToken);

  try {
    await sendViaResend({
      to: adminEmail,
      from: fromEmail,
      subject: `[${appName}] Góp ý${user ? `: ${user.name}` : ''}`,
      html: buildEmailHtml({
        appName,
        message,
        user,
        userAgent: body.userAgent,
      }),
    });
  } catch (error) {
    console.error('[feedback]', error);
    return json({ error: 'Failed to send feedback email' }, 502);
  }

  return json({ ok: true });
}
