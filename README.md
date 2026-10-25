# Thư Các — website đọc truyện trên WordPress

Website đọc truyện gồm **một theme** và **một plugin** cho WordPress tự host (WordPress.org). Không phải WordPress.com.

- `wp-content/themes/thu-cac` — giao diện **Trạm Truyện 2D** (kính lỏng kiểu iOS; trang chủ, khám phá, chi tiết truyện, trang đọc với tùy chỉnh đọc/Sáng-Tối/dock, tủ truyện). Thiết kế: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).
- `wp-content/plugins/storyweb-core` — truyện/chương, thể loại, đường dẫn `/truyen/` và `/doc/`, và **khóa chương phía máy chủ** (chương khóa không lộ qua HTML, REST, RSS, embed, sitemap).

> Dự án này được chuyển từ một bản Next.js trước đó. Lịch sử bản cũ vẫn nằm trong git; tài liệu của bản cũ ở [docs/archive](docs/archive/README.md). Quy ước cho các coding agent: [AGENTS.md](AGENTS.md).

## Yêu cầu

- WordPress tự host, PHP ≥ 8.1, MySQL/MariaDB. (WordPress.com gói thường **không** cài được theme/plugin tự làm — cần gói Business, hoặc dùng hosting riêng.)
- Node.js ≥ 20 chỉ để chạy test logic và đóng gói.

## Đóng gói để tải lên wp-admin

```bash
node scripts/wp/package.mjs   # dist/wp/thu-cac.zip, dist/wp/storyweb-core.zip
```

Cài **plugin trước**, rồi theme. Hướng dẫn chi tiết: [docs/WORDPRESS_DEPLOY.md](docs/WORDPRESS_DEPLOY.md).

## Deploy

- **Hosting cPanel** (đơn giản, rẻ): [docs/WORDPRESS_DEPLOY.md](docs/WORDPRESS_DEPLOY.md).
- **Railway** (theo git, nhúng theme+plugin vào Docker image): [deploy/railway-wp/README.md](deploy/railway-wp/README.md).

## Chạy thử trên máy (không cần cài PHP)

Qua WordPress Playground, có sẵn dữ liệu mẫu và bộ kiểm tra: [scripts/wp/README.md](scripts/wp/README.md).

```bash
npm test   # test logic trang đọc (tùy chỉnh đọc, ẩn/hiện toolbar khi cuộn)
```

## Chưa làm (bước sau)

- Quảng cáo có thưởng: kế hoạch từ bản cũ ở [docs/archive/nextjs/ADS_UNLOCK_PLAN.md](docs/archive/nextjs/ADS_UNLOCK_PLAN.md). (Mở khóa chương bằng link đã có: wp-admin → **Truyện → Mở khóa chương**.)
- Plugin: đã chọn trong [docs/PLUGINS.md](docs/PLUGINS.md). Nhóm SEO/cache/quảng cáo phải thử với chương khóa trước khi cài lên site thật.
- Chuyển dữ liệu truyện từ bản cũ.
