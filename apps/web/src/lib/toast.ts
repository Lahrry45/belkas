export type ToastKind = "info" | "error" | "success";
export function toast(message: string, kind: ToastKind = "info") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("belkas:toast", { detail: { message, kind } }));
}
