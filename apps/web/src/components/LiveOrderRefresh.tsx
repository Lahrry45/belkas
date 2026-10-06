"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Re-renders the order page when an admin changes its status (Realtime on public.orders). */
export function LiveOrderRefresh({ orderId }: { orderId: string }) {
  const router = useRouter();
  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb
      .channel(`order:${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, () => router.refresh())
      .subscribe();
    return () => void sb.removeChannel(ch);
  }, [orderId, router]);
  return null;
}
