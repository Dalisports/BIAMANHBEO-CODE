import type { Express } from "express";
import { storage } from "../storage";
import { createAIClients, MODELS } from "../ai/client";

function requireAuthMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

function buildGauSystemPrompt(menuItems: any[], pendingOrders: any[], todayStats: any): string {
  const menuList = menuItems.map(m => `- ${m.name}: ${m.price}đ (id=${m.id})`).join("\n");

  return `SYSTEM PROMPT: DÀNH CHO GẤU ASSISTANT FOR RESTAURANT POS SYSTEM

1. ROLE & IDENTITY
Bạn là một Trợ lý AI chuyên nghiệp, nhạy bén và có độ chính xác tuyệt đối, được tích hợp trực tiếp vào hệ thống POS App Quản lý Nhà hàng BIAMANHBEO. Nhiệm vụ của bạn là hỗ trợ tối đa cho nhân viên, thu ngân và quản lý vận hành hệ thống thông qua câu lệnh tự nhiên (Text/Voice).

2. CORE CAPABILITIES (QUYỀN HẠN)
Bạn được cấp quyền can thiệp và thực thi các tác vụ (thông qua Function Calling/API hệ thống) bao gồm:
Quản lý Đơn hàng (Orders): THÊM món, SỬA số lượng/ghi chú, XÓA món hoặc XÓA toàn bộ Order.
Quản lý Thực đơn (Menu/Items): THÊM món mới, SỬA thông tin/giá cả/trạng thái món, XÓA món khỏi thực đơn.

NGỮ CẢNH HIỆN TẠI (DỮ LIỆU POS):
- Menu (${menuItems.length} món): 
${menuList}
- Đơn đang chờ: ${pendingOrders.length} đơn
- Hôm nay: ${todayStats.completedOrders}/${todayStats.totalOrders} đơn | ${todayStats.revenue}đ

3. STRICT CONSTRAINTS (HÀNG RÀO BẢO MẬT & AN TOÀN)
Để tránh sai sót gây thất thoát tài chính và dữ liệu của nhà hàng, bạn BẮT BUỘC tuân thủ các nguyên tắc tối cao sau:
- TẬP TRUNG VÀO LỆNH CỦA NGƯỜI DÙNG: Tuyệt đối KHÔNG tự ý thực hiện hành động Thêm, Sửa, Xóa nào nếu KHÔNG CÓ lệnh trực tiếp từ người dùng.
- KHÔNG TỰ Ý THAY ĐỔI THỰC ĐƠN: Tuyệt đối không tự thêm món mới hoặc thay đổi giá của bất kỳ món nào trong menu khi chưa có yêu cầu. Chỉ được phép thêm các món CÓ SẴN trong menu vào order.
- KHÔNG TỰ Ý GIẢM SỐ LƯỢNG/XÓA: Tuyệt đối không tự ý bớt số lượng item trong Order hoặc xóa Order của khách hàng dựa trên suy đoán logic của riêng bạn.

4. DECISION MATRIX (QUY TRÌNH XỬ LÝ LỆNH)
Bạn phải phân loại yêu cầu của người dùng thành 2 trường hợp sau để xử lý:

TRƯỜNG HỢP A: LỆNH RÕ RÀNG & ĐẦY ĐỦ -> TRẢ VỀ JSON CONFIRM (HỆ THỐNG SẼ THỰC THI)
Điều kiện: Lệnh thể hiện rõ ràng hành động, đối tượng và thông số.
Hành động: Triển khai ngay lập tức (trả về JSON action CONFIRM với API tương ứng), tuyệt đối KHÔNG hỏi lại hoặc yêu cầu xác nhận.

TRƯỜNG HỢP B: LỆNH MƠ HỒ / BẤT THƯỜNG -> TRẢ VỀ JSON REPLY ĐỂ HỎI LẠI
Điều kiện:
- Lệnh thiếu thông tin cốt lõi (Ví dụ: "Thêm phở bò" -> Thiếu số bàn hoặc số lượng) VÀ bạn KHÔNG THỂ suy luận được thông tin này từ lịch sử hội thoại gần nhất (ví dụ câu trước khách vừa đề cập đến Bàn 3).
- Lệnh khó hiểu, câu từ mâu thuẫn hoặc có thể gây hiểu lầm. Yêu cầu món không có trong menu.
- Lệnh đi ngược lại với thói quen sử dụng hàng ngày hoặc có tính rủi ro cao.
Hành động: TẠM DỪNG THỰC THI. Bạn phải đặt câu hỏi ngắn gọn, lịch sự (trả về JSON action REPLY) để xác nhận lại ý định chính xác của người dùng.

LƯU Ý VỀ NGỮ CẢNH HỘI THOẠI (CHAT HISTORY):
Luôn tham chiếu các câu hỏi trước đó để tự động điền các thông số bị thiếu. Nếu người dùng vừa thực hiện thao tác trên "Bàn 3" và sau đó nói "Thêm 1 bia nữa", hãy hiểu là thêm vào Bàn 3 và lập tức trả về JSON CONFIRM mà không cần hỏi lại.

5. TONE OF VOICE & COMMUNICATION STYLE
Ngắn gọn, súc tích: Đi thẳng vào vấn đề, không dông dài.
Chuyên nghiệp & Đáng tin cậy: Sử dụng thuật ngữ chuẩn của ngành F&B (Bàn, Order, Item, Thực đơn, Chế biến...).

6. ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (STRICT JSON ONLY)
Bạn PHẢI TRẢ VỀ 100% ĐỊNH DẠNG JSON HỢP LỆ THEO CẤU TRÚC SAU. KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO BÊN NGOÀI JSON.

**Ví dụ TRƯỜNG HỢP A (Thực thi ngay) -> JSON CONFIRM:**
{
  "action": "CONFIRM",
  "confirmText": "Đã thêm 3 bia Huda và 1 lạc rang vào Bàn 4.",
  "apiPath": "/api/orders/create",
  "apiMethod": "POST",
  "apiBody": {
    "tableNumber": "4",
    "items": [{"menuItemId": 1, "name": "Bia Huda", "quantity": 3, "price": 15000}],
    "totalAmount": 45000
  }
}

**ĐẶC BIỆT LƯU Ý VỚI LỆNH THANH TOÁN BÀN:**
Khi người dùng yêu cầu thanh toán (VD: "thanh toán bàn 3", "tính tiền bàn 4"), BẠN TUYỆT ĐỐI KHÔNG GỌI API THANH TOÁN, mà phải trả về action "OPEN_CHECKOUT" để mở popup xác nhận cho người dùng tự ấn.
{
  "action": "OPEN_CHECKOUT",
  "tableNumber": "3"
}

**Ví dụ TRƯỜNG HỢP B (Cần hỏi lại / Trả lời) -> JSON REPLY:**
{
  "action": "REPLY",
  "message": "Bạn muốn hủy món Phở ở bàn số mấy? Vui lòng cung cấp số bàn để tôi thực hiện."
}

7. CÁC API HỖ TRỢ (Dành cho JSON CONFIRM)
1. Tạo đơn/Thêm món: apiPath="/api/orders/create", apiMethod="POST"
2. Gửi bếp: apiPath="/api/orders/{id}/send-to-kitchen", apiMethod="POST"  
3. Đổi bàn: apiPath="/api/orders/{id}/move", apiMethod="POST", body={tableNumber: "7"}

BẮT ĐẦU HOẠT ĐỘNG: Hệ thống POS đã sẵn sàng. Hãy tiếp nhận câu lệnh từ người dùng.`;
}

export function registerGauAssistantRoutes(app: Express) {
  const models = createAIClients();

  app.get("/api/gau-assistant/models", requireAuthMiddleware, (req, res) => {
    res.json({ models: MODELS });
  });

  app.get("/api/gau-assistant/context", requireAuthMiddleware, async (req, res) => {
    try {
      const [menuItems, orders] = await Promise.all([
        storage.getMenuItems(),
        storage.getOrders(),
      ]);

      const activeOrders = orders.filter((o: any) => o.status !== "Complete");
      const pendingCount = activeOrders.filter((o: any) => o.status === "Pending").length;

      res.json({
        menuItems: menuItems.map((m: any) => ({ id: m.id, name: m.name, price: Number(m.price) })),
        activeOrders: activeOrders.map((o: any) => ({
          id: o.id,
          table: o.tableNumber,
          items: o.items,
          total: Number(o.totalAmount),
          status: o.status,
        })),
        pendingCount,
      });
    } catch (err) {
      console.error("[Gau] Context error:", err);
      res.status(500).json({ message: "Error fetching context" });
    }
  });

  app.post("/api/gau-assistant/chat", requireAuthMiddleware, async (req, res) => {
    try {
      const { message, model: modelKey, history = [], memory } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Missing message" });
      }

      const [menuItems, orders] = await Promise.all([
        storage.getMenuItems(),
        storage.getOrders(),
      ]);

      const pendingOrders = orders.filter((o: any) => o.status === "Pending");
      const completedOrders = orders.filter((o: any) => o.status === "Complete");
      const todayStats = {
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        revenue: completedOrders.reduce((acc: number, o: any) => acc + Number(o.totalAmount), 0),
      };

      let systemPrompt = buildGauSystemPrompt(menuItems, pendingOrders, todayStats);
      
      if (memory) {
        systemPrompt += `\n\n8. TRÍ NHỚ TỪ LỊCH SỬ CHAT (QUAN TRỌNG):\nNgười dùng thường xuyên có thói quen sau:\n${memory}\nHãy ưu tiên gợi ý hoặc tự động điền các thông tin này nếu câu lệnh của người dùng bị thiếu (ví dụ nếu thiếu số bàn thì gợi ý các bàn thường dùng).`;
      }

      const selectedModelKey = modelKey && models[modelKey] ? modelKey : "step-3.5-flash";
      const selected = models[selectedModelKey];

      // Build message array with history
      const formattedHistory = history.map((msg: any) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content
      }));

      const response = await selected.client.chat.completions.create({
        model: selected.model,
        messages: [
          { role: "system", content: systemPrompt },
          ...formattedHistory,
          { role: "user", content: message },
        ],
        temperature: 0.8,
        max_tokens: 1024,
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        console.error("[Gau] Empty AI response. Full response:", JSON.stringify(response));
        return res.status(500).json({ action: "ERROR", message: "No response from AI" });
      }

      let cleanContent = content.trim();
      let parsed: any = null;

      try {
        parsed = JSON.parse(cleanContent);
      } catch {
        // Try to extract a JSON block using regex if there is surrounding text
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error("[Gau] Failed to parse extracted JSON block:", e);
          }
        }
      }

      if (!parsed) {
        parsed = { action: "REPLY", message: cleanContent };
      }

      res.json(parsed);
    } catch (err) {
      console.error("[Gau] Chat error:", err);
      res.status(500).json({ action: "ERROR", message: "Loi server" });
    }
  });

  app.post("/api/gau-assistant/execute", requireAuthMiddleware, async (req, res) => {
    try {
      const { apiPath, apiMethod, apiBody } = req.body;

      if (!apiPath || !apiMethod) {
        return res.json({ success: false, message: "Missing apiPath or apiMethod" });
      }

      let result: any;

      if (apiPath === "/api/orders/create" && apiMethod === "POST") {
        const tableNum = apiBody?.tableNumber;
        const customerName = tableNum === "1" ? "Ban" : `Ban ${tableNum}`;

        const created = await storage.createOrder({
          tableNumber: tableNum,
          customerName: apiBody?.customerName || customerName,
          phone: apiBody?.phone || null,
          totalAmount: apiBody?.totalAmount || 0,
          items: apiBody?.items || [],
          status: "Pending",
          paymentStatus: "Unpaid",
          notes: apiBody?.notes || null,
        });

        const orderId = 'order' in created ? created.order.id : (created as any).id;
        result = { success: true, action: "ORDER_CREATED", data: { tableNumber: tableNum, orderId } };
      } else if (apiPath.startsWith("/api/orders/") && apiPath.endsWith("/send-to-kitchen") && apiMethod === "POST") {
        const orderId = Number(apiPath.split("/")[3]);
        const kitchenOrder = await storage.sendToKitchen(orderId);
        result = { success: true, action: "SENT_TO_KITCHEN", data: { orderId } };
      } else if (apiPath.startsWith("/api/orders/") && apiPath.endsWith("/pay") && apiMethod === "POST") {
        const orderId = Number(apiPath.split("/")[3]);
        await storage.payOrder(orderId, apiBody?.method || "cash");
        const order = await storage.getOrder(orderId);
        result = { success: true, action: "ORDER_PAID", data: { tableNumber: (order as any)?.tableNumber } };
      } else if (apiPath.startsWith("/api/orders/") && apiPath.endsWith("/move") && apiMethod === "POST") {
        const orderId = Number(apiPath.split("/")[3]);
        const updated = await storage.updateOrder(orderId, { tableNumber: apiBody?.tableNumber });
        result = { success: true, action: "ORDER_MOVED", data: { tableNumber: apiBody?.tableNumber } };
      } else {
        result = { success: false, message: "Unknown action" };
      }

      res.json(result);
    } catch (err) {
      console.error("[Gau] Execute error:", err);
      res.status(500).json({ success: false, message: "Execution failed" });
    }
  });
}