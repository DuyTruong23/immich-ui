<script lang="ts">
  import Image from '$lib/components/Image.svelte';
  import Thumbhash from '$lib/components/Thumbhash.svelte';
  import { getAssetUrls } from '$lib/utils';
  import { networkManager } from '$lib/utils/mobile-performance.svelte';
  import type { AssetResponseDto, SharedLinkResponseDto } from '@immich/sdk';

  interface Props {
    asset: AssetResponseDto;
    sharedLink?: SharedLinkResponseDto;
    /** Ảnh kề khi vuốt: chỉ thumbhash, không lớp blur 48px — tránh 3 lớp blur full-viewport cùng lúc */
    peek?: boolean;
  }

  let { asset, sharedLink, peek = false }: Props = $props();

  const urls = $derived(getAssetUrls(asset, sharedLink));
  const showPhotoBlur = $derived(networkManager.quality !== 'save-data');
</script>

<div class="pointer-events-none absolute inset-0 overflow-hidden bg-black" aria-hidden="true">
  {#if peek}
    {#if asset.thumbhash}
      <Thumbhash base64ThumbHash={asset.thumbhash} class="absolute inset-0 size-full" />
    {/if}
  {:else}
    <div class="absolute inset-[-22%] saturate-150" style="filter: blur(48px); transform: translateZ(0);">
      {#if asset.thumbhash}
        <Thumbhash base64ThumbHash={asset.thumbhash} class="absolute inset-0 size-full" />
      {/if}
      {#if showPhotoBlur}
        <Image src={urls.thumbnail} alt="" class="absolute inset-0 size-full object-cover" draggable="false" />
      {/if}
    </div>
  {/if}
  <div class="absolute inset-0 bg-black/40"></div>
</div>
