import { fireEvent } from '@testing-library/svelte';
import { uploadAssetsStore } from '$lib/stores/upload';
import { renderWithTooltips } from '$tests/helpers';
import UploadPanel from './UploadPanel.svelte';

const mediaQuery = vi.hoisted(() => ({
  pointerCoarse: false,
  maxMd: false,
  isFullSidebar: true,
  isMobileShell: false,
  reducedMotion: false,
}));

vi.mock('$lib/stores/media-query-manager.svelte', () => ({ mediaQueryManager: mediaQuery }));

const addUpload = () =>
  uploadAssetsStore.addItem({ id: 'upload-1', file: new File(['x'], 'photo.jpg', { type: 'image/jpeg' }) });

const panelRoot = () => document.querySelector<HTMLElement>('.fixed.z-60');

describe('UploadPanel', () => {
  afterEach(() => {
    uploadAssetsStore.reset();
    mediaQuery.pointerCoarse = false;
    mediaQuery.maxMd = false;
  });

  it('desktop: dùng lớp vị trí pg-upload-panel-desktop thay cho bottom-6 cố định', () => {
    addUpload();
    renderWithTooltips(UploadPanel, {});

    const root = panelRoot();
    expect(root).toHaveClass('pg-upload-panel-desktop', 'inset-e-16');
    expect(root).not.toHaveClass('bottom-6');
  });

  it('tablet cảm ứng (≥768px): panel neo cạnh cuối, rộng 24rem thay vì full-width', () => {
    mediaQuery.pointerCoarse = true;
    addUpload();
    renderWithTooltips(UploadPanel, {});

    expect(panelRoot()).toHaveClass('pg-upload-panel-mobile', 'inset-x-3', 'md:inset-s-auto', 'md:w-96');
  });

  it('panel mobile: inner là flex-col có max-h, không phụ thuộc breakpoint max-md', () => {
    mediaQuery.pointerCoarse = true;
    addUpload();
    renderWithTooltips(UploadPanel, {});

    const inner = panelRoot()?.firstElementChild;
    expect(inner).toHaveClass('flex', 'flex-col', 'max-h-[min(70dvh,32rem)]', 'overflow-hidden');
    expect(inner).not.toHaveClass('max-md:max-h-[min(70dvh,32rem)]');
  });

  it('bubble thu gọn: badge neo vào bubble (wrapper relative) và không dùng p-5', async () => {
    mediaQuery.maxMd = true;
    addUpload();
    const { getByLabelText, getByText } = renderWithTooltips(UploadPanel, {});

    await fireEvent.click(getByLabelText('minimize'));

    const badge = getByText('1').closest('button');
    expect(badge).toHaveClass('grid', 'size-10', 'place-items-center');
    expect(badge).not.toHaveClass('p-5');
    expect(badge?.parentElement).toHaveClass('relative', 'ms-auto', 'w-fit');
  });

  it('mỗi nút bubble thu gọn có tên truy cập (assert theo key i18n)', async () => {
    mediaQuery.maxMd = true;
    addUpload();
    uploadAssetsStore.track('error');
    const { getByLabelText } = renderWithTooltips(UploadPanel, {});

    await fireEvent.click(getByLabelText('minimize'));

    expect(getByLabelText('pg_upload_show_details')).toBeInTheDocument();
    expect(getByLabelText('upload_progress')).toBeInTheDocument();
    expect(getByLabelText('pg_upload_errors_count')).toBeInTheDocument();
  });

  it('ô concurrency chỉ được đặt tên qua <label>, không có aria-labelledby trỏ id không tồn tại', async () => {
    addUpload();
    const { getByLabelText } = renderWithTooltips(UploadPanel, {});

    await fireEvent.click(getByLabelText('toggle_settings'));

    const input = document.querySelector('#upload-concurrency');
    expect(input).toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-labelledby');
  });
});
