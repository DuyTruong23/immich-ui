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

type NotifyBody = {
  userAgent?: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const getEnv = (key: string): string | undefined => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.[key]?.trim() || undefined;
};

const isEnabled = (): boolean => getEnv('LOGIN_NOTIFY_ENABLED') === 'true';

const getUpstreamBase = (): string => (getEnv('IMMICH_SERVER_URL') ?? DEFAULT_UPSTREAM).replace(/\/$/, '');

const verifySession = async (request: Request): Promise<ImmichUser | null> => {
  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return null;
  }

  const response = await fetch(`${getUpstreamBase()}/api/users/me`, {
    headers: { cookie },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as ImmichUser;
};

const sendViaResend = async (options: {
  to: string;
  from: string;
  subject: string;
  html: string;
}): Promise<void> => {
  const apiKey = getEnv('RESEND_API_KEY');
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: options.from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend API error (${response.status}): ${detail}`);
  }
};

const buildEmailHtml = (user: ImmichUser, userAgent: string | undefined, appName: string): string => {
  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const role = user.isAdmin ? 'Admin' : 'User';

  return `
    <div style="font-family: sans-serif; line-height: 1.6; color: #111;">
      <h2 style="margin-bottom: 0.5rem;">Có người dùng vừa đăng nhập</h2>
      <p style="color: #555; margin-top: 0;">Thông báo từ <strong>${appName}</strong></p>
      <table style="border-collapse: collapse; margin: 1rem 0;">
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Tên</td><td><strong>${user.name}</strong></td></tr>
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Email</td><td>${user.email}</td></tr>
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Vai trò</td><td>${role}</td></tr>
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Thời gian</td><td>${time}</td></tr>
        ${userAgent ? `<tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Thiết bị</td><td style="font-size: 0.875rem;">${userAgent}</td></tr>` : ''}
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
  const appName = getEnv('PUBLIC_APP_NAME') ?? 'Photo Gallery';
  const skipAdmin = getEnv('LOGIN_NOTIFY_SKIP_ADMIN') !== 'false';

  if (!adminEmail || !fromEmail) {
    return json({ error: 'Email notification is not configured' }, 503);
  }

  const user = await verifySession(request);
  if (!user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  if (skipAdmin && user.isAdmin) {
    return json({ ok: true, skipped: true, reason: 'admin_login' });
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

  try {
    await sendViaResend({
      to: adminEmail,
      from: fromEmail,
      subject: `[${appName}] Đăng nhập: ${user.name} (${user.email})`,
      html: buildEmailHtml(user, body.userAgent, appName),
    });
  } catch (error) {
    console.error('[notify-login]', error);
    return json({ error: 'Failed to send notification email' }, 502);
  }

  return json({ ok: true });
}
