import { getEnv, json, sendViaResend } from './_lib/email.js';
import {
  verifyAdminSession,
  verifyAdminSessionFromRequest,
  verifySession,
  type ImmichUser,
} from './_lib/immich-auth.js';
import {
  addFeatureUpdateSubscriber,
  getSubscriberStorage,
  isValidNotifyEmail,
  readFeatureUpdateSubscribers,
  removeFeatureUpdateSubscriber,
} from './_lib/feature-update-subscribers.js';

export const config = {
  runtime: 'edge',
};

type SubscribeBody = {
  email?: string;
  previousEmail?: string;
  accessToken?: string;
  version?: string;
  unsubscribe?: boolean;
  list?: boolean;
};

type SubscriberChange = 'added' | 'changed' | 'removed';

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

const notifyAdminSubscriberChange = async (options: {
  action: SubscriberChange;
  email: string;
  previousEmail?: string;
  user?: ImmichUser | null;
}): Promise<void> => {
  const adminEmail = getEnv('ADMIN_NOTIFY_EMAIL');
  const fromEmail = getEnv('LOGIN_NOTIFY_FROM') ?? getEnv('FEEDBACK_NOTIFY_FROM');
  const appName = getEnv('PUBLIC_APP_NAME') ?? 'WeGallery';

  if (!adminEmail || !fromEmail || !getEnv('RESEND_API_KEY')) {
    return;
  }

  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const titles: Record<SubscriberChange, string> = {
    added: 'User đăng ký nhận changelog',
    changed: 'User đổi email nhận changelog',
    removed: 'User hủy nhận changelog',
  };
  const subjects: Record<SubscriberChange, string> = {
    added: `Email nhận thông báo mới: ${options.email}`,
    changed: `Đổi email nhận thông báo: ${options.previousEmail} → ${options.email}`,
    removed: `Hủy email nhận thông báo: ${options.email}`,
  };
  const accountRow = options.user
    ? `<tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Tài khoản</td><td>${escapeHtml(options.user.name)} (${escapeHtml(options.user.email)})</td></tr>`
    : '';
  const previousRow =
    options.action === 'changed' && options.previousEmail
      ? `<tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Email trước đó</td><td>${escapeHtml(options.previousEmail)}</td></tr>`
      : '';
  const emailLabel = options.action === 'removed' ? 'Email đã hủy' : 'Email nhận thông báo';

  await sendViaResend({
    to: adminEmail,
    from: fromEmail,
    subject: `[${appName}] ${subjects[options.action]}`,
    html: `
      <div style="line-height: 1.6; color: #111;">
        <h2 style="margin-bottom: 0.5rem;">${titles[options.action]}</h2>
        <p style="color: #555; margin-top: 0;">Từ <strong>${escapeHtml(appName)}</strong></p>
        <table style="border-collapse: collapse; margin: 1rem 0;">
          <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">${emailLabel}</td><td><strong>${escapeHtml(options.email)}</strong></td></tr>
          ${previousRow}
          ${accountRow}
          <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Thời gian</td><td>${time}</td></tr>
        </table>
      </div>
    `.trim(),
  });
};

const queueAdminNotify = (options: {
  action: SubscriberChange;
  email: string;
  previousEmail?: string;
  user?: ImmichUser | null;
}): void => {
  void notifyAdminSubscriberChange(options).catch((error) => {
    console.error('[feature-update-email] admin notify failed', error);
  });
};

const resolveAdmin = async (request: Request, accessToken?: string): Promise<ImmichUser | null> => {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const token = bearer || accessToken?.trim() || undefined;
  const cookie = request.headers.get('cookie') ?? undefined;

  return (
    (await verifyAdminSession(token, cookie)) ?? (await verifyAdminSessionFromRequest(request, token))
  );
};

const listResponse = async (request: Request, accessToken?: string): Promise<Response> => {
  const admin = await resolveAdmin(request, accessToken);
  if (!admin) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const storage = getSubscriberStorage();
  try {
    const store = await readFeatureUpdateSubscribers();
    return json({
      ok: true,
      emails: store.emails,
      count: store.emails.length,
      lastNotifiedVersion: store.lastNotifiedVersion ?? null,
      source: 'modal',
      storage,
    });
  } catch (error) {
    console.error('[feature-update-email] list failed', error);
    return json(
      {
        error: 'Could not load subscribers',
        detail: error instanceof Error ? error.message : 'Unknown error',
        storage,
      },
      502,
    );
  }
};

const unsubscribeResponse = async (
  email: string,
  options?: { accessToken?: string; cookie?: string },
): Promise<Response> => {
  if (!isValidNotifyEmail(email)) {
    return json({ error: 'Valid email is required' }, 400);
  }

  try {
    const removed = await removeFeatureUpdateSubscriber(email);
    if (removed) {
      const user = await verifySession(options?.accessToken, options?.cookie);
      queueAdminNotify({ action: 'removed', email, user });
    }

    return json({ ok: true, unsubscribed: removed });
  } catch (error) {
    console.error('[feature-update-email] unsubscribe failed', error);
    return json(
      {
        error: 'Could not update subscription',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      503,
    );
  }
};

/** GET/POST /api/feature-update-email — đăng ký, list admin, hoặc hủy email changelog */
export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    if (url.searchParams.get('unsubscribe') === '1') {
      return unsubscribeResponse(url.searchParams.get('email') ?? '', {
        accessToken: url.searchParams.get('accessToken') ?? undefined,
        cookie: request.headers.get('cookie') ?? undefined,
      });
    }

    if (url.searchParams.get('list') === '1') {
      return listResponse(request, url.searchParams.get('accessToken') ?? undefined);
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

  if (body.list) {
    return listResponse(request, body.accessToken);
  }

  const email = body.email ?? '';
  const cookie = request.headers.get('cookie') ?? undefined;
  if (body.unsubscribe) {
    return unsubscribeResponse(email, { accessToken: body.accessToken, cookie });
  }

  if (!isValidNotifyEmail(email)) {
    return json({ error: 'Valid email is required' }, 400);
  }

  const user = await verifySession(body.accessToken, cookie);
  if (!user) {
    return json({ error: 'Authentication required' }, 401);
  }

  const previousEmail = body.previousEmail?.trim() ?? '';
  const isChange = isValidNotifyEmail(previousEmail) && previousEmail.toLowerCase() !== email.trim().toLowerCase();

  try {
    if (isChange) {
      await removeFeatureUpdateSubscriber(previousEmail);
    }

    const result = await addFeatureUpdateSubscriber(email, body.version);
    if (!result.persisted) {
      return json(
        {
          error: 'Could not save subscription',
          detail: 'BLOB_READ_WRITE_TOKEN is not configured',
        },
        503,
      );
    }

    if (isChange) {
      queueAdminNotify({ action: 'changed', email, previousEmail, user });
    } else if (result.added) {
      queueAdminNotify({ action: 'added', email, user });
    }

    return json({ ok: true, added: result.added, changed: isChange, persisted: true });
  } catch (error) {
    console.error('[feature-update-email] save failed', error);
    return json(
      {
        error: 'Could not save subscription',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      503,
    );
  }
}
