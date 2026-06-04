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

## [2026-06-04 03:58] - Lỗi Thiếu Import cn trong Attendance.tsx (TypeScript Compile Error)

- **Type**: Syntax
- **Severity**: Low
- **File**: `client/src/pages/Attendance.tsx:151,293`
- **Agent**: Mi
- **Root Cause**: Hàm `cn` được sử dụng để ghép class CSS có điều kiện trong file component nhưng chưa được import từ `@/lib/utils`.
- **Error Message**: 
  ```
  client/src/pages/Attendance.tsx:151:22 - error TS2304: Cannot find name 'cn'.
  ```
- **Fix Applied**: Thêm `import { cn } from "@/lib/utils";` vào đầu file.
- **Prevention**: Luôn chạy `npm run check` (hoặc `tsc`) trước khi kết thúc chỉnh sửa để đảm bảo không lỗi kiểu dữ liệu hoặc thiếu import.
- **Status**: Fixed

---

