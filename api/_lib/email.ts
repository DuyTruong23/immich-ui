export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const getEnv = (key: string): string | undefined => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const dynamic = env?.[key]?.trim();
  if (dynamic) {
    return dynamic;
  }

  // Vercel Edge/bundler chỉ inline process.env.NAME khi tên là literal.
  const literals: Record<string, string | undefined> = {
    RESEND_API_KEY: env?.RESEND_API_KEY,
    BLOB_READ_WRITE_TOKEN: env?.BLOB_READ_WRITE_TOKEN,
    ADMIN_NOTIFY_EMAIL: env?.ADMIN_NOTIFY_EMAIL,
    LOGIN_NOTIFY_FROM: env?.LOGIN_NOTIFY_FROM,
    FEEDBACK_NOTIFY_FROM: env?.FEEDBACK_NOTIFY_FROM,
    PUBLIC_APP_NAME: env?.PUBLIC_APP_NAME,
    VERCEL: env?.VERCEL,
  };

  return literals[key]?.trim() || undefined;
};

export class ResendSendError extends Error {
  readonly status?: number;
  readonly detail?: string;

  constructor(message: string, status?: number, detail?: string) {
    super(message);
    this.name = 'ResendSendError';
    this.status = status;
    this.detail = detail;
  }
};

const parseResendDetail = (raw: string): string | undefined => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed) as { message?: string };
    return parsed.message ?? trimmed;
  } catch {
    return trimmed;
  }
};

const wrapEmailHtml = (html: string): string => `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0; padding:16px; font-family:'Segoe UI',Arial,Helvetica,sans-serif; line-height:1.6; color:#111;">
    ${html}
  </body>
</html>`;

export const sendViaResend = async (options: {
  to: string;
  from: string;
  subject: string;
  html: string;
}): Promise<{ id?: string }> => {
  const apiKey = getEnv('RESEND_API_KEY');
  if (!apiKey) {
    throw new ResendSendError('RESEND_API_KEY is not configured');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        from: options.from,
        to: [options.to],
        subject: options.subject,
        html: wrapEmailHtml(options.html),
      }),
      signal: controller.signal,
    });
  } catch (error) {
    throw new ResendSendError(
      error instanceof Error && error.name === 'AbortError' ? 'Resend request timed out' : 'Resend request failed',
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const detail = parseResendDetail(await response.text());
    throw new ResendSendError(`Resend API error (${response.status})`, response.status, detail);
  }

  try {
    const payload = (await response.json()) as { id?: string };
    return { id: payload.id };
  } catch {
    return {};
  }
};
