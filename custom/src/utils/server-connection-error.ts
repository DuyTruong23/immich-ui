import { isHttpError } from '@immich/sdk';

const CONNECTION_ERROR_PATTERN =
  /\b(bad gateway|service unavailable|gateway timeout|failed to fetch|network error|econnrefused|err_connection_refused|aggregateerror)\b/i;

const STALE_CHUNK_PATTERN =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|error loading chunk/i;

export const SERVER_CONNECTION_DISPLAY_CODE = 505;

export const SERVER_CONNECTION_MESSAGE =
  'Cảm ơn bạn đã ghé thăm, chúng tôi sẽ quay lại vào 17:30 ngày 13/8/2026.';

export interface ServerConnectionErrorData {
  message: string;
  code: number;
  stack?: string;
  serverConnectionError: true;
}

function isServerErrorStatus(status: number | undefined): boolean {
  return status !== undefined && status >= 500 && status < 600;
}

function isServerConnectionStatus(status: number | undefined): boolean {
  return status === 404 || isServerErrorStatus(status);
}

function readErrorStatus(error: unknown): number | undefined {
  if (isHttpError(error)) {
    return error.status || error.data?.statusCode;
  }

  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = Number((error as { code?: string | number }).code);
    return Number.isFinite(code) ? code : undefined;
  }

  const match = readErrorText(error).match(/\b(404|[5][0-9]{2})\b/);
  return match ? Number(match[1]) : undefined;
}

function readErrorText(error: unknown): string {
  if (error instanceof Error) {
    return `${error.message}\n${error.stack ?? ''}`;
  }

  if (typeof error === 'object' && error !== null) {
    const value = error as { message?: string; stack?: string; code?: string | number };
    return `${value.message ?? ''}\n${value.stack ?? ''}\n${value.code ?? ''}`;
  }

  return String(error);
}

export function isStaleChunkError(error: unknown): boolean {
  return STALE_CHUNK_PATTERN.test(readErrorText(error));
}

export function isServerConnectionError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  if (isStaleChunkError(error)) {
    return false;
  }

  if (typeof error === 'object' && error !== null && 'serverConnectionError' in error) {
    return (error as { serverConnectionError?: boolean }).serverConnectionError === true;
  }

  if (isServerConnectionStatus(readErrorStatus(error))) {
    return true;
  }

  return CONNECTION_ERROR_PATTERN.test(readErrorText(error));
}

export function createServerConnectionError(initError: unknown): ServerConnectionErrorData {
  console.error('[server-connection-error] Original error:', initError);

  return {
    message: SERVER_CONNECTION_MESSAGE,
    code: readErrorStatus(initError) ?? SERVER_CONNECTION_DISPLAY_CODE,
    stack: initError instanceof Error ? initError.stack : undefined,
    serverConnectionError: true,
  };
}

export function getServerConnectionErrorCode(error: unknown): number {
  return readErrorStatus(error) ?? SERVER_CONNECTION_DISPLAY_CODE;
}
