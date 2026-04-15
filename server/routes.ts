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
      const { name, price, categoryId, description, image, isAvailable } = req.body;
      const updated = await storage.updateMenuItem(id, { name, price, categoryId, description, image, isAvailable });
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
      const result = await storage.createOrder({
        ...input,
        customerName: input.customerName || customerName,
      });
      
      if ('merged' in result) {
        broadcast({ type: "ORDER_UPDATED", data: result.order });
        res.status(200).json({ ...result.order, merged: true });
      } else {
        broadcast({ type: "ORDER_CREATED", data: result });
        res.status(201).json(result);
      }
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

  app.post("/api/admin/seed-menu", async (req, res) => {
    try {
      const seedItems = [
        { name: "Đầu lợn", price: 145000 },
        { name: "TIẾT LUỘC", price: 40000 },
        { name: "Đậu tẩm hành", price: 40000 },
        { name: "Đậu chiên giòn", price: 30000 },
        { name: "Lòng xào dưa", price: 30000 },
        { name: "Lòng khìa nước dừa", price: 100000 },
        { name: "Nầm chiên", price: 150000 },
        { name: "Nọng heo chiên", price: 150000 },
        { name: "Sườn rán", price: 145000 },
        { name: "Sườn sốt cay", price: 145000 },
        { name: "Rau xào theo mùa", price: 30000 },
        { name: "Nộm tai", price: 90000 },
        { name: "Đuôi lợn luộc", price: 100000 },
        { name: "Ba chỉ rang giềng", price: 130000 },
        { name: "Cật trần", price: 100000 },
        { name: "Gan xào cay", price: 90000 },
        { name: "Gan cháy tỏi", price: 90000 },
        { name: "Tóp mỡ dưa chua", price: 110000 },
        { name: "Pate xúc phồng tôm", price: 100000 },
        { name: "Má đào chiên hạt dổi", price: 120000 },
        { name: "Cốc bia", price: 6000 },
        { name: "Rượu men lá", price: 35000 },
        { name: "Chai bia Hà Nội", price: 15000 },
        { name: "Chai bia Sài Gòn", price: 19000 },
        { name: "Chai bia Tiger Bạc", price: 200000 },
        { name: "Lạc rang", price: 10000 },
        { name: "Bánh đa", price: 5000 },
        { name: "Mực nướng", price: 160000 },
        { name: "Má đào nướng sa tế", price: 120000 },
        { name: "Mướp đắng xào trứng", price: 60000 },
        { name: "Mướp đắng ruốc", price: 100000 },
        { name: "Cơm rang trứng chảy", price: 50000 },
        { name: "Ca bia", price: 30000 },
        { name: "Dưa chua", price: 10000 },
        { name: "Thăng long", price: 16000 },
        { name: "Sài gòn bạc", price: 20000 },
        { name: "Thùng bia sài gòn", price: 280000 },
        { name: "Mướp xào giá", price: 40000 },
        { name: "Nem chua", price: 40000 },
      ];
      const created = [];
      for (const item of seedItems) {
        const created_item = await storage.createMenuItem({
          name: item.name,
          price: item.price,
          isAvailable: true,
          isActive: true,
        });
        created.push(created_item);
      }
      res.json({ success: true, count: created.length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Seed failed" });
    }
  });

  app.post("/api/orders/:id/unpay", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.unpayOrder(id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Error unpaying" });
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

  app.post("/api/kitchen/clear-completed", async (req, res) => {
    try {
      console.log("[CLEAR] Starting to clear old completed kitchen orders...");
      const deletedCount = await storage.clearOldCompletedKitchenOrders();
      console.log(`[CLEAR] Deleted ${deletedCount} orders`);
      res.json({ success: true, deletedCount });
    } catch (err) {
      console.error("[CLEAR] Error:", err);
      res.status(500).json({ message: "Error clearing completed orders" });
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

  app.patch("/api/categories/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, displayOrder } = req.body;
      const updated = await storage.updateCategory(id, { ...(name !== undefined ? { name } : {}), ...(displayOrder !== undefined ? { displayOrder } : {}) });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update category" });
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
      const { message, history } = api.chat.process.input.parse(req.body);
      
      const menuItemsList = await storage.getMenuItems();
      const categoriesList = await storage.getCategories();
      const pendingOrders = await storage.getPendingOrders();
      const activeKitchenOrders = await storage.getActiveKitchenOrders();
      const allOrders = await storage.getOrders();
      const dailyReport = await storage.getDailyReport();
      
      const nonPendingOrders = allOrders.filter(o => o.status !== "Pending");
      
      const systemPrompt = `Bạn là AI assistant quản lý NHÀ HÀNG F&B. 
Bạn trò chuyện với nhân viên để:
1. Tạo order cho khách (cần số bàn)
2. Gửi món vào bếp
3. Quản lý menu (món ăn, đồ uống) và danh mục
4. Thanh toán
5. Xem báo cáo
6. Cập nhật ảnh món ăn

Ngữ cảnh hiện tại:
Danh mục: ${JSON.stringify(categoriesList)}
Menu: ${JSON.stringify(menuItemsList)}
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
2. ADD_TO_TABLE: Thêm món vào bàn đang có đơn. Data: { tableNumber, items: [{menuItemId, name, quantity, price}], totalAmount }
3. SEND_TO_KITCHEN: Gửi order vào bếp. Data: { orderId }
4. PAY_ORDER: Thanh toán order (mọi trạng thái trừ Complete). Data: { orderId, paymentMethod: "cash" | "transfer" | "vnpay" | "momo" }
5. CREATE_MENU_ITEM: Thêm món mới vào menu. Data: { name, price, description?, categoryId? }
6. UPDATE_MENU_ITEM: Sửa món ăn (tên, giá, mô tả, danh mục). Data: { menuItemId, name?, price?, description?, categoryId? }
7. DELETE_MENU_ITEM: Xóa món ăn. Data: { menuItemId }
8. UPDATE_MENU_ITEM_IMAGE: Cập nhật ảnh cho món ăn. Data: { menuItemId, imageUrl }
9. CREATE_CATEGORY: Thêm danh mục mới. Data: { name, displayOrder? }
10. UPDATE_CATEGORY: Sửa tên danh mục. Data: { categoryId, name }
11. DELETE_CATEGORY: Xóa danh mục. Data: { categoryId }
12. UNPAY_ORDER: Hoàn tác thanh toán (đưa về chưa thanh toán). Data: { orderId }
13. DELETE_ORDER: Xóa đơn hàng. Data: { orderId }
14. QUERY: Hỏi thông tin. Không cần data.
15. NONE: Chỉ trò chuyện, không hành động.

LUÔN ưu tiên ADD_TO_TABLE khi khách muốn thêm món vào bàn đang có đơn (status != Complete).

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
- "Đổi tên danh mục 2 thành Đồ uống" -> UPDATE_CATEGORY với categoryId=2
- "Thêm danh mục Tráng miệng" -> CREATE_CATEGORY
- "Xóa danh mục Tráng miệng" -> DELETE_CATEGORY
- "Cập nhật ảnh món Đầu lợn bằng link https://..." -> UPDATE_MENU_ITEM_IMAGE
- "Sửa giá món Cốc bia thành 8000" -> UPDATE_MENU_ITEM

Giá tiền mặc định là VND. Khách hỏi giá thì đọc giá từ menu.`;

      const recentHistory = (history || []).slice(-20);
      const historyMessages = recentHistory.map(h => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      }));

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          ...historyMessages,
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
        
        const result = await storage.createOrder({
          tableNumber: tableNum,
          customerName: parsedResponse.data.customerName || customerName,
          phone: parsedResponse.data.phone || null,
          totalAmount: parsedResponse.data.totalAmount || 0,
          items: parsedResponse.data.items,
          status: "Pending",
          paymentStatus: "Unpaid",
          notes: parsedResponse.data.notes || null,
        });
        
        if ('merged' in result) {
          broadcast({ type: "ORDER_UPDATED", data: result.order });
        } else {
          broadcast({ type: "ORDER_CREATED", data: result });
        }
      } else if (parsedResponse.action === 'ADD_TO_TABLE' && parsedResponse.data?.tableNumber && parsedResponse.data?.items?.length > 0) {
        const tableNum = parsedResponse.data.tableNumber;
        const pendingOrder = await storage.getActiveOrderByTable(tableNum);
        
        if (pendingOrder) {
          const existingItems = pendingOrder.items as any[];
          const newItems = parsedResponse.data.items as any[];
          
          for (const newItem of newItems) {
            const existingIndex = existingItems.findIndex(
              i => i.menuItemId === newItem.menuItemId
            );
            if (existingIndex >= 0) {
              existingItems[existingIndex] = {
                ...existingItems[existingIndex],
                quantity: existingItems[existingIndex].quantity + newItem.quantity
              };
            } else {
              existingItems.push(newItem);
            }
          }
          
          const newTotal = existingItems.reduce((sum, item: any) => sum + item.price * item.quantity, 0);
          await storage.updateOrder(pendingOrder.id, { items: existingItems, totalAmount: newTotal });
          broadcast({ type: "ORDER_UPDATED", data: { ...pendingOrder, items: existingItems, totalAmount: newTotal } });
        }
      } else if (parsedResponse.action === 'SEND_TO_KITCHEN' && parsedResponse.data?.orderId) {
        await storage.sendToKitchen(parsedResponse.data.orderId);
      } else if (parsedResponse.action === 'PAY_ORDER' && parsedResponse.data?.orderId) {
        await storage.payOrder(parsedResponse.data.orderId, parsedResponse.data.paymentMethod || "cash");
      } else if (parsedResponse.action === 'CREATE_MENU_ITEM' && parsedResponse.data?.name && parsedResponse.data?.price) {
        await storage.createMenuItem({
          name: parsedResponse.data.name,
          price: Number(parsedResponse.data.price),
          description: parsedResponse.data.description || null,
          categoryId: parsedResponse.data.categoryId || null,
          isAvailable: true,
          isActive: true,
        });
      } else if (parsedResponse.action === 'UPDATE_MENU_ITEM' && parsedResponse.data?.menuItemId) {
        const { menuItemId, name, price, description, categoryId } = parsedResponse.data;
        await storage.updateMenuItem(menuItemId, {
          ...(name !== undefined ? { name } : {}),
          ...(price !== undefined ? { price: Number(price) } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(categoryId !== undefined ? { categoryId } : {}),
        });
      } else if (parsedResponse.action === 'DELETE_MENU_ITEM' && parsedResponse.data?.menuItemId) {
        await storage.deleteMenuItem(parsedResponse.data.menuItemId);
      } else if (parsedResponse.action === 'UPDATE_MENU_ITEM_IMAGE' && parsedResponse.data?.menuItemId && parsedResponse.data?.imageUrl) {
        await storage.updateMenuItem(parsedResponse.data.menuItemId, { image: parsedResponse.data.imageUrl });
      } else if (parsedResponse.action === 'CREATE_CATEGORY' && parsedResponse.data?.name) {
        await storage.createCategory({
          name: parsedResponse.data.name,
          displayOrder: parsedResponse.data.displayOrder || 0,
        });
      } else if (parsedResponse.action === 'UPDATE_CATEGORY' && parsedResponse.data?.categoryId && parsedResponse.data?.name) {
        await storage.updateCategory(parsedResponse.data.categoryId, { name: parsedResponse.data.name });
      } else if (parsedResponse.action === 'DELETE_CATEGORY' && parsedResponse.data?.categoryId) {
        await storage.deleteCategory(parsedResponse.data.categoryId);
      } else if (parsedResponse.action === 'UNPAY_ORDER' && parsedResponse.data?.orderId) {
        await storage.unpayOrder(parsedResponse.data.orderId);
      } else if (parsedResponse.action === 'DELETE_ORDER' && parsedResponse.data?.orderId) {
        await storage.deleteOrder(parsedResponse.data.orderId);
        broadcast({ type: "ORDER_DELETED", data: { id: parsedResponse.data.orderId } });
      }

      res.json(parsedResponse);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal error" });
    }
  });

  return httpServer;
}
