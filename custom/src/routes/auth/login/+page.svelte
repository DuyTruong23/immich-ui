<script lang="ts">
  import { getAppConfig } from '@photo-gallery/config';
  import { applyDevRole, isUiDevMode, type UiDevRole } from '$custom/hooks/ui-dev-mode';
  import { storeAccessToken } from '$custom/hooks/access-token';
  import { loadFeatureUpdatesForDisplay } from '$custom/constants/feature-updates';
  import FeatureUpdateModal from '../../FeatureUpdateModal.svelte';
  import { notifyAdminOnLogin } from '$custom/hooks/login-notify';
  import { markSessionActive } from '$custom/hooks/session-auth';
  import { enableAdminSessionPersistence, markSessionExpiry } from '$custom/hooks/session-expiry';
  import { goto } from '$app/navigation';
  import AuthPageLayout from '$lib/components/layouts/AuthPageLayout.svelte';
  import { authManager } from '$lib/managers/auth-manager.svelte';
  import { eventManager } from '$lib/managers/event-manager.svelte';
  import { featureFlagsManager } from '$lib/managers/feature-flags-manager.svelte';
  import { serverConfigManager } from '$lib/managers/server-config-manager.svelte';
  import { Route } from '$lib/route';
  import { oauth } from '$lib/utils';
  import { getServerErrorMessage, handleError } from '$lib/utils/handle-error';
  import { login, type LoginResponseDto } from '@immich/sdk';
  import { Alert, Button, Field, Icon, IconButton, Input, Stack, Text, modalManager } from '@immich/ui';
  import { mdiAccountCog, mdiAccountOutline, mdiEyeOffOutline, mdiEyeOutline, mdiPalette } from '@mdi/js';
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  let errorMessage: string = $state('');
  let email = $state('');
  let password = $state('');
  let oauthError = $state('');
  let loading = $state(false);
  let oauthLoading = $state(featureFlagsManager.value.oauth);
  let loadingRole = $state<UiDevRole | null>(null);
  let passwordVisible = $state(false);
  let blockAutofill = $state(true);

  const serverConfig = $derived(serverConfigManager.value);
  const passwordToggleLabel = $derived(passwordVisible ? $t('hide_password') : $t('show_password'));

  const unlockAutofill = () => {
    blockAutofill = false;
  };
  const { publicEnv } = getAppConfig();

  const enterAs = async (role: UiDevRole) => {
    loadingRole = role;
    applyDevRole(role);
    if (role === 'admin') {
      enableAdminSessionPersistence();
    }
    await goto(data.continueUrl, { invalidateAll: true });
    eventManager.emit('AuthLogin', {
      accessToken: `dev-${role}`,
      isAdmin: role === 'admin',
    } as LoginResponseDto);
  };

  const previewFeatureModal = async () => {
    const config = await loadFeatureUpdatesForDisplay();
    modalManager
      .show(FeatureUpdateModal, {
        version: config.version,
        updates: config.items,
        preview: isUiDevMode(),
      })
      .catch((error) => {
        console.error('[login] previewFeatureModal', error);
      });
  };

  const onSuccess = async (user: LoginResponseDto) => {
    storeAccessToken(user.accessToken);

    if (user.isAdmin) {
      enableAdminSessionPersistence();
      await authManager.refresh();
    } else {
      markSessionExpiry();
      if (publicEnv.sessionOnlyAuth) {
        markSessionActive();
        await authManager.refresh();
      }
    }

    password = '';
    email = '';

    await notifyAdminOnLogin(user.accessToken);
    await goto(data.continueUrl, { invalidateAll: true });
    eventManager.emit('AuthLogin', user);
  };

  const onFirstLogin = () => goto(Route.changePassword());
  const onOnboarding = () => goto(Route.onboarding());

  onMount(async () => {
    if (publicEnv.uiDevMode) {
      oauthLoading = false;
      return;
    }

    if (!featureFlagsManager.value.oauth) {
      oauthLoading = false;
      return;
    }

    if (oauth.isCallback(location)) {
      try {
        const user = await oauth.login(location);

        if (!user.isOnboarded) {
          await onOnboarding();
          return;
        }

        await onSuccess(user);
        return;
      } catch (error) {
        console.error('Error [login-form] [oauth.callback]', error);
        oauthError = getServerErrorMessage(error) || $t('errors.unable_to_complete_oauth_login');
        oauthLoading = false;
        return;
      }
    }

    try {
      if (
        (featureFlagsManager.value.oauthAutoLaunch && !oauth.isAutoLaunchDisabled(location)) ||
        oauth.isAutoLaunchEnabled(location)
      ) {
        await goto(Route.login({ autoLaunch: 0 }), { replaceState: true });
        await oauth.authorize(location);
        return;
      }
    } catch (error) {
      handleError(error, $t('errors.unable_to_connect'));
    }

    oauthLoading = false;
  });

  const handleLogin = async () => {
    try {
      errorMessage = '';
      loading = true;
      const user = await login({ loginCredentialDto: { email, password } });

      if (user.isAdmin && !serverConfig.isOnboarded) {
        await onOnboarding();
        return;
      }

      if (!user.isAdmin && user.shouldChangePassword) {
        await onFirstLogin();
        return;
      }

      if (!user.isOnboarded) {
        await onOnboarding();
        return;
      }

      await onSuccess(user);
      return;
    } catch (error) {
      errorMessage = getServerErrorMessage(error) || $t('errors.incorrect_email_or_password');
      loading = false;
      return;
    }
  };

  const handleOAuthLogin = async () => {
    oauthLoading = true;
    oauthError = '';
    const success = await oauth.authorize(location);
    if (!success) {
      oauthLoading = false;
      oauthError = $t('errors.unable_to_login_with_oauth');
    }
  };

  const onsubmit = async (event: Event) => {
    event.preventDefault();
    await handleLogin();
  };
</script>

<AuthPageLayout title={data.meta.title}>
  {#if publicEnv.uiDevMode}
    <Stack gap={4}>
      <div class="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
        <div class="mb-2 flex items-center gap-2 text-amber-800 dark:text-amber-300">
          <Icon icon={mdiPalette} size="20" />
          <Text fontWeight="medium">UI Dev Mode</Text>
        </div>
        <Text size="small" class="text-(--pg-text-muted)">
          Không cần Docker hay server Immich. Chọn role để xem giao diện — timeline/album sẽ trống, dashboard dùng
          dữ liệu mock.
        </Text>
      </div>

      <Stack gap={3}>
        <Button
          size="large"
          shape="round"
          fullWidth
          loading={loadingRole === 'admin'}
          disabled={loadingRole !== null}
          onclick={() => enterAs('admin')}
        >
          <span class="inline-flex items-center justify-center gap-2">
            <Icon icon={mdiAccountCog} size="20" />
            Vào với Admin
          </span>
        </Button>

        <Button
          size="large"
          shape="round"
          fullWidth
          color="secondary"
          loading={loadingRole === 'user'}
          disabled={loadingRole !== null}
          onclick={() => enterAs('user')}
        >
          <span class="inline-flex items-center justify-center gap-2">
            <Icon icon={mdiAccountOutline} size="20" />
            Vào với User
          </span>
        </Button>
      </Stack>

      <Text size="tiny" class="text-center text-(--pg-text-muted)">
        Tắt chế độ này: dùng `pnpm dev` thay vì `pnpm dev:local`
      </Text>

      <Button size="medium" shape="round" fullWidth color="secondary" onclick={previewFeatureModal}>
        Xem modal "Tính năng được cập nhật"
      </Button>
    </Stack>
  {:else}
    <Stack gap={4}>
      {#if serverConfig.loginPageMessage}
        <Alert color="primary" class="mb-6">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html serverConfig.loginPageMessage}
        </Alert>
      {/if}

      {#if featureFlagsManager.value.passwordLogin}
        <form
          autocomplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-bwignore
          data-form-type="other"
          {onsubmit}
          class="relative flex flex-col gap-4"
          hidden={oauthLoading}
        >
          <!-- Decoy fields — trình duyệt autofill vào đây thay vì ô thật -->
          <input
            type="text"
            name="username"
            autocomplete="username"
            tabindex="-1"
            aria-hidden="true"
            class="pointer-events-none absolute -left-[9999px] size-0 opacity-0"
          />
          <input
            type="password"
            name="password"
            autocomplete="current-password"
            tabindex="-1"
            aria-hidden="true"
            class="pointer-events-none absolute -left-[9999px] size-0 opacity-0"
          />
          <input
            type="password"
            name="prevent-save-password"
            autocomplete="new-password"
            tabindex="-1"
            aria-hidden="true"
            class="pointer-events-none absolute -left-[9999px] size-0 opacity-0"
          />

          {#if errorMessage}
            <Alert color="danger" title={errorMessage} closable />
          {/if}

          <Field label={$t('email')} required="indicator">
            <Input
              id="pg-login-email"
              name="pg-login-email"
              type="text"
              inputmode="email"
              autocapitalize="none"
              autocorrect="off"
              spellcheck={false}
              autocomplete="off"
              readonly={blockAutofill}
              onfocus={unlockAutofill}
              bind:value={email}
            />
          </Field>

          <Field label={$t('password')} required="indicator">
            <Input
              id="pg-login-password"
              name="pg-login-password"
              type={passwordVisible ? 'text' : 'password'}
              autocomplete="off"
              readonly={blockAutofill}
              onfocus={unlockAutofill}
              bind:value={password}
            >
              {#snippet trailingIcon()}
                <IconButton
                  variant="ghost"
                  shape="round"
                  color="secondary"
                  size="small"
                  class="me-1"
                  icon={passwordVisible ? mdiEyeOffOutline : mdiEyeOutline}
                  onclick={() => (passwordVisible = !passwordVisible)}
                  title={passwordToggleLabel}
                  aria-label={passwordToggleLabel}
                />
              {/snippet}
            </Input>
          </Field>

          <Button type="submit" size="large" shape="round" fullWidth {loading} class="mt-6">{$t('to_login')}</Button>
        </form>
      {/if}

      {#if featureFlagsManager.value.oauth}
        {#if featureFlagsManager.value.passwordLogin}
          <div class="relative my-4 inline-flex w-full items-center justify-center">
            <hr class="my-4 h-px w-3/4 border-0 bg-(--md-sys-color-outline-variant)" />
            <span
              class="absolute inset-s-1/2 -translate-x-1/2 bg-(--md-sys-color-surface-container-high) px-3 font-medium text-(--md-sys-color-on-surface-variant) uppercase"
            >
              {$t('or')}
            </span>
          </div>
        {/if}
        {#if oauthError}
          <Alert color="danger" title={oauthError} closable />
        {/if}
        <Button
          shape="round"
          loading={loading || oauthLoading}
          disabled={loading || oauthLoading}
          size="large"
          fullWidth
          color={featureFlagsManager.value.passwordLogin ? 'secondary' : 'primary'}
          onclick={handleOAuthLogin}
        >
          {serverConfig.oauthButtonText}
        </Button>
      {/if}

      {#if !featureFlagsManager.value.passwordLogin && !featureFlagsManager.value.oauth}
        <Alert color="warning" title={$t('login_has_been_disabled')} />
      {/if}
    </Stack>
  {/if}
</AuthPageLayout>
