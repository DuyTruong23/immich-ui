<script lang="ts">
  import {
    DEFAULT_FEATURE_UPDATE_ITEMS,
    DEFAULT_FEATURE_UPDATE_VERSION,
  } from '$custom/constants/feature-updates';
  import { submitFeedback } from '$custom/hooks/feedback-submit';
  import { Field, Button, HStack, Icon, Modal, ModalBody, ModalFooter, Text, Textarea } from '@immich/ui';
  import { mdiCheckCircleOutline } from '@mdi/js';
  import { onMount } from 'svelte';

  type Props = {
    onClose: () => void;
    accessToken?: string;
    version?: string;
    updates?: readonly string[];
    preview?: boolean;
    originElement?: HTMLElement | null;
  };

  const {
    onClose,
    accessToken,
    version = DEFAULT_FEATURE_UPDATE_VERSION,
    updates = DEFAULT_FEATURE_UPDATE_ITEMS,
    preview = false,
    originElement = null,
  }: Props = $props();

  const CLOSE_MS = 200;
  const MODAL_CLASS = 'pg-feature-update-modal';

  let feedback = $state('');
  let sentFeedback = $state(false);
  let isClosing = $state(false);

  const hasFeedback = $derived(feedback.trim().length > 0);

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

  const handleDismiss = () => {
    if (isClosing) {
      return;
    }

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

  const handleSendFeedback = () => {
    const trimmed = feedback.trim();
    if (!trimmed || sentFeedback) {
      return;
    }

    submitFeedback(trimmed, accessToken);
    sentFeedback = true;
    handleDismiss();
  };
</script>

<Modal
  size="medium"
  title="Tính năng được cập nhật"
  onClose={handleDismiss}
  icon={false}
  class="{MODAL_CLASS}{isClosing ? ` ${MODAL_CLASS}--closing` : ''}"
>
  <ModalBody>
    {#if preview}
      <Text size="tiny" class="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-amber-700 dark:text-amber-300">
        Chế độ preview — dữ liệu mock cho local dev
      </Text>
    {/if}

    <span
      class="mb-3 inline-flex rounded-full bg-(--md-sys-color-primary-container) px-2.5 py-0.5 text-xs font-semibold tracking-wide text-(--md-sys-color-on-primary-container)"
    >
      {version}
    </span>

    <Text class="text-(--md-sys-color-on-surface-variant)">
      Gallery vừa được cập nhật với các thay đổi sau:
    </Text>

    <section class="feature-updates-section" aria-label="Các mục tính năng">
      <Text class="feature-updates-section__heading">Các mục tính năng</Text>

      <ul class="feature-updates-list">
        {#each updates as item}
          <li class="feature-updates-item">
            <span class="feature-updates-item__icon" aria-hidden="true">
              <Icon icon={mdiCheckCircleOutline} size="18" />
            </span>
            <span class="feature-updates-item__text">{item}</span>
          </li>
        {/each}
      </ul>
    </section>

    <Field label="Đóng góp ý kiến">
      <Textarea
        bind:value={feedback}
        grow
        rows={4}
        placeholder="Chia sẻ trải nghiệm hoặc góp ý của bạn..."
      />
    </Field>
  </ModalBody>

  <ModalFooter>
    <HStack fullWidth gap={3}>
      <Button shape="round" color="secondary" fullWidth onclick={handleDismiss}>Đóng</Button>
      <Button shape="round" fullWidth onclick={handleSendFeedback} disabled={!hasFeedback}>
        Gửi góp ý
      </Button>
    </HStack>
  </ModalFooter>
</Modal>

<style>
  .feature-updates-section {
    margin-block: 1rem 1.25rem;
    padding: 0.875rem;
    border-radius: 1rem;
    border: 1px solid var(--md-sys-color-outline-variant);
    background: var(--md-sys-color-surface-container);
  }

  .feature-updates-section__heading {
    display: block;
    margin-bottom: 0.625rem;
    padding-inline: 0.125rem;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--md-sys-color-primary);
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
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem 0.875rem;
    border-radius: 0.75rem;
    border-inline-start: 3px solid var(--md-sys-color-primary);
    background: var(--md-sys-color-surface-container-low);
    color: var(--md-sys-color-on-surface);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .feature-updates-item__icon {
    flex-shrink: 0;
    margin-top: 0.125rem;
    color: var(--md-sys-color-primary);
  }

  .feature-updates-item__text {
    flex: 1;
    min-width: 0;
  }

  @media (prefers-reduced-motion: no-preference) {
    .feature-updates-item {
      transition:
        background-color var(--md-motion-duration-short, 200ms)
          var(--md-motion-easing-standard, cubic-bezier(0.2, 0, 0, 1)),
        border-color var(--md-motion-duration-short, 200ms)
          var(--md-motion-easing-standard, cubic-bezier(0.2, 0, 0, 1));
    }

    .feature-updates-item:hover {
      background: var(--md-sys-color-surface-container-high);
    }
  }

  :global(html[data-feature-update-modal='open'] [data-dialog-overlay]) {
    animation: pg-feature-update-backdrop-in var(--md-motion-duration-short, 200ms)
      var(--md-motion-easing-standard, cubic-bezier(0.2, 0, 0, 1)) both;
  }

  :global(html[data-feature-update-modal='closing'] [data-dialog-overlay]) {
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
</style>
