<script lang="ts">
  import { locale } from '$lib/stores/preferences.store';
  import { displayToIsoInput, isVietnameseLocale, isoInputToDisplay } from '$lib/utils/date-format';
  import { Icon } from '@immich/ui';
  import { mdiCalendar } from '@mdi/js';
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends HTMLInputAttributes {
    type: 'date' | 'datetime-local';
    value?: string;
    min?: string;
    max?: string;
    class?: string;
    id?: string;
    name?: string;
    placeholder?: string;
    autofocus?: boolean;
    onkeydown?: (e: KeyboardEvent) => void;
  }

  let { type, value = $bindable(), max = undefined, onkeydown, class: className = '', ...rest }: Props = $props();

  let fallbackMax = $derived(type === 'date' ? '9999-12-31' : '9999-12-31T23:59');
  let useVietnamese = $derived(isVietnameseLocale($locale));

  // Updating `value` directly causes the date input to reset itself or
  // interfere with user changes.
  let updatedValue = $derived(value);
  let draft = $state('');
  let lastIso = $state<string | undefined>(undefined);
  let nativeEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (value !== lastIso) {
      lastIso = value;
      draft = isoInputToDisplay(value ?? '', type);
    }
  });

  const commitDraft = () => {
    const parsed = displayToIsoInput(draft, type);
    if (parsed === null) {
      draft = isoInputToDisplay(value ?? '', type);
      return;
    }

    lastIso = parsed;
    value = parsed;
    updatedValue = parsed;
  };

  const onNativeInput = (event: Event) => {
    const next = (event.currentTarget as HTMLInputElement).value;
    lastIso = next;
    value = next;
    updatedValue = next;
    draft = isoInputToDisplay(next, type);
  };

  const openPicker = () => {
    if (rest.readonly || rest.disabled) {
      return;
    }
    nativeEl?.showPicker?.();
  };
</script>

{#if useVietnamese}
  <div class="pg-date-input">
    <input
      {...rest}
      class="pg-date-input__text {className}"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      spellcheck="false"
      placeholder={type === 'date' ? 'dd/mm/yyyy' : 'dd/mm/yyyy hh:mm:ss'}
      bind:value={draft}
      onblur={commitDraft}
      onkeydown={(e) => {
        if (e.key === 'Enter') {
          commitDraft();
        }
        onkeydown?.(e);
      }}
    />
    {#if !rest.readonly && !rest.disabled}
      <button
        type="button"
        class="pg-date-input__picker"
        tabindex="-1"
        aria-label="Chọn ngày"
        onclick={openPicker}
      >
        <Icon icon={mdiCalendar} size="20" />
      </button>
    {/if}
    <input
      bind:this={nativeEl}
      class="pg-date-input__native"
      {type}
      value={value ?? ''}
      min={rest.min}
      max={max || fallbackMax}
      step=".001"
      tabindex="-1"
      aria-hidden="true"
      oninput={onNativeInput}
    />
  </div>
{:else}
  <input
    {...rest}
    {type}
    bind:value
    max={max || fallbackMax}
    oninput={(e) => (updatedValue = e.currentTarget.value)}
    onblur={() => (value = updatedValue)}
    onkeydown={(e) => {
      if (e.key === 'Enter') {
        value = updatedValue;
      }
      onkeydown?.(e);
    }}
    step=".001"
  />
{/if}

<style>
  .pg-date-input {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }

  .pg-date-input__text {
    width: 100%;
    min-width: 0;
    padding-inline-end: 2.25rem;
  }

  .pg-date-input__picker {
    position: absolute;
    inset-inline-end: 0.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--immich-fg, currentColor);
    opacity: 0.7;
    cursor: pointer;
  }

  .pg-date-input__picker:hover {
    opacity: 1;
  }

  .pg-date-input__native {
    position: absolute;
    width: 0;
    height: 0;
    opacity: 0;
    pointer-events: none;
  }
</style>
