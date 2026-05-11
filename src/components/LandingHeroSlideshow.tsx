"use client";

import { useEffect, useState } from "react";

/*
 * ランディングページ左カラムのヒーロー画像スライドショー
 * - 2 枚の写真を一定間隔でクロスフェード
 * - object-cover で container にクロップ合わせ
 * - prefers-reduced-motion を尊重し、その場合は切り替えのみ即時
 */

type Slide = {
  src: string;
  alt: string;
};

const SLIDES: Slide[] = [
  {
    src: "/waldrebell.jpg",
    alt: "ダークな書斎の机上、重厚なクリスタルデキャンタとグラスに注がれた琥珀色のウイスキー。",
  },
  {
    src: "/whisky.jpg",
    alt: "マーブルテーブルの上、クリスタルグラスに注がれたオレンジピール添えのウイスキーカクテル。",
  },
];

/* 切替の体感:
 * - HOLD_MS: 1 枚を完全に見せている時間
 * - FADE_MS: クロスフェードに掛ける時間 (長めにして緩やかに溶け合わせる)
 * - 合計サイクル = HOLD_MS + FADE_MS
 */
const HOLD_MS = 7000;
const FADE_MS = 3500;
// "ease-in-out" よりさらに緩やかな曲線。両端をなだらかにして急変を抑える
const FADE_EASING = "cubic-bezier(0.65, 0, 0.35, 1)";

export function LandingHeroSlideshow() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const cycle = (reduceMotion ? HOLD_MS * 2 : HOLD_MS) + FADE_MS;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % SLIDES.length);
    }, cycle);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0">
      {SLIDES.map((slide, i) => {
        const isActive = i === active;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            aria-hidden={isActive ? undefined : true}
            // クロスフェードに加え、極めて緩やかな zoom (Ken Burns) を併用して
            // フェードの "切れ目" を視覚的に隠す
            className="absolute inset-0 h-full w-full object-cover will-change-[opacity,transform] motion-reduce:transition-none motion-reduce:transform-none"
            style={{
              opacity: isActive ? 1 : 0,
              transform: isActive ? "scale(1.04)" : "scale(1)",
              transitionProperty: "opacity, transform",
              transitionDuration: `${FADE_MS}ms, ${HOLD_MS + FADE_MS}ms`,
              transitionTimingFunction: `${FADE_EASING}, linear`,
            }}
          />
        );
      })}
    </div>
  );
}
