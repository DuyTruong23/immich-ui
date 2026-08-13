<script lang="ts">
  import FeatureUpdateModal from './FeatureUpdateModal.svelte';
  import { getFeatureUpdatesForDisplay } from '$custom/constants/feature-updates';
  import { isUiDevMode } from '$custom/hooks/ui-dev-mode';
  import OnEvents from '$lib/components/OnEvents.svelte';
  import type { LoginResponseDto } from '@immich/sdk';
  import { modalManager } from '@immich/ui';

  const showFeatureUpdateModal = (accessToken?: string) => {
    const preview = isUiDevMode();

    modalManager
      .show(FeatureUpdateModal, {
        accessToken: preview ? undefined : accessToken,
        updates: getFeatureUpdatesForDisplay(),
        preview,
      })
      .catch((error) => {
        console.error('[FeatureUpdateOnLogin]', error);
      });
  };

  const onAuthLogin = (user: LoginResponseDto) => {
    if (user.isAdmin) {
      return;
    }

    showFeatureUpdateModal(user.accessToken);
  };
</script>

<OnEvents {onAuthLogin} />
