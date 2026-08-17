<script lang="ts">
  import { eventManager } from '$lib/managers/event-manager.svelte';
  import type { TimelineManager } from '$lib/managers/timeline-manager/timeline-manager.svelte';
  import { onMount } from 'svelte';

  type Props = {
    timelineManager: TimelineManager;
  };

  let { timelineManager }: Props = $props();

  let refreshing = false;

  onMount(() => {
    return eventManager.on({
      UploadsComplete: async ({ assetIds }) => {
        if (refreshing) {
          return;
        }

        refreshing = true;
        try {
          await timelineManager.refreshAfterUpload(assetIds);
        } finally {
          refreshing = false;
        }
      },
    });
  });
</script>
