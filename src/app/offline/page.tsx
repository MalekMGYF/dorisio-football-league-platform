import Link from "next/link";
import { DorisioMark } from "@/components/brand";

export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
      <DorisioMark size={72} className="text-pitch" />
      <h1 className="mt-6 text-3xl font-extrabold">أنت غير متصل بالإنترنت</h1>
      <p className="mt-3 text-muted leading-relaxed">
        لا تقلق — دوريسيو يعمل دون اتصال. يمكنك تصفح آخر بيانات محفوظة على جهازك (الدوري،
        الفرق، المباريات، الترتيب واللاعبين)، وستتم مزامنة أي تغييرات تلقائياً فور عودة
        الاتصال.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-gold px-6 py-3 font-bold text-ink transition-colors hover:bg-gold-light"
        >
          العودة للرئيسية
        </Link>
        <Link
          href="/table"
          className="rounded-xl border border-line px-6 py-3 font-bold text-paper transition-colors hover:border-gold/60"
        >
          جدول الترتيب المحفوظ
        </Link>
      </div>
    </div>
  );
}
