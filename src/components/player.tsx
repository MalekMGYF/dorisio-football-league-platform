"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { PlayerWithStats } from "@/lib/types";
import { TeamCrest } from "@/components/crest";
import { cn, Pill } from "@/components/ui";
import { POSITION_SHORT_AR, POSITION_AR } from "@/lib/domain";

const POSITION_TONE: Record<string, string> = {
  GK: "bg-gold/16 text-gold-light border-gold/40",
  DEF: "bg-pitch/25 text-live border-pitch/50",
  MID: "bg-elevated text-muted border-line",
  FWD: "bg-alert/14 text-alert border-alert/35",
};

export function PlayerAvatar({
  player,
  size = 56,
  className = "",
}: {
  player: { name: string; photoUrl?: string | null; position?: string | null };
  size?: number;
  className?: string;
}) {
  if (player.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={player.photoUrl}
        alt={player.name}
        width={size}
        height={size}
        loading="lazy"
        className={cn("rounded-2xl object-cover border border-line", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-2xl border border-line bg-elevated overflow-hidden",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 opacity-60 [background:radial-gradient(circle_at_30%_20%,rgba(35,193,107,0.28),transparent_65%)]" />
      <span
        className="relative font-extrabold text-live"
        style={{ fontSize: size * 0.32 }}
      >
        {player.name.trim().slice(0, 1)}
      </span>
    </div>
  );
}

export function PlayerCard({
  player,
  index = 0,
}: {
  player: PlayerWithStats;
  index?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.42, delay: Math.min(index * 0.045, 0.32) }}
      whileHover={reduce ? undefined : { y: -5 }}
      whileTap={reduce ? undefined : { scale: 0.985 }}
    >
      <Link
        href={`/players/${player.id}`}
        className="group relative block overflow-hidden rounded-2xl border border-line bg-surface"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <div
          className="relative h-28"
          style={{
            background: `linear-gradient(150deg, ${player.teamPrimaryColor ?? "#0F7A46"} 0%, #0A0E0C 78%)`,
          }}
        >
          <div className="absolute inset-0 pitch-lines opacity-40" />
          <div className="absolute bottom-0 right-0 flex items-end gap-3 p-3">
            <PlayerAvatar player={player} size={64} className="ring-2 ring-ink/60" />
            <div className="pb-1">
              <p className="font-extrabold text-[1.02rem] leading-tight text-paper drop-shadow">
                {player.name}
              </p>
              <p className="text-[0.75rem] text-paper/75">{player.teamName ?? "بدون فريق"}</p>
            </div>
          </div>
          <span className="num absolute left-3 top-3 text-3xl font-bold text-white/22">
            {player.shirtNumber ?? "—"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-line-soft px-3.5 py-2.5">
          <Pill className={POSITION_TONE[player.position] ?? "bg-elevated text-muted border-line"}>
            {POSITION_AR[player.position] ?? player.position}
          </Pill>
          {player.isCaptain && <Pill tone="gold">قائد</Pill>}
          {player.stats.motm > 0 && (
            <Pill tone="neutral">رجل المباراة ×{player.stats.motm}</Pill>
          )}
        </div>

        <div className="grid grid-cols-4 divide-x divide-x-reverse divide-line-soft">
          {[
            { label: "GOALS", value: player.stats.goals },
            { label: "ASSISTS", value: player.stats.assists },
            { label: "APPS", value: player.stats.appearances },
            {
              label: "RATING",
              value: player.stats.ratingAvg ? player.stats.ratingAvg.toFixed(1) : "—",
            },
          ].map((stat) => (
            <div key={stat.label} className="px-2 py-3 text-center">
              <p className="num text-[1.15rem] font-bold leading-none">{stat.value}</p>
              <p className="micro mt-1 text-[0.58rem]">{stat.label}</p>
            </div>
          ))}
        </div>
      </Link>
    </motion.div>
  );
}

export function PositionBadge({ position }: { position: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border px-2 py-0.5 text-[0.72rem] font-bold",
        POSITION_TONE[position] ?? "bg-elevated text-muted border-line",
      )}
    >
      {POSITION_SHORT_AR[position] ?? position}
    </span>
  );
}

export function TeamBadgeRow({ player }: { player: PlayerWithStats }) {
  return (
    <div className="flex items-center gap-2 text-muted">
      <TeamCrest
        team={{
          name: player.teamName ?? "—",
          shortName: player.teamShortName,
          primaryColor: player.teamPrimaryColor ?? "#0F7A46",
          secondaryColor: player.teamSecondaryColor ?? "#E8C766",
          logoUrl: null,
        }}
        size={22}
      />
      <span className="text-[0.82rem] font-bold">{player.teamName ?? "—"}</span>
    </div>
  );
}
