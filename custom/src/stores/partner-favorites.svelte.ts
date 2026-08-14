import { getTimeBucket, getTimeBuckets, type TimeBucketAssetResponseDto } from '@immich/sdk';
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
  mineAssetIds = $state<string[]>([]);
  shareWithEveryone = $state(false);

  #loadPromise: Promise<void> | null = null;

  byAssetId = $derived(new Map(this.items.map((item) => [item.assetId, item])));
  mineIdSet = $derived(new Set(this.mineAssetIds));

  apply(payload: PartnerFavoritesResponse) {
    this.me = payload.me;
    this.partners = payload.partners;
    this.items = payload.items;
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

  async loadFavoriteBuckets(onChunk: (assets: TimelineAsset[]) => void): Promise<string[]> {
    const buckets = [...(await getTimeBuckets({ isFavorite: true }))].sort((left, right) =>
      right.timeBucket.localeCompare(left.timeBucket),
    );
    const assetIds: string[] = [];

    const loadOne = async (timeBucket: string) => {
      try {
        const chunk = await getTimeBucket({ timeBucket, isFavorite: true });
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

  async syncMineFromImmich(assetIds?: string[]): Promise<void> {
    try {
      let ids = assetIds;
      if (!ids) {
        ids = await this.loadFavoriteBuckets(() => undefined);
      }
      this.apply(await syncPartnerFavorites(ids));
    } catch (error) {
      console.warn('[partner-favorites] sync from Immich failed', error);
      await this.load();
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
