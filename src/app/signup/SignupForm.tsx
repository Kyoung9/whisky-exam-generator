"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Provider } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<Provider | "email" | null>(null);
  const [error, setError] = useState<string | null>(
    searchParams.get("error"),
  );
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending("email");
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          data: { full_name: name || undefined },
        },
      });
      if (error) {
        setError(error.message);
        return;
      }

      if (data.session) {
        router.replace(next);
        router.refresh();
      } else {
        setInfo(
          "確認メールを送信しました。メール内のリンクから登録を完了してください。",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "登録に失敗しました",
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
        err instanceof Error ? err.message : "OAuth に失敗しました",
      );
      setPending(null);
    }
  }

  return (
    <div className="glass-panel relative w-full max-w-[420px] overflow-hidden rounded-xl p-8 md:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,191,0,0.05),transparent_70%)]"
      />
      <div className="relative z-10">
        <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface mb-8 text-center font-[family-name:var(--font-headline-lg)]">
          Open the Archive
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          <FieldText
            id="scholar-name"
            label="Scholar Name"
            icon="badge"
            value={name}
            onChange={setName}
            placeholder="Your display name (optional)"
            autoComplete="name"
          />

          <FieldText
            id="scholar-id"
            label="Scholar ID"
            icon="account_circle"
            type="email"
            required
            value={email}
            onChange={setEmail}
            placeholder="name@archive.edu"
            autoComplete="email"
          />

          <FieldText
            id="vault-key"
            label="Vault Key"
            icon="lock"
            type="password"
            required
            value={password}
            onChange={setPassword}
            placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
            autoComplete="new-password"
            minLength={6}
            note="6 characters or more"
          />

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
            {pending === "email" ? "..." : "Create Vault"}
          </button>
        </form>

        <div className="my-8 flex items-center">
          <div className="bg-glass-stroke h-[1px] flex-grow" />
          <span className="text-on-surface-variant px-4 text-[10px] uppercase font-[family-name:var(--font-label-caps)]">
            Or sign up with
          </span>
          <div className="bg-glass-stroke h-[1px] flex-grow" />
        </div>

        <SocialLoginButtons onSelect={handleOAuth} pending={pending} />

        <p className="text-on-surface-variant mt-8 text-center text-xs">
          Already a scholar?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="text-amber-gold hover:underline"
          >
            Enter the Vault
          </Link>
        </p>
      </div>
    </div>
  );
}

function FieldText({
  id,
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  autoComplete,
  minLength,
  note,
}: {
  id: string;
  label: string;
  icon: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  note?: string;
}) {
  return (
    <div className="relative">
      <label
        htmlFor={id}
        className="text-label-caps text-on-surface-variant mb-2 block uppercase tracking-widest font-[family-name:var(--font-label-caps)]"
      >
        {label}
      </label>
      <div className="border-glass-stroke focus-within:border-amber-gold flex items-center border-b transition-all duration-300">
        <span
          className="material-symbols-outlined text-on-surface-variant mr-3 text-[20px]"
          aria-hidden="true"
        >
          {icon}
        </span>
        <input
          id={id}
          type={type}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="text-body-lg text-on-surface placeholder:text-outline-variant w-full border-none bg-transparent p-2 outline-none focus:ring-0 font-[family-name:var(--font-label-caps)]"
        />
      </div>
      {note && (
        <p className="text-on-surface-variant/60 mt-1 text-[10px] uppercase tracking-widest font-[family-name:var(--font-label-caps)]">
          {note}
        </p>
      )}
    </div>
  );
}
