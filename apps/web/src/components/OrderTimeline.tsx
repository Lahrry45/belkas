import { ORDER_STEPS, type Order } from "@belkas/shared";

/** Vertical status timeline. Pay-on-delivery orders skip "Payment confirmed" until delivered. */
export function OrderTimeline({ order }: { order: Pick<Order, "status" | "payment_method"> }) {
  if (order.status === "cancelled") {
    return <p className="border border-accent px-4 py-3 text-sm text-accent">This order was cancelled.</p>;
  }
  const steps = ORDER_STEPS.filter((s) => !(order.payment_method === "pay_on_delivery" && s.status === "paid"));
  const reached = steps.findIndex((s) => s.status === order.status);
  return (
    <ol className="relative space-y-6 border-l border-line pl-6">
      {steps.map((s, i) => {
        const done = i <= reached;
        return (
          <li key={s.status} className="relative">
            <span className={`absolute -left-[31px] top-0.5 grid h-4 w-4 place-items-center rounded-full border ${done ? "border-accent bg-accent" : "border-line bg-white"}`}>
              {done && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            <p className={`text-sm ${done ? "font-medium text-ink" : "text-muted"}`}>{s.label}</p>
            {i === reached && <p className="text-xs text-accent">Current status</p>}
          </li>
        );
      })}
    </ol>
  );
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "Order placed",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
