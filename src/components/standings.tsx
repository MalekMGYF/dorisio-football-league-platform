"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { Team } from "@/db/schema";
import type { StandingsRow } from "@/lib/league";
import { TeamCrest } from "@/components/crest";
import { cn } from "@/components/ui";
import { formatGoalDifference } from "@/lib/format";

const FORM_TONE: Record<string, string> = {
  W: "bg-live/18 text-live border-live/35",
  D: "bg-elevated text-muted border-line",
  L: "bg-alert/16 text-alert border-alert/35",
};

export function LeagueTable({
  rows,
  teams,
  dense = false,
  showForm = true,
  highlightTeamId,
}: {
  rows: StandingsRow[];
  teams: Team[];
  dense?: boolean;
  showForm?: boolean;
  highlightTeamId?: string | null;
}) {
  const reduce = useReducedMotion();
  const teamById = new Map(teams.map((team) => [team.id, team]));

  return (
    <div className="overflow-x-auto scroll-x">
      <table className="standings min-w-[640px]">
        <thead>
          <tr className="text-right">
            <th className="micro py-3 px-2 w-10">#</th>
            <th className="micro py-3 px-2 text-right">TEAM</th>
            <th className="micro py-3 px-2 text-center">MP</th>
            <th className="micro py-3 px-2 text-center">W</th>
            <th className="micro py-3 px-2 text-center">D</th>
            <th className="micro py-3 px-2 text-center">L</th>
            <th className="micro py-3 px-2 text-center">GF</th>
            <th className="micro py-3 px-2 text-center">GA</th>
            <th className="micro py-3 px-2 text-center">GD</th>
            {showForm && <th className="micro py-3 px-2 text-center">FORM</th>}
            <th className="micro py-3 px-2 text-center text-gold-light">PTS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const team = teamById.get(row.teamId);
            const highlighted = highlightTeamId === row.teamId;
            return (
              <motion.tr
                key={row.teamId}
                layout={!reduce}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
                className={cn(
                  "transition-colors",
                  highlighted ? "bg-gold/[0.07]" : "hover:bg-white/[0.025]",
                )}
              >
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "num text-[0.95rem] font-bold w-6 text-center",
                        row.position <= 3 ? "text-gold-light" : "text-muted",
                      )}
                    >
                      {row.position}
                    </span>
                    {row.position <= 3 && <span className="h-6 w-0.5 rounded-full bg-gold" />}
                  </div>
                </td>
                <td className="py-2.5 px-2">
                  <Link
                    href={team ? `/teams/${team.id}` : "#"}
                    className="flex items-center gap-2.5 min-w-0"
                  >
                    <TeamCrest team={team ?? null} size={dense ? 26 : 32} />
                    <span className="truncate font-bold text-[0.92rem]">{team?.name ?? "—"}</span>
                  </Link>
                </td>
                <td className="num text-center text-muted">{row.played}</td>
                <td className="num text-center text-muted">{row.won}</td>
                <td className="num text-center text-muted">{row.drawn}</td>
                <td className="num text-center text-muted">{row.lost}</td>
                <td className="num text-center text-muted">{row.goalsFor}</td>
                <td className="num text-center text-muted">{row.goalsAgainst}</td>
                <td
                  className={cn(
                    "num text-center font-bold",
                    row.goalDifference > 0
                      ? "text-live"
                      : row.goalDifference < 0
                        ? "text-alert"
                        : "text-muted",
                  )}
                >
                  {formatGoalDifference(row.goalDifference)}
                </td>
                {showForm && (
                  <td className="px-2">
                    <div className="flex items-center justify-center gap-1">
                      {row.form.length === 0 && <span className="text-dim text-xs">—</span>}
                      {row.form.map((letter, index) => (
                        <span
                          key={`${row.teamId}-${index}`}
                          className={cn(
                            "num size-5 rounded-md border text-[0.7rem] font-bold flex items-center justify-center",
                            FORM_TONE[letter],
                          )}
                        >
                          {letter}
                        </span>
                      ))}
                    </div>
                  </td>
                )}
                <td className="text-center">
                  <span className="num inline-flex min-w-[2.2rem] justify-center rounded-lg bg-elevated px-2 py-1 text-[1.05rem] font-bold text-paper">
                    {row.points}
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
