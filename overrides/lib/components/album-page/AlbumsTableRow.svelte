<script lang="ts">
  import { goto } from '$app/navigation';
  import { dateFormats } from '$lib/constants';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { Route } from '$lib/route';
  import { locale } from '$lib/stores/preferences.store';
  import { getContextMenuPositionFromEvent, type ContextMenuPosition } from '$lib/utils/context-menu';
  import { formatDate, isVietnameseLocale, resolveFormatLocale } from '$lib/utils/date-format';
  import { AlbumUserRole, type AlbumResponseDto } from '@immich/sdk';
  import { Icon, IconButton } from '@immich/ui';
  import { mdiDotsVertical, mdiShareVariantOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';

  interface Props {
    album: AlbumResponseDto;
    onShowContextMenu?: ((position: ContextMenuPosition, album: AlbumResponseDto) => unknown) | undefined;
  }

  let { album, onShowContextMenu = undefined }: Props = $props();

  const showContextMenu = (position: ContextMenuPosition) => {
    onShowContextMenu?.(position, album);
  };

  const dateLocaleString = (dateString: string) => {
    const date = new Date(dateString);
    if (isVietnameseLocale($locale)) {
      return formatDate(date, $locale);
    }
    return date.toLocaleDateString(resolveFormatLocale($locale), dateFormats.album);
  };

  const oncontextmenu = (event: MouseEvent) => {
    event.preventDefault();
    showContextMenu({ x: event.x, y: event.y });
  };

  // Link và nút bên trong tự xử lý; chặn stopPropagation ở link sẽ làm router của SvelteKit không bắt được click
  const onRowClick = (event: MouseEvent) => {
    if ((event.target as Element).closest('a, button')) {
      return;
    }
    void goto(Route.viewAlbum(album));
  };

  // iOS không bắn contextmenu khi nhấn giữ và bàn phím không tới được <tr> — cần nút tùy chọn hiển thị sẵn
  const onOptionsClick = (event: MouseEvent) => {
    event.stopPropagation();
    showContextMenu(getContextMenuPositionFromEvent(event));
  };
</script>

<tr
  class="flex w-full place-items-center border-3 border-transparent p-2 text-center odd:bg-subtle/80 even:bg-subtle/20 hover:cursor-pointer hover:border-immich-primary/75 md:px-5 md:py-2 odd:dark:bg-immich-dark-gray/75 even:dark:bg-immich-dark-gray/50 dark:hover:border-immich-dark-primary/75"
  onclick={onRowClick}
  {oncontextmenu}
>
  <td class="text-md flex w-8/12 min-w-0 items-center gap-1 text-start sm:w-4/12 md:w-4/12 xl:w-[30%] 2xl:w-[40%]">
    <!-- Link thật: Tab/Enter mở album, trình đọc màn hình đọc được tên -->
    <a href={Route.viewAlbum(album)} class="min-w-0 truncate rounded-sm">
      {album.albumName}
    </a>
    {#if album.shared}
      <Icon
        icon={mdiShareVariantOutline}
        size="16"
        class="shrink-0 opacity-70"
        title={album.albumUsers.find(({ user: { id } }) => id === authManager.user.id)?.role === AlbumUserRole.Owner
          ? $t('shared_by_you')
          : $t('shared_by_user', {
              values: { user: album.albumUsers[0].user.name },
            })}
      />
    {/if}
    {#if onShowContextMenu}
      <IconButton
        variant="ghost"
        shape="round"
        color="secondary"
        size="small"
        icon={mdiDotsVertical}
        aria-label={$t('show_album_options')}
        class="ms-auto shrink-0"
        onclick={onOptionsClick}
      />
    {/if}
  </td>
  <td class="text-md text-center text-ellipsis sm:w-2/12 md:w-2/12 xl:w-[15%] 2xl:w-[12%]">
    {$t('items_count', { values: { count: album.assetCount } })}
  </td>
  <td class="text-md hidden w-3/12 text-center text-ellipsis sm:block xl:w-[15%] 2xl:w-[12%]">
    {dateLocaleString(album.updatedAt)}
  </td>
  <td class="text-md hidden w-3/12 text-center text-ellipsis sm:block xl:w-[15%] 2xl:w-[12%]">
    {dateLocaleString(album.createdAt)}
  </td>
  <td class="text-md hidden text-center text-ellipsis xl:block xl:w-[15%] 2xl:w-[12%]">
    {#if album.endDate}
      {dateLocaleString(album.endDate)}
    {:else}
      -
    {/if}
  </td>
  <td class="text-md hidden text-center text-ellipsis xl:block xl:w-[15%] 2xl:w-[12%]">
    {#if album.startDate}
      {dateLocaleString(album.startDate)}
    {:else}
      -
    {/if}
  </td>
</tr>
