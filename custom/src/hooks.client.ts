import { isServerConnectionError, isStaleChunkError } from '$custom/utils/server-connection-error';
import { isHttpError, type ApiHttpError } from '@immich/sdk';
import type { HandleClientError } from '@sveltejs/kit';

function isImmutableAssetUrl(url: string | undefined): boolean {
  return Boolean(url && url.includes('/_app/immutable/'));
}

function noteStaleChunk(reason: string) {
  console.warn('[stale-chunk] skip reload to keep user session:', reason);
}

function isAssetViewerOpen() {
  return Boolean(document.getElementById('immich-asset-viewer'));
}

function lockBrowserPageZoom() {
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta) {
    meta.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
    );
  }

  const blockBrowserZoom = (event: Event) => {
    if (isAssetViewerOpen()) {
      return;
    }
    event.preventDefault();
  };

  document.addEventListener('gesturestart', blockBrowserZoom, { passive: false });
  document.addEventListener('gesturechange', blockBrowserZoom, { passive: false });
  document.addEventListener('gestureend', blockBrowserZoom, { passive: false });

  document.addEventListener(
    'touchmove',
    (event) => {
      if (event.touches.length > 1 && !isAssetViewerOpen()) {
        event.preventDefault();
      }
    },
    { passive: false },
  );
}

if (typeof window !== 'undefined') {
  const bootUrl = new URL(location.href);
  if (bootUrl.searchParams.has('_pg')) {
    bootUrl.searchParams.delete('_pg');
    history.replaceState(history.state, '', `${bootUrl.pathname}${bootUrl.search}${bootUrl.hash}`);
  }

  lockBrowserPageZoom();

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    noteStaleChunk('vite:preloadError');
  });

  window.addEventListener(
    'error',
    (event) => {
      const target = event.target;
      if (target instanceof HTMLScriptElement && isImmutableAssetUrl(target.src)) {
        event.preventDefault();
        noteStaleChunk(target.src);
        return;
      }

      if (target instanceof HTMLLinkElement && isImmutableAssetUrl(target.href)) {
        event.preventDefault();
        noteStaleChunk(target.href);
        return;
      }

      if (isStaleChunkError(event.error)) {
        noteStaleChunk(String(event.error));
      }
    },
    true,
  );

  window.addEventListener('unhandledrejection', (event) => {
    if (!isStaleChunkError(event.reason)) {
      return;
    }
    event.preventDefault();
    noteStaleChunk(String(event.reason));
  });

  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) {
      return;
    }
    void restoreAfterBfcache();
  });
}

async function restoreAfterBfcache() {
  try {
    const { authManager } = await import('$lib/managers/auth-manager.svelte');
    const { resumeWebsocketAfterBfcache } = await import('$lib/stores/websocket');

    if (authManager.authenticated) {
      await authManager.ensureMediaSessionKey();
    } else {
      await authManager.load();
    }

    resumeWebsocketAfterBfcache();
  } catch (error) {
    console.warn('[bfcache] restore failed', error);
  }
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
    console.warn('[stale-chunk] skip reload to keep user session:', result.message);
    return result;
  }

  if (isServerConnectionError({ ...result, code: result.code })) {
    console.error(`[server-connection-error] HTTP ${result.code}:`, result.message, error);
  } else {
    console.error(`[hooks.client.ts]:handleError ${result.message}`, error);
  }

  return result;
};
