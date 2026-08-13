<script lang="ts">
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import PurchaseInfo from '$lib/components/shared-components/side-bar/PurchaseInfo.svelte';
  import ServerStatus from '$lib/components/shared-components/side-bar/ServerStatus.svelte';
  import StorageSpace from '$lib/components/shared-components/side-bar/StorageSpace.svelte';
</script>

{#if authManager.authenticated}
  <div class="mt-auto">
    <StorageSpace />
  </div>
{/if}

<PurchaseInfo />

{#if authManager.authenticated && authManager.user.isAdmin}
  <div class="mt-2 mb-6">
    <ServerStatus />
  </div>
{/if}
