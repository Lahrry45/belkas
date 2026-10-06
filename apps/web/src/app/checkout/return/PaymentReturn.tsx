"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { verifyPayment } from "@belkas/shared";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Paystack redirects here (?reference=…). The server verifies with Paystack before the order is marked paid. */
export function PaymentReturn() {
  const sp = useSearchParams();
  const router = useRouter();
  const reference = sp.get("reference") ?? sp.get("trxref");
  const fromApp = sp.get("app") === "1";
  const [state, setState] = useState<"checking" | "failed" | "pending">(reference ? "checking" : "failed");

  useEffect(() => {
    if (!reference) return;
    if (fromApp) {
      // Hand control back to the mobile app, which verifies the payment itself.
      window.location.href = `belkas://checkout-return?reference=${encodeURIComponent(reference)}`;
      return;
    }
    let tries = 0;
    let cancelled = false;
    const check = async () => {
      try {
        const res = await verifyPayment(supabaseBrowser(), reference);
        if (cancelled) return;
        if (res.status === "paid" && res.order_id) return router.replace(`/orders/${res.order_id}?placed=1`);
        if (res.status === "failed") return setState("failed");
      } catch {}
      if (++tries < 8) setTimeout(check, 2000);
      else setState("pending");
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, [reference, fromApp, router]);

  return (
    <div className="container-x grid min-h-[60dvh] place-items-center py-20 text-center">
      {fromApp ? (
        <div>
          <p className="font-display text-4xl">Returning to the app…</p>
          <a className="btn-primary mt-6" href={`belkas://checkout-return?reference=${encodeURIComponent(reference ?? "")}`}>Open BELKA&apos;S app</a>
        </div>
      ) : state === "checking" ? (
        <div>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
          <p className="mt-6 font-display text-4xl">Confirming your payment…</p>
          <p className="mt-2 text-sm text-muted">This takes a few seconds. Please don&apos;t close this page.</p>
        </div>
      ) : state === "failed" ? (
        <div>
          <p className="font-display text-4xl">Payment not completed</p>
          <p className="mt-2 text-sm text-muted">You haven&apos;t been charged. Your cart is still saved.</p>
          <Link href="/checkout" className="btn-primary mt-6">Try again</Link>
        </div>
      ) : (
        <div>
          <p className="font-display text-4xl">Still confirming…</p>
          <p className="mt-2 text-sm text-muted">If you were charged, your order will appear in Orders within a few minutes.</p>
          <Link href="/orders" className="btn-primary mt-6">View orders</Link>
        </div>
      )}
    </div>
  );
}
