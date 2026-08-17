<script lang="ts">
  import {
    DEFAULT_FEATURE_UPDATE_ITEMS,
    DEFAULT_FEATURE_UPDATE_VERSION,
  } from '$custom/constants/feature-updates';
  import { setHideFeatureUpdateModal, shouldHideFeatureUpdateModal } from '$custom/hooks/feature-update-seen';
  import {
    clearStoredNotifyEmail,
    getDefaultNotifyEmail,
    getStoredNotifyEmail,
    hasConfirmedNotifyEmail,
    isValidNotifyEmail,
    subscribeFeatureUpdateEmail,
    unsubscribeFeatureUpdateEmail,
  } from '$custom/hooks/feature-update-subscribe';
  import { submitFeedback } from '$custom/hooks/feedback-submit';
  import {
    coerceFeatureUpdateItems,
    getFeatureUpdateItemDetail,
    getFeatureUpdateItemTitle,
    itemHasDetail,
    type FeatureUpdateItem,
    type FeatureUpdateRelease,
  } from '$custom/utils/feature-update-items';
  import { Field, Button, HStack, Icon, IconButton, Input, Modal, ModalBody, ModalFooter, Switch, Text, Textarea, toastManager } from '@immich/ui';
  import { mdiCheckCircleOutline, mdiChevronDown, mdiClose } from '@mdi/js';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t } from 'svelte-i18n';

  type Props = {
    onClose: () => void;
    accessToken?: string;
    version?: string;
    updates?: readonly FeatureUpdateItem[];
    releases?: readonly FeatureUpdateRelease[];
    preview?: boolean;
    originElement?: HTMLElement | null;
    userId?: string;
    accountEmail?: string;
  };

  const {
    onClose,
    accessToken,
    version = DEFAULT_FEATURE_UPDATE_VERSION,
    updates = DEFAULT_FEATURE_UPDATE_ITEMS,
    releases,
    preview = false,
    originElement = null,
    userId,
  }: Props = $props();

  const CLOSE_MS = 200;
  const MODAL_CLASS = 'pg-feature-update-modal';

  let feedback = $state('');
  const initialNotifyEmail = getDefaultNotifyEmail();
  let notifyEmail = $state(initialNotifyEmail);
  let lastPersistedEmail = $state(hasConfirmedNotifyEmail() ? getStoredNotifyEmail() : '');
  let sentFeedback = $state(false);
  let savingNotifyEmail = $state(false);
  let hideOnNextLogin = $state(shouldHideFeatureUpdateModal(userId));
  let isClosing = $state(false);
  let expandedItems = $state<ReadonlySet<string>>(new Set());

  const displayReleases = $derived(
    releases && releases.length > 0
      ? releases.map((release) => ({
          version: release.version,
          items: coerceFeatureUpdateItems(release.items),
        }))
      : [{ version, items: coerceFeatureUpdateItems(updates) }],
  );

  const hasFeedback = $derived(feedback.trim().length > 0);
  const hasValidNotifyEmail = $derived(isValidNotifyEmail(notifyEmail));
  const notifyEmailChanged = $derived(
    notifyEmail.trim().toLowerCase() !== initialNotifyEmail.trim().toLowerCase(),
  );
  const emailNeedsSave = $derived(
    notifyEmailChanged &&
      hasValidNotifyEmail &&
      notifyEmail.trim().toLowerCase() !== lastPersistedEmail.trim().toLowerCase(),
  );
  const emailNeedsUnsubscribe = $derived(
    notifyEmailChanged && lastPersistedEmail.trim().length > 0 && notifyEmail.trim().length === 0,
  );
  const emailDirty = $derived(emailNeedsSave || emailNeedsUnsubscribe);
  const canSubmit = $derived(hasFeedback || emailDirty);
  const submitLabel = $derived(
    hasFeedback && emailDirty
      ? $t('feature_updates_save_and_send_feedback')
      : emailDirty
        ? $t('save')
        : $t('feature_updates_send_feedback'),
  );

  const itemKey = (releaseVersion: string, index: number) => `${releaseVersion}:${index}`;

  const toggleItem = (key: string) => {
    const next = new Set(expandedItems);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    expandedItems = next;
  };

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setTransformOrigin = () => {
    const card = document.querySelector<HTMLElement>(`.${MODAL_CLASS}`);
    if (!card || !originElement) {
      return;
    }

    const cardRect = card.getBoundingClientRect();
    const originRect = originElement.getBoundingClientRect();
    const originX = originRect.left + originRect.width / 2 - cardRect.left;
    const originY = originRect.top + originRect.height / 2 - cardRect.top;

    card.style.transformOrigin = `${originX}px ${originY}px`;
  };

  onMount(() => {
    document.documentElement.dataset.featureUpdateModal = 'open';

    requestAnimationFrame(() => {
      requestAnimationFrame(setTransformOrigin);
    });

    return () => {
      delete document.documentElement.dataset.featureUpdateModal;
    };
  });

  const persistNotifyEmail = async (): Promise<boolean> => {
    if (preview || !emailNeedsSave) {
      return true;
    }

    if (savingNotifyEmail) {
      return false;
    }

    savingNotifyEmail = true;
    try {
      await subscribeFeatureUpdateEmail(notifyEmail, accessToken, version, lastPersistedEmail);
      lastPersistedEmail = notifyEmail.trim();
      toastManager.primary(get(t)('feature_updates_notify_email_saved'));
      return true;
    } catch (error) {
      console.error('[feature-update-modal] subscribe failed', error);
      toastManager.danger(
        error instanceof Error ? error.message : get(t)('feature_updates_notify_email_failed'),
      );
      return false;
    } finally {
      savingNotifyEmail = false;
    }
  };

  const persistUnsubscribeEmail = async (): Promise<boolean> => {
    const emailToRemove = lastPersistedEmail.trim();
    if (preview || !emailToRemove) {
      lastPersistedEmail = '';
      if (!preview) {
        clearStoredNotifyEmail();
      }
      return true;
    }

    if (savingNotifyEmail) {
      return false;
    }

    savingNotifyEmail = true;
    try {
      await unsubscribeFeatureUpdateEmail(emailToRemove, accessToken);
      lastPersistedEmail = '';
      toastManager.primary(get(t)('feature_updates_notify_email_cleared'));
      return true;
    } catch (error) {
      console.error('[feature-update-modal] unsubscribe failed', error);
      toastManager.danger(
        error instanceof Error ? error.message : get(t)('feature_updates_notify_email_clear_failed'),
      );
      return false;
    } finally {
      savingNotifyEmail = false;
    }
  };

  const handleClearNotifyEmail = () => {
    if (savingNotifyEmail) {
      return;
    }

    notifyEmail = '';
  };

  const persistHidePreference = () => {
    if (preview) {
      return;
    }

    setHideFeatureUpdateModal(hideOnNextLogin, userId);
  };

  const closeModal = () => {
    if (isClosing) {
      return;
    }

    persistHidePreference();

    isClosing = true;
    document.documentElement.dataset.featureUpdateModal = 'closing';

    if (prefersReducedMotion()) {
      onClose();
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) {
        return;
      }

      finished = true;
      onClose();
    };

    const card = document.querySelector<HTMLElement>(`.${MODAL_CLASS}`);
    const fallbackTimer = window.setTimeout(finish, CLOSE_MS + 40);

    if (!card) {
      return;
    }

    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.target !== card) {
        return;
      }

      card.removeEventListener('animationend', onAnimationEnd);
      window.clearTimeout(fallbackTimer);
      finish();
    };

    card.addEventListener('animationend', onAnimationEnd);
  };

  const handleDismiss = () => {
    if (isClosing || savingNotifyEmail) {
      return;
    }

    closeModal();
  };

  const handleSendFeedback = async () => {
    if (!canSubmit || sentFeedback || savingNotifyEmail) {
      return;
    }

    const trimmed = feedback.trim();
    if (trimmed) {
      submitFeedback(trimmed, accessToken);
      sentFeedback = true;
    }

    if (emailNeedsUnsubscribe) {
      await persistUnsubscribeEmail();
    } else if (emailNeedsSave) {
      await persistNotifyEmail();
    }

    closeModal();
  };
</script>

<Modal
  size="medium"
  title={$t('feature_updates_title')}
  onClose={handleDismiss}
  icon={false}
  class="{MODAL_CLASS}{isClosing ? ` ${MODAL_CLASS}--closing` : ''}"
>
  <ModalBody class="feature-update-body">
    <div class="feature-update-body__header">
      {#if preview}
        <Text size="tiny" class="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-amber-700 dark:text-amber-300">
          {$t('feature_updates_preview_banner')}
        </Text>
      {/if}

      <Text class="text-(--md-sys-color-on-surface-variant)">
        {$t('feature_updates_intro')}
      </Text>
    </div>

    <section class="feature-updates-section feature-updates-section--scroll" aria-label={$t('feature_updates_items_aria')}>
      {#each displayReleases as release, releaseIndex (release.version)}
        {#if releaseIndex > 0}
          <hr class="feature-updates-release__divider" />
        {/if}

        <div class="feature-updates-release">
          <span class="feature-updates-release__version">{release.version}</span>

          <ul class="feature-updates-list">
            {#each release.items as item, index (`${release.version}:${index}`)}
              {@const title = getFeatureUpdateItemTitle(item)}
              {@const detail = getFeatureUpdateItemDetail(item)}
              {@const expandable = itemHasDetail({ title, detail })}
              {@const key = itemKey(release.version, index)}
              {@const expanded = expandedItems.has(key)}
              <li class="feature-updates-item" class:feature-updates-item--expanded={expanded}>
                {#if expandable}
                  <button
                    type="button"
                    class="feature-updates-item__trigger"
                    aria-expanded={expanded}
                    onclick={() => toggleItem(key)}
                  >
                    <span class="feature-updates-item__icon" aria-hidden="true">
                      <Icon icon={mdiCheckCircleOutline} size="18" />
                    </span>
                    <span class="feature-updates-item__text">{title}</span>
                    <span class="feature-updates-item__chevron" aria-hidden="true">
                      <Icon icon={mdiChevronDown} size="20" />
                    </span>
                  </button>
                {:else}
                  <div class="feature-updates-item__static">
                    <span class="feature-updates-item__icon" aria-hidden="true">
                      <Icon icon={mdiCheckCircleOutline} size="18" />
                    </span>
                    <span class="feature-updates-item__text">{title}</span>
                  </div>
                {/if}

                {#if expandable && expanded}
                  <div class="feature-updates-item__detail">{detail}</div>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </section>

    <div class="feature-update-feedback">
      <Field label={$t('feature_updates_feedback_label')}>
        <Textarea
          bind:value={feedback}
          grow
          rows={1}
          placeholder={$t('feature_updates_feedback_placeholder')}
          class="feature-update-feedback__input"
        />
      </Field>
      <Field label={$t('feature_updates_notify_email_label')} class="mt-3">
        <Input
          type="email"
          inputmode="email"
          autocomplete="email"
          bind:value={notifyEmail}
          placeholder={$t('feature_updates_notify_email_placeholder')}
          disabled={savingNotifyEmail}
        >
          {#snippet trailingIcon()}
            {#if notifyEmail}
              <IconButton
                icon={mdiClose}
                size="small"
                variant="ghost"
                shape="round"
                color="secondary"
                class="me-1"
                disabled={savingNotifyEmail}
                onclick={handleClearNotifyEmail}
                aria-label={$t('clear')}
              />
            {/if}
          {/snippet}
        </Input>
      </Field>
      <Text size="tiny" class="mt-1 text-(--md-sys-color-on-surface-variant)">
        {$t('feature_updates_notify_email_hint')}
      </Text>
      <Field label={$t('feature_updates_hide_next_login')} class="mt-3">
        <Switch bind:checked={hideOnNextLogin} />
      </Field>
    </div>
  </ModalBody>

  <ModalFooter class="feature-update-footer">
    <div class="feature-update-footer__inner">
      <p class="feature-update-donate-hint">{$t('feature_updates_donate_hint')}</p>
      <HStack fullWidth gap={3}>
      <Button shape="round" color="secondary" fullWidth onclick={handleDismiss} disabled={savingNotifyEmail}>
        {$t('close')}
      </Button>
      <Button
        shape="round"
        fullWidth
        type="button"
        onclick={handleSendFeedback}
        disabled={!canSubmit || savingNotifyEmail}
      >
        {savingNotifyEmail ? $t('feature_updates_notify_email_saving') : submitLabel}
      </Button>
    </HStack>
    </div>
  </ModalFooter>
</Modal>

<style>
  :global(.pg-feature-update-modal) {
    display: flex;
    flex-direction: column;
    max-height: min(88dvh, 640px);
    overflow: hidden;
  }

  @media (max-width: 767px) {
    :global(html[data-feature-update-modal] [data-dialog-content]),
    :global(html[data-feature-update-modal] [data-slot='dialog-content']),
    :global(html[data-feature-update-modal] [data-bits-dialog-content]) {
      padding: 0 !important;
      max-width: none !important;
      height: 100dvh !important;
      max-height: 100dvh !important;
      border-radius: 0 !important;
    }

    :global(.pg-feature-update-modal) {
      flex: 1 1 auto;
      align-self: stretch;
      width: 100% !important;
      max-width: 100% !important;
      height: 100% !important;
      min-height: 100% !important;
      max-height: 100dvh !important;
      padding-top: env(safe-area-inset-top, 0px);
      padding-bottom: env(safe-area-inset-bottom, 0px);
      border-width: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }
  }

  /* Card inner column — must shrink so footer stays in viewport */
  :global(.pg-feature-update-modal > div) {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
  }

  :global(.pg-feature-update-modal .feature-update-footer) {
    flex-shrink: 0;
  }

  .feature-update-footer__inner {
    display: flex;
    width: 100%;
    flex-direction: column;
    gap: 0.5rem;
  }

  .feature-update-donate-hint {
    margin: 0;
    text-align: center;
    font-size: 0.75rem;
    line-height: 1.4;
    color: var(--md-sys-color-on-surface-variant);
  }

  :global(.pg-feature-update-modal .feature-update-body) {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0;
    min-height: 0;
    overflow: hidden;
  }

  .feature-update-body__header {
    flex-shrink: 0;
  }

  .feature-updates-section--scroll {
    flex: 1 1 auto;
    min-height: 0;
    margin-block: 0.75rem;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  .feature-update-feedback {
    flex-shrink: 0;
    margin: 0;
    padding-top: 0.75rem;
    border-top: 1px solid var(--md-sys-color-outline-variant);
  }

  :global(.feature-update-feedback__input textarea) {
    min-height: 2.5rem;
    max-height: 8rem;
    field-sizing: content;
  }

  .feature-updates-section {
    padding: 0.875rem;
    border-radius: 1rem;
    border: 1px solid var(--md-sys-color-outline-variant);
    background: var(--md-sys-color-surface-container);
  }

  .feature-updates-release {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .feature-updates-release__version {
    display: inline-flex;
    align-self: flex-start;
    border-radius: 999px;
    background: var(--md-sys-color-primary-container);
    padding: 0.125rem 0.625rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--md-sys-color-on-primary-container);
  }

  .feature-updates-release__divider {
    margin: 0.875rem 0;
    border: 0;
    border-top: 1px solid var(--md-sys-color-outline-variant);
  }

  .feature-updates-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .feature-updates-item {
    display: flex;
    flex-direction: column;
    gap: 0;
    border-radius: 0.75rem;
    border-inline-start: 3px solid var(--md-sys-color-primary);
    background: var(--md-sys-color-surface-container-low);
    color: var(--md-sys-color-on-surface);
    font-size: 0.875rem;
    line-height: 1.5;
    overflow: hidden;
  }

  .feature-updates-item__trigger,
  .feature-updates-item__static {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 0.875rem;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: start;
  }

  .feature-updates-item__trigger {
    cursor: pointer;
  }

  .feature-updates-item__trigger:hover {
    background: var(--md-sys-color-surface-container-high);
  }

  .feature-updates-item__trigger:focus-visible {
    outline: 2px solid var(--md-sys-color-primary);
    outline-offset: -2px;
  }

  .feature-updates-item__icon {
    flex-shrink: 0;
    margin-top: 0.125rem;
    color: var(--md-sys-color-primary);
  }

  .feature-updates-item__text {
    flex: 1;
    min-width: 0;
    font-weight: 500;
  }

  .feature-updates-item__chevron {
    flex-shrink: 0;
    margin-top: 0.0625rem;
    color: var(--md-sys-color-on-surface-variant);
    transition: transform var(--md-motion-duration-short, 200ms)
      var(--md-motion-easing-standard, cubic-bezier(0.2, 0, 0, 1));
  }

  .feature-updates-item--expanded .feature-updates-item__chevron {
    transform: rotate(180deg);
  }

  .feature-updates-item__detail {
    padding: 0 0.875rem 0.875rem 2.625rem;
    color: var(--md-sys-color-on-surface-variant);
    font-size: 0.8125rem;
    line-height: 1.55;
    white-space: pre-wrap;
  }

  @media (prefers-reduced-motion: no-preference) {
    .feature-updates-item {
      transition:
        background-color var(--md-motion-duration-short, 200ms)
          var(--md-motion-easing-standard, cubic-bezier(0.2, 0, 0, 1)),
        border-color var(--md-motion-duration-short, 200ms)
          var(--md-motion-easing-standard, cubic-bezier(0.2, 0, 0, 1));
    }

    .feature-updates-item--expanded {
      background: var(--md-sys-color-surface-container);
    }
  }

  :global(html[data-feature-update-modal='open'] [data-dialog-overlay]),
  :global(html[data-feature-update-modal='open'] [data-slot='dialog-overlay']),
  :global(html[data-feature-update-modal='open'] [data-bits-dialog-overlay]) {
    animation: pg-feature-update-backdrop-in var(--md-motion-duration-short, 200ms)
      var(--md-motion-easing-standard, cubic-bezier(0.2, 0, 0, 1)) both;
  }

  :global(html[data-feature-update-modal='closing'] [data-dialog-overlay]),
  :global(html[data-feature-update-modal='closing'] [data-slot='dialog-overlay']),
  :global(html[data-feature-update-modal='closing'] [data-bits-dialog-overlay]) {
    animation: pg-feature-update-backdrop-out 180ms cubic-bezier(0.3, 0, 0.8, 0.15) both;
  }

  :global(.pg-feature-update-modal:not(.pg-feature-update-modal--closing)) {
    will-change: transform, opacity;
    animation: pg-feature-update-content-in var(--md-motion-duration-short, 200ms)
      var(--md-motion-easing-standard, cubic-bezier(0.2, 0, 0, 1)) both;
  }

  :global(.pg-feature-update-modal--closing) {
    will-change: transform, opacity;
    animation: pg-feature-update-content-out 180ms cubic-bezier(0.3, 0, 0.8, 0.15) both;
  }

  @keyframes pg-feature-update-content-in {
    from {
      opacity: 0;
      transform: scale(0.92);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes pg-feature-update-content-out {
    from {
      opacity: 1;
      transform: scale(1);
    }

    to {
      opacity: 0;
      transform: scale(0.94);
    }
  }

  @keyframes pg-feature-update-backdrop-in {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes pg-feature-update-backdrop-out {
    from {
      opacity: 1;
    }

    to {
      opacity: 0;
    }
  }

  @keyframes pg-feature-update-fullscreen-in {
    from {
      opacity: 0;
      transform: translateY(12%);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pg-feature-update-fullscreen-out {
    from {
      opacity: 1;
      transform: translateY(0);
    }

    to {
      opacity: 0;
      transform: translateY(8%);
    }
  }

  @media (max-width: 767px) {
    :global(.pg-feature-update-modal:not(.pg-feature-update-modal--closing)) {
      transform-origin: center bottom;
      animation: pg-feature-update-fullscreen-in var(--md-motion-duration-short, 200ms)
        var(--md-motion-easing-standard, cubic-bezier(0.2, 0, 0, 1)) both;
    }

    :global(.pg-feature-update-modal--closing) {
      transform-origin: center bottom;
      animation: pg-feature-update-fullscreen-out 180ms cubic-bezier(0.3, 0, 0.8, 0.15) both;
    }
  }
</style>
