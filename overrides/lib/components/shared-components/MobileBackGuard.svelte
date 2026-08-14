<script lang="ts">
  import { beforeNavigate } from '$app/navigation';
  import { handleMobileBackNavigation } from '$lib/utils/mobile-back-navigation';

  beforeNavigate(handleMobileBackNavigation);
</script>
