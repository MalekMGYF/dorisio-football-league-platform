"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { MatchLineup, Player, Team } from "@/db/schema";
import { TeamCrest } from "@/components/crest";
import { PositionBadge } from "@/components/player";
import { cn } from "@/components/ui";

type LineupEntry = MatchLineup & { player: Player | null };

const ROW_ORDER = ["GK", "DEF", "MID", "FWD"];
const POSITION_LABEL: Record<string, string> = {
  GK: "حارس",
  DEF: "مدافع",
  MID: "وسط",
  FWD: "مهاجم",
};

function PlayerToken({
  entry,
  color,
  compact = false,
}: {
  entry: LineupEntry;
  color: string;
  compact?: boolean;
}) {
  const reduce = useReducedMotion();
  const player = entry.player;
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.86 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="flex w-[4.6rem] flex-col items-center gap-1 text-center"
    >
      <div
        className={cn(
          "relative grid place-items-center rounded-full border-2 bg-ink/85 font-bold",
          compact ? "size-9 text-[0.72rem]" : "size-11 text-[0.82rem]",
        )}
        style={{ borderColor: color }}
      >
        <span className="num text-paper">{player?.shirtNumber ?? "—"}</span>
      </div>
      <span className="w-full truncate text-[0.66rem] font-bold text-paper/90 leading-tight">
        {player?.name ?? "لاعب"}
      </span>
      <PositionBadge position={entry.position} />
    </motion.div>
  );
}

function SideLineup({
  team,
  entries,
  formation,
  color,
}: {
  team: Team | null;
  entries: LineupEntry[];
  formation?: string | null;
  color: string;
}) {
  const starters = entries.filter((entry) => entry.isStarting);
  const subs = entries.filter((entry) => !entry.isStarting);
  // Always render the four lanes in the rules-defined order. The API rejects
  // incomplete or duplicate-position lineups, so each lane contains one player
  // after a valid save.
  const rows = ROW_ORDER.map((position) => ({
    position,
    items: starters.filter((entry) => entry.position === position),
  }));

  return (
    <div className="px-3 py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <TeamCrest team={team} size={34} />
          <div>
            <p className="font-extrabold leading-tight">{team?.name ?? "—"}</p>
            {formation && <p className="micro text-[0.6rem]">{formation}</p>}
          </div>
        </div>
        <span className="micro">STARTING 4</span>
      </div>

      <div className="flex flex-col gap-4">
        {rows.map((row) => (
          <div key={row.position} className="flex min-h-16 items-center justify-center gap-3">
            <span className="micro w-12 text-left text-[0.55rem]">{POSITION_LABEL[row.position]}</span>
            <div className="flex items-start justify-center gap-3">
              {row.items.length > 0 ? (
                row.items.map((entry) => (
                  <PlayerToken key={entry.id} entry={entry} color={color} />
                ))
              ) : (
                <span className="grid size-11 place-items-center rounded-full border border-dashed border-white/20 text-dim">
                  —
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {subs.length > 0 && (
        <div className="mt-6">
          <p className="micro mb-2.5">SUBSTITUTES</p>
          <div className="flex flex-wrap gap-3">
            {subs.map((entry) => (
              <PlayerToken key={entry.id} entry={entry} color={color} compact />
            ))}
          </div>
        </div>
      )}
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
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/pitch-texture.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover opacity-70"
      />
      <div className="absolute inset-0 bg-ink/72" />
      <div className="absolute inset-3 rounded-xl border border-white/12" />
      <div className="absolute inset-x-3 top-1/2 h-px bg-white/12" />
      <div className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12" />

      <div className="relative divide-y divide-white/10">
        {empty ? (
          <div className="py-16 text-center text-muted">
            لم تُعلن التشكيلة بعد. يقوم مدير الدوري بتسجيل التشكيلة قبل انطلاق المباراة.
          </div>
        ) : (
          <>
            <SideLineup
              team={awayTeam}
              entries={awayEntries}
              formation={awayFormation}
              color={awayTeam?.primaryColor ?? "#C9A227"}
            />
            <SideLineup
              team={homeTeam}
              entries={homeEntries}
              formation={homeFormation}
              color={homeTeam?.primaryColor ?? "#23C16B"}
            />
          </>
        )}
      </div>
    </div>
  );
}
