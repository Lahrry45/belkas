import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <article className="container-x max-w-2xl py-12 text-[15px] leading-relaxed [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-3xl [&_p]:mt-3 [&_li]:mt-1">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-2 font-display text-5xl">Privacy policy</h1>
      <p className="text-muted">Last updated 6 October 2026</p>

      <h2>Who we are</h2>
      <p>BELKA&apos;S ENTERPRISE sells footwear online through this website and our mobile app. This policy explains what personal data we collect and how we use it.</p>

      <h2>What we collect</h2>
      <ul className="list-disc pl-5">
        <li>Account details: your name, email address and profile photo. If you sign in with Google, Google shares only these basic details with us.</li>
        <li>Delivery details: phone number and delivery addresses you save.</li>
        <li>Orders, cart and wishlist contents, so they stay in sync across your devices.</li>
        <li>Payment status from Paystack. We never see or store your full card details. Payments are handled by Paystack.</li>
      </ul>

      <h2>How we use it</h2>
      <ul className="list-disc pl-5">
        <li>To process and deliver your orders and send order confirmation emails.</li>
        <li>To keep your account, cart and wishlist in sync between the website and app.</li>
        <li>To answer your questions on WhatsApp or email.</li>
      </ul>
      <p>We do not sell your data. We share it only with the services that run the shop: Supabase (database and sign-in), Paystack (payments), Mailgun (emails) and our delivery partners (your name, phone and address, to deliver your order).</p>

      <h2>Your choices</h2>
      <p>You can edit your profile and addresses in your account at any time. To delete your account and data, message us on WhatsApp or reply to any of our emails and we&apos;ll remove it within 30 days, except records we must keep by law.</p>

      <h2>Contact</h2>
      <p>Questions about privacy: reply to any order email or use the WhatsApp button on this site.</p>
    </article>
  );
}
