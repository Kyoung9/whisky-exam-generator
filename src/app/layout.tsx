import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Libre_Caslon_Text, Manrope } from "next/font/google";
import "./globals.css";

const libreCaslonText = Libre_Caslon_Text({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-libre-caslon-text",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "WhiskyQuest - ウイスキーエキスパート 予想問題ジェネレーター",
  description:
    "過去問題データをもとに AI が予想問題を生成し、PDF 問題集としてダウンロードできるアプリ。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`dark ${libreCaslonText.variable} ${manrope.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* アイコン用（next/font 非対応のため link のまま） */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- Material Symbols Outlined は next/font で未提供 */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background-deep text-on-surface min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
