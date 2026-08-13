import { getEnv, json, sendViaResend } from './_lib/email';
import { isDeployNotifyEvent, verifyVercelSignature, type VercelDeploymentWebhook } from './_lib/vercel-webhook';

export const config = {
  runtime: 'edge',
};

const isEnabled = (): boolean => getEnv('DEPLOY_NOTIFY_ENABLED') === 'true';

const formatTime = (timestamp?: number): string => {
  const date = timestamp ? new Date(timestamp) : new Date();
  return date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const buildEmailHtml = (options: {
  appName: string;
  status: 'success' | 'error';
  event: VercelDeploymentWebhook;
}): string => {
  const { appName, status, event } = options;
  const payload = event.payload;
  const deployment = payload?.deployment;
  const meta = deployment?.meta ?? {};
  const isSuccess = status === 'success';
  const title = isSuccess ? 'Deploy thành công' : 'Deploy thất bại';
  const accent = isSuccess ? '#15803d' : '#b91c1c';
  const commitMessage = meta.githubCommitMessage ?? meta.gitCommitMessage ?? meta.commitMessage;
  const commitSha = meta.githubCommitSha ?? meta.gitCommitSha ?? meta.commitSha;
  const branch = meta.githubCommitRef ?? meta.gitCommitRef ?? meta.branch;
  const author = meta.githubCommitAuthorName ?? meta.gitCommitAuthorName ?? meta.commitAuthor;
  const deploymentUrl = deployment?.url ? `https://${deployment.url}` : undefined;
  const dashboardUrl = payload?.links?.deployment;
  const target = payload?.target ?? 'preview';
  const errorMessage = payload?.errorMessage;

  const rows: Array<[string, string | undefined]> = [
    ['Dự án', deployment?.name ?? payload?.project?.name],
    ['Môi trường', target],
    ['Deployment ID', deployment?.id],
    ['Thời gian', formatTime(event.createdAt)],
    ['Branch', branch],
    ['Commit', commitSha ? `${commitSha.slice(0, 7)}${commitMessage ? ` — ${commitMessage}` : ''}` : undefined],
    ['Tác giả', author],
    ['URL', deploymentUrl],
    ['Dashboard', dashboardUrl],
  ];

  if (!isSuccess && errorMessage) {
    rows.push(['Lỗi', errorMessage]);
  }

  const tableRows = rows
    .filter(([, value]) => Boolean(value))
    .map(
      ([label, value]) =>
        `<tr><td style="padding: 0.25rem 1rem 0.25rem 0; color: #666; vertical-align: top;">${escapeHtml(label)}</td><td style="word-break: break-word;">${escapeHtml(value ?? '')}</td></tr>`,
    )
    .join('');

  return `
    <div style="font-family: sans-serif; line-height: 1.6; color: #111;">
      <h2 style="margin-bottom: 0.5rem; color: ${accent};">${title}</h2>
      <p style="color: #555; margin-top: 0;">Thông báo deploy từ <strong>${escapeHtml(appName)}</strong></p>
      <table style="border-collapse: collapse; margin: 1rem 0;">${tableRows}</table>
    </div>
  `.trim();
};

/** POST /api/notify-deploy — nhận webhook Vercel và gửi email qua Resend */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!isEnabled()) {
    return json({ ok: true, skipped: true, reason: 'disabled' });
  }

  const webhookSecret = getEnv('DEPLOY_NOTIFY_WEBHOOK_SECRET');
  if (!webhookSecret) {
    return json({ error: 'Deploy notification is not configured' }, 503);
  }

  const adminEmail = getEnv('ADMIN_NOTIFY_EMAIL');
  const fromEmail = getEnv('LOGIN_NOTIFY_FROM') ?? getEnv('DEPLOY_NOTIFY_FROM');
  const appName = getEnv('PUBLIC_APP_NAME') ?? 'Photo Gallery';

  if (!adminEmail || !fromEmail) {
    return json({ error: 'Email notification is not configured' }, 503);
  }

  const rawBody = await request.text();

  if (!(await verifyVercelSignature(request, rawBody, webhookSecret))) {
    return json({ error: 'Invalid webhook signature' }, 403);
  }

  let event: VercelDeploymentWebhook;
  try {
    event = JSON.parse(rawBody) as VercelDeploymentWebhook;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!isDeployNotifyEvent(event.type)) {
    return json({ ok: true, skipped: true, reason: 'ignored_event', type: event.type });
  }

  const status = event.type === 'deployment.succeeded' ? 'success' : 'error';
  const deploymentName = event.payload?.deployment?.name ?? event.payload?.project?.name ?? appName;
  const subjectPrefix = status === 'success' ? 'Deploy OK' : 'Deploy FAIL';

  try {
    await sendViaResend({
      to: adminEmail,
      from: fromEmail,
      subject: `[${appName}] ${subjectPrefix}: ${deploymentName}`,
      html: buildEmailHtml({ appName, status, event }),
    });
  } catch (error) {
    console.error('[notify-deploy]', error);
    return json({ error: 'Failed to send notification email' }, 502);
  }

  return json({ ok: true, type: event.type });
}
