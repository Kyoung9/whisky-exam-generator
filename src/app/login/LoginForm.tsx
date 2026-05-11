"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Provider } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";

type Mode = "password" | "magic";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialError = searchParams.get("error");
  const next = searchParams.get("next") || "/";

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<Provider | "email" | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending("email");

    try {
      const supabase = createBrowserSupabaseClient();
      if (mode === "password") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
          return;
        }
        router.replace(next);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) {
          setError(error.message);
          return;
        }
        setInfo(
          "ログインリンクを送信しました。メールをご確認ください。",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "ログインに失敗しました",
      );
    } finally {
      setPending(null);
    }
  }

  async function handleOAuth(provider: Provider) {
    setError(null);
    setInfo(null);
    setPending(provider);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        setError(error.message);
        setPending(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "OAuth ログインに失敗しました",
      );
      setPending(null);
    }
  }

  return (
    <div className="glass-panel group relative w-full max-w-[420px] overflow-hidden rounded-xl p-8 md:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,191,0,0.05),transparent_70%)]"
      />
      <div className="relative z-10">
        <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface mb-8 text-center font-[family-name:var(--font-headline-lg)]">
          Enter the Vault
        </h2>

        <ModeToggle mode={mode} onChange={setMode} />

        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          <FieldEmail value={email} onChange={setEmail} />

          {mode === "password" && (
            <FieldPassword value={password} onChange={setPassword} />
          )}

          {error && (
            <p
              role="alert"
              className="text-error border-error/40 bg-error/5 rounded-md border px-3 py-2 text-sm"
            >
              {error}
            </p>
          )}
          {info && (
            <p
              role="status"
              className="text-amber-gold border-amber-gold/40 bg-amber-gold/5 rounded-md border px-3 py-2 text-sm"
            >
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={pending !== null}
            className="bg-amber-gold text-cask-brown hover:bg-primary-fixed-dim text-label-caps font-[family-name:var(--font-label-caps)] mt-4 w-full rounded-lg py-4 text-[14px] font-bold uppercase tracking-[0.15em] shadow-[0_0_20px_rgba(255,191,0,0.15)] transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {pending === "email"
              ? "..."
              : mode === "password"
                ? "Authenticate Access"
                : "Send Magic Link"}
          </button>
        </form>

        <div className="my-8 flex items-center">
          <div className="bg-glass-stroke h-[1px] flex-grow" />
          <span className="text-on-surface-variant px-4 text-[10px] uppercase font-[family-name:var(--font-label-caps)]">
            Secondary Portals
          </span>
          <div className="bg-glass-stroke h-[1px] flex-grow" />
        </div>

        <SocialLoginButtons onSelect={handleOAuth} pending={pending} />

        <p className="text-on-surface-variant mt-8 text-center text-xs">
          New scholar?{" "}
          <Link
            href={`/signup?next=${encodeURIComponent(next)}`}
            className="text-amber-gold hover:underline"
          >
            Open an archive account
          </Link>
        </p>
      </div>
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="border-glass-stroke mb-8 flex rounded-lg border p-1">
      {(
        [
          { id: "password", label: "Vault Key" },
          { id: "magic", label: "Magic Link" },
        ] as const
      ).map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={
            mode === tab.id
              ? "bg-amber-gold text-cask-brown text-label-caps font-[family-name:var(--font-label-caps)] flex-1 rounded-md py-2 font-semibold uppercase tracking-widest"
              : "text-on-surface-variant hover:text-on-surface text-label-caps font-[family-name:var(--font-label-caps)] flex-1 rounded-md py-2 uppercase tracking-widest transition-colors"
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function FieldEmail({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <label
        htmlFor="scholar-id"
        className="text-label-caps text-on-surface-variant mb-2 block uppercase tracking-widest font-[family-name:var(--font-label-caps)]"
      >
        Scholar ID
      </label>
      <div className="border-glass-stroke focus-within:border-amber-gold flex items-center border-b transition-all duration-300">
        <span
          className="material-symbols-outlined text-on-surface-variant mr-3 text-[20px]"
          aria-hidden="true"
        >
          account_circle
        </span>
        <input
          id="scholar-id"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="name@archive.edu"
          className="text-body-lg text-on-surface placeholder:text-outline-variant focus:vault-input w-full border-none bg-transparent p-2 outline-none focus:ring-0 font-[family-name:var(--font-label-caps)]"
        />
      </div>
    </div>
  );
}

function FieldPassword({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between">
        <label
          htmlFor="vault-key"
          className="text-label-caps text-on-surface-variant uppercase tracking-widest font-[family-name:var(--font-label-caps)]"
        >
          Vault Key
        </label>
        <Link
          href="/login?error=Use+Magic+Link+to+recover"
          className="text-amber-gold/60 hover:text-amber-gold text-[10px] uppercase transition-colors font-[family-name:var(--font-label-caps)]"
        >
          Lost key?
        </Link>
      </div>
      <div className="border-glass-stroke focus-within:border-amber-gold flex items-center border-b transition-all duration-300">
        <span
          className="material-symbols-outlined text-on-surface-variant mr-3 text-[20px]"
          aria-hidden="true"
        >
          lock
        </span>
        <input
          id="vault-key"
          type="password"
          required
          autoComplete="current-password"
          minLength={6}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
          className="text-body-lg text-on-surface placeholder:text-outline-variant w-full border-none bg-transparent p-2 outline-none focus:ring-0 font-[family-name:var(--font-label-caps)]"
        />
      </div>
    </div>
  );
}
