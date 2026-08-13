<script lang="ts">
  import { FEATURE_UPDATES } from '$custom/constants/feature-updates';
  import { submitFeedback } from '$custom/hooks/feedback-submit';
  import { Field, Modal, ModalBody, Text, Textarea } from '@immich/ui';
  import { onDestroy, onMount } from 'svelte';

  type Props = {
    onClose: () => void;
    accessToken?: string;
  };

  const { onClose, accessToken }: Props = $props();

  const AUTO_CLOSE_MS = 5000;

  let feedback = $state('');
  let autoClosePaused = $state(false);
  let timerId: ReturnType<typeof setTimeout> | undefined;

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

  const handleClose = () => {
    pauseAutoClose();

    const trimmed = feedback.trim();
    if (trimmed) {
      submitFeedback(trimmed, accessToken);
    }

    onClose();
  };

  onMount(() => {
    timerId = setTimeout(handleClose, AUTO_CLOSE_MS);
  });

  onDestroy(() => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
  });
</script>

<Modal size="medium" title="Tính năng được cập nhật" onClose={handleClose} icon={false}>
  <ModalBody>
    <Text class="text-(--md-sys-color-on-surface-variant)">
      Gallery vừa được cập nhật với các thay đổi sau:
    </Text>

    <ul class="my-4 list-disc space-y-2 ps-5 text-sm leading-relaxed">
      {#each FEATURE_UPDATES as item}
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
</Modal>
