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

function Position({ position }: { position: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "num text-[0.95rem] font-bold w-6 text-center",
          position <= 3 ? "text-gold-light" : "text-muted",
        )}
      >
        {position}
      </span>
      {position <= 3 && <span className="h-6 w-0.5 rounded-full bg-gold" />}
    </div>
  );
}

function Form({ form, teamId, compact = false }: { form: string[]; teamId: string; compact?: boolean }) {
  if (form.length === 0) return <span className="text-dim text-xs">—</span>;

  return (
    <div className="flex items-center justify-end gap-1">
      {form.map((letter, index) => (
        <span
          key={`${teamId}-${index}`}
          className={cn(
            "num rounded-md border font-bold flex items-center justify-center",
            compact ? "size-5 text-[0.65rem]" : "size-5 text-[0.7rem]",
            FORM_TONE[letter],
          )}
        >
          {letter}
        </span>
      ))}
    </div>
  );
}

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
    <>
      {/* Mobile: cards avoid forcing the 11-column table into a narrow viewport. */}
      <div className="space-y-2 sm:hidden">
        {rows.map((row) => {
          const team = teamById.get(row.teamId);
          const highlighted = highlightTeamId === row.teamId;

          return (
            <motion.div
              key={`mobile-${row.teamId}`}
              layout={!reduce}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className={cn(
                "rounded-xl border border-line-soft bg-ink/35 p-3",
                highlighted && "border-gold/40 bg-gold/[0.07]",
              )}
            >
              <div className="flex items-center gap-2.5">
                <Position position={row.position} />
                <Link
                  href={team ? `/teams/${team.id}` : "#"}
                  className="flex min-w-0 flex-1 items-center gap-2.5"
                >
                  <TeamCrest team={team ?? null} size={32} />
                  <span className="truncate text-[0.95rem] font-bold">
                    {team?.name ?? "—"}
                  </span>
                </Link>
                <span className="num inline-flex min-w-10 justify-center rounded-lg bg-elevated px-2 py-1 text-base font-bold text-paper">
                  {row.points}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-1.5 border-t border-line-soft pt-2.5 text-center">
                {[
                  ["لعب", row.played],
                  ["فوز", row.won],
                  ["تعادل", row.drawn],
                  ["خسارة", row.lost],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="micro text-[0.58rem]">{label}</p>
                    <p className="num mt-1 text-sm font-bold text-muted">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-2.5 flex items-center justify-between text-xs text-dim">
                <div className="flex items-center gap-2">
                  <span>له <b className="num text-muted">{row.goalsFor}</b></span>
                  <span>عليه <b className="num text-muted">{row.goalsAgainst}</b></span>
                  <span>
                    الفارق{" "}
                    <b
                      className={cn(
                        "num",
                        row.goalDifference > 0
                          ? "text-live"
                          : row.goalDifference < 0
                            ? "text-alert"
                            : "text-muted",
                      )}
                    >
                      {formatGoalDifference(row.goalDifference)}
                    </b>
                  </span>
                </div>
                {showForm && <Form form={row.form} teamId={row.teamId} compact />}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Desktop/tablet: retain the full statistics table. */}
      <div className="hidden overflow-x-auto scroll-x sm:block">
        <table className="standings min-w-[640px]">
          <thead>
            <tr className="text-right">
              <th className="micro w-10 px-2 py-3">#</th>
              <th className="micro px-2 py-3 text-right">TEAM</th>
              <th className="micro px-2 py-3 text-center">MP</th>
              <th className="micro px-2 py-3 text-center">W</th>
              <th className="micro px-2 py-3 text-center">D</th>
              <th className="micro px-2 py-3 text-center">L</th>
              <th className="micro px-2 py-3 text-center">GF</th>
              <th className="micro px-2 py-3 text-center">GA</th>
              <th className="micro px-2 py-3 text-center">GD</th>
              {showForm && <th className="micro px-2 py-3 text-center">FORM</th>}
              <th className="micro px-2 py-3 text-center text-gold-light">PTS</th>
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
                  <td className="px-2 py-2.5"><Position position={row.position} /></td>
                  <td className="px-2 py-2.5">
                    <Link href={team ? `/teams/${team.id}` : "#"} className="flex min-w-0 items-center gap-2.5">
                      <TeamCrest team={team ?? null} size={dense ? 26 : 32} />
                      <span className="truncate text-[0.92rem] font-bold">{team?.name ?? "—"}</span>
                    </Link>
                  </td>
                  <td className="num text-center text-muted">{row.played}</td>
                  <td className="num text-center text-muted">{row.won}</td>
                  <td className="num text-center text-muted">{row.drawn}</td>
                  <td className="num text-center text-muted">{row.lost}</td>
                  <td className="num text-center text-muted">{row.goalsFor}</td>
                  <td className="num text-center text-muted">{row.goalsAgainst}</td>
                  <td className={cn(
                    "num text-center font-bold",
                    row.goalDifference > 0 ? "text-live" : row.goalDifference < 0 ? "text-alert" : "text-muted",
                  )}>{formatGoalDifference(row.goalDifference)}</td>
                  {showForm && <td className="px-2"><Form form={row.form} teamId={row.teamId} /></td>}
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
    </>
  );
}
