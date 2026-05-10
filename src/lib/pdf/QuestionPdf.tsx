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

// 日本語フォントの登録（Noto Sans JP）
// jsDelivr 経由で Google Fonts の TTF を取得する。ネットワーク不可環境では失敗する。
let FONT_REGISTERED = false;
function ensureFonts() {
  if (FONT_REGISTERED) return;
  Font.register({
    family: "NotoSansJP",
    fonts: [
      {
        src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.18/files/noto-sans-jp-japanese-400-normal.ttf",
        fontWeight: 400,
      },
      {
        src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.18/files/noto-sans-jp-japanese-700-normal.ttf",
        fontWeight: 700,
      },
    ],
  });
  // CJK の自動改行を許可する
  Font.registerHyphenationCallback((word) => Array.from(word));
  FONT_REGISTERED = true;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    fontSize: 11,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    color: "#1c1917",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 10,
    color: "#57534e",
    marginBottom: 24,
  },
  questionBlock: {
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e7e5e4",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
    fontSize: 9,
    color: "#57534e",
  },
  metaTag: {
    backgroundColor: "#f5f5f4",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  questionNumber: {
    fontWeight: 700,
    marginBottom: 4,
    fontSize: 12,
  },
  body: {
    marginBottom: 6,
    lineHeight: 1.6,
  },
  choice: {
    marginLeft: 12,
    marginBottom: 2,
  },
  answerLabel: {
    marginTop: 6,
    fontWeight: 700,
    color: "#065f46",
  },
  explanationLabel: {
    marginTop: 6,
    fontWeight: 700,
    color: "#374151",
  },
  block: {
    marginTop: 2,
    lineHeight: 1.6,
  },
  pageNumber: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 9,
    color: "#a8a29e",
  },
  disclaimer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: "#fef3c7",
    fontSize: 9,
    color: "#78350f",
    borderRadius: 4,
  },
  imageWrap: {
    marginTop: 6,
    marginBottom: 6,
    alignItems: "center",
  },
  image: {
    maxWidth: 420,
    maxHeight: 240,
    objectFit: "contain",
  },
  imageCaption: {
    fontSize: 9,
    color: "#78716c",
    marginTop: 2,
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

const DISCLAIMER = "本問題集の問題・解答・解説は AI により自動生成されたものです。最終的な内容は必ずご確認ください。";

// /exam-images/... のような相対 src を絶対 URL に変換する。
// react-pdf はワーカー内で fetch するため、ブラウザ実行時は絶対 URL のほうが安定する。
function absolutizeImageSrc(src: string): string {
  if (/^https?:\/\//.test(src)) return src;
  if (typeof window !== "undefined") {
    return new URL(src, window.location.origin).toString();
  }
  return src;
}

export function QuestionPdf({ questions, options }: Props) {
  ensureFonts();

  return (
    <Document title={options.title}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{options.title}</Text>
        <Text style={styles.subtitle}>
          全 {questions.length} 問
          {options.includeAnswer ? " / 解答付き" : ""}
          {options.includeExplanation ? " / 解説付き" : ""}
        </Text>
        <View style={styles.disclaimer}>
          <Text>{DISCLAIMER}</Text>
        </View>

        {questions.map((q, i) => (
          <View
            key={q.id}
            style={styles.questionBlock}
            wrap={false}
          >
            <View style={styles.metaRow}>
              <Text style={styles.metaTag}>{q.category}</Text>
              <Text style={styles.metaTag}>{QUESTION_TYPE_LABELS[q.type]}</Text>
              <Text style={styles.metaTag}>{DIFFICULTY_LABELS[q.difficulty]}</Text>
              <Text style={styles.metaTag}>テーマ: {q.theme}</Text>
            </View>

            <Text style={styles.questionNumber}>第{i + 1}問</Text>
            <Text style={styles.body}>{q.body}</Text>

            {q.imageRef && (
              <View style={styles.imageWrap}>
                <PdfImage src={absolutizeImageSrc(q.imageRef)} style={styles.image} />
                {q.imageDescription && (
                  <Text style={styles.imageCaption}>{q.imageDescription}</Text>
                )}
              </View>
            )}

            {q.choices && q.choices.length > 0 && (
              <View>
                {q.choices.map((c, idx) => (
                  <Text key={idx} style={styles.choice}>
                    {idx + 1}. {c}
                  </Text>
                ))}
              </View>
            )}

            {options.includeAnswer && q.answer && (
              <View>
                <Text style={styles.answerLabel}>正解</Text>
                <Text style={styles.block}>{q.answer}</Text>
              </View>
            )}

            {options.includeExplanation && q.explanation && (
              <View>
                <Text style={styles.explanationLabel}>解説</Text>
                <Text style={styles.block}>{q.explanation}</Text>
              </View>
            )}
          </View>
        ))}

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
