"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { useUser, userInitials } from "@/lib/supabase/use-user";

/**
 * AppHeader \u53f3\u4e0a\u306e\u30a2\u30d0\u30bf\u30fc + \u30c9\u30ed\u30c3\u30d7\u30c0\u30a6\u30f3
 * - \u672a\u30ed\u30b0\u30a4\u30f3: /login \u3078\u306e\u30ea\u30f3\u30af\u30dc\u30bf\u30f3
 * - \u30ed\u30b0\u30a4\u30f3\u6e08: \u30a4\u30cb\u30b7\u30e3\u30eb \u00b7 \u30c9\u30ed\u30c3\u30d7\u3067\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb / \u30b5\u30a4\u30f3\u30a2\u30a6\u30c8
 */
export function UserAvatarMenu() {
  const { user, loading } = useUser();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (loading) {
    return (
      <div
        aria-hidden="true"
        className="bg-cask-brown/40 h-10 w-10 animate-pulse rounded-full"
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-amber-gold border-amber-gold/50 hover:bg-amber-gold/10 text-label-caps font-[family-name:var(--font-label-caps)] inline-flex h-10 items-center justify-center rounded-full border px-4 transition-colors"
      >
        Sign in
      </Link>
    );
  }

  const initials = userInitials(user);
  const next = encodeURIComponent(pathname || "/");

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`\u30a2\u30ab\u30a6\u30f3\u30c8\u30e1\u30cb\u30e5\u30fc (${user.email ?? "scholar"})`}
        className="bg-cask-brown border-amber-gold focus-visible:ring-amber-gold/60 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring"
      >
        <span className="text-amber-gold text-sm font-bold font-[family-name:var(--font-headline-lg)]">
          {initials}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="glass-panel border-glass-stroke absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-lg border"
        >
          <div className="border-glass-stroke border-b px-4 py-3">
            <p className="text-on-surface truncate text-sm">
              {user.email ?? "Scholar"}
            </p>
            <p className="text-on-surface-variant text-[10px] uppercase tracking-widest font-[family-name:var(--font-label-caps)]">
              Signed in
            </p>
          </div>
          <MenuLink href="/sets" icon="bookmarks" onClick={close}>
            マイ EXAMS
          </MenuLink>
          <MenuLink href="/analytics" icon="query_stats" onClick={close}>
            アナリティクス
          </MenuLink>

          <form
            action={`/auth/sign-out?next=${next}`}
            method="post"
            className="border-glass-stroke border-t"
          >
            <button
              type="submit"
              role="menuitem"
              className="text-on-surface hover:bg-error/10 hover:text-error flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors"
            >
              <span
                className="material-symbols-outlined text-[20px]"
                aria-hidden="true"
              >
                logout
              </span>
              <span>Sign out</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  onClick,
  children,
}: {
  href: ComponentProps<typeof Link>["href"];
  icon: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="text-on-surface hover:bg-amber-gold/10 hover:text-amber-gold flex items-center gap-3 px-4 py-3 text-sm transition-colors"
    >
      <span
        className="material-symbols-outlined text-[20px]"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span>{children}</span>
    </Link>
  );
}
