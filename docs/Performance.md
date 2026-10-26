# Performance — Photo Gallery UI

Đo ngày 2026-10-26 từ máy dev Windows (Git Bash, Node 24.15.0). Đường mạng tới Cloudflare của máy đo không cố định: `cf-ray` của cùng một hostname đổi PoP giữa các request (đã thấy `HKG`, `LHR`, `MRS`, `SEA`, `CDG`), nên không đại diện cho người dùng tại Việt Nam — số tuyệt đối chỉ để so sánh tương đối giữa các đường. [Speculation] Nguyên nhân có thể là VPN/proxy trên máy đo; chưa kiểm tra.

Mọi số trong tài liệu này là một lần chạy (TTFB: 5 mẫu mỗi endpoint; Lighthouse: 1 lần mỗi form factor). Câu nào không phải số đo trực tiếp đều bắt đầu bằng `[Inference]`, `[Speculation]` hoặc `[Unverified]`.

## Cách đo lại

```bash
pnpm perf:audit                  # TTFB 5 mẫu: trang chủ, REST qua Vercel, media origin, Immich trực tiếp
pnpm build && pnpm perf:audit --bundle

# Lighthouse (cần Chrome; trang /auth/login là trang duy nhất không cần đăng nhập)
export CHROME_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
mkdir -p .tmp/perf   # .tmp/ đã nằm trong .gitignore
npx --yes lighthouse@12 https://gallery-app.pp.ua/auth/login --output=json --output=html --output-path=.tmp/perf/login-mobile --chrome-flags="--headless=new" --quiet
npx --yes lighthouse@12 https://gallery-app.pp.ua/auth/login --preset=desktop --output=json --output=html --output-path=.tmp/perf/login-desktop --chrome-flags="--headless=new" --quiet
pnpm perf:audit --lighthouse-summary .tmp/perf/login-mobile.report.json
pnpm perf:audit --lighthouse-summary .tmp/perf/login-desktop.report.json
```

`perf:audit` đọc `IMMICH_SERVER_URL` và `PUBLIC_IMMICH_MEDIA_URL` từ `.env` ở thư mục gốc; thiếu biến nào thì bỏ dòng tương ứng.

## Lưu ý khi đọc số đo

- Production đang chạy bản build khác working tree của nhánh này. Đo trực tiếp: file `/_app/immutable/entry/start.DHbv9Xyl.js` (tên trong `upstream/web/build/index.html` local) trả 404 trên production, còn production dùng `start.CztsDWaa.js`; HTML production có 0 thẻ `rel="preconnect"` / `rel="dns-prefetch"` (build local có 1 thẻ preconnect). [Inference] Production chưa deploy các commit mới của nhánh (preconnect media, tự nâng ảnh gốc, upload song song), nên TTFB/Lighthouse bên dưới phản ánh bản production hiện tại, chưa phải nhánh này. Cần deploy rồi đo lại.
- Mục 3 (bundle) đo trên build local, tên chunk không trùng với production (production tải `chunks/CEFNmaIP.js`, build local không có file này). Gzip tính bằng `zlib` mặc định của Node; production trả `content-encoding: br`.
- Với ba file đã kiểm tra, `transferSize` của Lighthouse lớn hơn kích thước trên đường truyền. Đo bằng `curl` với `Accept-Encoding: br`: `chunks/CEFNmaIP.js` giải nén 214,290 B, trên dây 73,193 B; `assets/0.CntaVw6w.css` giải nén 233,593 B, trên dây 37,524 B; `favicon.ico` giải nén 285,478 B, trên dây 83,328 B. Lighthouse báo `transferSize` 214,850 / 234,141 / 286,102 B cho ba file đó, tức bằng kích thước giải nén cộng khoảng 0.5–0.6 KB. [Inference] Lighthouse headless đang ghi kích thước đã giải nén, nên "Tổng tải" là cận trên, và điểm mobile mô phỏng có thể bị đẩy xấu hơn thực tế.

## 1. Độ trễ server (TTFB)

Kết quả `pnpm perf:audit --samples 5` (tuần tự, 2026-10-26T09:02:49Z):

```
TTFB (5 mẫu, tuần tự) — 2026-10-26T09:02:49.026Z
  Trang chủ (Vercel static)    HTTP 200  TTFB min/med/max 83/142/687 ms  total med 144 ms  cf-pop HKG  vercel hkg1  cf-cache DYNAMIC  enc br
    https://gallery-app.pp.ua/
  REST qua Vercel proxy        HTTP 200  TTFB min/med/max 558/1268/1860 ms  total med 1268 ms  cf-pop HKG  vercel hkg1  cf-cache DYNAMIC  enc br
    https://gallery-app.pp.ua/api/server/ping
  Media origin (tunnel)        HTTP 200  TTFB min/med/max 188/443/1866 ms  total med 443 ms  cf-pop LHR  vercel -  cf-cache DYNAMIC  enc -
    https://api.gallery-app.pp.ua/api/server/ping
  Immich trực tiếp (tunnel)    HTTP 200  TTFB min/med/max 287/496/1647 ms  total med 496 ms  cf-pop LHR  vercel -  cf-cache DYNAMIC  enc -
    https://immich.gallery-app.pp.ua/api/server/ping
```

| Đường | HTTP | TTFB min / median / max (ms) | Ghi chú |
|---|---|---|---|
| Trang chủ (Vercel static) `/` | 200 | 83 / 142 / 687 | `x-vercel-cache: HIT`, `content-encoding: br`; PoP và region ở mẫu cuối: `HKG`, `hkg1` |
| REST qua Vercel proxy (`/api/server/ping`) | 200 | 558 / 1268 / 1860 | Edge Middleware (`middleware.ts`) proxy sang `IMMICH_SERVER_URL`; PoP/region mẫu cuối: `HKG`, `hkg1`; không có header `x-vercel-cache` |
| Media origin (`api.gallery-app.pp.ua`) | 200 | 188 / 443 / 1866 | Cloudflare tunnel, PoP mẫu cuối `LHR` |
| Immich trực tiếp (`immich.gallery-app.pp.ua`) | 200 | 287 / 496 / 1647 | Cloudflare tunnel, PoP mẫu cuối `LHR` |

Nhận xét:

- Median REST qua Vercel (1268 ms) cao hơn median Immich trực tiếp (496 ms) 772 ms. [Inference] Chênh lệch này là chi phí hop Vercel Edge → Cloudflare tunnel, trả cho **mỗi** call REST; chỉ 5 mẫu và dải min–max của hai đường chồng lên nhau (558–1860 so với 287–1647), nên con số 772 ms chỉ là ước lượng thô.
- Median media origin (443 ms) thấp hơn Immich trực tiếp (496 ms) 53 ms. Ba lần `curl` đơn lẻ trong cùng phiên đo cho 0.59 s (media), 1.42 s (Immich trực tiếp) và 1.68 s (REST qua Vercel): thứ tự media nhanh hơn trực tiếp giữ nguyên, nhưng chênh lệch lớn hơn nhiều (0.83 s so với 53 ms), và dải min–max của hai đường chồng lên nhau (188–1866 so với 287–1647 ms). [Inference] Chênh lệch media/trực tiếp nằm trong dải nhiễu, không đủ để kết luận đường nào nhanh hơn. Đường REST qua Vercel proxy có TTFB median và min cao nhất trong bảng 5 mẫu của script (max thì media origin nhỉnh hơn: 1866 ms so với 1860 ms), và cao nhất trong ba lần `curl` đơn lẻ.
- [Inference] Node `fetch` dùng lại kết nối giữa các mẫu, còn mỗi lệnh `curl` mở kết nối mới; nếu đúng thì mẫu đầu tiên của mỗi endpoint (có DNS + TLS) có thể là giá trị max, và các số `curl` đơn lẻ cao hơn median của script. Script không in từng mẫu nên chưa kiểm tra được.
- Response từ `gallery-app.pp.ua` mang cả `server: cloudflare` / `cf-ray` lẫn `x-vercel-id`. [Inference] Cloudflare proxy đứng trước Vercel cho hostname này.

## 2. Lighthouse — trang đăng nhập

Lighthouse 12.8.2, Chrome 155 headless (`--headless=new`), trang `https://gallery-app.pp.ua/auth/login`, 1 lần chạy mỗi form factor, throttling kiểu `simulate`.

| Form factor | Performance | FCP | LCP | TBT | CLS | Speed Index | Tổng tải (xem lưu ý về `transferSize`) |
|---|---|---|---|---|---|---|---|
| Mobile (mô phỏng: RTT 150 ms, 1.6 Mbps, CPU ×4) | 55 | 9371 ms | 12222 ms | 0 ms | 0.000 | 13976 ms | 1.98 MB |
| Desktop (mô phỏng: RTT 40 ms, 10 Mbps, CPU ×1) | 66 | 2489 ms | 2963 ms | 0 ms | 0.000 | 4537 ms | 1.98 MB |

Số quan sát thực trong cùng hai lần chạy (trace trước khi mô phỏng, đọc từ `audits.metrics` của báo cáo JSON):

| | Lần chạy mobile | Lần chạy desktop |
|---|---|---|
| TTFB của tài liệu | 1737 ms | 1296 ms |
| First Paint | 3917 ms | 2599 ms |
| FCP | 4234 ms | 2899 ms |
| LCP | 7634 ms | 5765 ms |

Trang đăng nhập tải gì (đếm từ danh sách request của Lighthouse): 127 request — 1 tài liệu, 85 script, 29 stylesheet, 3 font, 3 fetch REST, 1 XHR (`/cdn-cgi/rum`), 2 ảnh, 2 "other" (`favicon.ico`, `apple-icon-180.png`), 1 manifest. Tài liệu `/auth/login` là SPA shell (`export const ssr = false` trong `upstream/web/src/routes/+layout.ts`); HTML có 77 thẻ `modulepreload`. Phần tử LCP là `<img src="/branding/icloud-photos-icon.svg">` (logo); Lighthouse ghi "Request is discoverable in initial document: false".

Thứ tự các bước trên trang đăng nhập (mốc thời gian từ nav start, lấy từ danh sách request quan sát được):

| Bước | Lần chạy mobile (ms) | Lần chạy desktop (ms) |
|---|---|---|
| `custom.css` tải xong | 3385 | 2112 |
| 20 file `@import` trong `custom.css` tải xong | 3895 | 2571 |
| `GET /api/server/config` (bắt đầu → xong, thời lượng) | 4480 → 6290 (1810) | 2922 → 4606 (1684) |
| `GET /api/server/features` | 6292 → 7163 (871) | 4611 → 5444 (833) |
| `GET /api/server/media-types` | 7174 → 8017 (843) | 5454 → 5988 (534) |
| Request logo (phần tử LCP) bắt đầu | 7241 | 5519 |

Các audit đáng chú ý trong JSON (đọc trực tiếp):

- `render-blocking-resources`: `assets/0.CntaVw6w.css` (233,593 B giải nén; 37,524 B trên dây) ước tính lãng phí 1901 ms (mobile) / 569 ms (desktop); mobile còn liệt kê `CloseButton._w4HnSY2.css` và `branding/m3/states.css` mỗi file 317 ms.
- `unused-javascript`: ước tính thừa 388,927 B (380 KiB); file đầu bảng là `chunks/CEFNmaIP.js` (214,461 B, thừa 95,090 B).
- `uses-long-cache-ttl`: chỉ một resource — `static.cloudflareinsights.com/beacon.min.js` (32,100 B, cache 24 giờ), kèm một request `/cdn-cgi/rum`. Beacon không có trong HTML production lấy bằng `curl` và không có trong source repo. [Inference] Do Cloudflare Web Analytics tự chèn lúc phục vụ trình duyệt.
- `server-response-time`: tài liệu gốc 854 ms (mobile) / 390 ms (desktop).
- `uses-text-compression`, `font-display`, `uses-http2`, `dom-size` (40 phần tử), `unminified-javascript`, `redirects`: đạt (score 1).
- Request lớn nhất theo `transferSize`: `favicon.ico` 286,102 B (mobile) / 286,130 B (desktop).

## 3. Bundle

Kết quả `pnpm perf:audit --bundle` trên `upstream/web/build/_app/immutable` (build local lúc 15:46, trước commit `2dec7adea` — vòng sửa cuối của Task 4: 9 dòng `AdaptiveImage.svelte`, 15 dòng `image-quality.ts` và test):

JS: 365 file, raw 17.57 MB, gzip 4.98 MB. CSS: 34 file, raw 443.2 KB, gzip 71.9 KB.

| Chunk | gzip | raw |
|---|---|---|
| `chunks/CJGWhEKd2.js` | 286.6 KB | 1.04 MB |
| `nodes/50.3X-mmqaO.js` | 232.7 KB | 729.8 KB |
| `chunks/CImM3Yee.js` | 158.7 KB | 618.6 KB |
| `chunks/Gt2R5P5f2.js` | 152.4 KB | 497.9 KB |
| `chunks/Cz_tU2kN2.js` | 106.7 KB | 337.2 KB |
| `chunks/u9wedQ3v.js` | 70.5 KB | 209.3 KB |
| `chunks/Bck8PUKx.js` | 68.0 KB | 279.2 KB |
| `chunks/CTPZY-tj.js` | 66.2 KB | 350.0 KB |
| `chunks/CWAHNcLN.js` | 65.0 KB | 261.4 KB |
| `chunks/k6D55cjT.js` | 64.8 KB | 312.4 KB |
| `chunks/D_AMuXX5.js` | 64.1 KB | 262.5 KB |
| `chunks/BUxhwVVG.js` | 64.1 KB | 259.3 KB |

Nhận xét:

- Tổng này gộp mọi chunk, gồm cả route tải lười; không phải lượng tải ở lần mở đầu tiên. `index.html` của build local khai báo 75 chunk JS qua `modulepreload` (cộng `_app/env.js`): 993.2 KB raw, 334.7 KB gzip (cùng cách tính gzip). Năm chunk lớn nhất ở bảng trên không nằm trong danh sách đó.
- Chunk `chunks/CJGWhEKd2.js` chứa chuỗi `maplibre` 155 lần (grep). [Inference] Đây là thư viện bản đồ, chỉ cần ở route bản đồ.
- Trên production, trang đăng nhập tải 85 script với tổng 1,295,079 B theo `transferSize` của Lighthouse (kích thước giải nén, xem lưu ý ở trên).

## 4. Cache & headers

Đo bằng `curl` với `Accept-Encoding: gzip, deflate, br`, một lần mỗi URL, ngày 2026-10-26.

| Tài nguyên | cache-control | content-encoding | x-vercel-cache |
|---|---|---|---|
| `/` | `no-cache, must-revalidate` | br | HIT (`Age: 717565`) |
| `/auth/login` | `no-cache, must-revalidate` | br | HIT (`Age: 7878`) |
| `/_app/version.json` | `no-cache, must-revalidate` | br | MISS |
| `/_app/immutable/entry/start.CztsDWaa.js` | `public, max-age=31536000, immutable` | br | HIT (`Age: 504192`) |
| `/custom.css` | `public, max-age=14400, must-revalidate` | br | MISS (`cf-cache-status: REVALIDATED`) |
| `/favicon.ico` | `public, max-age=14400, must-revalidate` | br | MISS (`cf-cache-status: REVALIDATED`) |
| `/branding/fonts/SFPro/SF-Pro-Text-Regular.woff2` | `public, max-age=14400, must-revalidate` | không có (woff2 đã nén) | MISS |

- File `/_app/immutable/...js` lấy từ `upstream/web/build/index.html` (`start.DHbv9Xyl.js`) trả 404 trên production nên dùng `start.CztsDWaa.js` trích từ HTML production.
- Chính response 404 đó cũng mang `cache-control: public, max-age=31536000, immutable`. [Unverified] Trình duyệt hoặc CDN có cache response 404 này hay không thì chưa kiểm tra.
- `custom.css` và các file `branding/*` đã kiểm tra (`tokens.css`, font, svg) không có hash trong tên, cache 4 giờ rồi revalidate.

## 5. Những gì đã có sẵn trong code

- Service worker cache-first cho thumbnail (`custom/src/service-worker/index.ts`, cache `pg-thumbs-v2`), giới hạn số thumbnail lưu theo mạng/thiết bị: 80 (save-data), 180 (3G trở xuống), 280 (màn cảm ứng hoặc rộng ≤ 767 px), 400 (còn lại).
- `overrides/lib/utils/mobile-performance.svelte.ts`: phân loại mạng (`getNetworkQuality`: `save-data` / `slow` / `fast`), lazy-load thumbnail (`shouldLazyLoadThumbnails`), giảm transition timeline (`shouldUseTimelineTransitions`), cửa sổ intersection của timeline theo mạng (`getTimelineIntersectionExpand`).
- Preload ảnh/video kề trong viewer (`PreloadManager.svelte.ts`, `VideoPreloadManager.svelte.ts`), tắt khi `save-data` hoặc người dùng bật giảm chuyển động (`shouldPreloadAdjacentAssets`).
- Media bypass Vercel qua `PUBLIC_IMMICH_MEDIA_URL` (`docs/VercelProduction.md`).
- Nhánh `feature/gallery-improvements-2026-10` thêm (chưa có trên production tại thời điểm đo, xem "Lưu ý khi đọc số đo"):
  - `<link rel="preconnect">` + `dns-prefetch` tới media origin, chèn vào `<head>` lúc build qua `custom/src/hooks.server.ts` (`overrides/lib/utils/media-origin-hints.ts`); chỉ có khi `PUBLIC_IMMICH_MEDIA_URL` được set lúc build.
  - Viewer ảnh tự nâng preview → ảnh gốc chỉ khi mạng `fast` và preview nhỏ hơn vùng hiển thị × min(DPR, 2) quá 10% mỗi cạnh (`overrides/lib/utils/image-quality.ts`); hai tuỳ chọn "Hiển thị ảnh gốc" và "Phát video gốc" được trả lại trong cài đặt.
  - Upload: băm SHA-1 (tối đa 2 worker) chạy song song với tải lên; số stream tải lên 3 (desktop), 2 (màn cảm ứng), 1 (mạng chậm hoặc save-data) (`overrides/lib/utils/upload-strategy.ts`); lỗi 413 có thông báo riêng.
  - Tải lại trang (F5) không còn đăng xuất.

## 6. Khuyến nghị (ưu tiên giảm dần)

1. **REST qua Vercel proxy** — căn cứ: mục 1 (median 1268 ms so với 496 ms) và mục 2 (trang đăng nhập chờ hai call REST tuần tự, xong sau 4606 ms và 5444 ms trong lần chạy desktop). [Inference] Mỗi call REST trả thêm ≈ 772 ms (1268 − 496, median 5 mẫu). Đề xuất (a): để Cloudflare chuyển `gallery-app.pp.ua/api/*` thẳng vào tunnel (Worker hoặc route), bỏ hop Vercel — cần cấu hình Cloudflare, không đổi code; (b) giữ nguyên proxy nhưng giảm/gộp số call lúc mở app (khuyến nghị 2). Rủi ro: `middleware.ts` giữ 10 đường `/api/*` chạy serverless trên Vercel (`LOCAL_API_PATHS`: `notify-login`, `check-blocked`, `admin-block-user`, `partner-favorites`, `feedback`, ...), nên rule Cloudflare phải loại trừ chúng, nếu không các chức năng đó hỏng; [Unverified] Worker có thể thêm giới hạn và độ trễ riêng của Cloudflare. Immich không hỗ trợ CORS nên **không** trỏ `PUBLIC_IMMICH_SERVER_URL` cross-origin (`docs/Environment.md`).
2. **Chạy song song các call khởi động** — căn cứ: `await init(fetch)` nằm trong `load` của `upstream/web/src/routes/+layout.ts` ([Inference] nên route chờ các call này xong mới render); `_init()` trong `upstream/web/src/lib/utils/server.ts` (bản override giống hệt ở `overrides/lib/utils/server.ts`) gọi tuần tự `serverConfigManager.init()` → `authManager.load()` → `featureFlagsManager.init()`. Lighthouse thấy `config` mất 1810 / 1684 ms rồi `features` mất 871 / 833 ms (mobile / desktop), và logo (phần tử LCP) chỉ được request sau khi `features` xong. [Inference] Gọi `config` và `features` đồng thời có thể bớt khoảng 871 / 833 ms (thời lượng của call ngắn hơn) ở lần mở đầu tiên, giả định độ trễ mỗi call không đổi. Rủi ro: `features` hiện bị bỏ qua khi `maintenanceMode` bật (cần kết quả `config`), nên phải bắt lỗi / bỏ kết quả khi bảo trì; đây là code upstream, phải sửa qua `overrides/` và kiểm tra lại mỗi lần `sync:upstream`.
3. **Chuỗi `@import` CSS và CSS chặn render** — căn cứ: `custom.css` có 20 dòng `@import`; 20 file con bắt đầu tải 2–3 ms sau khi `custom.css` xong (mobile: 3385 → 3387–3389; desktop: 2112 → 2115–2117) và xong sau `custom.css` 510 ms (mobile: 3385 → 3895) / 459 ms (desktop: 2112 → 2571); First Paint quan sát được (3917 / 2599 ms) rơi ngay sau mốc đó. [Inference] First Paint chờ chuỗi CSS này. Thêm `assets/0.CntaVw6w.css` bị Lighthouse xếp chặn render (569–1901 ms ước tính). [Inference] Gộp 20 file thành một (bước build trong `prepare:custom`) hoặc khai báo chúng bằng `<link>` song song trong `app.html` có thể bỏ được một tầng request, tức tối đa vài trăm ms ở lần tải lạnh; chưa thử. Rủi ro: thứ tự cascade giữa các file phải giữ nguyên như thứ tự `@import`; file gộp cần cache-busting vì `custom.css` hiện không có hash trong tên (cache 4 giờ). Chưa đề xuất giảm JS thừa (`unused-javascript` 380 KiB): chưa xác định chunk nào thuộc upstream hay lớp custom, và kích thước Lighthouse đang tính theo bản giải nén nên lợi ích trên đường truyền thật chưa đo được.
4. **`favicon.ico` 285,478 B và beacon Cloudflare** — căn cứ: `favicon.ico` là request lớn nhất trong danh sách Lighthouse (286 KB theo `transferSize`; 83,328 B trên dây qua `br`), được tải ở lần mở lạnh; HTML production khai báo `<link rel="shortcut icon" href="/favicon.ico">` bên cạnh các PNG ([Inference] đây là lý do trình duyệt tải file này); cùng file `branding/assets/favicon.ico` trong repo có đúng 285,478 B. Beacon `cloudflareinsights.com` 32,100 B kèm `/cdn-cgi/rum` là audit `uses-long-cache-ttl` duy nhất còn lại. Đề xuất: thay bằng `.ico` nhỏ (vài KB) hoặc bỏ dòng `shortcut icon` để dùng PNG đã có; tắt Web Analytics trong Cloudflare nếu không dùng. Rủi ro: [Unverified] mỗi trình duyệt (Safari, Firefox, Chrome) chọn icon theo thuật toán riêng, cần thử trên từng trình duyệt trước khi bỏ `.ico`; tắt beacon mất số liệu RUM của Cloudflare.
5. **[Unverified] Thông báo lỗi 413 khi upload qua tunnel khác origin** — căn cứ: Task 3 thêm thông báo "tệp quá lớn" (`errors.upload_file_too_large`) khi `statusCode`/`status` bằng 413 (`overrides/lib/utils/upload-strategy.ts`, `file-uploader.ts`). [Unverified] Nếu tunnel `api.gallery-app.pp.ua` trả 413 mà không kèm header CORS, trình duyệt có thể chỉ báo lỗi mạng (status 0) và thông báo mới sẽ không hiện; chưa thử trên production. Đề xuất: thử tay với một tệp vượt giới hạn của tunnel/proxy trên production sau khi deploy và xem thông báo hiển thị. Rủi ro khi thử: tốn một lần upload lớn; nếu thông báo không hiện thì phải xử lý riêng trường hợp status 0.

Mỗi khuyến nghị: số đo làm căn cứ, thay đổi đề xuất, rủi ro.
