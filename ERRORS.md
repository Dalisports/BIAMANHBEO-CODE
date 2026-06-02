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

---
