import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="container-x grid min-h-[75dvh] place-items-center py-16">
      <div className="w-full max-w-sm">
        <p className="eyebrow text-center">Welcome</p>
        <h1 className="mt-3 text-center font-display text-5xl">Sign in</h1>
        <p className="mt-3 text-center text-sm text-muted">One account for our website and app. Your cart follows you.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
