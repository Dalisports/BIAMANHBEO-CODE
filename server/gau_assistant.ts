import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { broadcast } from "./websocket";

// Ollama client for local Gemma 4
const OLLAMA_URL = "http://localhost:11434";
const OLLAMA_MODEL = "gemma4-fast:latest";

// Fly.io Ollama (Gemma 2 - deployed)
const FLY_OLLAMA_URL = "https://troly-gau.fly.dev";
const FLY_OLLAMA_MODEL = "gemma2:2b";

// Available models for selection
const AVAILABLE_MODELS = [
  { id: "ollama/gemma4-fast:latest", name: "Gemma 4 Fast (Local 8B)", provider: "ollama", description: "Model local nhanh - RTX 3060", hidden: false },
  { id: "fly/gemma2:2b", name: "Gemma 2 (Fly.io)", provider: "flyollama", description: "Model cloud - không cần local", hidden: false },
];

// Call Ollama with full messages array (supports conversation history)
async function callOllamaMessages(messages: any[]): Promise<string> {
  console.log(`[GauAssistant] Calling Ollama with ${messages.length} messages...`);
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const data = await response.json();
  console.log("[GauAssistant] Ollama response:", JSON.stringify(data).substring(0, 200));
  return data.message?.content || "";
}

// Call Fly.io Ollama with full messages array (supports conversation history)
async function callFlyOllamaMessages(messages: any[]): Promise<string> {
  console.log(`[GauAssistant] Calling Fly.io Ollama with ${messages.length} messages...`);
  const response = await fetch(`${FLY_OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: FLY_OLLAMA_MODEL,
      messages,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Fly Ollama error: ${response.status}`);
  }

  const data = await response.json();
  console.log("[GauAssistant] Fly Ollama response:", JSON.stringify(data).substring(0, 200));
  return data.message?.content || "";
}

// Retry logic with exponential backoff
async function callWithRetry(callFn: () => Promise<string>, maxRetries = 2): Promise<string> {
  let lastErr: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      if (i > 0) {
        console.log(`[GauAssistant] Retry ${i}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, 1000 * i));
      }
      return await callFn();
    } catch (err: any) {
      lastErr = err;
      console.error(`[GauAssistant] Attempt ${i + 1} failed:`, err.message);
    }
  }
  throw lastErr;
}

// System prompt for Gấu Assistant
const GAU_SYSTEM_PROMPT = `Bạn là Gấu 🐻 - trợ lý AI thông minh cho nhà hàng BIA MẠNH BÉO.

## Nhiệm vụ
Bạn hỗ trợ nhân viên thực hiện các tác vụ quản lý nhà hàng thông qua ngôn ngữ tự nhiên.

## CÁC TÍNH NĂNG ĐẦY ĐỦ:
1. **Tạo Order mới** - Tạo đơn hàng cho khách
2. **Thêm món vào order** - Thêm món vào đơn đang có
3. **Sửa món trong order** - Sửa số lượng hoặc xóa món
4. **Gửi bếp** - Gửi order đến bếp để chế biến
5. **Cập nhật trạng thái món ăn** - Đang nấu / Đã xong
6. **Đổi bàn** - Chuyển đơn từ bàn này sang bàn khác
7. **Báo tổng tiền** - Xem tổng tiền các bàn đang hoạt động
8. **Thanh toán** - Thanh toán đơn hàng (tiền mặt, chuyển khoản...)
9. **Thêm món vào menu** - Tạo món mới trong thực đơn
10. **Sửa món trong menu** - Đổi tên, giá, mô tả món ăn
11. **Xóa món trong menu** - Ẩn món khỏi thực đơn
12. **Báo cáo doanh thu** - Xem thống kê doanh thu ngày

## QUAN TRỌNG - Table Number Format:
- LUÔN dùng SỐ ĐƠN GIẢN cho tableNumber, ví dụ: "1", "2", "3"
- KHÔNG dùng "Bàn 1" hay "bàn 1" - chỉ dùng số: "1"

## QUAN TRỌNG - Cách trả lời:
- KHÔNG viết text giải thích trước JSON
- KHÔNG có câu "Vâng", "Tôi đã", "OK"
- Chỉ trả lời ĐÚNG một JSON object thuần túy, không có markdown code block

## SỬ DỤNG THÔNG TIN NGƯỜI DÙNG (Memory):
- Khi có section "THÔNG TIN NGƯỜI DÙNG & THÓI QUEN" trong prompt, hãy dùng nó để:
  1. Nhớ lại các bàn thường xuyên thao tác → gợi ý nhanh
  2. Nhớ món thường gọi → đề xuất món tương tự
  3. Nhớ hành động thường dùng → ưu tiên phản hồi nhanh cho các tác vụ đó
- Ví dụ: nếu người dùng nói "order bàn quen" và memory ghi "Bàn 5 (12 lần)" → hiểu là bàn 5

## Các lệnh API:

### 1. TẠO ORDER MỚI:
- Action: { "action": "EXECUTE", "apiPath": "/api/orders/create", "apiMethod": "POST", "apiBody": { "tableNumber": "5", "items": [{menuItemId: 1, name: "Gà rán", price: 145000, quantity: 2}], "totalAmount": 290000 } }

### 2. THÊM MÓN VÀO ORDER (đơn đang có):
- Action: { "action": "EXECUTE", "apiPath": "/api/orders/ID_THẬT/update", "apiMethod": "PUT", "apiBody": { "items": [{menuItemId: 3, name: "Cơm rang", price: 50000, quantity: 1}] } }

### 3. GỬI BẾP:
- Action: { "action": "EXECUTE", "apiPath": "/api/orders/ID_THẬT/send-to-kitchen", "apiMethod": "POST" }

### 4. CẬP NHẬT TRẠNG THÁI MÓN ĂN (bếp):
- Bắt đầu nấu: { "action": "EXECUTE", "apiPath": "/api/kitchen/ID_BẾP/start", "apiMethod": "POST" }
- Xong 1 món: { "action": "EXECUTE", "apiPath": "/api/kitchen/ID_BẾP/complete-item", "apiMethod": "POST", "apiBody": { "itemName": "Tên món" } }
- Xong hết: { "action": "EXECUTE", "apiPath": "/api/kitchen/ID_BẾP/complete", "apiMethod": "POST" }

### 5. ĐỔI BÀN:
- Action: { "action": "EXECUTE", "apiPath": "/api/orders/ID_THẬT/move", "apiMethod": "POST", "apiBody": { "tableNumber": "7" } }

### 6. THANH TOÁN:
- Action: { "action": "EXECUTE", "apiPath": "/api/orders/ID_THẬT/pay", "apiMethod": "POST", "apiBody": { "method": "cash" } }
- method: "cash" (tiền mặt), "transfer" (chuyển khoản), "vnpay", "momo"

### 7. BÁO TỔNG TIỀN CÁC BÀN:
- Action: { "action": "REPLY", "message": "Tổng tiền các bàn đang hoạt động:\nBàn 1: 250.000đ\nBàn 3: 180.000đ\nTổng cộng: 430.000đ" }
- Tính tổng từ activeOrders, mỗi bàn 1 dòng, cuối cùng Tổng cộng

### 8. THÊM MÓN VÀO MENU:
- Action: { "action": "EXECUTE", "apiPath": "/api/products", "apiMethod": "POST", "apiBody": { "name": "Trà sữa", "price": 35000, "isAvailable": true, "isActive": true } }

### 9. SỬA MÓN TRONG MENU:
- Action: { "action": "EXECUTE", "apiPath": "/api/products/ID_MÓN", "apiMethod": "PATCH", "apiBody": { "name": "Tên mới", "price": 40000 } }

### 10. XÓA MÓN TRONG MENU:
- Action: { "action": "EXECUTE", "apiPath": "/api/products/ID_MÓN", "apiMethod": "DELETE" }

### 11. BÁO CÁO DOANH THU:
- Action: { "action": "REPLY", "message": "📊 BÁO CÁO HÔM NAY:\n💰 Doanh thu: X.XXX.XXXđ\n✅ Đơn đã thanh toán: XX\n⏳ Đơn đang chờ: XX\n🍳 Đơn đang nấu: XX" }

## Khi cần xác nhận với khách hàng:
- Action: { "action": "CONFIRM", "confirmText": "Bạn có muốn...?", "apiPath": "...", "apiMethod": "...", "apiBody": {...} }

## Khi chỉ cần trả lời bình thường (không cần API):
- Action: { "action": "REPLY", "message": "Nội dung trả lời" }

## Cách xử lý khi có lỗi:
- Nếu không tìm thấy đơn của bàn nào đó → REPLY: "Không tìm thấy đơn đang hoạt động cho bàn X"
- Nếu thiếu thông tin → REPLY: hỏi khách bổ sung
- Nếu có lỗi server → ERROR: "Gấu đang gặp sự cố, thử lại sau nhé!"

## Luôn nhớ:
- LUÔN dùng /api/orders hoặc /api/products hoặc /api/kitchen tùy tác vụ
- tableNumber CHỈ là SỐ: "1", "2", "3" - không có chữ "Bàn"
- KHÔNG viết gì khác ngoài JSON
- Thay ID_THẬT bằng ID thực tế từ danh sách đơn đang hoạt động
- Trả lời bằng tiếng Việt trong field "message"
- Khi tạo order mới, tự động tính totalAmount = tổng(price * quantity) của các món

## Ví dụ các tình huống:

### Tạo order:
- Input: "order bàn 5: 2 gà rán, 1 cocacola"
- Tìm menu items "gà rán" và "cocacola" trong danh sách menu
- Tính tổng tiền
- Trả về EXECUTE cho /api/orders/create

### Thêm món vào order đang có:
- Input: "thêm 1 cơm rang vào bàn 3"
- Tìm đơn bàn 3 trong activeOrders (status != Complete)
- Trả về EXECUTE cho /api/orders/ID/update

### Gửi bếp:
- Input: "gửi bếp bàn 5"
- Tìm đơn bàn 5 trong activeOrders
- Trả về EXECUTE cho /api/orders/ID/send-to-kitchen

### Cập nhật trạng thái món (bếp):
- Input: "bàn 5 đang nấu rồi" hoặc "món gà rán bàn 5 đã xong"
- Tìm kitchen order tương ứng
- Trả về EXECUTE cho /api/kitchen/ID/start hoặc /complete-item

### Thanh toán:
- Input: "thanh toán bàn 3"
- Tìm đơn của bàn 3 trong activeOrders
- Trả về EXECUTE cho /api/orders/ID/pay

### Đổi bàn:
- Input: "chuyển bàn 3 sang bàn 7"
- Tìm đơn bàn 3, đổi sang bàn 7
- Trả về EXECUTE cho /api/orders/ID/move

### Báo tổng tiền:
- Input: "xem tổng tiền các bàn"
- Tính tổng từ activeOrders, liệt kê từng bàn
- Trả về REPLY với message chứa bảng tổng tiền

### Thêm món vào menu:
- Input: "thêm món trà sữa trân châu giá 35 nghìn"
- Trả về EXECUTE cho /api/products

### Sửa món trong menu:
- Input: "đổi giá gà rán thành 150 nghìn"
- Tìm menu item "gà rán", lấy id
- Trả về EXECUTE cho /api/products/ID

### Xóa món khỏi menu:
- Input: "xóa món cocacola khỏi menu"
- Tìm menu item "cocacola", lấy id
- Trả về EXECUTE cho /api/products/ID (DELETE)

### Báo cáo doanh thu:
- Input: "xem doanh thu hôm nay" hoặc "thống kê"
- Trả về REPLY với thông tin từ dailyReport

### Hỏi thêm khi thiếu thông tin:
- Input: "order bàn 5"
- Nếu không có danh sách món → REPLY: "Bạn muốn đặt những món gì cho bàn 5?"

## Thông tin Menu & Đơn hàng hiện tại:
`;

export function registerGauAssistantRoutes(app: Express): void {
  // Get restaurant context for AI
  async function getRestaurantContext() {
    try {
      const [menuItems, orders] = await Promise.all([
        storage.getMenuItems(),
        storage.getOrders(),
      ]);

      const activeOrders = orders.filter(o => o.status !== "Complete");
      
      return {
        menuItems: menuItems.filter(m => m.isActive).map(m => ({ id: m.id, name: m.name, price: m.price })),
        activeOrders: activeOrders.map(o => ({ id: o.id, table: o.tableNumber, items: o.items, total: o.totalAmount, status: o.status })),
        pendingCount: activeOrders.length,
      };
    } catch (err) {
      console.error("[GauAssistant] Context error:", err);
      return { menuItems: [], activeOrders: [], pendingCount: 0 };
    }
  }

  // GET /api/gau-assistant/models - List available AI models
  app.get("/api/gau-assistant/models", async (req: Request, res: Response) => {
    // Default model depends on environment
    const defaultModel = "ollama/gemma3:1b";

    res.json({ 
      models: AVAILABLE_MODELS,
      defaultModel 
    });
  });

  // POST /api/gau-assistant/chat
  app.post("/api/gau-assistant/chat", async (req: Request, res: Response) => {
    try {
      const { message, history, model: selectedModel, memory } = req.body;
      if (!message) return res.status(400).json({ error: "Message required" });

      const context = await getRestaurantContext();

      const memorySection = memory ? `
## THÔNG TIN NGƯỜI DÙNG & THÓI QUEN
${memory}
` : "";

      const systemMessage = `${GAU_SYSTEM_PROMPT}${memorySection}
Menu: ${JSON.stringify(context.menuItems)}
Đơn đang hoạt động: ${JSON.stringify(context.activeOrders)}`;

      // Build conversation messages (limit to last 8)
      const messages: any[] = [];

      if (history && Array.isArray(history)) {
        const recentHistory = history.slice(-8);
        for (const msg of recentHistory) {
          if (msg.role === "user" || msg.role === "assistant") {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
      }

      messages.push({ role: "user", content: message });

      const effectiveModel = selectedModel || "ollama/gemma3:1b";
      console.log(`[GauAssistant] Processing message with model: ${effectiveModel}, history: ${messages.length - 1} messages`);

      let responseText = "";

      const allMessages = [{ role: "system", content: systemMessage }, ...messages];

      if (effectiveModel.startsWith("ollama/")) {
        console.log(`[GauAssistant] Using Ollama local model: ${effectiveModel}`);
        try {
          responseText = await callWithRetry(() => callOllamaMessages(allMessages));
        } catch (ollamaErr: any) {
          console.error("[GauAssistant] Ollama failed, falling back to Fly:", ollamaErr.message);
          console.log("[GauAssistant] Using Fly.io Gemma 2 (fallback)");
          responseText = await callWithRetry(() => callFlyOllamaMessages(allMessages));
        }
      } else {
        console.log("[GauAssistant] Using Fly.io Gemma 2");
        responseText = await callWithRetry(() => callFlyOllamaMessages(allMessages));
      }

      console.log("[GauAssistant] AI Response:", responseText);

      try {
        const parsed = JSON.parse(responseText);
        res.json(parsed);
      } catch {
        res.json({ action: "REPLY", message: responseText });
      }
    } catch (err: any) {
      console.error("[GauAssistant] Chat Error:", err.message);
      res.status(500).json({ action: "ERROR", message: "Gấu đang bận một chút, bạn thử lại nhé!" });
    }
  });

  // Execute action from AI response
  app.post("/api/gau-assistant/execute", async (req: Request, res: Response) => {
    try {
      const { apiPath, apiMethod, apiBody } = req.body;

      if (!apiPath || !apiMethod) {
        return res.status(400).json({ error: "Missing apiPath or apiMethod" });
      }

      console.log(`[GauAssistant] Executing: ${apiMethod} ${apiPath}`, apiBody);

      // Handle creation separately - use /api/orders
      if (apiPath === "/api/orders/create") {
        // Transform items: convert Gemma's format (id, name, price, quantity) to DB format (menuItemId, price, quantity)
        const dbItems = (apiBody.items || []).map((item: any) => ({
          menuItemId: item.id || item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes || ""
        }));
        
        const dbOrder = {
          tableNumber: String(apiBody.tableNumber),
          customerName: apiBody.customerName || `Bàn ${apiBody.tableNumber}`,
          totalAmount: apiBody.totalAmount,
          items: dbItems
        };
        
        const order = await storage.createOrder(dbOrder);
        broadcast({ type: "ORDER_CREATED", data: order });
        return res.json({ success: true, action: "ORDER_CREATED", data: order });
      }

      // Handle product creation - use /api/products
      if (apiPath === "/api/products" && apiMethod === "POST") {
        const product = await storage.createMenuItem(apiBody);
        broadcast({ type: "PRODUCT_CREATED", data: product });
        return res.json({ success: true, action: "PRODUCT_CREATED", data: product });
      }

      // Handle actions with IDs: /api/orders/{id}/...
      const pathParts = apiPath.split("/");
      const id = Number(pathParts[3]); 
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID in path" });
      }

      if (apiPath.endsWith("/update")) {
        const order = await storage.updateOrder(id, apiBody);
        broadcast({ type: "ORDER_UPDATED", data: order });
        return res.json({ success: true, action: "ORDER_UPDATED", data: order });
      } 
      
      if (apiPath.endsWith("/pay")) {
        await storage.payOrder(id, apiBody?.method || "cash");
        const order = await storage.getOrder(id);
        broadcast({ type: "ORDER_UPDATED", data: { ...order, status: "Complete", paymentStatus: "Paid" } });
        broadcast({ type: "KITCHEN_ORDER_DELETED", data: { orderId: id } });
        return res.json({ success: true, action: "ORDER_PAID", data: { tableNumber: order?.tableNumber } });
      }

      if (apiPath.endsWith("/move")) {
        const order = await storage.updateOrder(id, { tableNumber: apiBody.tableNumber });
        broadcast({ type: "ORDER_UPDATED", data: order });
        return res.json({ success: true, action: "ORDER_MOVED", data: { tableNumber: apiBody.tableNumber } });
      }

      if (apiPath.endsWith("/send-to-kitchen")) {
        const kitchenOrder = await storage.sendToKitchen(id);
        broadcast({ type: "KITCHEN_ORDER_CREATED", data: kitchenOrder });
        return res.json({ success: true, action: "SENT_TO_KITCHEN", data: kitchenOrder });
      }

      if (pathParts.length === 4 && apiMethod === "DELETE") {
        await storage.deleteOrder(id);
        broadcast({ type: "ORDER_DELETED", data: { id } });
        return res.json({ success: true, action: "ORDER_DELETED" });
      }

      return res.status(400).json({ error: "Unknown action path" });
    } catch (err: any) {
      console.error("[GauAssistant] Execute error:", err.message);
      res.status(500).json({ error: "Failed to execute action" });
    }
  });

  // Get context for frontend
  app.get("/api/gau-assistant/context", async (req: Request, res: Response) => {
    try {
      const context = await getRestaurantContext();
      res.json(context);
    } catch (err) {
      res.status(500).json({ error: "Failed to get context" });
    }
  });

}
