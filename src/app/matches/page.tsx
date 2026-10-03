"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Filter } from "lucide-react";
import { MatchCard } from "@/components/match";
import { Button, EmptyState, Panel, Skeleton, cn } from "@/components/ui";
import { useApiData } from "@/lib/client/hooks";
import type { OverviewPayload } from "@/lib/types";

const FILTERS = [
  { value: "all", label: "الكل" },
  { value: "live", label: "مباشر" },
  { value: "scheduled", label: "قادمة" },
  { value: "ft", label: "انتهت" },
] as const;

export default function MatchesPage() {
  const { data, loading, error, reload } = useApiData<OverviewPayload>("/api/overview", "overview");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [round, setRound] = useState<number | null>(null);

  const matches = data?.matches ?? [];
  const rounds = useMemo(
    () => Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b),
    [matches],
  );

  const visible = matches.filter((match) => {
    if (filter === "live") return match.status === "live" || match.status === "ht";
    if (filter === "scheduled") return match.status === "scheduled";
    if (filter === "ft") return match.status === "ft";
    return true;
  });

  const shown = round ? visible.filter((m) => m.round === round) : visible;
  const ordered = [...shown].sort((a, b) => {
    const rank = (status: string) => (status === "live" ? 0 : status === "scheduled" ? 1 : 2);
    return rank(a.status) - rank(b.status) || a.kickoffAt.getTime() - b.kickoffAt.getTime();
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <div className="flex flex-col gap-6">
        <div>
          <p className="micro">FIXTURES & RESULTS</p>
          <h1 className="mt-2 text-[clamp(2.1rem,6vw,3.4rem)] font-extrabold leading-tight">
            المباريات
          </h1>
          <p className="mt-3 max-w-2xl text-muted leading-relaxed">
            كل مباريات الدوري في مكان واحد — القادمة، المباشرة، والنتائج الكاملة مع الخط
            الزمني للأحداث.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={cn(
                "rounded-xl border px-4 py-2 text-[0.86rem] font-bold transition-colors",
                filter === item.value
                  ? "border-gold/60 bg-gold/12 text-gold-light"
                  : "border-line bg-surface text-muted hover:text-paper hover:border-gold/40",
              )}
            >
              {item.label}
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-line" />
          <button
            onClick={() => setRound(null)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[0.82rem] font-bold transition-colors",
              round === null
                ? "border-pitch/60 bg-pitch/15 text-live"
                : "border-line text-muted hover:text-paper",
            )}
          >
            <Filter size={14} /> كل الجولات
          </button>
          <div className="flex items-center gap-1.5 overflow-x-auto scroll-x">
            {rounds.map((value) => (
              <button
                key={value}
                onClick={() => setRound(value)}
                className={cn(
                  "num shrink-0 rounded-lg border px-3 py-2 text-[0.86rem] font-bold transition-colors",
                  round === value
                    ? "border-pitch/60 bg-pitch/15 text-live"
                    : "border-line text-muted hover:text-paper",
                )}
              >
                J{value}
              </button>
            ))}
          </div>
        </div>

        {loading && !data ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : error && !data ? (
          <Panel>
            <EmptyState
              title="تعذّر تحميل المباريات"
              body={error}
              action={<Button onClick={reload}>إعادة المحاولة</Button>}
            />
          </Panel>
        ) : ordered.length === 0 ? (
          <Panel>
            <EmptyState
              icon={<CalendarDays size={26} />}
              title="لا توجد مباريات في هذا التصنيف"
              body="جرّب تغيير الفلاتر أو اختر جولة أخرى لعرض مبارياتها."
            />
          </Panel>
        ) : (
          <motion.div layout className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ordered.map((match, index) => (
              <MatchCard key={match.id} match={match} events={match.events} index={index} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
