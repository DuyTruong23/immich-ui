<script lang="ts">
  import { browser } from '$app/environment';
  import { mediaQueryManager } from '$lib/stores/media-query-manager.svelte';
  import { Icon } from '@immich/ui';
  import { mdiCellphone, mdiClose } from '@mdi/js';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';

  const STORAGE_KEY = 'pg-pwa-hint-dismissed';

  type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };

  const isStandalone = () => {
    if (!browser) {
      return true;
    }
    return (
      matchMedia('(display-mode: standalone)').matches ||
      matchMedia('(display-mode: fullscreen)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
    );
  };

  const isIosDevice = () => {
    if (!browser) {
      return false;
    }
    const ua = navigator.userAgent;
    return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  const readDismissed = () => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  };

  const isMobile = $derived(mediaQueryManager.pointerCoarse || mediaQueryManager.maxMd);

  let dismissed = $state(readDismissed());
  let standalone = $state(isStandalone());
  let ready = $state(false);
  let installEvent = $state<BeforeInstallPromptEvent | null>(null);
  let ios = $state(false);

  const visible = $derived(ready && isMobile && !standalone && !dismissed);

  const dismiss = () => {
    dismissed = true;
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  };

  const install = async () => {
    if (!installEvent) {
      return;
    }
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') {
        dismiss();
      }
    } catch {
      // user closed the prompt
    }
  };

  onMount(() => {
    ios = isIosDevice();
    standalone = isStandalone();
    if (standalone || readDismissed()) {
      return;
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      installEvent = event as BeforeInstallPromptEvent;
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    const timer = setTimeout(() => {
      ready = true;
    }, 1800);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onPrompt);
    };
  });
</script>

{#if visible}
  <div
    role="status"
    class="flex items-center gap-2 border-b border-white/10 bg-(--md-sys-color-surface-container) px-3 py-1.5 text-(--md-sys-color-on-surface-variant)"
  >
    <Icon icon={mdiCellphone} size="16" class="shrink-0 opacity-80" />
    <p class="min-w-0 flex-1 text-[11px] leading-snug">
      {ios ? $t('pwa_install_hint_ios') : $t('pwa_install_hint_android')}
    </p>
    {#if installEvent}
      <button
        type="button"
        class="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary"
        onclick={() => void install()}
      >
        {$t('pwa_install_action')}
      </button>
    {/if}
    <button
      type="button"
      class="flex size-6 shrink-0 items-center justify-center rounded-full opacity-70 hover:bg-white/10 hover:opacity-100"
      aria-label={$t('close')}
      onclick={dismiss}
    >
      <Icon icon={mdiClose} size="16" />
    </button>
  </div>
{/if}
