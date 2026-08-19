<script lang="ts">
  import { onMount, type Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();

  onMount(() => {
    document.documentElement.dataset.cookPage = '';
    document.documentElement.removeAttribute('data-mobile-shell');

    return () => {
      delete document.documentElement.dataset.cookPage;
    };
  });
</script>

{@render children?.()}
