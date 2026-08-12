import {
  getMockAssetById,
  getMockUserForRole,
  mockAboutInfo,
  mockAdminUsers,
  mockAuthStatus,
  mockExploreData,
  mockNotifications,
  mockOwnedAlbums,
  mockPeopleResponse,
  mockPeopleResponseWithHidden,
  mockServerFeatures,
  mockServerMediaTypes,
  mockServerStatistics,
  mockServerStorage,
  mockServerVersion,
  mockSharedAlbums,
  mockStorage,
  mockSvgPlaceholder,
  mockSystemConfig,
  mockTags,
  mockTimeBucket,
  mockTimeBuckets,
  mockUserPreferences,
} from '$custom/mocks/ui-dev-data';
import { AssetVisibility } from '@immich/sdk';
import { getStoredDevRole, isUiDevMode } from '$custom/hooks/ui-dev-mode';

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const emptyOk = () => new Response(null, { status: 204 });

const svgResponse = () =>
  new Response(mockSvgPlaceholder(), {
    status: 200,
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' },
  });

const parseUrl = (input: RequestInfo | URL): URL => {
  if (typeof input === 'string') {
    return new URL(input, 'http://localhost');
  }
  if (input instanceof URL) {
    return input;
  }
  return new URL(input.url);
};

const resolveMock = (url: URL, method: string): Response | unknown | null => {
  const path = url.pathname.replace(/\/$/, '');
  const apiPath = path.startsWith('/api') ? path.slice(4) || '/' : path;

  if (method !== 'GET' && method !== 'HEAD') {
    if (apiPath.startsWith('/assets/') || apiPath.startsWith('/albums') || apiPath.startsWith('/tags')) {
      return emptyOk();
    }
    return {};
  }

  if (method === 'HEAD') {
    return new Response(null, { status: 200 });
  }

  if (/\/thumbnail|\/preview|\/people\/[^/]+\/thumbnail/.test(apiPath)) {
    return svgResponse();
  }

  switch (apiPath) {
    case '/server/ping':
      return { res: 'pong' };
    case '/server/config':
      return {
        externalDomain: '',
        isInitialized: true,
        isOnboarded: true,
        loginPageMessage: '',
        maintenanceMode: false,
        mapDarkStyleUrl: '',
        mapLightStyleUrl: '',
        minFaces: 3,
        oauthButtonText: 'OAuth',
        publicUsers: false,
        trashDays: 30,
        userDeleteDelay: 7,
      };
    case '/server/features':
      return mockServerFeatures();
    case '/server/about':
      return mockAboutInfo();
    case '/server/statistics':
      return mockServerStatistics();
    case '/server/storage':
      return mockServerStorage();
    case '/server/version':
      return mockServerVersion();
    case '/server/media-types':
      return mockServerMediaTypes();
    case '/users/me': {
      const role = getStoredDevRole() ?? 'admin';
      return getMockUserForRole(role);
    }
    case '/users/me/preferences':
      return mockUserPreferences();
    case '/auth/status':
      return mockAuthStatus();
    case '/people':
      return url.searchParams.get('withHidden') === 'true'
        ? mockPeopleResponseWithHidden()
        : mockPeopleResponse();
    case '/search/explore':
      return mockExploreData();
    case '/tags':
      return mockTags();
    case '/albums':
      if (url.searchParams.get('isShared') === 'true') {
        return mockSharedAlbums();
      }
      return mockOwnedAlbums();
    case '/system-config':
    case '/system-config/defaults':
      return mockSystemConfig();
    case '/notifications':
      return mockNotifications();
    case '/storage':
      return mockStorage();
    case '/timeline/buckets': {
      const visibility = url.searchParams.get('visibility');
      if (visibility === AssetVisibility.Locked) {
        return [{ timeBucket: '2025-08-01', count: 1 }];
      }
      return mockTimeBuckets();
    }
    case '/timeline/bucket': {
      const visibility = url.searchParams.get('visibility') as AssetVisibility | null;
      return mockTimeBucket(visibility);
    }
    default:
      break;
  }

  if (apiPath.startsWith('/admin/users')) {
    return mockAdminUsers();
  }

  const assetMatch = apiPath.match(/^\/assets\/([^/]+)$/);
  if (assetMatch) {
    return getMockAssetById(assetMatch[1]) ?? getMockAssetById('dev-asset-001');
  }

  return null;
};

export const createUiDevFetch = (realFetch: typeof fetch): typeof fetch => {
  return async (input, init) => {
    if (!isUiDevMode()) {
      return realFetch(input, init);
    }

    const url = parseUrl(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    const mock = resolveMock(url, method);

    if (mock instanceof Response) {
      return mock;
    }

    if (mock !== null) {
      return jsonResponse(mock);
    }

    console.warn('[ui-dev-fetch] unmocked', method, url.pathname);
    if (method === 'HEAD') {
      return new Response(null, { status: 200 });
    }
    if (method === 'GET') {
      return jsonResponse([]);
    }
    return emptyOk();
  };
};
