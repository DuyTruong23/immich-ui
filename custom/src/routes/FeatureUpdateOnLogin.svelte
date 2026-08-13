<script lang="ts">
  import FeatureUpdateModal from './FeatureUpdateModal.svelte';
  import { getAppConfig } from '@photo-gallery/config';
  import OnEvents from '$lib/components/OnEvents.svelte';
  import type { LoginResponseDto } from '@immich/sdk';
  import { modalManager } from '@immich/ui';

  const { publicEnv } = getAppConfig();

  const onAuthLogin = (user: LoginResponseDto) => {
    if (publicEnv.uiDevMode) {
      return;
    }

    modalManager.show(FeatureUpdateModal, { accessToken: user.accessToken }).catch((error) => {
      console.error('[FeatureUpdateOnLogin]', error);
    });
  };
</script>

<OnEvents {onAuthLogin} />
