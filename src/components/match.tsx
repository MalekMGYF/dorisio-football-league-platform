"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, Sparkles } from "lucide-react";
import type { Match, MatchEvent, Team } from "@/db/schema";
import { TeamCrest } from "@/components/crest";
import { cn, Pill } from "@/components/ui";
import { EVENT_EMOJI, EVENT_TYPE_AR, MATCH_STATUS_AR } from "@/lib/domain";
import { formatShortDate, formatTime } from "@/lib/format";

export function LiveBadge({ status }: { status: string }) {
  if (status === "live") {
    return (
      <Pill tone="live">
        <span className="live-dot size-2 rounded-full bg-live" aria-hidden="true" />
        مباشر
      </Pill>
    );
  }
  if (status === "ht") return <Pill tone="amber">استراحة</Pill>;
  if (status === "ft") return <Pill tone="neutral">انتهت</Pill>;
  return <Pill tone="gold">{MATCH_STATUS_AR[status] ?? status}</Pill>;
}

export function MatchMinute({ match }: { match: Match }) {
  if (match.status === "live") {
    return (
      <span className="num text-live text-[1.05rem] font-bold">{match.minute}&apos;</span>
    );
  }
  if (match.status === "ht") return <span className="num text-amber text-[1.05rem] font-bold">HT</span>;
  if (match.status === "ft") return <span className="num text-dim text-[1.05rem] font-bold">FT</span>;
  return null;
}

export function MatchCard({
  match,
  events = [],
  compact = false,
  index = 0,
}: {
  match: Match & { homeTeam: Team | null; awayTeam: Team | null };
  events?: MatchEvent[];
  compact?: boolean;
  index?: number;
}) {
  const reduce = useReducedMotion();
  const latest = events.slice(0, 2);
  const isLive = match.status === "live" || match.status === "ht";
  const showScore = match.status !== "scheduled";

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.42, delay: Math.min(index * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduce ? undefined : { y: -3 }}
      className="group"
    >
      <Link
        href={`/matches/${match.id}`}
        className={cn(
          "block rounded-2xl border bg-surface transition-colors overflow-hidden",
          isLive ? "border-live/45" : "border-line hover:border-gold/45",
        )}
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          <div className="flex items-center gap-2">
            <LiveBadge status={match.status} />
            <span className="micro">
              {match.round ? `ROUND ${match.round}` : "MATCH"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[0.75rem] text-dim">
            {match.venue && (
              <span className="hidden sm:flex items-center gap-1">
                <MapPin size={12} /> {match.venue}
              </span>
            )}
            <span className="num text-muted">
              {formatShortDate(match.kickoffAt)} · {formatTime(match.kickoffAt)}
            </span>
          </div>
        </div>

        <div className={cn("grid items-center gap-2 px-4", compact ? "py-3" : "py-5")}>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <TeamCrest team={match.homeTeam} size={compact ? 32 : 42} />
              <span className="truncate font-bold text-[0.98rem]">
                {match.homeTeam?.name ?? "—"}
              </span>
            </div>

            <div className="flex items-center gap-2 px-1">
              {showScore ? (
                <>
                  <ScoreDigit value={match.homeScore} highlight={isLive} />
                  <span className="text-dim num text-xl">:</span>
                  <ScoreDigit value={match.awayScore} highlight={isLive} />
                </>
              ) : (
                <span className="num text-lg font-bold text-muted px-3 py-1 rounded-lg border border-line bg-elevated">
                  {formatTime(match.kickoffAt)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 min-w-0 flex-row-reverse">
              <TeamCrest team={match.awayTeam} size={compact ? 32 : 42} />
              <span className="truncate font-bold text-[0.98rem] text-left">
                {match.awayTeam?.name ?? "—"}
              </span>
            </div>
          </div>

          {!compact && latest.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {latest.map((event) => (
                <span
                  key={event.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-elevated px-2.5 py-1 text-[0.72rem] text-muted"
                >
                  <span aria-hidden="true">{EVENT_EMOJI[event.type] ?? "•"}</span>
                  <span className="num text-paper">{event.minute}&apos;</span>
                  {EVENT_TYPE_AR[event.type] ?? event.type}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export function ScoreDigit({
  value,
  highlight = false,
  size = "md",
}: {
  value: number;
  highlight?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-2xl min-w-[1.6rem]",
    md: "text-4xl min-w-[2.2rem]",
    lg: "text-6xl sm:text-7xl min-w-[3.4rem]",
  };
  return (
    <motion.span
      key={value}
      initial={{ y: 10, opacity: 0.35, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className={cn(
        "num font-bold text-center leading-none",
        sizes[size],
        highlight ? "text-paper score-glow" : "text-paper",
      )}
    >
      {value}
    </motion.span>
  );
}

export interface TimelineEntry extends MatchEvent {
  playerName?: string | null;
  teamName?: string | null;
  assistName?: string | null;
  playerInName?: string | null;
  playerOutName?: string | null;
}

export function EventTimeline({
  events,
  onEdit,
  onDelete,
}: {
  events: TimelineEntry[];
  onEdit?: (event: TimelineEntry) => void;
  onDelete?: (event: TimelineEntry) => void;
}) {
  const reduce = useReducedMotion();
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line py-10 text-center text-muted text-sm">
        لا توجد أحداث مسجّلة بعد. سيبدأ الخط الزمني مع صافرة البداية.
      </div>
    );
  }

  return (
    <ol className="relative">
      {events.map((event, index) => (
        <motion.li
          key={event.id}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 22 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            type: "spring",
            stiffness: 320,
            damping: 28,
            delay: Math.min(index * 0.035, 0.28),
          }}
          className="group relative flex gap-4 pb-5 last:pb-0"
        >
          <div className="flex w-12 shrink-0 flex-col items-center">
            <span className="num text-lg font-bold text-gold-light">{event.minute}&apos;</span>
            <span
              className={cn(
                "mt-1 size-8 rounded-full border flex items-center justify-center text-sm",
                event.type === "goal" || event.type === "own_goal"
                  ? "border-live/50 bg-live/12"
                  : event.type === "red"
                    ? "border-alert/50 bg-alert/12"
                    : event.type === "yellow"
                      ? "border-amber/50 bg-amber/12"
                      : "border-line bg-elevated",
              )}
              aria-hidden="true"
            >
              {EVENT_EMOJI[event.type] ?? "•"}
            </span>
            <span className="mt-2 w-px flex-1 bg-line-soft" />
          </div>

          <div className="flex-1 rounded-xl border border-line bg-surface px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold leading-snug">
                  {event.playerName ?? EVENT_TYPE_AR[event.type] ?? event.type}
                  {event.type === "goal" && event.assistName && (
                    <span className="text-muted font-medium"> — تمريرة {event.assistName}</span>
                  )}
                  {event.type === "substitution" && (
                    <span className="text-muted font-medium">
                      {" "}
                      — دخول {event.playerInName ?? "لاعب"} / خروج {event.playerOutName ?? "لاعب"}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-[0.78rem] text-dim">
                  {event.teamName ? `${event.teamName} · ` : ""}
                  {EVENT_TYPE_AR[event.type] ?? event.type}
                </p>
              </div>
              {(onEdit || onDelete) && (
                <div className="flex items-center gap-1.5 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(event)}
                      className="rounded-lg border border-line px-2.5 py-1 text-[0.72rem] font-bold text-muted hover:text-paper hover:border-gold/50"
                    >
                      تعديل
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(event)}
                      className="rounded-lg border border-alert/40 px-2.5 py-1 text-[0.72rem] font-bold text-alert hover:bg-alert/12"
                    >
                      حذف
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

export function GoalFlash({ show, playerName }: { show: boolean; playerName: string | null }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: show ? 1 : 0, y: show ? 0 : -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-3 overflow-hidden px-4 py-4",
        !show && "invisible",
      )}
      aria-hidden={!show}
    >
      <div className="relative flex items-center gap-3 rounded-full border border-gold/50 bg-ink/85 px-6 py-3">
        <Sparkles className="text-gold" size={20} />
        <span className="text-gold-light font-extrabold text-lg">هــدف!</span>
        {playerName && <span className="num text-2xl font-bold text-paper">{playerName}</span>}
      </div>
    </motion.div>
  );
}
