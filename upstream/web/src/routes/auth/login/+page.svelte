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
  import { onDestroy, onMount } from 'svelte';
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
  let loginFieldsMounted = $state(true);
  let autofillUnlockTimer: ReturnType<typeof setTimeout> | undefined;

  const serverConfig = $derived(serverConfigManager.value);
  const passwordToggleLabel = $derived(passwordVisible ? $t('hide_password') : $t('show_password'));
  const loginIdName = `pg-ident-${Math.random().toString(36).slice(2, 10)}`;
  const loginSecretName = `pg-secret-${Math.random().toString(36).slice(2, 10)}`;

  const unlockAutofill = (event?: Event) => {
    if (!blockAutofill) {
      return;
    }

    if (autofillUnlockTimer !== undefined) {
      clearTimeout(autofillUnlockTimer);
      autofillUnlockTimer = undefined;
    }

    const input = event?.target instanceof HTMLInputElement ? event.target : null;
    input?.removeAttribute('readonly');
    blockAutofill = false;
  };

  const scheduleUnlockAutofill = () => {
    if (!blockAutofill || autofillUnlockTimer !== undefined) {
      return;
    }

    // Chrome quét autofill ngay lúc focus — giữ readonly qua nhịp đó.
    autofillUnlockTimer = setTimeout(() => {
      autofillUnlockTimer = undefined;
      unlockAutofill();
    }, 200);
  };

  const stripPasswordManagerSignals = () => {
    password = '';
    email = '';
    passwordVisible = true;
    loginFieldsMounted = false;
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
        releases: config.releases,
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

    stripPasswordManagerSignals();

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

  onDestroy(() => {
    if (autofillUnlockTimer !== undefined) {
      clearTimeout(autofillUnlockTimer);
    }
  });

  const handleLogin = async () => {
    if (loading) {
      return;
    }

    const creds = { email, password };
    errorMessage = '';
    loading = true;
    stripPasswordManagerSignals();

    try {
      const user = await login({ loginCredentialDto: creds });

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
      email = creds.email;
      loginFieldsMounted = true;
      passwordVisible = false;
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

  const onLoginKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || loading) {
      return;
    }

    event.preventDefault();
    void handleLogin();
  };

  const onFieldKeydown = (event: KeyboardEvent) => {
    unlockAutofill(event);
    onLoginKeydown(event);
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
          {$t('ui_dev_mode_description')}
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
            {$t('ui_dev_mode_enter_admin')}
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
            {$t('ui_dev_mode_enter_user')}
          </span>
        </Button>
      </Stack>

      <Text size="tiny" class="text-center text-(--pg-text-muted)">
        {$t('ui_dev_mode_disable_hint')}
      </Text>

      <Button size="medium" shape="round" fullWidth color="secondary" onclick={previewFeatureModal}>
        {$t('ui_dev_mode_preview_feature_modal')}
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
        <div
          class="relative flex flex-col gap-4"
          hidden={oauthLoading}
          data-1p-ignore
          data-lpignore="true"
          data-bwignore
          data-form-type="other"
        >
          {#if errorMessage}
            <Alert color="danger" title={errorMessage} closable />
          {/if}

          {#if loginFieldsMounted}
            <Field required="indicator">
              <div class="flex w-full flex-col gap-1">
                <div class="inline-block">
                  <span class="text-sm font-medium">{$t('email')}</span>
                  <span aria-hidden="true" class="text-danger">*</span>
                </div>
                <Input
                  name={loginIdName}
                  type="text"
                  autocapitalize="none"
                  autocorrect="off"
                  spellcheck={false}
                  autocomplete="nope"
                  aria-label={$t('email')}
                  data-1p-ignore
                  data-lpignore="true"
                  data-bwignore
                  data-form-type="other"
                  readonly={blockAutofill}
                  onfocus={scheduleUnlockAutofill}
                  onkeydown={onFieldKeydown}
                  bind:value={email}
                />
              </div>
            </Field>

            <Field required="indicator">
              <div class="flex w-full flex-col gap-1">
                <div class="inline-block">
                  <span class="text-sm font-medium">{$t('password')}</span>
                  <span aria-hidden="true" class="text-danger">*</span>
                </div>
                <div class:pg-login-password-masked={!passwordVisible}>
                  <Input
                    name={loginSecretName}
                    type="text"
                    autocapitalize="none"
                    autocorrect="off"
                    spellcheck={false}
                    autocomplete="nope"
                    aria-label={$t('password')}
                    data-1p-ignore
                    data-lpignore="true"
                    data-bwignore
                    data-form-type="other"
                    readonly={blockAutofill}
                    onfocus={scheduleUnlockAutofill}
                    onkeydown={onFieldKeydown}
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
                </div>
              </div>
            </Field>
          {/if}

          <Button type="button" size="large" shape="round" fullWidth {loading} class="mt-6" onclick={handleLogin}>
            {$t('to_login')}
          </Button>
        </div>
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

<style>
  :global(.pg-login-password-masked input) {
    -webkit-text-security: disc;
  }
</style>
