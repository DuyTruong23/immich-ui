import { getHeatmapRange } from '$lib';
import { getAlbumStatistics } from '$custom/api/albums';
import { getServerStatistics, getServerVersion, getStorage, pingServer } from '$custom/api/system';
import { enforceAdminRoute } from '$custom/hooks/admin-guard';
import { enforceFeatureRoute } from '$custom/hooks/feature-guard';
import {
  CalendarHeatmapType,
  getUserCalendarHeatmapAdmin,
  getUserSessionsAdmin,
  searchUsersAdmin,
  type CalendarHeatmapResponseDto,
  type SessionResponseDto,
  type UserAdminResponseDto,
} from '@immich/sdk';
import type { PageLoad } from './$types';

const formatGiB = (bytes: number): string => `${(bytes / 1024 ** 3).toFixed(1)} GiB`;

const aggregateHeatmaps = (heatmaps: CalendarHeatmapResponseDto[]): CalendarHeatmapResponseDto | null => {
  if (heatmaps.length === 0) {
    return null;
  }

  const [base] = heatmaps;
  const countByDate = new Map<string, number>();

  for (const heatmap of heatmaps) {
    for (const item of heatmap.series) {
      countByDate.set(item.date, (countByDate.get(item.date) ?? 0) + item.count);
    }
  }

  return {
    from: base.from,
    to: base.to,
    series: base.series.map((item) => ({
      date: item.date,
      count: countByDate.get(item.date) ?? 0,
    })),
    totalCount: heatmaps.reduce((sum, heatmap) => sum + heatmap.totalCount, 0),
  };
};

export type UserDeviceGroup = {
  user: UserAdminResponseDto;
  sessions: SessionResponseDto[];
};

export const load = (async ({ url }) => {
  await enforceFeatureRoute(url.pathname);
  await enforceAdminRoute();

  const heatmapRange = getHeatmapRange();

  const [version, albums, stats, storage, serverOnline, users] = await Promise.all([
    getServerVersion(),
    getAlbumStatistics(),
    getServerStatistics(),
    getStorage(),
    pingServer()
      .then(() => true)
      .catch(() => false),
    searchUsersAdmin({ withDeleted: false }),
  ]);

  const [uploadHeatmaps, userDeviceGroups] = await Promise.all([
    Promise.all(
      users.map((user) =>
        getUserCalendarHeatmapAdmin({
          id: user.id,
          ...heatmapRange,
          $type: CalendarHeatmapType.Upload,
        }).catch(() => null),
      ),
    ),
    Promise.all(
      users.map(async (user) => ({
        user,
        sessions: await getUserSessionsAdmin({ id: user.id }).catch(() => []),
      })),
    ),
  ]);

  const uploadHistory = aggregateHeatmaps(uploadHeatmaps.filter((heatmap): heatmap is CalendarHeatmapResponseDto => heatmap !== null));
  const totalSessions = userDeviceGroups.reduce((sum, group) => sum + group.sessions.length, 0);
  const albumCount = albums.owned + albums.shared + albums.notShared;
  const storageUsed = storage.diskUseRaw;
  const storageTotal = storage.diskSizeRaw;
  const storagePercent = storage.diskUsagePercentage;

  return {
    meta: { title: 'Dashboard' },
    serverVersion: `${version.major}.${version.minor}.${version.patch}`,
    serverOnline,
    albumCount,
    photoCount: stats.photos,
    videoCount: stats.videos,
    mediaUsageBytes: stats.usage,
    storageUsed,
    storageTotal,
    storageUsedLabel: storage.diskUse,
    storageTotalLabel: storage.diskSize,
    storagePercent,
    storageUsedGiB: formatGiB(storageUsed),
    storageTotalGiB: formatGiB(storageTotal),
    mediaUsageGiB: formatGiB(stats.usage),
    uploadHistory,
    userDeviceGroups,
    totalSessions,
  };
}) satisfies PageLoad;
