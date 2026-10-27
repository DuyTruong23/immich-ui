<script lang="ts">
  import { getAppConfig } from '@photo-gallery/config';
  import CalendarHeatmap from '$lib/components/CalendarHeatmap.svelte';
  import UserPageLayout from '$lib/components/layouts/UserPageLayout.svelte';
  import DeviceCard from '$lib/components/user-settings-page/DeviceCard.svelte';
  import {
    mdiCheckCircle,
    mdiCloudUploadOutline,
    mdiDevices,
    mdiImageAlbum,
    mdiImageMultipleOutline,
    mdiInformationOutline,
    mdiServerOff,
    mdiVideoOutline,
  } from '@mdi/js';
  import { Icon } from '@immich/ui';
  import FormatMessage from '$lib/elements/FormatMessage.svelte';
  import { locale } from '$lib/stores/preferences.store';
  import { formatDateTime } from '$lib/utils/date-format';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  const { publicEnv } = getAppConfig();

  const statCards = $derived([
    { id: 'photos', label: $t('photos'), value: data.photoCount.toLocaleString($locale), icon: mdiImageMultipleOutline, tone: 'sky' },
    { id: 'videos', label: $t('videos'), value: data.videoCount.toLocaleString($locale), icon: mdiVideoOutline, tone: 'violet' },
    { id: 'albums', label: $t('albums'), value: data.albumCount.toLocaleString($locale), icon: mdiImageAlbum, tone: 'amber' },
    { id: 'version', label: $t('version'), value: `v${data.serverVersion}`, icon: mdiCheckCircle, tone: 'emerald' },
  ]);

  const toneClass: Record<string, string> = {
    sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
    violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  };

  const activeDeviceGroups = $derived(data.userDeviceGroups.filter((group) => group.sessions.length > 0));

  const formatSessionTime = (iso: string) => formatDateTime(new Date(iso), $locale);

  /** Heatmap rộng hơn khung trên điện thoại: cuộn sẵn tới các tuần mới nhất (cuối lưới) */
  const scrollHeatmapToLatest = (node: HTMLElement) => {
    const scroller = node.querySelector<HTMLElement>('.overflow-x-auto');
    if (scroller) {
      scroller.scrollLeft = scroller.scrollWidth;
    }
  };
</script>

<UserPageLayout title={data.meta.title} description={publicEnv.companyName || $t('pg_dashboard_admin_fallback')}>
  {#snippet buttons()}
    <div
      class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm {data.serverOnline
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
        : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'}"
    >
      <Icon icon={data.serverOnline ? mdiCheckCircle : mdiServerOff} size="16" />
      {data.serverOnline ? $t('pg_dashboard_server_online') : $t('pg_dashboard_server_offline')}
    </div>
  {/snippet}

  <div class="mx-auto max-w-6xl px-2 pb-8 md:px-4 2xl:max-w-7xl">
    <p class="mb-6 text-sm text-(--pg-text-muted)">{$t('pg_dashboard_intro')}</p>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {#each statCards as card (card.id)}
        <article class="rounded-2xl border border-(--pg-border) bg-(--pg-surface-raised) p-5">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-sm font-medium text-(--pg-text-muted)">{card.label}</h2>
            <span class="inline-flex rounded-lg p-2 {toneClass[card.tone]}">
              <Icon icon={card.icon} size="20" />
            </span>
          </div>
          <p class="text-3xl font-semibold tracking-tight">{card.value}</p>
        </article>
      {/each}
    </section>

    <section class="mt-6">
      <article class="rounded-2xl border border-(--pg-border) p-6">
        <div class="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div>
            <h2 class="text-lg font-semibold">{$t('pg_dashboard_storage_title')}</h2>
            <p class="mt-1 text-sm text-(--pg-text-muted)">
              {data.storageUsedLabel} / {data.storageTotalLabel}
              ({data.storagePercent}%)
            </p>
          </div>
          <p class="text-sm text-(--pg-text-muted)">{$t('pg_dashboard_media_usage', { values: { size: data.mediaUsageGiB } })}</p>
        </div>

        <div class="h-3 overflow-hidden rounded-full bg-(--pg-border)">
          <div
            class="h-full rounded-full transition-all {data.storagePercent >= 95
              ? 'bg-red-500'
              : data.storagePercent >= 80
                ? 'bg-amber-500'
                : 'bg-(--pg-primary)'}"
            style="width: {Math.min(data.storagePercent, 100)}%"
          ></div>
        </div>

        <div class="mt-3 flex justify-between text-xs text-(--pg-text-muted)">
          <span>{$t('pg_dashboard_storage_used', { values: { size: data.storageUsedGiB } })}</span>
          <span>{$t('pg_dashboard_storage_total', { values: { size: data.storageTotalGiB } })}</span>
        </div>
      </article>
    </section>

    <section class="mt-6 space-y-6">
      <div>
        <h2 class="text-lg font-semibold">{$t('pg_dashboard_history_title')}</h2>
        <p class="mt-1 text-sm text-(--pg-text-muted)">{$t('pg_dashboard_history_description')}</p>
      </div>

      <article class="rounded-2xl border border-(--pg-border) p-6">
        <div class="mb-2 flex items-center gap-2">
          <Icon icon={mdiCloudUploadOutline} size="22" class="text-(--pg-primary)" />
          <h3 class="text-base font-semibold">{$t('pg_dashboard_upload_history_title')}</h3>
        </div>
        <p class="mb-4 text-sm text-(--pg-text-muted)">{$t('pg_dashboard_upload_history_description')}</p>

        {#if data.uploadHistory}
          <div class="pg-dashboard-heatmap" use:scrollHeatmapToLatest>
            <CalendarHeatmap
              data={data.uploadHistory}
              itemLabel={({ date, count }) => $t('pg_dashboard_upload_day', { values: { count, date } })}
              totalLabel={(count) => $t('pg_dashboard_upload_total', { values: { count } })}
            />
          </div>
        {:else}
          <p class="text-sm text-(--pg-text-muted)">{$t('pg_dashboard_upload_empty')}</p>
        {/if}
      </article>

      <article class="rounded-2xl border border-(--pg-border) p-6">
        <div class="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div class="flex items-center gap-2">
            <Icon icon={mdiDevices} size="22" class="text-(--pg-primary)" />
            <h3 class="text-base font-semibold">{$t('pg_dashboard_devices_title')}</h3>
          </div>
          <span class="text-sm text-(--pg-text-muted)">
            {$t('pg_dashboard_sessions_count', { values: { count: data.totalSessions } })}
          </span>
        </div>
        <p class="mb-4 text-sm text-(--pg-text-muted)">
          {$t('pg_dashboard_devices_description')}
        </p>

        <div class="space-y-6">
          {#each activeDeviceGroups as group (group.user.id)}
            <div class="rounded-xl border border-(--pg-border)/60 p-4">
              <div class="mb-3 flex flex-wrap items-center gap-2">
                <h4 class="font-medium">{group.user.name}</h4>
                <span class="text-sm text-(--pg-text-muted)">{group.user.email}</span>
                {#if group.user.isAdmin}
                  <span class="rounded-full bg-(--pg-primary)/15 px-2 py-0.5 text-xs text-(--pg-primary)">{$t('pg_dashboard_admin_badge')}</span>
                {/if}
              </div>

              <div class="space-y-4">
                {#each group.sessions as session (session.id)}
                  <div class="rounded-lg bg-(--pg-border)/20 px-3 py-2">
                    <DeviceCard {session} />
                    <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 ps-4 text-xs text-(--pg-text-muted) sm:ps-0">
                      <span>{$t('pg_dashboard_session_created', { values: { time: formatSessionTime(session.createdAt) } })}</span>
                      <span
                        >{$t('pg_dashboard_session_expires', {
                          values: { time: session.expiresAt ? formatSessionTime(session.expiresAt) : '—' },
                        })}</span
                      >
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <p class="text-sm text-(--pg-text-muted)">{$t('pg_dashboard_devices_empty')}</p>
          {/each}
        </div>
      </article>

      <article class="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div class="flex gap-3">
          <Icon icon={mdiInformationOutline} size="22" class="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" />
          <div class="space-y-2 text-sm text-(--pg-text-muted)">
            <p class="font-medium text-(--pg-text)">{$t('pg_dashboard_tracking_title')}</p>
            <p>
              <FormatMessage key="pg_dashboard_tracking_storage">
                {#snippet children({ message })}
                  <strong>{message}</strong>
                {/snippet}
              </FormatMessage>
            </p>
            <p>{$t('pg_dashboard_tracking_extend')}</p>
          </div>
        </div>
      </article>
    </section>
  </div>
</UserPageLayout>

<style>
  /* CalendarHeatmap (upstream) co 53 cột vừa khung → ô ~5px trên điện thoại; ép bề rộng tối thiểu để khung overflow-x-auto bên trong cuộn ngang */
  .pg-dashboard-heatmap :global(.grid-flow-col) {
    min-width: 48rem;
  }
</style>
