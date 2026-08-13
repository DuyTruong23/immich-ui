<script lang="ts">
  import { showFeatureUpdateModal } from '$lib/utils/show-feature-update-modal';
  import OnEvents from '$lib/components/OnEvents.svelte';
  import type { LoginResponseDto } from '@immich/sdk';

  const onAuthLogin = (user: LoginResponseDto) => {
    if (user.isAdmin) {
      return;
    }

    showFeatureUpdateModal({ accessToken: user.accessToken }).catch((error) => {
      console.error('[FeatureUpdateOnLogin]', error);
    });
  };
</script>

<OnEvents {onAuthLogin} />
