import { WHATSAPP_NUMBER } from "@/lib/site";
import { WhatsAppIcon } from "./icons";

export function WhatsAppButton() {
  const text = encodeURIComponent("Hello BELKA'S ENTERPRISE, I have a question about a shoe.");
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105"
    >
      <WhatsAppIcon />
    </a>
  );
}
