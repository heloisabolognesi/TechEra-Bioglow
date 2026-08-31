import { Router, type IRouter } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, membersTable, roundsTable, teamsTable } from "@workspace/db";
import {
  ArchiveRoundParams,
  CreateMemberBody,
  CreateRoundBody,
  CreateRoundResponse,
  DeleteMemberParams,
  DeleteMemberResponse,
  DuplicateRoundParams,
  DuplicateRoundResponse,
  ExportRoundsQueryParams,
  GetRoundParams,
  GetRoundResponse,
  GetTeamResponse,
  ListMembersResponse,
  ListMissionsResponse,
  ListRoundsQueryParams,
  ListRoundsResponse,
  UpdateMemberBody,
  UpdateMemberParams,
  UpdateMemberResponse,
  UpdateRoundBody,
  UpdateRoundParams,
  UpdateRoundResponse,
  UpdateTeamBody,
  UpdateTeamResponse,
} from "@workspace/api-zod";
import {
  allRoundSummaries,
  calculateRound,
  ensureSeeded,
  getMissions,
  getRoundWithMembers,
  memberMap,
  missionNames,
  officialMissionCatalog,
  sourceReference,
  summaryForRound,
  withMembers,
  type InspectionValue,
  type MissionResultValue,
  type TokenValue,
} from "../lib/bioglow";

const router: IRouter = Router();

function idParam(value: string | string[]) {
  return Number(Array.isArray(value) ? value[0] : value);
}

router.get("/team", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const [team] = await db.select().from(teamsTable).limit(1);
  res.json(GetTeamResponse.parse(team));
});

router.patch("/team", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = UpdateTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [team] = await db.update(teamsTable).set(parsed.data).where(eq(teamsTable.id, 1)).returning();
  res.json(UpdateTeamResponse.parse(team));
});

router.get("/members", async (_req, res): Promise<void> => {
  await ensureSeeded();
  res.json(ListMembersResponse.parse(await db.select().from(membersTable).orderBy(asc(membersTable.name))));
});

router.post("/members", async (req, res): Promise<void> => {
  const parsed = CreateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [member] = await db.insert(membersTable).values({
    name: parsed.data.name,
    nickname: parsed.data.nickname ?? null,
  }).returning();
  res.status(201).json(member);
});

router.patch("/members/:id", async (req, res): Promise<void> => {
  const params = UpdateMemberParams.safeParse(req.params);
  const parsed = UpdateMemberBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Dados do integrante inválidos" });
    return;
  }
  const [member] = await db.update(membersTable).set(parsed.data).where(eq(membersTable.id, params.data.id)).returning();
  if (!member) {
    res.status(404).json({ error: "Integrante não encontrado" });
    return;
  }
  res.json(UpdateMemberResponse.parse(member));
});

router.delete("/members/:id", async (req, res): Promise<void> => {
  const params = DeleteMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.update(membersTable).set({ active: false }).where(eq(membersTable.id, params.data.id));
  res.status(204).send();
});

router.get("/missions", async (_req, res): Promise<void> => {
  res.json(ListMissionsResponse.parse(await getMissions()));
});

router.get("/rounds", async (req, res): Promise<void> => {
  await ensureSeeded();
  const params = ListRoundsQueryParams.parse(req.query);
  res.json(ListRoundsResponse.parse(await allRoundSummaries(params.limit, params.type, params.search, params.sort)));
});

async function normalizeRoundBody(data: Record<string, unknown>) {
  const missionResults = (data.missionResults ?? []) as MissionResultValue[];
  const tokens = (data.tokens ?? { started: 6, remaining: 6, interruptions: 0, notes: "" }) as TokenValue;
  const inspection = (data.inspection ?? { status: "unregistered", points: 0, notes: "" }) as InspectionValue;
  const totals = calculateRound({ missionResults, tokens, inspection }, await getMissions());
  return {
    dateTime: data.dateTime as Date,
    type: data.type as string,
    seasonName: "BIOGLOW 2026–2027",
    event: (data.event as string | undefined) ?? "",
    roundNumber: (data.roundNumber as string | undefined) ?? "",
    memberIds: (data.memberIds as number[] | undefined) ?? [],
    plannedDurationSeconds: (data.plannedDurationSeconds as number | undefined) ?? 150,
    actualDurationSeconds: (data.actualDurationSeconds as number | null | undefined) ?? null,
    robotVersion: (data.robotVersion as string | undefined) ?? "",
    fieldSetup: (data.fieldSetup as string | undefined) ?? "",
    fieldConditions: (data.fieldConditions as string | undefined) ?? "",
    generalNotes: (data.generalNotes as string | undefined) ?? "",
    missionResults: totals.missionResults,
    tokens: totals.tokens,
    inspection: totals.inspection,
    officialScore: null,
    officialScoreNotes: (data.officialScoreNotes as string | undefined) ?? "",
    status: (data.status as string | undefined) ?? "saved",
    totalScore: totals.estimatedScore,
    estimatedScore: totals.estimatedScore,
    attemptedMissions: totals.attemptedMissions,
    problemsCount: totals.problemsCount,
  };
}

router.post("/rounds", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = CreateRoundBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [round] = await db.insert(roundsTable).values(await normalizeRoundBody(parsed.data)).returning();
  res.status(201).json(CreateRoundResponse.parse(await getRoundWithMembers(round)));
});

router.get("/rounds/export", async (req, res): Promise<void> => {
  const params = ExportRoundsQueryParams.parse(req.query);
  const rows = await allRoundSummaries();
  if (params.format === "json") {
    res.json(rows);
    return;
  }
  const header = "id,dateTime,type,event,totalScore,attemptedMissions,actualDurationSeconds,robotVersion,problemsCount";
  const csv = [header, ...rows.map((row) => [row.id, row.dateTime.toISOString(), row.type, row.event, row.totalScore, row.attemptedMissions, row.actualDurationSeconds ?? "", row.robotVersion, row.problemsCount].map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))].join("\n");
  res.type("text/csv").send(csv);
});

router.get("/rounds/:id", async (req, res): Promise<void> => {
  const params = GetRoundParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [round] = await db.select().from(roundsTable).where(eq(roundsTable.id, params.data.id));
  if (!round || round.status === "archived") {
    res.status(404).json({ error: "Round não encontrado" });
    return;
  }
  res.json(GetRoundResponse.parse(await getRoundWithMembers(round)));
});

router.patch("/rounds/:id", async (req, res): Promise<void> => {
  const params = UpdateRoundParams.safeParse(req.params);
  const parsed = UpdateRoundBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Dados do round inválidos" });
    return;
  }
  const [current] = await db.select().from(roundsTable).where(eq(roundsTable.id, params.data.id));
  if (!current) {
    res.status(404).json({ error: "Round não encontrado" });
    return;
  }
  const [round] = await db.update(roundsTable)
    .set({ ...(await normalizeRoundBody({ ...current, ...parsed.data })), updatedAt: new Date() })
    .where(eq(roundsTable.id, params.data.id))
    .returning();
  res.json(UpdateRoundResponse.parse(await getRoundWithMembers(round)));
});

router.delete("/rounds/:id", async (req, res): Promise<void> => {
  const params = ArchiveRoundParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.update(roundsTable).set({ status: "archived", updatedAt: new Date() }).where(eq(roundsTable.id, params.data.id));
  res.status(204).send();
});

router.post("/rounds/:id/duplicate", async (req, res): Promise<void> => {
  const params = DuplicateRoundParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [original] = await db.select().from(roundsTable).where(eq(roundsTable.id, params.data.id));
  if (!original) {
    res.status(404).json({ error: "Round não encontrado" });
    return;
  }
  const copyValues = await normalizeRoundBody({
    ...original,
    dateTime: new Date(),
    roundNumber: "",
    actualDurationSeconds: null,
    status: "draft",
    officialScoreNotes: "",
  });
  const [copy] = await db.insert(roundsTable).values(copyValues).returning();
  res.status(201).json(DuplicateRoundResponse.parse(await getRoundWithMembers(copy)));
});

router.get("/dashboard", async (_req, res): Promise<void> => {
  try {
    await ensureSeeded();
  } catch {
    const missions = officialMissionCatalog();
    res.json({
      bestScore: 0,
      recentAverage: 0,
      lastScore: 0,
      totalRounds: 0,
      averageTokens: 6,
      latestRounds: [],
      missionMetrics: missions.map((mission) => ({
        missionId: mission.id,
        missionNumber: mission.number,
        missionName: mission.name,
        bestScore: 0,
        averageScore: 0,
        successRate: 0,
        attempts: 0,
        failures: 0,
        priority: "high",
      })),
      focusMissions: [],
      frequentProblems: [],
    });
    return;
  }
  const rounds = await db.select().from(roundsTable).where(eq(roundsTable.status, "saved")).orderBy(desc(roundsTable.dateTime));
  const missions = await getMissions();
  const computedRounds = rounds.map((round) => ({
    ...round,
    ...calculateRound({
      missionResults: (round.missionResults ?? []) as MissionResultValue[],
      tokens: round.tokens as TokenValue,
      inspection: round.inspection as InspectionValue,
    }, missions),
  }));
  const metrics = missions.map((mission) => {
    const results = computedRounds.flatMap((round) => (round.missionResults as MissionResultValue[]).filter((result) => result.missionId === mission.id));
    const attempts = results.filter((result) => result.attempted);
    const averageScore = attempts.length ? attempts.reduce((sum, result) => sum + result.points, 0) / attempts.length : 0;
    const successRate = attempts.length ? Math.round(attempts.filter((result) => ["complete", "bonus"].includes(result.status)).length / attempts.length * 100) : 0;
    return { missionId: mission.id, missionNumber: mission.number, missionName: mission.name, bestScore: Math.max(0, ...results.map((result) => result.points)), averageScore, successRate, attempts: attempts.length, failures: attempts.filter((result) => result.status === "failed").length, priority: attempts.length === 0 || averageScore === 0 ? "high" : successRate < 50 ? "medium" : "low" };
  });
  const recent = computedRounds.slice(0, 5);
  const focus = rounds.length
    ? [...metrics].sort((a, b) => a.averageScore - b.averageScore || b.failures - a.failures).slice(0, 3)
    : [];
  const scores = computedRounds.map((round) => round.totalScore);
  res.json({
    bestScore: Math.max(0, ...scores),
    recentAverage: recent.length ? recent.reduce((sum, round) => sum + round.totalScore, 0) / recent.length : 0,
    lastScore: rounds[0]?.totalScore ?? 0,
    totalRounds: rounds.length,
    averageTokens: rounds.length ? rounds.reduce((sum, round) => sum + ((round.tokens as TokenValue)?.remaining ?? 0), 0) / rounds.length : 6,
    latestRounds: await Promise.all(recent.map(summaryForRound)),
    missionMetrics: metrics,
    focusMissions: focus,
    frequentProblems: [],
  });
});

router.get("/analytics", async (_req, res): Promise<void> => {
  try {
    await ensureSeeded();
  } catch {
    const missions = officialMissionCatalog();
    res.json({
      scoreTrend: [],
      missionMetrics: missions.map((mission) => ({
        missionId: mission.id,
        missionNumber: mission.number,
        missionName: mission.name,
        bestScore: 0,
        averageScore: 0,
        successRate: 0,
        attempts: 0,
        failures: 0,
        priority: "high",
      })),
      problemHistory: [],
    });
    return;
  }
  const rounds = await db.select().from(roundsTable).where(eq(roundsTable.status, "saved")).orderBy(asc(roundsTable.dateTime));
  const missions = await getMissions();
  const computedRounds = rounds.map((round) => ({
    ...round,
    ...calculateRound({
      missionResults: (round.missionResults ?? []) as MissionResultValue[],
      tokens: round.tokens as TokenValue,
      inspection: round.inspection as InspectionValue,
    }, missions),
  }));
  const missionMetrics = missions.map((mission) => {
    const results = computedRounds.flatMap((round) => (round.missionResults as MissionResultValue[]).filter((result) => result.missionId === mission.id));
    const attempts = results.filter((result) => result.attempted);
    return { missionId: mission.id, missionNumber: mission.number, missionName: mission.name, bestScore: Math.max(0, ...results.map((result) => result.points)), averageScore: attempts.length ? attempts.reduce((sum, result) => sum + result.points, 0) / attempts.length : 0, successRate: attempts.length ? Math.round(attempts.filter((result) => ["complete", "bonus"].includes(result.status)).length / attempts.length * 100) : 0, attempts: attempts.length, failures: attempts.filter((result) => result.status === "failed").length, priority: attempts.length === 0 ? "high" : "low" };
  });
  res.json({
    scoreTrend: computedRounds.map((round) => ({ date: round.dateTime.toISOString(), score: round.totalScore, type: round.type })),
    missionMetrics,
    problemHistory: [],
  });
});

export default router;