"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { MatchLineup, Player, Team } from "@/db/schema";
import { TeamCrest } from "@/components/crest";
import { cn } from "@/components/ui";

type LineupEntry = MatchLineup & { player: Player | null };

const POSITION_LABEL: Record<string, string> = {
  GK: "حارس",
  DEF: "دفاع",
  MID: "وسط",
  FWD: "هجوم",
};

const POSITION_Y: Record<string, number> = {
  GK: 12,
  DEF: 29,
  MID: 46,
  FWD: 63,
};

function PlayerToken({
  entry,
  color,
  y,
  flip = false,
}: {
  entry: LineupEntry;
  color: string;
  y: number;
  flip?: boolean;
}) {
  const reduce = useReducedMotion();
  const player = entry.player;
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.72, y: flip ? 10 : -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 23 }}
      className="absolute z-10 flex w-[5.8rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center sm:w-28"
      style={{ left: "50%", top: `${y}%` }}
    >
      <div
        className="relative grid size-11 place-items-center rounded-full border-[3px] bg-[#10251a]/95 shadow-[0_5px_14px_rgba(0,0,0,0.35)] sm:size-14"
        style={{ borderColor: color, boxShadow: `0 0 0 3px ${color}30, 0 6px 16px rgba(0,0,0,.35)` }}
      >
        <span className="num text-base font-bold text-white sm:text-xl">{player?.shirtNumber ?? "—"}</span>
        <span className="absolute -bottom-1 rounded-full border border-white/15 bg-[#10251a] px-1.5 py-0.5 text-[0.52rem] font-bold text-white/75 sm:text-[0.58rem]">
          {POSITION_LABEL[entry.position] ?? entry.position}
        </span>
      </div>
      <span className="mt-2 max-w-full truncate rounded-md bg-black/45 px-2 py-0.5 text-[0.68rem] font-extrabold text-white shadow-sm sm:text-[0.76rem]">
        {player?.name ?? "لاعب"}
      </span>
    </motion.div>
  );
}

function FieldTeamLabel({
  team,
  color,
  side,
}: {
  team: Team | null;
  color: string;
  side: "top" | "bottom";
}) {
  return (
    <div
      className={cn(
        "absolute z-20 flex items-center gap-2 rounded-xl border border-white/15 bg-black/35 px-2.5 py-2 backdrop-blur-md sm:px-3",
        side === "top" ? "left-3 top-3 sm:left-5 sm:top-5" : "bottom-3 right-3 sm:bottom-5 sm:right-5",
      )}
    >
      <TeamCrest team={team} size={28} />
      <div className="min-w-0">
        <p className="max-w-[8rem] truncate text-[0.75rem] font-extrabold text-white sm:text-sm">
          {team?.name ?? "—"}
        </p>
        <p className="micro text-[0.52rem]" style={{ color }}>
          التشكيلة الأساسية · 4 لاعبين
        </p>
      </div>
    </div>
  );
}

function SideEntries({
  entries,
  color,
  flip,
}: {
  entries: LineupEntry[];
  color: string;
  flip: boolean;
}) {
  return (
    <>
      {entries
        .filter((entry) => entry.isStarting)
        .map((entry) => {
          const base = POSITION_Y[entry.position] ?? 46;
          const y = flip ? 100 - base : base;
          return <PlayerToken key={entry.id} entry={entry} color={color} y={y} flip={flip} />;
        })}
    </>
  );
}

function Substitutes({ entries, color }: { entries: LineupEntry[]; color: string }) {
  const substitutes = entries.filter((entry) => !entry.isStarting);
  if (substitutes.length === 0) return null;
  return (
    <div className="border-t border-line-soft px-4 py-4 sm:px-6">
      <p className="micro mb-3">البدلاء</p>
      <div className="flex flex-wrap gap-2.5">
        {substitutes.map((entry) => (
          <div key={entry.id} className="flex items-center gap-2 rounded-xl border border-line bg-elevated/70 px-2.5 py-2">
            <span className="grid size-7 place-items-center rounded-full border-2 bg-ink text-xs font-bold" style={{ borderColor: color }}>
              {entry.player?.shirtNumber ?? "—"}
            </span>
            <span className="max-w-28 truncate text-xs font-bold">{entry.player?.name ?? "لاعب"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineupPitch({
  homeTeam,
  awayTeam,
  homeEntries,
  awayEntries,
  homeFormation,
  awayFormation,
}: {
  homeTeam: Team | null;
  awayTeam: Team | null;
  homeEntries: LineupEntry[];
  awayEntries: LineupEntry[];
  homeFormation?: string | null;
  awayFormation?: string | null;
}) {
  const empty = homeEntries.length === 0 && awayEntries.length === 0;
  const homeColor = homeTeam?.primaryColor ?? "#23C16B";
  const awayColor = awayTeam?.primaryColor ?? "#E8C766";

  if (empty) {
    return (
      <div className="rounded-3xl border border-line bg-surface py-20 text-center text-muted">
        لم تُعلن التشكيلة بعد. يقوم مدير الدوري بتسجيل التشكيلة قبل انطلاق المباراة.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d1b13] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 bg-surface/90 px-4 py-3 sm:px-6">
        <div>
          <p className="micro text-gold-light">TACTICAL BOARD</p>
          <p className="mt-0.5 text-sm font-bold text-paper">خطة المباراة · 4 ضد 4</p>
        </div>
        <div className="flex items-center gap-3 text-[0.7rem] text-muted">
          <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-gold" /> {awayFormation ?? "1-1-1-1"}</span>
          <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-live" /> {homeFormation ?? "1-1-1-1"}</span>
        </div>
      </div>

      <div className="relative mx-auto aspect-[4/5] w-full max-w-3xl overflow-hidden bg-[#176b3f] sm:aspect-[5/6]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.035)_50%,transparent_50%)] bg-[length:20%_100%]" />
        <div className="absolute inset-3 rounded-2xl border-2 border-white/35 sm:inset-5" />
        <div className="absolute inset-x-3 top-1/2 h-px bg-white/35 sm:inset-x-5" />
        <div className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/35 sm:size-32" />
        <div className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
        <div className="absolute left-1/2 top-3 h-[17%] w-[42%] -translate-x-1/2 border-2 border-t-0 border-white/35 sm:top-5" />
        <div className="absolute left-1/2 bottom-3 h-[17%] w-[42%] -translate-x-1/2 border-2 border-b-0 border-white/35 sm:bottom-5" />
        <div className="absolute left-1/2 top-3 h-[7%] w-[20%] -translate-x-1/2 border-2 border-t-0 border-white/35 sm:top-5" />
        <div className="absolute left-1/2 bottom-3 h-[7%] w-[20%] -translate-x-1/2 border-2 border-b-0 border-white/35 sm:bottom-5" />
        <div className="absolute left-1/2 top-0 h-3 w-[20%] -translate-x-1/2 border-x-2 border-b-2 border-white/45 bg-white/10 sm:h-4" />
        <div className="absolute left-1/2 bottom-0 h-3 w-[20%] -translate-x-1/2 border-x-2 border-t-2 border-white/45 bg-white/10 sm:h-4" />

        <FieldTeamLabel team={awayTeam} color={awayColor} side="top" />
        <FieldTeamLabel team={homeTeam} color={homeColor} side="bottom" />
        <SideEntries entries={awayEntries} color={awayColor} flip={false} />
        <SideEntries entries={homeEntries} color={homeColor} flip />
      </div>

      <div className="grid gap-3 bg-surface/80 sm:grid-cols-2">
        <Substitutes entries={awayEntries} color={awayColor} />
        <Substitutes entries={homeEntries} color={homeColor} />
      </div>
    </div>
  );
}
