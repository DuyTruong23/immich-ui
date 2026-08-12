import {
  AssetOrder,
  AssetTypeEnum,
  AssetVisibility,
  AudioCodec,
  Colorspace,
  CQMode,
  HlsVideoResolution,
  ImageFormat,
  LogLevel,
  OAuthTokenEndpointAuthMethod,
  ReleaseChannel,
  ToneMapping,
  TranscodeHWAccel,
  TranscodePolicy,
  VideoCodec,
  VideoContainer,
  type AlbumResponseDto,
  type AssetResponseDto,
  type AuthStatusResponseDto,
  type NotificationDto,
  type PeopleResponseDto,
  type PersonResponseDto,
  type SearchExploreResponseDto,
  type ServerAboutResponseDto,
  type ServerConfigDto,
  type ServerFeaturesDto,
  type ServerMediaTypesResponseDto,
  type ServerStatsResponseDto,
  type ServerStorageResponseDto,
  type ServerVersionResponseDto,
  type SystemConfigDto,
  type TagResponseDto,
  type TimeBucketAssetResponseDto,
  type TimeBucketsResponseDto,
  type UserAdminResponseDto,
  type UserPreferencesResponseDto,
} from '@immich/sdk';
import { createMockUser, type UiDevRole } from '$custom/hooks/ui-dev-mode';

const ts = () => new Date().toISOString();
const DEV_OWNER = createMockUser('admin');

const PLACEHOLDER_THUMBHASH = 'lOkJF4dIBwWgB1WARwWqV4d/h4eGh4eA';

export const mockSvgPlaceholder = (): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#5b2fae"/>
        <stop offset="100%" stop-color="#24104f"/>
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#g)"/>
    <text x="200" y="155" fill="#ffffff88" font-family="system-ui,sans-serif" font-size="18" text-anchor="middle">Dev mock</text>
  </svg>`;

const mockAsset = (id: string, name: string, overrides: Partial<AssetResponseDto> = {}): AssetResponseDto => ({
  id,
  checksum: 'dev-checksum',
  createdAt: ts(),
  updatedAt: ts(),
  ownerId: DEV_OWNER.id,
  libraryId: null,
  type: AssetTypeEnum.Image,
  originalPath: `/dev/${name}`,
  originalFileName: name,
  originalMimeType: 'image/jpeg',
  thumbhash: PLACEHOLDER_THUMBHASH,
  fileCreatedAt: ts(),
  fileModifiedAt: ts(),
  localDateTime: ts(),
  isFavorite: false,
  isArchived: false,
  isTrashed: false,
  isOffline: false,
  isEdited: false,
  hasMetadata: true,
  visibility: AssetVisibility.Timeline,
  duration: null,
  width: 1600,
  height: 1200,
  exifInfo: {
    city: 'Đà Lạt',
    country: 'Việt Nam',
    make: 'Mock Camera',
    model: 'UI Dev',
    lensModel: '35mm',
  },
  ...overrides,
});

const MOCK_ASSETS: AssetResponseDto[] = [
  mockAsset('dev-asset-001', 'sunset-dalat.jpg'),
  mockAsset('dev-asset-002', 'family-brunch.jpg'),
  mockAsset('dev-asset-003', 'street-hanoi.jpg', { isFavorite: true }),
  mockAsset('dev-asset-004', 'beach-phuquoc.jpg'),
  mockAsset('dev-asset-005', 'coffee-shop.jpg'),
  mockAsset('dev-asset-006', 'mountain-trek.jpg'),
  mockAsset('dev-asset-007', 'locked-note.jpg', { visibility: AssetVisibility.Locked }),
  mockAsset('dev-asset-008', 'demo-video.mp4', {
    type: AssetTypeEnum.Video,
    duration: 12_000,
    originalMimeType: 'video/mp4',
  }),
];

const mockPerson = (id: string, name: string, hidden = false): PersonResponseDto => ({
  id,
  name,
  birthDate: null,
  isHidden: hidden,
  thumbnailPath: `/people/${id}/thumbnail`,
  updatedAt: ts(),
  color: '#8b5cf6',
});

const MOCK_PEOPLE: PersonResponseDto[] = [
  mockPerson('dev-person-001', 'Minh Anh'),
  mockPerson('dev-person-002', 'Quốc Bảo'),
  mockPerson('dev-person-003', 'Lan Chi'),
  mockPerson('dev-person-004', 'Hidden Person', true),
];

const mockAlbum = (
  id: string,
  name: string,
  shared: boolean,
  assetCount: number,
  thumbId: string | null,
): AlbumResponseDto => ({
  id,
  albumName: name,
  description: shared ? 'Album chia sẻ (mock)' : 'Album cá nhân (mock)',
  albumThumbnailAssetId: thumbId,
  assetCount,
  createdAt: ts(),
  updatedAt: ts(),
  shared,
  albumUsers: [],
  hasSharedLink: shared,
  isActivityEnabled: true,
  order: AssetOrder.Desc,
});

const MOCK_OWNED_ALBUMS: AlbumResponseDto[] = [
  mockAlbum('dev-album-001', 'Du lịch 2025', false, 24, 'dev-asset-001'),
  mockAlbum('dev-album-002', 'Gia đình', false, 18, 'dev-asset-002'),
  mockAlbum('dev-album-003', 'Trống (mock)', false, 0, null),
];

const MOCK_SHARED_ALBUMS: AlbumResponseDto[] = [
  mockAlbum('dev-album-101', 'Team offsite', true, 42, 'dev-asset-004'),
  mockAlbum('dev-album-102', 'Sự kiện cưới', true, 156, 'dev-asset-005'),
];

const mockTag = (id: string, name: string, parentId?: string): TagResponseDto => ({
  id,
  name,
  value: name,
  parentId,
  color: '#6366f1',
  createdAt: ts(),
  updatedAt: ts(),
});

const MOCK_TAGS: TagResponseDto[] = [
  mockTag('dev-tag-001', 'Du lịch'),
  mockTag('dev-tag-002', 'Gia đình'),
  mockTag('dev-tag-003', 'Ẩm thực'),
  mockTag('dev-tag-004', 'Đà Lạt', 'dev-tag-001'),
  mockTag('dev-tag-005', 'Biển', 'dev-tag-001'),
  mockTag('dev-tag-006', 'Công việc'),
];

const MOCK_TIME_BUCKETS: TimeBucketsResponseDto[] = [
  { timeBucket: '2025-08-01', count: 4 },
  { timeBucket: '2025-07-01', count: 3 },
  { timeBucket: '2025-06-01', count: 1 },
];

const toBucketAssets = (assets: AssetResponseDto[]): TimeBucketAssetResponseDto => ({
  id: assets.map((a) => a.id),
  createdAt: assets.map((a) => a.createdAt),
  fileCreatedAt: assets.map((a) => a.fileCreatedAt),
  duration: assets.map((a) => a.duration),
  isFavorite: assets.map((a) => a.isFavorite),
  isImage: assets.map((a) => a.type === AssetTypeEnum.Image),
  isTrashed: assets.map((a) => a.isTrashed),
  livePhotoVideoId: assets.map(() => null),
  localOffsetHours: assets.map(() => 7),
  ownerId: assets.map((a) => a.ownerId),
  projectionType: assets.map(() => null),
  ratio: assets.map((a) => (a.width && a.height ? a.width / a.height : 1.33)),
  thumbhash: assets.map((a) => a.thumbhash),
  visibility: assets.map((a) => a.visibility),
  city: assets.map((a) => a.exifInfo?.city ?? null),
  country: assets.map((a) => a.exifInfo?.country ?? null),
  stack: assets.map(() => null),
});

export const mockPeopleResponse = (): PeopleResponseDto => ({
  people: MOCK_PEOPLE.filter((p) => !p.isHidden),
  total: MOCK_PEOPLE.filter((p) => !p.isHidden).length,
  hidden: MOCK_PEOPLE.filter((p) => p.isHidden).length,
  hasNextPage: false,
});

export const mockPeopleResponseWithHidden = (): PeopleResponseDto => ({
  people: MOCK_PEOPLE,
  total: MOCK_PEOPLE.length,
  hidden: MOCK_PEOPLE.filter((p) => p.isHidden).length,
  hasNextPage: false,
});

export const mockExploreData = (): SearchExploreResponseDto[] => [
  {
    fieldName: 'exifInfo.city',
    items: MOCK_ASSETS.slice(0, 4).map((asset) => ({
      value: asset.exifInfo?.city ?? 'Unknown',
      data: asset,
    })),
  },
  {
    fieldName: 'exifInfo.model',
    items: MOCK_ASSETS.slice(2, 6).map((asset) => ({
      value: asset.exifInfo?.model ?? 'Camera',
      data: asset,
    })),
  },
];

export const mockTags = (): TagResponseDto[] => MOCK_TAGS;
export const mockOwnedAlbums = (): AlbumResponseDto[] => MOCK_OWNED_ALBUMS;
export const mockSharedAlbums = (): AlbumResponseDto[] => MOCK_SHARED_ALBUMS;

export const mockAuthStatus = (): AuthStatusResponseDto => ({
  isElevated: true,
  pinCode: true,
  password: true,
});

export const mockTimeBuckets = (): TimeBucketsResponseDto[] => MOCK_TIME_BUCKETS;

export const mockTimeBucket = (visibility?: AssetVisibility | null): TimeBucketAssetResponseDto => {
  const assets =
    visibility === AssetVisibility.Locked
      ? MOCK_ASSETS.filter((a) => a.visibility === AssetVisibility.Locked)
      : MOCK_ASSETS.filter((a) => a.visibility !== AssetVisibility.Locked);

  return toBucketAssets(assets.length > 0 ? assets : MOCK_ASSETS.slice(0, 4));
};

export const mockUserPreferences = (): UserPreferencesResponseDto => ({
  albums: { defaultAssetOrder: AssetOrder.Desc },
  cast: { gCastEnabled: false },
  download: { archiveSize: 0, includeEmbeddedVideos: false },
  emailNotifications: { albumInvite: false, albumUpdate: false, enabled: false },
  folders: { enabled: true, sidebarWeb: true },
  memories: { enabled: true, duration: 5 },
  people: { enabled: true, sidebarWeb: true, minimumFaces: 3 },
  purchase: { hideBuyButtonUntil: '', showSupportBadge: false },
  ratings: { enabled: true },
  sharedLinks: { enabled: true, sidebarWeb: true },
  tags: { enabled: true, sidebarWeb: true },
  recentlyAdded: { sidebarWeb: true },
});

export const mockServerFeatures = (): ServerFeaturesDto => ({
  configFile: false,
  duplicateDetection: true,
  email: false,
  facialRecognition: true,
  importFaces: true,
  map: true,
  oauth: false,
  oauthAutoLaunch: false,
  ocr: true,
  passwordLogin: true,
  realtimeTranscoding: true,
  reverseGeocoding: true,
  search: true,
  sidecar: true,
  smartSearch: true,
  trash: true,
});

export const mockServerStatistics = (): ServerStatsResponseDto => ({
  photos: 1284,
  videos: 86,
  usage: 12 * 1024 ** 3,
  usageByUser: [],
  usagePhotos: 10 * 1024 ** 3,
  usageVideos: 2 * 1024 ** 3,
});

export const mockStorage = (): ServerStorageResponseDto => ({
  diskSize: '100 GiB',
  diskUse: '40 GiB',
  diskAvailable: '60 GiB',
  diskSizeRaw: 100 * 1024 ** 3,
  diskUseRaw: 40 * 1024 ** 3,
  diskAvailableRaw: 60 * 1024 ** 3,
  diskUsagePercentage: 40,
});

export const mockServerStorage = (): ServerStorageResponseDto => mockStorage();

export const mockServerVersion = (): ServerVersionResponseDto => ({
  major: 0,
  minor: 0,
  patch: 0,
});

export const mockServerMediaTypes = (): ServerMediaTypesResponseDto => ({
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'],
  video: ['video/mp4', 'video/quicktime', 'video/webm'],
  sidecar: ['application/x-xmp', 'application/xml', 'text/xml'],
});

export const mockAboutInfo = (): ServerAboutResponseDto => ({
  version: '0.0.0-dev',
  versionUrl: 'https://github.com/immich-app/immich/releases',
  licensed: false,
});

export const mockNotifications = (): NotificationDto[] => [];
export const mockAdminUsers = (): UserAdminResponseDto[] => [createMockUser('admin'), createMockUser('user')];

const jobSettings = () => ({ concurrency: 1 });

export const mockSystemConfig = (): SystemConfigDto =>
  ({
    backup: {
      database: { enabled: false, cronExpression: '0 2 * * *', keepLastAmount: 7 },
    },
    ffmpeg: {
      accel: TranscodeHWAccel.Disabled,
      accelDecode: false,
      acceptedAudioCodecs: [AudioCodec.Aac],
      acceptedContainers: [VideoContainer.Mov],
      acceptedVideoCodecs: [VideoCodec.H264],
      bframes: 0,
      cqMode: CQMode.Auto,
      crf: 23,
      gopSize: 0,
      maxBitrate: '0',
      preferredHwDevice: '',
      preset: 'ultrafast',
      realtime: {
        enabled: false,
        resolutions: [HlsVideoResolution.$720],
        videoCodecs: [VideoCodec.H264],
      },
      refs: 0,
      targetAudioCodec: AudioCodec.Aac,
      targetResolution: '720',
      targetVideoCodec: VideoCodec.H264,
      temporalAQ: false,
      threads: 0,
      tonemap: ToneMapping.Hable,
      transcode: TranscodePolicy.Required,
      twoPass: false,
    },
    image: {
      colorspace: Colorspace.Srgb,
      extractEmbedded: false,
      fullsize: { enabled: true, format: ImageFormat.Jpeg, quality: 80, progressive: true },
      preview: { format: ImageFormat.Jpeg, quality: 80, size: 1440, progressive: true },
      thumbnail: { format: ImageFormat.Jpeg, quality: 80, size: 250, progressive: false },
    },
    integrityChecks: {
      checksumFiles: { enabled: false, cronExpression: '0 3 * * 0', percentageLimit: 100, timeLimit: 3600 },
      missingFiles: { enabled: false, cronExpression: '0 4 * * 0' },
      untrackedFiles: { enabled: false, cronExpression: '0 5 * * 0' },
    },
    job: {
      backgroundTask: jobSettings(),
      editor: jobSettings(),
      faceDetection: jobSettings(),
      integrityCheck: jobSettings(),
      library: jobSettings(),
      metadataExtraction: jobSettings(),
      migration: jobSettings(),
      notifications: jobSettings(),
      ocr: jobSettings(),
      search: jobSettings(),
      sidecar: jobSettings(),
      smartSearch: jobSettings(),
      thumbnailGeneration: jobSettings(),
      videoConversion: jobSettings(),
      workflow: jobSettings(),
    },
    library: {
      scan: { enabled: false, cronExpression: '0 1 * * *' },
      watch: { enabled: false },
    },
    logging: { enabled: true, level: LogLevel.Log },
    machineLearning: {
      enabled: false,
      urls: [],
      availabilityChecks: { enabled: false, interval: 300, timeout: 10 },
      clip: { enabled: false, modelName: '' },
      duplicateDetection: { enabled: false, maxDistance: 0.01 },
      facialRecognition: { enabled: false, maxDistance: 0.5, minFaces: 3, minScore: 0.7, modelName: '' },
      ocr: { enabled: false, maxResolution: 736, minDetectionScore: 0.5, minRecognitionScore: 0.5, modelName: '' },
    },
    map: { enabled: true, darkStyle: '', lightStyle: '' },
    metadata: { faces: { import: false } },
    newVersionCheck: { enabled: false, channel: ReleaseChannel.Stable },
    nightlyTasks: {
      clusterNewFaces: false,
      databaseCleanup: false,
      generateMemories: false,
      missingThumbnails: false,
      startTime: '00:00',
      syncQuotaUsage: false,
    },
    notifications: {
      smtp: {
        enabled: false,
        from: '',
        replyTo: '',
        transport: {
          host: '',
          port: 587,
          username: '',
          password: '',
          ignoreCert: false,
          secure: false,
        },
      },
    },
    oauth: {
      enabled: false,
      autoLaunch: false,
      autoRegister: false,
      buttonText: 'OAuth',
      clientId: '',
      clientSecret: '',
      defaultStorageQuota: null,
      endSessionEndpoint: '',
      issuerUrl: '',
      mobileOverrideEnabled: false,
      mobileRedirectUri: '',
      profileSigningAlgorithm: '',
      prompt: '',
      roleClaim: '',
      scope: '',
      signingAlgorithm: '',
      storageLabelClaim: '',
      storageQuotaClaim: '',
      timeout: 30_000,
      tokenEndpointAuthMethod: OAuthTokenEndpointAuthMethod.ClientSecretPost,
      allowInsecureRequests: false,
    },
    passwordLogin: { enabled: true },
    reverseGeocoding: { enabled: false },
    server: { externalDomain: '', loginPageMessage: '', publicUsers: false },
    storageTemplate: { enabled: false, hashVerificationEnabled: false, template: '' },
    templates: {
      email: { albumInviteTemplate: '', albumUpdateTemplate: '', welcomeTemplate: '' },
    },
    theme: { customCss: '' },
    trash: { enabled: true, days: 30 },
    user: { deleteDelay: 7 },
  }) satisfies SystemConfigDto;

export const getMockUserForRole = (role: UiDevRole): UserAdminResponseDto => createMockUser(role);

export const getMockAssetById = (id: string): AssetResponseDto | undefined =>
  MOCK_ASSETS.find((asset) => asset.id === id);
