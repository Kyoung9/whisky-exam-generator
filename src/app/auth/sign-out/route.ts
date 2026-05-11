import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /auth/sign-out
 * セッション Cookie を破棄して / にリダイレクト。
 */
export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // env 未設定や既にサインアウト済みでも黙って遷移させる
  }
  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
