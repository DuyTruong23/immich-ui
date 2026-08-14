import { getEnv, sendViaResend } from './email.js';
import type { PartnerFavoriteUser } from './partner-favorites-store.js';

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const resolveAppUrl = (): string => {
  const explicit = getEnv('PUBLIC_APP_URL');
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const vercelHost = getEnv('VERCEL_PROJECT_PRODUCTION_URL');
  return vercelHost ? `https://${vercelHost.replace(/\/$/, '')}` : '';
};

const buildEmailHtml = (options: {
  appName: string;
  appUrl: string;
  actor: PartnerFavoriteUser;
  bothFavorited: boolean;
}): string => {
  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const link = options.appUrl
    ? `<p style="margin: 1.25rem 0 0;"><a href="${escapeHtml(`${options.appUrl}/shared-favorites`)}" style="color: #1565c0;">Xem ảnh yêu thích chung</a></p>`
    : '';
  const bothNote = options.bothFavorited
    ? `<p style="margin: 0.75rem 0 0; color: #b91c1c;"><strong>Cả hai đều đã thích ảnh này.</strong></p>`
    : '';

  return `
    <div style="line-height: 1.6; color: #111;">
      <h2 style="margin-bottom: 0.35rem;">${escapeHtml(options.actor.name)} vừa thích một ảnh</h2>
      <p style="color: #555; margin-top: 0;">Thông báo từ <strong>${escapeHtml(options.appName)}</strong></p>
      <table style="border-collapse: collapse; margin: 1rem 0;">
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Người thích</td><td><strong>${escapeHtml(options.actor.name)}</strong></td></tr>
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Email</td><td>${escapeHtml(options.actor.email)}</td></tr>
        <tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666;">Thời gian</td><td>${time}</td></tr>
      </table>
      ${bothNote}
      ${link}
    </div>
  `.trim();
};

export const notifyPartnerFavorite = async (options: {
  actor: PartnerFavoriteUser;
  recipients: PartnerFavoriteUser[];
  bothFavorited: boolean;
}): Promise<{ sent: number; skipped: boolean; reason?: string }> => {
  const fromEmail = getEnv('LOGIN_NOTIFY_FROM') ?? getEnv('FEEDBACK_NOTIFY_FROM');
  const appName = getEnv('PUBLIC_APP_NAME') ?? 'WeGallery';
  const appUrl = resolveAppUrl();

  if (!getEnv('RESEND_API_KEY') || !fromEmail) {
    return { sent: 0, skipped: true, reason: 'email_not_configured' };
  }

  const actorEmail = options.actor.email.trim().toLowerCase();
  const unique = new Map<string, PartnerFavoriteUser>();
  for (const recipient of options.recipients) {
    const email = recipient.email.trim().toLowerCase();
    if (!email || email === actorEmail) {
      continue;
    }
    unique.set(email, recipient);
  }

  if (unique.size === 0) {
    return { sent: 0, skipped: true, reason: 'no_recipients' };
  }

  const html = buildEmailHtml({
    appName,
    appUrl,
    actor: options.actor,
    bothFavorited: options.bothFavorited,
  });

  let sent = 0;
  for (const recipient of unique.values()) {
    try {
      await sendViaResend({
        to: recipient.email,
        from: fromEmail,
        subject: `[${appName}] ${options.actor.name} vừa thích một ảnh`,
        html,
      });
      sent += 1;
    } catch (error) {
      console.error('[partner-favorite-notify]', recipient.email, error);
    }
  }

  return { sent, skipped: sent === 0, reason: sent === 0 ? 'send_failed' : undefined };
};
