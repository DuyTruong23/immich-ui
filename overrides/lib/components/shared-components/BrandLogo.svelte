<script lang="ts">
  import { Theme, themeManager } from '@immich/ui';
  import { tv } from 'tailwind-variants';

  type Props = {
    variant?: 'icon' | 'inline';
    size?: 'tiny' | 'small' | 'medium' | 'large' | 'giant' | 'landing';
    class?: string;
  };

  let { variant = 'icon', size = 'medium', class: className = '' }: Props = $props();

  const styles = tv({
    base: 'object-contain',
    variants: {
      size: {
        tiny: 'h-8',
        small: 'h-10',
        medium: 'h-12',
        large: 'h-16',
        giant: 'h-24',
        landing: 'h-64',
      },
      variant: {
        inline: 'h-12 w-auto max-w-none',
        icon: 'aspect-square',
      },
    },
  });

  const src = $derived(
    variant === 'inline'
      ? themeManager.value === Theme.Dark
        ? '/branding/icloud-photos-inline-dark.svg'
        : '/branding/icloud-photos-inline-light.svg'
      : '/branding/icloud-photos-icon.svg',
  );
</script>

<img {src} class="{styles({ size, variant })} {className}" alt="WeGallery" />
