export const SITE_NAME = "BELKA'S ENTERPRISE";
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "2349066825850";
export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
