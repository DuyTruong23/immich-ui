<script lang="ts">
  import UserAvatar from '$lib/components/shared-components/UserAvatar.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { handleError } from '$lib/utils/handle-error';
  import { createProfileImage, deleteProfileImage } from '@immich/sdk';
  import { Button, FormModal, Stack, toastManager } from '@immich/ui';
  import { mdiImagePlus } from '@mdi/js';
  import { onDestroy } from 'svelte';
  import { t } from 'svelte-i18n';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  let fileInput = $state<HTMLInputElement>();
  let selectedFile = $state<File | undefined>();
  let previewUrl = $state<string | undefined>();
  let uploading = $state(false);

  const hasProfileImage = $derived(authManager.user.profileImagePath !== '');
  const canSubmit = $derived(!!selectedFile && !uploading);

  const revokePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = undefined;
    }
  };

  onDestroy(() => {
    revokePreview();
  });

  const onFileSelected = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toastManager.danger($t('errors.unable_to_upload_file'));
      return;
    }

    revokePreview();
    selectedFile = file;
    previewUrl = URL.createObjectURL(file);
  };

  const prepareProfileImageFile = async (file: File): Promise<File> => {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = objectUrl;
      await img.decode();

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get canvas context.');
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) {
            resolve(result);
            return;
          }
          reject(new Error('Could not create profile image.'));
        }, 'image/jpeg', 0.92);
      });

      return new File([blob], 'profile-picture.jpg', { type: 'image/jpeg' });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const onSubmit = async () => {
    if (!selectedFile) {
      return;
    }

    try {
      uploading = true;
      const file = await prepareProfileImageFile(selectedFile);
      await createProfileImage({ createProfileImageDto: { file } });
      toastManager.primary($t('profile_picture_set'));
      await authManager.refresh();
      onClose();
    } catch (error) {
      handleError(error, $t('errors.unable_to_set_profile_picture'));
    } finally {
      uploading = false;
    }
  };

  const onRemove = async () => {
    if (!hasProfileImage) {
      return;
    }

    try {
      uploading = true;
      await deleteProfileImage();
      toastManager.primary($t('saved_profile'));
      await authManager.refresh();
      onClose();
    } catch (error) {
      handleError(error, $t('errors.unable_to_save_profile'));
    } finally {
      uploading = false;
    }
  };

  const openFilePicker = () => {
    fileInput?.click();
  };
</script>

<FormModal
  title={$t('edit_avatar')}
  size="small"
  icon={mdiImagePlus}
  {onClose}
  {onSubmit}
  disabled={!canSubmit}
  submitText={$t('save')}
>
  <Stack gap={4}>
    <div class="flex justify-center">
      <div
        class="relative flex aspect-square w-32 overflow-hidden rounded-full border-4 border-immich-primary bg-immich-dark-primary dark:border-immich-dark-primary dark:bg-immich-primary"
      >
        {#if previewUrl}
          <img src={previewUrl} alt={$t('edit_avatar')} class="size-full object-cover" draggable="false" />
        {:else}
          <UserAvatar user={authManager.user} size="full" noTitle />
        {/if}
      </div>
    </div>

    <input
      bind:this={fileInput}
      type="file"
      accept="image/*"
      class="hidden"
      onchange={onFileSelected}
    />

    <Button
      shape="round"
      color="secondary"
      fullWidth
      leadingIcon={mdiImagePlus}
      disabled={uploading}
      onclick={openFilePicker}
    >
      {$t('upload')}
    </Button>

    {#if hasProfileImage}
      <div class="flex justify-center">
        <Button shape="round" color="danger" variant="ghost" size="small" disabled={uploading} onclick={onRemove}>
          {$t('remove')}
        </Button>
      </div>
    {/if}
  </Stack>
</FormModal>
