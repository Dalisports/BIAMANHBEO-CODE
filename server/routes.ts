import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Products
  app.get(api.products.list.path, async (req, res) => {
    const prods = await storage.getProducts();
    res.json(prods);
  });

  app.post(api.products.create.path, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const prod = await storage.createProduct(input);
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
      const { name, price } = req.body;
      const updated = await storage.updateProduct(id, { name, price });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteProduct(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Orders
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
      const ord = await storage.createOrder(input);
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
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete order" });
    }
  });

  // Chat processing
  app.post(api.chat.process.path, async (req, res) => {
    try {
      const { message } = api.chat.process.input.parse(req.body);
      
      const products = await storage.getProducts();
      const pendingOrders = await storage.getPendingOrders();
      const allOrders = await storage.getOrders();
      
      // Calculate today's stats simply by all orders for now
      const todayTotalOrders = allOrders.length;
      const todayCompletedOrders = allOrders.filter(o => o.status === 'Complete');
      const todayRevenue = todayCompletedOrders.reduce((acc, o) => acc + o.totalAmount, 0);

      const systemPrompt = `You are an AI assistant managing an order system via voice/text. 
You extract user intentions and format them as JSON.
Current Context:
Products in DB: ${JSON.stringify(products)}
Pending Orders: ${JSON.stringify(pendingOrders)}
Today's Stats: Total Orders: ${todayTotalOrders}, Completed: ${todayCompletedOrders.length}, Revenue: ${todayRevenue}k

Based on the user's message, determine the action to take. 
Always reply in Vietnamese.
Your name is 'Trợ Lý AI' or 'SÓI int'.
Available actions:
1. CREATE_PRODUCT: If user wants to create a product. Return data: { name, price }. Ask for missing info (like price) if needed.
2. CREATE_ORDER: If user wants to create an order. Return data: { customerName, address, phone, items: [{name, quantity, price}], totalAmount }. Ask for missing info if needed. (Calculate total amount based on product price).
3. QUERY_ORDERS: If user asks about orders (e.g. how many pending). Return action QUERY_ORDERS, no data needed.
4. COMPLETE_ORDER: If user wants to complete/chốt an order. Try to match the customer name or address. Return data: { ids: [order_id1, order_id2] }.
5. UPDATE_ORDER: If user wants to update an order. Try to match the customer name or address. Return data: { id, updates: { items, totalAmount, address... } }. Ask for confirmation before updating if needed.
6. REPORT: If user asks for a sales report.
7. NONE: If no specific action, just converse naturally.

Return a JSON object with this structure:
{
  "reply": "The response to speak/show to the user",
  "action": "One of the action strings above or NONE",
  "data": { ... } // Optional data payload for the action
}

Ensure the 'reply' perfectly matches the user's scenarios. For example, if they say 'chốt đơn chị thanh', reply 'đã chốt đơn hàng chị Thanh...' and return action COMPLETE_ORDER with the matched order id.
If they say 'Lên Đơn', ask for information: 'mời bạn nhập thông tin đơn hàng'.
If they say 'Tạo mặt hàng', ask for product info.
All prices are typically referred to as 'k' (e.g., 45k = 45000). Convert internally to numbers if necessary.`;

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
      
      // Auto-execute server-side actions if appropriate, or let frontend handle it
      if (parsedResponse.action === 'CREATE_PRODUCT' && parsedResponse.data?.name && parsedResponse.data?.price) {
        await storage.createProduct({
          name: parsedResponse.data.name,
          price: Number(parsedResponse.data.price)
        });
      } else if (parsedResponse.action === 'CREATE_ORDER' && parsedResponse.data?.customerName) {
        await storage.createOrder({
          customerName: parsedResponse.data.customerName,
          address: parsedResponse.data.address || "Unknown",
          phone: parsedResponse.data.phone || "Unknown",
          totalAmount: parsedResponse.data.totalAmount || 0,
          items: parsedResponse.data.items || [],
          status: "Pending"
        });
      } else if (parsedResponse.action === 'COMPLETE_ORDER' && parsedResponse.data?.ids?.length > 0) {
        await storage.completeOrders(parsedResponse.data.ids);
      } else if (parsedResponse.action === 'UPDATE_ORDER' && parsedResponse.data?.id && parsedResponse.data?.updates) {
        await storage.updateOrder(parsedResponse.data.id, {
          ...parsedResponse.data.updates,
          status: "Updated - Pending"
        });
      }

      res.json(parsedResponse);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal error" });
    }
  });

  return httpServer;
}
