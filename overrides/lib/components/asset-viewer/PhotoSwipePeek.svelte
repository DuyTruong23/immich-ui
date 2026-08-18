<script lang="ts">
  import Image from '$lib/components/Image.svelte';
  import PhotoBlurBackdrop from '$lib/components/asset-viewer/PhotoBlurBackdrop.svelte';
  import { containFitFrame } from '$lib/components/asset-viewer/preview-layout';
  import { getAssetUrls } from '$lib/utils';
  import type { AssetResponseDto, SharedLinkResponseDto } from '@immich/sdk';

  interface Props {
    asset: AssetResponseDto;
    sharedLink?: SharedLinkResponseDto;
    containerWidth: number;
    containerHeight: number;
  }

  let { asset, sharedLink, containerWidth, containerHeight }: Props = $props();

  const urls = $derived(getAssetUrls(asset, sharedLink));
  const frame = $derived(containFitFrame(asset, { width: containerWidth, height: containerHeight }));
</script>

<div class="absolute inset-0" aria-hidden="true">
  <PhotoBlurBackdrop {asset} {sharedLink} />
  {#if frame}
    <Image
      src={urls.preview}
      alt=""
      class="absolute max-w-none"
      style="left:{frame.left}px;top:{frame.top}px;width:{frame.width}px;height:{frame.height}px"
      draggable="false"
    />
  {:else}
    <Image src={urls.preview} alt="" class="relative size-full object-contain" draggable="false" />
  {/if}
</div>
