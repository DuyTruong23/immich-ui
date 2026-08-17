<script lang="ts">
  import { fetchFeatureUpdatesConfig } from '$custom/services/feature-updates.service';
  import { showFeatureUpdateModal } from '$lib/utils/show-feature-update-modal';
  import OnEvents from '$lib/components/OnEvents.svelte';
  import type { LoginResponseDto } from '@immich/sdk';

  const onAuthLogin = (user: LoginResponseDto) => {
    if (user.isAdmin) {
      return;
    }

    void (async () => {
      try {
        await fetchFeatureUpdatesConfig({ force: true });
        await showFeatureUpdateModal({
          accessToken: user.accessToken,
          userId: user.userId,
          accountEmail: user.userEmail,
        });
      } catch (error) {
        console.error('[FeatureUpdateOnLogin]', error);
      }
    })();
  };
</script>

<OnEvents {onAuthLogin} />
