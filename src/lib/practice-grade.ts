import type { QuestionType } from "@/types/question";

/** ①〜⑳ → "1"〜"20"（過去問の選択肢番号で多用） */
const CIRCLED_NUMBER_MAP: Record<string, string> = {
  "①": "1",
  "②": "2",
  "③": "3",
  "④": "4",
  "⑤": "5",
  "⑥": "6",
  "⑦": "7",
  "⑧": "8",
  "⑨": "9",
  "⑩": "10",
  "⑪": "11",
  "⑫": "12",
  "⑬": "13",
  "⑭": "14",
  "⑮": "15",
  "⑯": "16",
  "⑰": "17",
  "⑱": "18",
  "⑲": "19",
  "⑳": "20",
};

/** 漢数字 〇/零/一〜十 → "0"〜"10"（解答記号として使われる単独漢数字を吸収） */
const KANJI_NUMBER_MAP: Record<string, string> = {
  "〇": "0",
  "零": "0",
  "一": "1",
  "二": "2",
  "三": "3",
  "四": "4",
  "五": "5",
  "六": "6",
  "七": "7",
  "八": "8",
  "九": "9",
  "十": "10",
};

/** イロハ順カタカナ → "1"〜"10"（「次の中から記号で答えよ」形式の吸収） */
const IROHA_MAP: Record<string, string> = {
  "イ": "1",
  "ロ": "2",
  "ハ": "3",
  "ニ": "4",
  "ホ": "5",
  "ヘ": "6",
  "ト": "7",
  "チ": "8",
  "リ": "9",
  "ヌ": "10",
};

/** 全角数字・余分な空白・記号番号（①/漢数字/イロハ）を半角数字に正規化（採点比較用） */
export function normalizeAnswerText(s: string): string {
  return s
    .trim()
    .replace(/\u3000/g, " ")
    .replace(/[０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
    )
    .replace(/[①-⑳]/g, (ch) => CIRCLED_NUMBER_MAP[ch] ?? ch)
    .replace(/[〇零一二三四五六七八九十]/g, (ch) => KANJI_NUMBER_MAP[ch] ?? ch)
    .replace(/[イロハニホヘトチリヌ]/g, (ch) => IROHA_MAP[ch] ?? ch)
    .replace(/\s+/g, " ");
}

/** UI 用の丸数字ラベル（TastingPractice の choiceLabel と同順） */
const CIRCLED_CHOICE_LABELS = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";

function choiceIndexLabel(i: number): string {
  return CIRCLED_CHOICE_LABELS[i] ?? `(${i + 1})`;
}

/** 演習 UI で ①②… ボタン選択を使う問題形式 */
export function usesSelectableChoiceButtons(type: QuestionType): boolean {
  return (
    type === "multiple_choice" ||
    type === "image_based" ||
    type === "table"
  );
}

/**
 * 演習サマリー用: 解答が番号（① / 1 / 漢数字 等）で特定できるとき、
 * 「丸数字 + 選択肢本文」を返す。選択肢がない／解決できないときは trim 済み原文。
 * true_false_count は個数回答のため choices へのインデックス解決を行わない。
 */
export function formatPracticeAnswerDisplay(
  answerRaw: string,
  choices: string[] | undefined,
  type?: QuestionType,
): string {
  const trimmed = answerRaw.trim();
  if (!choices?.length || trimmed === "") return trimmed;

  if (type === "true_false_count") {
    const normalized = normalizeAnswerText(trimmed).replace(/\s/g, "");
    return normalized.length > 0 ? normalized : trimmed;
  }

  const normalized = normalizeAnswerText(trimmed).replace(/\s/g, "");

  if (/^\d+$/.test(normalized)) {
    const idx = parseInt(normalized, 10) - 1;
    if (idx >= 0 && idx < choices.length) {
      return `${choiceIndexLabel(idx)} ${choices[idx]}`;
    }
  }

  for (let i = 0; i < choices.length; i++) {
    const choiceNorm = normalizeAnswerText(choices[i]).replace(/\s/g, "");
    if (choiceNorm === normalized) {
      return `${choiceIndexLabel(i)} ${choices[i]}`;
    }
  }

  return trimmed;
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
