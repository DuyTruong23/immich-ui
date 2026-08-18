<script lang="ts">
  import Combobox from '$lib/components/shared-components/Combobox.svelte';
  import FullScreenLoadingOverlay from '$lib/components/shared-components/FullScreenLoadingOverlay.svelte';
  import DateInput from '$lib/elements/DateInput.svelte';
  import type { TimelineAsset } from '$lib/managers/timeline-manager/types';
  import { getPreferredTimeZone, getTimezones, toIsoDate } from '$lib/modals/timezone-utils';
  import { handleError } from '$lib/utils/handle-error';
  import { updateAsset } from '@immich/sdk';
  import { FormModal, Label } from '@immich/ui';
  import { mdiCalendarEdit } from '@mdi/js';
  import { DateTime } from 'luxon';
  import { t } from 'svelte-i18n';

  interface Props {
    initialDate?: DateTime;
    initialTimeZone?: string;
    timezoneInput?: boolean;
    asset: TimelineAsset;
    onClose: (success: boolean) => void;
  }

  let { initialDate = DateTime.now(), initialTimeZone, timezoneInput = true, asset, onClose }: Props = $props();

  let selectedDate = $state(initialDate.toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS"));
  const timezones = $derived(getTimezones(selectedDate));

  let selectedOption = $state(getPreferredTimeZone(initialDate, initialTimeZone, getTimezones(selectedDate)));
  let isSubmitting = $state(false);

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    onClose(false);
  };

  const onSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    (document.activeElement as HTMLElement | undefined)?.blur();

    if (!date.isValid || !selectedOption) {
      onClose(false);
      return;
    }

    // Get the local date/time components from the selected string using neutral timezone
    const isoDate = toIsoDate(selectedDate, selectedOption);
    isSubmitting = true;
    try {
      await updateAsset({ id: asset.id, updateAssetDto: { dateTimeOriginal: isoDate } });
      location.reload();
    } catch (error) {
      isSubmitting = false;
      handleError(error, 'Failed to update original file metadata.');
    }
  };

  const updateSelectedDate = (value: string) => {
    selectedDate = value;

    selectedOption = getPreferredTimeZone(initialDate, initialTimeZone, getTimezones(value), selectedOption);
  };

  // when changing the time zone, assume the configured date/time is meant for that time zone (instead of updating it)
  const date = $derived(DateTime.fromISO(selectedDate, { zone: selectedOption?.value, setZone: true }));
</script>

<FormModal
  title={$t('edit_date_and_time')}
  icon={mdiCalendarEdit}
  onClose={handleClose}
  {onSubmit}
  submitText={$t('confirm')}
  disabled={!date.isValid || !selectedOption || isSubmitting}
  size="small"
>
  <Label for="datetime" class="mb-1 block">{$t('date_and_time')}</Label>
  <DateInput
    class="mb-2 immich-form-input w-full"
    id="datetime"
    type="datetime-local"
    disabled={isSubmitting}
    bind:value={() => selectedDate, updateSelectedDate}
  />
  {#if timezoneInput}
    <div class="w-full">
      <Combobox bind:selectedOption label={$t('timezone')} options={timezones} placeholder={$t('search_timezone')} />
    </div>
  {/if}
</FormModal>
<FullScreenLoadingOverlay visible={isSubmitting} fullscreen />
