"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Radio,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { TeamCrest } from "@/components/crest";
import { EventTimeline, LiveBadge, ScoreDigit, type TimelineEntry } from "@/components/match";
import { LineupPitch } from "@/components/pitch";
import { PlayerAvatar, PositionBadge } from "@/components/player";
import {
  Button,
  EmptyState,
  Panel,
  Pill,
  Skeleton,
  cn,
  useToast,
} from "@/components/ui";
import { useApiData } from "@/lib/client/hooks";
import { useSession } from "@/lib/client/session";
import { api, ApiClientError } from "@/lib/client/api";
import type { MatchBundle } from "@/lib/types";
import { EVENT_TYPE_AR, MATCH_STATUS_AR } from "@/lib/domain";
import { formatArabicDate, formatTime } from "@/lib/format";

type Tab = "timeline" | "lineups" | "stats" | "ratings";

const TABS: { value: Tab; label: string; eyebrow: string }[] = [
  { value: "timeline", label: "الخط الزمني", eyebrow: "TIMELINE" },
  { value: "lineups", label: "التشكيلات", eyebrow: "LINEUPS" },
  { value: "stats", label: "الإحصائيات", eyebrow: "STATS" },
  { value: "ratings", label: "التقييمات", eyebrow: "RATINGS" },
];

export default function MatchPage() {
  const params = useParams<{ id: string }>();
  const matchId = params.id;
  const { data, loading, error, reload } = useApiData<MatchBundle>(
    `/api/matches/${matchId}`,
    `match:${matchId}`,
    [matchId],
  );
  const { user, isAdmin } = useSession();
  const toast = useToast();
  const reduce = useReducedMotion();

  const [tab, setTab] = useState<Tab>("timeline");
  const [elapsed, setElapsed] = useState(0);
  const [flash, setFlash] = useState<{ id: string; name: string | null } | null>(null);
  const seenEvents = useRef<Set<string>>(new Set());
  const initialised = useRef(false);

  const playersById = useMemo(() => {
    const map = new Map<string, string>();
    for (const player of data?.players ?? []) map.set(player.id, player.name);
    return map;
  }, [data]);

  const timeline: TimelineEntry[] = useMemo(() => {
    return (data?.events ?? []).map((event) => ({
      ...event,
      playerName: event.playerId ? playersById.get(event.playerId) ?? null : null,
      assistName: event.assistPlayerId ? playersById.get(event.assistPlayerId) ?? null : null,
      playerInName: event.playerInId ? playersById.get(event.playerInId) ?? null : null,
      playerOutName: event.playerOutId ? playersById.get(event.playerOutId) ?? null : null,
      teamName:
        event.teamId === data?.homeTeam?.id
          ? data?.homeTeam?.name
          : event.teamId === data?.awayTeam?.id
            ? data?.awayTeam?.name
            : null,
    }));
  }, [data, playersById]);

  /* -------- live stream: score, minute and events without refreshing ------ */
  useEffect(() => {
    if (typeof window === "undefined" || !matchId) return;
    const source = new EventSource(`/api/matches/${matchId}/stream`);

    const onUpdate = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as {
          match: { minute: number };
          elapsedMs: number;
        };
        setElapsed(payload.elapsedMs);
        reload();
      } catch {
        /* ignore malformed frame */
      }
    };
    const onTick = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { elapsedMs: number };
        setElapsed(payload.elapsedMs);
      } catch {
        /* ignore */
      }
    };

    source.addEventListener("update", onUpdate as EventListener);
    source.addEventListener("tick", onTick as EventListener);
    source.onerror = () => {
      // EventSource reconnects automatically; nothing to do.
    };
    return () => {
      source.removeEventListener("update", onUpdate as EventListener);
      source.removeEventListener("tick", onTick as EventListener);
      source.close();
    };
  }, [matchId, reload]);

  /* ----------------------- goal celebration trigger --------------------- */
  useEffect(() => {
    const events = data?.events ?? [];
    if (!initialised.current) {
      events.forEach((event) => seenEvents.current.add(event.id));
      initialised.current = true;
      return;
    }
    for (const event of events) {
      if (seenEvents.current.has(event.id)) continue;
      seenEvents.current.add(event.id);
      if (event.type === "goal" || event.type === "own_goal") {
        setFlash({
          id: event.id,
          name: event.playerId ? playersById.get(event.playerId) ?? null : null,
        });
        const timer = setTimeout(() => setFlash(null), 3800);
        return () => clearTimeout(timer);
      }
    }
  }, [data, playersById]);

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-4">
        <Skeleton className="h-56 rounded-3xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <EmptyState
          title="تعذّر تحميل المباراة"
          body={error ?? "المباراة غير موجودة أو تم حذفها."}
          action={
            <Link href="/matches">
              <Button>العودة للمباريات</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const match = data.match;
  const isLive = match.status === "live" || match.status === "ht";
  const homeEntries = data.lineups.filter((entry) => entry.teamId === match.homeTeamId);
  const awayEntries = data.lineups.filter((entry) => entry.teamId === match.awayTeamId);

  const statCount = (type: string, teamId: string | null) =>
    data.events.filter((event) => event.type === type && event.teamId === teamId).length;

  const stats = [
    {
      label: "الأهداف",
      home: statCount("goal", match.homeTeamId),
      away: statCount("goal", match.awayTeamId),
    },
    {
      label: "التمريرات الحاسمة",
      home: statCount("assist", match.homeTeamId),
      away: statCount("assist", match.awayTeamId),
    },
    {
      label: "البطاقات الصفراء",
      home: statCount("yellow", match.homeTeamId),
      away: statCount("yellow", match.awayTeamId),
    },
    {
      label: "البطاقات الحمراء",
      home: statCount("red", match.homeTeamId),
      away: statCount("red", match.awayTeamId),
    },
    {
      label: "التبديلات",
      home: statCount("substitution", match.homeTeamId),
      away: statCount("substitution", match.awayTeamId),
    },
    {
      label: "الأهداف العكسية",
      home: statCount("own_goal", match.homeTeamId),
      away: statCount("own_goal", match.awayTeamId),
    },
  ];

  return (
    <div className="relative pb-20">

      {/* ---------------------------- SCOREBOARD --------------------------- */}
      <section className="relative overflow-hidden border-b border-line band grain">
        <div className="absolute inset-0 pitch-lines opacity-30" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <LiveBadge status={match.status} />
              <Pill tone="neutral">{MATCH_STATUS_AR[match.status] ?? match.status}</Pill>
              {data.league && (
                <span className="text-[0.82rem] text-muted">
                  {data.league.name} · {data.league.season}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link href={`/admin/live/${match.id}`}>
                  <Button variant="gold" size="sm">
                    <ShieldCheck size={15} /> مركز التحكم المباشر
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <TeamCrest team={data.homeTeam} size={84} />
              <p className="text-lg sm:text-2xl font-extrabold leading-tight">
                {data.homeTeam?.name ?? "—"}
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-3 sm:gap-5">
                <ScoreDigit value={match.homeScore} highlight={isLive} size="lg" />
                <span className="num text-3xl text-dim">:</span>
                <ScoreDigit value={match.awayScore} highlight={isLive} size="lg" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                {match.status === "scheduled" ? (
                  <span className="num rounded-lg border border-line bg-elevated px-3 py-1 text-lg font-bold">
                    {formatTime(match.kickoffAt)}
                  </span>
                ) : (
                  <span
                    className={cn(
                      "num text-2xl font-bold",
                      match.status === "live" ? "text-live" : "text-muted",
                    )}
                  >
                    {match.status === "ft" ? "FT" : `${match.minute}&apos;`}
                  </span>
                )}
                {match.status === "live" && (
                  <span className="live-dot size-2 rounded-full bg-live" aria-hidden="true" />
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 text-center">
              <TeamCrest team={data.awayTeam} size={84} />
              <p className="text-lg sm:text-2xl font-extrabold leading-tight">
                {data.awayTeam?.name ?? "—"}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[0.85rem] text-muted">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={15} /> {formatArabicDate(match.kickoffAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={15} /> {formatTime(match.kickoffAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={15} /> {match.venue ?? "—"}
            </span>
            <span className="flex items-center gap-1.5">
              <Radio size={15} className={isLive ? "text-live" : "text-dim"} />
              {isLive ? "تحديث مباشر" : "غير مباشر"}
            </span>
          </div>
        </div>

        {flash && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4"
          >
            <div className="flex items-center gap-3 rounded-full border border-live/60 bg-ink/95 px-6 py-3 shadow-[0_0_34px_rgba(35,193,107,.42)]">
              <Sparkles size={19} className="text-live" />
              <span className="text-live font-extrabold text-lg">هــدف!</span>
              {flash.name && <span className="num text-xl font-bold text-paper">{flash.name}</span>}
            </div>
          </motion.div>
        )}
      </section>

      {/* ------------------------------- TABS ------------------------------ */}
      <div className="sticky top-16 z-30 border-b border-line bg-ink/92 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto scroll-x">
            {TABS.map((item) => (
              <button
                key={item.value}
                onClick={() => setTab(item.value)}
                className={cn(
                  "relative shrink-0 px-4 py-3.5 text-[0.92rem] font-bold transition-colors",
                  tab === item.value ? "text-gold-light" : "text-muted hover:text-paper",
                )}
              >
                {item.label}
                {tab === item.value && (
                  <motion.span
                    layoutId="match-tab-indicator"
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gold"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {tab === "timeline" && (
          <Panel className="p-5 sm:p-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="micro">MATCH TIMELINE</p>
                <h2 className="mt-1 text-2xl font-extrabold">الخط الزمني</h2>
              </div>
              <span className="num text-sm text-dim">{timeline.length} حدث</span>
            </div>
            <EventTimeline events={timeline} />
          </Panel>
        )}

        {tab === "lineups" && (
          <div className="space-y-5">
            <Panel className="p-5 sm:p-7">
              <p className="micro">TACTICAL LINEUP</p>
              <h2 className="mt-1 text-2xl font-extrabold">التشكيلات</h2>
            </Panel>
            <LineupPitch
              homeTeam={data.homeTeam}
              awayTeam={data.awayTeam}
              homeEntries={homeEntries}
              awayEntries={awayEntries}
              homeFormation={match.homeFormation}
              awayFormation={match.awayFormation}
            />
          </div>
        )}

        {tab === "stats" && (
          <Panel className="p-5 sm:p-8">
            <p className="micro">MATCH STATISTICS</p>
            <h2 className="mt-1 text-2xl font-extrabold">إحصائيات المباراة</h2>
            <div className="mt-7 space-y-6">
              {stats.map((row, index) => {
                const total = row.home + row.away || 1;
                return (
                  <motion.div
                    key={row.label}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="num text-lg font-bold">{row.home}</span>
                      <span className="text-[0.86rem] font-bold text-muted">{row.label}</span>
                      <span className="num text-lg font-bold">{row.away}</span>
                    </div>
                    <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-elevated">
                      <motion.span
                        initial={{ width: 0 }}
                        animate={{ width: `${(row.home / total) * 100}%` }}
                        transition={{ duration: 0.55, delay: index * 0.05 }}
                        className="rounded-full"
                        style={{ backgroundColor: data.homeTeam?.primaryColor ?? "#0F7A46" }}
                      />
                      <motion.span
                        initial={{ width: 0 }}
                        animate={{ width: `${(row.away / total) * 100}%` }}
                        transition={{ duration: 0.55, delay: index * 0.05 }}
                        className="rounded-full"
                        style={{ backgroundColor: data.awayTeam?.primaryColor ?? "#C9A227" }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {match.motmPlayerId && (
              <div className="mt-9 rounded-2xl border border-gold/40 bg-gold/[0.08] p-5">
                <div className="flex items-center gap-3">
                  <Star className="text-gold-light" size={20} />
                  <div>
                    <p className="micro">MAN OF THE MATCH</p>
                    <p className="text-lg font-extrabold">
                      {playersById.get(match.motmPlayerId) ?? "رجل المباراة"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Panel>
        )}

        {tab === "ratings" && (
          <RatingsPanel
            bundle={data}
            canRate={match.status === "ft" && Boolean(user)}
            loggedIn={Boolean(user)}
            onChanged={() => reload()}
          />
        )}
      </div>

      {/* --------------------------- EVENT LOG ---------------------------- */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <Panel className="p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="micro">SCORERS & CARDS</p>
              <h2 className="mt-1 text-xl font-extrabold">الأهداف والبطاقات</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {timeline
              .filter((event) => ["goal", "own_goal", "yellow", "red", "substitution"].includes(event.type))
              .map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 rounded-xl border border-line bg-elevated/50 px-4 py-3"
                >
                  <span className="num w-10 text-gold-light font-bold">{event.minute}&apos;</span>
                  <span aria-hidden="true">{EVENT_TYPE_AR[event.type] ? "•" : ""}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.92rem] font-bold">
                      {event.playerName ?? EVENT_TYPE_AR[event.type]}
                    </p>
                    <p className="truncate text-[0.74rem] text-dim">
                      {event.teamName ?? ""} · {EVENT_TYPE_AR[event.type]}
                    </p>
                  </div>
                  <PositionBadge position={event.type === "goal" ? "FWD" : "MID"} />
                </div>
              ))}
            {timeline.filter((event) =>
              ["goal", "own_goal", "yellow", "red", "substitution"].includes(event.type),
            ).length === 0 && (
              <p className="text-sm text-muted">لا توجد أهداف أو بطاقات مسجّلة في هذه المباراة.</p>
            )}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function RatingsPanel({
  bundle,
  canRate,
  loggedIn,
  onChanged,
}: {
  bundle: MatchBundle;
  canRate: boolean;
  loggedIn: boolean;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [values, setValues] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eligible = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of bundle.lineups) ids.add(entry.playerId);
    for (const event of bundle.events) {
      if (event.playerId) ids.add(event.playerId);
    }
    return bundle.players.filter((player) => ids.has(player.id));
  }, [bundle]);

  useEffect(() => {
    const map: Record<string, number> = {};
    for (const rating of bundle.ratings) {
      if (rating.myValue) map[rating.playerId] = rating.myValue;
    }
    setValues(map);
  }, [bundle]);

  const submit = useCallback(
    async (playerId: string, value: number) => {
      setSaving(playerId);
      setError(null);
      try {
        await api(`/api/matches/${bundle.match.id}/ratings`, {
          method: "POST",
          body: { playerId, value },
        });
        setValues((current) => ({ ...current, [playerId]: value }));
        toast("تم حفظ تقييمك بنجاح.", "success");
        onChanged();
      } catch (err) {
        const message =
          err instanceof ApiClientError ? err.message : "تعذّر حفظ التقييم. حاول مجدداً.";
        setError(message);
        toast(message, "error");
      } finally {
        setSaving(null);
      }
    },
    [bundle.match.id, onChanged, toast],
  );

  return (
    <Panel className="p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="micro">PLAYER RATINGS</p>
          <h2 className="mt-1 text-2xl font-extrabold">تقييمات اللاعبين</h2>
        </div>
        <Pill tone={canRate ? "gold" : "neutral"}>
          {canRate ? "التقييم مفتوح" : "التقييم متاح بعد انتهاء المباراة"}
        </Pill>
      </div>

      {!loggedIn && (
        <p className="mt-4 rounded-xl border border-line bg-elevated px-4 py-3 text-sm text-muted">
          <Link href="/auth" className="text-gold-light font-bold underline underline-offset-4">
            سجّل الدخول
          </Link>{" "}
          لتقييم اللاعبين من 1 إلى 10.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-alert/40 bg-alert/12 px-4 py-3 text-sm text-alert">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {eligible.map((player) => {
          const rating = bundle.ratings.find((r) => r.playerId === player.id);
          return (
            <div
              key={player.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-elevated/40 px-4 py-3.5"
            >
              <PlayerAvatar player={player} size={48} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{player.name}</p>
                <p className="text-[0.76rem] text-dim">
                  {player.teamName} ·{" "}
                  {rating
                    ? `${rating.average.toFixed(1)} متوسط التقييم (${rating.count} صوت)`
                    : "لا تقييمات بعد"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 10 }).map((_, index) => {
                  const value = index + 1;
                  const active = (values[player.id] ?? 0) >= value;
                  return (
                    <button
                      key={value}
                      disabled={!canRate || saving === player.id}
                      onClick={() => void submit(player.id, value)}
                      aria-label={`تقييم ${player.name} بـ ${value}`}
                      className={cn(
                        "num size-7 rounded-md border text-[0.72rem] font-bold transition-colors",
                        active
                          ? "border-gold/60 bg-gold/20 text-gold-light"
                          : "border-line bg-surface text-dim hover:border-gold/40",
                        !canRate && "opacity-55",
                      )}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
