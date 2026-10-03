"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Star, Trophy } from "lucide-react";
import { PlayerAvatar, PositionBadge } from "@/components/player";
import { TeamCrest } from "@/components/crest";
import { Button, EmptyState, Panel, Pill, Skeleton } from "@/components/ui";
import { useApiData } from "@/lib/client/hooks";
import type { OverviewPayload } from "@/lib/types";
import { POSITION_AR } from "@/lib/domain";

export default function PlayerPage() {
  const params = useParams<{ id: string }>();
  const playerId = params.id;
  const { data, loading, error, reload } = useApiData<OverviewPayload>("/api/overview", "overview");

  const player = useMemo(
    () => (data?.players ?? []).find((item) => item.id === playerId),
    [data, playerId],
  );
  const team = useMemo(
    () => (data?.teams ?? []).find((item) => item.id === player?.teamId),
    [data, player],
  );
  const awards = useMemo(
    () => (data?.awards ?? []).filter((award) => award.playerId === playerId),
    [data, playerId],
  );
  const teamMatches = useMemo(() => {
    if (!team) return [];
    return (data?.matches ?? [])
      .filter(
        (match) =>
          (match.homeTeamId === team.id || match.awayTeamId === team.id) && match.status === "ft",
      )
      .sort((a, b) => b.kickoffAt.getTime() - a.kickoffAt.getTime())
      .slice(0, 6);
  }, [data, team]);

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-4">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <EmptyState
          title="اللاعب غير موجود"
          body={error ?? "قد يكون اللاعب قد حُذف أو أن الرابط غير صحيح."}
          action={
            <Link href="/players">
              <Button>كل اللاعبين</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const stats = player.stats;
  const cards = [
    { label: "MATCHES", value: stats.appearances, sub: "مباراة" },
    { label: "GOALS", value: stats.goals, sub: "هدف" },
    { label: "ASSISTS", value: stats.assists, sub: "تمريرة حاسمة" },
    { label: "YELLOW", value: stats.yellow, sub: "بطاقة صفراء" },
    { label: "RED", value: stats.red, sub: "بطاقة حمراء" },
    { label: "MOTM", value: stats.motm, sub: "رجل المباراة" },
    {
      label: "RATING",
      value: stats.ratingAvg ? stats.ratingAvg.toFixed(1) : "—",
      sub: `${stats.ratingCount} تقييم`,
    },
  ];

  return (
    <div className="pb-20">
      <section
        className="relative overflow-hidden border-b border-line"
        style={{
          background: `linear-gradient(155deg, ${team?.primaryColor ?? "#0F7A46"} 0%, #0A0E0C 70%)`,
        }}
      >
        <div className="absolute inset-0 pitch-lines opacity-25" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 py-10">
          <div className="flex flex-wrap items-center gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 190, damping: 22 }}
            >
              <PlayerAvatar
                player={player}
                size={132}
                className="ring-2 ring-gold/45 shadow-2xl"
              />
            </motion.div>
            <div className="flex-1 min-w-[220px]">
              <p className="micro text-white/70">PLAYER PROFILE</p>
              <h1 className="mt-1.5 text-[clamp(2.1rem,6.5vw,3.5rem)] font-extrabold leading-tight">
                {player.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <PositionBadge position={player.position} />
                <Pill tone="neutral">{POSITION_AR[player.position] ?? player.position}</Pill>
                {player.isCaptain && <Pill tone="gold">قائد الفريق</Pill>}
                {team && (
                  <Link
                    href={`/teams/${team.id}`}
                    className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.82rem] font-bold"
                  >
                    <TeamCrest team={team} size={22} />
                    {team.name}
                  </Link>
                )}
              </div>
              <div className="mt-5 flex items-center gap-6">
                <div>
                  <p className="num text-4xl font-bold text-gold-light">
                    {player.shirtNumber ?? "—"}
                  </p>
                  <p className="micro text-[0.56rem] text-white/60">SHIRT NUMBER</p>
                </div>
                <div className="h-10 w-px bg-white/15" />
                <div>
                  <p className="num text-4xl font-bold text-gold-light">{stats.goals}</p>
                  <p className="micro text-[0.56rem] text-white/60">GOALS</p>
                </div>
                <div className="h-10 w-px bg-white/15" />
                <div>
                  <p className="num text-4xl font-bold text-gold-light">{stats.assists}</p>
                  <p className="micro text-[0.56rem] text-white/60">ASSISTS</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-10">
        <section>
          <h2 className="text-2xl font-extrabold">الإحصائيات</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {cards.map((card, index) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-line bg-surface px-3 py-5 text-center"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <p className="num text-[1.75rem] font-bold leading-none">{card.value}</p>
                <p className="micro mt-2 text-[0.55rem]">{card.label}</p>
                <p className="mt-1 text-[0.72rem] text-dim">{card.sub}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {awards.length > 0 && (
          <section>
            <h2 className="text-2xl font-extrabold">الجوائز والتكريمات</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {awards.map((award) => (
                <div
                  key={award.id}
                  className="flex items-start gap-3.5 rounded-2xl border border-gold/35 bg-gold/[0.08] p-5"
                >
                  <Trophy size={22} className="mt-1 text-gold-light" />
                  <div>
                    <p className="font-extrabold">{award.label ?? "جائزة"}</p>
                    <p className="mt-1 text-[0.84rem] text-muted leading-relaxed">
                      {award.reason ?? "تم منح هذه الجائزة بناءً على قرار لجنة الدوري."}
                    </p>
                    <p className="micro mt-2">
                      {award.season}
                      {award.weekLabel ? ` · ${award.weekLabel}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-2xl font-extrabold">مباريات الفريق</h2>
          <Panel className="mt-5 divide-y divide-line-soft">
            {teamMatches.map((match) => {
              const isHome = match.homeTeamId === team?.id;
              const opponent = isHome ? match.awayTeam : match.homeTeam;
              const gf = isHome ? match.homeScore : match.awayScore;
              const ga = isHome ? match.awayScore : match.homeScore;
              return (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-white/[0.03]"
                >
                  <TeamCrest team={opponent ?? null} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{opponent?.name ?? "—"}</p>
                    <p className="text-[0.76rem] text-dim">
                      {isHome ? "على أرضه" : "خارج أرضه"}
                    </p>
                  </div>
                  <span
                    className={`num rounded-lg border px-2.5 py-1 text-[0.86rem] font-bold ${
                      gf > ga
                        ? "border-live/40 bg-live/15 text-live"
                        : gf < ga
                          ? "border-alert/40 bg-alert/15 text-alert"
                          : "border-line bg-elevated text-muted"
                    }`}
                  >
                    {gf} - {ga}
                  </span>
                </Link>
              );
            })}
            {teamMatches.length === 0 && <EmptyState title="لا توجد مباريات مكتملة بعد" />}
          </Panel>
        </section>

        <section>
          <Panel className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-3">
              <Star className="text-gold-light" size={22} />
              <div>
                <p className="micro">RATINGS</p>
                <p className="font-bold">
                  متوسط تقييم الجمهور:{" "}
                  <span className="num text-gold-light">
                    {stats.ratingAvg ? stats.ratingAvg.toFixed(2) : "—"}
                  </span>{" "}
                  من 10
                </p>
              </div>
            </div>
            <Link href="/matches">
              <Button variant="gold">قيّم اللاعبين بعد المباراة</Button>
            </Link>
          </Panel>
        </section>
      </div>
    </div>
  );
}
