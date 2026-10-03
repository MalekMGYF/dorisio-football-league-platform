import Link from "next/link";
import { DorisioMark } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <DorisioMark size={64} className="text-pitch" />
      <p className="micro mt-6">404 · NOT FOUND</p>
      <h1 className="mt-3 text-[clamp(2.2rem,7vw,3.6rem)] font-extrabold leading-tight">
        الصفحة غير موجودة
      </h1>
      <p className="mt-3 max-w-md leading-relaxed text-muted">
        ربما تغيّر الرابط أو حُذف المحتوى. يمكنك العودة إلى الرئيسية أو تصفح مباريات
        الدوري وترتيبه.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-gold px-6 py-3 font-bold text-ink transition-colors hover:bg-gold-light"
        >
          الرئيسية
        </Link>
        <Link
          href="/matches"
          className="rounded-xl border border-line px-6 py-3 font-bold transition-colors hover:border-gold/60"
        >
          المباريات
        </Link>
        <Link
          href="/table"
          className="rounded-xl border border-line px-6 py-3 font-bold transition-colors hover:border-gold/60"
        >
          الترتيب
        </Link>
      </div>
    </div>
  );
}
