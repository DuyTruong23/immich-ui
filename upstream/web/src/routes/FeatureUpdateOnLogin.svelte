<script lang="ts">
  import { hasSeenFeatureUpdateVersion } from '$custom/hooks/feature-update-seen';
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
        if (hasSeenFeatureUpdateVersion(config.version)) {
          return;
        }

        await showFeatureUpdateModal({
          accessToken: user.accessToken,
        });
      } catch (error) {
        console.error('[FeatureUpdateOnLogin]', error);
      }
    })();
  };
</script>

<OnEvents {onAuthLogin} />
