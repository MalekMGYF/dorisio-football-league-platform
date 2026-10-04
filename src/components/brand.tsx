import type { ImgHTMLAttributes } from "react";

/** The uploaded Dorisio logo, reused consistently across the site and PWA UI. */
export function DorisioMark({
  size = 40,
  className = "",
  ...props
}: { size?: number } & Omit<ImgHTMLAttributes<HTMLImageElement>, "width" | "height">) {
  return (
    <img
      src="/logo.png"
      width={size}
      height={size}
      role="img"
      aria-label="شعار دوريسيو"
      className={`object-contain ${className}`}
      {...props}
    />
  );
}

export function DorisioWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <DorisioMark size={34} className="rounded-lg" />
      <span className="flex flex-col leading-none">
        <span className="text-[1.15rem] font-extrabold tracking-tight text-paper">دوريسيو</span>
        <span className="micro text-[0.56rem] text-dim">DORISIO</span>
      </span>
    </span>
  );
}
