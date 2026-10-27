<script lang="ts">
  import { AlbumGroupBy, albumViewSettings } from '$lib/stores/preferences.store';
  import { collapseAllAlbumGroups, expandAllAlbumGroups, getSelectedAlbumGroupOption } from '$lib/utils/album-utils';
  import { IconButton } from '@immich/ui';
  import { mdiUnfoldLessHorizontal, mdiUnfoldMoreHorizontal } from '@mdi/js';
  import { t } from 'svelte-i18n';

  interface Props {
    albumGroups: string[];
    class?: string;
  }

  let { albumGroups, class: className = '' }: Props = $props();
</script>

<!-- Nút mở/thu gọn tất cả nhóm album (display do nơi dùng quyết định qua class); dùng chung cho thanh công cụ (md+) và hàng cạnh ô tìm kiếm (dưới md) -->
{#if getSelectedAlbumGroupOption($albumViewSettings) !== AlbumGroupBy.None}
  <div class="gap-2 {className}">
    <IconButton
      title={$t('expand_all')}
      onclick={() => expandAllAlbumGroups()}
      variant="ghost"
      color="secondary"
      shape="round"
      icon={mdiUnfoldMoreHorizontal}
      aria-label={$t('expand_all')}
    />
    <IconButton
      title={$t('collapse_all')}
      onclick={() => collapseAllAlbumGroups(albumGroups)}
      variant="ghost"
      color="secondary"
      shape="round"
      icon={mdiUnfoldLessHorizontal}
      aria-label={$t('collapse_all')}
    />
  </div>
{/if}
