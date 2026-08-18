export const MAINTENANCE_RETURN_DAYS = 3;
export const MAINTENANCE_RETURN_HOUR = 15;
export const MAINTENANCE_RETURN_MINUTE = 30;

export function getMaintenanceReturnAt(from = new Date()): Date {
  const returnAt = new Date(from);
  returnAt.setDate(returnAt.getDate() + MAINTENANCE_RETURN_DAYS);
  returnAt.setHours(MAINTENANCE_RETURN_HOUR, MAINTENANCE_RETURN_MINUTE, 0, 0);
  return returnAt;
}

export function formatMaintenanceReturn(
  returnAt: Date,
  locale: string | null | undefined,
): { date: string; time: string } {
  const code = locale?.startsWith('vi') ? 'vi-VN' : 'en-US';

  if (code === 'vi-VN') {
    return {
      date: returnAt.toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      }),
      time: returnAt.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    };
  }

  return {
    date: returnAt.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    time: returnAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  };
}
