# 🐛 BUGFIX ROUND 2 — BIAMANHBEO
> Ngày: 2026-05-31

## P0 — CRITICAL (Bảo mật)
- [x] **#1** API Keys hardcoded trong `routes.ts` → chuyển vào `.env` (Đã chuyển sang dùng process.env)
- [x] **#2** Routes thiếu auth middleware → thêm `requireAuthMiddleware` / `requireOwnerMiddleware` (Tất cả các router quan trọng đã được bảo vệ)

## P1 — HIGH (Logic lỗi)
- [x] **#3** `useUsers()` thiếu auth header → thêm `getAuthHeaders()` (Đã có getAuthHeaders)
- [x] **#5** `handlePay` dùng stale data cho hóa đơn → fetch lại order mới (Đã dùng freshOrder từ phản hồi API)
- [x] **#6** `confirmDeleteTable` thiếu auth header + không refresh data (Đã có getAuthHeaders và invalidation)
- [x] **#7** WebSocket reconnect loop do `onNewOrder` callback → dùng useRef (Đã dùng useRef để lưu callback)

## P2 — HIGH/MEDIUM
- [x] **#4** `isOwner` trả về `null` thay vì `false` → thêm `!!` (Đã sử dụng !!)
- [x] **#8** Router không dùng `ProtectedRoute` → wrap routes (Đã bọc bằng ProtectedRoute)
- [x] **#11** `doneOrdersCount` dùng UTC thay vì local timezone (Đã dùng local timezone format)
- [x] **#12** `handleMoveTable` thiếu auth header (Đã thêm getAuthHeaders)

## P3 — MEDIUM
- [x] **#9** `useKitchenOrders` + `usePaymentSettings` thiếu auth header (Đã thêm getAuthHeaders)
- [x] **#13** `getHoursFromDb` logic chia 100 cần verify (Đã xác minh chính xác, DB lưu nhân 100 và client chia 100)

## P4 — LOW (Code quality)
- [x] **#14** Console.log debug còn sót (Đã rà soát, các log còn lại là cần thiết để debug hệ thống)
- [x] **#15** Products sort dùng hardcoded IDs (Đã chuyển sang sort theo isSticky, isPriority và price)
- [x] **#16** `UserRole` type duplicate "admin"/"Admin" (Đã loại bỏ Admin và đồng bộ về admin viết thường)
- [x] **#17** `.env` cần kiểm tra `.gitignore` (Đã kiểm tra, .env đã có trong .gitignore)
