import { env } from "./env.ts";

const BASE = "https://api.paystack.co";

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env("PAYSTACK_SECRET_KEY")}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.status === false) throw new Error(body.message ?? `Paystack error ${res.status}`);
  return body.data;
}

export function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<{ authorization_url: string; access_code: string; reference: string }> {
  return call("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: ["card", "bank", "ussd", "bank_transfer"],
      metadata: input.metadata,
    }),
  });
}

export function verifyTransaction(reference: string): Promise<{ status: string; amount: number; currency: string; reference: string }> {
  return call(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Paystack signs webhooks with HMAC-SHA512(secret key, raw body). */
export async function isValidSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env("PAYSTACK_SECRET_KEY")),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
