<script lang="ts">
  import { getDefaultFeatureUpdatesConfig } from '$custom/services/feature-updates.service';
  import { showFeatureUpdateModal } from '$lib/utils/show-feature-update-modal';
  import AdminPageLayout from '$lib/components/layouts/AdminPageLayout.svelte';
  import { Alert, Button, Container, Stack, Text } from '@immich/ui';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  type Props = {
    data: PageData;
  };

  const { data }: Props = $props();

  const config = getDefaultFeatureUpdatesConfig();

  const previewModal = () => {
    showFeatureUpdateModal({
      version: config.version,
      updates: config.items,
      releases: config.releases,
    }).catch((error) => {
      console.error('[feature-updates-admin] preview failed', error);
    });
  };
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

      <Alert
        color="info"
        title={$t('admin.feature_updates_auto_release_title')}
        description={$t('admin.feature_updates_auto_release_description')}
      />

      <Stack gap={3}>
        {#each config.releases ?? [] as release (release.version)}
          <div class="rounded-xl border border-(--md-sys-color-outline-variant) p-3">
            <Text class="mb-2 text-sm font-semibold">{release.version}</Text>
            <ul class="m-0 list-disc ps-5 text-sm text-(--md-sys-color-on-surface-variant)">
              {#each release.items as item (item.title)}
                <li>{item.title}</li>
              {/each}
            </ul>
          </div>
        {/each}
      </Stack>

      <Button shape="round" color="secondary" onclick={previewModal}>
        {$t('admin.feature_updates_preview_modal')}
      </Button>
    </Stack>
  </Container>
</AdminPageLayout>
