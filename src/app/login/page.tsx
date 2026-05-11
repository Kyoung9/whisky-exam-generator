import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthBackdrop } from "@/components/auth/AuthBackdrop";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in \u00b7 WhiskyQuest",
};

/**
 * /login \u30da\u30fc\u30b8 (Stitch \u30c7\u30b6\u30a4\u30f3 "Enter the Vault" \u3092\u518d\u73fe)
 * - Server Component \u30b7\u30a7\u30eb\u3068\u3057\u3066 backdrop + Suspense<LoginForm/>
 * - Form \u8a2d\u5099\u306f Client Component
 */
export default function LoginPage() {
  return (
    <>
      <AuthBackdrop />

      <main className="bg-background-deep/0 selection:bg-amber-gold selection:text-cask-brown text-on-surface relative z-20 flex min-h-screen items-center justify-center overflow-x-hidden">
        <div className="px-margin-mobile md:px-margin-desktop py-gutter relative z-20 flex w-full max-w-[1280px] flex-col items-center justify-center">
          <header className="mb-12 text-center">
            <h1 className="text-headline-lg text-amber-gold mb-2 tracking-tight font-[family-name:var(--font-headline-lg)]">
              WhiskyQuest
            </h1>
            <p className="text-label-caps text-on-surface-variant tracking-[0.2em] font-[family-name:var(--font-label-caps)]">
              The Scholar&apos;s Archive
            </p>
          </header>

          <Suspense fallback={<LoginFormFallback />}>
            <LoginForm />
          </Suspense>

          <footer className="mt-12 text-center">
            <p className="text-on-surface-variant/40 text-[10px] uppercase tracking-[0.3em] font-[family-name:var(--font-label-caps)]">
              WhiskyQuest Archive \u00b7 Est. MMXXIV \u00b7 High Fidelity Distillation
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}

function LoginFormFallback() {
  return (
    <div className="glass-panel w-full max-w-[420px] rounded-xl p-8 md:p-10">
      <div className="bg-on-surface-variant/10 mx-auto mb-8 h-8 w-40 animate-pulse rounded" />
      <div className="space-y-6">
        <div className="bg-on-surface-variant/10 h-12 animate-pulse rounded" />
        <div className="bg-on-surface-variant/10 h-12 animate-pulse rounded" />
        <div className="bg-on-surface-variant/10 h-12 animate-pulse rounded" />
      </div>
    </div>
  );
}
