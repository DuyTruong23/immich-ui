<script lang="ts">
  import { getStoredAccessToken } from '$custom/hooks/access-token';
  import {
    getDefaultFeatureUpdatesConfig,
    sendFeatureUpdateNotify,
  } from '$custom/services/feature-updates.service';
  import { showFeatureUpdateModal } from '$lib/utils/show-feature-update-modal';
  import AdminPageLayout from '$lib/components/layouts/AdminPageLayout.svelte';
  import { Alert, Button, Container, Stack, Text, toastManager } from '@immich/ui';
  import { get } from 'svelte/store';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  type Props = {
    data: PageData;
  };

  const { data }: Props = $props();

  const config = getDefaultFeatureUpdatesConfig();
  let sending = $state(false);

  const previewModal = () => {
    showFeatureUpdateModal({
      version: config.version,
      updates: config.items,
      releases: config.releases,
    }).catch((error) => {
      console.error('[feature-updates-admin] preview failed', error);
    });
  };

  const skipMessage = (reason?: string): string => {
    const translate = get(t);
    if (reason === 'no_subscribers') {
      return translate('admin.feature_updates_send_email_skipped_none');
    }
    if (reason === 'already_notified') {
      return translate('admin.feature_updates_send_email_skipped_already');
    }
    if (reason === 'email_not_configured') {
      return translate('admin.feature_updates_send_email_skipped_not_configured');
    }
    return translate('admin.feature_updates_send_email_failed');
  };

  const sendChangelogEmail = async () => {
    if (sending) {
      return;
    }

    const confirmed = window.confirm(
      get(t)('admin.feature_updates_send_email_confirm', { values: { version: config.version } }),
    );
    if (!confirmed) {
      return;
    }

    sending = true;
    try {
      const result = await sendFeatureUpdateNotify({
        version: config.version,
        items: config.items,
        accessToken: getStoredAccessToken(),
      });

      if (result.skipped) {
        toastManager.info(skipMessage(result.reason));
        return;
      }

      toastManager.primary(
        get(t)('admin.feature_updates_send_email_success', {
          values: { sent: result.sent ?? 0, version: result.version ?? config.version },
        }),
      );
    } catch (error) {
      console.error('[feature-updates-admin] notify failed', error);
      toastManager.danger(
        error instanceof Error ? error.message : get(t)('admin.feature_updates_send_email_failed'),
      );
    } finally {
      sending = false;
    }
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

      <div class="flex flex-wrap gap-2">
        <Button shape="round" color="secondary" onclick={previewModal}>
          {$t('admin.feature_updates_preview_modal')}
        </Button>
        <Button shape="round" onclick={sendChangelogEmail} disabled={sending}>
          {sending ? $t('admin.feature_updates_sending_email') : $t('admin.feature_updates_send_email')}
        </Button>
      </div>
    </Stack>
  </Container>
</AdminPageLayout>
