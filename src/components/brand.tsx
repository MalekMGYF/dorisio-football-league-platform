import type { SVGProps } from "react";

/**
 * The Dorisio mark — drawn by hand as vector path data so it scales, reverses
 * to a single colour and can be recoloured. A shield-ball monogram: the
 * football's pentagon seam forming a bold «د»-like counter.
 */
export function DorisioMark({
  size = 40,
  className = "",
  ...props
}: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="شعار دوريسيو"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="dorisio-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8C766" />
          <stop offset="52%" stopColor="#C9A227" />
          <stop offset="100%" stopColor="#8C6D14" />
        </linearGradient>
      </defs>
      {/* shield */}
      <path
        d="M32 2.5 60 11.4v20.9c0 14.6-10.6 24.4-28 29.2C14.6 56.7 4 46.9 4 32.3V11.4L32 2.5Z"
        fill="currentColor"
      />
      {/* inner shield bevel */}
      <path
        d="M32 7.6 55.2 15v17.3c0 11.9-8.7 20.1-23.2 24.2C17.5 52.4 8.8 44.2 8.8 32.3V15L32 7.6Z"
        fill="none"
        stroke="url(#dorisio-gold)"
        strokeWidth="1.6"
        opacity="0.85"
      />
      {/* ball body */}
      <path
        d="M32 16.4c8.8 0 15.9 7.1 15.9 15.9S40.8 48.2 32 48.2 16.1 41.1 16.1 32.3 23.2 16.4 32 16.4Z"
        fill="var(--color-ink, #0A0E0C)"
      />
      {/* central pentagon seam */}
      <path
        d="M32 23.2 38.4 27.8 35.9 35.4h-7.8L25.6 27.8 32 23.2Z"
        fill="url(#dorisio-gold)"
      />
      {/* seams radiating out */}
      <path
        d="M32 16.4v6.8M47.9 32.3l-9.5-4.5M39.7 45.4l-3.8-10M24.3 45.4l3.8-10M16.1 32.3l9.5-4.5"
        stroke="url(#dorisio-gold)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DorisioWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <DorisioMark size={34} className="text-pitch" />
      <span className="flex flex-col leading-none">
        <span className="text-[1.15rem] font-extrabold tracking-tight text-paper">دوريسيو</span>
        <span className="micro text-[0.56rem] text-dim">DORISIO</span>
      </span>
    </span>
  );
}
