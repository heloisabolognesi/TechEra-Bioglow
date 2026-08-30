import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, membersTable, missionsTable, roundsTable, teamsTable } from "@workspace/db";
import type { Member, Mission, Round } from "@workspace/db";

export const missionNames = [
  "Drone Survey",
  "Exploding Seeds",
  "Flip the Rock",
  "Lucky Leaves",
  "Reaching Roots",
  "Leafcutter Frenzy",
  "Humongous Fungus",
  "Tangled",
  "Research Platform",
  "Fragile Microhabitats",
  "Window to the Past",
  "Forest Elder",
  "Keystone Species",
  "Seeds of Renewal",
];

export const sourceReference = "FIRST LEGO League BIOGLOW Robot Game Rulebook 2026–2027 · configuração pendente";

export type MissionResultValue = {
  missionId: number;
  status: "not_attempted" | "failed" | "partial" | "complete" | "bonus" | "not_applicable";
  attempted: boolean;
  points: number;
  criteria: { label: string; achieved: boolean; quantity: number; points: number }[];
  failureType: string | null;
  technicalNotes: string;
  confidence: "low" | "medium" | "high";
};

export type TokenValue = { started: 6; remaining: number; interruptions: number; notes: string };
export type InspectionValue = { status: "approved" | "rejected" | "unregistered"; points: number; notes: string };

let seedPromise: Promise<void> | undefined;

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const [team] = await db.select({ id: teamsTable.id }).from(teamsTable).limit(1);
      if (!team) {
        await db.insert(teamsTable).values({
          name: "TechEra",
          number: "BR-000",
          city: "São Paulo",
          country: "Brasil",
          robotName: "Robô principal",
          rulesUpdatedAt: new Date().toISOString().slice(0, 10),
        });
      }

      const missionCount = await db.select({ count: sql<number>`count(*)` }).from(missionsTable);
      if (Number(missionCount[0]?.count ?? 0) === 0) {
        await db.insert(missionsTable).values(
          missionNames.map((name, index) => ({
            number: index + 1,
            code: `M${String(index + 1).padStart(2, "0")}`,
            name,
            description: "Critério oficial BIOGLOW ainda não importado. Registre a tentativa e anote o resultado para revisão.",
            maxPoints: null,
            scoreConfigStatus: "pending",
            warning: [12, 13, 14].includes(index + 1)
              ? "Esta missão usa docks intercambiáveis. Registre a configuração do campo no round."
              : null,
            sourceReference,
          })),
        );
      }
    })();
  }
  await seedPromise;
}

export async function memberMap(ids: number[]): Promise<Map<number, Member>> {
  if (!ids.length) return new Map();
  const members = await db.select().from(membersTable).where(inArray(membersTable.id, ids));
  return new Map(members.map((member) => [member.id, member]));
}

export function withMembers(round: Round, members: Map<number, Member>) {
  return {
    ...round,
    members: (round.memberIds ?? []).map((memberId) => members.get(memberId)).filter(Boolean).map((member) => ({
      memberId: member!.id,
      name: member!.name,
      nickname: member!.nickname,
    })),
    missionResults: (round.missionResults ?? []) as MissionResultValue[],
    tokens: round.tokens as TokenValue,
    inspection: round.inspection as InspectionValue,
  };
}

export async function getRoundWithMembers(round: Round) {
  const members = await memberMap(round.memberIds ?? []);
  return withMembers(round, members);
}

export async function summaryForRound(round: Round) {
  const full = await getRoundWithMembers(round);
  return {
    id: full.id,
    dateTime: full.dateTime,
    type: full.type,
    event: full.event,
    totalScore: full.totalScore,
    attemptedMissions: full.attemptedMissions,
    members: full.members,
    actualDurationSeconds: full.actualDurationSeconds,
    robotVersion: full.robotVersion,
    problemsCount: full.problemsCount,
    status: full.status,
  };
}

export async function allRoundSummaries(limit = 50, type?: string, search?: string, sort = "recent") {
  const filters = [eq(roundsTable.status, "saved")];
  if (type) filters.push(eq(roundsTable.type, type));
  const order = sort === "best" ? desc(roundsTable.totalScore) : asc(roundsTable.dateTime);
  const rounds = await db.select().from(roundsTable)
    .where(and(...filters))
    .orderBy(sort === "recent" ? desc(roundsTable.dateTime) : order)
  const summaries = await Promise.all(rounds.map(summaryForRound));
  if (!search) return summaries.slice(0, limit);
  const needle = search.trim().toLocaleLowerCase();
  return summaries.filter((round) => [
    round.event,
    ...round.members.map((member) => member.name),
    ...round.members.map((member) => member.nickname ?? ""),
  ].some((value) => value.toLocaleLowerCase().includes(needle))).slice(0, limit);
}

export async function getMissions(): Promise<Mission[]> {
  return db.select().from(missionsTable).orderBy(asc(missionsTable.number));
}

export function calculateRound(body: {
  missionResults?: MissionResultValue[];
  tokens?: TokenValue;
  inspection?: InspectionValue;
}) {
  const missionResults = body.missionResults ?? [];
  const missionPoints = missionResults.reduce((total, result) => total + Math.max(0, result.points || 0), 0);
  const inspectionPoints = body.inspection?.status === "approved" ? Math.max(0, body.inspection.points || 0) : 0;
  const tokenPoints = 0;
  const attemptedMissions = missionResults.filter((result) => result.attempted).length;
  const problemsCount = missionResults.filter((result) => Boolean(result.failureType) || result.status === "failed").length;
  return {
    missionPoints,
    inspectionPoints,
    tokenPoints,
    estimatedScore: missionPoints + inspectionPoints + tokenPoints,
    attemptedMissions,
    problemsCount,
  };
}