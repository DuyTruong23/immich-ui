<script lang="ts" module>
  export const headerId = 'user-page-header';
</script>

<script lang="ts">
  import { useActions, type ActionArray } from '$lib/actions/use-actions';
  import NavigationBar from '$lib/components/shared-components/navigation-bar/NavigationBar.svelte';
  import MobileThumbnailHint from '../shared-components/MobileThumbnailHint.svelte';
  import PwaInstallHint from '../shared-components/PwaInstallHint.svelte';
  import UiDevModeBanner from '$lib/components/UiDevModeBanner.svelte';
  import UserSidebar from '$lib/components/shared-components/side-bar/UserSidebar.svelte';
  import type { HeaderButtonActionItem } from '$lib/types';
  import { openFileUploadDialog } from '$lib/utils/file-uploader';
  import { Button, ContextMenuButton, HStack, isMenuItemType, type MenuItemType } from '@immich/ui';
  import type { Snippet } from 'svelte';
  import { t } from 'svelte-i18n';
  import { can, isMobileShell } from '$custom/utils/capabilities.svelte';

  interface Props {
    hideNavbar?: boolean;
    title?: string | undefined;
    description?: string | undefined;
    scrollbar?: boolean;
    use?: ActionArray;
    actions?: Array<HeaderButtonActionItem | MenuItemType>;
    sidebar?: Snippet;
    buttons?: Snippet;
    children?: Snippet;
  }

  let {
    hideNavbar = false,
    title = undefined,
    description = undefined,
    scrollbar = true,
    use = [],
    actions = [],
    sidebar,
    buttons,
    children,
  }: Props = $props();

  const enabledActions = $derived(
    actions
      .filter((action): action is HeaderButtonActionItem => !isMenuItemType(action))
      .filter((action) => action.$if?.() ?? true),
  );

  let scrollbarClass = $derived(scrollbar ? 'immich-scrollbar' : 'scrollbar-hidden');
  const canUpload = $derived(can('upload'));
  const mobileShell = $derived(isMobileShell());
  let onUploadClick = $derived(canUpload ? () => openFileUploadDialog() : undefined);
  const showSidebar = $derived(!mobileShell);
  const showPageTitle = $derived(Boolean(title) && !mobileShell);
  const showToolbar = $derived(showPageTitle || Boolean(buttons));
  let hasTitleClass = $derived.by(() => {
    if (mobileShell) {
      return showToolbar ? 'top-16 pg-mobile-content' : 'top-0 pg-mobile-content';
    }
    return showToolbar ? 'top-16 h-[calc(100%-(--spacing(16)))]' : 'top-0 h-full';
  });
</script>

<div class="flex h-dvh flex-col overflow-hidden">
  {#if !hideNavbar}
    <header class="shrink-0">
      <NavigationBar {onUploadClick} />
      <MobileThumbnailHint />
      <PwaInstallHint />
      <UiDevModeBanner />
    </header>
  {/if}
  <div
    tabindex="-1"
    class="relative z-0 grid min-h-0 flex-1 grid-cols-[--spacing(0)_auto] overflow-hidden sidebar:grid-cols-[--spacing(64)_auto]
      {hideNavbar ? 'pt-(--navbar-height) max-md:pt-(--navbar-height-md)' : ''}
      {mobileShell ? 'pg-mobile-shell-main' : ''}"
  >
  {#if showSidebar}
    {#if sidebar}
      {@render sidebar()}
    {:else}
      <UserSidebar />
    {/if}
  {/if}

  <main class="relative z-0 isolate">
    <div class="{scrollbarClass} absolute {hasTitleClass} w-full overflow-y-auto p-2" use:useActions={use}>
      {@render children?.()}
    </div>

    {#if showToolbar}
      <div class="absolute flex h-16 w-full place-items-center justify-between border-b p-2 text-dark">
        <div class="flex items-center gap-2">
          {#if showPageTitle}
            <div class="pe-8 outline-none" tabindex="-1" id={headerId}>{title}</div>
          {/if}
          {#if description}
            <p class="text-sm text-(--md-sys-color-on-surface-variant)">{description}</p>
          {/if}
        </div>

        {@render buttons?.()}

        {#if enabledActions.length > 0}
          <div class="hidden md:block">
            <HStack gap={0}>
              {#each enabledActions as action, i (i)}
                <Button
                  variant="ghost"
                  size="small"
                  color={action.color ?? 'secondary'}
                  leadingIcon={action.icon}
                  onclick={() => action.onAction(action)}
                  title={action.data?.title}
                >
                  {action.title}
                </Button>
              {/each}
            </HStack>
          </div>

          <ContextMenuButton aria-label={$t('open')} items={actions} class="md:hidden" />
        {/if}
      </div>
    {/if}
  </main>
  </div>
</div>
