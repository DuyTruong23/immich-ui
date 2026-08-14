import { getEnv } from './email.js';

const BLOB_API_URL = 'https://vercel.com/api/blob';
/** Khớp @vercel/blob hiện tại — v7 bị API từ chối pathname. */
const BLOB_API_VERSION = '12';
const DEFAULT_READ_TIMEOUT_MS = 3000;
const DEFAULT_WRITE_TIMEOUT_MS = 8000;

export const getBlobToken = (): string | undefined => getEnv('BLOB_READ_WRITE_TOKEN');

export const parseBlobStoreId = (token: string): string | undefined => {
  const parts = token.split('_');
  if (parts[0] === 'vercel' && parts[1] === 'blob' && parts[2] === 'rw' && parts[3]) {
    return parts[3];
  }

  return undefined;
};

export const privateBlobFileUrl = (pathname: string, token: string): string | undefined => {
  const storeId = parseBlobStoreId(token);
  return storeId ? `https://${storeId}.private.blob.vercel-storage.com/${pathname}` : undefined;
};

const fetchWithTimeout = async (url: string, init: RequestInit, ms: number): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const blobHeaders = (token: string, extra?: Record<string, string>): Record<string, string> => {
  const storeId = parseBlobStoreId(token) ?? '';
  return {
    authorization: `Bearer ${token}`,
    'x-api-version': BLOB_API_VERSION,
    'x-vercel-blob-store-id': storeId,
    'x-api-blob-request-id': `${storeId}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
    ...extra,
  };
};

/** Giữ `/` thật trong query — URLSearchParams đổi thành %2F và API trả Invalid pathname. */
const blobPutUrl = (pathname: string): string => {
  const encoded = pathname
    .split('/')
    .filter((part) => part.length > 0)
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${BLOB_API_URL}?pathname=${encoded}`;
};

export const flattenBlobPathname = (pathname: string): string => pathname.replaceAll('/', '-');

export const blobPathnameCandidates = (pathname: string): string[] => {
  const flat = flattenBlobPathname(pathname);
  return flat === pathname ? [pathname] : [pathname, flat];
};

export const listBlobs = async (
  prefix: string,
  options?: { limit?: number; timeoutMs?: number },
): Promise<Array<{ pathname?: string; url?: string }>> => {
  const token = getBlobToken();
  if (!token) {
    return [];
  }

  const params = new URLSearchParams({
    prefix,
    limit: String(options?.limit ?? 20),
  });
  const response = await fetchWithTimeout(
    `${BLOB_API_URL}?${params.toString()}`,
    { headers: blobHeaders(token) },
    options?.timeoutMs ?? DEFAULT_READ_TIMEOUT_MS,
  );

  if (!response.ok) {
    return [];
  }

  const listed = (await response.json()) as { blobs?: Array<{ pathname?: string; url?: string }> };
  return listed.blobs ?? [];
};

export const readBlobJson = async <T>(
  url: string,
  token: string,
  options?: { timeoutMs?: number },
): Promise<{ ok: true; status: number; value: T } | { ok: false; status: number }> => {
  const response = await fetchWithTimeout(
    url,
    {
      cache: 'no-store',
      headers: { authorization: `Bearer ${token}` },
    },
    options?.timeoutMs ?? DEFAULT_READ_TIMEOUT_MS,
  );

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  return { ok: true, status: response.status, value: (await response.json()) as T };
};

const putOnce = async (
  token: string,
  pathname: string,
  payload: string,
  options?: { access?: 'public' | 'private'; timeoutMs?: number },
): Promise<Response> =>
  fetchWithTimeout(
    blobPutUrl(pathname),
    {
      method: 'PUT',
      headers: blobHeaders(token, {
        'x-content-type': 'application/json',
        'x-add-random-suffix': '0',
        'x-allow-overwrite': '1',
        'x-vercel-blob-access': options?.access ?? 'private',
      }),
      body: payload,
    },
    options?.timeoutMs ?? DEFAULT_WRITE_TIMEOUT_MS,
  );

export const putBlobJson = async (
  pathname: string,
  body: unknown,
  options?: { access?: 'public' | 'private'; timeoutMs?: number },
): Promise<void> => {
  const token = getBlobToken();
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }

  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  let response = await putOnce(token, pathname, payload, options);
  if (response.ok) {
    return;
  }

  const detail = await response.text().catch(() => '');
  const retryFlat =
    response.status === 400 &&
    detail.includes('Invalid pathname') &&
    pathname.includes('/');

  if (retryFlat) {
    response = await putOnce(token, flattenBlobPathname(pathname), payload, options);
    if (response.ok) {
      return;
    }

    const retryDetail = await response.text().catch(() => '');
    throw new Error(
      `Blob put failed (${response.status})${retryDetail ? `: ${retryDetail.slice(0, 200)}` : ''}`,
    );
  }

  throw new Error(`Blob put failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`);
};
