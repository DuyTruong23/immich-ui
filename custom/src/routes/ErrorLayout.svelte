<script lang="ts">
  import ServerConnectionErrorPage from '$custom/components/ServerConnectionErrorPage.svelte';
  import {
    getServerConnectionErrorCode,
    isServerConnectionError,
    isStaleChunkError,
  } from '$custom/utils/server-connection-error';
  import { onMount } from 'svelte';
  import BrandLogo from '$lib/components/shared-components/BrandLogo.svelte';
  import { copyToClipboard } from '$lib/utils';
  import {
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    CardTitle,
    Icon,
    IconButton,
    Link,
    Text,
    VStack,
  } from '@immich/ui';
  import { mdiAlarmLight, mdiCodeTags, mdiContentCopy, mdiMessage, mdiPartyPopper } from '@mdi/js';
  import { t } from 'svelte-i18n';

  interface Props {
    error?:
      | ({ message: string; code?: string | number; stack?: string; serverConnectionError?: boolean } & Record<
          string,
          unknown
        >)
      | undefined
      | null;
  }

  let { error = undefined }: Props = $props();

  const showServerConnectionPage = $derived(isServerConnectionError(error));
  const showStaleChunkPage = $derived(isStaleChunkError(error));

  onMount(() => {
    if (!showStaleChunkPage) {
      return;
    }

    const timer = window.setTimeout(() => {
      location.reload();
    }, 250);

    return () => window.clearTimeout(timer);
  });

  const handleCopy = async () => {
    if (!error) {
      return;
    }

    await copyToClipboard(`${error.message} - ${error.code}\n${error.stack}`);
  };
</script>

{#if showStaleChunkPage}
  <div class="pg-server-error" role="status" aria-live="polite">
    <div class="pg-server-error__content">
      <h1 class="pg-server-error__title">Đang tải bản mới</h1>
      <p class="pg-server-error__description">
        Ứng dụng vừa được cập nhật. Trang sẽ tải lại để lấy phiên bản mới.
      </p>
      <button type="button" class="pg-stale-chunk-reload" onclick={() => location.reload()}>Tải lại</button>
    </div>
  </div>
{:else if showServerConnectionPage}
  <ServerConnectionErrorPage code={getServerConnectionErrorCode(error)} message={error?.message} />
{:else}
  <div class="flex h-dvh w-full flex-col">
    <section>
      <div class="flex place-items-center border-b px-6 py-4 dark:border-b-immich-dark-gray">
        <Link href="/photos">
          <BrandLogo variant="inline" />
        </Link>
      </div>
    </section>

    <div class="flex w-full flex-1 place-content-center place-items-center overflow-hidden bg-black/30">
      <div class="max-w-[95vw]">
        <Card color="secondary">
          <CardHeader class="flex-row justify-between gap-12">
            <CardTitle tag="h1" size="medium" class="flex place-items-center gap-4 text-primary">
              <Icon icon={mdiAlarmLight} color="red" size="32" />
              {$t('error_title')}
            </CardTitle>
            <IconButton
              shape="round"
              color="primary"
              icon={mdiContentCopy}
              aria-label={$t('copy_error')}
              onclick={handleCopy}
            />
          </CardHeader>

          <CardBody class="flex flex-col gap-2">
            <Text color="danger">{error?.message} (HTTP {error?.code})</Text>
            {#if error?.stack}
              <label for="stacktrace">{$t('stacktrace')}</label>
              <pre id="stacktrace" class="text-xs">{error.stack}</pre>
            {/if}
          </CardBody>

          <CardFooter class="items-start">
            <Link href="https://discord.immich.app" class="flex grow basis-0 justify-center">
              <VStack>
                <Icon icon={mdiMessage} size="24" />
                <Text size="small" class="text-center">{$t('get_help')}</Text>
              </VStack>
            </Link>
            <Link href="https://github.com/immich-app/immich/releases" class="flex grow basis-0 justify-center">
              <VStack>
                <Icon icon={mdiPartyPopper} size="24" />
                <Text size="small" class="text-center">{$t('read_changelog')}</Text>
              </VStack>
            </Link>
            <Link href="https://docs.immich.app/guides/docker-help" class="flex grow basis-0 justify-center">
              <VStack>
                <Icon icon={mdiCodeTags} size="24" />
                <Text size="small" class="text-center">{$t('check_logs')}</Text>
              </VStack>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  </div>
{/if}
