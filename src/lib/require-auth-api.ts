import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Route Handler 用: ログインユーザーのみ通す。未ログインは 401 JSON。
 */
export async function requireAuthUser(): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "ログインが必要です" },
          { status: 401 },
        ),
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401 },
      ),
    };
  }
}
