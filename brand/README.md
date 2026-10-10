# Logo Trạm Truyện 2D

"2D" là **hai chữ D**: hai người làm trang. Logo là bong bóng thoại (câu chuyện) với hai chữ D lồng nhau, một chữ trong như kính, một chữ đặc.

| File | Dùng cho |
| --- | --- |
| `logo-dd.svg` | Bản gốc dạng vector, phóng to bao nhiêu cũng nét (in ấn, thiết kế). |
| `logo-dd-1024.png`, `logo-dd-512.png` | Biểu tượng nền trong suốt. `512` dùng làm **Biểu tượng trang** trong wp-admin: Giao diện → Tùy biến → Nhận diện trang. |
| `logo-dd-192.png`, `logo-dd-180.png`, `logo-dd-32.png` | Biểu tượng ứng dụng / trình duyệt cỡ nhỏ. |
| `anh-dai-dien-1024.png` | Ảnh đại diện vuông (Facebook, Zalo, TikTok…), logo nằm giữa nên cắt tròn vẫn đủ. |
| `logo-ngang-nen-sang.png`, `logo-ngang-nen-toi.png` | Logo có chữ, nằm ngang, nền trong suốt: bản chữ đậm cho nền sáng, bản chữ trắng cho nền tối. |
| `logo-doc-nen-sang.png`, `logo-doc-nen-toi.png` | Logo có chữ, xếp dọc (ảnh bìa, banner vuông). |

Màu: gradient `#4f7bff → #8b4dff → #ff4f9a`, nút/nhãn `#4f46e5 → #7c3aed → #db2777`, chữ `#1d1842`. Phông chữ: Unbounded (chữ "Trạm Truyện" và "2D").

## Ảnh khi gửi link (Zalo, Facebook, Messenger)

`og-render.mjs` vẽ bằng Chrome headless (đúng phông thật) hai ảnh 1200×630 trong theme:

- `assets/img/og-image.jpg`: ảnh chung của site (trang chủ, tìm kiếm, thể loại).
- `assets/img/og-story-frame.png`: khung cho từng truyện, có lỗ trong suốt chỗ đặt bìa. Máy chủ (`inc/share.php`, GD + phông Be Vietnam Pro trong `assets/fonts/`) dán bìa vào lỗ, viết tên truyện, tác giả, số chương rồi lưu một lần vào `uploads/thu-cac-share/`. Chương dùng ảnh và mô tả của truyện, không bao giờ dùng chữ trong chương.

Sửa khung thì giữ đúng vị trí lỗ (`HOLE`, khớp với ô bìa trong `thu_cac_share_draw()`), rồi tăng `THU_CAC_SHARE_REV` để vẽ lại mọi ảnh truyện. Facebook giữ ảnh cũ của link đã chia sẻ: dán link vào công cụ Sharing Debugger của Facebook để làm mới.

```bash
node brand/og-render.mjs brand/logo-dd.svg <thư mục ra> [ảnh bìa mẫu]
```

Logo trên website được vẽ bằng code (`thu_cac_logo_mark()` trong `wp-content/themes/thu-cac/inc/template-tags.php`) và favicon ở `wp-content/themes/thu-cac/assets/img/`; các file ở đây xuất từ cùng hình đó.
