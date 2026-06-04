export function getActiveOrder(orders: any[], tableNum: number): any | undefined {
  return orders?.find(o => o.tableNumber === tableNum.toString() && o.status !== "Complete");
}

export function getRecentPaidOrder(orders: any[], tableNum: number): any | undefined {
  const active = getActiveOrder(orders, tableNum);
  if (active) return undefined;
  return orders?.find(o =>
    o.tableNumber === tableNum.toString() &&
    o.status === "Complete" &&
    o.paymentStatus === "Paid"
  );
}
