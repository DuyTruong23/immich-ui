<script lang="ts">
  import {
    DEFAULT_FEATURE_UPDATE_ITEMS,
    DEFAULT_FEATURE_UPDATE_VERSION,
    type FeatureUpdatesConfig,
  } from '$custom/constants/feature-updates';
  import type { FeatureUpdateItem } from '$custom/utils/feature-update-items';
  import { showFeatureUpdateModal } from '$lib/utils/show-feature-update-modal';
  import AdminPageLayout from '$lib/components/layouts/AdminPageLayout.svelte';
  import {
    fetchFeatureUpdatesConfig,
    getDefaultFeatureUpdatesConfig,
    invalidateFeatureUpdatesCache,
    saveFeatureUpdatesConfig,
  } from '$custom/services/feature-updates.service';
  import { getStoredAccessToken } from '$custom/hooks/access-token';
  import { Alert, Button, Container, Field, IconButton, Input, Stack, Text, Textarea, toastManager } from '@immich/ui';
  import { mdiArrowDown, mdiArrowUp, mdiPlus, mdiTrashCanOutline } from '@mdi/js';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  type Props = {
    data: PageData;
  };

  const { data }: Props = $props();

  let version = $state(DEFAULT_FEATURE_UPDATE_VERSION);
  let items = $state<FeatureUpdateItem[]>([...DEFAULT_FEATURE_UPDATE_ITEMS]);
  let loading = $state(true);
  let saving = $state(false);
  let errorMessage = $state('');

  const hasValidForm = $derived(
    version.trim().length > 0 && items.some((item) => item.title.trim().length > 0),
  );

  const applyConfig = (config: FeatureUpdatesConfig) => {
    version = config.version;
    items = config.items.length > 0
      ? config.items.map((item) => ({ title: item.title, detail: item.detail ?? '' }))
      : [{ title: '', detail: '' }];
  };

  const loadConfig = async () => {
    loading = true;
    errorMessage = '';

    try {
      applyConfig(await fetchFeatureUpdatesConfig({ force: true }));
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : get(t)('admin.feature_updates_errors_load_failed');
      applyConfig(getDefaultFeatureUpdatesConfig());
    } finally {
      loading = false;
    }
  };

  const addItem = () => {
    items = [...items, { title: '', detail: '' }];
  };

  const removeItem = (index: number) => {
    items = items.filter((_, itemIndex) => itemIndex !== index);
    if (items.length === 0) {
      items = [{ title: '', detail: '' }];
    }
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) {
      return;
    }

    const nextItems = [...items];
    [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
    items = nextItems;
  };

  const resetDefaults = () => {
    applyConfig(getDefaultFeatureUpdatesConfig());
  };

  const previewModal = () => {
    showFeatureUpdateModal({
      version: version.trim(),
      updates: items
        .map((item) => ({
          title: item.title.trim(),
          ...(item.detail?.trim() ? { detail: item.detail.trim() } : {}),
        }))
        .filter((item) => item.title.length > 0),
    }).catch((error) => {
      console.error('[feature-updates-admin] preview failed', error);
    });
  };

  const saveConfig = async () => {
    if (!hasValidForm || saving) {
      return;
    }

    saving = true;
    errorMessage = '';

    try {
      const saved = await saveFeatureUpdatesConfig(
        {
          version: version.trim(),
          items: items
            .map((item) => ({
              title: item.title.trim(),
              ...(item.detail?.trim() ? { detail: item.detail.trim() } : {}),
            }))
            .filter((item) => item.title.length > 0),
        },
        getStoredAccessToken(),
      );

      invalidateFeatureUpdatesCache();
      applyConfig(saved);
      toastManager.success(get(t)('admin.feature_updates_saved_toast'));
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : get(t)('admin.feature_updates_errors_save_failed');
      toastManager.error(errorMessage);
    } finally {
      saving = false;
    }
  };

  onMount(() => {
    void loadConfig();
  });
</script>

<AdminPageLayout breadcrumbs={[{ title: data.meta.title }]}>
  <Container size="medium" center class="my-6 max-w-3xl">
    <Stack gap={4}>
      <div>
        <Text class="text-lg font-semibold">{$t('feature_updates_title')}</Text>
        <Text class="text-(--md-sys-color-on-surface-variant)">
          {$t('admin.feature_updates_page_description')}
        </Text>
      </div>

      {#if errorMessage}
        <Alert color="danger" title={errorMessage} />
      {/if}

      <Alert
        color="info"
        title={$t('admin.feature_updates_auto_release_title')}
        description={$t('admin.feature_updates_auto_release_description')}
      />

      {#if loading}
        <Text class="text-(--md-sys-color-on-surface-variant)">{$t('loading')}</Text>
      {:else}
        <Field label={$t('admin.feature_updates_display_version')}>
          <Input bind:value={version} placeholder="v1.0.3" />
        </Field>

        <Stack gap={3}>
          <Text class="font-medium">{$t('admin.feature_updates_items_heading')}</Text>

          {#each items as item, index (index)}
            <div class="rounded-xl border border-(--md-sys-color-outline-variant) p-3">
              <div class="flex items-start gap-2">
                <div class="min-w-0 flex-1 flex flex-col gap-2">
                  <Input
                    bind:value={items[index].title}
                    grow
                    placeholder={$t('admin.feature_updates_item_title_placeholder')}
                  />
                  <Textarea
                    bind:value={items[index].detail}
                    grow
                    rows={2}
                    placeholder={$t('admin.feature_updates_item_detail_placeholder')}
                  />
                </div>
                <div class="flex shrink-0 gap-1">
                <IconButton
                  shape="round"
                  color="secondary"
                  variant="ghost"
                  size="small"
                  icon={mdiArrowUp}
                  aria-label={$t('admin.feature_updates_move_up')}
                  disabled={index === 0}
                  onclick={() => moveItem(index, -1)}
                />
                <IconButton
                  shape="round"
                  color="secondary"
                  variant="ghost"
                  size="small"
                  icon={mdiArrowDown}
                  aria-label={$t('admin.feature_updates_move_down')}
                  disabled={index === items.length - 1}
                  onclick={() => moveItem(index, 1)}
                />
                <IconButton
                  shape="round"
                  color="secondary"
                  variant="ghost"
                  size="small"
                  icon={mdiTrashCanOutline}
                  aria-label={$t('admin.feature_updates_remove_item')}
                  onclick={() => removeItem(index)}
                />
              </div>
            </div>
            </div>
          {/each}

          <Button leadingIcon={mdiPlus} color="secondary" variant="ghost" onclick={addItem}>
            {$t('admin.feature_updates_add_item')}
          </Button>
        </Stack>

        <div class="flex flex-wrap gap-2 pt-2">
          <Button shape="round" onclick={saveConfig} disabled={!hasValidForm || saving}>
            {saving ? $t('admin.feature_updates_saving') : $t('admin.feature_updates_save')}
          </Button>
          <Button shape="round" color="secondary" onclick={previewModal}>{$t('admin.feature_updates_preview_modal')}</Button>
          <Button shape="round" color="secondary" variant="ghost" onclick={resetDefaults}>
            {$t('admin.feature_updates_restore_defaults')}
          </Button>
        </div>
      {/if}
    </Stack>
  </Container>
</AdminPageLayout>
