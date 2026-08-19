<script lang="ts">
  import type { SearchDisplayFilters } from '$lib/types';
  import { Text } from '@immich/ui';
  import { t } from 'svelte-i18n';

  type Props = {
    filters: SearchDisplayFilters;
  };

  let { filters = $bindable() }: Props = $props();
</script>

<div id="display-options-selection">
  <fieldset>
    <Text class="mb-2" fontWeight="medium">{$t('display_options')}</Text>

    <div class="pg-search-display-options mt-1">
      <div class="pg-search-display-options__item">
        <input
          type="checkbox"
          id="not-in-album-checkbox"
          class="pg-search-display-options__input focus-visible:ring"
          bind:checked={filters.isNotInAlbum}
        />
        <label for="not-in-album-checkbox" class="pg-search-display-options__label">{$t('not_in_any_album')}</label>
      </div>
      <div class="pg-search-display-options__item">
        <input
          type="checkbox"
          id="archive-checkbox"
          class="pg-search-display-options__input focus-visible:ring"
          bind:checked={filters.isArchive}
        />
        <label for="archive-checkbox" class="pg-search-display-options__label">{$t('archive')}</label>
      </div>
      <div class="pg-search-display-options__item">
        <input
          type="checkbox"
          id="favorites-checkbox"
          class="pg-search-display-options__input focus-visible:ring"
          bind:checked={filters.isFavorite}
        />
        <label for="favorites-checkbox" class="pg-search-display-options__label">{$t('favorites')}</label>
      </div>
    </div>
  </fieldset>
</div>
