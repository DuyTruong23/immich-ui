export const COOK_PATH = '/cook';

export const isCookRoute = (pathname: string): boolean =>
  pathname === COOK_PATH || pathname.startsWith(`${COOK_PATH}/`);
