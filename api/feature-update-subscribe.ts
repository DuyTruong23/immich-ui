import { getEnv, json, sendViaResend } from './_lib/email.js';
import { verifyAdminSession, verifySession, type ImmichUser } from './_lib/immich-auth.js';
import {
  addFeatureUpdateSubscriber,
  isValidNotifyEmail,
  readFeatureUpdateSubscribers,
  removeFeatureUpdateSubscriber,
} from './_lib/feature-update-subscribers.js';

export const config = {
  runtime: 'edge',
};

type SubscribeBody = {
  email?: string;
  accessToken?: string;
  version?: string;
  unsubscribe?: boolean;
};

const parseBody = async (request: Request): Promise<SubscribeBody | null> => {
  try {
    const text = await request.text();
    if (!text) {
      return {};
    }

    return JSON.parse(text) as SubscribeBody;
  } catch {
    return null;
  }
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const notifyAdminNewSubscriber = async (email: string, user: ImmichUser): Promise<void> => {
  const adminEmail = getEnv('ADMIN_NOTIFY_EMAIL');
  const fromEmail = getEnv('LOGIN_NOTIFY_FROM') ?? getEnv('FEEDBACK_NOTIFY_FROM');
  const appName = getEnv('PUBLIC_APP_NAME') ?? 'Photo Gallery';

  if (!adminEmail || !fromEmail || !getEnv('RESEND_API_KEY')) {
    return;
  }

  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  await sendViaResend({
    to: adminEmail,
    from: fromEmail,
    subject: `[${appName}] Email nhận thông báo mới: ${email}`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #111;">
        <h2 style="margin-bottom: 0.5rem;">User đăng ký nhận changelog</h2>
        <p style="color: #555; margin-top: 0;">Từ <strong>${escapeHtml(appName)}</strong></p>
        <table style="border-collapse: collapse; margin: 1rem 0;">
          <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Email nhận thông báo</td><td><strong>${escapeHtml(email)}</strong></td></tr>
          <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Tài khoản</td><td>${escapeHtml(user.name)} (${escapeHtml(user.email)})</td></tr>
          <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Thời gian</td><td>${time}</td></tr>
        </table>
      </div>
    `.trim(),
  });
};

const unsubscribeResponse = async (email: string): Promise<Response> => {
  if (!isValidNotifyEmail(email)) {
    return json({ error: 'Valid email is required' }, 400);
  }

  try {
    const removed = await removeFeatureUpdateSubscriber(email);
    return json({ ok: true, unsubscribed: removed });
  } catch (error) {
    console.error('[feature-update-subscribe] unsubscribe failed', error);
    return json(
      {
        error: 'Could not update subscription',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      503,
    );
  }
};

/** GET/POST /api/feature-update-subscribe — đăng ký hoặc hủy email changelog */
export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    if (url.searchParams.get('unsubscribe') === '1') {
      return unsubscribeResponse(url.searchParams.get('email') ?? '');
    }

    if (url.searchParams.get('list') === '1') {
      const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
      const admin = await verifyAdminSession(
        bearer || url.searchParams.get('accessToken') || undefined,
        request.headers.get('cookie') ?? undefined,
      );
      if (!admin) {
        return json({ error: 'Unauthorized' }, 401);
      }

      try {
        const store = await readFeatureUpdateSubscribers();
        return json({
          ok: true,
          emails: store.emails,
          count: store.emails.length,
          lastNotifiedVersion: store.lastNotifiedVersion ?? null,
        });
      } catch (error) {
        console.error('[feature-update-subscribe] list failed', error);
        return json(
          {
            error: 'Could not load subscribers',
            detail: error instanceof Error ? error.message : 'Unknown error',
          },
          503,
        );
      }
    }

    return json({ error: 'Method not allowed' }, 405);
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const body = await parseBody(request);
  if (!body) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const email = body.email ?? '';
  if (body.unsubscribe) {
    return unsubscribeResponse(email);
  }

  if (!isValidNotifyEmail(email)) {
    return json({ error: 'Valid email is required' }, 400);
  }

  const user = await verifySession(body.accessToken, request.headers.get('cookie') ?? undefined);
  if (!user) {
    return json({ error: 'Authentication required' }, 401);
  }

  try {
    const result = await addFeatureUpdateSubscriber(email, body.version);
    if (result.added) {
      await notifyAdminNewSubscriber(email, user).catch((error) => {
        console.error('[feature-update-subscribe] admin notify failed', error);
      });
    }

    return json({ ok: true, added: result.added, persisted: result.persisted });
  } catch (error) {
    console.error('[feature-update-subscribe] subscribe failed', error);
    await notifyAdminNewSubscriber(email, user).catch((notifyError) => {
      console.error('[feature-update-subscribe] admin notify failed', notifyError);
    });
    return json({ ok: true, added: true, persisted: false });
  }
}
