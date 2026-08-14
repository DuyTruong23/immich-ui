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
      errorMessage = error instanceof Error ? error.message : 'Không thể tải cấu hình';
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
          Nội dung mặc định được generate từ commit trên develop khi merge sang main. Trang này ghi đè tạm trên Vercel Blob (cùng version hoặc cao hơn).
        </Text>
      </div>

      {#if errorMessage}
        <Alert color="danger" title={errorMessage} />
      {/if}

      <Alert
        color="info"
        title="Release tự động từ git"
        description="Mỗi lần merge develop → main, CI tăng 0.0.1 và chỉ generate mục UI/UX của user (bỏ admin và thay đổi nội bộ repo). Sửa tại đây chỉ ghi đè bản đang chạy; release mới hơn sẽ thay thế. Cần BLOB_READ_WRITE_TOKEN để lưu override."
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
            <div class="rounded-xl border border-(--md-sys-color-outline-variant) p-3">
              <div class="flex items-start gap-2">
                <div class="min-w-0 flex-1 flex flex-col gap-2">
                  <Input bind:value={items[index].title} grow placeholder="Tiêu đề tính năng..." />
                  <Textarea
                    bind:value={items[index].detail}
                    grow
                    rows={2}
                    placeholder="Hướng dẫn chi tiết (hiện khi user bấm mở rộng)..."
                  />
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
