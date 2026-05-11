import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthBackdrop } from "@/components/auth/AuthBackdrop";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = {
  title: "Create account \u00b7 WhiskyQuest",
};

export default function SignupPage() {
  return (
    <>
      <AuthBackdrop />
      <main className="text-on-surface selection:bg-amber-gold selection:text-cask-brown relative z-20 flex min-h-screen items-center justify-center overflow-x-hidden">
        <div className="px-margin-mobile md:px-margin-desktop py-gutter relative z-20 flex w-full max-w-[1280px] flex-col items-center justify-center">
          <header className="mb-12 text-center">
            <h1 className="text-headline-lg text-amber-gold mb-2 tracking-tight font-[family-name:var(--font-headline-lg)]">
              WhiskyQuest
            </h1>
            <p className="text-label-caps text-on-surface-variant tracking-[0.2em] font-[family-name:var(--font-label-caps)]">
              Open a Scholar Account
            </p>
          </header>

          <Suspense fallback={null}>
            <SignupForm />
          </Suspense>
        </div>
      </main>
    </>
  );
}
