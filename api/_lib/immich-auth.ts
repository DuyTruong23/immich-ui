import { getEnv } from './email';

const DEFAULT_UPSTREAM = 'https://immich.gallery-app.pp.ua';

export type ImmichUser = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

const getUpstreamBase = (): string => (getEnv('IMMICH_SERVER_URL') ?? DEFAULT_UPSTREAM).replace(/\/$/, '');

const isLocalDevRuntime = (): boolean => getEnv('VERCEL') !== '1';

export const verifySession = async (accessToken?: string): Promise<ImmichUser | null> => {
  const token = accessToken?.trim();
  if (!token) {
    return null;
  }

  const response = await fetch(`${getUpstreamBase()}/api/users/me`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as ImmichUser;
};

export const verifyAdminSession = async (accessToken?: string): Promise<ImmichUser | null> => {
  const user = await verifySession(accessToken);
  if (user?.isAdmin) {
    return user;
  }

  // Vite dev: allow admin save to local .data file when Immich session unavailable.
  if (isLocalDevRuntime()) {
    return {
      id: 'dev-admin',
      email: 'dev-admin@local',
      name: 'Dev Admin',
      isAdmin: true,
    };
  }

  return null;
};
