import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const teamsTable = pgTable("bioglow_teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  number: text("number").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  seasonName: text("season_name").notNull().default("BIOGLOW 2026–2027"),
  division: text("division").notNull().default("Challenge"),
  robotName: text("robot_name").notNull(),
  rulebookVersion: text("rulebook_version").notNull().default("Configuração pendente"),
  rulesUpdatedAt: date("rules_updated_at", { mode: "string" }).notNull(),
});

export const membersTable = pgTable("bioglow_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nickname: text("nickname"),
  active: boolean("active").notNull().default(true),
});

export const missionsTable = pgTable("bioglow_missions", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull().unique(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  maxPoints: integer("max_points"),
  scoreConfigStatus: text("score_config_status").notNull().default("pending"),
  warning: text("warning"),
  sourceReference: text("source_reference").notNull(),
});

export const roundsTable = pgTable("bioglow_rounds", {
  id: serial("id").primaryKey(),
  dateTime: timestamp("date_time", { withTimezone: true }).notNull(),
  type: text("type").notNull(),
  seasonName: text("season_name").notNull().default("BIOGLOW 2026–2027"),
  event: text("event").notNull().default(""),
  roundNumber: text("round_number").notNull().default(""),
  memberIds: integer("member_ids").array().notNull().default([]),
  plannedDurationSeconds: integer("planned_duration_seconds").notNull().default(150),
  actualDurationSeconds: integer("actual_duration_seconds"),
  robotVersion: text("robot_version").notNull().default(""),
  fieldSetup: text("field_setup").notNull().default(""),
  fieldConditions: text("field_conditions").notNull().default(""),
  generalNotes: text("general_notes").notNull().default(""),
  missionResults: jsonb("mission_results").notNull().default([]),
  tokens: jsonb("tokens").notNull().default({ started: 6, remaining: 6, interruptions: 0, notes: "" }),
  inspection: jsonb("inspection").notNull().default({ status: "unregistered", points: 0, notes: "" }),
  officialScore: integer("official_score"),
  officialScoreNotes: text("official_score_notes").notNull().default(""),
  status: text("status").notNull().default("saved"),
  totalScore: integer("total_score").notNull().default(0),
  estimatedScore: integer("estimated_score").notNull().default(0),
  attemptedMissions: integer("attempted_missions").notNull().default(0),
  problemsCount: integer("problems_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teamsTable).omit({ id: true });
export const insertMemberSchema = createInsertSchema(membersTable).omit({ id: true });
export const insertMissionSchema = createInsertSchema(missionsTable).omit({ id: true });
export const insertRoundSchema = createInsertSchema(roundsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type Team = typeof teamsTable.$inferSelect;
export type Member = typeof membersTable.$inferSelect;
export type Mission = typeof missionsTable.$inferSelect;
export type Round = typeof roundsTable.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type InsertMission = z.infer<typeof insertMissionSchema>;
export type InsertRound = z.infer<typeof insertRoundSchema>;