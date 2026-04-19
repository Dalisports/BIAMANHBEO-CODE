export interface CookingQueueItem {
  key: string;
  kitchenOrderId: number;
  orderId: number;
  tableNumber: string;
  name: string;
  quantity: number;
  notes?: string;
  sentAt: Date | null;
  cookingStatus: string;
}

const MULTI_TABLE_WINDOW_MS = 12 * 60 * 1000;

export function buildCookingQueue(
  flatItems: CookingQueueItem[],
  priorityNames: Set<string>
): CookingQueueItem[] {
  const cooking = flatItems.filter((i) => i.cookingStatus === "cooking");
  if (cooking.length === 0) return [];

  // Group by table, ordered by earliest sentAt per table
  const tableMap: Map<string, CookingQueueItem[]> = new Map();
  for (const item of cooking) {
    if (!tableMap.has(item.tableNumber)) tableMap.set(item.tableNumber, []);
    tableMap.get(item.tableNumber)!.push(item);
  }

  // Sort tables by earliest sentAt
  const sortedTables = Array.from(tableMap.keys()).sort((a, b) => {
    const aTime = Math.min(...tableMap.get(a)!.map((i) => i.sentAt?.getTime() ?? Infinity));
    const bTime = Math.min(...tableMap.get(b)!.map((i) => i.sentAt?.getTime() ?? Infinity));
    return aTime - bTime;
  });

  // Detect multi-table items (same name, ≥2 tables, within 12 min)
  const nameToTables: Map<string, { tables: string[]; times: number[] }> = new Map();
  for (const item of cooking) {
    if (!nameToTables.has(item.name)) nameToTables.set(item.name, { tables: [], times: [] });
    const entry = nameToTables.get(item.name)!;
    if (!entry.tables.includes(item.tableNumber)) {
      entry.tables.push(item.tableNumber);
      entry.times.push(item.sentAt?.getTime() ?? 0);
    }
  }

  const multiTableNames = new Set<string>();
  for (const [name, { tables, times }] of nameToTables) {
    if (tables.length >= 2) {
      const minT = Math.min(...times);
      const maxT = Math.max(...times);
      if (maxT - minT <= MULTI_TABLE_WINDOW_MS) {
        multiTableNames.add(name);
      }
    }
  }

  // Split into 3 buckets
  const bucket1: CookingQueueItem[] = []; // priority (ưu tiên ra nhanh)
  const bucket2: CookingQueueItem[] = []; // multi-table same dish
  const bucket3Map: Map<string, CookingQueueItem[]> = new Map(); // rest per table

  for (const tableNum of sortedTables) {
    const items = tableMap.get(tableNum)!;
    for (const item of items) {
      if (priorityNames.has(item.name)) {
        bucket1.push(item);
      } else if (multiTableNames.has(item.name)) {
        bucket2.push(item);
      } else {
        if (!bucket3Map.has(tableNum)) bucket3Map.set(tableNum, []);
        bucket3Map.get(tableNum)!.push(item);
      }
    }
  }

  // Cap bucket1 + bucket2 combined to max 5 slots (avoid visible jump on public display)
  const prioritySlots = Math.min(bucket1.length + bucket2.length, 5);
  const prioritySection = [...bucket1, ...bucket2].slice(0, prioritySlots);

  // Round-robin 2-2 from remaining tables for bucket3
  const tableQueues = sortedTables
    .map((t) => bucket3Map.get(t) ?? [])
    .filter((q) => q.length > 0);

  const roundRobin: CookingQueueItem[] = [];
  const SLICE = 2;
  let pointers = tableQueues.map(() => 0);

  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    for (let t = 0; t < tableQueues.length; t++) {
      const start = pointers[t];
      const end = Math.min(start + SLICE, tableQueues[t].length);
      if (start < tableQueues[t].length) {
        roundRobin.push(...tableQueues[t].slice(start, end));
        pointers[t] = end;
        hasMore = true;
      }
    }
  }

  return [...prioritySection, ...roundRobin];
}
