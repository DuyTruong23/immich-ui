import { getStoredAccessToken } from '$custom/hooks/access-token';

export type PartnerFavoriteUser = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  avatarColor: string;
  profileImagePath: string;
  profileChangedAt: string;
};

export type PartnerFavoriteItem = {
  assetId: string;
  favoritedAt: string;
  favoritedBy: PartnerFavoriteUser[];
};

export type PartnerFavoritesResponse = {
  me: PartnerFavoriteUser;
  partners: PartnerFavoriteUser[];
  items: PartnerFavoriteItem[];
  mineAssetIds?: string[];
  shareWithEveryone?: boolean;
  ok?: boolean;
  added?: boolean;
  removed?: boolean;
  emailed?: number;
  synced?: number;
  error?: string;
};

const headers = (): HeadersInit => {
  const token = getStoredAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const parseResponse = async (response: Response): Promise<PartnerFavoritesResponse> => {
  const payload = (await response.json().catch(() => ({}))) as PartnerFavoritesResponse;
  if (!response.ok) {
    throw new Error(payload.error || `Partner favorites request failed (${response.status})`);
  }
  return payload;
};

export const fetchPartnerFavorites = async (): Promise<PartnerFavoritesResponse> => {
  const token = getStoredAccessToken();
  const response = await fetch('/api/partner-favorites', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return parseResponse(response);
};

export const setPartnerFavorite = async (
  assetId: string | string[],
  favorite: boolean,
): Promise<PartnerFavoritesResponse> => {
  const token = getStoredAccessToken();
  const ids = Array.isArray(assetId) ? assetId : [assetId];
  const response = await fetch('/api/partner-favorites', {
    method: 'POST',
    credentials: 'include',
    headers: headers(),
    body: JSON.stringify({
      assetId: ids[0],
      assetIds: ids,
      favorite,
      ...(token ? { accessToken: token } : {}),
    }),
  });
  return parseResponse(response);
};

export const syncPartnerFavorites = async (assetIds: string[]): Promise<PartnerFavoritesResponse> => {
  const token = getStoredAccessToken();
  const response = await fetch('/api/partner-favorites', {
    method: 'PUT',
    credentials: 'include',
    headers: headers(),
    body: JSON.stringify({
      assetIds,
      ...(token ? { accessToken: token } : {}),
    }),
  });
  return parseResponse(response);
};

export const setShareFavoritesWithEveryone = async (
  shareWithEveryone: boolean,
): Promise<PartnerFavoritesResponse> => {
  const token = getStoredAccessToken();
  const response = await fetch('/api/partner-favorites', {
    method: 'PATCH',
    credentials: 'include',
    headers: headers(),
    body: JSON.stringify({
      shareWithEveryone,
      ...(token ? { accessToken: token } : {}),
    }),
  });
  return parseResponse(response);
};
