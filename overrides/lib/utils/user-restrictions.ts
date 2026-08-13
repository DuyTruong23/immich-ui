const USERS_WITHOUT_NOTIFICATIONS = new Set(['tuedg@gmail.com']);

export const shouldShowNotifications = (email: string): boolean =>
  !USERS_WITHOUT_NOTIFICATIONS.has(email.trim().toLowerCase());
