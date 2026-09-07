<script lang="ts">
  import { getAppConfig } from '@photo-gallery/config';
  import CalendarHeatmap from '$lib/components/CalendarHeatmap.svelte';
  import UserPageLayout from '$lib/components/layouts/UserPageLayout.svelte';
  import DeviceCard from '$lib/components/user-settings-page/DeviceCard.svelte';
  import {
    mdiCheckCircle,
    mdiCloudUploadOutline,
    mdiDevices,
    mdiImageAlbum,
    mdiImageMultipleOutline,
    mdiInformationOutline,
    mdiServerOff,
    mdiVideoOutline,
  } from '@mdi/js';
  import { Icon } from '@immich/ui';
  import { formatDateTime } from '$lib/utils/date-format';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  const { publicEnv } = getAppConfig();

  const statCards = $derived([
    { label: 'Ảnh', value: data.photoCount.toLocaleString('vi-VN'), icon: mdiImageMultipleOutline, tone: 'sky' },
    { label: 'Video', value: data.videoCount.toLocaleString('vi-VN'), icon: mdiVideoOutline, tone: 'violet' },
    { label: 'Albums', value: data.albumCount.toLocaleString('vi-VN'), icon: mdiImageAlbum, tone: 'amber' },
    { label: 'Phiên bản', value: `v${data.serverVersion}`, icon: mdiCheckCircle, tone: 'emerald' },
  ]);

  const toneClass: Record<string, string> = {
    sky: 'bg-sky-500/10 text-sky-400',
    violet: 'bg-violet-500/10 text-violet-400',
    amber: 'bg-amber-500/10 text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
  };

  const activeDeviceGroups = $derived(data.userDeviceGroups.filter((group) => group.sessions.length > 0));

  const formatSessionTime = (iso: string) => formatDateTime(new Date(iso), 'vi-VN');
</script>

<UserPageLayout title={data.meta.title} description={publicEnv.companyName || 'Quản trị hệ thống'}>
  {#snippet buttons()}
    <div
      class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm {data.serverOnline
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
        : 'border-red-500/30 bg-red-500/10 text-red-400'}"
    >
      <Icon icon={data.serverOnline ? mdiCheckCircle : mdiServerOff} size="16" />
      {data.serverOnline ? 'Server online' : 'Server offline'}
    </div>
  {/snippet}

  <div class="mx-auto max-w-6xl px-2 pb-8 md:px-4">
    <p class="mb-6 text-sm text-(--pg-text-muted)">Tổng quan thư viện — chỉ dành cho admin</p>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {#each statCards as card (card.label)}
        <article class="rounded-2xl border border-(--pg-border) bg-(--pg-surface-raised) p-5">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-sm font-medium text-(--pg-text-muted)">{card.label}</h2>
            <span class="inline-flex rounded-lg p-2 {toneClass[card.tone]}">
              <Icon icon={card.icon} size="20" />
            </span>
          </div>
          <p class="text-3xl font-semibold tracking-tight">{card.value}</p>
        </article>
      {/each}
    </section>

    <section class="mt-6">
      <article class="rounded-2xl border border-(--pg-border) p-6">
        <div class="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold">Dung lượng lưu trữ</h2>
            <p class="mt-1 text-sm text-(--pg-text-muted)">
              {data.storageUsedLabel} / {data.storageTotalLabel}
              ({data.storagePercent}%)
            </p>
          </div>
          <p class="text-sm text-(--pg-text-muted)">Media: {data.mediaUsageGiB}</p>
        </div>

        <div class="h-3 overflow-hidden rounded-full bg-(--pg-border)">
          <div
            class="h-full rounded-full transition-all {data.storagePercent >= 95
              ? 'bg-red-500'
              : data.storagePercent >= 80
                ? 'bg-amber-500'
                : 'bg-(--pg-primary)'}"
            style="width: {Math.min(data.storagePercent, 100)}%"
          ></div>
        </div>

        <div class="mt-3 flex justify-between text-xs text-(--pg-text-muted)">
          <span>{data.storageUsedGiB} đã dùng</span>
          <span>{data.storageTotalGiB} tổng</span>
        </div>
      </article>
    </section>

    <section class="mt-6 space-y-6">
      <div>
        <h2 class="text-lg font-semibold">Thống kê lịch sử</h2>
        <p class="mt-1 text-sm text-(--pg-text-muted)">Hoạt động upload và thiết bị đăng nhập của người dùng</p>
      </div>

      <article class="rounded-2xl border border-(--pg-border) p-6">
        <div class="mb-2 flex items-center gap-2">
          <Icon icon={mdiCloudUploadOutline} size="22" class="text-(--pg-primary)" />
          <h3 class="text-base font-semibold">Lịch sử upload (52 tuần)</h3>
        </div>
        <p class="mb-4 text-sm text-(--pg-text-muted)">Tổng hợp upload của tất cả người dùng trên hệ thống</p>

        {#if data.uploadHistory}
          <div class="overflow-x-auto">
            <CalendarHeatmap
              data={data.uploadHistory}
              itemLabel={({ date, count }) => `${count} ảnh/video ngày ${date}`}
              totalLabel={(count) => `${count.toLocaleString('vi-VN')} upload`}
            />
          </div>
        {:else}
          <p class="text-sm text-(--pg-text-muted)">Chưa có dữ liệu upload.</p>
        {/if}
      </article>

      <article class="rounded-2xl border border-(--pg-border) p-6">
        <div class="mb-2 flex items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <Icon icon={mdiDevices} size="22" class="text-(--pg-primary)" />
            <h3 class="text-base font-semibold">Thiết bị được phép</h3>
          </div>
          <span class="text-sm text-(--pg-text-muted)">
            {data.totalSessions.toLocaleString('vi-VN')} phiên đăng nhập
          </span>
        </div>
        <p class="mb-4 text-sm text-(--pg-text-muted)">
          Danh sách thiết bị đã đăng nhập — tương tự mục Authorized Devices trong quản lý người dùng
        </p>

        <div class="space-y-6">
          {#each activeDeviceGroups as group (group.user.id)}
            <div class="rounded-xl border border-(--pg-border)/60 p-4">
              <div class="mb-3 flex flex-wrap items-center gap-2">
                <h4 class="font-medium">{group.user.name}</h4>
                <span class="text-sm text-(--pg-text-muted)">{group.user.email}</span>
                {#if group.user.isAdmin}
                  <span class="rounded-full bg-(--pg-primary)/15 px-2 py-0.5 text-xs text-(--pg-primary)">Admin</span>
                {/if}
              </div>

              <div class="space-y-4">
                {#each group.sessions as session (session.id)}
                  <div class="rounded-lg bg-(--pg-border)/20 px-3 py-2">
                    <DeviceCard {session} />
                    <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 ps-4 text-xs text-(--pg-text-muted) sm:ps-0">
                      <span>Đăng nhập: {formatSessionTime(session.createdAt)}</span>
                      <span>Hết hạn: {session.expiresAt ? formatSessionTime(session.expiresAt) : '—'}</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <p class="text-sm text-(--pg-text-muted)">Không có thiết bị nào đang đăng nhập.</p>
          {/each}
        </div>
      </article>

      <article class="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div class="flex gap-3">
          <Icon icon={mdiInformationOutline} size="22" class="mt-0.5 shrink-0 text-amber-400" />
          <div class="space-y-2 text-sm text-(--pg-text-muted)">
            <p class="font-medium text-(--pg-text)">Giới hạn theo dõi của WeGallery</p>
            <p>
              WeGallery <strong>không</strong> lưu thống kê thời gian làm việc trong từng phiên hay danh sách ảnh đã xem
              của người dùng. API chỉ cung cấp phiên đăng nhập (thiết bị, lần hoạt động cuối) và lịch sử upload như
              trên.
            </p>
            <p>
              Để theo dõi chi tiết hơn (ảnh đã xem, thời lượng phiên), cần tích hợp riêng — ví dụ ghi log phía client
              hoặc mở rộng backend.
            </p>
          </div>
        </div>
      </article>
    </section>
  </div>
</UserPageLayout>
