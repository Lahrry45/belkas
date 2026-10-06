import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/Toaster";
import { getUser } from "@/lib/supabase/server";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-display-serif", display: "swap" });

export const metadata: Metadata = {
  title: { default: "BELKA'S ENTERPRISE — Footwear", template: "%s · BELKA'S ENTERPRISE" },
  description: "Loafers, sandals, mules, slip-ons, flip-flops and sneakers. Delivery across Nigeria, pay with Paystack or on delivery.",
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getUser();
  return (
    <html lang="en-NG" className={`${inter.variable} ${serif.variable}`}>
      <body className="min-h-dvh antialiased">
        <Providers initialUser={user}>
          <Header />
          <main className="min-h-[70dvh]">{children}</main>
          <Footer />
          <CartDrawer />
          <Toaster />
          <WhatsAppButton />
        </Providers>
      </body>
    </html>
  );
}
