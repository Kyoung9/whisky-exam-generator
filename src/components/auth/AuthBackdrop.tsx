import Image from "next/image";

/**
 * /login \u00b7 /signup \u5171\u901a\u306e\u30e9\u30a4\u30d6\u30e9\u30ea\u30fc\u80cc\u666f
 * waldrebell.jpg \u3092\u96f0\u56f2\u6c17\u80cc\u666f\u3068\u3057\u3066\u30dc\u30b1\u8868\u793a
 */
export function AuthBackdrop() {
  return (
    <div className="fixed inset-0 z-0">
      <div className="from-background-deep/80 via-background-deep/40 to-background-deep/90 absolute inset-0 z-10 bg-gradient-to-b" />
      <Image
        src="/waldrebell.jpg"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-40 blur-md grayscale-[0.2]"
      />
    </div>
  );
}
