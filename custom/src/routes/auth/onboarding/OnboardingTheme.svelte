<script lang="ts">
  import { moonPath, moonViewBox, sunPath, sunViewBox } from '$lib/assets/svg-paths';
  import { Icon, themeManager, ThemePreference } from '@immich/ui';
  import { mdiThemeLightDark } from '@mdi/js';
  import { t } from 'svelte-i18n';

  let currentPreference = $derived(themeManager.preference);

  const optionClass = (selected: boolean, extra: string) => {
    const ring = selected
      ? 'border-[3px] border-immich-primary dark:border-immich-dark-primary'
      : 'border border-transparent dark:border-transparent';
    return `flex min-h-28 flex-1 flex-col place-content-center place-items-center gap-3 rounded-3xl bg-light p-3 shadow-sm transition-all hover:shadow-xl dark:bg-dark ${ring} ${extra}`;
  };
</script>

<div class="flex flex-col gap-4">
  <p>{$t('onboarding_theme_description')}</p>

  <div class="flex gap-3 max-sm:flex-col sm:gap-4">
    <button
      type="button"
      class={optionClass(
        currentPreference === ThemePreference.System,
        'text-immich-primary dark:text-immich-dark-primary',
      )}
      onclick={() => themeManager.setPreference(ThemePreference.System)}
    >
      <Icon icon={mdiThemeLightDark} size="64" />
      <p class="text-center text-lg font-semibold sm:text-2xl">{$t('system_theme')}</p>
    </button>

    <button
      type="button"
      class={optionClass(currentPreference === ThemePreference.Light, 'text-immich-primary')}
      onclick={() => themeManager.setPreference(ThemePreference.Light)}
    >
      <Icon icon={sunPath} viewBox={sunViewBox} size="64" />
      <p class="text-center text-lg font-semibold sm:text-2xl">{$t('light')}</p>
    </button>

    <button
      type="button"
      class={optionClass(currentPreference === ThemePreference.Dark, 'text-immich-dark-primary')}
      onclick={() => themeManager.setPreference(ThemePreference.Dark)}
    >
      <Icon icon={moonPath} viewBox={moonViewBox} size="64" />
      <p class="text-center text-lg font-semibold sm:text-2xl">{$t('dark')}</p>
    </button>
  </div>
</div>
