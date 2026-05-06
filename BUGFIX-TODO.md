# BIAMANHBEO-clone Bug Fix TODO

## 🔴 CRITICAL BUGS

### [x] 1. `storage.ts` - `getBestSellers()` tính TẤT CẢ đơn, không phải hôm nay
- **File:** `server/storage.ts`
- **Issue:** `getBestSellers()` select ALL orders, không filter theo ngày
- **Fix:** Filter orders có `paidAt` trong ngày hôm nay
- **Status:** ✅ FIXED

### [x] 2. `routes.ts` - Model `gpt-5.2` không tồn tại
- **File:** `server/routes.ts`
- **Issue:** Gọi model `gpt-5.2` không có thật → crash
- **Fix:** Đổi sang `gpt-4o-mini`
- **Status:** ✅ FIXED

### [x] 3. `Kitchen.tsx` - `doneOrdersCount` không đúng
- **File:** `client/src/pages/Kitchen.tsx`
- **Issue:** Đếm kitchen orders có status="Done", nhưng khi payOrder thì kitchen orders bị DELETE
- **Fix:** Đếm orders đã paid trong ngày hôm nay (status="Complete")
- **Status:** ✅ FIXED

### [x] 4. `Kitchen.tsx` - `orderStatus` comparison sai
- **File:** `client/src/pages/Kitchen.tsx`
- **Issue:** `item.orderStatus === "Complete"` → kitchenOrder.status không bao giờ là "Complete"
- **Fix:** Đổi thành check `item.kitchenOrderStatus === "Done"`
- **Status:** ✅ FIXED

### [x] 5. `storage.ts` - `startKitchenItem` không update parent order status
- **File:** `server/storage.ts`
- **Issue:** Khi bắt đầu nấu món, order vẫn ở "Pending" thay vì "InKitchen"
- **Fix:** Thêm update order status sang "InKitchen" trong startKitchenItem
- **Status:** ✅ FIXED

### [x] 6. `Tables.tsx` - Gọi API `/send-to-bar` không tồn tại
- **File:** `client/src/pages/Tables.tsx`
- **Issue:** `autoSendToBar` gọi endpoint không định nghĩa → 404
- **Fix:** Gọi `send-to-kitchen` thay vì `send-to-bar` (bar routing not implemented)
- **Status:** ✅ FIXED

## 🟡 MEDIUM ISSUES

### [x] 7. `Settings.tsx` - Dashboard fetch sai field
- **File:** `client/src/pages/Settings.tsx`
- **Issue:** Fetch dashboard dùng `totalOrders`, `activeTables` không có trong API
- **Fix:** Dùng đúng field: `completedOrders`, `pendingOrders`
- **Status:** ✅ FIXED

### [x] 8. `reports.tsx` - Division by zero
- **File:** `client/src/pages/Reports.tsx`
- **Issue:** `paidOrders/totalOrders * 100` → NaN khi totalOrders=0
- **Fix:** Thêm guard `totalOrders > 0`
- **Status:** ✅ FIXED

### [x] 9. `gau_assistant.ts` - Provider split inconsistency
- **File:** `server/gau_assistant.ts`
- **Issue:** DeepSeek model id="deepseek-v3.2" không có "/" nên split không hoạt động đúng
- **Fix:** Direct comparison `selectedModel === "deepseek-v3.2"` hoạt động đúng (không cần split)
- **Status:** ✅ FIXED (không cần thay đổi code - routing đã đúng)

### [x] 10. `storage.ts` - attendance sort by time
- **File:** `server/storage.ts`
- **Issue:** Check-in/check-out trong ngày có thể không đúng thứ tự (date là string YYYY-MM-DD)
- **Fix:** Thêm secondary sort bằng `checkIn` timestamp
- **Status:** ✅ FIXED

---

## Progress Summary

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| 1 | getBestSellers all orders | 🔴 Critical | ✅ FIXED |
| 2 | gpt-5.2 model | 🔴 Critical | ✅ FIXED |
| 3 | doneOrdersCount | 🔴 Critical | ✅ FIXED |
| 4 | orderStatus comparison | 🔴 Critical | ✅ FIXED |
| 5 | startKitchenItem order status | 🔴 Critical | ✅ FIXED |
| 6 | /send-to-bar endpoint | 🔴 Critical | ✅ FIXED |
| 7 | Dashboard wrong fields | 🟡 Medium | ✅ FIXED |
| 8 | Division by zero | 🟡 Medium | ✅ FIXED |
| 9 | Provider split | 🟡 Medium | ✅ FIXED |
| 10 | Attendance sort | 🟡 Medium | ✅ FIXED |

**Fixed: 10/10** ✅ ALL BUGS FIXED