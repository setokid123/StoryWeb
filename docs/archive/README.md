# Lưu trữ tài liệu cũ

Chỉ để tra lịch sử. Các file trong thư mục này **không còn mô tả code hiện tại**, nên đừng làm theo chúng. Tài liệu đang dùng nằm ở `docs/` và `AGENTS.md`.

## `nextjs/`: bản Next.js (23/09 – 10/10/2026)

Trước khi chuyển sang WordPress, site là một app Next.js dùng PostgreSQL và Drizzle, với ba agent làm việc qua bảng việc chung. Phần còn giá trị khi làm bản WordPress:

- [ADS_UNLOCK_PLAN.md](nextjs/ADS_UNLOCK_PLAN.md): quyết định sản phẩm về quảng cáo và hai cách mở khóa. Quảng cáo có thưởng chỉ cấp quyền khi server xác minh được.
- [UNLOCK_API.md](nextjs/UNLOCK_API.md): contract mở khóa M2/M4. `storyweb-core/inc/unlock.php` được port từ đây.
- [reviews/SEC1_OWASP_REVIEW_2026-10-09.md](nextjs/reviews/SEC1_OWASP_REVIEW_2026-10-09.md): rà soát bảo mật. Giới hạn tần suất mở khóa trong plugin làm theo phát hiện ở đây. Bản này lấy từ nhánh `claude/sec1-owasp-review`, nhánh chưa từng merge.
- [WORKBOARD.md](nextjs/WORKBOARD.md) và [WORKBOARD_HISTORY.md](nextjs/WORKBOARD_HISTORY.md): bảng việc cũ (S0, B1–B2, M2–M5, U1–U7, I1–I20, WP1). Bảng này không còn được cập nhật.

Còn lại: kiến trúc, API tài khoản, hướng dẫn thử mở khóa, các kế hoạch U5–U7, assignment và review của từng bước (kèm ảnh chụp trong `nextjs/reviews/screenshots/`).

## `viet-lai/`: viết lại nội dung truyện (xong ngày 25/10/2026)

- [TIEN_DO_VIET_LAI.md](viet-lai/TIEN_DO_VIET_LAI.md): viết lại từ chương 2 trở đi, chương 1 giữ nguyên.
- [TIEN_DO_VIET_LAI_CH1.md](viet-lai/TIEN_DO_VIET_LAI_CH1.md): viết lại chương 1 cho toàn bộ 1.859 truyện.
- `stories_master_tracker.json`: danh sách truyện đã xong. `scripts/wp/mark-done.js` ghi vào file này.
