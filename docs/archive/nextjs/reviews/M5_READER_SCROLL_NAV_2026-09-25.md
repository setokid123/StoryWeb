# M5 — Logic hiện/ẩn toolbar và dock khi cuộn trang đọc (2026-09-25)

Nhánh `claude/m5-reader-scroll-nav`. Đã merge U7 `cd4c301`, và Claude sửa CSS theo I16 ở commit riêng `7b5e5be` (người dùng yêu cầu). Không sửa quyền đọc, grant 5 phút, unlock, ads, API, migration hay view U7.

## File

- `src/lib/reader-scroll.ts` (mới, thuần): `nextScrollState` (hướng cuộn, quãng đi từ điểm đổi hướng) và `resolveReaderChrome` (quy tắc modal/focus/nav cuối).
- `src/components/use-reader-scroll.ts` (mới):
  - một listener `scroll` passive và `resize`, tối đa một lần tính mỗi `requestAnimationFrame`;
  - `setState` chỉ khi cờ hiển thị đổi;
  - `IntersectionObserver` cho nav cuối chương;
  - cleanup đầy đủ.
- `src/components/reader-panel.tsx`:
  - gắn trạng thái toolbar;
  - render `ReaderFloatingNavigation`;
  - trả focus về đúng nút đã mở danh sách chương;
  - bọc nav cuối bằng `div` có ref cho observer.
- `scripts/test-reader-scroll.mjs` (mới): 12 unit test.

## Hành vi

| Tình huống | Toolbar | Dock |
| --- | --- | --- |
| Trong 160px đầu trang | `data-scroll-state="top"`, vị trí thường | ẩn |
| Cuộn xuống ≥ 24px (tính từ điểm bắt đầu cuộn xuống) | `hidden` (`.is-hidden`, `inert`) | ẩn |
| Cuộn lên ≥ 64px | `pinned` (sticky) | hiện |
| Rung tay nhỏ hơn các ngưỡng trên | giữ nguyên | giữ nguyên |
| Đáy màn hình cách cuối trang ≤ max(480px, 1 màn hình) | theo hướng cuộn | hiện, kể cả khi cuộn xuống |
| Nav cuối chương lọt vào viewport | theo hướng cuộn | ẩn (không có hai nav cùng lúc) |
| Chương khóa, danh sách chương hoặc Tùy chỉnh đang mở | Tùy chỉnh mở thì giữ `pinned` | ẩn + `inert` |
| Focus bàn phím (`:focus-visible`) đang nằm trong toolbar hoặc dock | giữ hiện | giữ hiện (trừ khi modal hoặc chương khóa) |

- Khi ẩn, toolbar/dock có `inert` nên không nhận Tab hay click. View U7 cũng đặt `tabIndex=-1` và `aria-hidden`.
- Focus do bấm chuột không giữ dock, nên dock vẫn ẩn khi cuộn.
- **Focus return:**
  - Mở danh sách chương từ dock thì trả về nút dock; mở từ nav cuối thì trả về nút nav cuối. Đóng Tùy chỉnh thì trả về nút Tùy chỉnh.
  - Dock/toolbar được **pin** tạm cho đến khi focus thật sự vào nút. Code thử lại tối đa 20 khung hình, vì khung đầu của transition `visibility` vẫn còn `hidden` và trình duyệt từ chối focus. Hết số lần thử thì bỏ pin, không để trạng thái kẹt.
  - Lỗi này được walkthrough phát hiện và đã sửa.
- **Đổi chương:** `ReaderPanel` remount theo key của trang, nên state bắt đầu lại từ đầu.
- **SSR:** trạng thái mặc định là `top` + dock ẩn/`inert`, nên không bị hydration mismatch.

## Contract với U7

- `ReaderFloatingNavigation` nhận `visible={chrome.dockVisible}`, `storyUrl`, `prevUrl`/`nextUrl` (cùng `navigation.prevHref`/`nextHref` với nav cuối, `prefetch={false}` trong view), `onOpenChapterList`, `listButtonRef` (ref riêng).
- Toolbar:
  - class `reader-toolbar is-hidden` khi ẩn;
  - `data-scroll-state="top|pinned|hidden"`, để CSS làm trạng thái thu gọn cho `pinned` nếu muốn;
  - thuộc tính `inert` khi ẩn.

## Kiểm tra

- `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` đều đạt.
- Unit test: `test-reader-scroll` 12/12, `test-reader-preferences` 8/8.
- **Walkthrough Chrome headless (CDP)** với `next start`:
  - Chạy trên database Railway riêng `storyweb_m5_test` (đã xóa; không đụng DB `railway`), truyện mẫu `thanh-pho-sau-con-mua`. Chương 1 được nhân đoạn trong DOM để trang đủ dài.
  - 19/19 check đạt:
    - đầu trang;
    - cuộn xuống ẩn, toolbar `inert`;
    - rung 20px không đổi;
    - cuộn lên 80px thì hiện;
    - Enter trên nút dock mở danh sách, dock `inert`; Escape trả focus về nút dock;
    - focus bàn phím giữ dock khi cuộn xuống, blur thì dock ẩn;
    - gần cuối dock hiện; nav cuối vào viewport dock ẩn;
    - mở từ nav cuối trả focus về nút nav cuối;
    - Tùy chỉnh mở giữ toolbar, dock `inert`, Escape trả focus về nút Tùy chỉnh;
    - khi ẩn không còn control nào Tab tới được;
    - chương 2 khóa: không có body, dock luôn `inert`;
    - 320/360/768px: dock nằm trong viewport, nút cao ≥ 44px, không tràn ngang; mobile lưới 2 hàng, 768px một hàng.
- Ảnh (theme Tối vì headless dùng theme hệ thống): `screenshots/m5-desktop-1280-scrolled-up.png`, `m5-desktop-1280-near-end.png`, `m5-desktop-1280-end-nav.png`, `m5-w320-dock.png`, `m5-w360-dock.png`, `m5-w768-dock.png`.

## Còn lại, cần Antigravity/Codex

- **Tương phản dock (CSS U7):** ở ảnh 360px Tối, nền `rgba(37,53,56,.85)` để chữ bên dưới lộ qua nhãn nút. Headless có thể không render `backdrop-filter`; cần kiểm trên trình duyệt thật, và nếu vẫn thế thì tăng độ đặc.
- **Dock che chữ khi đang hiện:** CSS chưa chừa khoảng dưới cho nội dung. Logic đã giảm việc che: dock ẩn khi cuộn xuống và khi nav cuối đã vào viewport.
- Chưa chụp ảnh theme Sáng và chưa thử trên thiết bị cảm ứng thật. Test chạy bằng `window.scrollTo`, không phải cử chỉ vuốt.
- `reduced-motion` do CSS U7 xử lý; logic không phụ thuộc animation.

Context7: `/reactjs/react.dev` không có tài liệu về `inert`. Đã xác nhận qua `@types/react` 19 (`inert?: boolean`). Không đổi API Next. Memory: đã tra `M5`, `reader-navigation`, `U7`, `I16`; đã cập nhật `M5`, `contract:ReaderFloatingNavigation`, `gotcha:focus-during-visibility-transition`.
