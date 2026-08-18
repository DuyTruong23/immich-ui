<script lang="ts">
  import { eventManager } from '$lib/managers/event-manager.svelte';
  import type { TimelineManager } from '$lib/managers/timeline-manager/timeline-manager.svelte';
  import { onMount } from 'svelte';

  type Props = {
    timelineManager: TimelineManager;
  };

  let { timelineManager }: Props = $props();

  let refreshing = false;

  const refreshTimeline = async (assetIds: string[]) => {
    if (refreshing) {
      return;
    }

    refreshing = true;
    try {
      await timelineManager.refreshAfterUpload(assetIds);
    } finally {
      refreshing = false;
    }
  };

  onMount(() => {
    return eventManager.on({
      UploadsComplete: ({ assetIds }) => refreshTimeline(assetIds),
      AssetsDateUpdated: ({ assetIds }) => refreshTimeline(assetIds),
    });
  });
</script>
