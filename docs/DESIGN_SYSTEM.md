# Thiết kế — Trạm Truyện 2D (liquid glass)

Theme WordPress `wp-content/themes/thu-cac` (giữ tên thư mục để site đang chạy không mất theme; tên hiển thị trong wp-admin là **Trạm Truyện 2D**). Thay cho giao diện "Thư Các" cũ từ 2026-10-10.

## Ý tưởng

- **Trạm** = sân ga: thể loại là **tuyến** (vòng tròn số + màu như bản đồ metro), truyện nổi bật là **tấm vé**, chương mới là **bảng giờ tàu**, danh sách chương là **lộ trình** các trạm dừng, chân trang là **ga cuối**.
- **2D** = **hai chữ D**: tên hai người làm trang (hai vợ chồng) đều bắt đầu bằng D. Không phải "2D" kiểu hoạt hình. Logo vẽ hai chữ D lồng nhau (một chữ trong như kính, một chữ đặc), chữ "2D" cuối tên thành nhãn kính.
- **Bầu trời mơ mộng** chỉ là phong cách minh họa: mây hồng–tím–xanh, chấm tram nét (`.sky__tone`), dây điện và tàu điện chạy trên mây (`template-parts/scene.php`).
- **Kính lỏng** kiểu iOS 26: mọi lớp nổi (header, tab bar, vé, bảng, dock đọc) là kính trong, mờ và bắt sáng ở mép.

## Màu và chữ

Token nằm đầu `assets/css/tram.css`, hai bộ `:root` (Sáng "bình minh") và `[data-theme="dark"]` (Tối "nửa đêm"). Không viết màu cứng trong component, dùng token.

| Token | Sáng | Tối | Dùng cho |
| --- | --- | --- | --- |
| `--bg` | `#f1ecff` | `#0d0b22` | nền trang |
| `--ink` / `--ink-2` / `--ink-3` | `#1d1842` / `#4b4573` / `#696390` | `#f1eeff` / `#bdb6e6` / `#9a93c7` | chữ chính / phụ / chú thích (đều ≥ 4.5:1 trên kính) |
| `--accent` | `#6a3df5` | `#a58bff` | link, số giờ, icon |
| `--btn-grad` | `#4f46e5 → #7c3aed → #db2777` | như Sáng | nút chính (chữ trắng ≥ 4.5:1 ở cả ba điểm màu) |
| `--glass-fill` / `--glass-fill-strong` | trắng .48 / .72 | tím đêm .42 / .74 | kính mỏng / kính dày (chữ dài, vùng đọc) |
| `--paper` | trắng .86 | `#15113a` .86 | tấm giấy kính của trang đọc |

- **Unbounded** (500/700/800): logo, tiêu đề lớn, số. Không dùng cho tên truyện dài.
- **Be Vietnam Pro** (400–800): giao diện, tên truyện, và kiểu chữ đọc "Hiện đại".
- **Lora**: kiểu chữ đọc "Văn học"; chỉ tải ở trang chương (`thu_cac_fonts_url()`).
- Màu tuyến: 10 màu trong `thu_cac_line()`, số tuyến theo thứ tự tạo thể loại; chữ trắng trên mọi màu ≥ 4.5:1.

## Vật liệu kính (`.lg`)

1. Nền `--glass-fill` + `backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-sat))` + `--glass-rim` (viền sáng trên, viền tối dưới) + bóng.
2. `.lg::before`: viền phản quang chỉ sáng ở hai góc chéo (gradient + mask `exclude`). Phần tử có `.lg` không được dùng `::before` cho việc khác.
3. `.lg-glow::after`: vệt sáng chạy theo chuột (`glass.js` đặt `--mx/--my`).
4. **Khúc xạ thật** cho phần tử `[data-refract]`, chỉ Chromium (Chrome, Edge, Cốc Cốc, Chrome Android): `glass.js` vẽ bản đồ dịch chuyển (canvas → `feImage` + `feDisplacementMap`) đúng kích thước và bo góc của phần tử, đặt `--lg-refract: url(#…)`. Safari/Firefox giữ kính mờ thường. Tính lại khi đổi kích thước (`ResizeObserver`).
5. Fallback: không hỗ trợ `backdrop-filter` hoặc người dùng bật *giảm trong suốt* → nền đặc `--glass-fill-solid`. *Giảm chuyển động* → tắt tàu chạy, giấy bay, nghiêng vé. *Forced colors* → viền `CanvasText`.

Bẫy cần nhớ:
- `backdrop-filter`, `filter`, `transform` tạo containing block cho con `position: fixed`. Vì vậy kính của header, toolbar đọc là **một lớp con riêng** (`.site-header__glass`, `.reader-toolbar__glass`) chứ không đặt lên phần tử cha: tab bar điện thoại (`.main-nav`, fixed) và bảng tùy chỉnh dạng sheet nằm bên trong chúng.
- Tấm giấy đọc dùng `.reader-article::before` cho kính, vì cổng khóa (fixed, phủ toàn màn hình) nằm trong `<article>`.
- Cha có `opacity < 1` làm kính con mất nền trong lúc chuyển cảnh: dock và toolbar làm mờ **con** chứ không làm mờ chính nó.
- Khúc xạ chỉ đặt cho vài phần tử lớn (header, tab bar, ô tìm kiếm, vé nổi bật, toolbar, dock, thẻ 404). Thẻ truyện, chip chỉ dùng kính thường; trên điện thoại chip bỏ blur.

## Thành phần

| Thành phần | File | Ghi chú |
| --- | --- | --- |
| Header kính + tab bar | `header.php` | Header nổi trên đầu mọi trang nhưng **chỉ ghim ở trang đọc** (trang khác cuộn là trôi đi). Cùng một `<nav id="main-nav">`: thanh giữa header trên máy tính, tab bar kính ở đáy dưới 900px (3 mục với khách, thêm "Đăng truyện" cho người viết; ẩn ở trang đọc). |
| Logo | `thu_cac_logo_mark()`, `thu_cac_brand()` | Bong bóng thoại (câu chuyện) hình trạm dừng, monogram hai chữ D lồng nhau + tia sáng; chữ "2D" cuối tên thành nhãn kính. Tên đổi ở Giao diện → Tùy biến → Trạm Truyện 2D. Favicon `assets/img/favicon.svg` (khi chưa đặt Site Icon). |
| Cảnh sân ga | `template-parts/scene.php` | SVG vẽ tay, màu theo `--sc-*` nên đổi theo Sáng/Tối. |
| Vé nổi bật | `front-page.php` `.ticket` | Kính khúc xạ, nghiêng 3D theo chuột, cuống vé có lỗ bấm và mã vạch. |
| Thẻ truyện | `template-parts/story-card.php` | Bìa 3:4 + tấm kính chú thích dán ở mép dưới; bìa tạo bằng CSS khi không có ảnh. |
| Bảng giờ tàu | `thu_cac_latest_chapters()` | Chương mới nhất của 6 truyện vừa cập nhật. Chỉ tiêu đề và số chương. |
| Kệ đề cử | `front-page.php` | 8 truyện ngẫu nhiên theo ngày (`RAND(Ymd)`), giống nhau cả ngày nên hợp với cache. |
| Lộ trình chương | `single-story.php` `.route` | Đường tuyến màu thể loại, mỗi chương một trạm; 2 cột trên máy tính. |
| Lượt xem | `thu_cac_views()` | Từ plugin Post Views Counter: trang truyện + mọi chương, rút gọn "12,3K". Không có plugin thì không hiện (hoặc số `_sw_reads` nhập tay). |
| Tác giả / đánh giá trống | `thu_cac_story()` | Không có tác giả: "Chưa rõ tác giả" (không viết "Đang cập nhật", dễ nhầm với trạng thái truyện). Không có đánh giá: ẩn ngôi sao. |
| Đăng truyện | `header.php` | Chỉ hiện với tài khoản được viết bài; khách không thấy link vào wp-admin. |
| Đọc tiếp | `site.js` | Nút "Đọc tiếp chương N" từ `storyweb:progress:<slug>` trên máy người đọc. |
| Trang đọc | `single-chapter.php` | Ánh bìa mờ phía sau, toolbar kính, giấy kính, thanh tiến độ cuộn (CSS scroll-timeline), dock kính. Mặc định **Ghim**: header và toolbar luôn ghim trên cùng, phía sau có dải kính mờ trải ngang (`.reader-veil`, hiện khi đã cuộn); dock luôn ở đáy từ lúc mở trang, chỉ nhường chỗ khi thanh điều hướng cuối chương hiện ra hoặc khi mở danh sách chương/tùy chỉnh/cổng khóa. Người đọc chọn **Không ghim** trong Tùy chỉnh đọc (`toolbarMode`, mục "Header khi cuộn"): chỉ header và toolbar tự ẩn khi cuộn xuống, hiện lại khi cuộn lên; dock luôn ghim ở cả hai chế độ. Logic: `resolveReaderChrome()` trong `reader-core.js`, có test. |

## Kiểm tra khi sửa giao diện

- 1440/1280, 768, 390/360px; Sáng và Tối; bàn phím (focus 3px `--focus`), độ tương phản.
- `scripts/wp/check-content.mjs` (cấu trúc + không lộ chương khóa), `check-browser.mjs` (tràn ngang, phông, tùy chỉnh đọc, dock, tab bar), `check-admin.mjs`, `npm test`.
