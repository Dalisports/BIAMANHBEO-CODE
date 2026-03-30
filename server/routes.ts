import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { broadcast } from "./websocket";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get(api.products.list.path, async (req, res) => {
    const prods = await storage.getMenuItems();
    res.json(prods);
  });

  app.post(api.products.create.path, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const prod = await storage.createMenuItem(input);
      res.status(201).json(prod);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, price, categoryId, description, isAvailable } = req.body;
      const updated = await storage.updateMenuItem(id, { name, price, categoryId, description, isAvailable });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteMenuItem(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.get(api.orders.list.path, async (req, res) => {
    const ords = await storage.getOrders();
    res.json(ords);
  });

  app.get(api.orders.get.path, async (req, res) => {
    const ord = await storage.getOrder(Number(req.params.id));
    if (!ord) return res.status(404).json({ message: "Not found" });
    res.json(ord);
  });

  app.post(api.orders.create.path, async (req, res) => {
    try {
      const input = api.orders.create.input.parse(req.body);
      const tableNum = input.tableNumber;
      const customerName = tableNum === "1" ? "Ban" : `Ban ${tableNum}`;
      const ord = await storage.createOrder({
        ...input,
        customerName: input.customerName || customerName,
      });
      broadcast({ type: "ORDER_CREATED", data: ord });
      res.status(201).json(ord);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.put(api.orders.update.path, async (req, res) => {
    try {
      const input = api.orders.update.input.parse(req.body);
      const ord = await storage.updateOrder(Number(req.params.id), input);
      res.json(ord);
    } catch (err) {
      res.status(400).json({ message: "Error updating" });
    }
  });

  app.post(api.orders.complete.path, async (req, res) => {
    try {
      const { ids } = api.orders.complete.input.parse(req.body);
      await storage.completeOrders(ids);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Error completing" });
    }
  });

  app.post("/api/orders/uncomplete/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.uncompleteOrder(id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Error uncompleting" });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteOrder(id);
      broadcast({ type: "ORDER_DELETED", data: { id } });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete order" });
    }
  });

  app.get("/api/payment-settings", async (req, res) => {
    const settings = await storage.getPaymentSettings();
    res.json(settings);
  });

  app.patch("/api/payment-settings/:method", async (req, res) => {
    try {
      const method = req.params.method;
      const { label, icon, qrImageUrl, accountName, accountNumber, bankName, additionalInfo, isEnabled } = req.body;
      const updated = await storage.updatePaymentSetting(method, {
        label, icon, qrImageUrl, accountName, accountNumber, bankName, additionalInfo,
        ...(isEnabled !== undefined ? { isEnabled } : {})
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update payment setting" });
    }
  });

  app.post("/api/orders/:id/pay", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { method } = req.body;
      await storage.payOrder(id, method);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Error paying" });
    }
  });

  app.post("/api/orders/:id/send-to-kitchen", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const kitchenOrder = await storage.sendToKitchen(id);
      broadcast({ type: "KITCHEN_ORDER_CREATED", data: kitchenOrder });
      res.status(201).json(kitchenOrder);
    } catch (err) {
      res.status(400).json({ message: "Error sending to kitchen" });
    }
  });

  app.get("/api/kitchen", async (req, res) => {
    const kitchenOrders = await storage.getKitchenOrders();
    res.json(kitchenOrders);
  });

  app.post("/api/kitchen/:id/start", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.startKitchenOrder(id);
      const order = await storage.getKitchenOrder(id);
      broadcast({ type: "KITCHEN_ORDER_UPDATED", data: order });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Error starting" });
    }
  });

  app.post("/api/kitchen/:id/complete", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.completeKitchenOrder(id);
      const order = await storage.getKitchenOrder(id);
      broadcast({ type: "KITCHEN_ORDER_UPDATED", data: order });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Error completing" });
    }
  });

  app.post("/api/kitchen/:id/start-item", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { itemName } = req.body;
      await storage.startKitchenItem(id, itemName);
      const order = await storage.getKitchenOrder(id);
      broadcast({ type: "KITCHEN_ORDER_UPDATED", data: order });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Error starting item" });
    }
  });

  app.post("/api/kitchen/:id/complete-item", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { itemName } = req.body;
      await storage.completeKitchenItem(id, itemName);
      const order = await storage.getKitchenOrder(id);
      broadcast({ type: "KITCHEN_ORDER_UPDATED", data: order });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Error completing item" });
    }
  });

  app.get("/api/categories", async (req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const { name, displayOrder } = req.body;
      const cat = await storage.createCategory({ name, displayOrder: displayOrder || 0 });
      res.status(201).json(cat);
    } catch (err) {
      res.status(400).json({ message: "Error creating category" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteCategory(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  app.get("/api/reports/daily", async (req, res) => {
    try {
      const report = await storage.getDailyReport();
      res.json(report);
    } catch (err) {
      res.status(500).json({ message: "Error generating report" });
    }
  });

  app.get("/api/reports/best-sellers", async (req, res) => {
    try {
      const report = await storage.getBestSellers();
      res.json(report);
    } catch (err) {
      res.status(500).json({ message: "Error generating report" });
    }
  });

  app.post(api.chat.process.path, async (req, res) => {
    try {
      const { message } = api.chat.process.input.parse(req.body);
      
      const menuItems = await storage.getMenuItems();
      const pendingOrders = await storage.getPendingOrders();
      const activeKitchenOrders = await storage.getActiveKitchenOrders();
      const allOrders = await storage.getOrders();
      const dailyReport = await storage.getDailyReport();
      
      const nonPendingOrders = allOrders.filter(o => o.status !== "Pending");
      
      const systemPrompt = `Bạn là AI assistant quản lý NHÀ HÀNG F&B. 
Bạn trò chuyện với nhân viên để:
1. Tạo order cho khách (cần số bàn)
2. Gửi món vào bếp
3. Quản lý menu (món ăn, đồ uống)
4. Thanh toán
5. Xem báo cáo

Ngữ cảnh hiện tại:
Menu: ${JSON.stringify(menuItems)}
Tất cả đơn hàng: ${JSON.stringify(allOrders)}
Order đang chờ xử lý: ${JSON.stringify(pendingOrders)}
Order đang nấu ở bếp: ${JSON.stringify(activeKitchenOrders)}
Đơn hàng cần thanh toán: ${JSON.stringify(nonPendingOrders.filter(o => o.status !== "Complete"))}
Báo cáo hôm nay: Doanh thu ${dailyReport.todayRevenue}đ, ${dailyReport.completedOrders} đơn đã thanh toán

QUAN TRỌNG: Khi nhân viên hỏi về đơn hàng, LUÔN kiểm tra trong "Tất cả đơn hàng" để tìm đơn hàng theo số bàn hoặc tên khách.
Để gửi bếp hoặc thanh toán, cần sử dụng orderId từ danh sách đơn hàng.

Luôn trả lời bằng tiếng Việt.
Tên của bạn: 'SÓI F&B' - Trợ lý Nhà hàng F&B.

Trạng thái đơn hàng:
- Pending = CHƯA XỬ LÝ
- InKitchen = ĐANG NẤU  
- Ready = CHƯA THANH TOÁN (đã hoàn thành nấu, chờ thanh toán)
- Complete = ĐÃ THANH TOÁN

Các hành động có thể thực hiện:
1. CREATE_ORDER: Tạo order mới. Data: { tableNumber, items: [{menuItemId, name, quantity, price}], totalAmount, customerName?, phone?, notes? }
2. SEND_TO_KITCHEN: Gửi order vào bếp. Data: { orderId }
3. PAY_ORDER: Thanh toán order (mọi trạng thái trừ Complete). Data: { orderId, paymentMethod: "cash" | "transfer" | "vnpay" | "momo" }
4. CREATE_MENU_ITEM: Thêm món mới vào menu. Data: { name, price, description? }
5. DELETE_ORDER: Xóa đơn hàng. Data: { orderId }
6. QUERY: Hỏi thông tin. Không cần data.
7. NONE: Chỉ trò chuyện, không hành động.

Trả về JSON:
{
  "reply": "Tin nhắn trả lời cho nhân viên",
  "action": "Hành động hoặc NONE",
  "data": { ... }
}

Ví dụ:
- "Order bàn 5: 2 phần gà rán, 1 cocacola" -> CREATE_ORDER với tableNumber="5"
- "Gửi bếp bàn 5" -> SEND_TO_KITCHEN
- "Thanh toán bàn 3" -> PAY_ORDER
- "Xem doanh thu hôm nay" -> QUERY với reply chứa thông tin dailyReport
- "Thêm món trà sữa trân châu giá 35k" -> CREATE_MENU_ITEM

Giá tiền mặc định là VND. Khách hỏi giá thì đọc giá từ menu.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      const parsedResponse = JSON.parse(content);
      
      if (parsedResponse.action === 'CREATE_ORDER' && parsedResponse.data?.tableNumber && parsedResponse.data?.items?.length > 0) {
        const tableNum = parsedResponse.data.tableNumber;
        const customerName = tableNum === "1" ? "Ban" : `Ban ${tableNum}`;
        
        await storage.createOrder({
          tableNumber: tableNum,
          customerName: parsedResponse.data.customerName || customerName,
          phone: parsedResponse.data.phone || null,
          totalAmount: parsedResponse.data.totalAmount || 0,
          items: parsedResponse.data.items,
          status: "Pending",
          paymentStatus: "Unpaid",
          notes: parsedResponse.data.notes || null,
        });
      } else if (parsedResponse.action === 'SEND_TO_KITCHEN' && parsedResponse.data?.orderId) {
        await storage.sendToKitchen(parsedResponse.data.orderId);
      } else if (parsedResponse.action === 'PAY_ORDER' && parsedResponse.data?.orderId) {
        await storage.payOrder(parsedResponse.data.orderId, parsedResponse.data.paymentMethod || "cash");
      } else if (parsedResponse.action === 'CREATE_MENU_ITEM' && parsedResponse.data?.name && parsedResponse.data?.price) {
        await storage.createMenuItem({
          name: parsedResponse.data.name,
          price: Number(parsedResponse.data.price),
          description: parsedResponse.data.description || null,
          isAvailable: true,
          isActive: true,
        });
      } else if (parsedResponse.action === 'DELETE_ORDER' && parsedResponse.data?.orderId) {
        await storage.deleteOrder(parsedResponse.data.orderId);
      }

      res.json(parsedResponse);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal error" });
    }
  });

  return httpServer;
}
