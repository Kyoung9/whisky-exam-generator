"use client";

import {
  Document,
  Font,
  Image as PdfImage,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  type GeneratedQuestion,
} from "@/types/question";

// 日本語フォントの登録（Noto Sans CJK JP — 全グリフ入り OTF）
// @fontsource/noto-sans-jp は v5 以降 TTF を同梱せず、旧 URL は 404 になる。
// jsDelivr 経由の noto-cjk を使う。オフラインでは失敗する。
const NOTO_CJK_JP_BASE =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@Sans2.004/Sans/OTF/Japanese";

let FONT_REGISTERED = false;
function ensureFonts() {
  if (FONT_REGISTERED) return;
  Font.register({
    family: "NotoSansJP",
    fonts: [
      {
        src: `${NOTO_CJK_JP_BASE}/NotoSansCJKjp-Regular.otf`,
        fontWeight: 400,
      },
      {
        src: `${NOTO_CJK_JP_BASE}/NotoSansCJKjp-Bold.otf`,
        fontWeight: 700,
      },
    ],
  });
  Font.registerHyphenationCallback((word) => Array.from(word));
  FONT_REGISTERED = true;
}

// 印刷向けパレット（落ち着いた問題集トーン）
const C = {
  ink: "#0f172a",
  muted: "#64748b",
  rule: "#9a3412",
  accent: "#b45309",
  cardBg: "#f8fafc",
  cardBorder: "#cbd5e1",
  choiceBg: "#f1f5f9",
  answerBg: "#ecfdf5",
  answerBorder: "#059669",
  explainBg: "#f1f5f9",
  explainBorder: "#475569",
  disclaimerBg: "#fffbeb",
  disclaimerBorder: "#f59e0b",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    fontSize: 10.5,
    paddingTop: 40,
    paddingBottom: 52,
    paddingHorizontal: 44,
    color: C.ink,
    backgroundColor: "#ffffff",
  },
  // --- 表紙ブロック（問題編の先頭） ---
  coverBand: {
    backgroundColor: C.ink,
    marginHorizontal: -44,
    marginTop: -40,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 44,
    marginBottom: 20,
  },
  coverKicker: {
    color: "#fcd34d",
    fontSize: 9,
    letterSpacing: 1.2,
    marginBottom: 6,
    fontWeight: 700,
  },
  coverTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.35,
    marginBottom: 8,
  },
  coverRule: {
    width: 48,
    height: 3,
    backgroundColor: C.accent,
    marginBottom: 10,
  },
  coverMeta: {
    color: "#94a3b8",
    fontSize: 9.5,
    lineHeight: 1.5,
  },
  coverNote: {
    marginTop: 16,
    padding: 10,
    backgroundColor: C.disclaimerBg,
    borderLeftWidth: 3,
    borderLeftColor: C.disclaimerBorder,
    borderRadius: 2,
  },
  coverNoteText: {
    fontSize: 8.5,
    color: "#78350f",
    lineHeight: 1.55,
  },
  partLabel: {
    marginTop: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  partLabelText: {
    fontSize: 11,
    fontWeight: 700,
    color: C.ink,
    letterSpacing: 0.5,
    marginRight: 8,
  },
  partLabelLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.cardBorder,
  },
  // --- 問題カード ---
  questionCard: {
    marginBottom: 16,
    padding: 14,
    paddingLeft: 12,
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: C.accent,
  },
  qHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  qNumberBox: {
    minWidth: 36,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: C.ink,
    borderRadius: 3,
    marginRight: 10,
  },
  qNumberText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 700,
    textAlign: "center",
  },
  qMetaCol: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  metaPill: {
    fontSize: 7.5,
    color: C.muted,
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 5,
    marginBottom: 4,
  },
  metaPillStrong: {
    fontSize: 7.5,
    color: "#7c2d12",
    backgroundColor: "#ffedd5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    fontWeight: 700,
    marginRight: 5,
    marginBottom: 4,
  },
  body: {
    fontSize: 10.5,
    lineHeight: 1.65,
    marginBottom: 8,
    color: C.ink,
  },
  choicesWrap: {
    marginTop: 4,
  },
  choiceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: C.choiceBg,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 6,
  },
  choiceNum: {
    width: 22,
    fontSize: 10,
    fontWeight: 700,
    color: C.accent,
  },
  choiceText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.55,
    color: C.ink,
  },
  mapHint: {
    marginTop: 8,
    padding: 8,
    fontSize: 9,
    lineHeight: 1.5,
    color: C.muted,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 3,
  },
  imageWrap: {
    marginTop: 10,
    marginBottom: 4,
    alignItems: "center",
    padding: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 3,
  },
  image: {
    maxWidth: 400,
    maxHeight: 220,
    objectFit: "contain",
  },
  imageCaption: {
    fontSize: 8,
    color: C.muted,
    marginTop: 6,
    lineHeight: 1.45,
  },
  // --- 解答編 ---
  sectionHeader: {
    marginBottom: 6,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: C.rule,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: C.ink,
    letterSpacing: 1,
  },
  sectionSub: {
    fontSize: 9,
    color: C.muted,
    marginTop: 4,
  },
  answerCard: {
    marginBottom: 14,
    padding: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: C.answerBorder,
  },
  answerCardHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  answerQBadge: {
    backgroundColor: C.answerBg,
    borderWidth: 1,
    borderColor: C.answerBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    marginRight: 8,
  },
  answerQBadgeText: {
    fontSize: 9,
    fontWeight: 700,
    color: "#065f46",
  },
  answerTheme: {
    fontSize: 8,
    color: C.muted,
    flex: 1,
  },
  answerLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: "#047857",
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  answerBody: {
    fontSize: 10.5,
    lineHeight: 1.55,
    color: C.ink,
    fontWeight: 700,
  },
  explainLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: C.explainBorder,
    marginTop: 8,
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  explainBox: {
    backgroundColor: C.explainBg,
    padding: 10,
    borderRadius: 3,
    borderLeftWidth: 2,
    borderLeftColor: C.explainBorder,
  },
  explainBody: {
    fontSize: 9.5,
    lineHeight: 1.6,
    color: C.ink,
  },
  pageFooterText: {
    position: "absolute",
    bottom: 22,
    left: 44,
    right: 44,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.5,
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: C.cardBorder,
    paddingTop: 8,
  },
});

export type QuestionPdfOptions = {
  title: string;
  includeAnswer: boolean;
  includeExplanation: boolean;
};

type Props = {
  questions: GeneratedQuestion[];
  options: QuestionPdfOptions;
};

const DISCLAIMER =
  "本問題集の問題・解答・解説は AI により自動生成されたものです。学習補助としてご利用のうえ、内容は必ずご自身でご確認ください。";

function absolutizeImageSrc(src: string): string {
  if (/^https?:\/\//.test(src)) return src;
  if (typeof window !== "undefined") {
    return new URL(src, window.location.origin).toString();
  }
  return src;
}

export function QuestionPdf({ questions, options }: Props) {
  ensureFonts();

  const hasAnswers =
    options.includeAnswer &&
    questions.some((q) => q.answer && String(q.answer).trim() !== "");
  const hasExplanations =
    options.includeExplanation &&
    questions.some((q) => q.explanation && String(q.explanation).trim() !== "");
  const hasKeySection = hasAnswers || hasExplanations;

  return (
    <Document title={options.title}>
      <Page size="A4" style={styles.page} wrap>
        {/* 表紙帯 */}
        <View style={styles.coverBand}>
          <Text style={styles.coverKicker}>PRACTICE · 予想問題</Text>
          <Text style={styles.coverTitle}>{options.title}</Text>
          <View style={styles.coverRule} />
          <Text style={styles.coverMeta}>
            収録 {questions.length} 問
            {hasKeySection
              ? "\n構成：問題編（本文）→ 巻末に解答"
              : "\n構成：問題のみ（解答なし）"}
            {options.includeExplanation && hasKeySection
              ? "・解説"
              : ""}
          </Text>
        </View>

        <View style={styles.coverNote}>
          <Text style={styles.coverNoteText}>{DISCLAIMER}</Text>
        </View>

        <View style={styles.partLabel}>
          <Text style={styles.partLabelText}>問題</Text>
          <View style={styles.partLabelLine} />
        </View>

        {questions.map((q, i) => (
          <View key={q.id} style={styles.questionCard} wrap>
            <View style={styles.qHeaderRow}>
              <View style={styles.qNumberBox}>
                <Text style={styles.qNumberText}>Q{i + 1}</Text>
              </View>
              <View style={styles.qMetaCol}>
                <Text style={styles.metaPillStrong}>{q.category}</Text>
                <Text style={styles.metaPill}>{QUESTION_TYPE_LABELS[q.type]}</Text>
                <Text style={styles.metaPill}>{DIFFICULTY_LABELS[q.difficulty]}</Text>
                <Text style={styles.metaPill}>テーマ: {q.theme}</Text>
              </View>
            </View>

            <Text style={styles.body}>{q.body}</Text>

            {q.imageRef && (
              <View style={styles.imageWrap}>
                <PdfImage
                  src={absolutizeImageSrc(q.imageRef)}
                  style={styles.image}
                />
                {q.imageDescription && (
                  <Text style={styles.imageCaption}>{q.imageDescription}</Text>
                )}
              </View>
            )}

            {q.choices && q.choices.length > 0 && (
              <View style={styles.choicesWrap}>
                {q.choices.map((c, idx) => (
                  <View key={idx} style={styles.choiceRow} wrap={false}>
                    <Text style={styles.choiceNum}>{idx + 1}.</Text>
                    <Text style={styles.choiceText}>{c}</Text>
                  </View>
                ))}
              </View>
            )}

            {q.type === "map" && (!q.choices || q.choices.length === 0) && (
              <Text style={styles.mapHint}>
                選択肢は地図上の番号（①②…など）です。図を参照して該当する番号を答えてください。
              </Text>
            )}
          </View>
        ))}

        {hasKeySection && (
          <View break>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>解答・解説</Text>
              <Text style={styles.sectionSub}>
                以下は問題編の正解と解説です。自己採点の参考にしてください。
              </Text>
            </View>

            {questions
              .map((q, i) => {
                const showA =
                  options.includeAnswer &&
                  q.answer &&
                  String(q.answer).trim() !== "";
                const showE =
                  options.includeExplanation &&
                  q.explanation &&
                  String(q.explanation).trim() !== "";
                return { q, i, showA, showE };
              })
              .filter((x) => x.showA || x.showE)
              .map(({ q, i, showA, showE }) => (
                <View key={`key-${q.id}`} style={styles.answerCard} wrap>
                  <View style={styles.answerCardHead}>
                    <View style={styles.answerQBadge}>
                      <Text style={styles.answerQBadgeText}>第 {i + 1} 問</Text>
                    </View>
                    <Text style={styles.answerTheme}>{q.theme}</Text>
                  </View>
                  {showA && (
                    <View>
                      <Text style={styles.answerLabel}>正解</Text>
                      <Text style={styles.answerBody}>{q.answer}</Text>
                    </View>
                  )}
                  {showE && (
                    <View>
                      <Text style={styles.explainLabel}>解説</Text>
                      <View style={styles.explainBox}>
                        <Text style={styles.explainBody}>{q.explanation}</Text>
                      </View>
                    </View>
                  )}
                </View>
              ))}
          </View>
        )}

        <Text
          style={styles.pageFooterText}
          fixed
          render={({ pageNumber, totalPages }) =>
            `— ${pageNumber} / ${totalPages} —`
          }
        />
      </Page>
    </Document>
  );
}
