"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { TeamCrest } from "@/components/crest";
import { Button, EmptyState, Panel, Pill, Skeleton } from "@/components/ui";
import { useApiData } from "@/lib/client/hooks";
import type { OverviewPayload } from "@/lib/types";

export default function TeamsPage() {
  const { data, loading, error, reload } = useApiData<OverviewPayload>("/api/overview", "overview");
  const teams = data?.teams ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <div className="flex flex-col gap-2">
        <p className="micro">TEAMS</p>
        <h1 className="text-[clamp(2.1rem,6vw,3.4rem)] font-extrabold leading-tight">الفرق</h1>
        <p className="mt-2 max-w-2xl text-muted leading-relaxed">
          كل فرق الدوري مع القوائم والنتائج والتشكيلة الحالية وآخر المباريات.
        </p>
      </div>

      <div className="mt-8">
        {loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : error && !data ? (
          <Panel>
            <EmptyState
              title="تعذّر تحميل الفرق"
              body={error}
              action={<Button onClick={reload}>إعادة المحاولة</Button>}
            />
          </Panel>
        ) : teams.length === 0 ? (
          <Panel>
            <EmptyState
              icon={<Users size={26} />}
              title="لا توجد فرق مسجّلة"
              body="يقوم مدير الدوري بإضافة الفرق من لوحة الإدارة."
            />
          </Panel>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team, index) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.42, delay: Math.min(index * 0.05, 0.3) }}
              >
                <Link
                  href={`/teams/${team.id}`}
                  className="group block overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-gold/45"
                  style={{ boxShadow: "var(--shadow-soft)" }}
                >
                  <div
                    className="relative h-24"
                    style={{
                      background: `linear-gradient(140deg, ${team.primaryColor} 0%, #0A0E0C 80%)`,
                    }}
                  >
                    <div className="absolute inset-0 pitch-lines opacity-30" />
                    <div className="absolute bottom-0 right-4 translate-y-1/2">
                      <TeamCrest team={team} size={62} className="ring-2 ring-ink/70" />
                    </div>
                    <span className="num absolute left-4 top-3 text-3xl font-bold text-white/20">
                      {team.stats?.position ?? "—"}
                    </span>
                  </div>
                  <div className="px-4 pb-4 pt-9">
                    <h2 className="text-lg font-extrabold">{team.name}</h2>
                    <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: "MP", value: team.stats?.played ?? 0 },
                        { label: "W", value: team.stats?.won ?? 0 },
                        { label: "GD", value: team.stats?.goalDifference ?? 0 },
                        { label: "PTS", value: team.stats?.points ?? 0 },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-lg border border-line bg-elevated/50 py-2">
                          <p className="num text-lg font-bold">{stat.value}</p>
                          <p className="micro text-[0.55rem]">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Pill tone="neutral">{team.squadCount} لاعباً</Pill>
                      <div className="flex items-center gap-1">
                        {team.form.map((letter, i) => (
                          <span
                            key={i}
                            className="num size-4.5 rounded border border-line bg-elevated text-[0.62rem] grid place-items-center text-muted"
                          >
                            {letter}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
