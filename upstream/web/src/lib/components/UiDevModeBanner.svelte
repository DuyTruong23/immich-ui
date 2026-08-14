<script lang="ts">
  import { getAppConfig } from '@photo-gallery/config';
  import { getStoredDevRole } from '$custom/hooks/ui-dev-mode';
  import { t } from 'svelte-i18n';

  const { publicEnv } = getAppConfig();
  const role = $derived(getStoredDevRole());
  const roleLabel = $derived(role === 'admin' ? 'Admin' : role === 'user' ? 'User' : null);
</script>

{#if publicEnv.uiDevMode}
  <div
    class="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-200"
  >
    <span aria-hidden="true">🎨</span>
    <span>
      {$t('ui_dev_mode_banner', {
        values: { role: roleLabel ?? $t('ui_dev_mode_role_unselected') },
      })}
    </span>
  </div>
{/if}
