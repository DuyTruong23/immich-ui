<script lang="ts">
  import Image from '$lib/components/Image.svelte';
  import PhotoBlurBackdrop from '$lib/components/asset-viewer/PhotoBlurBackdrop.svelte';
  import { getAssetUrls } from '$lib/utils';
  import type { AssetResponseDto, SharedLinkResponseDto } from '@immich/sdk';

  interface Props {
    asset: AssetResponseDto;
    sharedLink?: SharedLinkResponseDto;
  }

  let { asset, sharedLink }: Props = $props();

  const urls = $derived(getAssetUrls(asset, sharedLink));
</script>

<div class="absolute inset-0" aria-hidden="true">
  <PhotoBlurBackdrop {asset} {sharedLink} />
  <Image src={urls.preview} alt="" class="relative size-full object-contain" draggable="false" />
</div>
