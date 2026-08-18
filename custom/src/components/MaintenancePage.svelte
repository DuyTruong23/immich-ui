<script lang="ts">
  import { formatMaintenanceReturn, getMaintenanceReturnAt } from '$custom/utils/maintenance-return';
  import { locale, t } from 'svelte-i18n';

  const returnAt = getMaintenanceReturnAt();
  const formatted = $derived(formatMaintenanceReturn(returnAt, $locale));
</script>

<div class="pg-maintenance" role="alert" aria-live="polite">
  <div class="pg-maintenance__content">
    <h1 class="pg-maintenance__title">{$t('pg_maintenance_title')}</h1>
    <p class="pg-maintenance__description">
      {$t('pg_maintenance_description', { values: formatted })}
    </p>

    <div class="pg-maintenance__art" aria-hidden="true">
      <svg viewBox="0 0 360 220" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="180" cy="188" rx="118" ry="18" fill="var(--pg-maintenance-shadow)" />
        <path
          d="M72 164c18-34 48-52 88-52s70 18 88 52"
          fill="var(--pg-maintenance-accent-soft)"
          opacity="0.55"
        />
        <rect x="92" y="58" width="176" height="108" rx="14" fill="var(--pg-maintenance-panel)" />
        <rect x="104" y="70" width="152" height="84" rx="8" fill="var(--pg-maintenance-screen)" />
        <circle cx="132" cy="92" r="10" fill="var(--pg-maintenance-accent)" opacity="0.85" />
        <rect x="148" y="86" width="84" height="8" rx="4" fill="var(--pg-maintenance-line)" />
        <rect x="148" y="104" width="64" height="8" rx="4" fill="var(--pg-maintenance-line)" opacity="0.7" />
        <rect x="148" y="122" width="72" height="8" rx="4" fill="var(--pg-maintenance-line)" opacity="0.5" />
        <path
          d="M248 166c0-18 14-32 32-32h8v64h-8c-18 0-32-14-32-32Z"
          fill="var(--pg-maintenance-accent-soft)"
        />
        <circle cx="268" cy="150" r="16" fill="var(--pg-maintenance-accent)" />
        <path
          d="M248 182c8 10 18 16 30 18l-8 18c-16-3-30-12-40-24l18-12Z"
          fill="var(--pg-maintenance-shirt)"
        />
        <path d="M236 176l18-10 12 8-10 14-20-12Z" fill="var(--pg-maintenance-overalls)" />
        <rect x="156" y="166" width="48" height="8" rx="4" fill="var(--pg-maintenance-line)" />
        <path d="M58 74 68 58l10 16-10 8-10-8Z" fill="var(--pg-maintenance-accent)" opacity="0.55" />
        <circle cx="302" cy="72" r="6" fill="var(--pg-maintenance-accent)" opacity="0.45" />
      </svg>
    </div>
  </div>
</div>
