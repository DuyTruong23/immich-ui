import { getTimeBucket, getTimeBuckets, searchUsersAdmin, type TimeBucketAssetResponseDto } from '@immich/sdk';
import type { TimelineAsset } from '$lib/managers/timeline-manager/types';
import { fromISODateTimeUTC, getTimes } from '$lib/utils/timeline-util';
import {
  fetchPartnerFavorites,
  setPartnerFavorite,
  setShareFavoritesWithEveryone,
  syncPartnerFavorites,
  type PartnerFavoriteItem,
  type PartnerFavoriteUser,
  type PartnerFavoritesResponse,
} from '$custom/api/partner-favorites';

const timeBucketToTimelineAssets = (bucket: TimeBucketAssetResponseDto): TimelineAsset[] => {
  const assets: TimelineAsset[] = [];

  for (let index = 0; index < bucket.id.length; index++) {
    if (bucket.isTrashed[index]) {
      continue;
    }

    const { localDateTime, fileCreatedAt } = getTimes(bucket.fileCreatedAt[index], bucket.localOffsetHours[index]);
    const stackEntry = bucket.stack?.at(index);
    const asset: TimelineAsset = {
      city: bucket.city?.[index] ?? null,
      country: bucket.country?.[index] ?? null,
      duration: bucket.duration[index],
      id: bucket.id[index],
      visibility: bucket.visibility[index],
      isFavorite: bucket.isFavorite[index],
      isImage: bucket.isImage[index],
      isTrashed: bucket.isTrashed[index],
      isVideo: !bucket.isImage[index],
      livePhotoVideoId: bucket.livePhotoVideoId[index],
      localDateTime,
      createdAt: fromISODateTimeUTC(bucket.createdAt[index]).toLocal().toObject(),
      fileCreatedAt,
      ownerId: bucket.ownerId[index],
      projectionType: bucket.projectionType[index],
      ratio: bucket.ratio[index],
      stack: stackEntry
        ? {
            id: stackEntry[0],
            primaryAssetId: bucket.id[index],
            assetCount: Number.parseInt(stackEntry[1]),
          }
        : null,
      thumbhash: bucket.thumbhash[index],
      people: null,
    };

    if (bucket.latitude?.at(index) && bucket.longitude?.at(index)) {
      asset.latitude = bucket.latitude[index];
      asset.longitude = bucket.longitude[index];
    }

    assets.push(asset);
  }

  return assets;
};

class PartnerFavoritesStore {
  loaded = $state(false);
  loading = $state(false);
  me = $state<PartnerFavoriteUser | null>(null);
  partners = $state<PartnerFavoriteUser[]>([]);
  items = $state<PartnerFavoriteItem[]>([]);
  adminItems = $state<PartnerFavoriteItem[]>([]);
  mineAssetIds = $state<string[]>([]);
  shareWithEveryone = $state(false);

  #loadPromise: Promise<void> | null = null;

  listedItems = $derived.by(() => {
    const byId = new Map<string, PartnerFavoriteItem>();
    const merge = (item: PartnerFavoriteItem) => {
      if (!item?.assetId || !Array.isArray(item.favoritedBy)) {
        return;
      }

      const current = byId.get(item.assetId);
      if (!current) {
        byId.set(item.assetId, { ...item, favoritedBy: [...item.favoritedBy] });
        return;
      }

      const known = new Set(current.favoritedBy.map((user) => user.id));
      for (const user of item.favoritedBy) {
        if (user?.id && !known.has(user.id)) {
          current.favoritedBy.push(user);
          known.add(user.id);
        }
      }
    };

    for (const item of this.items) {
      merge(item);
    }
    for (const extra of this.adminItems) {
      merge(extra);
    }
    return [...byId.values()];
  });

  byAssetId = $derived(new Map(this.listedItems.map((item) => [item.assetId, item])));
  mineIdSet = $derived(new Set(this.mineAssetIds));

  apply(payload: PartnerFavoritesResponse) {
    if (!payload?.me?.id) {
      return;
    }

    this.me = payload.me;
    const incomingPartners = Array.isArray(payload.partners) ? payload.partners : [];
    if (payload.me.isAdmin) {
      const byId = new Map(this.partners.map((user) => [user.id, user]));
      for (const partner of incomingPartners) {
        byId.set(partner.id, partner);
      }
      this.partners = [...byId.values()];
    } else {
      this.partners = incomingPartners;
      this.adminItems = [];
    }
    this.items = Array.isArray(payload.items) ? payload.items : [];
    this.mineAssetIds = payload.mineAssetIds ?? [];
    this.shareWithEveryone = payload.shareWithEveryone === true;
    this.loaded = true;
  }

  favoritedBy(assetId: string): PartnerFavoriteUser[] {
    return this.byAssetId.get(assetId)?.favoritedBy ?? [];
  }

  hasMine(assetId: string): boolean {
    return this.mineIdSet.has(assetId);
  }

  async load(): Promise<void> {
    if (this.#loadPromise) {
      return this.#loadPromise;
    }

    this.loading = true;
    this.#loadPromise = (async () => {
      try {
        this.apply(await fetchPartnerFavorites());
      } finally {
        this.loading = false;
        this.#loadPromise = null;
      }
    })();

    return this.#loadPromise;
  }

  async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      await this.load();
    }
  }

  async loadFavoriteBuckets(
    onChunk: (assets: TimelineAsset[]) => void,
    options?: { withPartners?: boolean; userId?: string },
  ): Promise<string[]> {
    const query: { isFavorite: true; withPartners?: boolean; userId?: string } = {
      isFavorite: true,
    };
    if (options?.withPartners) {
      query.withPartners = true;
    }
    if (options?.userId) {
      query.userId = options.userId;
    }

    let buckets: Awaited<ReturnType<typeof getTimeBuckets>> = [];
    try {
      buckets = [...(await getTimeBuckets(query))].sort((left, right) =>
        right.timeBucket.localeCompare(left.timeBucket),
      );
    } catch (error) {
      console.warn('[partner-favorites] failed to list buckets', error);
      return [];
    }
    const assetIds: string[] = [];

    const loadOne = async (timeBucket: string) => {
      try {
        const chunk = await getTimeBucket({ ...query, timeBucket });
        assetIds.push(...chunk.id);
        onChunk(timeBucketToTimelineAssets(chunk));
      } catch (error) {
        console.warn('[partner-favorites] failed to load bucket', timeBucket, error);
      }
    };

    const [first, ...rest] = buckets;
    if (first) {
      await loadOne(first.timeBucket);
    }

    let next = 0;
    const workers = Array.from({ length: Math.min(2, rest.length) }, async () => {
      while (next < rest.length) {
        const bucket = rest[next++];
        await loadOne(bucket.timeBucket);
      }
    });
    await Promise.all(workers);

    return assetIds;
  }

  async loadEveryoneFavoritesForAdmin(onChunk: (assets: TimelineAsset[]) => void): Promise<void> {
    if (!this.me?.isAdmin) {
      return;
    }

    const users = new Map<string, PartnerFavoriteUser>(this.partners.map((user) => [user.id, user]));
    try {
      const admins = await searchUsersAdmin({});
      for (const user of admins) {
        if (!user.id || user.id === this.me.id) {
          continue;
        }
        users.set(user.id, {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: Boolean(user.isAdmin),
          avatarColor: user.avatarColor ?? 'primary',
          profileImagePath: user.profileImagePath ?? '',
          profileChangedAt: user.profileChangedAt ?? new Date().toISOString(),
        });
      }
    } catch (error) {
      console.warn('[partner-favorites] admin user list failed', error);
    }

    this.partners = [...users.values()];
    const discovered: PartnerFavoriteItem[] = [];

    for (const user of users.values()) {
      try {
        const assetIds = await this.loadFavoriteBuckets(onChunk, { userId: user.id });
        for (const assetId of assetIds) {
          discovered.push({
            assetId,
            favoritedAt: new Date().toISOString(),
            favoritedBy: [user],
          });
        }
      } catch (error) {
        console.warn('[partner-favorites] admin load user favorites failed', user.id, error);
      }
    }

    this.adminItems = discovered;
  }

  async syncMineFromImmich(assetIds?: string[]): Promise<void> {
    try {
      let ids = assetIds;
      if (!ids) {
        ids = await this.loadFavoriteBuckets(() => undefined);
      }
      this.apply(await syncPartnerFavorites(ids));
    } catch (error) {
      console.warn('[partner-favorites] sync from Immich failed', error);
      try {
        await this.load();
      } catch (loadError) {
        console.warn('[partner-favorites] reload after sync failed', loadError);
      }
    }
  }

  async setFavorite(assetId: string | string[], favorite: boolean): Promise<PartnerFavoritesResponse> {
    const payload = await setPartnerFavorite(assetId, favorite);
    this.apply(payload);
    return payload;
  }

  async setShareWithEveryone(enabled: boolean): Promise<void> {
    const previous = this.shareWithEveryone;
    this.shareWithEveryone = enabled;
    try {
      this.apply(await setShareFavoritesWithEveryone(enabled));
    } catch (error) {
      this.shareWithEveryone = previous;
      throw error;
    }
  }
}

export const partnerFavoritesStore = new PartnerFavoritesStore();
