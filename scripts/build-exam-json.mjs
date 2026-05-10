// scanned PDF -> PastExamQuestion[] (JSON) を生成する一回限りのオフラインスクリプト。
//
// 自動モード: 全ページをスライディングウィンドウで走査し、各ウィンドウで
// 「問題ページ」 / 「解答・解説ページ」 / その他を AI が自動判別する。
// 取り出した解答・解説は問題番号 (number) 基準で自動マージされる。
//
// 多くの試験は最終ページに解答一覧がまとまっている。自動モードだけだと
// 該当ページの全解答を取りこぼすことがあるため、`--answer-pages` で
// 解答専用ページを明示すれば、その範囲を専用プロンプトで再抽出してマージする。
//
// 使い方:
//   node scripts/build-exam-json.mjs --year 2024
//   node scripts/build-exam-json.mjs --year 2024 --answer-pages 23
//   node scripts/build-exam-json.mjs --all --answer-pages 23
//
// オプション:
//   --pages F-T          特定ページ範囲のみ処理 (デバッグ用)
//   --answer-pages F[-T] 解答一覧ページを明示し、専用プロンプトで再抽出してマージ
//   --window N           1 度に送るページ数 (default 3)
//   --stride N           ウィンドウ移動量 (default 2 = 1ページ重ね)
//   --scale N            PDF レンダリングスケール (default 2.0)
//   --dry-run            API を呼ばず PNG レンダリングのみ
//   --force              キャッシュを無視して再実行
//
// 必要環境変数: OPENAI_API_KEY
// 任意環境変数: OPENAI_VISION_MODEL (default: "gpt-5"; vision 対応モデルを指定)
//
// README §7.1 を遵守: アプリ実行時の OCR は行わず、本スクリプトで事前に JSON 化する。

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import OpenAI from "openai";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(ROOT, ".env.local") });
dotenv.config({ path: path.join(ROOT, ".env") });

const VALID_YEARS = [2021, 2022, 2023, 2024];
const VISION_MODEL = process.env.OPENAI_VISION_MODEL ?? "gpt-5";
const CACHE_VERSION = "v5"; // 画像 bbox 抽出

// ---------- CLI args ----------
function parsePageRange(s, single = false) {
  if (single) {
    const m = s.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error(`page range must be like "23" or "22-23", got: ${s}`);
    const from = Number(m[1]);
    const to = m[2] ? Number(m[2]) : from;
    return { from, to };
  }
  const m = s.match(/^(\d+)-(\d+)$/);
  if (!m) throw new Error(`page range must be like "1-5", got: ${s}`);
  return { from: Number(m[1]), to: Number(m[2]) };
}

function parseArgs(argv) {
  const args = {
    years: [],
    pages: null,
    answerPages: null,
    window: 3,
    stride: 2,
    scale: 2.0,
    dryRun: false,
    force: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--all":
        args.years = [...VALID_YEARS];
        break;
      case "--year":
        args.years = [Number(argv[++i])];
        break;
      case "--pages":
        args.pages = parsePageRange(argv[++i]);
        break;
      case "--answer-pages": {
        const v = argv[++i];
        // "last" は totalPages が判明した時点で解決する sentinel
        args.answerPages =
          v === "last" ? { from: "last", to: "last" } : parsePageRange(v, true);
        break;
      }
      case "--window":
        args.window = Number(argv[++i]);
        break;
      case "--stride":
        args.stride = Number(argv[++i]);
        break;
      case "--scale":
        args.scale = Number(argv[++i]);
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--force":
        args.force = true;
        break;
      default:
        throw new Error(`Unknown arg: ${a}`);
    }
  }
  if (args.years.length === 0) throw new Error("Specify --year <year> or --all");
  for (const y of args.years) {
    if (!VALID_YEARS.includes(y)) {
      throw new Error(`Unsupported year: ${y}. Allowed: ${VALID_YEARS.join(", ")}`);
    }
  }
  if (args.window < 1) throw new Error("--window must be >= 1");
  if (args.stride < 1) throw new Error("--stride must be >= 1");
  return args;
}

// ---------- pdfjs canvas factory for Node ----------
class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext("2d") };
  }
  reset(target, width, height) {
    target.canvas.width = width;
    target.canvas.height = height;
  }
  destroy(target) {
    target.canvas.width = 0;
    target.canvas.height = 0;
  }
}

async function renderPage(pdfDoc, pageNumber, scale) {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const factory = new NodeCanvasFactory();
  const { canvas, context } = factory.create(viewport.width, viewport.height);
  await page.render({
    canvasContext: context,
    viewport,
    canvasFactory: factory,
  }).promise;
  return await canvas.encode("png");
}

const pad3 = (n) => String(n).padStart(3, "0");

// ---------- exam hints ----------
// 年度別 hint: scripts/exam-hints/<year>.json
// 形式: { "subMap": { "<mainNumber>": ["a", "b", ...] }, "totalNumbers"?: <int> }
async function loadHints(year) {
  const hintsPath = path.join(__dirname, `exam-hints/${year}.json`);
  if (!existsSync(hintsPath)) return null;
  try {
    const obj = JSON.parse(await fs.readFile(hintsPath, "utf8"));
    const subMap = {};
    for (const [k, v] of Object.entries(obj.subMap ?? {})) {
      const n = Number(k);
      if (!Number.isInteger(n)) continue;
      subMap[n] = (Array.isArray(v) ? v : []).map((s) =>
        String(s).trim().toLowerCase()
      );
    }
    // answerOverrides: 手動で正解を上書きするための ground-truth マップ
    // キーは "44" もしくは "67-a" のような (number[-sub]) 文字列
    const answerOverrides = {};
    for (const [k, v] of Object.entries(obj.answerOverrides ?? {})) {
      if (typeof v !== "string" && typeof v !== "number") continue;
      answerOverrides[String(k).trim()] = String(v);
    }
    return {
      subMap,
      totalNumbers: obj.totalNumbers ?? null,
      answerOverrides,
      raw: obj,
    };
  } catch (e) {
    console.warn(`  hint file ${hintsPath} parse failed: ${e.message}`);
    return null;
  }
}

// hint を 1 行のコンパクト表記に圧縮 (Q1→a,b,c; Q3→a,b,c; …)
function formatSubMap(subMap) {
  return Object.keys(subMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map((n) => `Q${n}\u2192${subMap[n].join(",")}`)
    .join("; ");
}

// 解答配列から sub-question 群を抽出する (number → [subNumbers])
function deriveSubMapFromAnswers(answers) {
  const subMap = {};
  for (const a of answers ?? []) {
    if (typeof a.number !== "number") continue;
    const sub = normalizeSubNumber(a.subNumber);
    if (!sub) continue;
    (subMap[a.number] ??= new Set()).add(sub);
  }
  const out = {};
  for (const [k, set] of Object.entries(subMap)) {
    out[Number(k)] = [...set].sort();
  }
  return out;
}

// 複数 subMap を union で合成する
function mergeSubMaps(...maps) {
  const result = {};
  for (const m of maps) {
    if (!m) continue;
    for (const [k, subs] of Object.entries(m)) {
      const n = Number(k);
      const cur = new Set(result[n] ?? []);
      for (const s of subs) cur.add(normalizeSubNumber(s));
      result[n] = [...cur].filter(Boolean).sort();
    }
  }
  return result;
}

// hint を踏まえた sub-question 説明ブロック
function hintBlock(hints) {
  if (!hints || Object.keys(hints.subMap).length === 0) return "";
  const list = formatSubMap(hints.subMap);
  const subNums = new Set(Object.keys(hints.subMap).map(Number));
  const totalHint = hints.totalNumbers
    ? `Main numbers run from 1 to ${hints.totalNumbers}. `
    : "";
  const nonSubExample = (() => {
    const xs = [];
    for (let i = 1; i <= 75 && xs.length < 8; i++) {
      if (!subNums.has(i)) xs.push(i);
    }
    return xs.join(", ");
  })();
  return `

BOOKLET-SPECIFIC SUB-QUESTION MAP (authoritative — you MUST follow this exactly):
${list}
${totalHint}ONLY the numbers listed above have sub-questions. For every OTHER main number (e.g., ${nonSubExample}, …), the "subNumber" field MUST be omitted (single-question item).
When you encounter a main number listed above, you MUST emit one entry per listed letter (e.g., Q23 → four entries with subNumber a, b, c, d).`;
}

async function ensurePagePng(pdfDoc, year, pageNumber, scale, force) {
  const cacheDir = path.join(ROOT, `.cache/exams/${year}`);
  await fs.mkdir(cacheDir, { recursive: true });
  const pngPath = path.join(cacheDir, `page-${pad3(pageNumber)}.png`);
  if (!existsSync(pngPath) || force) {
    const png = await renderPage(pdfDoc, pageNumber, scale);
    await fs.writeFile(pngPath, png);
    console.log(
      `  [${year}] page ${pageNumber}: rendered ${(png.length / 1024) | 0} KB`
    );
  }
  return pngPath;
}

// ---------- OpenAI vision call ----------
async function callVision(openai, pngBuffers, prompt) {
  const content = [{ type: "text", text: prompt.user }];
  for (const buf of pngBuffers) {
    const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
    content.push({
      type: "image_url",
      image_url: { url: dataUrl, detail: "high" },
    });
  }
  const completion = await openai.chat.completions.create({
    model: VISION_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content },
    ],
  });
  const text = completion.choices[0]?.message?.content;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn(`  JSON parse failed: ${e.message}`);
    return null;
  }
}

// ---------- prompts (English) ----------
const SYSTEM_PROMPT_BASE = `You are an OCR + structured-extraction assistant for the Japanese ウイスキーエキスパート exam.
Input: N consecutive scanned pages from a past exam booklet.
The booklet contains a question section followed by an answer / explanation section. A page may also be a cover, table of contents, instructions, or blank.

Output: a strict JSON object exactly of the shape:
{ "questions": Question[], "answers": Answer[] }

Question shape (for question pages):
{
  "number": <int>,                  // the main exam number
  "subNumber": <string|null>,       // sub-question letter when applicable, e.g., "a", "b". OMIT for normal questions.
  "category": one of "Scotch Whisky" | "Irish Whiskey" | "American Whiskey" | "Canadian Whisky" | "Japanese Whisky" | "World Whisky",
  "type": one of "multiple_choice" | "true_false_count" | "map" | "timeline" | "matching" | "table" | "image_based",
  "theme": <Japanese theme phrase>,
  "body": <the question text in Japanese, transcribed verbatim>,
  "choices": [<choice strings>] (optional),
  "difficulty": "easy" | "medium" | "hard" (your best guess),
  "image": <ImageRef|null>          // see "Image extraction rules" below; OMIT when the question has no embedded image
}

ImageRef shape:
{
  "page": <int>,                    // the booklet page number (1-indexed, as given in the user prompt) where the image is printed
  "bbox": {                         // bounding box normalized to that page; (0,0)=top-left, (1,1)=bottom-right
    "x": <0..1>,
    "y": <0..1>,
    "w": <0..1>,
    "h": <0..1>
  },
  "description": <Japanese description of what the image shows (visual only — do NOT reveal the answer)>
}

Answer shape (for answer / explanation pages):
{
  "number": <int>,                  // the printed question number this entry refers to
  "subNumber": <string|null>,       // sub-question letter when applicable. OMIT otherwise.
  "answer": <string>,               // the printed correct answer; preserve symbols like ① if printed; for true_false_count answers it is the count, e.g., "2"
  "explanation": <string>           // the printed Japanese explanation, transcribed verbatim; OMIT this field if not printed
}

Sub-question handling (CRITICAL — applies to ALL types including timeline/table/image_based):
- Some items share one main number but split into independently-answered sub-questions, marked by uppercase letters A, B, C, … or イ, ロ, ハ, … in the body.
- The KEY TEST: each sub-question has its OWN distinct choice list (its own ① ② ③ …) AND its OWN instruction like "1つ選んで、その番号を答えなさい" or "その数を答えなさい". If yes → IT IS a sub-question, SPLIT.
- Applies even when the question shares a large visual element (連表/年表/表/地図/図). The shared element MUST be repeated in each sub-question's body so that each emitted Question is self-contained.
- For each sub-question, emit ONE Question with:
  - number = the shared main number (e.g., 30, 45, 67)
  - subNumber = lowercase letter ("a", "b", "c", …) corresponding to the sub label (A→"a", B→"b", … and イ→"a", ロ→"b", ハ→"c" if イロハ are used as sub markers)
  - body = the shared stem (table / chronology / image description) + THIS sub-question's specific question text. Do NOT include other sub-questions' choices in this body.
  - choices = the choices for THIS sub-question only.
- Do NOT split items that look like single-question multi-item formats:
  - true_false_count where a〜f are statements counted together as one answer ("正しいものはいくつあるか").
  - matching where A〜E are items and 1〜9 is a single shared candidate pool answered as a tuple.
  - map where A/B/C are points on a map answered by a tuple referring to one shared list.
  Those remain a SINGLE Question.
- Worked examples:
  - "次の表... A. 「イ」に入る蒸留所は? ①〜⑥. B. スペイサイドはいくつあるか?" → split into two: number=30 subNumber=a (table+A, choices ①〜⑥), number=30 subNumber=b (table+B, no choices, count answer).
  - "次の年表... A. イに入る年号は? ①〜⑤. B. ロに入る年号は? ①〜⑤. C. ハに入る地名は? ①〜⑥" → split into three (a, b, c).
  - "問題. 67 ... A. 図について間違っているのは? ①〜⑤. B. 泡立ち状態を何と言うか? ①〜⑤" → split into two (a, b).

Image extraction rules (CRITICAL — required for type="image_based" and any question that visually depends on an embedded photo / figure / diagram / map):
- The booklet pages may contain printed photographs (e.g., 蒸留所の写真, ポットスチルの写真), diagrams (e.g., マスバランス図), maps, or tables that are PART of the question (not decorative).
- For EVERY question where a printed image is part of the prompt, attach an "image" field with:
  - "page" = the booklet page number where the image is printed (use the page numbers given in the user prompt).
  - "bbox" = the bounding rectangle of the image on that page, normalized so that the page spans (x=0, y=0) at top-left to (x=1, y=1) at bottom-right. Be GENEROUS: include the entire image plus a small margin. Over-covering (extra whitespace) is fine; under-covering (cropping out part of the image) is NOT acceptable. Aim for bbox.w and bbox.h to be at least 0.05 (otherwise the crop will be unusable).
  - "description" = a Japanese visual description of what is shown. Describe ONLY what is visually present (shape, layout, labels printed on the figure). Do NOT reveal the answer (e.g., do NOT name the distillery in the photo if that is the question).
- If a sub-question shares an image with siblings (e.g., Q67 A and Q67 B both reference the same マスバランス図), copy the SAME "image" field into each sub-question's Question entry.
- DO NOT emit an "image" field for purely text-only questions or for tables/timelines that are made entirely of text (those are reproduced verbatim in "body" instead).
- DO NOT invent images that are not actually printed.
- DO NOT use a bbox that covers the entire page unless the image actually fills the entire page. A tiny bbox (w<0.05 or h<0.05) will be rejected — make sure your bbox is roughly the image's visible rectangle on the page.

Page classification rules:
- Cover / TOC / instructions / blank pages: contribute nothing.
- Question pages: fill "questions". Do NOT add to "answers" even if a small answer hint appears.
- Answer / explanation pages: fill "answers". Do NOT add to "questions" — even though they reference questions by number, they are not the original question text.
- Mixed page (rare): fill both arrays as appropriate.
- If you have nothing to extract, return { "questions": [], "answers": [] }.

Strict rules for question extraction:
- Transcribe Japanese verbatim. Do NOT paraphrase, translate, or summarize.
- DO NOT include the leading marker (①〜⑳, 1., 2., a., (1), b)) in each choice string. Choice strings are the option text only.
- For matching questions (e.g., "次の説明A〜Eに当てはまる人物を 1〜9 から選び..."), set type="matching" and put the entire prompt INCLUDING the items A〜E in body, and the candidate pool in choices.
- For true/false-count questions where multiple statements (a〜f) are listed, set type="true_false_count" and put each statement in choices.
- "id", "year", "answer", "explanation": OMIT in question objects. They are filled by other steps.
- If a question's prompt is partially visible (e.g., only the second half of the body is on these pages and the question stem is missing), SKIP that question — do not output a fragment. A body that starts like "C. ..." or that lacks the question stem is a fragment; skip it.
- Use the printed exam number for "number" (e.g., 問題 5 → number=5).

Strict rules for answer extraction:
- Transcribe Japanese verbatim. Do NOT paraphrase or translate.
- Do NOT fabricate explanations that are not printed.

Output JSON only — no markdown, no commentary.`;

function userPromptFor(year, fromPage, toPage, totalPages) {
  return `These are pages ${fromPage}-${toPage} (of ${totalPages}) from the ${year} ウイスキーエキスパート past exam booklet.
Classify each page (question / answer / other) yourself, then extract questions into "questions" and answers/explanations into "answers".
Reconstruct questions that span across the provided pages.
Return JSON only.`;
}

// 解答一覧ページ専用プロンプト。questions の文脈を見ずに、ページに印字された
// 番号付き解答を残らず抽出させるための強い指示。
const ANSWER_ONLY_SYSTEM_BASE = `You are an OCR assistant for a Japanese ウイスキーエキスパート past exam booklet.
The provided page(s) likely contain the answer key — a compact list of correct answer numbers (and possibly short explanations) for the exam questions. The list may be in a tight grid / multi-column layout with small fonts.

Output: a strict JSON object: { "answers": Answer[] }.

Answer shape:
{
  "number": <int>,                 // the printed main question number this entry refers to
  "subNumber": <string|null>,      // sub-question letter (lowercase, e.g., "a"); OMIT for normal questions
  "answer": <string>,              // the printed correct answer; preserve symbols like ① if printed; for count answers it is the count, e.g., "2"
  "explanation": <string>          // the printed Japanese explanation, transcribed verbatim; OMIT if not printed
}

CRITICAL rules:
- Be EXHAUSTIVE. Extract EVERY numbered answer entry you can read on these page(s). A complete booklet typically has 50–100 answers.
- DO NOT return an empty array if you can see even a single "問N ②" or "N. ②" entry. Returning [] is only allowed if the page clearly has zero answer entries (e.g., a cover).
- DO NOT filter answers by whether you have seen the corresponding question. You are looking at the answer key in isolation.
- DO NOT require explanations. An answer entry that has only number + chosen symbol (e.g., "67. ②") IS valid and MUST be emitted with just "number" and "answer" fields.
- DO NOT assume that the answer key cannot coexist with questions on the same page. Some booklets place a small answer table at the bottom of the last question page; extract it anyway.
- Transcribe Japanese verbatim. Do NOT paraphrase or translate.
- Do NOT fabricate explanations that are not printed.
- Sub-questions: if the key prints "67-a ②  67-b ③" or "67a ②  67b ③" or "67(a) ②" or "67 a ②", emit ONE Answer per sub with number=67 and subNumber set to the lowercase letter ("a", "b", ...). The same applies to timeline-style chronology blanks (イ, ロ, ハ → "a", "b", "c").
- Output JSON only — no markdown, no commentary.`;

function buildSystemPrompt(hints) {
  return SYSTEM_PROMPT_BASE + hintBlock(hints);
}

function buildAnswerOnlySystem(hints) {
  return ANSWER_ONLY_SYSTEM_BASE + hintBlock(hints);
}

function answerOnlyUserPrompt(year, fromPage, toPage, totalPages) {
  return `These are pages ${fromPage}-${toPage} (of ${totalPages}) from the ${year} ウイスキーエキスパート past exam booklet — the answer-key page(s).
Extract EVERY numbered answer printed here.
Return JSON only.`;
}

// ---------- post-processing ----------
const CHOICE_PREFIX_RE =
  /^\s*(?:[\u2460-\u2473]|[\(\uFF08]\s*[0-9\uFF10-\uFF19]+\s*[\)\uFF09]|[0-9\uFF10-\uFF19]+\s*[.\uFF0E．。\)\uFF09]|[a-zA-Z\uFF21-\uFF3A\uFF41-\uFF5A][.\uFF0E．。\)\uFF09]|[\u30A1-\u30FA][.\uFF0E．。\)\uFF09])\s*/u;

function stripChoicePrefix(s) {
  if (typeof s !== "string") return s;
  return s.replace(CHOICE_PREFIX_RE, "").trim();
}

function normalizeChoices(q) {
  if (Array.isArray(q.choices)) {
    const stripped = q.choices.map(stripChoicePrefix).filter((s) => s.length > 0);
    if (stripped.length > 0) q.choices = stripped;
    else delete q.choices;
  }
  return q;
}

// bbox 妥当性: 0..1 範囲かつ最小サイズを満たすこと
function isValidBBox(b) {
  if (!b || typeof b !== "object") return false;
  const ok = (v) => typeof v === "number" && Number.isFinite(v);
  if (!ok(b.x) || !ok(b.y) || !ok(b.w) || !ok(b.h)) return false;
  if (b.x < 0 || b.x > 1) return false;
  if (b.y < 0 || b.y > 1) return false;
  if (b.w <= 0.02 || b.w > 1.05) return false;
  if (b.h <= 0.02 || b.h > 1.05) return false;
  if (b.x + b.w > 1.05) return false;
  if (b.y + b.h > 1.05) return false;
  return true;
}

// bbox を元の PNG から切り出して PNG buffer を返す。padding を一定比率で加える。
// 切り出しサイズが小さすぎる場合は null を返す。
async function cropPngByBBox(srcBuf, bbox, paddingRatio = 0.03) {
  const img = await loadImage(srcBuf);
  const W = img.width;
  const H = img.height;
  const cx = bbox.x * W;
  const cy = bbox.y * H;
  const cw = bbox.w * W;
  const ch = bbox.h * H;
  const padX = cw * paddingRatio;
  const padY = ch * paddingRatio;
  const x0 = Math.max(0, Math.floor(cx - padX));
  const y0 = Math.max(0, Math.floor(cy - padY));
  const x1 = Math.min(W, Math.ceil(cx + cw + padX));
  const y1 = Math.min(H, Math.ceil(cy + ch + padY));
  const w = x1 - x0;
  const h = y1 - y0;
  if (w < 60 || h < 60) return null;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, x0, y0, w, h, 0, 0, w, h);
  return await canvas.encode("png");
}

// answers-skeleton 構築用ユーティリティ。
// 期待される (number, subNumber) キーを答案 + hint から導出する。
function expectedKeys(answers, hints) {
  const keys = new Set();
  for (const a of answers ?? []) {
    if (typeof a.number !== "number") continue;
    keys.add(`${a.number}|${normalizeSubNumber(a.subNumber) ?? ""}`);
  }
  const subParents = new Set();
  if (hints?.subMap) {
    for (const [n, subs] of Object.entries(hints.subMap)) {
      const num = Number(n);
      subParents.add(num);
      for (const s of subs) {
        const ns = normalizeSubNumber(s);
        if (!ns) continue;
        keys.add(`${num}|${ns}`);
      }
    }
  }
  // 必要なら 1..totalNumbers の main 番号も保証する (sub がある番号は除外)
  if (typeof hints?.totalNumbers === "number") {
    for (let i = 1; i <= hints.totalNumbers; i++) {
      if (subParents.has(i)) continue;
      keys.add(`${i}|`);
    }
  }
  return keys;
}

function splitKey(k) {
  const idx = k.indexOf("|");
  const number = Number(k.slice(0, idx));
  const sub = k.slice(idx + 1);
  return { number, subNumber: sub.length > 0 ? sub : undefined };
}

// 答案を骨格として skeleton entries を作る (body/choices などは未充填)
function buildSkeleton(expected, answerMap) {
  const entries = [];
  for (const k of expected) {
    const { number, subNumber } = splitKey(k);
    const a = answerMap.get(k);
    const entry = { number };
    if (subNumber) entry.subNumber = subNumber;
    if (a?.answer) entry.answer = a.answer;
    if (a?.explanation) entry.explanation = a.explanation;
    entries.push(entry);
  }
  return entries;
}

// 問題 OCR の結果を skeleton にマージする。
// skeleton 側に entry が無いキー (= 答案にも hint にも無い、想定外の問題) は orphan として追加する。
function mergeQuestionsIntoSkeleton(skeleton, questions) {
  const byKey = new Map(skeleton.map((e) => [keyOf(e), e]));
  const fields = [
    "body",
    "choices",
    "type",
    "theme",
    "category",
    "difficulty",
    "image",
  ];
  let merged = 0;
  const orphans = [];
  for (const q of questions) {
    if (typeof q.number !== "number") continue;
    q.subNumber = normalizeSubNumber(q.subNumber);
    const k = keyOf(q);
    const target = byKey.get(k);
    if (!target) {
      orphans.push(q);
      continue;
    }
    for (const f of fields) {
      if (q[f] !== undefined) target[f] = q[f];
    }
    merged++;
  }
  for (const o of orphans) skeleton.push(o);
  return { merged, orphanCount: orphans.length, orphans };
}

// hints.answerOverrides を skeleton に強制適用する。
// キーは "44" もしくは "67-a" のような (number[-sub]) 文字列。
// マッチした entry が無い場合は新規 entry を作って追加する (該当番号自体が抜けているケースの保険)。
function applyAnswerOverrides(skeleton, hints) {
  const overrides = hints?.answerOverrides;
  if (!overrides || Object.keys(overrides).length === 0) return 0;
  let applied = 0;
  const unmatched = [];
  for (const [rawKey, rawVal] of Object.entries(overrides)) {
    const m = String(rawKey).match(/^(\d+)(?:[-_]?([a-zA-Z\u30A1-\u30FA]))?$/);
    if (!m) {
      unmatched.push(`${rawKey} (bad key)`);
      continue;
    }
    const number = Number(m[1]);
    const subNumber = m[2] ? normalizeSubNumber(m[2]) : undefined;
    const target = skeleton.find(
      (e) => e.number === number && (e.subNumber ?? undefined) === subNumber
    );
    if (target) {
      target.answer = String(rawVal);
      applied++;
    } else {
      const entry = { number };
      if (subNumber) entry.subNumber = subNumber;
      entry.answer = String(rawVal);
      skeleton.push(entry);
      applied++;
    }
  }
  if (unmatched.length > 0) {
    console.warn(
      `  [override] ${unmatched.length} bad keys: ${unmatched.join(", ")}`
    );
  }
  return applied;
}

// skeleton entry に最低限のフィールドを埋め、body 未抽出のものを数える
function fillPlaceholders(entries) {
  let missingBody = 0;
  for (const e of entries) {
    if (!e.body || typeof e.body !== "string" || e.body.trim().length === 0) {
      e.body = "(本文未抽出 — OCR を再実行するか、手動で入力してください)";
      missingBody++;
    }
    if (!e.type) e.type = "multiple_choice";
    if (!e.category) e.category = "World Whisky";
    if (!e.theme) e.theme = "(未抽出)";
    if (!e.difficulty) e.difficulty = "medium";
  }
  return missingBody;
}

// 各 question の image フィールドから bbox を切り出して public/exam-images に保存する。
// 切り出し後は image を削除し、代わりに imageRef / imageSourcePage / imageDescription を付与する。
async function attachImages(year, questions, pngPaths, force) {
  const outDir = path.join(ROOT, `public/exam-images/${year}`);
  await fs.mkdir(outDir, { recursive: true });
  let attached = 0;
  let skipped = 0;
  const skipDetails = [];
  for (const q of questions) {
    const im = q.image;
    delete q.image;
    if (!im || typeof im !== "object") continue;
    const tag = `${q.number}${q.subNumber ? `-${q.subNumber}` : ""}`;
    if (typeof im.page !== "number" || !im.bbox || !isValidBBox(im.bbox)) {
      skipped++;
      skipDetails.push(`Q${tag}(invalid bbox)`);
      continue;
    }
    const pngPath = pngPaths.get(im.page);
    if (!pngPath) {
      skipped++;
      skipDetails.push(`Q${tag}(page ${im.page} not rendered)`);
      continue;
    }
    const baseName = `q${pad3(q.number)}${q.subNumber ? `-${q.subNumber}` : ""}.png`;
    const outPath = path.join(outDir, baseName);
    if (!existsSync(outPath) || force) {
      const srcBuf = await fs.readFile(pngPath);
      const cropped = await cropPngByBBox(srcBuf, im.bbox);
      if (!cropped) {
        skipped++;
        skipDetails.push(`Q${tag}(crop too small)`);
        continue;
      }
      await fs.writeFile(outPath, cropped);
    }
    q.imageRef = `/exam-images/${year}/${baseName}`;
    q.imageSourcePage = im.page;
    if (typeof im.description === "string" && im.description.trim().length > 0) {
      q.imageDescription = im.description.trim();
    }
    attached++;
  }
  console.log(
    `  [${year}] images attached: ${attached}${skipped > 0 ? `, skipped: ${skipped} (${skipDetails.slice(0, 5).join(", ")}${skipDetails.length > 5 ? ", ..." : ""})` : ""}`
  );
}

// subNumber も含めた複合キーで重複判定する
function normalizeSubNumber(s) {
  if (s == null) return undefined;
  const v = String(s).trim().toLowerCase();
  return v.length > 0 ? v : undefined;
}

function keyOf(x) {
  return `${x.number}|${normalizeSubNumber(x.subNumber) ?? ""}`;
}

function sortBySubKey(a, b) {
  if (a.number !== b.number) return a.number - b.number;
  return (a.subNumber ?? "").localeCompare(b.subNumber ?? "");
}

// 同じキーは body / choices が豊富な方を優先する。
// image / imageDescription など片方しか持たないフィールドは勝者側に移植する。
function dedupQuestions(qs) {
  const map = new Map();
  const score = (x) =>
    (x.body?.length ?? 0) + (x.choices?.length ?? 0) * 30;
  const protectedFields = ["image", "imageDescription"];
  for (const q of qs) {
    if (typeof q.number !== "number") continue;
    q.subNumber = normalizeSubNumber(q.subNumber);
    const k = keyOf(q);
    const prev = map.get(k);
    if (!prev) {
      map.set(k, q);
      continue;
    }
    if (score(q) > score(prev)) {
      for (const f of protectedFields) {
        if (q[f] === undefined && prev[f] !== undefined) q[f] = prev[f];
      }
      map.set(k, q);
    } else {
      for (const f of protectedFields) {
        if (prev[f] === undefined && q[f] !== undefined) prev[f] = q[f];
      }
    }
  }
  return [...map.values()].sort(sortBySubKey);
}

// 同じキーは explanation が長い方を優先
function dedupAnswers(as) {
  const map = new Map();
  for (const a of as) {
    if (typeof a.number !== "number") continue;
    a.subNumber = normalizeSubNumber(a.subNumber);
    const score = (x) => (x.explanation?.length ?? 0) + (x.answer?.length ?? 0);
    const k = keyOf(a);
    const prev = map.get(k);
    if (!prev || score(a) > score(prev)) map.set(k, a);
  }
  return map;
}

function buildWindows(from, to, window, stride) {
  const wins = [];
  let s = from;
  while (s <= to) {
    const e = Math.min(s + window - 1, to);
    wins.push({ from: s, to: e });
    if (e === to) break;
    s += stride;
  }
  return wins;
}

// 古い v1 キャッシュ（questions のみ）と区別するため、出力に answers 配列が
// 含まれていなければ無効として扱う
function isValidCache(obj) {
  return (
    obj &&
    Array.isArray(obj.questions) &&
    Array.isArray(obj.answers) &&
    obj.version === CACHE_VERSION
  );
}

// ---------- answer-only extraction ----------
async function extractAnswerPages(openai, pdfDoc, year, args, cacheDir, hints) {
  if (!args.answerPages) return [];
  const totalPages = pdfDoc.numPages;
  // "last" sentinel を実際のページ番号に解決する
  const from =
    args.answerPages.from === "last" ? totalPages : args.answerPages.from;
  const to = args.answerPages.to === "last" ? totalPages : args.answerPages.to;
  if (to > totalPages) {
    throw new Error(`--answer-pages out of range. PDF has ${totalPages} pages.`);
  }
  console.log(`[${year}] answer-only pass on pages ${from}-${to}`);

  const pngs = [];
  for (let p = from; p <= to; p++) {
    const pngPath = await ensurePagePng(pdfDoc, year, p, args.scale, args.force);
    pngs.push(await fs.readFile(pngPath));
  }

  const cacheKey = path.join(
    cacheDir,
    `answers-${pad3(from)}-${pad3(to)}.json`
  );
  if (existsSync(cacheKey) && !args.force) {
    try {
      const cached = JSON.parse(await fs.readFile(cacheKey, "utf8"));
      if (cached.version === CACHE_VERSION && Array.isArray(cached.answers)) {
        console.log(
          `  [${year}] answer-pages ${from}-${to}: cached (${cached.answers.length} a)`
        );
        return cached.answers;
      }
    } catch {
      // 破損キャッシュは無視
    }
  }
  if (args.dryRun) {
    console.log(`  [${year}] answer-pages ${from}-${to}: dry-run skip`);
    return [];
  }

  const raw = await callVision(openai, pngs, {
    system: buildAnswerOnlySystem(hints),
    user: answerOnlyUserPrompt(year, from, to, totalPages),
  });
  const answers = Array.isArray(raw?.answers) ? raw.answers : [];
  await fs.writeFile(
    cacheKey,
    JSON.stringify({ version: CACHE_VERSION, answers }, null, 2)
  );
  console.log(
    `  [${year}] answer-pages ${from}-${to}: extracted ${answers.length} a`
  );
  return answers;
}

// ---------- main flow ----------
async function processYear(year, args) {
  const pdfPath = path.join(ROOT, `public/past-exams/${year}.pdf`);
  if (!existsSync(pdfPath)) throw new Error(`PDF not found: ${pdfPath}`);

  const buf = await fs.readFile(pdfPath);
  const pdfDoc = await getDocument({
    data: new Uint8Array(buf),
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;
  const totalPages = pdfDoc.numPages;
  const fromPage = args.pages?.from ?? 1;
  const toPage = args.pages?.to ?? totalPages;
  const windows = buildWindows(fromPage, toPage, args.window, args.stride);

  console.log(
    `[${year}] pages=${totalPages}, range ${fromPage}-${toPage}, ${windows.length} windows (window=${args.window}, stride=${args.stride})`
  );

  const cacheDir = path.join(ROOT, `.cache/exams/${year}`);
  await fs.mkdir(cacheDir, { recursive: true });

  const externalHints = await loadHints(year);
  if (externalHints) {
    const subs = Object.keys(externalHints.subMap).length;
    console.log(`  [${year}] external hints loaded: ${subs} sub-question groups`);
  }

  const openai = args.dryRun
    ? null
    : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  if (!args.dryRun && !process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  // PNG をすべて先に用意
  const pngPaths = new Map();
  for (let p = fromPage; p <= toPage; p++) {
    pngPaths.set(p, await ensurePagePng(pdfDoc, year, p, args.scale, args.force));
  }

  const collectedA = [];

  // 解答先行パス: --answer-pages 指定があれば、まず解答一覧をフル抽出し
  // sub-question 群を ground truth として抽出する。
  // ここで得た sub-map は問題 OCR の system prompt に注入される。
  let derivedSubMap = {};
  if (args.answerPages) {
    const extra = await extractAnswerPages(
      openai,
      pdfDoc,
      year,
      args,
      cacheDir,
      externalHints
    );
    collectedA.push(...extra);
    derivedSubMap = deriveSubMapFromAnswers(extra);
    const derivedCount = Object.keys(derivedSubMap).length;
    if (derivedCount > 0) {
      console.log(
        `  [${year}] derived sub-map from answers (${derivedCount}): ${formatSubMap(derivedSubMap)}`
      );
    } else if (extra.length > 0) {
      console.log(
        `  [${year}] no sub-questions detected in answer key (${extra.length} flat answers)`
      );
    }
  }

  const effectiveSubMap = mergeSubMaps(externalHints?.subMap, derivedSubMap);
  const effectiveHints =
    Object.keys(effectiveSubMap).length === 0
      ? externalHints
      : {
          subMap: effectiveSubMap,
          totalNumbers: externalHints?.totalNumbers ?? null,
          answerOverrides: externalHints?.answerOverrides ?? {},
          raw: externalHints?.raw ?? null,
        };
  if (effectiveHints) {
    console.log(
      `  [${year}] effective sub-map for question OCR: ${formatSubMap(effectiveHints.subMap)}`
    );
  }

  const collectedQ = [];

  for (const win of windows) {
    const cacheKey = path.join(
      cacheDir,
      `range-${pad3(win.from)}-${pad3(win.to)}.json`
    );
    let cached = null;
    if (existsSync(cacheKey) && !args.force) {
      try {
        const obj = JSON.parse(await fs.readFile(cacheKey, "utf8"));
        if (isValidCache(obj)) cached = obj;
      } catch {
        // 破損キャッシュは無視
      }
    }

    let result;
    if (cached) {
      result = cached;
      console.log(
        `  [${year}] win ${win.from}-${win.to}: cached (${cached.questions.length} q, ${cached.answers.length} a)`
      );
    } else if (args.dryRun) {
      console.log(`  [${year}] win ${win.from}-${win.to}: dry-run skip`);
      continue;
    } else {
      const buffers = [];
      for (let p = win.from; p <= win.to; p++) {
        buffers.push(await fs.readFile(pngPaths.get(p)));
      }
      const raw = await callVision(openai, buffers, {
        system: buildSystemPrompt(effectiveHints),
        user: userPromptFor(year, win.from, win.to, totalPages),
      });
      const questions = Array.isArray(raw?.questions) ? raw.questions : [];
      const answers = Array.isArray(raw?.answers) ? raw.answers : [];
      result = { version: CACHE_VERSION, questions, answers };
      await fs.writeFile(cacheKey, JSON.stringify(result, null, 2));
      console.log(
        `  [${year}] win ${win.from}-${win.to}: extracted ${questions.length} q / ${answers.length} a`
      );
    }
    collectedQ.push(...result.questions);
    collectedA.push(...result.answers);
  }

  // 解答は問題 OCR 前に既に取得済み (上の解答先行パス)。
  // 念のため、問題ページから読み取れた answers (混在ページ等) は collectedA に追加済み。

  if (args.dryRun) return;

  // dedup → 選択肢正規化
  const dedupedQ = dedupQuestions(collectedQ).map(normalizeChoices);
  const answerMap = dedupAnswers(collectedA);

  // answers-skeleton: 答案 + hint で期待される全 (number, subNumber) を骨格にする。
  // 1) 答案で entry を作り answer / explanation を埋める
  // 2) 問題 OCR の結果を (number, subNumber) で left-join し body / choices / type / image を充填
  // 3) 答案にも hint にも無い余剰 question は orphan として追加
  const expected = expectedKeys([...answerMap.values()], effectiveHints);
  const skeleton = buildSkeleton(expected, answerMap);
  const { merged, orphanCount, orphans } = mergeQuestionsIntoSkeleton(
    skeleton,
    dedupedQ
  );

  // 画像 bbox を切り出し public/exam-images/<year>/ に保存。image フィールドを imageRef 等に置換する。
  await attachImages(year, skeleton, pngPaths, args.force);

  // hint 由来の answerOverrides を最後に適用 (OCR 結果を ground truth で上書き)
  const overridesApplied = applyAnswerOverrides(skeleton, effectiveHints);

  // body 未抽出 entry に placeholder を入れる (UI/PDF で破綻させない)
  const missingBody = fillPlaceholders(skeleton);

  skeleton.sort(sortBySubKey);

  const final = skeleton.map((q) => ({
    id: `we-${year}-${pad3(q.number)}${q.subNumber ? `-${q.subNumber}` : ""}`,
    year,
    ...q,
  }));

  const outPath = path.join(ROOT, `src/data/exams/we-${year}.json`);
  await fs.writeFile(outPath, JSON.stringify(final, null, 2) + "\n");

  const withAnswer = final.filter((q) => q.answer).length;
  const withBody = final.length - missingBody;
  console.log(
    `[${year}] wrote ${final.length} entries (body=${withBody}/${final.length}, answer=${withAnswer}/${final.length}, merged-from-OCR=${merged}${overridesApplied > 0 ? `, overrides=${overridesApplied}` : ""}${orphanCount > 0 ? `, orphans=${orphanCount}` : ""}) -> ${outPath}`
  );

  if (missingBody > 0) {
    const missingKeys = skeleton
      .filter((e) => /\(本文未抽出/.test(e.body ?? ""))
      .map((e) => `${e.number}${e.subNumber ? `-${e.subNumber}` : ""}`);
    console.warn(
      `  warning: ${missingBody} entries have missing body: ${missingKeys.slice(0, 10).join(", ")}${missingKeys.length > 10 ? ", ..." : ""}`
    );
  }
  if (orphanCount > 0) {
    const sample = orphans
      .slice(0, 5)
      .map((o) => `${o.number}${o.subNumber ? `-${o.subNumber}` : ""}`)
      .join(", ");
    console.warn(
      `  warning: ${orphanCount} questions from OCR had no matching answer/hint entry (e.g. ${sample}${orphans.length > 5 ? ", ..." : ""})`
    );
  }

  // hint 検証: 期待される sub-question が漏れていないか、余計な sub が混ざっていないか
  if (effectiveHints && Object.keys(effectiveHints.subMap).length > 0) {
    validateAgainstHints(year, skeleton, answerMap, effectiveHints);
  }
}

function validateAgainstHints(year, questions, answerMap, hints) {
  const presentQ = new Set(questions.map(keyOf));
  const expected = new Set();
  for (const [n, subs] of Object.entries(hints.subMap)) {
    const num = Number(n);
    for (const s of subs) expected.add(`${num}|${s}`);
  }

  // 期待されるが結果に無い sub
  const missingSubQ = [...expected].filter((k) => !presentQ.has(k));
  if (missingSubQ.length > 0) {
    console.warn(
      `  [hint] missing sub-question entries (${missingSubQ.length}): ${missingSubQ
        .map((k) => k.replace("|", "-"))
        .join(", ")}`
    );
  }

  // hint には無いのに結果に subNumber が付いている (誤分離)
  const unexpectedSubQ = questions.filter((q) => {
    if (!q.subNumber) return false;
    return !expected.has(keyOf(q));
  });
  if (unexpectedSubQ.length > 0) {
    console.warn(
      `  [hint] unexpected sub-question entries (${unexpectedSubQ.length}): ${unexpectedSubQ
        .map((q) => `${q.number}-${q.subNumber}`)
        .join(", ")}`
    );
  }

  // hint で sub が無いはずなのに、本問が空 (= 誤って sub だけ吐き、本問が消えた) ケース
  const subParents = new Set(Object.keys(hints.subMap).map(Number));
  const presentMainNumbers = new Set(questions.map((q) => q.number));
  const orphanMain = [];
  for (const n of presentMainNumbers) {
    if (subParents.has(n)) continue; // sub がある問題はメイン entry 不要
    if (!questions.some((q) => q.number === n && !q.subNumber)) {
      orphanMain.push(n);
    }
  }
  if (orphanMain.length > 0) {
    console.warn(
      `  [hint] non-sub questions have only sub entries (${orphanMain.length}): ${orphanMain.join(", ")}`
    );
  }

  // 解答側の検証
  const missingSubA = [...expected].filter((k) => !answerMap.has(k));
  if (missingSubA.length > 0) {
    console.warn(
      `  [hint] missing sub-answer entries (${missingSubA.length}): ${missingSubA
        .map((k) => k.replace("|", "-"))
        .join(", ")}`
    );
  }
}

// ---------- entry ----------
async function main() {
  const args = parseArgs(process.argv);
  for (const year of args.years) {
    await processYear(year, args);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
