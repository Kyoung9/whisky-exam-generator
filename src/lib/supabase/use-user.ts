"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "./browser";

/**
 * 現在のログインユーザーを購読する hook
 * - 初回 getUser() で同期
 * - onAuthStateChange でリアルタイム更新
 *
 * Supabase env が未設定なら user=null, loading=false で安全に返す
 */
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      // env 未設定時は loading=false を次のマイクロタスクで反映 (effect 内の同期 setState を避ける)
      queueMicrotask(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }

    const supabase = createBrowserSupabaseClient();

    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const unsubscribe = () => data.subscription.unsubscribe();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { user, loading };
}

/** display_name → initials (1〜2 文字) */
export function userInitials(user: User | null): string {
  if (!user) return "?";
  const meta = user.user_metadata as
    | { full_name?: string; name?: string; display_name?: string }
    | null
    | undefined;
  const source =
    meta?.full_name?.trim() ||
    meta?.name?.trim() ||
    meta?.display_name?.trim() ||
    user.email?.split("@")[0] ||
    "";
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
