import { isServerConnectionError, isStaleChunkError } from '$custom/utils/server-connection-error';
import { isHttpError, type ApiHttpError } from '@immich/sdk';
import type { HandleClientError } from '@sveltejs/kit';

const STALE_CHUNK_RELOAD_KEY = 'pg-stale-chunk-reload';
const STALE_CHUNK_RELOAD_WINDOW_MS = 10_000;

function reloadOnceForStaleChunk(): boolean {
  try {
    const last = Number(sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY) ?? '0');
    const now = Date.now();
    if (last && now - last < STALE_CHUNK_RELOAD_WINDOW_MS) {
      return false;
    }
    sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, String(now));
  } catch {
    // sessionStorage unavailable — still try a one-shot reload
  }

  location.reload();
  return true;
}

if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadOnceForStaleChunk();
  });
}

const DEFAULT_MESSAGE = 'Hmm, not sure about that. Check the logs or open a ticket?';

const parseHTTPError = (httpError: ApiHttpError) => {
  const statusCode = httpError?.status || httpError?.data?.statusCode || 500;
  const message = httpError?.data?.message || (httpError?.data && String(httpError.data)) || httpError?.message;

  console.log({
    status: statusCode,
    response: httpError?.data || 'No data',
  });

  return {
    message: message || DEFAULT_MESSAGE,
    code: statusCode,
    stack: httpError?.stack,
  };
};

const parseError = (error: unknown, status: number, message: string) => {
  if (isHttpError(error)) {
    return parseHTTPError(error);
  }

  return {
    message: (error as Error)?.message || message || DEFAULT_MESSAGE,
    code: status,
  };
};

export const handleError: HandleClientError = ({ error, status, message }) => {
  const result = parseError(error, status, message);

  if (isStaleChunkError(error) || isStaleChunkError(result)) {
    console.warn('[stale-chunk] Reloading after missing JS chunk:', result.message);
    reloadOnceForStaleChunk();
    return result;
  }

  if (isServerConnectionError({ ...result, code: result.code })) {
    console.error(`[server-connection-error] HTTP ${result.code}:`, result.message, error);
  } else {
    console.error(`[hooks.client.ts]:handleError ${result.message}`, error);
  }

  return result;
};
