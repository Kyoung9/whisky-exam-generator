"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gradePracticeAnswer } from "@/lib/practice-grade";
import { buildPracticeDeck } from "@/lib/practice-pool";
import { useQuestions } from "@/lib/store";
import type { PracticeItem, PracticeSourceMode } from "@/types/practice";
import {
  EXAM_YEARS,
  QUESTION_TYPE_LABELS,
  type ExamYear,
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

export function TastingPractice() {
  const { questions: generatedList, hydrated } = useQuestions();

  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<PracticeSourceMode>("mix");
  const [years, setYears] = useState<ExamYear[]>([...EXAM_YEARS]);
  const [count, setCount] = useState(10);
  const [shuffle, setShuffle] = useState(true);
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
  /** サマリー表示用（レンダー中に ref を読まないためのスナップショット） */
  const [summaryAnswerLog, setSummaryAnswerLog] = useState<
    (AnswerEntry | undefined)[]
  >([]);

  const current = deck[index] ?? null;
  const hasChoices = Boolean(current?.choices && current.choices.length > 0);
  const progressPct =
    deck.length > 0 ? Math.round(((index + 1) / deck.length) * 100) : 0;

  const headerOffset = "calc(5rem + env(safe-area-inset-top,0px))";

  useEffect(() => {
    if (phase !== "quiz") return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const startSession = useCallback(() => {
    setSetupError(null);
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
    });
    if (deckBuilt.length === 0) {
      setSetupError(
        "出題できる問題がありません。年度・ソースを変えるか、生成問題を追加してください。",
      );
      return;
    }
    sessionIdRef.current =
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `sess_${Date.now()}`;
    setSummaryAnswerLog([]);
    setDeck(deckBuilt);
    answerLogRef.current = Array.from({ length: deckBuilt.length }, () => undefined);
    setFlagged(new Set());
    setIndex(0);
    setTextAnswer("");
    setAnswered(false);
    setSubmittedAnswer("");
    setResults([]);
    setElapsed(0);
    setPhase("quiz");
  }, [mode, years, count, shuffle, generatedList]);

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

  const allYearsChecked = years.length === EXAM_YEARS.length;

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
              過去問（JSON）と /generate で保存した生成問題から出題します。年度は複数選択・ミックス可です。
            </p>

            <fieldset className="mb-6 space-y-3">
              <legend className="text-label-caps text-on-surface-variant mb-2 block font-[family-name:var(--font-label-caps)]">
                出題ソース
              </legend>
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
              <div className="mb-6 space-y-3">
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

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <label className="flex items-end gap-3 pb-2">
                <input
                  type="checkbox"
                  checked={shuffle}
                  onChange={(e) => setShuffle(e.target.checked)}
                />
                <span className="text-body-lg font-[family-name:var(--font-body-lg)]">
                  シャッフルして出題
                </span>
              </label>
            </div>

            {!hydrated && (
              <p className="text-body-sm text-on-surface-variant mb-2 font-[family-name:var(--font-body-sm)]">
                生成問題リストを読込中…
              </p>
            )}

            {setupError && (
              <p
                role="alert"
                className="text-body-sm text-error border-error/40 bg-error/10 mb-4 rounded border px-3 py-2 font-[family-name:var(--font-body-sm)]"
              >
                {setupError}
              </p>
            )}

            <button
              type="button"
              disabled={!hydrated}
              onClick={startSession}
              className="amber-cta w-full"
            >
              テイスティングを開始
            </button>
            <p className="text-body-sm text-on-surface-variant mt-3 text-center font-[family-name:var(--font-body-sm)]">
              保存済みの生成問題: {generatedList.length} 問
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
                <figure className="glass-card overflow-hidden rounded-xl border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={current.imageRef}
                    alt={current.imageDescription ?? "問題画像"}
                    className="max-h-72 w-full object-contain"
                  />
                </figure>
              )}
            </section>

            {hasChoices && current.choices && (
              <section
                className="grid grid-cols-1 gap-4 md:grid-cols-2"
                aria-label="選択肢"
              >
                {current.choices.map((label, i) => {
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

            {!hasChoices && (
              <section className="space-y-3" aria-label="自由記述回答">
                <label className="block space-y-2">
                  <span className="text-label-caps text-on-surface-variant block font-[family-name:var(--font-label-caps)]">
                    回答（番号は ① / 1 / 一 / イ いずれでも可。短文も可）
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
                      <dl className="text-body-sm space-y-2 font-[family-name:var(--font-body-sm)]">
                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                          <dt className="text-on-surface-variant shrink-0">あなたの回答</dt>
                          <dd className="text-on-surface min-w-0 break-words font-medium">
                            {unanswered ? "—" : submitted || "（空）"}
                          </dd>
                        </div>
                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                          <dt className="text-on-surface-variant shrink-0">正答</dt>
                          <dd className="text-amber-gold min-w-0 break-words font-medium">
                            {q.answer ?? "（未登録）"}
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
