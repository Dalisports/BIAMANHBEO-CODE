import type { Models, ChatRequest, ChatResponse, AgentContext } from "./types";
import type { IStorage } from "./agentStorage";
import type { IChatStorage } from "../replit_integrations/chat/storage";
import type { IBrain } from "./brain";

function buildSystemPrompt(ctx: AgentContext): string {
  const brainContext = ctx.customInstructions.length > 0
    ? "\n\nCustom instructions:\n" +
      ctx.customInstructions.map((inst) =>
        `- "${inst.trigger}": ${inst.instruction}${inst.example ? ` (eg: "${inst.example}")` : ""}`
      ).join("\n")
    : "";

const menuCount = ctx.products.length;

  const context = `Don cho: ${ctx.pendingOrders.length} | Hom nay: ${ctx.todayStats.completedOrders}/${ctx.todayStats.totalOrders} don | ${ctx.todayStats.revenue}k`;

  return `Ban la tro ly AI nha hang BIAMANHBEO. Menu co ${menuCount} mon. Khi can tra cuu mon, hoi user.

${context}
${brainContext}

QUY TAC TAO DON (TUYET DOI CHI DANH CHO MON CO TRONG MENU):
1. Tim mon trong MENU bang ten CHINH XAC hoac gan dung nhat
2. Lay dung menuItemId va price tu MENU
3. Tra ve JSON dung format:
{
  "reply": "Da tao don ban X gom Y mon (Z dong) va gui Kitchen!",
  "action": "CREATE_ORDER",
  "data": {
    "tableNumber": "5",
    "items": [{"menuItemId": 1, "name": "Ten mon", "quantity": 2, "price": 45000}],
    "customerName": "Khach",
    "phone": ""
  }
}
4. Neu co hon 1 mon gan giong nhau trong MENU -> Hoi lai user: "Ban muon mon nao? [A], [B], hay [C]?" va KHONG tao don.
5. Neu mon khong co trong MENU -> reply: "Xin loi, [ten mon] khong co trong menu." va goi 3 mon gan nhat.
6. TUYET DOI KHONG duoc tu chon mot trong cac mon gan giong. TUYET DOI KHONG duoc thay the mon khong co.

HANH DONG: CREATE_ORDER | CREATE_PRODUCT | COMPLETE_ORDER | REPORT | QUERY_ORDERS | LEARN | NONE

Tra loi tieng Viet. Ten: SOI Agent.`;
}

export class AgentHandler {
  constructor(
    private models: Models,
    private storage: IStorage,
    private chatStorage: IChatStorage,
    private brain: IBrain,
  ) {}

  async process(req: ChatRequest): Promise<ChatResponse> {
    const [products, pendingOrders, allOrders, memories, customInstructions] = await Promise.all([
      this.storage.getProducts(),
      this.storage.getPendingOrders(),
      this.storage.getOrders(),
      this.chatStorage.getRecentMemories(10),
      this.brain.getEnabledInstructions(),
    ]);

    const completedOrders = allOrders.filter(o => o.status === 'Complete');

    const ctx: AgentContext = {
      products,
      pendingOrders,
      allOrders,
      memories,
      customInstructions,
      todayStats: {
        totalOrders: allOrders.length,
        completedOrders: completedOrders.length,
        revenue: completedOrders.reduce((acc, o) => acc + o.totalAmount, 0),
      },
    };

    const systemPrompt = buildSystemPrompt(ctx);
    const modelKey = req.model || "gemma-2-2b-it";
    const selected = this.models[modelKey] || this.models["gemma-2-2b-it"];

    const conversationMessages: { role: "user" | "assistant"; content: string }[] = [];

    // Prepend new user message first
    conversationMessages.push({ role: "user", content: systemPrompt + "\n\nUser: " + req.message });

    // Add history with alternation fix
    if (req.history && req.history.length > 0) {
      for (const msg of req.history.slice(-20)) {
        if (conversationMessages.length > 0) {
          const last = conversationMessages[conversationMessages.length - 1];
          // If last message has same role, merge (skip to avoid breaking alternation)
          if (last.role === msg.role) continue;
        }
        conversationMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const response = await selected.client.chat.completions.create({
      model: selected.model,
      messages: conversationMessages,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from AI");

    let cleanContent = content.trim();
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    }

    let parsed: ChatResponse;
    try {
      parsed = JSON.parse(cleanContent) as ChatResponse;
    } catch {
      parsed = { reply: cleanContent, action: "NONE" };
    }

    await this.executeAction(parsed);

    return parsed;
  }

  private async executeAction(parsed: ChatResponse) {
    const data = parsed.data as Record<string, unknown> | undefined;
    if (!data) return;

    switch (parsed.action) {
      case "CREATE_PRODUCT": {
        if (data.name && data.price) {
          await this.storage.createProduct({
            name: String(data.name),
            price: Number(data.price),
          });
        }
        break;
      }
      case "CREATE_ORDER": {
        if (data.tableNumber && data.items) {
          const items = data.items as any[];
          const enrichedItems = await this.storage.enrichOrderItems(items);
          const totalAmount = enrichedItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
          const orderItems = enrichedItems.map((item: any) => ({
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          }));
          const order = await this.storage.createOrder({
            tableNumber: String(data.tableNumber),
            customerName: String(data.customerName || "Khách AI"),
            phone: String(data.phone || ""),
            totalAmount,
            items: orderItems,
            status: "Pending",
          });
          await this.storage.sendToKitchen(order.id);
          parsed.reply = `Đã tạo đơn bàn ${data.tableNumber} gồm ${enrichedItems.length} món (${totalAmount.toLocaleString()}đ) và gửi Kitchen rồi nhé!`;
        }
        break;
      }
      case "COMPLETE_ORDER": {
        const ids = data.ids as number[] | undefined;
        if (ids && ids.length > 0) {
          await this.storage.completeOrders(ids);
        }
        break;
      }
      case "LEARN": {
        if (data.trigger && data.instruction) {
          await this.brain.createInstruction({
            trigger: String(data.trigger),
            instruction: String(data.instruction),
            example: data.example ? String(data.example) : null,
          });
          parsed.reply = `Đã ghi nhớ: "${data.trigger}" - ${data.instruction}`;
        }
        break;
      }
    }
  }
}