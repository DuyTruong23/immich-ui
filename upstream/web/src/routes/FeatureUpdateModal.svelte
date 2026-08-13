<script lang="ts">
  import { FEATURE_UPDATES, FEATURE_UPDATE_VERSION } from '$custom/constants/feature-updates';
  import { submitFeedback } from '$custom/hooks/feedback-submit';
  import { Field, Button, HStack, Modal, ModalBody, ModalFooter, Text, Textarea } from '@immich/ui';
  import { onDestroy, onMount } from 'svelte';

  type Props = {
    onClose: () => void;
    accessToken?: string;
    updates?: readonly string[];
    preview?: boolean;
  };

  const { onClose, accessToken, updates = FEATURE_UPDATES, preview = false }: Props = $props();

  const AUTO_CLOSE_MS = 5000;

  let feedback = $state('');
  let autoClosePaused = $state(false);
  let sentFeedback = $state(false);
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const hasFeedback = $derived(feedback.trim().length > 0);

  const pauseAutoClose = () => {
    if (autoClosePaused) {
      return;
    }

    autoClosePaused = true;

    if (timerId !== undefined) {
      clearTimeout(timerId);
      timerId = undefined;
    }
  };

  const handleDismiss = () => {
    pauseAutoClose();
    onClose();
  };

  const handleSendFeedback = () => {
    pauseAutoClose();

    const trimmed = feedback.trim();
    if (!trimmed || sentFeedback) {
      return;
    }

    submitFeedback(trimmed, accessToken);
    sentFeedback = true;
    handleDismiss();
  };

  onMount(() => {
    timerId = setTimeout(handleDismiss, AUTO_CLOSE_MS);
  });

  onDestroy(() => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
  });
</script>

<Modal size="medium" title="Tính năng được cập nhật" onClose={handleDismiss} icon={false}>
  <ModalBody>
    {#if preview}
      <Text size="tiny" class="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-amber-700 dark:text-amber-300">
        Chế độ preview — dữ liệu mock cho local dev
      </Text>
    {/if}

    <span
      class="mb-3 inline-flex rounded-full bg-(--md-sys-color-primary-container) px-2.5 py-0.5 text-xs font-semibold tracking-wide text-(--md-sys-color-on-primary-container)"
    >
      {FEATURE_UPDATE_VERSION}
    </span>

    <Text class="text-(--md-sys-color-on-surface-variant)">
      Gallery vừa được cập nhật với các thay đổi sau:
    </Text>

    <ul class="my-4 list-disc space-y-2 ps-5 text-sm leading-relaxed">
      {#each updates as item}
        <li>{item}</li>
      {/each}
    </ul>

    <Field label="Đóng góp ý kiến">
      <Textarea
        bind:value={feedback}
        grow
        rows={4}
        placeholder="Chia sẻ trải nghiệm hoặc góp ý của bạn..."
        onfocus={pauseAutoClose}
        oninput={pauseAutoClose}
      />
    </Field>

    {#if !autoClosePaused}
      <Text size="tiny" class="mt-3 text-(--md-sys-color-on-surface-variant)">
        Modal sẽ tự đóng sau 5 giây
      </Text>
    {/if}
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
