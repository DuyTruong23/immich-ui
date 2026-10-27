<script lang="ts">
  import { Icon } from '@immich/ui';
  import { mdiCheckCircle, mdiCircleOutline } from '@mdi/js';

  type Props = {
    selected: boolean;
    /** Hiện nút (hover nhóm ngày, ngày đã chọn, hoặc đang ở chế độ chọn); khi ẩn vẫn focus được bằng bàn phím */
    visible: boolean;
    label: string;
    onSelect: () => void;
  };

  let { selected, visible, label, onSelect }: Props = $props();
</script>

<button
  type="button"
  class={[
    'pg-day-select-toggle flex shrink-0 items-center overflow-hidden transition-all duration-200 ease-out hover:cursor-pointer focus-visible:w-8 pointer-coarse:h-6 pointer-coarse:focus-visible:w-11',
    visible ? 'w-8 pointer-coarse:w-11' : 'w-0',
  ]}
  aria-label={label}
  aria-pressed={selected}
  onclick={onSelect}
>
  {#if selected}
    <Icon icon={mdiCheckCircle} size="24" class="shrink-0 text-primary" />
  {:else}
    <Icon icon={mdiCircleOutline} size="24" class="shrink-0 text-light-500" />
  {/if}
</button>
