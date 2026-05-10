import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ウイスキーエキスパート 予想問題ジェネレーター",
  description:
    "過去問題データをもとに AI が予想問題を生成し、PDF 問題集としてダウンロードできるアプリ。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
