import type {
  Award,
  League,
  Match,
  MatchEvent,
  MatchLineup,
  Player,
  Team,
} from "@/db/schema";
import type { StandingsRow, PlayerStat } from "@/lib/league";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  phone: string | null;
  shirtNumber: number | null;
  position: string | null;
  teamId: string | null;
  role: "user" | "admin";
  provider: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface TeamWithStats extends Team {
  stats: StandingsRow | null;
  form: ("W" | "D" | "L")[];
  squadCount: number;
}

export interface PlayerWithStats extends Player {
  stats: PlayerStat;
  teamName: string | null;
  teamShortName: string | null;
  teamPrimaryColor: string | null;
  teamSecondaryColor: string | null;
  leagueName: string | null;
}

export interface MatchCardData extends Match {
  homeTeam: Team | null;
  awayTeam: Team | null;
  events: MatchEvent[];
}

export interface OverviewPayload {
  league: League | null;
  leagues: League[];
  teams: TeamWithStats[];
  players: PlayerWithStats[];
  matches: MatchCardData[];
  liveMatch: MatchCardData | null;
  nextMatch: MatchCardData | null;
  standings: StandingsRow[];
  topScorers: PlayerWithStats[];
  topAssists: PlayerWithStats[];
  playerOfWeek: (Award & { player: Player | null; team: Team | null }) | null;
  awards: (Award & { player: Player | null; team: Team | null })[];
  announcements: {
    id: string;
    title: string;
    body: string;
    imageUrl: string | null;
    tag: string | null;
    createdAt: string;
  }[];
  serverTime: string;
}

export interface MatchBundle {
  match: Match;
  homeTeam: Team | null;
  awayTeam: Team | null;
  events: MatchEvent[];
  lineups: (MatchLineup & { player: Player | null })[];
  players: PlayerWithStats[];
  league: League | null;
  ratings: {
    playerId: string;
    average: number;
    count: number;
    myValue: number | null;
  }[];
  serverTime: string;
}
