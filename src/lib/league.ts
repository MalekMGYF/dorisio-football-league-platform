import type { Match, MatchEvent, Player, Rating, Team } from "@/db/schema";

export type FormLetter = "W" | "D" | "L";

export interface StandingsRow {
  teamId: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: FormLetter[];
}

/**
 * Standings are always derived from authoritative match data — never stored —
 * so deleting or correcting an event can never leave the table inconsistent.
 * Sort: points, goal difference, goals scored, then head-to-head name.
 */
export function computeStandings(teams: Team[], matches: Match[]): StandingsRow[] {
  const rows = new Map<string, StandingsRow>();
  for (const team of teams) {
    rows.set(team.id, {
      teamId: team.id,
      position: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
    });
  }

  const finished = matches
    .filter((m) => m.status === "ft")
    .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime());

  for (const match of finished) {
    const home = rows.get(match.homeTeamId);
    const away = rows.get(match.awayTeamId);
    if (!home || !away) continue;
    const hs = match.homeScore;
    const as = match.awayScore;
    home.played += 1;
    away.played += 1;
    home.goalsFor += hs;
    home.goalsAgainst += as;
    away.goalsFor += as;
    away.goalsAgainst += hs;
    if (hs > as) {
      home.won += 1;
      away.lost += 1;
      home.points += 3;
      home.form.push("W");
      away.form.push("L");
    } else if (hs < as) {
      away.won += 1;
      home.lost += 1;
      away.points += 3;
      away.form.push("W");
      home.form.push("L");
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
      home.form.push("D");
      away.form.push("D");
    }
  }

  const list = Array.from(rows.values()).map((r) => ({
    ...r,
    goalDifference: r.goalsFor - r.goalsAgainst,
    form: r.form.slice(-5),
  }));

  list.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.teamId.localeCompare(b.teamId),
  );

  return list.map((row, index) => ({ ...row, position: index + 1 }));
}

export interface PlayerStat {
  playerId: string;
  goals: number;
  ownGoals: number;
  assists: number;
  yellow: number;
  red: number;
  appearances: number;
  minutes: number;
  motm: number;
  ratingCount: number;
  ratingAvg: number | null;
}

export function computePlayerStats(
  players: Player[],
  events: MatchEvent[],
  matches: Match[],
  ratings: Rating[],
): Map<string, PlayerStat> {
  const stats = new Map<string, PlayerStat>();
  const ensure = (id: string) => {
    let s = stats.get(id);
    if (!s) {
      s = {
        playerId: id,
        goals: 0,
        ownGoals: 0,
        assists: 0,
        yellow: 0,
        red: 0,
        appearances: 0,
        minutes: 0,
        motm: 0,
        ratingCount: 0,
        ratingAvg: null,
      };
      stats.set(id, s);
    }
    return s;
  };
  for (const p of players) ensure(p.id);

  for (const ev of events) {
    if (ev.type === "kickoff" || ev.type === "ht" || ev.type === "ft" || ev.type === "note") continue;
    if (!ev.playerId) continue;
    const s = ensure(ev.playerId);
    if (ev.type === "goal") s.goals += 1;
    else if (ev.type === "own_goal") s.ownGoals += 1;
    else if (ev.type === "assist") s.assists += 1;
    else if (ev.type === "yellow") s.yellow += 1;
    else if (ev.type === "red") s.red += 1;
  }

  for (const match of matches) {
    if (match.motmPlayerId) ensure(match.motmPlayerId).motm += 1;
    if (match.status === "ft") {
      // appearances are credited to every player who appeared in a match event
      const involved = new Set(
        events
          .filter((e) => e.matchId === match.id && e.playerId)
          .map((e) => e.playerId as string),
      );
      for (const id of involved) {
        const s = ensure(id);
        s.appearances += 1;
        s.minutes += match.minute || 0;
      }
    }
  }

  const byPlayer = new Map<string, number[]>();
  for (const r of ratings) {
    if (!byPlayer.has(r.playerId)) byPlayer.set(r.playerId, []);
    byPlayer.get(r.playerId)!.push(r.value);
  }
  for (const [playerId, values] of byPlayer) {
    const s = ensure(playerId);
    s.ratingCount = values.length;
    s.ratingAvg = values.reduce((a, b) => a + b, 0) / values.length;
  }

  return stats;
}

export function teamForm(matches: Match[], teamId: string): FormLetter[] {
  return matches
    .filter((m) => m.status === "ft" && (m.homeTeamId === teamId || m.awayTeamId === teamId))
    .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime())
    .map((m) => {
      const isHome = m.homeTeamId === teamId;
      const gf = isHome ? m.homeScore : m.awayScore;
      const ga = isHome ? m.awayScore : m.homeScore;
      return gf > ga ? "W" : gf < ga ? "L" : "D";
    })
    .slice(-5);
}

/** Idempotent round-robin schedule (circle method) with correct byes for odd counts. */
export function generateRoundRobin(teamIds: string[]): { round: number; home: string; away: string }[] {
  const ids = [...teamIds];
  if (ids.length < 2) return [];
  const hasBye = ids.length % 2 === 1;
  const teams = hasBye ? ["BYE", ...ids] : ids;
  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;
  const fixtures: { round: number; home: string; away: string }[] = [];

  const rotating = teams.slice(1);
  for (let round = 0; round < rounds; round++) {
    const day = [teams[0], ...rotating];
    for (let i = 0; i < half; i++) {
      const a = day[i];
      const b = day[n - 1 - i];
      if (a === "BYE" || b === "BYE") continue;
      const homeFirst = (round + i) % 2 === 0;
      fixtures.push({ round: round + 1, home: homeFirst ? a : b, away: homeFirst ? b : a });
    }
    rotating.unshift(rotating.pop()!);
  }
  return fixtures;
}
