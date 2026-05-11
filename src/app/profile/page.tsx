import { redirect } from "next/navigation";

/*
 * /profile は「アナリティクス」(/analytics) に統合された。
 * 既存リンク・ブックマークを壊さないようリダイレクトのみ残す。
 */
export default function ProfileRedirect(): never {
  redirect("/analytics");
}
