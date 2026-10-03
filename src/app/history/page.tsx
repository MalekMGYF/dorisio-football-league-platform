"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Award, CalendarDays, Crown, History as HistoryIcon, Trophy } from "lucide-react";
import { TeamCrest } from "@/components/crest";
import { PlayerAvatar } from "@/components/player";
import { Button, EmptyState, Panel, Pill, Skeleton, cn } from "@/components/ui";
import { useApiData } from "@/lib/client/hooks";
import { AWARD_TYPE_AR, LEAGUE_STATUS_AR } from "@/lib/domain";

interface LeagueRow {
  id: string;
  name: string;
  season: string;
  status: string;
  venue: string | null;
  startDate: string | null;
  endDate: string | null;
  championTeamId: string | null;
  champion: string | null;
  teamCount: number;
  matchCount: number;
  isCurrent: boolean | null;
}

interface AwardRow {
  id: string;
  type: string;
  season: string;
  label: string | null;
  reason: string | null;
  weekLabel: string | null;
  player: { id: string; name: string; photoUrl: string | null } | null;
  team: { id: string; name: string; primaryColor: string } | null;
}

export default function HistoryPage() {
  const leaguesData = useApiData<{ leagues: LeagueRow[] }>("/api/leagues", "leagues");
  const awardsData = useApiData<{ awards: AwardRow[] }>("/api/awards", "awards");

  const leagues = useMemo(
    () => (leaguesData.data?.leagues ?? []).slice().sort((a, b) => b.season.localeCompare(a.season)),
    [leaguesData.data],
  );
  const awards = awardsData.data?.awards ?? [];

  const loading = leaguesData.loading && !leaguesData.data;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <div className="flex flex-col gap-2">
        <p className="micro">HISTORY & HONOURS</p>
        <h1 className="text-[clamp(2.1rem,6vw,3.4rem)] font-extrabold leading-tight">
          سجل المواسم والبطولات
        </h1>
        <p className="mt-2 max-w-2xl text-muted leading-relaxed">
          كل موسم يُحفظ كسجل مستقل: الأبطال، النتائج، الترتيب، الهدافون والجوائز — لا يُمحى
          أي تاريخ عند بدء موسم جديد.
        </p>
      </div>

      <section className="mt-9">
        <h2 className="text-2xl font-extrabold">المواسم</h2>
        {loading ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        ) : leagues.length === 0 ? (
          <Panel className="mt-5">
            <EmptyState
              icon={<HistoryIcon size={26} />}
              title="لا توجد مواسم مسجلة"
              body="يقوم مدير الدوري بإنشاء الموسم الأول من لوحة الإدارة."
            />
          </Panel>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {leagues.map((league, index) => (
              <motion.div
                key={league.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.42, delay: index * 0.06 }}
              >
                <Panel
                  className={cn(
                    "h-full p-6",
                    league.isCurrent ? "gold-rule border-gold/40" : "",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="micro">
                        {league.isCurrent ? "CURRENT SEASON" : "ARCHIVE"}
                      </p>
                      <h3 className="mt-1.5 text-xl font-extrabold leading-tight">
                        {league.name}
                      </h3>
                      <p className="text-gold-light font-bold">{league.season}</p>
                    </div>
                    <Pill tone={league.status === "active" ? "live" : "neutral"}>
                      {LEAGUE_STATUS_AR[league.status] ?? league.status}
                    </Pill>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg border border-line bg-elevated/50 py-2.5">
                      <p className="num text-lg font-bold">{league.teamCount}</p>
                      <p className="micro text-[0.52rem]">TEAMS</p>
                    </div>
                    <div className="rounded-lg border border-line bg-elevated/50 py-2.5">
                      <p className="num text-lg font-bold">{league.matchCount}</p>
                      <p className="micro text-[0.52rem]">MATCHES</p>
                    </div>
                    <div className="rounded-lg border border-line bg-elevated/50 py-2.5">
                      <p className="num text-lg font-bold">
                        {league.startDate ? league.startDate.slice(0, 4) : "—"}
                      </p>
                      <p className="micro text-[0.52rem]">SEASON</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-gold/30 bg-gold/[0.07] px-4 py-3">
                    <Crown size={18} className="text-gold-light" />
                    <div>
                      <p className="micro text-[0.55rem]">CHAMPION</p>
                      <p className="font-bold">{league.champion ?? "لم يُحسم بعد"}</p>
                    </div>
                  </div>
                </Panel>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-extrabold">الجوائز والتكريمات</h2>
        {awardsData.loading && !awardsData.data ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : awards.length === 0 ? (
          <Panel className="mt-5">
            <EmptyState
              icon={<Award size={26} />}
              title="لا توجد جوائز بعد"
              body="تُسجَّل جوائز أفضل لاعب في الأسبوع والهداف وبطل الدوري من لوحة الإدارة."
            />
          </Panel>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {awards.map((award, index) => (
              <motion.div
                key={award.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
                className="relative overflow-hidden rounded-2xl border border-gold/30 bg-surface p-5"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <div
                  className="absolute inset-y-0 right-0 w-1"
                  style={{ backgroundColor: award.team?.primaryColor ?? "#C9A227" }}
                />
                <div className="flex items-start gap-3.5">
                  {award.player ? (
                    <PlayerAvatar player={award.player} size={56} />
                  ) : (
                    <div className="grid size-14 place-items-center rounded-2xl border border-gold/40 bg-gold/10">
                      <Trophy size={22} className="text-gold-light" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <Pill tone="gold">{AWARD_TYPE_AR[award.type] ?? award.type}</Pill>
                    <h3 className="mt-2 font-extrabold leading-snug">
                      {award.player?.name ?? award.team?.name ?? award.label ?? "جائزة"}
                    </h3>
                    <p className="mt-1 text-[0.78rem] text-dim">
                      {award.season}
                      {award.weekLabel ? ` · ${award.weekLabel}` : ""}
                    </p>
                  </div>
                </div>
                {award.reason && (
                  <p className="mt-3 text-[0.84rem] leading-relaxed text-muted">{award.reason}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <Panel className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <CalendarDays size={22} className="text-gold-light" />
            <div>
              <p className="micro">ARCHIVE</p>
              <p className="font-bold">
                البيانات التاريخية محفوظة بشكل دائم ولا تتأثر ببدء موسم جديد.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/table">
              <Button variant="outline">الترتيب الحالي</Button>
            </Link>
            <Link href="/players">
              <Button variant="pitch">إحصائيات اللاعبين</Button>
            </Link>
          </div>
        </Panel>
      </section>
    </div>
  );
}
