# Bảng việc chung

Codex điều phối tích hợp. Claude Code và Antigravity nhận việc qua `docs/assignments/` (việc đang giao; việc cũ ở `docs/archive/assignments/`) và làm trên worktree riêng. Mỗi agent cập nhật **Trạng thái**, **File sở hữu**, **Bàn giao** khi bắt đầu/kết thúc.

## Đang mở

| ID | Chủ trì | Việc | Trạng thái | File sở hữu | Bàn giao/tiêu chí hoàn thành |
| --- | --- | --- | --- | --- | --- |
| C1 | Claude Code | Dọn codebase: export/hằng không dùng, CSS chết, test script, docs cũ, rác local | Hoàn tất trên `claude/cleanup`, chờ Codex review/tích hợp; không push `main`, không deploy. Giữ code migrate localStorage (`storyweb:night`, `storyweb:font-size`) theo yêu cầu người dùng | Commit `204897d` (code), `d7d1038` (CSS, người dùng cho phép sửa phần Antigravity), `a2b1ba1` (scripts), `4141520` (docs), `795bc7e` (guard tên DB test). Không đổi hành vi, quyền đọc, unlock, schema/migration, dependency hay lockfile | **Code:** bỏ `getStory`, `AD_PLACEMENT_INFO`, `isAdPlacement`, `getUserById`, `sameReaderPreferences`; bỏ `export` ở hằng/hàm chỉ dùng nội bộ; `ad-slot.tsx` dùng `AdPlacement` từ lib; bỏ xóa cookie `storyweb_click_unlock` (đã hết hạn trước M2, vẫn bị từ chối). **CSS:** xóa rule chết `.stat-star`, `.chapter-note`, `.reader-pager`, `.locked-panel__close`, `.reader-nav__main`, `.reader-nav__label-short` và `.reader-nav` lặp trong media 600px; `.reader-shell--night` → `[data-theme="dark"]` (cùng specificity/vị trí), bỏ 3 rule trùng ở dark-overrides. **Scripts:** `npm run test:unit` (36 test, không cần DB); xóa `scripts/import-stories.mjs` (import JSON một lần của B2) và `content/`. **Docs:** assignment và 3 plan đã xong chuyển vào `docs/archive/`; B1 review vào `docs/reviews/`; workboard chỉ còn việc đang mở + tóm tắt, nội dung đầy đủ ở `docs/archive/WORKBOARD_HISTORY.md`; 0 link hỏng. **Local:** xóa 12 worktree + 19 nhánh local đã merge và sạch, `.npm-cache` (202 MB), `debug.log`; giữ `antigravity-u4`/`u7` (có thay đổi chưa commit) và `claude-m2` (chưa merge); không đụng remote. **Kiểm tra:** typecheck/lint/build/diff check đạt; `test:unit` 36/36. So computed style bản `main` và cleanup bằng Chrome CDP trên 6 trang × Sáng/Tối × 1280/360px (4.220 phần tử): không khác giá trị nào. DB Railway riêng `storyweb_c1_test` (đã xóa): `test-unlock-link` 10/10, B1 auth 15/15, smoke đạt. Context7: không cần (xóa code/CSS/docs, không dùng API mới). Memory: đã tra M5/U7; đã cập nhật C1, gotcha:worktree-node-modules. |
| M1 | Codex + Claude Code | Chọn nhà cung cấp quảng cáo có thưởng | Theo dõi trong M2; chưa có provider web xác minh được | provider/ad integration | Không dùng sự kiện thưởng chỉ ở client làm bằng chứng cấp quyền server; xem `docs/ADS_UNLOCK_PLAN.md` |

## Đã hoàn tất

Tóm tắt; nội dung đầy đủ (file, kiểm tra, bàn giao) ở [lịch sử bảng việc](archive/WORKBOARD_HISTORY.md).

| ID | Chủ trì | Việc | Kết quả | |
| --- | --- | --- | --- | --- |
| I18 | Codex | Tích hợp U7/M5, kiểm tra và phát hành | `main` đã push app `c2da8f5` | [chi tiết](archive/WORKBOARD_HISTORY.md#i18) |
| I17 | Codex | Review M5 hoàn tất và U7 commit mới | Logic đạt | [chi tiết](archive/WORKBOARD_HISTORY.md#i17) |
| I16 | Codex | Kiểm tra bàn giao U7 và tiến độ M5 | Review hoàn tất | [chi tiết](archive/WORKBOARD_HISTORY.md#i16) |
| I15 | Codex | Chốt contract dock kính mờ và giao U7/M5 | Hoàn tất phần giao việc | [chi tiết](archive/WORKBOARD_HISTORY.md#i15) |
| U7 | Antigravity | Thiết kế/code dock kính mờ 4 nút và toolbar reader | Hoàn tất code `b9c30db`, ảnh/walkthrough `2c2f8e5` | [chi tiết](archive/WORKBOARD_HISTORY.md#u7) |
| M5 | Claude Code | Logic hiện/ẩn toolbar/dock khi cuộn và ghép view U7 | Hoàn tất `a688614` | [chi tiết](archive/WORKBOARD_HISTORY.md#m5) |
| I14 | Codex | Push M4, deploy Railway và bật cờ server để admin thử Nhấp liên kết | Hoàn tất: app commit `e49dab8`, deployment sau bật cờ `812bad29` SUCCESS | [chi tiết](archive/WORKBOARD_HISTORY.md#i14) |
| I13 | Codex | Review bảo mật và tích hợp M4 | Đã review `6a5748d`, tích hợp `main` (`e49dab8`) | [chi tiết](archive/WORKBOARD_HISTORY.md#i13) |
| M4 | Claude Code | Cho admin lưu URL HTTPS công khai tùy chọn và bật phương thức Nhấp liên kết để test | Đã qua Codex review I13, tích hợp `main` và phát hành production trong I14 | [chi tiết](archive/WORKBOARD_HISTORY.md#m4) |
| I7 | Codex | Lập kế hoạch phân tầng giao diện và giao U6 | Hoàn tất trên `codex/u6-design-brief` | [chi tiết](archive/WORKBOARD_HISTORY.md#i7) |
| I8 | Codex | Review U6 của Antigravity trước tích hợp | Hoàn tất review `c6be7f2`: cần sửa, chưa merge | [chi tiết](archive/WORKBOARD_HISTORY.md#i8) |
| I9 | Codex | Review vòng 2 U6 | Hoàn tất review `31f72cd`: còn lỗi chặn, chưa merge | [chi tiết](archive/WORKBOARD_HISTORY.md#i9) |
| I10 | Codex | Review và tích hợp vòng 3 U6 | Hoàn tất trên `main` | [chi tiết](archive/WORKBOARD_HISTORY.md#i10) |
| I11 | Codex | Test, push GitHub và deploy U6 lên Railway production | Hoàn tất: app commit `479a471`, deployment `a04bd3ac` SUCCESS | [chi tiết](archive/WORKBOARD_HISTORY.md#i11) |
| I12 | Codex | Sửa trang Quảng cáo & mở khóa: lưu URL thử nghiệm, trạng thái rõ và giao diện | Đã deploy app `02869ae` lên Railway `d84c9354` SUCCESS | [chi tiết](archive/WORKBOARD_HISTORY.md#i12) |
| U6 | Antigravity | Thiết kế lại lớp nền/mặt đọc Sáng-Tối và hệ card/section toàn site | Code `31f72cd` + `f1e534e` đã tích hợp `main` qua I10 và lên production qua I11 | [chi tiết](archive/WORKBOARD_HISTORY.md#u6) |
| U5 | Antigravity | Trang đọc: tên truyện và kết chương rõ hơn, 4 nút đồng kiểu căn giữa, view tùy chỉnh đọc, Sáng/Tối + mobile | Hoàn tất code `d2300d3`, đã ghép M3/I3 | [chi tiết](archive/WORKBOARD_HISTORY.md#u5) |
| M3 | Claude Code | Logic tùy chỉnh đọc và test mở khóa 5 phút trên môi trường riêng; ghép view U5 | Đã ghép bản sửa U5 `d2300d3`: body chỉ còn inline `font-size`, còn lại dùng CSS `data-pref-*` | [chi tiết](archive/WORKBOARD_HISTORY.md#m3) |
| I3 | Codex | Review và tích hợp U5/M3, nghiệm thu giao diện và test unlock | Đã review/tích hợp `main` (`19cb82f`) | [chi tiết](archive/WORKBOARD_HISTORY.md#i3) |
| I4 | Codex | Nghiệm thu browser U5/M3, sửa header tablet và nhãn nút cuối chương | Hoàn tất `87efd2b`, đã phát hành production trong I6 (`1815498e`) | [chi tiết](archive/WORKBOARD_HISTORY.md#i4) |
| I5 | Codex | Chạy e2e mở khóa/migration trên PostgreSQL Railway bằng DB test riêng | Hoàn tất trên `codex/i5-railway-db-test` | [chi tiết](archive/WORKBOARD_HISTORY.md#i5) |
| I6 | Codex | Kiểm thử bản tích hợp, push GitHub và deploy Railway production | Hoàn tất: code `49ad7d9` đã lên Railway, deployment `1815498e` SUCCESS | [chi tiết](archive/WORKBOARD_HISTORY.md#i6) |
| S0 | Codex | Scaffold, khóa chương 5 phút, tích hợp và deploy | Hoàn tất | [chi tiết](archive/WORKBOARD_HISTORY.md#s0) |
| U1 | Agent UI nội bộ (trước đây) | Rà soát UI/UX panel đăng truyện mobile + desktop | Hoàn tất | [chi tiết](archive/WORKBOARD_HISTORY.md#u1) |
| B1 | Claude Code + Codex review | Xác thực nhiều tác giả và tài khoản độc giả | Đã tích hợp `main`, Railway production chạy migration `0002` | [chi tiết](archive/WORKBOARD_HISTORY.md#b1) |
| B2 | Agent backend nội bộ (trước đây) | Chuyển panel JSON local sang PostgreSQL | Hoàn tất, kiểm thử Railway đạt | [chi tiết](archive/WORKBOARD_HISTORY.md#b2) |
| I1 | Codex | Tích hợp quyền đọc với DB | Hoàn tất, kiểm thử Railway đạt | [chi tiết](archive/WORKBOARD_HISTORY.md#i1) |
| M2 | Claude Code | Code toàn bộ logic: admin switch hai mode, quyền đọc 5 phút, registry quảng cáo và tích hợp view U4 | Hoàn tất logic + đã ghép view U4 (`dadb41e`) | [chi tiết](archive/WORKBOARD_HISTORY.md#m2) |
| U4 | Antigravity + Codex review | Thiết kế/code giao diện nút chương, ad slots, dialog hai mode, switch admin | View commit `dadb41e` đã ghép M2 | [chi tiết](archive/WORKBOARD_HISTORY.md#u4) |
| I2 | Codex | Review/tích hợp M2 + U4, kiểm tra bảo mật và deploy | Đã tích hợp `main`, Railway production SUCCESS | [chi tiết](archive/WORKBOARD_HISTORY.md#i2) |
| U2 | Agent UI nội bộ (trước đây) | Hoàn thiện trạng thái panel/CMS hiện có | Hoàn tất phần panel hiện có | [chi tiết](archive/WORKBOARD_HISTORY.md#u2) |
| U3 | Antigravity + Codex review | Hoàn thiện Studio/trang đọc, font tiếng Việt và theme Sáng/Tối toàn site | Đã tích hợp `main`, Railway production SUCCESS | [chi tiết](archive/WORKBOARD_HISTORY.md#u3) |

## Giao thức bàn giao

1. Nhận việc: đổi `Chưa nhận` thành `Đang làm (tên agent)`, ghi file sẽ sửa. Tra Memory (`search_nodes` theo ID task/khu vực) trước khi đọc code; xem `docs/MCP_TOOLS.md`.
2. Nếu cùng file với agent khác: dừng phần file đó, thỏa thuận thứ tự hoặc dùng nhánh/worktree riêng.
3. Kết thúc: ghi commit/PR (nếu có), file thay đổi, `typecheck/lint/build`, việc còn thiếu, `Memory: đã tra <task/khu vực>; đã cập nhật <entity>` và `Context7: <tài liệu>` khi sửa API thư viện (hoặc nêu không cần/lỗi kết nối). Codex không tích hợp bàn giao thiếu bằng chứng hoặc lý do.
4. Codex tích hợp sau khi từng phần hoàn tất; không để hai agent cùng chạy migration trên một DB.

## Quyết định cần người dùng cung cấp trước khi làm production

- Nguồn truyện và quyền đăng tải.
- Chấp thuận riêng của Shopee và link affiliate trước khi bật cờ Shopee gate; nếu chưa có thì không bật mode link Shopee.
- Nhà cung cấp quảng cáo có thưởng cho web, quyền dùng SDK và bằng chứng hoàn thành mà server kiểm được. Chưa có thì mode rewarded giữ tắt.
- Dịch vụ thanh toán và mô hình điểm/gói đọc nếu triển khai.
- PostgreSQL dùng local, managed hay hạ tầng hiện có.
