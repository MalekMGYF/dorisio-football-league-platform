"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { DorisioMark } from "@/components/brand";
import { Button } from "@/components/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the failure for diagnostics instead of failing silently.
    console.error("[dorisio] runtime error", error);
  }, [error]);

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <DorisioMark size={64} className="mx-auto text-pitch" />
        <div className="mx-auto mt-6 grid size-14 place-items-center rounded-2xl border border-alert/40 bg-alert/12">
          <ShieldAlert size={26} className="text-alert" />
        </div>
        <h1 className="mt-5 text-3xl font-extrabold">حدث خطأ غير متوقع</h1>
        <p className="mt-3 max-w-md leading-relaxed text-muted">
          واجه دوريسيو مشكلة أثناء عرض هذه الصفحة. بياناتك المحفوظة على الجهاز سليمة —
          أعد المحاولة، وإذا استمرت المشكلة أبلغ مدير الدوري.
        </p>
        {error.digest && (
          <p className="micro mt-4">ERROR REF · {error.digest}</p>
        )}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button variant="gold" size="lg" onClick={reset}>
            <RefreshCw size={17} /> إعادة المحاولة
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            العودة للرئيسية
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
