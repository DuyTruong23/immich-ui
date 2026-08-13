<script lang="ts">
  import {
    DEFAULT_FEATURE_UPDATE_ITEMS,
    DEFAULT_FEATURE_UPDATE_VERSION,
    type FeatureUpdatesConfig,
  } from '$custom/constants/feature-updates';
  import { showFeatureUpdateModal } from '$lib/utils/show-feature-update-modal';
  import AdminPageLayout from '$lib/components/layouts/AdminPageLayout.svelte';
  import {
    fetchFeatureUpdatesConfig,
    getDefaultFeatureUpdatesConfig,
    invalidateFeatureUpdatesCache,
    saveFeatureUpdatesConfig,
  } from '$custom/services/feature-updates.service';
  import { getStoredAccessToken } from '$custom/hooks/access-token';
  import { Alert, Button, Container, Field, IconButton, Input, Stack, Text, toastManager } from '@immich/ui';
  import { mdiArrowDown, mdiArrowUp, mdiPlus, mdiTrashCanOutline } from '@mdi/js';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';

  type Props = {
    data: PageData;
  };

  const { data }: Props = $props();

  let version = $state(DEFAULT_FEATURE_UPDATE_VERSION);
  let items = $state<string[]>([...DEFAULT_FEATURE_UPDATE_ITEMS]);
  let loading = $state(true);
  let saving = $state(false);
  let errorMessage = $state('');

  const hasValidForm = $derived(version.trim().length > 0 && items.some((item) => item.trim().length > 0));

  const applyConfig = (config: FeatureUpdatesConfig) => {
    version = config.version;
    items = config.items.length > 0 ? [...config.items] : [''];
  };

  const loadConfig = async () => {
    loading = true;
    errorMessage = '';

    try {
      applyConfig(await fetchFeatureUpdatesConfig({ force: true }));
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Không thể tải cấu hình';
      applyConfig(getDefaultFeatureUpdatesConfig());
    } finally {
      loading = false;
    }
  };

  const addItem = () => {
    items = [...items, ''];
  };

  const removeItem = (index: number) => {
    items = items.filter((_, itemIndex) => itemIndex !== index);
    if (items.length === 0) {
      items = [''];
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
      updates: items.map((item) => item.trim()).filter(Boolean),
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
          items: items.map((item) => item.trim()).filter(Boolean),
        },
        getStoredAccessToken(),
      );

      invalidateFeatureUpdatesCache();
      applyConfig(saved);
      toastManager.success('Đã lưu nội dung modal tính năng mới');
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Không thể lưu cấu hình';
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
        <Text class="text-lg font-semibold">Tính năng được cập nhật</Text>
        <Text class="text-(--md-sys-color-on-surface-variant)">
          Tùy chỉnh phiên bản và danh sách hiển thị trong modal sau đăng nhập và nút "Tính năng mới" trên navbar.
        </Text>
      </div>

      {#if errorMessage}
        <Alert color="danger" title={errorMessage} />
      {/if}

      <Alert
        color="info"
        title="Lưu trữ trên Vercel"
        description="Cần cấu hình BLOB_READ_WRITE_TOKEN trên Vercel để lưu thay đổi cho mọi người dùng. Nếu chưa có, trang vẫn xem được nội dung mặc định."
      />

      {#if loading}
        <Text class="text-(--md-sys-color-on-surface-variant)">Đang tải...</Text>
      {:else}
        <Field label="Phiên bản hiển thị">
          <Input bind:value={version} placeholder="v1.0.3" />
        </Field>

        <Stack gap={3}>
          <Text class="font-medium">Các mục tính năng</Text>

          {#each items as item, index (index)}
            <div class="flex items-start gap-2">
              <div class="min-w-0 flex-1">
                <Input bind:value={items[index]} grow placeholder="Mô tả tính năng mới..." />
              </div>
              <div class="flex shrink-0 gap-1">
                <IconButton
                  shape="round"
                  color="secondary"
                  variant="ghost"
                  size="small"
                  icon={mdiArrowUp}
                  aria-label="Di chuyển lên"
                  disabled={index === 0}
                  onclick={() => moveItem(index, -1)}
                />
                <IconButton
                  shape="round"
                  color="secondary"
                  variant="ghost"
                  size="small"
                  icon={mdiArrowDown}
                  aria-label="Di chuyển xuống"
                  disabled={index === items.length - 1}
                  onclick={() => moveItem(index, 1)}
                />
                <IconButton
                  shape="round"
                  color="secondary"
                  variant="ghost"
                  size="small"
                  icon={mdiTrashCanOutline}
                  aria-label="Xóa mục"
                  onclick={() => removeItem(index)}
                />
              </div>
            </div>
          {/each}

          <Button leadingIcon={mdiPlus} color="secondary" variant="ghost" onclick={addItem}>
            Thêm mục
          </Button>
        </Stack>

        <div class="flex flex-wrap gap-2 pt-2">
          <Button shape="round" onclick={saveConfig} disabled={!hasValidForm || saving}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
          <Button shape="round" color="secondary" onclick={previewModal}>Xem thử modal</Button>
          <Button shape="round" color="secondary" variant="ghost" onclick={resetDefaults}>Khôi phục mặc định</Button>
        </div>
      {/if}
    </Stack>
  </Container>
</AdminPageLayout>
