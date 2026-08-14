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
        const config = await fetchFeatureUpdatesConfig({ force: true });
        await showFeatureUpdateModal({
          accessToken: user.accessToken,
          version: config.version,
          updates: config.items,
        });
      } catch (error) {
        console.error('[FeatureUpdateOnLogin]', error);
      }
    })();
  };
</script>

<OnEvents {onAuthLogin} />
