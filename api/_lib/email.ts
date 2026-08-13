export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const getEnv = (key: string): string | undefined => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.[key]?.trim() || undefined;
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

export const sendViaResend = async (options: {
  to: string;
  from: string;
  subject: string;
  html: string;
}): Promise<void> => {
  const apiKey = getEnv('RESEND_API_KEY');
  if (!apiKey) {
    throw new ResendSendError('RESEND_API_KEY is not configured');
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
    const detail = parseResendDetail(await response.text());
    throw new ResendSendError(`Resend API error (${response.status})`, response.status, detail);
  }
};
