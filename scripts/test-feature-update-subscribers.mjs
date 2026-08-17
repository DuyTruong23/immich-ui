#!/usr/bin/env node
/**
 * Test store email nhận thông báo: object { accountEmail, notifyEmail },
 * khớp account email, admin list lấy notifyEmail từ mảng.
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.VERCEL;

const {
  addFeatureUpdateSubscriber,
  findSubscriber,
  getNotifyEmailForAccount,
  listNotifyEmails,
  readFeatureUpdateSubscribers,
  removeFeatureUpdateSubscriber,
  writeFeatureUpdateSubscribers,
} = await import('../api/_lib/feature-update-subscribers.ts');

let failed = 0;
const assert = (condition, message) => {
  if (condition) {
    console.log(`  ✓ ${message}`);
    return;
  }

  failed += 1;
  console.error(`  ✗ ${message}`);
};

console.log('==> feature-update subscribers store');

await writeFeatureUpdateSubscribers({ subscribers: [] });

console.log('\n--- 1) Đăng ký theo account email ---');
const first = await addFeatureUpdateSubscriber('Alerts@Gmail.com', 'v1.0.12', {
  accountEmail: 'User@Immich.local',
  userId: 'user-1',
});
assert(first.added, 'đăng ký mới được đánh dấu added');
assert(first.store.subscribers.length === 1, 'store có 1 object');
assert(
  first.store.subscribers[0].accountEmail === 'user@immich.local' &&
    first.store.subscribers[0].notifyEmail === 'alerts@gmail.com',
  'object lưu accountEmail + notifyEmail đã normalize',
);

console.log('\n--- 2) Khớp account email → lấy notify email ---');
assert(
  getNotifyEmailForAccount(first.store, { accountEmail: 'USER@immich.local' }) === 'alerts@gmail.com',
  'account email trùng (khác hoa thường) lấy đúng notify email',
);
assert(
  getNotifyEmailForAccount(first.store, { accountEmail: 'other@immich.local' }) === '',
  'account email khác không lấy nhầm',
);
assert(
  findSubscriber(first.store, { accountEmail: 'user@immich.local' })?.userId === 'user-1',
  'fallback userId vẫn gắn trên object',
);

console.log('\n--- 3) Admin list lấy notifyEmail từ obj[] ---');
assert(
  JSON.stringify(listNotifyEmails(first.store)) === JSON.stringify(['alerts@gmail.com']),
  'listNotifyEmails chỉ lấy notifyEmail',
);

console.log('\n--- 4) User khác không đụng email của user trước ---');
const second = await addFeatureUpdateSubscriber('partner@mail.com', 'v1.0.12', {
  accountEmail: 'partner@immich.local',
  userId: 'user-2',
});
assert(second.added, 'user 2 đăng ký mới');
assert(second.store.subscribers.length === 2, 'store có 2 object');
assert(
  getNotifyEmailForAccount(second.store, { accountEmail: 'user@immich.local' }) === 'alerts@gmail.com',
  'user 1 vẫn giữ email cũ',
);
assert(
  JSON.stringify(listNotifyEmails(second.store).sort()) ===
    JSON.stringify(['alerts@gmail.com', 'partner@mail.com']),
  'admin list đủ 2 notify email',
);

console.log('\n--- 5) Đổi email nhận thông báo, giữ account email ---');
const changed = await addFeatureUpdateSubscriber('new-alerts@gmail.com', 'v1.0.12', {
  accountEmail: 'user@immich.local',
  userId: 'user-1',
});
assert(!changed.added, 'đổi email không tạo object mới (added=false)');
assert(
  getNotifyEmailForAccount(changed.store, { accountEmail: 'user@immich.local' }) === 'new-alerts@gmail.com',
  'notify email đã đổi',
);
assert(changed.store.subscribers.length === 2, 'vẫn 2 object sau khi đổi');
assert(
  !listNotifyEmails(changed.store).includes('alerts@gmail.com'),
  'email cũ không còn trong list admin',
);

console.log('\n--- 6) Hủy theo account email ---');
const removed = await removeFeatureUpdateSubscriber('new-alerts@gmail.com', {
  accountEmail: 'user@immich.local',
  userId: 'user-1',
});
assert(removed, 'hủy thành công');
const afterRemove = await readFeatureUpdateSubscribers();
assert(
  getNotifyEmailForAccount(afterRemove, { accountEmail: 'user@immich.local' }) === '',
  'user 1 không còn notify email',
);
assert(
  getNotifyEmailForAccount(afterRemove, { accountEmail: 'partner@immich.local' }) === 'partner@mail.com',
  'user 2 không bị xóa nhầm',
);

console.log('\n--- 7) Migrate store cũ emails[] / byUser ---');
await writeFeatureUpdateSubscribers({
  subscribers: [],
  emails: ['old@list.com'],
  byUser: { 'user-old': 'old-user@mail.com' },
});
const migrated = await readFeatureUpdateSubscribers();
assert(
  listNotifyEmails(migrated).includes('old@list.com') &&
    listNotifyEmails(migrated).includes('old-user@mail.com'),
  'emails[] và byUser cũ vẫn vào list gửi mail',
);
assert(
  getNotifyEmailForAccount(migrated, { userId: 'user-old' }) === 'old-user@mail.com',
  'byUser cũ khớp được qua userId',
);

void afterRemove;

if (failed > 0) {
  console.error(`\n✗ ${failed} assertion(s) failed`);
  process.exit(1);
}

console.log('\n✓ Store email nhận thông báo OK');
