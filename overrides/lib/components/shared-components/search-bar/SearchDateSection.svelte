<script lang="ts">
  import DateTimeField from '$lib/elements/DateTimeField.svelte';
  import type { SearchDateFilter } from '$lib/types';
  import { Text } from '@immich/ui';
  import { t } from 'svelte-i18n';

  type Props = {
    filters: SearchDateFilter;
  };

  let { filters = $bindable() }: Props = $props();

  let invalid = $derived(filters.takenAfter && filters.takenBefore && filters.takenAfter > filters.takenBefore);
</script>

<div class="flex flex-col gap-1">
  <div id="date-range-selection" class="grid grid-auto-fit-40 gap-5">
    <div>
      <Text class="mb-2" fontWeight="medium">{$t('start_date')}</Text>
      <DateTimeField bind:value={filters.takenAfter} maxDate={filters.takenBefore} />
    </div>

    <div>
      <Text class="mb-2" fontWeight="medium">{$t('end_date')}</Text>
      <DateTimeField bind:value={filters.takenBefore} minDate={filters.takenAfter} />
    </div>
  </div>
  {#if invalid}
    <Text color="danger">{$t('start_date_before_end_date')}</Text>
  {/if}
</div>
