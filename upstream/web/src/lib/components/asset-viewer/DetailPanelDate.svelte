<script lang="ts">
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import AssetChangeDateModal from '$lib/modals/AssetChangeDateModal.svelte';
  import { locale } from '$lib/stores/preferences.store';
  import {
    formatDateParts,
    formatTimeParts,
    isVietnameseLocale,
    resolveFormatLocale,
  } from '$lib/utils/date-format';
  import { fromISODateTime, fromISODateTimeUTC, toTimelineAsset } from '$lib/utils/timeline-util';
  import { type AssetResponseDto } from '@immich/sdk';
  import { Icon, modalManager } from '@immich/ui';
  import { mdiCalendar, mdiPencil } from '@mdi/js';
  import { t } from 'svelte-i18n';

  type Props = {
    asset: AssetResponseDto;
  };

  const { asset }: Props = $props();

  const timeZone = $derived(asset.exifInfo?.timeZone ?? undefined);
  const dateTime = $derived(
    timeZone && asset.exifInfo?.dateTimeOriginal
      ? fromISODateTime(asset.exifInfo.dateTimeOriginal, timeZone)
      : fromISODateTimeUTC(asset.localDateTime),
  );
  const isOwner = $derived(authManager.authenticated && asset.ownerId === authManager.user.id);
  const resolvedLocale = $derived(resolveFormatLocale($locale));

  const dateLabel = $derived(
    isVietnameseLocale($locale)
      ? formatDateParts({ year: dateTime.year, month: dateTime.month, day: dateTime.day }, $locale)
      : dateTime.toLocaleString({ month: 'short', day: 'numeric', year: 'numeric' }, { locale: resolvedLocale }),
  );

  const timeLabel = $derived(
    isVietnameseLocale($locale)
      ? [formatTimeParts({ hour: dateTime.hour, minute: dateTime.minute, second: dateTime.second }, $locale), timeZone ? dateTime.toFormat('ZZZZ') : '']
          .filter(Boolean)
          .join(' ')
      : dateTime.toLocaleString(
          {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: timeZone ? 'longOffset' : undefined,
          },
          { locale: resolvedLocale },
        ),
  );

  const handleChangeDate = async () => {
    if (!isOwner) {
      return;
    }

    await modalManager.show(AssetChangeDateModal, {
      asset: toTimelineAsset(asset),
      initialDate: dateTime,
      initialTimeZone: timeZone,
    });
  };
</script>

{#if dateTime}
  <button
    type="button"
    class="flex w-full place-items-start justify-between gap-4 py-4 text-start"
    onclick={handleChangeDate}
    title={isOwner ? $t('edit_date') : ''}
    class:hover:text-primary={isOwner}
    data-testid="detail-panel-edit-date-button"
  >
    <div class="flex gap-4">
      <Icon icon={mdiCalendar} size="24" />

      <div>
        <p>
          {dateLabel}
        </p>
        <div class="flex gap-2 text-sm">
          <p>
            {timeLabel}
          </p>
        </div>
      </div>
    </div>

    {#if isOwner}
      <div class="p-1">
        <Icon icon={mdiPencil} size="20" />
      </div>
    {/if}
  </button>
{:else if !dateTime && isOwner}
  <div class="flex place-items-start justify-between gap-4 py-4">
    <div class="flex gap-4">
      <Icon icon={mdiCalendar} size="24" />
    </div>
    <div class="p-1">
      <Icon icon={mdiPencil} size="20" />
    </div>
  </div>
{/if}
