<script lang="ts">
  import { Route } from '$lib/route';
  import { t } from 'svelte-i18n';
</script>

<div
  class="pg-blocked-page flex min-h-dvh w-full items-center justify-center bg-(--md-sys-color-surface) text-(--md-sys-color-on-surface)"
>
  <div class="flex flex-col items-center gap-6 text-center">
    <h1 class="text-2xl font-semibold">{$t('pg_blocked_title')}</h1>
    <a
      href={Route.logout()}
      class="inline-flex min-h-11 items-center justify-center rounded-full border border-(--md-sys-color-outline) px-6 text-base font-medium text-(--md-sys-color-primary) hover:bg-(--md-state-on-surface-hover)"
    >
      {$t('log_out')}
    </a>
  </div>
</div>

<style>
  /* Chừa notch / home indicator (PWA standalone, viewport-fit=cover) */
  .pg-blocked-page {
    box-sizing: border-box;
    padding: max(1.5rem, env(safe-area-inset-top, 0px)) max(1rem, env(safe-area-inset-right, 0px))
      max(1.5rem, env(safe-area-inset-bottom, 0px)) max(1rem, env(safe-area-inset-left, 0px));
  }
</style>
