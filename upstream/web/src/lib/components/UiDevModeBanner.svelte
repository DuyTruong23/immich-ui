<script lang="ts">
  import { getAppConfig } from '@photo-gallery/config';
  import { getStoredDevRole } from '$custom/hooks/ui-dev-mode';

  const { publicEnv } = getAppConfig();
  const role = $derived(getStoredDevRole());
  const label = $derived(role === 'admin' ? 'Admin' : role === 'user' ? 'User' : 'Chưa chọn');
</script>

{#if publicEnv.uiDevMode}
  <div
    class="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-200"
  >
    <span aria-hidden="true">🎨</span>
    <span>UI Dev Mode — role: {label} — không có dữ liệu server thật</span>
  </div>
{/if}
