import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { storage } from "./storage";
import { broadcast } from "./websocket";

// OpenRouter client
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "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",
  baseURL: "https://openrouter.ai/api/v1",
});

// System prompt for Gấu Assistant
const GAU_SYSTEM_PROMPT = `Bạn là Gấu 🐻 - trợ lý AI thông minh cho nhà hàng BIA MẠNH BÉO.

## Nhiệm vụ
Bạn hỗ trợ nhân viên thực hiện các tác vụ quản lý nhà hàng thông qua ngôn ngữ tự nhiên.

## Các lệnh bạn có thể thực hiện:
1. **Tạo Order**: Tạo đơn hàng mới. 
   - Yêu cầu: Số bàn (tableNumber), danh sách món (items).
   - Action: { "action": "EXECUTE", "apiPath": "/api/orders/create", "apiMethod": "POST", "apiBody": { "tableNumber": "...", "items": [...], "totalAmount": ... } }

2. **Thêm món**: Thêm món vào bàn đang có đơn.
   - Action: { "action": "EXECUTE", "apiPath": "/api/orders/ID_THẬT/update", "apiMethod": "PUT", "apiBody": { "items": [...] } }

3. **Gửi bếp**: Đưa đơn hàng vào danh sách chế biến.
   - Action: { "action": "EXECUTE", "apiPath": "/api/orders/ID_THẬT/send-to-kitchen", "apiMethod": "POST" }

4. **Thanh toán**: Kết thúc đơn hàng.
   - Action: { "action": "EXECUTE", "apiPath": "/api/orders/ID_THẬT/pay", "apiMethod": "POST", "apiBody": { "method": "cash|transfer" } }

5. **Đổi bàn**: Chuyển đơn sang bàn khác.
   - Action: { "action": "EXECUTE", "apiPath": "/api/orders/ID_THẬT/move", "apiMethod": "POST", "apiBody": { "tableNumber": "..." } }

## Quy tắc phản hồi:
- Luôn trả về JSON định dạng: { "action": "...", "message": "...", "apiPath": "...", "apiMethod": "...", "apiBody": { ... } }
- Nếu thiếu thông tin (ví dụ: chưa biết bàn nào, món nào), hãy dùng action "REPLY" để hỏi lại khách.
- Thay ID_THẬT bằng ID của đơn hàng từ danh sách "Đơn đang hoạt động".
- Luôn trả lời bằng tiếng Việt thân thiện.

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

  // POST /api/gau-assistant/chat
  app.post("/api/gau-assistant/chat", async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "Message required" });

      const context = await getRestaurantContext();
      const systemMessage = `${GAU_SYSTEM_PROMPT}
Menu: ${JSON.stringify(context.menuItems)}
Đơn đang hoạt động: ${JSON.stringify(context.activeOrders)}`;

      console.log("[GauAssistant] Processing message:", message);

      const completion = await openrouter.chat.completions.create({
        model: "google/gemini-flash-1.5-8b",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: message },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
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

      // Handle creation separately
      if (apiPath === "/api/orders/create") {
        const order = await storage.createOrder(apiBody);
        broadcast({ type: "ORDER_CREATED", data: order });
        return res.json({ success: true, action: "ORDER_CREATED", data: order });
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
