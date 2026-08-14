import { getEnv } from './email.js';

const RESEND_API = 'https://api.resend.com';
const SEGMENT_NAME = 'photo-gallery-changelog';
const TIMEOUT_MS = 5000;

let cachedSegmentId: string | undefined;

const getApiKey = (): string | undefined => getEnv('RESEND_API_KEY');

const fetchResend = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${RESEND_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

const getOrCreateSegmentId = async (): Promise<string> => {
  if (cachedSegmentId) {
    return cachedSegmentId;
  }

  const listed = await fetchResend('/segments');
  if (listed.ok) {
    const payload = (await listed.json()) as { data?: Array<{ id?: string; name?: string }> };
    const existing = payload.data?.find((item) => item.name === SEGMENT_NAME && item.id);
    if (existing?.id) {
      cachedSegmentId = existing.id;
      return existing.id;
    }
  }

  const created = await fetchResend('/segments', {
    method: 'POST',
    body: JSON.stringify({ name: SEGMENT_NAME }),
  });
  if (!created.ok) {
    const detail = await created.text().catch(() => '');
    throw new Error(`Could not create Resend segment (${created.status}) ${detail.slice(0, 160)}`);
  }

  const body = (await created.json()) as { id?: string };
  if (!body.id) {
    throw new Error('Resend segment create returned no id');
  }

  cachedSegmentId = body.id;
  return body.id;
};

export const listResendChangelogEmails = async (): Promise<string[]> => {
  if (!getApiKey()) {
    return [];
  }

  const segmentId = await getOrCreateSegmentId();
  const emails = new Set<string>();

  const bySegment = await fetchResend(`/segments/${segmentId}/contacts?limit=100`);
  if (bySegment.ok) {
    const payload = (await bySegment.json()) as { data?: Array<{ email?: string; unsubscribed?: boolean }> };
    for (const item of payload.data ?? []) {
      if (item.email && item.unsubscribed !== true) {
        emails.add(item.email.trim().toLowerCase());
      }
    }
    return [...emails];
  }

  const all = await fetchResend('/contacts?limit=100');
  if (!all.ok) {
    return [];
  }

  const payload = (await all.json()) as { data?: Array<{ email?: string; unsubscribed?: boolean }> };
  for (const item of payload.data ?? []) {
    if (item.email && item.unsubscribed !== true) {
      emails.add(item.email.trim().toLowerCase());
    }
  }

  return [...emails];
};

export const addResendChangelogEmail = async (email: string): Promise<boolean> => {
  if (!getApiKey()) {
    return false;
  }

  const segmentId = await getOrCreateSegmentId();
  const response = await fetchResend('/contacts', {
    method: 'POST',
    body: JSON.stringify({
      email,
      unsubscribed: false,
      segments: [{ id: segmentId }],
    }),
  });

  if (response.ok) {
    return true;
  }

  const detail = await response.text().catch(() => '');
  if (response.status === 409 || detail.toLowerCase().includes('already')) {
    return true;
  }

  console.error('[resend-contacts] add failed', response.status, detail.slice(0, 200));
  return false;
};

export const removeResendChangelogEmail = async (email: string): Promise<boolean> => {
  if (!getApiKey()) {
    return false;
  }

  const response = await fetchResend(`/contacts/${encodeURIComponent(email)}`, {
    method: 'PATCH',
    body: JSON.stringify({ unsubscribed: true }),
  });

  return response.ok;
};
