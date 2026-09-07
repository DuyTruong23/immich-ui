<script lang="ts">
  import SearchCameraSection from '$lib/components/shared-components/search-bar/SearchCameraSection.svelte';
  import SearchDateSection from '$lib/components/shared-components/search-bar/SearchDateSection.svelte';
  import SearchDisplaySection from '$lib/components/shared-components/search-bar/SearchDisplaySection.svelte';
  import SearchLocationSection from '$lib/components/shared-components/search-bar/SearchLocationSection.svelte';
  import SearchMediaSection from '$lib/components/shared-components/search-bar/SearchMediaSection.svelte';
  import SearchPeopleSection from '$lib/components/shared-components/search-bar/SearchPeopleSection.svelte';
  import SearchRatingsSection from '$lib/components/shared-components/search-bar/SearchRatingsSection.svelte';
  import SearchTagsSection from '$lib/components/shared-components/search-bar/SearchTagsSection.svelte';
  import SearchTextSection from '$lib/components/shared-components/search-bar/SearchTextSection.svelte';
  import { MediaType, QueryType, validQueryTypes } from '$lib/constants';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import type { SearchFilter } from '$lib/types';
  import { asLocalTimeISO, parseUtcDate } from '$lib/utils/date-time';
  import { generateId } from '$lib/utils/generate-id';
  import { lockModalBackgroundScroll, unlockModalBackgroundScroll } from '$lib/utils/modal-scroll-lock';
  import { AssetTypeEnum, AssetVisibility, type MetadataSearchDto, type SmartSearchDto } from '@immich/sdk';
  import { Button, HStack, Modal, ModalBody, ModalFooter } from '@immich/ui';
  import { mdiTune } from '@mdi/js';
  import type { DateTime } from 'luxon';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';
  import { SvelteSet } from 'svelte/reactivity';

  type Props = {
    searchQuery: MetadataSearchDto | SmartSearchDto;
    onClose: (search?: SmartSearchDto | MetadataSearchDto) => void;
  };

  let { searchQuery, onClose }: Props = $props();

  const toStartOfDayDate = (dateString: string) => parseUtcDate(dateString)?.startOf('day') || undefined;
  const formId = generateId();

  const withNullAsEmptyString = <T,>(value: T | null) => (value === null ? '' : value);

  const emptyStringToNull = (value: string | undefined) => (value === '' ? null : value);

  function storeQueryType(type: SearchFilter['queryType']) {
    localStorage.setItem('searchQueryType', type);
  }

  function defaultQueryType(): QueryType {
    const storedQueryType = localStorage.getItem('searchQueryType') as QueryType;
    return validQueryTypes.has(storedQueryType) ? storedQueryType : QueryType.SMART;
  }

  const asFilter = (searchQuery: SmartSearchDto | MetadataSearchDto): SearchFilter => {
    let query = 'query' in searchQuery && searchQuery.query ? searchQuery.query : '';

    if ('originalFileName' in searchQuery && searchQuery.originalFileName) {
      query = searchQuery.originalFileName;
    }

    if ('originalPath' in searchQuery && searchQuery.originalPath) {
      query = searchQuery.originalPath;
    }

    return {
      query,
      ocr: searchQuery.ocr,
      queryType: defaultQueryType(),
      queryAssetId: 'queryAssetId' in searchQuery ? searchQuery.queryAssetId : undefined,
      personIds: new SvelteSet('personIds' in searchQuery ? searchQuery.personIds : []),
      tagIds:
        'tagIds' in searchQuery
          ? searchQuery.tagIds === null
            ? null
            : new SvelteSet(searchQuery.tagIds)
          : new SvelteSet(),
      location: {
        country: withNullAsEmptyString(searchQuery.country),
        state: withNullAsEmptyString(searchQuery.state),
        city: withNullAsEmptyString(searchQuery.city),
      },
      camera: {
        make: withNullAsEmptyString(searchQuery.make),
        model: withNullAsEmptyString(searchQuery.model),
        lensModel: withNullAsEmptyString(searchQuery.lensModel),
      },
      date: {
        takenAfter: searchQuery.takenAfter ? toStartOfDayDate(searchQuery.takenAfter) : undefined,
        takenBefore: searchQuery.takenBefore ? toStartOfDayDate(searchQuery.takenBefore) : undefined,
      },
      display: {
        isArchive: searchQuery.visibility === AssetVisibility.Archive,
        isFavorite: searchQuery.isFavorite ?? false,
        isNotInAlbum: 'isNotInAlbum' in searchQuery ? (searchQuery.isNotInAlbum ?? false) : false,
      },
      mediaType:
        searchQuery.type === AssetTypeEnum.Image
          ? MediaType.Image
          : searchQuery.type === AssetTypeEnum.Video
            ? MediaType.Video
            : MediaType.All,
      rating: searchQuery.rating,
    };
  };

  let filter: SearchFilter = $state(asFilter(searchQuery));

  const resetForm = () => {
    filter = {
      query: '',
      ocr: undefined,
      queryType: defaultQueryType(),
      personIds: new SvelteSet(),
      tagIds: new SvelteSet(),
      location: {},
      camera: {},
      date: {},
      display: {
        isArchive: false,
        isFavorite: false,
        isNotInAlbum: false,
      },
      mediaType: MediaType.All,
      rating: undefined,
    };
  };

  const search = () => {
    let type: AssetTypeEnum | undefined = undefined;
    if (filter.mediaType === MediaType.Image) {
      type = AssetTypeEnum.Image;
    } else if (filter.mediaType === MediaType.Video) {
      type = AssetTypeEnum.Video;
    }

    const query = filter.query || undefined;

    let payload: SmartSearchDto | MetadataSearchDto = {
      query: filter.queryType === 'smart' ? query : undefined,
      queryAssetId: filter.queryAssetId || undefined,
      ocr: filter.queryType === 'ocr' ? query : undefined,
      originalFileName: filter.queryType === 'metadata' ? query : undefined,
      description: filter.queryType === 'description' ? query : undefined,
      originalPath: filter.queryType === 'fullPath' ? filter.query.trim() || undefined : undefined,
      country: emptyStringToNull(filter.location.country),
      state: emptyStringToNull(filter.location.state),
      city: emptyStringToNull(filter.location.city),
      make: emptyStringToNull(filter.camera.make),
      model: emptyStringToNull(filter.camera.model),
      lensModel: emptyStringToNull(filter.camera.lensModel),
      takenAfter: filter.date.takenAfter
        ? asLocalTimeISO(filter.date.takenAfter.startOf('day') as DateTime<true>)
        : undefined,
      takenBefore: filter.date.takenBefore
        ? asLocalTimeISO(filter.date.takenBefore.endOf('day') as DateTime<true>)
        : undefined,
      visibility: filter.display.isArchive ? AssetVisibility.Archive : undefined,
      isFavorite: filter.display.isFavorite || undefined,
      isNotInAlbum: filter.display.isNotInAlbum || undefined,
      personIds: filter.personIds.size > 0 ? [...filter.personIds] : undefined,
      tagIds: filter.tagIds === null ? null : filter.tagIds.size > 0 ? [...filter.tagIds] : undefined,
      type,
      rating: filter.rating,
    };

    onClose(payload);
  };

  const onreset = (event: Event) => {
    event.preventDefault();
    resetForm();
  };

  const onsubmit = (event: Event) => {
    event.preventDefault();
    storeQueryType(filter.queryType);
    search();
  };

  $effect(() => {
    storeQueryType(filter.queryType);
  });

  onMount(() => {
    lockModalBackgroundScroll();
    document.documentElement.dataset.searchFilterModal = 'open';

    return () => {
      unlockModalBackgroundScroll();
      delete document.documentElement.dataset.searchFilterModal;
    };
  });
</script>

<Modal
  icon={mdiTune}
  size="giant"
  title={$t('search_options')}
  class="ant-search-filter-modal"
  {onClose}
>
  <ModalBody class="ant-search-filter-modal__body pg-search-filter-modal__scroll">
    <form id={formId} autocomplete="off" class="ant-search-filter-modal__form" {onsubmit} {onreset}>
      <div class="ant-search-filter-modal__sections" tabindex="-1">
        <section class="ant-search-filter-modal__section">
          <SearchPeopleSection bind:selectedPeople={filter.personIds} />
        </section>

        <section class="ant-search-filter-modal__section">
          <SearchTextSection bind:query={filter.query} bind:queryType={filter.queryType} />
        </section>

        <section class="ant-search-filter-modal__section">
          <SearchTagsSection bind:selectedTags={filter.tagIds} />
        </section>

        <section class="ant-search-filter-modal__section">
          <SearchLocationSection bind:filters={filter.location} />
        </section>

        <section class="ant-search-filter-modal__section">
          <SearchCameraSection bind:filters={filter.camera} />
        </section>

        <section class="ant-search-filter-modal__section">
          <SearchDateSection bind:filters={filter.date} />
        </section>

        {#if authManager.authenticated && authManager.preferences.ratings.enabled}
          <section class="ant-search-filter-modal__section">
            <SearchRatingsSection bind:rating={filter.rating} />
          </section>
        {/if}

        <div class="ant-search-filter-modal__grid">
          <section class="ant-search-filter-modal__section">
            <SearchMediaSection bind:filteredMedia={filter.mediaType} />
          </section>

          <section class="ant-search-filter-modal__section">
            <SearchDisplaySection bind:filters={filter.display} />
          </section>
        </div>
      </div>
    </form>
  </ModalBody>

  <ModalFooter class="ant-search-filter-modal__footer">
    <HStack fullWidth class="ant-search-filter-modal__actions">
      <Button
        shape="rectangle"
        size="large"
        type="reset"
        color="secondary"
        fullWidth
        form={formId}
        class="ant-search-filter-modal__btn ant-search-filter-modal__btn--secondary"
      >
        {$t('clear_all')}
      </Button>
      <Button
        shape="rectangle"
        size="large"
        type="submit"
        fullWidth
        form={formId}
        class="ant-search-filter-modal__btn ant-search-filter-modal__btn--primary"
      >
        {$t('search')}
      </Button>
    </HStack>
  </ModalFooter>
</Modal>

<style>
  :global(.ant-search-filter-modal) {
    display: flex;
    flex-direction: column;
    max-height: min(88dvh, 720px);
    overflow: hidden;
  }

  :global(.ant-search-filter-modal > div) {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
    height: 100%;
  }

  :global(.ant-search-filter-modal .ant-search-filter-modal__body) {
    flex: 1 1 auto !important;
    height: auto !important;
    min-height: 0 !important;
    overflow-y: auto !important;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
  }

  :global(.ant-search-filter-modal .ant-search-filter-modal__footer) {
    flex-shrink: 0;
  }

  @media (max-width: 767px) {
    :global(html[data-search-filter-modal='open'] [data-dialog-content]) {
      display: flex;
      flex-direction: column;
      width: 100% !important;
      max-width: none !important;
      height: 100dvh !important;
      max-height: 100dvh !important;
      padding: 0 !important;
      border-radius: 0 !important;
    }

    :global(html[data-search-filter-modal='open'] [data-dialog-content] > div) {
      justify-content: stretch !important;
      height: 100%;
      min-height: 0;
    }

    :global(html[data-search-filter-modal='open'] .ant-search-filter-modal) {
      flex: 1 1 auto;
      width: 100% !important;
      max-width: 100% !important;
      height: 100% !important;
      max-height: 100dvh !important;
      border-radius: 0 !important;
      border-width: 0 !important;
      box-shadow: none !important;
      padding-top: env(safe-area-inset-top, 0px);
    }
  }
</style>
