<script lang="ts">
  import { getStoredAccessToken } from '$custom/hooks/access-token';
  import {
    fetchFeatureUpdateSubscribers,
    getDefaultFeatureUpdatesConfig,
    sendFeatureUpdateNotify,
  } from '$custom/services/feature-updates.service';
  import { showFeatureUpdateModal } from '$lib/utils/show-feature-update-modal';
  import AdminPageLayout from '$lib/components/layouts/AdminPageLayout.svelte';
  import { Alert, Button, Container, Stack, Text, toastManager } from '@immich/ui';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  type Props = {
    data: PageData;
  };

  const { data }: Props = $props();

  const config = getDefaultFeatureUpdatesConfig();
  let sending = $state(false);
  let loadingSubscribers = $state(false);
  let subscriberEmails = $state<string[]>([]);
  let lastNotifiedVersion = $state<string | null>(null);
  let subscriberStorage = $state<'resend' | 'blob' | 'local' | 'none' | ''>('');
  let subscribersError = $state('');

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

  const loadSubscribers = async () => {
    if (loadingSubscribers) {
      return;
    }

    loadingSubscribers = true;
    subscribersError = '';
    try {
      const result = await fetchFeatureUpdateSubscribers(getStoredAccessToken());
      subscriberEmails = result.emails;
      lastNotifiedVersion = result.lastNotifiedVersion ?? null;
      subscriberStorage = result.storage ?? '';
    } catch (error) {
      console.error('[feature-updates-admin] load subscribers failed', error);
      subscribersError =
        error instanceof Error ? error.message : get(t)('admin.feature_updates_subscribers_load_failed');
    } finally {
      loadingSubscribers = false;
    }
  };

  onMount(() => {
    void loadSubscribers();
  });

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
      void loadSubscribers();
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

      <div class="rounded-xl border border-(--md-sys-color-outline-variant) p-4">
        <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <Text class="text-base font-semibold">{$t('admin.feature_updates_subscribers_title')}</Text>
            <Text size="small" class="text-(--md-sys-color-on-surface-variant)">
              {$t('admin.feature_updates_subscribers_count', { values: { count: subscriberEmails.length } })}
              {#if lastNotifiedVersion}
                · {$t('admin.feature_updates_subscribers_last_notified', {
                  values: { version: lastNotifiedVersion },
                })}
              {/if}
            </Text>
          </div>
          <Button shape="round" color="secondary" size="small" onclick={loadSubscribers} disabled={loadingSubscribers}>
            {loadingSubscribers
              ? $t('admin.feature_updates_subscribers_loading')
              : $t('admin.feature_updates_subscribers_refresh')}
          </Button>
        </div>

        {#if subscriberStorage === 'none'}
          <Alert
            color="warning"
            title={$t('admin.feature_updates_subscribers_need_blob_title')}
            description={$t('admin.feature_updates_subscribers_need_blob')}
          />
        {:else if subscribersError}
          <Alert color="danger" title={$t('admin.feature_updates_subscribers_load_failed')} description={subscribersError} />
        {:else if loadingSubscribers && subscriberEmails.length === 0}
          <Text size="small" class="text-(--md-sys-color-on-surface-variant)">
            {$t('admin.feature_updates_subscribers_loading')}
          </Text>
        {:else if subscriberEmails.length === 0}
          <Text size="small" class="text-(--md-sys-color-on-surface-variant)">
            {$t('admin.feature_updates_subscribers_empty')}
          </Text>
        {:else}
          <ul class="m-0 list-none space-y-1 p-0 text-sm">
            {#each subscriberEmails as email (email)}
              <li class="rounded-lg bg-(--md-sys-color-surface-container) px-3 py-2">{email}</li>
            {/each}
          </ul>
        {/if}
      </div>
    </Stack>
  </Container>
</AdminPageLayout>
