"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/*
 * アーカイブ（学習ライブラリ）— Stitch HTML 参照
 * - lg+: 左サイドバー（モジュールナビ・地域一覧・進捗）
 * - ベントグリッド: 地形ビジュアル / キュレーターメモ / 本文 / ブックマーク・用語集
 * - 検索は地域名の絞り込みのみ（ダミーAPIなし）
 */

type MapMarker = {
  top: string;
  left: string;
  name: string;
  sub: string;
};

type RegionDetail = {
  id: string;
  name: string;
  nameEn: string;
  intro: string;
  distilleries: number;
  areaKm2: number | null;
  latitudeLabel: string | null;
  markers: MapMarker[];
  quote: string;
  curatorName: string;
  curatorRole: string;
  flavorTitle: string;
  flavorDesc: string;
  waterTitle: string;
  waterDesc: string;
  bodyLead: string;
  bodyHighlight: string;
  bodyTail: string;
  bodyClosing: string;
};

const REGIONS: RegionDetail[] = [
  {
    id: "highland",
    name: "ハイランド",
    nameEn: "Highlands",
    intro:
      "スコッチ生産の険しい中心地を象徴する広大で多様な領土。フローラルな香りと蜂蜜のような豊かな味わいが知られます。",
    distilleries: 47,
    areaKm2: 25780,
    latitudeLabel: "北緯 57°",
    markers: [
      {
        top: "33%",
        left: "50%",
        name: "ダルモア",
        sub: "シェリー由来の豊潤さ",
      },
      {
        top: "72%",
        left: "62%",
        name: "グレンモーレンジィ",
        sub: "スコットランド最高峰の蒸留器",
      },
    ],
    quote:
      "「ハイランドのスタイルを一言で定義するのは不可能だが、共通しているのは北海の厳しさに抗う不屈の精神である。」",
    curatorName: "アリステア・マクリーン博士",
    curatorRole: "主席アーキビスト",
    flavorTitle: "ヘザー＆ハニー",
    flavorDesc:
      "高地熟成に特有の、ドライで芳醇なヘザー（エリカ）の影響。",
    waterTitle: "花崗岩の流水",
    waterDesc:
      "古代の火山岩層で濾過された、ミネラル豊富な軟水。",
    bodyLead:
      "地理的にハイランドはスコットランドで最大のウイスキー生産地域です。南部のフローラルでエレガントなウイスキーから、北海岸の塩気を含んだピーティーなドラムまで幅があります。学習者は、",
    bodyHighlight: "北・南・東・西ハイランドという4つのサブリージョン",
    bodyTail:
      "を区別する必要があります。",
    bodyClosing:
      "蒸留スタイルはスペイサイドと比べ大きく頑丈な銅製ポットスチルが多く、官能評価で「オイリー」「ワキシー」と表される、ミディアム〜ヘビーなボディのテクスチャーが生まれます。",
  },
  {
    id: "islay",
    name: "アイラ",
    nameEn: "Islay",
    intro:
      "北大西洋の潮と重いピートが刻む、スモーキー原酒の聖地。海岸線に密集する蒸留所群が特徴です。",
    distilleries: 9,
    areaKm2: 620,
    latitudeLabel: "北緯 55°",
    markers: [
      {
        top: "45%",
        left: "48%",
        name: "ラフロイグ",
        sub: "医薬品のようなピート",
      },
    ],
    quote:
      "「潮の香りと泥炭は、ここでは風土そのものとして語られる。」",
    curatorName: "アリステア・マクリーン博士",
    curatorRole: "主席アーキビスト",
    flavorTitle: "ピート＆ブライニー",
    flavorDesc:
      "高濃度フェノールと海藻由来のミネラルが絡み合う重厚なプロフィール。",
    waterTitle: "軟水と泥炭層",
    waterDesc:
      "低硬度の水源が、泥炭由来の硫黄香を際立たせます。",
    bodyLead:
      "アイラは面積に対して蒸留所密度が極めて高く、",
    bodyHighlight: "各地域でピートの「表情」が異なる",
    bodyTail:
      "ことが試験対策の要点です。",
    bodyClosing:
      "南海岸と北東部では原酒のキレと甘みのバランスが変化します。ラフロイグ、アードベッグ、ボウモア等のスタイル対比を押さえましょう。",
  },
  {
    id: "speyside",
    name: "スペイサイド",
    nameEn: "Speyside",
    intro:
      "スペイ川流域に集中する繊細で果実味豊かなスタイル。シェリー樽熟成の教科書的地域です。",
    distilleries: 50,
    areaKm2: null,
    latitudeLabel: "北緯 57°",
    markers: [
      {
        top: "40%",
        left: "55%",
        name: "マッカラン",
        sub: "シェリー樽の象徴",
      },
    ],
    quote:
      "「川の曲がり角ごとに、別のフルーツの棚が開く。」",
    curatorName: "アリステア・マクリーン博士",
    curatorRole: "主席アーキビスト",
    flavorTitle: "シェリー＆ステーン",
    flavorDesc:
      "ドライフルーツ、オレンジピール、ナッツを思わせる上品な甘み。",
    waterTitle: "スペイ川流域",
    waterDesc:
      "花崗岩質の清らかな軟水が、軽やかな新酒の骨格を支えます。",
    bodyLead:
      "スペイサイドはスコッチの中核産地であり、",
    bodyHighlight: "蒸留所数と樽タイプのバリエーション",
    bodyTail:
      "が試験で問われやすい領域です。",
    bodyClosing:
      "リフィルバーボンとシェリーの使い分け、酒精度管理の基礎用語をアーカイブで整理しておくと安心です。",
  },
  {
    id: "lowland",
    name: "ローランド",
    nameEn: "Lowlands",
    intro:
      "穏やかな地形と三次蒸留の伝統。軽快で草本的なローキャンプが試験でも区別されます。",
    distilleries: 18,
    areaKm2: null,
    latitudeLabel: null,
    markers: [
      {
        top: "50%",
        left: "50%",
        name: "オーヘントッシャン",
        sub: "三次蒸留の軽やかさ",
      },
    ],
    quote:
      "「南の風は、銅の中で草の香りを運ぶ。」",
    curatorName: "アリステア・マクリーン博士",
    curatorRole: "主席アーキビスト",
    flavorTitle: "グラッシー＆シトラス",
    flavorDesc:
      "若い樽熟成で草本的・柑橘系のトーンが前面に出やすい。",
    waterTitle: "低地の軟水",
    waterDesc:
      "石灰岩地帯の水は硬度が低く、クリーンな発酵を助けます。",
    bodyLead:
      "ローランドは歴史的に",
    bodyHighlight: "三次蒸留と穏やかなピート",
    bodyTail:
      "の組み合わせで知られ、近年は新興蒸留所の再興も話題です。",
    bodyClosing:
      "ハイランドやスペイサイドとの官能対比（ボディの軽さ、フィニッシュの長さ）を整理しておきましょう。",
  },
  {
    id: "campbeltown",
    name: "キャンベルタウン",
    nameEn: "Campbeltown",
    intro:
      "かつて「世界のウイスキー首都」と呼ばれた港町。オイリーで複雑な海風キャラクターが残る希少地域です。",
    distilleries: 3,
    areaKm2: null,
    latitudeLabel: null,
    markers: [
      {
        top: "55%",
        left: "50%",
        name: "スプリングバンク",
        sub: "複雑系の代表格",
      },
    ],
    quote:
      "「港の倉庫に残る潮と油の記憶。」",
    curatorName: "アリステア・マクリーン博士",
    curatorRole: "主席アーキビスト",
    flavorTitle: "オイリー＆ブライニー",
    flavorDesc:
      "海風と重いスピリッツが混ざる独特の「噛みごたえ」。",
    waterTitle: "沿岸の硬水寄り",
    waterDesc:
      "ミネラル感がスピリッツの輪郭を太く見せます。",
    bodyLead:
      "キャンベルタウンは蒸留所数は少ない一方、",
    bodyHighlight: "地域スタイルの識別問題",
    bodyTail:
      "で差がつきやすいエリアです。",
    bodyClosing:
      "スプリングバンク、グレンスコシア、グレンガイルのプロファイル比較をアーカイブで復習してください。",
  },
  {
    id: "honshu",
    name: "本州",
    nameEn: "Honshu (Japan)",
    intro:
      "ミズナラ樽と精密な工程管理が特徴。スコッチとの対比が国際試験でも重要です。",
    distilleries: 12,
    areaKm2: null,
    latitudeLabel: null,
    markers: [
      {
        top: "48%",
        left: "52%",
        name: "山崎",
        sub: "ミズナラのインク香",
      },
    ],
    quote:
      "「楢の線維が時間を染める。」",
    curatorName: "アリステア・マクリーン博士",
    curatorRole: "主席アーキビスト",
    flavorTitle: "インク＆スパイス",
    flavorDesc:
      "楢由来のスパイス、線香、柑橘の重なり。",
    waterTitle: "軟水と技術的熟成",
    waterDesc:
      "多くの蒸留所で軟水と温度管理が品質の鍵。",
    bodyLead:
      "ジャパニーズでは",
    bodyHighlight: "樽種と熟成環境（倉庫温度）",
    bodyTail:
      "がスコッチと異なる論点になります。",
    bodyClosing:
      "スコッチの地域分類と並べて「なぜ違うのか」を短く説明できると試験で有利です。",
  },
  {
    id: "kentucky",
    name: "ケンタッキー",
    nameEn: "Kentucky",
    intro:
      "バーボンの中心地。コーン主体のマッシュと新樽熟成がフレーバーの骨格を作ります。",
    distilleries: 31,
    areaKm2: null,
    latitudeLabel: null,
    markers: [
      {
        top: "50%",
        left: "48%",
        name: "レジェンド蒸留所群",
        sub: "バーボントレイル",
      },
    ],
    quote:
      "「新樽のバニラは、コーンの甘さと契約している。」",
    curatorName: "アリステア・マクリーン博士",
    curatorRole: "主席アーキビスト",
    flavorTitle: "バニラ＆キャラメル",
    flavorDesc:
      "チャーしたアメリカンホワイトオーク新樽の甘みとスパイス。",
    waterTitle: "石灰岩帯の水",
    waterDesc:
      "鉄分を除いた硬水処理が伝統的に用いられます。",
    bodyLead:
      "バーボンでは",
    bodyHighlight: "マッシュビルと51%以上のコーン",
    bodyTail:
      "が法規定の核心です。",
    bodyClosing:
      "スコッチの「地域」ではなく「法規と原料」で整理するのが学習の近道です。",
  },
];

const SAVED_TOPICS = [
  { title: "ピートのPPMレベル", href: "#glossary" },
  { title: "熟成の化学", href: "#regional-features" },
  { title: "カスクストレングスの計算", href: "#regional-features" },
];

const GLOSSARY = [
  {
    term: "ワームタブ (Worm Tubs)",
    def: "伝統的なコイル冷却システム。重厚で硫黄のようなスピリッツの輪郭を生み出します。",
  },
  {
    term: "ラインアーム (Lyne Arm)",
    def: "蒸留器の頂部から伸びる水平のパイプ。角度が還流（リフラックス）の量を決定します。",
  },
];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

type ArchiveLibraryProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

export function ArchiveLibrary({ query, onQueryChange }: ArchiveLibraryProps) {
  const [regionId, setRegionId] = useState(REGIONS[0]!.id);

  const region = useMemo(
    () => REGIONS.find((r) => r.id === regionId) ?? REGIONS[0]!,
    [regionId],
  );

  const filteredRegions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return REGIONS;
    return REGIONS.filter(
      (r) =>
        r.name.includes(query) ||
        r.nameEn.toLowerCase().includes(q) ||
        r.intro.includes(query),
    );
  }, [query]);

  useEffect(() => {
    if (
      filteredRegions.length > 0 &&
      !filteredRegions.some((r) => r.id === regionId)
    ) {
      setRegionId(filteredRegions[0]!.id);
    }
  }, [filteredRegions, regionId]);

  return (
    <main className="selection:bg-amber-gold selection:text-background-deep mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-[calc(5rem+env(safe-area-inset-top,0px)+1rem)] md:pb-8 lg:flex-row lg:pb-10">
      {/* 左サイドバー（lg+） */}
      <aside className="border-glass-stroke hidden h-[calc(100dvh-5rem-env(safe-area-inset-top,0px))] w-72 shrink-0 flex-col overflow-y-auto border-r p-4 lg:flex">
        <div className="mb-10">
          <h3 className="text-label-caps text-amber-gold mb-6 font-[family-name:var(--font-label-caps)] tracking-widest opacity-60">
            ライブラリモジュール
          </h3>
          <nav className="space-y-4" aria-label="モジュールへジャンプ">
            <button
              type="button"
              onClick={() => scrollToId("regional-features")}
              className="group flex w-full items-center gap-3 text-left"
            >
              <span className="material-symbols-outlined text-amber-gold transition-transform group-hover:scale-110">
                history_edu
              </span>
              <span className="text-title-md text-on-surface group-hover:text-amber-gold font-[family-name:var(--font-title-md)]">
                蒸留の歴史
              </span>
            </button>
            <button
              type="button"
              onClick={() => scrollToId("regional-features")}
              className="group flex w-full items-center gap-3 text-left"
            >
              <span className="material-symbols-outlined text-amber-gold transition-transform group-hover:scale-110">
                science
              </span>
              <span className="text-title-md text-on-surface group-hover:text-amber-gold font-[family-name:var(--font-title-md)]">
                有機化学
              </span>
            </button>
            <button
              type="button"
              onClick={() => scrollToId("region-nav")}
              className="group flex w-full items-center gap-3 text-left"
            >
              <span className="material-symbols-outlined text-amber-gold transition-transform group-hover:scale-110">
                public
              </span>
              <span className="text-title-md text-amber-gold border-amber-gold/30 border-b pb-0.5 font-[family-name:var(--font-title-md)]">
                グローバル地域
              </span>
            </button>
            <button
              type="button"
              onClick={() => scrollToId("glossary")}
              className="group flex w-full items-center gap-3 text-left"
            >
              <span className="material-symbols-outlined text-amber-gold transition-transform group-hover:scale-110">
                gavel
              </span>
              <span className="text-title-md text-on-surface group-hover:text-amber-gold font-[family-name:var(--font-title-md)]">
                法的規制
              </span>
            </button>
          </nav>
        </div>

        <div className="mb-10" id="region-nav">
          <h3 className="text-label-caps text-amber-gold mb-6 font-[family-name:var(--font-label-caps)] tracking-widest opacity-60">
            地域アーカイブ
          </h3>
          <ul className="space-y-2">
            {filteredRegions.length === 0 ? (
              <li className="text-body-sm text-on-surface-variant pl-2 font-[family-name:var(--font-body-sm)]">
                該当する地域がありません
              </li>
            ) : (
              filteredRegions.map((r) => {
                const active = r.id === regionId;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setRegionId(r.id)}
                      className={`text-body-lg border-l pl-2 text-left font-[family-name:var(--font-body-lg)] transition-colors ${
                        active
                          ? "border-amber-gold text-amber-gold"
                          : "text-on-surface-variant hover:text-amber-gold border-transparent"
                      }`}
                    >
                      {r.name}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="glass-panel mt-auto rounded-xl p-4">
          <p className="text-label-caps text-on-surface-variant mb-2 text-[10px] font-[family-name:var(--font-label-caps)]">
            学問の進捗
          </p>
          <div className="bg-surface-container-highest h-1 w-full overflow-hidden rounded-full">
            <div className="bg-amber-gold h-full w-[65%] rounded-full" />
          </div>
          <p className="text-label-caps text-amber-gold mt-2 text-right text-[10px] font-[family-name:var(--font-label-caps)]">
            アーカイブの65%を読了
          </p>
        </div>
      </aside>

      {/* メインワークスペース */}
      <section className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 md:gap-8 md:px-8">
        {/* モバイルのみ: ヘッダーと同期する検索（md+ は AppHeader 内） */}
        <div className="relative w-full max-w-md md:hidden">
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="アーカイブを検索..."
            aria-label="地域・概要を検索"
            className="text-body-sm border-glass-stroke focus:border-amber-gold w-full border-0 border-b bg-transparent py-2 pr-10 pl-2 font-[family-name:var(--font-body-sm)] outline-none ring-0 transition-colors"
          />
          <span
            className="material-symbols-outlined text-on-surface-variant pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          >
            search
          </span>
        </div>

        <nav
          className="text-on-surface-variant flex flex-wrap items-center gap-2 font-[family-name:var(--font-label-caps)] text-[10px]"
          aria-label="パンくず"
        >
          <span>アーカイブ</span>
          <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
            chevron_right
          </span>
          <span>グローバル地域</span>
          <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
            chevron_right
          </span>
          <span className="text-amber-gold">{region.name}地方</span>
        </nav>

        <div className="flex flex-col justify-end gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-headline-lg text-on-surface font-[family-name:var(--font-headline-lg)]">
              {region.name}地方 ({region.nameEn})
            </h1>
            <p className="text-body-lg text-on-surface-variant mt-2 max-w-2xl font-[family-name:var(--font-body-lg)]">
              {region.intro}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              aria-label="ブックマーク"
              className="glass-panel hover:border-amber-gold rounded-lg border p-2 transition-colors"
            >
              <span className="material-symbols-outlined text-amber-gold">bookmark</span>
            </button>
            <button
              type="button"
              aria-label="共有"
              className="glass-panel hover:border-amber-gold rounded-lg border p-2 transition-colors"
            >
              <span className="material-symbols-outlined text-amber-gold">share</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-8">
          {/* インタラクティブ地形ビジュアル */}
          <div className="glass-panel relative min-h-[320px] overflow-hidden rounded-xl md:col-span-8 md:min-h-[400px]">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
              style={{ backgroundImage: "url(/waldrebell.jpg)" }}
              aria-hidden="true"
            />
            <div className="relative z-10 flex h-full min-h-[320px] flex-col justify-between p-6 md:min-h-[400px]">
              <div className="flex items-start justify-between">
                <span className="text-background-deep font-[family-name:var(--font-label-caps)] rounded-full bg-amber-gold px-3 py-1 text-[10px]">
                  インタラクティブ地形図
                </span>
                {region.latitudeLabel ? (
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-headline-lg text-amber-gold font-[family-name:var(--font-headline-lg)]">
                      {region.latitudeLabel}
                    </span>
                    <span className="text-label-caps text-[10px] opacity-60 font-[family-name:var(--font-label-caps)]">
                      緯度座標
                    </span>
                  </div>
                ) : (
                  <span className="text-label-caps text-on-surface-variant text-[10px] font-[family-name:var(--font-label-caps)]">
                    緯度表示なし
                  </span>
                )}
              </div>

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center md:pointer-events-auto">
                <div className="relative h-full w-full">
                  {region.markers.map((m) => (
                    <div
                      key={m.name}
                      className="group absolute cursor-pointer"
                      style={{ top: m.top, left: m.left, transform: "translate(-50%, -50%)" }}
                    >
                      <div className="bg-amber-gold h-3 w-3 animate-pulse rounded-full md:animate-none md:group-hover:animate-pulse" />
                      <div className="glass-panel absolute bottom-full left-1/2 z-20 mb-2 w-32 origin-bottom scale-0 rounded p-2 transition-transform group-hover:scale-100">
                        <p className="text-label-caps text-amber-gold text-[10px] font-[family-name:var(--font-label-caps)]">
                          {m.name}
                        </p>
                        <p className="text-[9px] text-white/80">{m.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 flex flex-wrap gap-4">
                {region.areaKm2 != null && (
                  <div className="glass-panel border-l-amber-gold rounded-lg border-l-2 p-3">
                    <p className="text-label-caps text-[10px] opacity-60 font-[family-name:var(--font-label-caps)]">
                      地方の面積
                    </p>
                    <p className="text-title-md font-[family-name:var(--font-title-md)]">
                      {region.areaKm2.toLocaleString("ja-JP")} km²
                    </p>
                  </div>
                )}
                <div className="glass-panel border-l-amber-gold rounded-lg border-l-2 p-3">
                  <p className="text-label-caps text-[10px] opacity-60 font-[family-name:var(--font-label-caps)]">
                    稼働中の蒸留所
                  </p>
                  <p className="text-title-md font-[family-name:var(--font-title-md)]">
                    {region.distilleries} 箇所
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* キュレーターのメモ */}
          <div className="glass-panel border-t-amber-gold/30 flex flex-col gap-4 rounded-xl border-t p-6 md:col-span-4">
            <div className="flex items-center gap-3">
              <span
                className="material-symbols-outlined text-amber-gold"
                style={{ fontVariationSettings: '"FILL" 1' }}
                aria-hidden="true"
              >
                editor_choice
              </span>
              <h4 className="text-label-caps text-amber-gold font-[family-name:var(--font-label-caps)]">
                キュレーターのメモ
              </h4>
            </div>
            <blockquote className="text-headline-lg-mobile text-on-surface font-[family-name:var(--font-headline-lg)] leading-snug opacity-90 italic">
              {region.quote}
            </blockquote>
            <div className="mt-4 flex items-center gap-3">
              <div className="border-glass-stroke flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-cask-brown">
                <span className="text-amber-gold text-xs font-bold">M</span>
              </div>
              <div>
                <p className="text-label-caps text-on-surface text-[11px] font-[family-name:var(--font-label-caps)]">
                  {region.curatorName}
                </p>
                <p className="text-label-caps text-on-surface-variant text-[9px] font-[family-name:var(--font-label-caps)]">
                  {region.curatorRole}
                </p>
              </div>
            </div>
          </div>

          {/* 本文 */}
          <div
            className="glass-panel rounded-xl p-6 md:col-span-8 md:p-8"
            id="regional-features"
          >
            <h3 className="text-headline-lg text-on-surface mb-6 font-[family-name:var(--font-headline-lg)]">
              地域的特徴
            </h3>
            <div className="max-w-none space-y-6">
              <p className="text-body-lg text-on-surface-variant font-[family-name:var(--font-body-lg)] leading-relaxed">
                {region.bodyLead}
                <span className="border-amber-gold/30 text-amber-gold border-b">
                  {region.bodyHighlight}
                </span>
                {region.bodyTail}
              </p>
              <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
                <div className="border-glass-stroke bg-surface-container-low rounded-lg border p-4">
                  <span className="text-label-caps text-amber-gold text-[10px] font-[family-name:var(--font-label-caps)]">
                    フレーバープロフィール
                  </span>
                  <h5 className="text-title-md mt-1 font-[family-name:var(--font-title-md)]">
                    {region.flavorTitle}
                  </h5>
                  <p className="text-body-sm text-on-surface-variant mt-2 font-[family-name:var(--font-body-sm)]">
                    {region.flavorDesc}
                  </p>
                </div>
                <div className="border-glass-stroke bg-surface-container-low rounded-lg border p-4">
                  <span className="text-label-caps text-amber-gold text-[10px] font-[family-name:var(--font-label-caps)]">
                    水源
                  </span>
                  <h5 className="text-title-md mt-1 font-[family-name:var(--font-title-md)]">
                    {region.waterTitle}
                  </h5>
                  <p className="text-body-sm text-on-surface-variant mt-2 font-[family-name:var(--font-body-sm)]">
                    {region.waterDesc}
                  </p>
                </div>
              </div>
              <p className="text-body-lg text-on-surface-variant font-[family-name:var(--font-body-lg)] leading-relaxed">
                {region.bodyClosing}
              </p>
            </div>
          </div>

          {/* ブックマーク + 用語集 */}
          <div className="flex flex-col gap-6 md:col-span-4" id="glossary">
            <div className="glass-panel rounded-xl p-6">
              <h4 className="text-label-caps text-amber-gold mb-4 font-[family-name:var(--font-label-caps)]">
                保存されたカスク (ブックマーク)
              </h4>
              <div className="space-y-3">
                {SAVED_TOPICS.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => scrollToId(item.href.slice(1))}
                    className="group hover:bg-white/5 flex w-full cursor-pointer items-center justify-between rounded-lg p-2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="material-symbols-outlined text-on-surface-variant text-[20px]"
                        aria-hidden="true"
                      >
                        description
                      </span>
                      <span className="text-body-sm text-left font-[family-name:var(--font-body-sm)]">
                        {item.title}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-amber-gold scale-0 transition-transform group-hover:scale-100">
                      arrow_forward
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel flex flex-1 flex-col rounded-xl border border-amber-gold/10 p-6">
              <h4 className="text-label-caps text-amber-gold mb-4 font-[family-name:var(--font-label-caps)]">
                用語集
              </h4>
              <div className="space-y-4">
                {GLOSSARY.map((g) => (
                  <div key={g.term}>
                    <p className="text-label-caps text-on-surface text-[11px] font-[family-name:var(--font-label-caps)]">
                      {g.term}
                    </p>
                    <p className="text-body-sm text-on-surface-variant font-[family-name:var(--font-body-sm)]">
                      {g.def}
                    </p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="text-label-caps border-glass-stroke hover:border-amber-gold mt-6 w-full border py-2 text-[10px] transition-colors font-[family-name:var(--font-label-caps)]"
              >
                全240項目を表示
              </button>
            </div>

            <div className="glass-panel rounded-xl p-6 md:hidden">
              <h4 className="text-label-caps text-amber-gold mb-3 font-[family-name:var(--font-label-caps)]">
                演習へ
              </h4>
              <p className="text-body-sm text-on-surface-variant mb-4 font-[family-name:var(--font-body-sm)]">
                読了後はテイスティングで定着を確認できます。
              </p>
              <Link
                href="/tasting"
                className="amber-cta inline-flex w-full justify-center text-center"
              >
                テイスティングを開く
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
