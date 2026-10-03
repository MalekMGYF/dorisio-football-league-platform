import { DorisioMark } from "@/components/brand";

export default function Loading() {
  return (
    <div
      className="flex min-h-[70dvh] flex-col items-center justify-center gap-6"
      role="status"
      aria-live="polite"
      aria-label="جارٍ تحميل دوريسيو"
    >
      <DorisioMark size={64} className="text-pitch animate-pulse" />
      <div className="flex flex-col items-center gap-2">
        <p className="text-xl font-extrabold">دوريسيو</p>
        <p className="micro">LOADING MATCH CENTRE…</p>
      </div>
      <div className="h-1 w-44 overflow-hidden rounded-full bg-elevated">
        <div className="h-full w-1/3 animate-[loading_1.2s_ease-in-out_infinite] rounded-full bg-gold" />
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(120%); }
          100% { transform: translateX(-220%); }
        }
      `}</style>
    </div>
  );
}
