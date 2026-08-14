import { getTimeBucket, getTimeBuckets } from '@immich/sdk';
import {
  fetchPartnerFavorites,
  setPartnerFavorite,
  setShareFavoritesWithEveryone,
  syncPartnerFavorites,
  type PartnerFavoriteItem,
  type PartnerFavoriteUser,
  type PartnerFavoritesResponse,
} from '$custom/api/partner-favorites';

class PartnerFavoritesStore {
  loaded = $state(false);
  loading = $state(false);
  me = $state<PartnerFavoriteUser | null>(null);
  partners = $state<PartnerFavoriteUser[]>([]);
  items = $state<PartnerFavoriteItem[]>([]);
  shareWithEveryone = $state(false);

  byAssetId = $derived(new Map(this.items.map((item) => [item.assetId, item])));

  apply(payload: PartnerFavoritesResponse) {
    this.me = payload.me;
    this.partners = payload.partners;
    this.items = payload.items;
    this.shareWithEveryone = payload.shareWithEveryone === true;
    this.loaded = true;
  }

  favoritedBy(assetId: string): PartnerFavoriteUser[] {
    return this.byAssetId.get(assetId)?.favoritedBy ?? [];
  }

  hasMine(assetId: string): boolean {
    const myId = this.me?.id;
    if (!myId) {
      return false;
    }
    return this.favoritedBy(assetId).some((user) => user.id === myId);
  }

  async load(): Promise<void> {
    if (this.loading) {
      return;
    }

    this.loading = true;
    try {
      this.apply(await fetchPartnerFavorites());
    } finally {
      this.loading = false;
    }
  }

  async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      await this.load();
    }
  }

  async syncMineFromImmich(): Promise<void> {
    try {
      const buckets = await getTimeBuckets({ isFavorite: true });
      const chunks = await Promise.all(
        buckets.map((bucket) => getTimeBucket({ timeBucket: bucket.timeBucket, isFavorite: true })),
      );
      const assetIds = chunks.flatMap((chunk) => chunk.id);
      this.apply(await syncPartnerFavorites(assetIds));
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
