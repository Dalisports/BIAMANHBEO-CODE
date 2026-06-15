# Lịch sử lỗi

## [2026-05-31 21:02] - Lỗi EADDRINUSE (Port Conflict)

- **Type**: Process
- **Severity**: Medium
- **File**: `N/A`
- **Agent**: Mi
- **Root Cause**: Lỗi `EADDRINUSE`, cổng 3000 đã bị chiếm dụng bởi một tiến trình khác (zombie process), làm cho `npm run dev` không thể khởi động.
- **Error Message**: 
  ```
  Error: listen EADDRINUSE: address already in use 0.0.0.0:3000
  ```
- **Fix Applied**: Tìm và kill tiến trình đang chạy trên port 3000 bằng PowerShell (`Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force`), sau đó restart server.
- **Prevention**: Luôn đảm bảo kill sạch node process trước khi restart dev server.
- **Status**: Fixed

## [2026-06-03 05:00] - Lỗi Trùng Lặp Thực Đơn (Menu Items Duplication)

- **Type**: Integration
- **Severity**: High
- **File**: `server/storage.ts`
- **Agent**: Mi
- **Root Cause**: Quá trình import dữ liệu (từ SQLite cũ sang Neon hoặc PostgreSQL Render) không dọn dẹp dữ liệu cũ, dẫn đến việc các bản ghi thực đơn trùng tên bị lưu song song với các ID khác nhau, khiến giao diện hiển thị lặp lại nhiều lần.
- **Error Message**: `N/A (Lỗi hiển thị trùng lặp trên giao diện do dữ liệu trùng)`
- **Fix Applied**: 
  1. Viết script `scripts/cleanup-menu.ts` dọn dẹp dữ liệu trùng lặp ở SQLite local, Neon DB cũ/mới và Postgres local.
  2. Tích hợp hàm tự động dọn dẹp `cleanupDuplicateMenuItems()` vào `server/storage.ts` và chạy nó khi server khởi động (`runMigrations`), giúp tự động dọn dẹp database Render trên production.
- **Prevention**: Luôn kiểm tra trùng lặp hoặc sử dụng cơ chế gộp/xóa trùng lặp trước khi import dữ liệu mới vào DB.
- **Status**: Fixed

## [2026-06-16 02:15] - Lỗi 500 Unique Constraint Violation sau khi di chuyển Database

- **Type**: Runtime
- **Severity**: High
- **File**: `server/storage.ts:430` (câu lệnh insert order mới)
- **Agent**: Mi
- **Root Cause**: Khi import dữ liệu lịch sử từ Neon DB sang Fly Postgres, ta insert trực tiếp cột ID khóa chính. Việc này khiến Postgres SEQUENCE quản lý ID tự tăng không được cập nhật. Khi ứng dụng tạo đơn hàng mới, Postgres cố gắng phát sinh ID bắt đầu từ 1, dẫn đến trùng khóa chính với dữ liệu lịch sử cũ (Unique Constraint Violation) và trả về lỗi 500 ở API `/api/orders`.
- **Error Message**: 
  ```
  postgres error: duplicate key value violates unique constraint "orders_pkey"
  ```
- **Fix Applied**: Viết script `reset-sequences.mjs` chạy qua proxy local kết nối tới Fly Postgres, thực hiện câu lệnh `SELECT setval(pg_get_serial_sequence('table', 'id'), coalesce(max(id), 1)) FROM "table"` cho tất cả 16 bảng của hệ thống để đồng bộ lại các sequence tự tăng.
- **Prevention**: Luôn chạy script reset sequence cho PostgreSQL ngay sau khi migration dữ liệu có chứa ID tự tăng.
- **Status**: Fixed

---

## [2026-06-16 02:18] - Lỗi 400 Bad Request ở API send-to-kitchen cho đơn hàng chỉ có đồ uống

- **Type**: Logic
- **Severity**: Medium
- **File**: `server/storage.ts:555`
- **Agent**: Mi
- **Root Cause**: Khi khách hàng tạo đơn hàng chỉ chứa các món ăn/đồ uống đã được đánh dấu ẩn đối với bếp (isHidden = true - ví dụ bia đóng chai), hàm sendToKitchen lọc bỏ toàn bộ các món này dẫn đến danh sách gửi bếp trống (itemsToSent.length === 0). Do chưa có đơn bếp nào trước đó, hàm sẽ ném ra exception 'No items to send to kitchen' gây ra lỗi 400 cho client.
- **Error Message**: 
  ```
  Fetch không tải được: POST /api/orders/117/send-to-kitchen 400 (Bad Request)
  ```
- **Fix Applied**: Sửa logic sendToKitchen trong storage.ts để nếu không có món nào cần gửi bếp (do bị ẩn) và chưa có đơn bếp cũ, thay vì ném lỗi, ta trả về một mock kitchenOrder đã hoàn thành (Done) với danh sách món rỗng để client nhận được phản hồi thành công.
- **Prevention**: Luôn xử lý các trường hợp biên khi các món ăn trong đơn hàng không thuộc diện cần xử lý ở bếp.
- **Status**: Fixed

---



