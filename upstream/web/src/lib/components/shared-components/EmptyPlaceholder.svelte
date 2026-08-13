<script lang="ts">
  import empty1Url from '$lib/assets/empty-1.svg';

  interface Props {
    onClick?: undefined | (() => unknown);
    text: string;
    fullWidth?: boolean;
    src?: string;
    title?: string;
    class?: string;
  }

  let { onClick = undefined, text, fullWidth = false, src = empty1Url, title, class: className }: Props = $props();

  let width = $derived(fullWidth ? 'w-full' : 'w-full max-w-lg sm:w-1/2');

  const hoverClasses = onClick
    ? 'border border-(--md-sys-color-outline-variant) hover:bg-(--md-state-primary-hover)'
    : 'border border-(--md-sys-color-outline-variant)';
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:element
  this={onClick ? 'button' : 'div'}
  type={onClick ? 'button' : undefined}
  onclick={onClick}
  class="{width} {className} flex flex-col place-content-center place-items-center rounded-3xl p-5 {hoverClasses}"
  style:background="var(--md-sys-color-surface-container)"
  style:color="var(--md-sys-color-on-surface)"
>
  <img {src} alt="" width="500" draggable="false" class="max-w-full" />

  {#if title}
    <h2 class="my-4 text-xl font-medium">{title}</h2>
  {/if}
  <p class="text-center font-light" style:color="var(--md-sys-color-on-surface-variant)">{text}</p>
</svelte:element>
