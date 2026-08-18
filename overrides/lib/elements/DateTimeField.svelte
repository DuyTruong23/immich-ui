<script lang="ts">
  import DateInput from '$lib/elements/DateInput.svelte';
  import { DateTime } from 'luxon';

  interface Props {
    value?: DateTime;
    minDate?: DateTime;
    maxDate?: DateTime;
    type?: 'date' | 'datetime-local';
    class?: string;
    id?: string;
    onChange?: (date: DateTime | undefined) => void;
  }

  let {
    value = $bindable(),
    minDate,
    maxDate,
    type = 'date',
    class: className = 'immich-form-input w-full',
    id,
    onChange,
  }: Props = $props();

  const toIso = (dt?: DateTime) => {
    if (!dt?.isValid) {
      return '';
    }
    return type === 'date' ? dt.toFormat('yyyy-MM-dd') : dt.toFormat("yyyy-MM-dd'T'HH:mm:ss.SSS");
  };

  const toBound = (dt?: DateTime) => {
    if (!dt?.isValid) {
      return undefined;
    }
    return type === 'date' ? dt.toFormat('yyyy-MM-dd') : dt.toFormat("yyyy-MM-dd'T'HH:mm");
  };

  let iso = $state(toIso(value));

  $effect(() => {
    iso = toIso(value);
  });

  const setIso = (next: string) => {
    iso = next;
    if (!next) {
      value = undefined;
      onChange?.(undefined);
      return;
    }

    const dt = DateTime.fromISO(next);
    value = dt.isValid ? dt : undefined;
    onChange?.(value);
  };
</script>

<DateInput {type} {id} class={className} bind:value={() => iso, setIso} min={toBound(minDate)} max={toBound(maxDate)} />
