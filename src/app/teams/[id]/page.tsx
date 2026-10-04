"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { PlayerAvatar, PositionBadge } from "@/components/player";
import { MatchCard } from "@/components/match";
import { TeamCrest } from "@/components/crest";
import { Button, EmptyState, Panel, Pill, Skeleton, cn } from "@/components/ui";
import { useApiData } from "@/lib/client/hooks";
import type { OverviewPayload } from "@/lib/types";

export default function TeamPage() {
  const params = useParams<{ id: string }>();
  const teamId = params.id;
  const { data, loading, error, reload } = useApiData<OverviewPayload>("/api/overview", "overview");

  const team = useMemo(() => (data?.teams ?? []).find((t) => t.id === teamId), [data, teamId]);
  const squad = useMemo(
    () => (data?.players ?? []).filter((player) => player.teamId === teamId),
    [data, teamId],
  );
  const matches = useMemo(
    () =>
      (data?.matches ?? []).filter(
        (match) => match.homeTeamId === teamId || match.awayTeamId === teamId,
      ),
    [data, teamId],
  );

  const played = matches
    .filter((match) => match.status === "ft")
    .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime());
  const upcoming = matches
    .filter((match) => match.status === "scheduled")
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-4">
        <Skeleton className="h-52 rounded-3xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <EmptyState
          title="الفريق غير موجود"
          body={error ?? "قد يكون الفريق قد حُذف أو أن الرابط غير صحيح."}
          action={
            <Link href="/teams">
              <Button>كل الفرق</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const stats = team.stats;

  return (
    <div className="pb-20">
      <section
        className="relative overflow-hidden border-b border-line"
        style={{
          background: `linear-gradient(160deg, ${team.primaryColor} 0%, #0A0E0C 72%)`,
        }}
      >
        <div className="absolute inset-0 pitch-lines opacity-25" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-10">
          <div className="flex flex-wrap items-center gap-6">
            <TeamCrest team={team} size={104} className="ring-2 ring-ink/50" />
            <div className="flex-1 min-w-[220px]">
              <p className="micro text-white/70">TEAM PROFILE</p>
              <h1 className="mt-1.5 text-[clamp(2rem,6vw,3.2rem)] font-extrabold leading-tight">
                {team.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Pill tone="gold">المركز {stats?.position ?? "—"}</Pill>
                <Pill tone="neutral">{squad.length} لاعباً</Pill>
                {team.form.map((letter, index) => (
                  <span
                    key={index}
                    className={cn(
                      "num size-6 rounded-md border text-[0.72rem] font-bold grid place-items-center",
                      letter === "W"
                        ? "border-live/40 bg-live/20 text-live"
                        : letter === "L"
                          ? "border-alert/40 bg-alert/20 text-alert"
                          : "border-white/25 bg-white/10 text-white",
                    )}
                  >
                    {letter}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {[
              { label: "MP", value: stats?.played ?? 0 },
              { label: "W", value: stats?.won ?? 0 },
              { label: "D", value: stats?.drawn ?? 0 },
              { label: "L", value: stats?.lost ?? 0 },
              { label: "GF", value: stats?.goalsFor ?? 0 },
              { label: "GA", value: stats?.goalsAgainst ?? 0 },
              { label: "GD", value: stats?.goalDifference ?? 0 },
              { label: "PTS", value: stats?.points ?? 0 },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-xl border border-white/12 bg-ink/45 px-3 py-3.5 text-center backdrop-blur-sm"
              >
                <p className="num text-2xl font-bold">{stat.value}</p>
                <p className="micro mt-1 text-[0.56rem] text-white/60">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-10">
        <section>
          <h2 className="text-2xl font-extrabold">القائمة</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {squad.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(index * 0.04, 0.28) }}
              >
                <Link
                  href={`/players/${player.id}`}
                  className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface px-4 py-3.5 transition-colors hover:border-gold/45"
                >
                  <PlayerAvatar player={player} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{player.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <PositionBadge position={player.position} />
                      {player.isCaptain && <Pill tone="gold">قائد</Pill>}
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="num text-xl font-bold">{player.shirtNumber ?? "—"}</p>
                    <p className="micro text-[0.52rem]">NUMBER</p>
                  </div>
                </Link>
              </motion.div>
            ))}
            {squad.length === 0 && (
              <Panel className="sm:col-span-2 lg:col-span-3">
                <EmptyState title="لا يوجد لاعبون في القائمة" body="يقوم مدير الدوري بتسجيل القائمة." />
              </Panel>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-extrabold">المباريات القادمة</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.slice(0, 3).map((match, index) => (
              <MatchCard key={match.id} match={match} compact index={index} />
            ))}
            {upcoming.length === 0 && (
              <Panel className="md:col-span-2 lg:col-span-3">
                <EmptyState title="لا توجد مباريات قادمة" body="سيتم إصدار الجدول القادم قريباً." />
              </Panel>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-extrabold">النتائج السابقة</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {played.slice(0, 6).map((match, index) => (
              <MatchCard key={match.id} match={match} compact index={index} />
            ))}
            {played.length === 0 && (
              <Panel className="md:col-span-2 lg:col-span-3">
                <EmptyState title="لا توجد نتائج سابقة" />
              </Panel>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
