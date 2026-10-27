<script lang="ts">
  import { goto } from '$app/navigation';
  import { OpenQueryParam } from '$lib/constants';
  import Portal from '$lib/elements/Portal.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import PurchaseModal from '$lib/modals/PurchaseModal.svelte';
  import { Route } from '$lib/route';
  import { getAccountAge } from '$lib/utils/auth';
  import { handleError } from '$lib/utils/handle-error';
  import { getButtonVisibility } from '$lib/utils/purchase-utils';
  import { updateMyPreferences } from '@immich/sdk';
  import { Button, Icon, IconButton, Logo, modalManager, SupporterBadge } from '@immich/ui';
  import { mdiClose, mdiInformationOutline } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import { SvelteDate } from 'svelte/reactivity';
  import { fade } from 'svelte/transition';

  let showMessage = $state(false);
  let hoverMessage = $state(false);
  let hoverButton = $state(false);

  let showBuyButton = $state(getButtonVisibility());

  const openPurchaseModal = async () => {
    await modalManager.show(PurchaseModal);
    showMessage = false;
  };

  const onButtonHover = () => {
    showMessage = true;
    hoverButton = true;
  };

  const hideButton = async (always: boolean) => {
    const hideBuyButtonUntil = new SvelteDate();

    if (always) {
      hideBuyButtonUntil.setFullYear(2124); // see ya in 100 years
    } else {
      hideBuyButtonUntil.setDate(hideBuyButtonUntil.getDate() + 30);
    }

    try {
      const response = await updateMyPreferences({
        userPreferencesUpdateDto: {
          purchase: {
            hideBuyButtonUntil: hideBuyButtonUntil.toISOString(),
          },
        },
      });

      authManager.setPreferences(response);

      showBuyButton = getButtonVisibility();
      showMessage = false;
    } catch (error) {
      handleError(error, $t('errors.error_hiding_buy_button'));
    }
  };

  $effect(() => {
    if (showMessage && !hoverMessage && !hoverButton) {
      setTimeout(() => {
        if (!hoverMessage && !hoverButton) {
          showMessage = false;
        }
      }, 300);
    }
  });
</script>

<Portal target="body">
  {#if showMessage}
    <dialog
      open
      class="absolute inset-s-64 bottom-19 hidden w-125 rounded-3xl border border-gray-200 bg-gray-50 px-8 py-6 text-black shadow-2xl sidebar:block dark:border-gray-800 dark:bg-immich-dark-gray dark:text-white"
      transition:fade={{ duration: 150 }}
      onmouseover={() => (hoverMessage = true)}
      onmouseleave={() => (hoverMessage = false)}
      onfocus={() => (hoverMessage = true)}
      onblur={() => (hoverMessage = false)}
    >
      <div class="flex place-items-center justify-between">
        <div class="size-10">
          <Logo variant="icon" size="small" />
        </div>
        <IconButton
          shape="round"
          color="secondary"
          variant="ghost"
          icon={mdiClose}
          onclick={() => {
            showMessage = false;
          }}
          aria-label={$t('close')}
          size="medium"
          class="text-immich-dark-gray/85 dark:text-immich-gray"
        />
      </div>

      <h1 class="my-3 text-lg font-medium text-primary">
        {$t('purchase_panel_title')}
      </h1>

      <div class="my-4 text-gray-800 dark:text-white">
        <p>
          {$t('purchase_panel_info_1')}
        </p>
        <br />
        <p>
          {$t('purchase_panel_info_2')}
        </p>
      </div>

      <Button shape="round" class="mt-2" fullWidth onclick={openPurchaseModal}
        >{$t('purchase_button_buy_immich')}</Button
      >
      <div class="mt-3 flex gap-4">
        <Button shape="round" size="small" fullWidth color="secondary" variant="ghost" onclick={() => hideButton(true)}>
          {$t('purchase_button_never_show_again')}
        </Button>
        <Button
          shape="round"
          size="small"
          fullWidth
          color="secondary"
          variant="ghost"
          onclick={() => hideButton(false)}
        >
          {$t('purchase_button_reminder')}
        </Button>
      </div>
    </dialog>
  {/if}
</Portal>

<style>
  dialog {
    margin: 0;
  }
</style>
