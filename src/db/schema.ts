import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Dorisio — PostgreSQL schema (Drizzle ORM).
 * All timestamps are stored in UTC. All identifiers are UUIDs except match
 * events, which use client-generated ids so that offline writes are idempotent.
 */

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    provider: text("provider").notNull().default("credentials"),
    photoUrl: text("photo_url"),
    phone: text("phone"),
    shirtNumber: integer("shirt_number"),
    position: text("position"),
    teamId: uuid("team_id"),
    leagueId: uuid("league_id"),
    role: text("role").notNull().default("user"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastLoginAt: timestamp("last_login_at"),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("sessions_user_idx").on(t.userId)],
);

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    email: text("email"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("oauth_accounts_unique").on(t.provider, t.providerAccountId)],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("password_reset_tokens_idx").on(t.tokenHash)],
);

export const leagues = pgTable("leagues", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  season: text("season").notNull(),
  logoUrl: text("logo_url"),
  description: text("description"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  matchDuration: integer("match_duration").notNull().default(30),
  venue: text("venue"),
  status: text("status").notNull().default("upcoming"),
  championTeamId: uuid("champion_team_id"),
  isCurrent: boolean("is_current").default(true),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leagueId: uuid("league_id").notNull(),
    name: text("name").notNull(),
    shortName: text("short_name"),
    logoUrl: text("logo_url"),
    primaryColor: text("primary_color").notNull().default("#0F7A46"),
    secondaryColor: text("secondary_color").notNull().default("#E8C766"),
    captainId: uuid("captain_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("teams_league_name_idx").on(t.leagueId, t.name)],
);

export const players = pgTable(
  "players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leagueId: uuid("league_id").notNull(),
    teamId: uuid("team_id").notNull(),
    userId: uuid("user_id"),
    name: text("name").notNull(),
    photoUrl: text("photo_url"),
    shirtNumber: integer("shirt_number"),
    position: text("position").notNull().default("MID"),
    isCaptain: boolean("is_captain").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("players_team_shirt_idx").on(t.teamId, t.shirtNumber)],
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leagueId: uuid("league_id").notNull(),
    round: integer("round").notNull().default(1),
    homeTeamId: uuid("home_team_id").notNull(),
    awayTeamId: uuid("away_team_id").notNull(),
    kickoffAt: timestamp("kickoff_at").notNull(),
    venue: text("venue"),
    status: text("status").notNull().default("scheduled"),
    homeScore: integer("home_score").notNull().default(0),
    awayScore: integer("away_score").notNull().default(0),
    minute: integer("minute").notNull().default(0),
    phase: text("phase").notNull().default("pre"),
    timerStartedAt: timestamp("timer_started_at"),
    timerElapsedMs: integer("timer_elapsed_ms").notNull().default(0),
    timerRunning: boolean("timer_running").notNull().default(false),
    revision: integer("revision").notNull().default(0),
    motmPlayerId: uuid("motm_player_id"),
    homeFormation: text("home_formation").default("2-2"),
    awayFormation: text("away_formation").default("2-2"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("matches_pair_idx").on(t.leagueId, t.homeTeamId, t.awayTeamId, t.round)],
);

export const matchEvents = pgTable(
  "match_events",
  {
    /** Client-generated (uuid) so offline writes are idempotent. */
    id: text("id").primaryKey(),
    matchId: uuid("match_id").notNull(),
    minute: integer("minute").notNull().default(0),
    type: text("type").notNull(),
    teamId: uuid("team_id"),
    playerId: uuid("player_id"),
    assistPlayerId: uuid("assist_player_id"),
    playerInId: uuid("player_in_id"),
    playerOutId: uuid("player_out_id"),
    note: text("note"),
    clientAt: timestamp("client_at"),
    createdById: uuid("created_by_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("match_events_match_idx").on(t.matchId, t.minute, t.type, t.playerId)],
);

export const matchLineups = pgTable(
  "match_lineups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: uuid("match_id").notNull(),
    teamId: uuid("team_id").notNull(),
    playerId: uuid("player_id").notNull(),
    isStarting: boolean("is_starting").notNull().default(true),
    position: text("position").notNull().default("MID"),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (t) => [unique("match_lineups_unique").on(t.matchId, t.playerId)],
);

export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: uuid("match_id").notNull(),
    playerId: uuid("player_id").notNull(),
    userId: uuid("user_id").notNull(),
    value: integer("value").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [unique("ratings_unique").on(t.matchId, t.playerId, t.userId)],
);

export const awards = pgTable("awards", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueId: uuid("league_id").notNull(),
  season: text("season").notNull(),
  type: text("type").notNull(),
  playerId: uuid("player_id"),
  teamId: uuid("team_id"),
  label: text("label"),
  reason: text("reason"),
  weekLabel: text("week_label"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const announcements = pgTable("announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  imageUrl: text("image_url"),
  tag: text("tag").default("خبر"),
  published: boolean("published").notNull().default(true),
  createdById: uuid("created_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: text("type").notNull().default("info"),
  linkUrl: text("link_url"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("push_subscriptions_endpoint_idx").on(t.endpoint)],
);

export type User = typeof users.$inferSelect;
export type League = typeof leagues.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type MatchEvent = typeof matchEvents.$inferSelect;
export type MatchLineup = typeof matchLineups.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type Award = typeof awards.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
