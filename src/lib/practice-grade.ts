/** 全角数字・余分な空白を正規化（採点比較用） */
export function normalizeAnswerText(s: string): string {
  return s
    .trim()
    .replace(/\u3000/g, " ")
    .replace(/[０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
    )
    .replace(/\s+/g, " ");
}

/** 演習の正誤判定（過去問の「番号を答えよ」形式と生成問題の短文に対応） */
export function gradePracticeAnswer(
  userRaw: string,
  expected: string | undefined,
): boolean {
  if (expected == null || expected === "") return false;
  const u = normalizeAnswerText(userRaw).replace(/\s/g, "");
  const e = normalizeAnswerText(expected).replace(/\s/g, "");
  if (u.length === 0) return false;
  if (u === e) return true;
  if (u.toLowerCase() === e.toLowerCase()) return true;
  // 数値のみのときは先頭ゼロや全角の差を吸収
  if (/^\d+$/.test(u) && /^\d+$/.test(e)) {
    return parseInt(u, 10) === parseInt(e, 10);
  }
  return false;
}
