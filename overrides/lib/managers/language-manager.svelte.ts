import { eventManager } from '$lib/managers/event-manager.svelte';
import { lang } from '$lib/stores/preferences.store';
import { convertBCP47, langs } from '$lib/utils/i18n';

class LanguageManager {
  constructor() {
    eventManager.on({
      AppInit: () => this.init(),
    });
  }

  initialized = $state(false);
  rtl = $state(false);

  init() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    lang.subscribe((lang) => this.setLanguage(lang));
  }

  setLanguage(code: string) {
    const normalized = convertBCP47(code);
    document.documentElement.lang = normalized;

    const item = langs.find((entry) => convertBCP47(entry.code) === normalized || entry.code === code);
    if (!item) {
      return;
    }

    this.rtl = item.rtl ?? false;

    document.body.setAttribute('dir', item.rtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('dir', item.rtl ? 'rtl' : 'ltr');

    eventManager.emit('LanguageChange', item);
  }
}

export const languageManager = new LanguageManager();
