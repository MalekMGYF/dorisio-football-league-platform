"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  Megaphone,
  Radio,
  Sparkles,
  Trophy,
} from "lucide-react";
import { DorisioMark } from "@/components/brand";
import { TeamCrest } from "@/components/crest";
import { MatchCard, ScoreDigit } from "@/components/match";
import { LeagueTable } from "@/components/standings";
import { PlayerAvatar } from "@/components/player";
import { Button, EmptyState, Panel, Pill, SectionHeader, Skeleton, cn } from "@/components/ui";
import { useApiData } from "@/lib/client/hooks";
import type { OverviewPayload } from "@/lib/types";
import { EVENT_TYPE_AR } from "@/lib/domain";
import { formatArabicDate, formatRelative, formatTime } from "@/lib/format";

function HeroSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-10">
      <Skeleton className="h-[26rem] w-full rounded-3xl" />
    </div>
  );
}

export default function HomePage() {
  const { data, loading, error, reload } = useApiData<OverviewPayload>("/api/overview", "overview");
  const reduce = useReducedMotion();

  const [goalFlash, setGoalFlash] = useState<{ name: string | null; key: number } | null>(null);
  const goalCountRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => reload(), 45000);
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [reload]);

  const liveMatch = data?.liveMatch ?? null;
  const liveEvents = useMemo(
    () => (liveMatch?.events ?? []).slice().sort((a, b) => b.minute - a.minute),
    [liveMatch],
  );
  const latestGoal = liveEvents.find((event) => event.type === "goal");

  useEffect(() => {
    const goals = (liveMatch?.events ?? []).filter((e) => e.type === "goal").length;
    if (goals > goalCountRef.current && goalCountRef.current !== 0 && latestGoal) {
      setGoalFlash({ name: null, key: Date.now() });
      const timer = setTimeout(() => setGoalFlash(null), 3600);
      return () => clearTimeout(timer);
    }
    goalCountRef.current = goals;
  }, [liveMatch, latestGoal]);

  if (loading && !data) {
    return (
      <div className="pb-20">
        <HeroSkeleton />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <EmptyState
          title="تعذّر تحميل بيانات الدوري"
          body={error}
          action={<Button onClick={reload}>إعادة المحاولة</Button>}
        />
      </div>
    );
  }

  const league = data?.league ?? null;
  const teams = data?.teams ?? [];
  const standings = data?.standings ?? [];
  const results = (data?.matches ?? [])
    .filter((match) => match.status === "ft")
    .slice(0, 3);
  const leader = standings[0] ? teams.find((t) => t.id === standings[0].teamId) : null;

  return (
    <div className="pb-20">
      {/* ---------------------------- HERO ---------------------------- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero-stadium.jpg"
            alt=""
            aria-hidden="true"
            className="size-full object-cover object-center opacity-[0.55]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(200deg,rgba(10,14,12,0.35)_0%,rgba(10,14,12,0.82)_48%,#0A0E0C_88%)]" />
          <div className="absolute inset-0 pitch-lines opacity-25" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 pt-12 pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-20 lg:pb-24">
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3">
              <DorisioMark size={44} className="text-pitch" />
              <div>
                <p className="micro text-gold-light">DORISIO · FOOTBALL LEAGUE</p>
                <p className="text-[0.95rem] font-bold text-muted">
                  {league?.name ?? "دوريسيو"} · {league?.season ?? "الموسم الحالي"}
                </p>
              </div>
            </div>

            <h1 className="mt-7 text-[clamp(2.7rem,9vw,5.6rem)] font-extrabold leading-[0.94] tracking-tight">
              دوريكم...
              <br />
              <span className="text-gold-light">بشكل حقيقي.</span>
            </h1>

            <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-muted">
              جدول ترتيب يتحدّث لحظة بلحظة، مركز مباريات مباشر من الملعب، إحصائيات اللاعبين،
              خط زمني للأحداث، وجائزة أفضل لاعب في الأسبوع — كل ذلك في تطبيق واحد يعمل حتى
              دون اتصال.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/matches">
                <Button size="lg" variant="gold">
                  مركز المباريات <ArrowLeft size={18} />
                </Button>
              </Link>
              <Link href="/table">
                <Button size="lg" variant="outline">
                  جدول الترتيب
                </Button>
              </Link>
              {leader && (
                <div className="flex items-center gap-2.5 rounded-xl border border-gold/35 bg-gold/10 px-4 py-2.5">
                  <Trophy size={17} className="text-gold-light" />
                  <div>
                    <p className="micro text-[0.58rem]">CURRENT LEADER</p>
                    <p className="text-[0.92rem] font-bold text-gold-light">{leader.name}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Featured match */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 34, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            {liveMatch ? (
              <FeaturedMatch match={liveMatch} events={liveEvents} />
            ) : data?.nextMatch ? (
              <FeaturedMatch match={data.nextMatch} events={[]} upcoming />
            ) : (
              <Panel className="p-8 text-center">
                <Radio className="mx-auto text-dim" size={30} />
                <h3 className="mt-4 text-lg font-bold">لا توجد مباراة مجدولة حالياً</h3>
                <p className="mt-2 text-sm text-muted">
                  تابع صفحة المباريات لمعرفة الجدول القادم فور إعلانه.
                </p>
              </Panel>
            )}
          </motion.div>
        </div>
      </section>

      {/* ---------------------- LIVE MATCH BAND ---------------------- */}
      {liveMatch && (
        <section className="relative">
          <div className="relative overflow-hidden border-y border-live/25 band grain">
            {goalFlash && (
              <span key={goalFlash.key} className="gold-sweep absolute inset-0 z-10" />
            )}
            <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 sm:px-6 py-10">
              <div className="flex items-center gap-3">
                <span className="live-dot size-2.5 rounded-full bg-live" />
                <p className="micro text-live">LIVE NOW · جارية الآن</p>
              </div>

              <div className="grid w-full max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div className="flex flex-col items-center gap-3 text-center">
                  <TeamCrest team={liveMatch.homeTeam} size={72} />
                  <p className="text-lg font-extrabold">{liveMatch.homeTeam?.name}</p>
                </div>

                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-3">
                    <ScoreDigit value={liveMatch.homeScore} highlight size="md" />
                    <span className="num text-3xl text-dim">:</span>
                    <ScoreDigit value={liveMatch.awayScore} highlight size="md" />
                  </div>
                  <p className="num mt-2 text-xl font-bold text-live">{liveMatch.minute}&apos;</p>
                </div>

                <div className="flex flex-col items-center gap-3 text-center">
                  <TeamCrest team={liveMatch.awayTeam} size={72} />
                  <p className="text-lg font-extrabold">{liveMatch.awayTeam?.name}</p>
                </div>
              </div>

              {latestGoal && (
                <motion.div
                  key={latestGoal.id}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  className="flex items-center gap-3 rounded-full border border-gold/40 bg-gold/10 px-5 py-2.5"
                >
                  <Sparkles size={17} className="text-gold-light" />
                  <span className="text-gold-light font-bold">
                    {EVENT_TYPE_AR.goal} · {latestGoal.minute}&apos;
                  </span>
                  <span className="text-muted text-sm">
                    {liveMatch.homeTeam?.name} ضد {liveMatch.awayTeam?.name}
                  </span>
                </motion.div>
              )}

              <Link href={`/matches/${liveMatch.id}`}>
                <Button variant="live" size="lg">
                  <Radio size={18} /> فتح مركز المباراة المباشر
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* --------------------------- RESULTS -------------------------- */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-14">
        <SectionHeader
          eyebrow="LATEST RESULTS"
          title="آخر النتائج"
          action={
            <Link
              href="/matches"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-gold-light transition-colors"
            >
              كل المباريات <ChevronLeft size={16} />
            </Link>
          }
        />
        {results.length === 0 ? (
          <Panel>
            <EmptyState
              title="لا توجد نتائج بعد"
              body="ستظهر نتائج المباريات فور انتهائها وتسجيل أحداثها."
            />
          </Panel>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((match, index) => (
              <MatchCard
                key={match.id}
                match={match}
                events={match.events}
                compact
                index={index}
              />
            ))}
          </div>
        )}
      </section>

      {/* --------------------------- STANDINGS ------------------------ */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-14">
        <SectionHeader
          eyebrow="LEAGUE TABLE"
          title="جدول الترتيب"
          action={
            <Link href="/table">
              <Button variant="outline" size="sm">
                الترتيب الكامل <ChevronLeft size={15} />
              </Button>
            </Link>
          }
        />
        <Panel className="p-2 sm:p-4">
          {standings.length === 0 ? (
            <EmptyState title="الترتيب غير متاح" body="أضف الفرق والمباريات لبدء احتساب الترتيب." />
          ) : (
            <LeagueTable rows={standings.slice(0, 6)} teams={teams} dense />
          )}
        </Panel>
      </section>

      {/* ----------------------- SCORERS + ASSISTS -------------------- */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <SectionHeader eyebrow="TOP SCORERS" title="الهدافون" />
            <Panel className="divide-y divide-line-soft">
              {(data?.topScorers ?? []).slice(0, 5).map((player, index) => (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
                >
                  <span
                    className={cn(
                      "num w-7 text-center text-lg font-bold",
                      index === 0 ? "text-gold-light" : "text-dim",
                    )}
                  >
                    {index + 1}
                  </span>
                  <PlayerAvatar player={player} size={42} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-bold">{player.name}</p>
                    <p className="text-[0.78rem] text-dim">{player.teamName}</p>
                  </div>
                  <div className="text-left">
                    <p className="num text-xl font-bold text-gold-light">{player.stats.goals}</p>
                    <p className="micro text-[0.55rem]">GOALS</p>
                  </div>
                </Link>
              ))}
              {(data?.topScorers ?? []).length === 0 && (
                <EmptyState title="لا توجد أهداف مسجّلة بعد" />
              )}
            </Panel>
          </div>

          <div>
            <SectionHeader eyebrow="TOP ASSISTS" title="صنّاع الأهداف" />
            <Panel className="divide-y divide-line-soft">
              {(data?.topAssists ?? []).slice(0, 5).map((player, index) => (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
                >
                  <span
                    className={cn(
                      "num w-7 text-center text-lg font-bold",
                      index === 0 ? "text-gold-light" : "text-dim",
                    )}
                  >
                    {index + 1}
                  </span>
                  <PlayerAvatar player={player} size={42} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-bold">{player.name}</p>
                    <p className="text-[0.78rem] text-dim">{player.teamName}</p>
                  </div>
                  <div className="text-left">
                    <p className="num text-xl font-bold text-live">{player.stats.assists}</p>
                    <p className="micro text-[0.55rem]">ASSISTS</p>
                  </div>
                </Link>
              ))}
              {(data?.topAssists ?? []).length === 0 && (
                <EmptyState title="لا توجد تمريرات حاسمة بعد" />
              )}
            </Panel>
          </div>
        </div>
      </section>

      {/* ------------------------ PLAYER OF THE WEEK ------------------ */}
      {data?.playerOfWeek && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-14">
          <div className="relative overflow-hidden rounded-3xl border border-gold/35">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/trophy-gold.jpg"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 size-full object-cover opacity-45"
            />
            <div className="absolute inset-0 bg-[linear-gradient(260deg,rgba(10,14,12,0.35),rgba(10,14,12,0.92)_55%)]" />
            <div className="relative grid gap-8 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.2fr_1fr] lg:items-center">
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <Pill tone="gold">
                  <Trophy size={13} /> PLAYER OF THE WEEK
                </Pill>
                <h2 className="mt-4 text-[clamp(2rem,5.5vw,3.2rem)] font-extrabold leading-tight">
                  {data.playerOfWeek.player?.name ?? data.playerOfWeek.label ?? "لاعب الأسبوع"}
                </h2>
                <p className="mt-2 text-lg text-gold-light font-bold">
                  {data.playerOfWeek.team?.name ?? ""}
                  {data.playerOfWeek.weekLabel ? ` · ${data.playerOfWeek.weekLabel}` : ""}
                </p>
                {data.playerOfWeek.reason && (
                  <p className="mt-4 max-w-xl text-muted leading-relaxed">
                    {data.playerOfWeek.reason}
                  </p>
                )}
                {data.playerOfWeek.player && (
                  <Link href={`/players/${data.playerOfWeek.player.id}`} className="inline-block mt-6">
                    <Button variant="gold">
                      ملف اللاعب <ArrowLeft size={17} />
                    </Button>
                  </Link>
                )}
              </motion.div>

              {data.playerOfWeek.player && (
                <motion.div
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, rotate: -2 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 180, damping: 22 }}
                  className="justify-self-center"
                >
                  <div className="rounded-2xl border border-gold/40 bg-ink/60 p-5 text-center backdrop-blur-sm">
                    <PlayerAvatar
                      player={data.playerOfWeek.player}
                      size={124}
                      className="mx-auto ring-2 ring-gold/50"
                    />
                    <p className="mt-4 font-extrabold text-lg">{data.playerOfWeek.player.name}</p>
                    <div className="mt-3 flex items-center justify-center gap-4">
                      <div>
                        <p className="num text-xl font-bold text-gold-light">
                          {data.playerOfWeek.player.shirtNumber ?? "—"}
                        </p>
                        <p className="micro text-[0.55rem]">NUMBER</p>
                      </div>
                      <div className="h-8 w-px bg-line" />
                      <div>
                        <p className="num text-xl font-bold text-gold-light">
                          {data.playerOfWeek.team?.shortName ?? "—"}
                        </p>
                        <p className="micro text-[0.55rem]">TEAM</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------ ANNOUNCEMENTS ----------------------- */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-14">
        <SectionHeader eyebrow="ANNOUNCEMENTS" title="آخر الإعلانات" />
        {(data?.announcements ?? []).length === 0 ? (
          <Panel>
            <EmptyState title="لا توجد إعلانات" body="سيتم نشر أخبار الدوري هنا فور إصدارها." />
          </Panel>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(data?.announcements ?? []).map((announcement, index) => (
              <motion.article
                key={announcement.id}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.42, delay: index * 0.06 }}
                className="rounded-2xl border border-line bg-surface p-5"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <div className="flex items-center gap-2">
                  <Megaphone size={15} className="text-gold-light" />
                  <Pill tone="gold">{announcement.tag ?? "خبر"}</Pill>
                </div>
                <h3 className="mt-3 text-lg font-extrabold leading-snug">{announcement.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-3">
                  {announcement.body}
                </p>
                <p className="micro mt-4">{formatRelative(announcement.createdAt)}</p>
              </motion.article>
            ))}
          </div>
        )}
      </section>

      {league && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-14">
          <Panel className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="micro">CURRENT COMPETITION</p>
                <h2 className="mt-2 text-2xl font-extrabold">
                  {league.name} — {league.season}
                </h2>
                <p className="mt-2 text-muted">
                  {league.venue ?? "—"} ·{" "}
                  {league.startDate ? formatArabicDate(league.startDate) : ""} · مدة المباراة{" "}
                  <span className="num">{league.matchDuration}</span> دقيقة
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/history">
                  <Button variant="outline">سجل المواسم</Button>
                </Link>
                <Link href="/players">
                  <Button variant="pitch">تصفح اللاعبين</Button>
                </Link>
              </div>
            </div>
          </Panel>
        </section>
      )}
    </div>
  );
}

function FeaturedMatch({
  match,
  events,
  upcoming = false,
}: {
  match: OverviewPayload["matches"][number];
  events: OverviewPayload["matches"][number]["events"];
  upcoming?: boolean;
}) {
  const latest = events[0];
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Pill tone={match.status === "live" ? "live" : "gold"}>
            {match.status === "live" ? "مباشر" : "المباراة القادمة"}
          </Pill>
          <span className="micro">{match.venue ?? "DORISIO ARENA"}</span>
        </div>
        <span className="num text-sm text-muted">
          {formatTime(match.kickoffAt)} · {formatArabicDate(match.kickoffAt).split("،")[0]}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-8">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <TeamCrest team={match.homeTeam} size={64} />
          <p className="font-extrabold leading-tight">{match.homeTeam?.name}</p>
        </div>
        <div className="flex flex-col items-center">
          {upcoming ? (
            <span className="num rounded-xl border border-line bg-elevated px-4 py-2 text-2xl font-bold">
              {formatTime(match.kickoffAt)}
            </span>
          ) : (
            <div className="flex items-center gap-3">
              <ScoreDigit value={match.homeScore} highlight size="md" />
              <span className="num text-2xl text-dim">:</span>
              <ScoreDigit value={match.awayScore} highlight size="md" />
            </div>
          )}
          {match.status === "live" && (
            <span className="num mt-2 text-live font-bold">{match.minute}&apos;</span>
          )}
        </div>
        <div className="flex flex-col items-center gap-2.5 text-center">
          <TeamCrest team={match.awayTeam} size={64} />
          <p className="font-extrabold leading-tight">{match.awayTeam?.name}</p>
        </div>
      </div>

      {latest && (
        <div className="flex items-center justify-center gap-2 border-t border-line px-5 py-3 text-sm text-muted">
          <span aria-hidden="true">⚽</span>
          <span className="num text-paper">{latest.minute}&apos;</span>
          {EVENT_TYPE_AR[latest.type] ?? latest.type}
        </div>
      )}

      <Link
        href={`/matches/${match.id}`}
        className="block border-t border-line px-5 py-3.5 text-center text-sm font-bold text-gold-light hover:bg-gold/[0.07] transition-colors"
      >
        تفاصيل المباراة
      </Link>
    </Panel>
  );
}
