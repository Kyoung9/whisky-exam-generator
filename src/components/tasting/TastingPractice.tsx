"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { CollapsibleFilterCard } from "@/components/CollapsibleFilterCard";
import { loadExamSets } from "@/lib/exam-set-storage";
import {
  formatPracticeAnswerDisplay,
  gradePracticeAnswer,
  usesSelectableChoiceButtons,
} from "@/lib/practice-grade";
import {
  buildPracticeDeck,
  buildPracticeDeckFromSavedQuestions,
  buildPracticeDeckFromWrongNotes,
} from "@/lib/practice-pool";
import { fetchSavedSetById } from "@/lib/supabase/saved-sets-client";
import {
  fetchUnresolvedWrongNotes,
  markWrongNoteResolved,
} from "@/lib/supabase/wrong-notes-client";
import { useUser } from "@/lib/supabase/use-user";
import { useQuestions } from "@/lib/store";
import type { ExamSet } from "@/types/exam-set";
import type { PracticeItem, PracticeSourceMode } from "@/types/practice";
import {
  CATEGORIES,
  EXAM_YEARS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  type Category,
  type ExamYear,
  type QuestionType,
} from "@/types/question";
import { AppHeader } from "@/components/whisky-quest/AppHeader";
import { BottomNav } from "@/components/whisky-quest/BottomNav";
import { persistPracticeSessionToSupabase } from "@/lib/supabase/practice-session-sync";

type Phase = "setup" | "quiz" | "summary";

type AnswerEntry = { submitted: string; correct: boolean };

/*
 * WhiskyQuest テイスティング（実データ演習）
 * - 過去問 / 生成済み / ミックスからデッキを構築
 * - Stitch 試験 UI 参照: ヘッダー章ラベル・熟成プログレス・ベントグリッド選択肢・
 *   フローティング「マスター・ディスティラー」カード・背景ムード
 */

function toggleYear(arr: ExamYear[], y: ExamYear): ExamYear[] {
  return arr.includes(y) ? arr.filter((x) => x !== y) : [...arr, y].sort((a, b) => a - b);
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function filterSummary(selected: number, total: number): string {
  if (selected === 0) return "未選択";
  if (selected === total) return "全選択";
  return `${selected} / ${total}`;
}

function chipClass(active: boolean): string {
  return [
    "text-label-caps cursor-pointer rounded-full border px-4 py-2 font-[family-name:var(--font-label-caps)] transition-all",
    active
      ? "border-amber-gold bg-amber-gold text-cask-brown"
      : "border-glass-stroke text-on-surface-variant hover:border-amber-gold hover:text-amber-gold",
  ].join(" ");
}

function parseYearsParam(raw: string | null): ExamYear[] | null {
  if (!raw?.trim()) return null;
  const parsed = raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((y): y is ExamYear =>
      EXAM_YEARS.includes(y as ExamYear),
    );
  return parsed.length > 0 ? parsed : null;
}

function beginQuizSession(
  deckBuilt: PracticeItem[],
  reset: {
    setDeck: (d: PracticeItem[]) => void;
    setSummaryAnswerLog: (l: (AnswerEntry | undefined)[]) => void;
    answerLogRef: MutableRefObject<(AnswerEntry | undefined)[]>;
    setFlagged: (s: Set<number>) => void;
    setIndex: (i: number) => void;
    setTextAnswer: (s: string) => void;
    setAnswered: (b: boolean) => void;
    setSubmittedAnswer: (s: string) => void;
    setResults: (r: boolean[]) => void;
    setElapsed: (n: number) => void;
    setPhase: (p: Phase) => void;
    sessionIdRef: MutableRefObject<string | null>;
  },
) {
  reset.sessionIdRef.current =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `sess_${Date.now()}`;
  reset.setSummaryAnswerLog([]);
  reset.setDeck(deckBuilt);
  reset.answerLogRef.current = Array.from(
    { length: deckBuilt.length },
    () => undefined,
  );
  reset.setFlagged(new Set());
  reset.setIndex(0);
  reset.setTextAnswer("");
  reset.setAnswered(false);
  reset.setSubmittedAnswer("");
  reset.setResults([]);
  reset.setElapsed(0);
  reset.setPhase("quiz");
}

function formatElapsed(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * 選択肢ラベル。過去問の正答が「①②③」記法で書かれているので、
 * UI 表示も原則として丸数字に揃える（①〜⑳）。それを超えたら「(21)」のように退避。
 * 採点は practice-grade の正規化により ① ↔ 1 を同一視する。
 */
const CIRCLED_NUMBERS = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";
function choiceLabel(i: number): string {
  return CIRCLED_NUMBERS[i] ?? `(${i + 1})`;
}

function PracticeQuestionFigure({
  imageRef,
  imageDescription,
  className = "",
}: {
  imageRef: string;
  imageDescription?: string;
  className?: string;
}) {
  return (
    <figure
      className={`glass-card overflow-hidden rounded-xl border ${className}`.trim()}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageRef}
        alt={imageDescription ?? "問題画像"}
        className="max-h-72 w-full object-contain"
      />
    </figure>
  );
}

export function TastingPractice() {
  const searchParams = useSearchParams();
  const practiceSetId = searchParams.get("practiceSet");
  const retryWrong = searchParams.get("retry") === "wrong";
  const yearsParam = searchParams.get("years");
  const { user, loading: userLoading } = useUser();
  const { questions: generatedList, hydrated } = useQuestions();

  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<PracticeSourceMode>(
    retryWrong ? "wrong_notes" : "mix",
  );
  const [years, setYears] = useState<ExamYear[]>(() => {
    const parsed = parseYearsParam(yearsParam);
    return parsed ?? [...EXAM_YEARS];
  });
  const [categories, setCategories] = useState<Category[]>([...CATEGORIES]);
  const [types, setTypes] = useState<QuestionType[]>([...QUESTION_TYPES]);
  const [count, setCount] = useState(10);
  const [shuffle, setShuffle] = useState(true);
  const [wrongNotesDeck, setWrongNotesDeck] = useState<PracticeItem[]>([]);
  const [wrongNotesLoading, setWrongNotesLoading] = useState(false);
  const [deck, setDeck] = useState<PracticeItem[]>([]);
  /** 前後の問題へ移るとき setState の反映遅れを避けるため ref と同期 */
  const answerLogRef = useRef<(AnswerEntry | undefined)[]>([]);
  const [flagged, setFlagged] = useState<Set<number>>(() => new Set());
  const [index, setIndex] = useState(0);
  const [textAnswer, setTextAnswer] = useState("");
  /** 正解の公開はサマリー画面まで遅延。クイズ中は「回答済みかどうか」のみ追跡 */
  const [answered, setAnswered] = useState(false);
  const [submittedAnswer, setSubmittedAnswer] = useState("");
  const [results, setResults] = useState<boolean[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [setupError, setSetupError] = useState<string | null>(null);
  /** Supabase practice_attempts.metadata.session_id 用 */
  const sessionIdRef = useRef<string | null>(null);
  /** saved_set セッションの saved_question_sets.id（URL の practiceSet） */
  const savedPracticeSetIdRef = useRef<string | null>(null);
  const [savedSetBuffer, setSavedSetBuffer] = useState<ExamSet["questions"]>(
    [],
  );
  const [savedSetTitle, setSavedSetTitle] = useState("");
  const [savedSetLoadError, setSavedSetLoadError] = useState<string | null>(
    null,
  );
  /** サマリー表示用（レンダー中に ref を読まないためのスナップショット） */
  const [summaryAnswerLog, setSummaryAnswerLog] = useState<
    (AnswerEntry | undefined)[]
  >([]);

  const current = deck[index] ?? null;
  const choiceList =
    current?.choices && current.choices.length > 0 ? current.choices : null;
  const useChoiceButtons = Boolean(
    choiceList && current && usesSelectableChoiceButtons(current.type),
  );
  const showStatementList = Boolean(
    choiceList && current?.type === "true_false_count",
  );
  const needsFreeformInput = !useChoiceButtons;
  const progressPct =
    deck.length > 0 ? Math.round(((index + 1) / deck.length) * 100) : 0;

  const headerOffset = "calc(5rem + env(safe-area-inset-top,0px))";

  useEffect(() => {
    if (phase !== "quiz") return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    const parsed = parseYearsParam(yearsParam);
    if (parsed) setYears(parsed);
  }, [yearsParam]);

  useEffect(() => {
    if (retryWrong) setMode("wrong_notes");
  }, [retryWrong]);

  useEffect(() => {
    if (!retryWrong || userLoading) return;
    if (!user) {
      setWrongNotesDeck([]);
      setWrongNotesLoading(false);
      return;
    }
    let cancelled = false;
    setWrongNotesLoading(true);
    void (async () => {
      const notes = await fetchUnresolvedWrongNotes();
      if (cancelled) return;
      setWrongNotesDeck(buildPracticeDeckFromWrongNotes(notes, { shuffle: true }));
      setWrongNotesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [retryWrong, user, userLoading]);

  const sessionReset = useMemo(
    () => ({
      setDeck,
      setSummaryAnswerLog,
      answerLogRef,
      setFlagged,
      setIndex,
      setTextAnswer,
      setAnswered,
      setSubmittedAnswer,
      setResults,
      setElapsed,
      setPhase,
      sessionIdRef,
    }),
    [],
  );

  useEffect(() => {
    if (!practiceSetId) {
      queueMicrotask(() => {
        setSavedSetBuffer([]);
        setSavedSetTitle("");
        setSavedSetLoadError(null);
        savedPracticeSetIdRef.current = null;
      });
      return;
    }
    if (userLoading) return;

    let cancelled = false;
    void (async () => {
      let found: ExamSet | null = null;
      if (user) {
        found = await fetchSavedSetById(practiceSetId);
      }
      if (!found) {
        found = loadExamSets().find((s) => s.id === practiceSetId) ?? null;
      }
      if (cancelled) return;
      if (!found || found.questions.length === 0) {
        setSavedSetLoadError("指定された保存セットを読み込めませんでした。");
        setSavedSetBuffer([]);
        setSavedSetTitle("");
        savedPracticeSetIdRef.current = null;
        return;
      }
      setSavedSetLoadError(null);
      setSavedSetBuffer(found.questions);
      setSavedSetTitle(found.name);
      savedPracticeSetIdRef.current = practiceSetId;
      setMode("saved_set");
    })();

    return () => {
      cancelled = true;
    };
  }, [practiceSetId, user, userLoading]);

  const startSession = useCallback(() => {
    setSetupError(null);
    if (mode === "wrong_notes") {
      if (!user) {
        setSetupError("誤答ノートの復習にはログインが必要です。");
        return;
      }
      if (wrongNotesDeck.length === 0) {
        setSetupError("未解決の誤答がありません。");
        return;
      }
      beginQuizSession(wrongNotesDeck, sessionReset);
      return;
    }
    if (mode === "saved_set") {
      if (savedSetBuffer.length === 0) {
        setSetupError(
          "保存セットに問題がありません。URL の practiceSet を確認するか、/sets から開き直してください。",
        );
        return;
      }
      const deckBuilt = buildPracticeDeckFromSavedQuestions({
        questions: savedSetBuffer,
        count: Math.min(50, Math.max(1, count)),
        shuffle,
      });
      if (deckBuilt.length === 0) {
        setSetupError("出題できる問題がありません。");
        return;
      }
      beginQuizSession(deckBuilt, sessionReset);
      return;
    }
    if (categories.length === 0 || types.length === 0) {
      setSetupError("詳細オプションでカテゴリと問題タイプを 1 つ以上選んでください。");
      return;
    }
    if (mode === "generated" && generatedList.length === 0) {
      setSetupError("生成した問題がありません。/generate で先に生成してください。");
      return;
    }
    if (mode === "past" && years.length === 0) {
      setSetupError("過去問を使う場合は年度を 1 つ以上選んでください。");
      return;
    }
    const deckBuilt = buildPracticeDeck({
      mode,
      years: mode === "generated" ? [] : years,
      generatedQuestions: mode === "past" ? [] : generatedList,
      count: Math.min(50, Math.max(1, count)),
      shuffle,
      categories,
      types,
    });
    if (deckBuilt.length === 0) {
      setSetupError(
        "出題できる問題がありません。年度・ソース・詳細オプションを変えるか、生成問題を追加してください。",
      );
      return;
    }
    beginQuizSession(deckBuilt, sessionReset);
  }, [
    mode,
    years,
    categories,
    types,
    count,
    shuffle,
    generatedList,
    savedSetBuffer,
    wrongNotesDeck,
    user,
    sessionReset,
  ]);

  /**
   * 回答の確定。正誤は内部的に記録するだけで、ここでは UI に正解/解説を出さない。
   * 公開はサマリー画面（phase === "summary"）に集約する。
   */
  const submitAnswer = useCallback(
    (userRaw: string) => {
      if (!current) return;
      const ok = gradePracticeAnswer(userRaw, current.answer);
      const trimmed = userRaw.trim();
      setSubmittedAnswer(trimmed);
      setAnswered(true);
      setResults((prev) => {
        const next = [...prev];
        next[index] = ok;
        return next;
      });
      answerLogRef.current[index] = { submitted: trimmed, correct: ok };
      if (ok && current.wrongNoteId) {
        void markWrongNoteResolved(current.wrongNoteId);
      }
    },
    [current, index],
  );

  const applyIndex = useCallback((nextIndex: number) => {
    const log = answerLogRef.current[nextIndex];
    setIndex(nextIndex);
    if (log) {
      setAnswered(true);
      setSubmittedAnswer(log.submitted);
      setTextAnswer(log.submitted);
    } else {
      setAnswered(false);
      setSubmittedAnswer("");
      setTextAnswer("");
    }
  }, []);

  const goNext = useCallback(() => {
    if (!answered) return;
    if (index >= deck.length - 1) {
      const finalLog = [...answerLogRef.current];
      setSummaryAnswerLog(finalLog);
      void persistPracticeSessionToSupabase({
        deck,
        answerLog: finalLog,
        sessionId: sessionIdRef.current ?? `sess_${Date.now()}`,
        mode,
        years,
        elapsedSec: elapsed,
        sourceSetId:
          mode === "saved_set" ? savedPracticeSetIdRef.current : null,
      });
      setPhase("summary");
      return;
    }
    applyIndex(index + 1);
  }, [answered, index, deck, applyIndex, mode, years, elapsed]);

  const goPrev = useCallback(() => {
    if (index <= 0) return;
    applyIndex(index - 1);
  }, [index, applyIndex]);

  const toggleFlagCurrent = useCallback(() => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, [index]);

  const correctCount = useMemo(
    () => results.filter((x) => x === true).length,
    [results],
  );

  const wrongCountInSummary = useMemo(
    () => summaryAnswerLog.filter((l) => l && !l.correct).length,
    [summaryAnswerLog],
  );

  const retryWrongInSession = useCallback(() => {
    const wrongItems = deck.filter((_, i) => {
      const log = summaryAnswerLog[i];
      return log != null && !log.correct;
    });
    if (wrongItems.length === 0) return;
    beginQuizSession(wrongItems, sessionReset);
  }, [deck, summaryAnswerLog, sessionReset]);

  const allYearsChecked = years.length === EXAM_YEARS.length;
  const allCategoriesChecked = categories.length === CATEGORIES.length;
  const allTypesChecked = types.length === QUESTION_TYPES.length;
  const showAdvancedFilters =
    mode !== "saved_set" && mode !== "wrong_notes";
  const filtersValid = categories.length > 0 && types.length > 0;
  const canStart =
    mode === "saved_set"
      ? savedSetBuffer.length > 0
      : mode === "wrong_notes"
        ? Boolean(user) && !wrongNotesLoading && wrongNotesDeck.length > 0
        : hydrated &&
          filtersValid &&
          (mode !== "past" || years.length > 0);

  return (
    <div className="bg-background-deep text-on-surface relative flex min-h-dvh flex-col">
      {/* 背景ムード（Stitch 試験キャンバス）— ローカル資産のみ */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-20"
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/waldrebell.jpg"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>

      {/* setup / summary では他ページと同じ AppHeader を使い、UI を統一する。
       * quiz 中だけ「集中モード」用の独自ヘッダー（章ラベル + タイマー + 閉じる）に切り替える。 */}
      {phase !== "quiz" ? (
        <AppHeader active="taste" />
      ) : (
        <header className="bg-glass-fill border-glass-stroke fixed top-0 left-0 z-50 w-full border-b pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
          <div className="mx-auto flex h-20 w-full max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6 md:px-16">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
              <Link
                href="/"
                className="text-headline-lg text-amber-gold shrink-0 tracking-tight font-[family-name:var(--font-headline-lg)]"
              >
                WhiskyQuest
              </Link>
              <div className="bg-glass-stroke hidden h-6 w-px shrink-0 sm:block" />
              <span className="text-label-caps text-on-surface-variant hidden truncate font-[family-name:var(--font-label-caps)] sm:inline">
                模擬試験 進行中
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-4 sm:gap-6">
              <div className="text-label-caps text-amber-gold flex items-center gap-2 font-[family-name:var(--font-label-caps)]">
                <span
                  className="material-symbols-outlined text-[20px]"
                  aria-hidden="true"
                >
                  timer
                </span>
                <span className="tabular-nums">{formatElapsed(elapsed)}</span>
              </div>
              <Link
                href="/cellar"
                aria-label="閉じる"
                onClick={(e) => {
                  if (
                    deck.length > 0 &&
                    !window.confirm(
                      "模擬試験を終了してダッシュボードに戻りますか？",
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
                className="text-on-surface-variant hover:text-amber-gold flex min-h-11 min-w-11 items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </Link>
            </div>
          </div>
        </header>
      )}

      {phase === "quiz" && (
        <div
          className="bg-surface-container-low fixed left-0 z-40 h-1 w-full"
          style={{ top: headerOffset }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
        >
          <div
            className="maturation-gradient-horizontal h-full transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      <main
        className={`mx-auto flex w-full max-w-[1280px] flex-grow flex-col px-4 sm:px-6 md:px-16 ${
          phase === "quiz"
            ? "pb-[calc(7rem+env(safe-area-inset-bottom,0px))] pt-[calc(5rem+1px+2rem+env(safe-area-inset-top,0px))] md:pt-[calc(5rem+1px+3rem+env(safe-area-inset-top,0px))]"
            : "pb-with-bottom-nav pt-[calc(5rem+2rem+env(safe-area-inset-top,0px))]"
        }`}
      >
        {phase === "setup" && (
          <div className="glass-panel mt-4 rounded-xl p-4 sm:mt-6 sm:p-6">
            <h1 className="text-headline-lg-mobile text-amber-gold mb-2 font-[family-name:var(--font-headline-lg)] sm:text-headline-lg">
              演習の設定
            </h1>
            <p className="text-body-sm text-on-surface-variant mb-6 font-[family-name:var(--font-body-sm)]">
              {mode === "wrong_notes"
                ? "ログイン後に記録された未解決の誤答だけを出題します。"
                : "過去問（JSON）と /generate で保存した生成問題から出題します。年度は複数選択・ミックス可です。"}
            </p>

            <div className="space-y-6">
              {mode === "wrong_notes" ? (
                <div className="glass-card border-glass-stroke rounded-xl border p-4">
                  {!user ? (
                    <>
                      <p className="text-body-sm text-on-surface-variant mb-4 font-[family-name:var(--font-body-sm)]">
                        誤答ノートの復習にはログインが必要です。
                      </p>
                      <Link
                        href={`/login?next=${encodeURIComponent("/tasting?retry=wrong")}`}
                        className="amber-cta inline-flex w-full justify-center"
                      >
                        ログイン
                      </Link>
                    </>
                  ) : wrongNotesLoading ? (
                    <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
                      誤答ノートを読込中…
                    </p>
                  ) : (
                    <p className="text-body-lg text-on-surface font-[family-name:var(--font-body-lg)]">
                      未解決の誤答:{" "}
                      <span className="text-amber-gold font-medium">
                        {wrongNotesDeck.length} 問
                      </span>
                    </p>
                  )}
                </div>
              ) : (
              <>
              <fieldset className="space-y-3">
                <legend className="text-label-caps text-on-surface-variant mb-2 block font-[family-name:var(--font-label-caps)]">
                  出題ソース
                </legend>
                {savedSetLoadError && practiceSetId && (
                  <p
                    role="alert"
                    className="text-body-sm text-error font-[family-name:var(--font-body-sm)]"
                  >
                    {savedSetLoadError}
                  </p>
                )}
                {savedSetBuffer.length > 0 && (
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      mode === "saved_set"
                        ? "border-amber-gold/70 bg-amber-gold/5"
                        : "border-glass-stroke hover:border-amber-gold/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="src"
                      checked={mode === "saved_set"}
                      onChange={() => setMode("saved_set")}
                    />
                    <span className="text-body-lg font-[family-name:var(--font-body-lg)]">
                      保存セット（{savedSetTitle || "指定"}）· {savedSetBuffer.length}{" "}
                      問
                    </span>
                  </label>
                )}
                {(
                  [
                    ["past", "過去問のみ"],
                    ["generated", "生成した問題のみ"],
                    ["mix", "ミックス（過去 + 生成）"],
                  ] as const
                ).map(([key, label]) => {
                  const on = mode === key;
                  return (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        on
                          ? "border-amber-gold/70 bg-amber-gold/5"
                          : "border-glass-stroke hover:border-amber-gold/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="src"
                        checked={on}
                        onChange={() => setMode(key)}
                      />
                      <span className="text-body-lg font-[family-name:var(--font-body-lg)]">
                        {label}
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              {(mode === "past" || mode === "mix") && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
                      過去問の年度
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setYears(allYearsChecked ? [] : [...EXAM_YEARS])
                      }
                      className="text-label-caps text-amber-gold font-[family-name:var(--font-label-caps)]"
                    >
                      {allYearsChecked ? "全解除" : "全選択"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {EXAM_YEARS.map((y) => {
                      const on = years.includes(y);
                      return (
                        <label
                          key={y}
                          className={`text-label-caps cursor-pointer rounded-full border px-3 py-2 font-[family-name:var(--font-label-caps)] ${
                            on
                              ? "border-amber-gold bg-amber-gold text-cask-brown"
                              : "border-glass-stroke text-on-surface-variant hover:border-amber-gold"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={on}
                            onChange={() => setYears(toggleYear(years, y))}
                          />
                          {y}
                        </label>
                      );
                    })}
                  </div>
                  {mode === "past" && years.length === 0 && (
                    <p className="text-body-sm text-error font-[family-name:var(--font-body-sm)]">
                      1 年度以上選択してください。
                    </p>
                  )}
                </div>
              )}

              {showAdvancedFilters && (
                <CollapsibleFilterCard
                  icon="tune"
                  title="詳細オプション"
                  summary={`カテゴリ ${filterSummary(categories.length, CATEGORIES.length)} · タイプ ${filterSummary(types.length, QUESTION_TYPES.length)}`}
                >
                  <div className="space-y-5">
                    <div>
                      <div className="mb-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setCategories(
                              allCategoriesChecked ? [] : [...CATEGORIES],
                            )
                          }
                          className="text-label-caps text-amber-gold font-[family-name:var(--font-label-caps)]"
                        >
                          {allCategoriesChecked ? "全解除" : "全選択"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((c) => {
                          const checked = categories.includes(c);
                          return (
                            <label key={c} className={chipClass(checked)}>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={checked}
                                onChange={() => setCategories(toggle(categories, c))}
                              />
                              {c}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="mb-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setTypes(allTypesChecked ? [] : [...QUESTION_TYPES])
                          }
                          className="text-label-caps text-amber-gold font-[family-name:var(--font-label-caps)]"
                        >
                          {allTypesChecked ? "全解除" : "全選択"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {QUESTION_TYPES.map((t) => {
                          const checked = types.includes(t);
                          return (
                            <label key={t} className={chipClass(checked)}>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={checked}
                                onChange={() => setTypes(toggle(types, t))}
                              />
                              {QUESTION_TYPE_LABELS[t]}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    {!filtersValid && (
                      <p className="text-body-sm text-error font-[family-name:var(--font-body-sm)]">
                        カテゴリと問題タイプを 1 つ以上選んでください。
                      </p>
                    )}
                  </div>
                </CollapsibleFilterCard>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
                      問題数（最大 50）
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={count}
                      onChange={(e) =>
                        setCount(
                          Math.min(50, Math.max(1, Number(e.target.value) || 1)),
                        )
                      }
                      className="dark-field text-body-lg w-full font-[family-name:var(--font-body-lg)]"
                    />
                  </label>
                  <label className="wq-checkbox-row sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={shuffle}
                      onChange={(e) => setShuffle(e.target.checked)}
                    />
                    <span className="text-body-lg text-on-surface font-[family-name:var(--font-body-lg)]">
                      シャッフルして出題
                    </span>
                  </label>
                </div>

              </>
              )}

              {!hydrated && mode !== "saved_set" && mode !== "wrong_notes" && (
                <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
                  生成問題リストを読込中…
                </p>
              )}

              {setupError && (
                <p
                  role="alert"
                  className="text-body-sm text-error border-error/40 bg-error/10 rounded border px-3 py-2 font-[family-name:var(--font-body-sm)]"
                >
                  {setupError}
                </p>
              )}

              <button
                type="button"
                disabled={!canStart}
                onClick={startSession}
                className="amber-cta w-full"
              >
                {mode === "wrong_notes" ? "誤答復習を開始" : "テイスティングを開始"}
              </button>
            </div>
            <p className="text-body-sm text-on-surface-variant mt-3 text-center font-[family-name:var(--font-body-sm)]">
              {mode === "saved_set"
                ? `保存セット: ${savedSetBuffer.length} 問`
                : mode === "wrong_notes"
                  ? user
                    ? `未解決の誤答: ${wrongNotesDeck.length} 問`
                    : "ログイン後に誤答を復習できます"
                  : `保存済みの生成問題: ${generatedList.length} 問`}
            </p>
          </div>
        )}

        {phase === "quiz" && current && (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 md:gap-12">
            <section className="flex flex-col gap-4">
              <span className="text-label-caps text-amber-gold font-[family-name:var(--font-label-caps)] tracking-[0.2em]">
                全{deck.length}問中 第{index + 1}問 ·{" "}
                {current.source === "past"
                  ? `過去 ${current.year ?? "—"}`
                  : "生成"}{" "}
                · {QUESTION_TYPE_LABELS[current.type]}
              </span>
              <h1 className="text-headline-lg-mobile text-on-background max-w-2xl whitespace-pre-wrap break-words leading-tight font-[family-name:var(--font-headline-lg)] md:text-[36px] md:leading-[44px]">
                {current.body}
              </h1>
              {current.imageRef && (
                <PracticeQuestionFigure
                  imageRef={current.imageRef}
                  imageDescription={current.imageDescription}
                />
              )}
            </section>

            {showStatementList && choiceList && (
              <section aria-label="判定項目">
                <ol className="glass-card border-glass-stroke space-y-2 rounded-xl border p-5 pl-10">
                  {choiceList.map((label, i) => (
                    <li
                      key={i}
                      className="text-body-lg text-on-surface list-decimal font-[family-name:var(--font-body-lg)]"
                    >
                      {label}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {useChoiceButtons && choiceList && (
              <section
                className="grid grid-cols-1 gap-4 md:grid-cols-2"
                aria-label="選択肢"
              >
                {choiceList.map((label, i) => {
                  // 表示・送信値とも丸数字で統一（①〜⑳）。グレーディングが ①↔1 を吸収する
                  const choiceValue = choiceLabel(i);
                  const isSelected = answered && submittedAnswer === choiceValue;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setTextAnswer(choiceValue);
                        submitAnswer(choiceValue);
                      }}
                      aria-pressed={isSelected}
                      className={[
                        "glass-card group flex min-h-[3rem] items-start gap-4 border p-6 text-left transition-all",
                        "hover:bg-surface-container-high",
                        isSelected
                          ? "border-amber-gold inner-glow-active"
                          : "border-glass-stroke",
                      ].join(" ")}
                    >
                      <span
                        className={`text-title-md w-8 shrink-0 font-[family-name:var(--font-title-md)] ${
                          isSelected
                            ? "text-amber-gold"
                            : "text-on-surface-variant group-hover:text-amber-gold"
                        }`}
                      >
                        {choiceValue}
                      </span>
                      <span
                        className={`text-body-lg min-w-0 flex-1 whitespace-pre-wrap break-words font-[family-name:var(--font-body-lg)] ${
                          isSelected ? "text-amber-gold" : ""
                        }`}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </section>
            )}

            {needsFreeformInput && (
              <section
                className="space-y-3"
                aria-label={
                  current?.type === "true_false_count"
                    ? "個数回答"
                    : "自由記述回答"
                }
              >
                <label className="block space-y-2">
                  <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
                    {current?.type === "true_false_count"
                      ? "正しい（該当する）ものの個数（① / 1 / 一 などでも可）"
                      : "回答（番号は ① / 1 / 一 / イ いずれでも可。短文も可）"}
                  </span>
                  <textarea
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    rows={3}
                    className="dark-field text-body-lg w-full resize-y font-[family-name:var(--font-body-lg)]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => submitAnswer(textAnswer)}
                  disabled={textAnswer.trim().length === 0}
                  className="amber-cta w-full disabled:opacity-40"
                >
                  {answered && submittedAnswer === textAnswer.trim()
                    ? "回答を更新済み"
                    : answered
                      ? "回答を更新"
                      : "回答を確定"}
                </button>
              </section>
            )}

            {/* 回答済みの控えめなフィードバック（正解は明かさず、進行可能なことだけ示す） */}
            {answered && (
              <p
                className="text-label-caps text-on-surface-variant text-center font-[family-name:var(--font-label-caps)]"
                role="status"
              >
                回答を記録しました — 正解と解説はセッション終了後に公開されます
              </p>
            )}
          </div>
        )}

        {phase === "summary" && (
          <div className="mx-auto w-full max-w-3xl pb-8">
            <div className="glass-panel mb-8 rounded-xl p-6 text-center">
              <h2 className="text-headline-lg text-amber-gold mb-2 font-[family-name:var(--font-headline-lg)]">
                セッション完了
              </h2>
              <p className="text-headline-lg-mobile text-on-surface mb-2 font-[family-name:var(--font-display-lg)] sm:text-display-lg">
                {correctCount} / {deck.length}
              </p>
              <p className="text-body-sm text-on-surface-variant mb-6 font-[family-name:var(--font-body-sm)]">
                所要時間 {formatElapsed(elapsed)}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setPhase("setup");
                    setDeck([]);
                    answerLogRef.current = [];
                    setSummaryAnswerLog([]);
                  }}
                  className="amber-cta-outline w-full sm:w-auto"
                >
                  設定に戻る
                </button>
                <button
                  type="button"
                  onClick={startSession}
                  className="amber-cta w-full sm:w-auto"
                >
                  同じ条件でもう一度
                </button>
                {wrongCountInSummary > 0 && (
                  <button
                    type="button"
                    onClick={retryWrongInSession}
                    className="amber-cta-outline w-full sm:w-auto"
                  >
                    不正解だけもう一度（{wrongCountInSummary} 問）
                  </button>
                )}
              </div>
            </div>

            <h3 className="text-label-caps text-amber-gold mb-4 px-1 font-[family-name:var(--font-label-caps)]">
              正答と解説（全{deck.length}問）
            </h3>
            <ol className="flex list-none flex-col gap-4 p-0">
              {deck.map((q, i) => {
                const log = summaryAnswerLog[i];
                const ok = log?.correct ?? false;
                const submitted = log?.submitted ?? "";
                const unanswered = log == null;
                return (
                  <li key={q.id}>
                    <article
                      className={`glass-card rounded-xl border p-4 sm:p-5 ${
                        unanswered
                          ? "border-outline-variant"
                          : ok
                            ? "border-amber-gold/40"
                            : "border-error/40"
                      }`}
                    >
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <span className="text-label-caps text-amber-gold font-[family-name:var(--font-label-caps)]">
                          第{i + 1}問
                          {q.source === "past" && q.year != null
                            ? ` · 過去 ${q.year}`
                            : q.source === "generated"
                              ? " · 生成"
                              : ""}{" "}
                          · {QUESTION_TYPE_LABELS[q.type]}
                        </span>
                        {!unanswered && (
                          <span
                            className={`text-label-caps shrink-0 font-[family-name:var(--font-label-caps)] ${
                              ok ? "text-amber-gold" : "text-error"
                            }`}
                          >
                            {ok ? "正解" : "不正解"}
                          </span>
                        )}
                        {unanswered && (
                          <span className="text-label-caps text-on-surface-variant font-[family-name:var(--font-label-caps)]">
                            未回答
                          </span>
                        )}
                      </div>
                      <p className="text-body-sm text-on-surface mb-4 whitespace-pre-wrap font-[family-name:var(--font-body-sm)] leading-relaxed">
                        {q.body}
                      </p>
                      {q.imageRef && (
                        <PracticeQuestionFigure
                          imageRef={q.imageRef}
                          imageDescription={q.imageDescription}
                          className="mb-4"
                        />
                      )}
                      {q.choices && q.choices.length > 0 && (
                        <div className="border-glass-stroke bg-surface-container-low/30 mb-4 min-w-0 rounded-lg border px-3 py-2">
                          <p className="text-label-caps text-on-surface-variant mb-2 font-[family-name:var(--font-label-caps)]">
                            選択肢
                          </p>
                          <ul className="text-body-sm text-on-surface-variant m-0 list-none space-y-1.5 p-0 font-[family-name:var(--font-body-sm)]">
                            {q.choices.map((label, ci) => (
                              <li key={ci} className="flex gap-2">
                                <span className="text-amber-gold shrink-0 font-medium">
                                  {choiceLabel(ci)}
                                </span>
                                <span className="min-w-0 flex-1 break-words whitespace-pre-wrap">
                                  {label}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <dl className="text-body-sm space-y-2 font-[family-name:var(--font-body-sm)]">
                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                          <dt className="text-on-surface-variant shrink-0">あなたの回答</dt>
                          <dd className="text-on-surface min-w-0 break-words font-medium">
                            {unanswered
                              ? "—"
                              : submitted === ""
                                ? "（空）"
                                : formatPracticeAnswerDisplay(
                                    submitted,
                                    q.choices,
                                    q.type,
                                  )}
                          </dd>
                        </div>
                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                          <dt className="text-on-surface-variant shrink-0">正答</dt>
                          <dd className="text-amber-gold min-w-0 break-words font-medium">
                            {q.answer == null || q.answer === ""
                              ? "（未登録）"
                              : formatPracticeAnswerDisplay(
                                  q.answer,
                                  q.choices,
                                  q.type,
                                )}
                          </dd>
                        </div>
                      </dl>
                      {q.explanation ? (
                        <div className="border-glass-stroke mt-4 border-t pt-4">
                          <p className="text-label-caps text-on-surface-variant mb-2 font-[family-name:var(--font-label-caps)]">
                            解説
                          </p>
                          <p className="text-body-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed font-[family-name:var(--font-body-sm)]">
                            {q.explanation}
                          </p>
                        </div>
                      ) : (
                        <p className="text-body-sm text-on-surface-variant/70 mt-4 font-[family-name:var(--font-body-sm)]">
                          （この問題には解説データがありません）
                        </p>
                      )}
                    </article>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </main>

      {/* setup / summary は他ページと統一して BottomNav を表示 (md 未満のみ可視) */}
      {phase !== "quiz" && <BottomNav active="taste" />}

      {phase === "quiz" && (
        <footer className="bg-background-deep border-glass-stroke fixed bottom-0 left-0 z-50 w-full border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:px-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={goPrev}
              disabled={index === 0}
              className="text-label-caps text-on-surface-variant hover:text-on-surface flex min-h-11 items-center gap-2 font-[family-name:var(--font-label-caps)] disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                arrow_back
              </span>
              前の問題へ
            </button>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
              <button
                type="button"
                onClick={toggleFlagCurrent}
                className={`text-label-caps flex min-h-11 items-center gap-2 border px-4 py-2.5 font-[family-name:var(--font-label-caps)] transition-all sm:px-6 sm:py-3 ${
                  flagged.has(index)
                    ? "border-amber-gold text-amber-gold bg-glass-fill"
                    : "border-glass-stroke text-on-surface-variant hover:bg-glass-fill hover:text-amber-gold"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={
                    flagged.has(index)
                      ? { fontVariationSettings: '"FILL" 1' }
                      : undefined
                  }
                  aria-hidden="true"
                >
                  flag
                </span>
                後で確認する
              </button>
              <button
                type="button"
                disabled={!answered}
                onClick={goNext}
                className="bg-amber-gold text-cask-brown text-label-caps min-h-11 px-8 py-2.5 font-bold transition-all hover:brightness-110 disabled:opacity-40 font-[family-name:var(--font-label-caps)]"
              >
                {index >= deck.length - 1 ? "結果へ" : "次の問題へ"}
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
