"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { LeagueTable } from "@/components/standings";
import { PlayerAvatar } from "@/components/player";
import { TeamCrest } from "@/components/crest";
import { Button, EmptyState, Panel, Skeleton, cn } from "@/components/ui";
import { useApiData } from "@/lib/client/hooks";
import type { OverviewPayload } from "@/lib/types";

export default function TablePage() {
  const { data, loading, error, reload } = useApiData<OverviewPayload>("/api/overview", "overview");
  const teams = data?.teams ?? [];
  const standings = data?.standings ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <div className="flex flex-col gap-2">
        <p className="micro">LEAGUE TABLE</p>
        <h1 className="text-[clamp(2.1rem,6vw,3.4rem)] font-extrabold leading-tight">
          جدول الترتيب
        </h1>
        <p className="mt-2 max-w-2xl text-muted leading-relaxed">
          يُحتسب الترتيب تلقائياً بعد كل مباراة نهائية: الفوز 3 نقاط، التعادل نقطة، والخسارة
          صفر. عند التساوي يُعتمد فارق الأهداف ثم الأهداف المسجّلة.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          {loading && !data ? (
            <Skeleton className="h-[28rem] rounded-2xl" />
          ) : error && !data ? (
            <Panel>
              <EmptyState
                title="تعذّر تحميل الترتيب"
                body={error}
                action={<Button onClick={reload}>إعادة المحاولة</Button>}
              />
            </Panel>
          ) : standings.length === 0 ? (
            <Panel>
              <EmptyState
                icon={<Trophy size={26} />}
                title="الترتيب غير متاح بعد"
                body="يبدأ احتساب الترتيب فور لعب أول مباراة في الدوري."
              />
            </Panel>
          ) : (
            <Panel className="p-2 sm:p-5">
              <LeagueTable rows={standings} teams={teams} />
              <div className="mt-4 flex flex-wrap items-center gap-4 px-2 text-[0.76rem] text-dim">
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-0.5 rounded-full bg-gold" /> المراكز الثلاثة الأولى
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3.5 rounded-md border border-live/35 bg-live/18 text-live grid place-items-center num text-[0.6rem]">
                    W
                  </span>
                  فوز
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3.5 rounded-md border border-line bg-elevated grid place-items-center num text-[0.6rem]">
                    D
                  </span>
                  تعادل
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3.5 rounded-md border border-alert/35 bg-alert/16 text-alert grid place-items-center num text-[0.6rem]">
                    L
                  </span>
                  خسارة
                </span>
              </div>
            </Panel>
          )}
        </div>

        <aside className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold mb-3">أفضل الهدافين</h2>
            <Panel className="divide-y divide-line-soft">
              {(data?.topScorers ?? []).slice(0, 6).map((player, index) => (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                >
                  <span
                    className={cn(
                      "num w-6 text-center font-bold",
                      index === 0 ? "text-gold-light" : "text-dim",
                    )}
                  >
                    {index + 1}
                  </span>
                  <PlayerAvatar player={player} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.92rem] font-bold">{player.name}</p>
                    <p className="truncate text-[0.74rem] text-dim">{player.teamName}</p>
                  </div>
                  <span className="num text-lg font-bold text-gold-light">
                    {player.stats.goals}
                  </span>
                </Link>
              ))}
              {(data?.topScorers ?? []).length === 0 && (
                <EmptyState title="لا توجد بيانات هجومية بعد" />
              )}
            </Panel>
          </div>

          <div>
            <h2 className="text-lg font-extrabold mb-3">حالة الفرق</h2>
            <Panel className="divide-y divide-line-soft">
              {teams.slice(0, 6).map((team) => (
                <Link
                  key={team.id}
                  href={`/teams/${team.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                >
                  <TeamCrest team={team} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.92rem] font-bold">{team.name}</p>
                    <div className="mt-1 flex items-center gap-1">
                      {team.form.length === 0 && (
                        <span className="text-[0.72rem] text-dim">لا توجد مباريات</span>
                      )}
                      {team.form.map((letter, index) => (
                        <motion.span
                          key={index}
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "num size-4.5 rounded border text-[0.62rem] font-bold grid place-items-center",
                            letter === "W"
                              ? "border-live/35 bg-live/18 text-live"
                              : letter === "L"
                                ? "border-alert/35 bg-alert/16 text-alert"
                                : "border-line bg-elevated text-muted",
                          )}
                        >
                          {letter}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                  <span className="num text-sm font-bold text-muted">
                    {team.stats?.points ?? 0} PTS
                  </span>
                </Link>
              ))}
            </Panel>
          </div>
        </aside>
      </div>
    </div>
  );
}
