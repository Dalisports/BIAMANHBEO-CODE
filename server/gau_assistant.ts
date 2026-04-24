import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { storage } from "./storage";
import { broadcast } from "./websocket";

// OpenRouter client (default - free models)
const openrouter = new OpenAI({
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// NVIDIA client (optional - fill NVIDIA_API_KEY in .env)
const nvidia = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

// NVIDIA client (optional - fill NVIDIA_API_KEY in .env)
const nvidia = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
=======
  apiKey: process.env.OPENROUTER_API_KEY || "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",
  baseURL: "https://openrouter.ai/api/v1",
});

// NVIDIA client (optional - user's NVIDIA API key)
const nvidia = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || "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",
>>>>>>> 9db9958906e2edd781e69ac22c570bcb0989a5d0
  baseURL: "https://integrate.api.nvidia.com/v1",
});

// Available models for selection
const AVAILABLE_MODELS = [
  { id: "auto", name: "Tự động (OpenRouter)", provider: "openrouter", description: "Chọn model miễn phí tốt nhất" },
  { id: "nvidia/gemma-2-2b-it", name: "NVIDIA Gemma 2B", provider: "nvidia", description: "Model nhanh của NVIDIA" },
];

// FREE models list - tried in order until one works (auto-fallback on 429/credits error)
const FREE_MODELS = [
  "inclusionai/ling-2.6-1t:free",
  "tencent/hy3-preview:free",
  "inclusionai/ling-2.6-flash:free",
  "baidu/qianfan-ocr-fast:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "minimax/minimax-m2.5:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "openai/gpt-oss-120b:free",
];

// Track current model index
let currentModelIndex = 0;
let workingModel: string | null = null;

// Check if error is due to no credits / rate limit
function isCreditsError(err: any): boolean {
  const msg = err?.message || "";
  return msg.includes("429") || msg.includes("rate limit") || msg.includes("credits") || msg.includes("quota") || msg.includes("insufficient");
}

// Find a working free model (auto-fallback on credits error)
async function findWorkingModel(): Promise<string> {
  // Try current model first
  if (workingModel) {
    try {
      await openrouter.chat.completions.create({
        model: workingModel,
        messages: [{ role: "user", content: "test" }],
        max_tokens: 5,
      });
      return workingModel;
    } catch (err) {
      if (!isCreditsError(err)) {
        // Model totally broken, don't use it
        workingModel = null;
      }
      // If credits error, try next model
    }
  }
  
  // Find next working model
  const startIndex = currentModelIndex;
  do {
    const model = FREE_MODELS[currentModelIndex];
    console.log(`[GauAssistant] Testing model: ${model}`);
    try {
      await openrouter.chat.completions.create({
        model,
        messages: [{ role: "user", content: "test" }],
        max_tokens: 5,
      });
      workingModel = model;
      console.log(`[GauAssistant] ✅ Working model: ${model}`);
      return model;
    } catch (err: any) {
      console.log(`[GauAssistant] ❌ Model ${model} failed: ${err.message}`);
      if (isCreditsError(err)) {
        // Credits issue - skip this model permanently for this session
        currentModelIndex = (currentModelIndex + 1) % FREE_MODELS.length;
      }
    }
  } while (currentModelIndex !== startIndex);
  
  throw new Error("No working free model found - all models out of credits");
}

// System prompt for Gấu Assistant
const GAU_SYSTEM_PROMPT = `Bạn là Gấu 🐻 - trợ lý AI thông minh cho nhà hàng BIA MẠNH BÉO.

## Nhiệm vụ
Bạn hỗ trợ nhân viên thực hiện các tác vụ quản lý nhà hàng thông qua ngôn ngữ tự nhiên.

## QUAN TRỌNG - Table Number Format:
- LUÔN dùng SỐ ĐƠN GIẢN cho tableNumber, ví dụ: "1", "2", "3"
- KHÔNG dùng "Bàn 1" hay "bàn 1" - chỉ dùng số: "1"

## QUAN TRỌNG - Cách trả lời:
- KHÔNG viết text giải thích trước JSON
- KHÔNG có câu "Vâng", "Tôi đã", "OK"
- Chỉ trả lời ĐÚNG một JSON object thuần túy, không có markdown code block

## Các lệnh bạn có thể thực hiện (DÙNG /api/orders):
1. **Tạo Order**: 
   - Action: { "action": "EXECUTE", "apiPath": "/api/orders/create", "apiMethod": "POST", "apiBody": { "tableNumber": "2", "items": [...], "totalAmount": ... } }

2. **Thêm món**: 
   - Action: { "action": "EXECUTE", "apiPath": "/api/orders/ID_THẬT/update", "apiMethod": "PUT", "apiBody": { "items": [...] } }

3. **Gửi bếp**: 
   - Action: { "action": "EXECUTE", "apiPath": "/api/orders/ID_THẬT/send-to-kitchen", "apiMethod": "POST" }

4. **Thanh toán**: 
   - Action: { "action": "EXECUTE", "apiPath": "/api/orders/ID_THẬT/pay", "apiMethod": "POST", "apiBody": { "method": "cash|transfer" } }

5. **Đổi bàn**: 
   - Action: { "action": "EXECUTE", "apiPath": "/api/orders/ID_THẬT/move", "apiMethod": "POST", "apiBody": { "tableNumber": "2" } }

## Nếu cần hỏi lại khách:
- Action: { "action": "REPLY", "message": "Câu hỏi của bạn" }

## Luôn nhớ:
- LUÔN dùng /api/orders
- tableNumber CHỈ là SỐ: "1", "2", "3" - không có chữ "Bàn"
- KHÔNG viết gì khác ngoài JSON
- Thay ID_THẬT bằng ID thực tế từ danh sách đơn đang hoạt động
- Trả lời bằng tiếng Việt trong field "message"

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
    res.json({ models: AVAILABLE_MODELS });
  });

  // POST /api/gau-assistant/chat
  app.post("/api/gau-assistant/chat", async (req: Request, res: Response) => {
    try {
      const { message, model: selectedModel } = req.body;
      if (!message) return res.status(400).json({ error: "Message required" });

      const context = await getRestaurantContext();
      const systemMessage = `${GAU_SYSTEM_PROMPT}
Menu: ${JSON.stringify(context.menuItems)}
Đơn đang hoạt động: ${JSON.stringify(context.activeOrders)}`;

      console.log(`[GauAssistant] Processing message with model: ${selectedModel || 'auto'}`);

      let responseText = "";
      
      if (selectedModel === "nvidia/gemma-2-2b-it") {
        // Use NVIDIA API
        console.log("[GauAssistant] Using NVIDIA model");
        try {
          const completion = await nvidia.chat.completions.create({
            model: "google/gemma-2-2b-it",
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: message }
            ],
            temperature: 0.1,
            max_tokens: 1024,
          });
          responseText = completion.choices[0]?.message?.content || "";
        } catch (nvidiaErr: any) {
          console.error("[GauAssistant] NVIDIA error:", nvidiaErr.message);
          // Fallback to OpenRouter if NVIDIA fails
          console.log("[GauAssistant] Falling back to OpenRouter");
          const model = await findWorkingModel();
          const completion = await openrouter.chat.completions.create({
            model,
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: message },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
          });
          responseText = completion.choices[0]?.message?.content || "{}";
        }
      } else {
        // Use OpenRouter (auto-select best available free model)
        const model = await findWorkingModel();
        console.log(`[GauAssistant] Using OpenRouter model: ${model}`);

        const completion = await openrouter.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: message },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        });
        responseText = completion.choices[0]?.message?.content || "{}";
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
      if (isCreditsError(err)) {
        workingModel = null;
        res.status(503).json({ action: "ERROR", message: "Gấu đang hết credit một chút, đang chuyển model... thử lại nhé!" });
      } else {
        res.status(500).json({ action: "ERROR", message: "Gấu đang bận một chút, bạn thử lại nhé!" });
      }
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

  // POST /api/nvidia-chat/chat - NVIDIA AI chat with restaurant actions
  app.post("/api/nvidia-chat/chat", async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "Message required" });

      console.log("[NVIDIA Chat] Message:", message);

      // Get context
      const context = await getRestaurantContext();
      
      // System prompt with full capabilities
      const systemPrompt = `Bạn là trợ lý AI của nhà hàng BIA MẠNH BÉO. Bạn có thể:
- Tạo order mới cho khách
- Thanh toán đơn hàng
- Đổi bàn
- Gửi bếp
- Tư vấn món ăn, giá cả

**Menu nhà hàng:**
${context.menuItems.map(m => `- ${m.name}: ${m.price.toLocaleString()}đ`).join('\n')}

**Đơn đang hoạt động:**
${context.activeOrders.map(o => `- Đơn #${o.id} (Bàn ${o.table}): ${o.total.toLocaleString()}đ - ${o.status}`).join('\n')}

Khi khách muốn order/thanh toán/đổi bàn - hãy trả lời ngắn gọn xác nhận. Nếu thiếu thông tin thì hỏi khách.
Luôn trả lời bằng tiếng Việt, thân thiện.`;

      const completion = await nvidia.chat.completions.create({
        model: "google/gemma-2-2b-it",
        messages: [
          { role: "user", content: systemPrompt + "\n\nKhách: " + message }
        ],
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
        stream: false,
      });

      const content = completion.choices[0]?.message?.content || "";
      console.log("[NVIDIA Chat] Response:", content);

      // Parse intent from message and execute actions
      const msgLower = message.toLowerCase();
      
      // Order creation pattern: "order bàn X", "gọi món", "đặt bàn"
      const orderMatch = msgLower.match(/(?:order|gọi|đặt|mang)\s*(?:bàn|cho)\s*(\d+)/i);
      // Pay pattern: "thanh toán bàn X", "trả tiền bàn X"
      const payMatch = msgLower.match(/(?:thanh toán|trả(?: tiền)?)\s*(?:bàn)?\s*(\d+)/i);
      // Move pattern: "chuyển bàn X sang Y", "đổi bàn X sang Y"
      const moveMatch = msgLower.match(/(?:chuyển|đổi)\s*bàn\s*(\d+)\s*(?:sang|ra)\s*(\d+)/i);

      // Check if intent is action-related
      const intentLower = content.toLowerCase();
      
      if (orderMatch) {
        const tableNum = orderMatch[1];
        // Extract items from message - look for common menu items
        const items: { menuItemId: number; quantity: number; price: number }[] = [];
        
        // Simple item extraction based on menu
        for (const menuItem of context.menuItems) {
          const itemName = menuItem.name.toLowerCase();
          if (msgLower.includes(itemName)) {
            // Find quantity if specified
            const qtyMatch = msgLower.match(new RegExp(`(\d+)\s*(?:cái|ly|cốc|phần|con|quả)?\s*${itemName}`));
            const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
            items.push({ menuItemId: menuItem.id, quantity: qty, price: menuItem.price });
          }
        }

        if (items.length > 0) {
          const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          const customerName = `Bàn ${tableNum}`;
          
          try {
            const order = await storage.createOrder({ tableNumber: tableNum, items, totalAmount, customerName });
            broadcast({ type: "ORDER_CREATED", data: order });
            res.json({ 
              content: `✅ Đã tạo order cho bàn ${tableNum}: ${items.map(i => `${i.quantity}x ${context.menuItems.find(m => m.id === i.menuItemId)?.name}`).join(', ')} - ${totalAmount.toLocaleString()}đ`
            });
          } catch (err: any) {
            console.error("[NVIDIA Chat] Order error:", err);
            res.json({ content: content + "\n\n(Tạo order gặp lỗi, vui lòng thử lại)" });
          }
        } else {
          res.json({ content });
        }
      } else if (payMatch) {
        const tableNum = payMatch[1];
        // Find active order for this table
        const order = context.activeOrders.find(o => o.table === tableNum);
        if (order) {
          try {
            await storage.payOrder(order.id, "cash");
            broadcast({ type: "ORDER_UPDATED", data: { ...order, status: "Complete", paymentStatus: "Paid" } });
            broadcast({ type: "KITCHEN_ORDER_DELETED", data: { orderId: order.id } });
            res.json({ content: `✅ Đã thanh toán cho bàn ${tableNum}: ${order.total.toLocaleString()}đ` });
          } catch (err) {
            res.json({ content: content });
          }
        } else {
          res.json({ content: `Không tìm thấy đơn đang hoạt động cho bàn ${tableNum}.` });
        }
      } else if (moveMatch) {
        const fromTable = moveMatch[1];
        const toTable = moveMatch[2];
        const order = context.activeOrders.find(o => o.table === fromTable);
        if (order) {
          try {
            await storage.updateOrder(order.id, { tableNumber: toTable });
            broadcast({ type: "ORDER_UPDATED", data: { ...order, tableNumber: toTable } });
            res.json({ content: `✅ Đã chuyển bàn ${fromTable} sang bàn ${toTable}` });
          } catch (err) {
            res.json({ content: content });
          }
        } else {
          res.json({ content: `Không tìm thấy đơn đang hoạt động cho bàn ${fromTable}.` });
        }
      } else {
        res.json({ content });
      }
    } catch (err: any) {
      console.error("[NVIDIA Chat] Error:", err.message);
      res.status(500).json({ error: err.message || "Chat failed" });
    }
  });
}
