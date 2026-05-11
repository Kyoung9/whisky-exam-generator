"use client";

import type { Provider } from "@supabase/supabase-js";

type Props = {
  onSelect: (provider: Provider) => void | Promise<void>;
  pending?: Provider | "email" | null;
};

/**
 * Google / Apple OAuth \u30dc\u30bf\u30f3
 * Supabase Dashboard \u3067 Provider \u3092 enable \u3057\u305f\u5f8c\u306b\u52d5\u4f5c\u3059\u308b\u3002
 */
export function SocialLoginButtons({ onSelect, pending }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <SocialButton
        provider="google"
        label="Google"
        pending={pending === "google"}
        onClick={() => onSelect("google")}
      >
        <GoogleGlyph />
      </SocialButton>
      <SocialButton
        provider="apple"
        label="Apple"
        pending={pending === "apple"}
        onClick={() => onSelect("apple")}
      >
        <AppleGlyph />
      </SocialButton>
    </div>
  );
}

function SocialButton({
  label,
  pending,
  onClick,
  children,
}: {
  provider: Provider;
  label: string;
  pending: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="border-glass-stroke group/social hover:bg-white/5 flex items-center justify-center rounded-lg border px-4 py-3 transition-all disabled:opacity-50"
    >
      <span className="mr-3 inline-flex h-5 w-5 items-center justify-center opacity-60 transition-opacity group-hover/social:opacity-100">
        {children}
      </span>
      <span className="text-label-caps text-on-surface-variant group-hover/social:text-on-surface font-[family-name:var(--font-label-caps)]">
        {pending ? "..." : label}
      </span>
    </button>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-current text-on-surface"
      aria-hidden="true"
    >
      <path d="M17.05 20.28c-.96.95-2.21 1.72-3.83 1.72-2.31 0-3.35-1.52-5.46-1.52-2.14 0-3.32 1.5-5.41 1.5-1.5 0-2.86-.81-3.85-1.78C-1.52 16.19-1.52 10.81.48 8.78c1-.97 2.17-1.47 3.47-1.47 1.63 0 2.41.97 3.86.97 1.45 0 2.05-1 3.85-1 1.12 0 2.29.39 3.19 1.18-.32.22-2.58 2-2.58 4.88 0 3.3 2.87 4.5 2.92 4.5-.04.14-.14.33-.24.52zM13.25 5c-.06-3.23 2.76-5 2.86-5-.04.04-3.13.11-4.47 1.63-1.22 1.39-1.28 3.59-1.28 3.59l.06.01c.24 0 1.61-.1 2.83-2.23z" />
    </svg>
  );
}
