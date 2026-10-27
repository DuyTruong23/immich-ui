<script lang="ts">
  import UserAvatar from '$lib/components/shared-components/UserAvatar.svelte';
  import type { UserAvatarColor } from '@immich/sdk';
  import { t } from 'svelte-i18n';

  type LikedByUser = {
    id: string;
    name: string;
    email: string;
    profileImagePath: string;
    profileChangedAt: string;
    avatarColor: UserAvatarColor;
  };

  interface Props {
    users: LikedByUser[];
  }

  let { users }: Props = $props();

  // Chạm/click/Enter để hiện tên — `title` chỉ hiện khi hover chuột, không dùng được trên màn cảm ứng
  let open = $state(false);

  const label = $derived(
    $t('shared_favorites_liked_by', { values: { name: users.map((user) => user.name).join(', ') } }),
  );

  const toggle = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    open = !open;
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      open = false;
    }
  };
</script>

{#if users.length > 0}
  <div class="absolute inset-e-2 bottom-2 z-20">
    {#if open}
      <span
        data-testid="liked-by-caption"
        aria-hidden="true"
        class="absolute inset-e-0 bottom-full mb-1 w-max max-w-[calc(100cqw-1rem)] rounded-lg bg-black/75 px-2 py-1 text-xs text-white"
      >
        {label}
      </span>
    {/if}
    <button
      type="button"
      class="pg-touch-target relative flex rounded-full"
      aria-label={label}
      aria-expanded={open}
      title={label}
      onclick={toggle}
      onblur={() => (open = false)}
      onkeydown={onKeydown}
    >
      {#each users as user, index (user.id)}
        <span
          class="relative rounded-full ring-2 ring-black/50 {index > 0 ? '-ms-2' : ''}"
          style="z-index: {users.length - index}"
        >
          <UserAvatar {user} size="sm" noTitle />
        </span>
      {/each}
    </button>
  </div>
{/if}
