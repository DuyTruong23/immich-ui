import { describe, expect, it } from 'vitest';
import { buildMediaOriginHints } from './media-origin-hints';

describe('buildMediaOriginHints', () => {
  it('rỗng khi không cấu hình media URL hoặc URL không hợp lệ', () => {
    expect(buildMediaOriginHints('')).toBe('');
    expect(buildMediaOriginHints(undefined)).toBe('');
    expect(buildMediaOriginHints(' '.repeat(3))).toBe('');
    expect(buildMediaOriginHints('not a url')).toBe('');
  });

  it('tạo preconnect + dns-prefetch tới origin, bỏ path và dấu / cuối, không crossorigin', () => {
    const html = buildMediaOriginHints('https://api.gallery-app.pp.ua/');
    expect(html).toContain('<link rel="preconnect" href="https://api.gallery-app.pp.ua" />');
    expect(html).toContain('<link rel="dns-prefetch" href="https://api.gallery-app.pp.ua" />');
    expect(html).not.toContain('crossorigin');
    expect(buildMediaOriginHints('https://api.gallery-app.pp.ua/api')).toContain(
      'href="https://api.gallery-app.pp.ua"',
    );
  });
});
