import { ORDER_STEPS, type Order } from "@belkas/shared";
import { Text, View } from "react-native";
import { C } from "@/lib/theme";

export const STATUS_LABEL: Record<string, string> = {
  pending: "Order placed", paid: "Paid", processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
};

export function OrderTimeline({ order }: { order: Pick<Order, "status" | "payment_method"> }) {
  if (order.status === "cancelled") return <Text style={{ color: C.accent }}>This order was cancelled.</Text>;
  const steps = ORDER_STEPS.filter((s) => !(order.payment_method === "pay_on_delivery" && s.status === "paid"));
  const reached = steps.findIndex((s) => s.status === order.status);
  return (
    <View>
      {steps.map((s, i) => {
        const done = i <= reached;
        return (
          <View key={s.status} style={{ flexDirection: "row", gap: 14 }}>
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: done ? C.accent : C.line, backgroundColor: done ? C.accent : "#fff" }} />
              {i < steps.length - 1 && <View style={{ width: 1, height: 26, backgroundColor: i < reached ? C.accent : C.line }} />}
            </View>
            <View>
              <Text style={{ fontWeight: done ? "600" : "400", color: done ? C.ink : C.muted }}>{s.label}</Text>
              {i === reached && <Text style={{ fontSize: 12, color: C.accent }}>Current status</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}
