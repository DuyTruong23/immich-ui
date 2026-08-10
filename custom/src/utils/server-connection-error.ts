import { isHttpError } from '@immich/sdk';

const CONNECTION_ERROR_PATTERN =
  /\b(502|503|504|505|bad gateway|service unavailable|gateway timeout|failed to fetch|network error|econnrefused|err_connection_refused|aggregateerror)\b/i;

export const SERVER_CONNECTION_MESSAGE = 'Hệ thống đang cập nhật dữ liệu, vui lòng quay lại sau 17:30 ngày 13/8/2026.';

export interface ServerConnectionErrorData {
  message: string;
  code: number;
  stack?: string;
  serverConnectionError: true;
}

export function createServerConnectionError(initError: unknown): ServerConnectionErrorData {
  return {
    message: SERVER_CONNECTION_MESSAGE,
    code: 505,
    stack: initError instanceof Error ? initError.stack : undefined,
    serverConnectionError: true,
  };
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

export function isServerConnectionError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  if (typeof error === 'object' && error !== null && 'serverConnectionError' in error) {
    return (error as { serverConnectionError?: boolean }).serverConnectionError === true;
  }

  if (isHttpError(error)) {
    const status = error.status || error.data?.statusCode;
    return status === 502 || status === 503 || status === 504 || status === 505;
  }

  return CONNECTION_ERROR_PATTERN.test(readErrorText(error));
}

export function getServerConnectionErrorCode(error: unknown): number {
  if (isHttpError(error)) {
    return error.status || error.data?.statusCode || 505;
  }

  const match = readErrorText(error).match(/\b(502|503|504|505)\b/);
  return match ? Number(match[1]) : 505;
}
