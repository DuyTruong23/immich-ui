import { describe, expect, it } from 'vitest';
import { getEnv } from '../../../../api/_lib/email.js';

describe('getEnv', () => {
  it('reads LOGIN_NOTIFY_ENABLED from process.env', () => {
    const previous = process.env.LOGIN_NOTIFY_ENABLED;
    process.env.LOGIN_NOTIFY_ENABLED = 'true';

    try {
      expect(getEnv('LOGIN_NOTIFY_ENABLED')).toBe('true');
    } finally {
      if (previous === undefined) {
        delete process.env.LOGIN_NOTIFY_ENABLED;
      } else {
        process.env.LOGIN_NOTIFY_ENABLED = previous;
      }
    }
  });
});
