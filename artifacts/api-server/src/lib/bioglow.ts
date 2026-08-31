import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, membersTable, missionsTable, roundsTable, teamsTable } from "@workspace/db";
import type { Member, Mission, Round } from "@workspace/db";

export const missionNames = [
  "Levantamento por Drone",
  "Sementes Explosivas",
  "Virar a Rocha",
  "Folhas da Sorte",
  "Raízes Alcançáveis",
  "Frenesi das Formigas Cortadeiras",
  "Fungo Gigantesco",
  "Emaranhado",
  "Plataforma de Pesquisa",
  "Microhabitats Frágeis",
  "Janela para o Passado",
  "Ancião da Floresta",
  "Espécies-Chave",
  "Sementes de Renovação",
  "Arquitetura Biocêntrica",
];

export const sourceReference = "Vídeo oficial de referência BIOGLOW 2026–2027 · https://youtube.com/watch?v=uhZZ8O1StiQ&feature=shared";

export type ScoringInputKind = "boolean" | "quantity" | "select";
export type ScoringOption = { value: string; label: string; points: number };
export type OfficialScoringRule = {
  key: string;
  label: string;
  points: number;
  perUnit: boolean;
  inputKind: ScoringInputKind;
  options: ScoringOption[];
  helper: string | null;
};

const booleanRule = (
  key: string,
  label: string,
  points: number,
  helper: string | null = null,
): OfficialScoringRule => ({ key, label, points, perUnit: false, inputKind: "boolean", options: [], helper });
const quantityRule = (key: string, label: string, points: number): OfficialScoringRule => ({
  key, label, points, perUnit: true, inputKind: "quantity", options: [], helper: null,
});
const selectRule = (
  key: string,
  label: string,
  options: ScoringOption[],
  helper: string | null = null,
): OfficialScoringRule => ({ key, label, points: 0, perUnit: false, inputKind: "select", options, helper });

export const officialMissionRules: Array<{
  number: number;
  code: string;
  name: string;
  description: string;
  maxPoints: number | null;
  warning: string | null;
  rules: OfficialScoringRule[];
}> = [
  { number: 1, code: "M01", name: missionNames[0], description: "Pontue cada condição oficial cumprida no levantamento por drone.", maxPoints: 30, warning: null, rules: [
    booleanRule("drone_clear_of_mat", "Drone não toca mais o tapete", 20),
    booleanRule("lidar_map_marker", "Mapa LiDAR virado com marcador na área de pesquisa", 10),
  ] },
  { number: 2, code: "M02", name: missionNames[1], description: "Informe quantas sementes não tocam mais o caule.", maxPoints: null, warning: null, rules: [
    quantityRule("seeds_clear_of_stem", "Cada semente que não toca mais o caule", 10),
  ] },
  { number: 3, code: "M03", name: missionNames[2], description: "Pontue a bandeira e o retorno da rocha conforme as condições oficiais.", maxPoints: 30, warning: null, rules: [
    booleanRule("research_flag_lowered", "Bandeira de pesquisa abaixada", 20),
    booleanRule("rock_at_start", "Rocha retornada à posição inicial", 10),
  ] },
  { number: 4, code: "M04", name: missionNames[3], description: "Registre as folhas e a posição de Esperança sem somar bônus incompatíveis.", maxPoints: 60, warning: "Se Esperança for removida do ninho, o bônus de 20 pontos da segunda folha é automaticamente invalidado.", rules: [
    booleanRule("first_leaf_removed", "Uma folha removida sem tocar o ninho", 10),
    booleanRule("second_leaf_removed", "Segunda folha removida e Esperança na posição inicial", 20, "Este bônus só vale se Esperança não tiver sido removida do ninho."),
    booleanRule("third_leaf_removed", "Terceira folha removida", 10),
    booleanRule("hope_returned_to_leaf_habitat", "Esperança retornada ao habitat de folhas, se tiver sido removida", 10),
    booleanRule("hope_removed_from_nest", "Esperança removida do ninho (sem pontuação; invalida o bônus da segunda folha)", 0),
  ] },
  { number: 5, code: "M05", name: missionNames[4], description: "Escolha um único estado da raiz; os estados parcial e completo são alternativos.", maxPoints: 20, warning: "Raiz parcialmente estendida e raiz completamente estendida são estados alternativos. Os pontos não são somados.", rules: [
    selectRule("root_extension_state", "Estado da raiz", [
      { value: "none", label: "Não estendida", points: 0 },
      { value: "partial", label: "Raiz parcialmente estendida", points: 10 },
      { value: "complete", label: "Raiz completamente estendida", points: 20 },
    ]),
  ] },
  { number: 6, code: "M06", name: missionNames[5], description: "Informe o estado da formiga e a quantidade de fragmentos contidos no ninho.", maxPoints: null, warning: null, rules: [
    booleanRule("ant_touching_nest", "Formiga tocando o ninho", 10),
    quantityRule("leaf_fragments_in_nest", "Cada fragmento de folha contido no ninho", 10),
  ] },
  { number: 7, code: "M07", name: missionNames[6], description: "Pontue o micélio e a conexão com a raiz adversária.", maxPoints: 30, warning: null, rules: [
    booleanRule("mycelium_fully_extended", "Micélio completamente estendido", 20),
    booleanRule("mycelium_opponent_root_connection", "Conexão entre o micélio de uma equipe e a raiz da equipe adversária", 10),
  ] },
  { number: 8, code: "M08", name: missionNames[7], description: "Pontue quando a vinha toca o tapete.", maxPoints: 30, warning: null, rules: [
    booleanRule("vine_touching_mat", "Vinha tocando o tapete", 30),
  ] },
  { number: 9, code: "M09", name: missionNames[8], description: "Registre cada condição oficial cumprida na plataforma.", maxPoints: 30, warning: null, rules: [
    booleanRule("research_platform_raised", "Plataforma de pesquisa elevada", 10),
    booleanRule("camera_trap_deployed", "Armadilha fotográfica implantada", 10),
    booleanRule("seed_clear_of_tree", "Semente que não toca mais a árvore", 10),
  ] },
  { number: 10, code: "M10", name: missionNames[9], description: "Registre a posição inicial de cada habitat.", maxPoints: 20, warning: null, rules: [
    booleanRule("spider_habitat_start", "Habitat da aranha na posição inicial", 10),
    booleanRule("snail_habitat_start", "Habitat do caracol na posição inicial", 10),
  ] },
  { number: 11, code: "M11", name: missionNames[10], description: "Pontue a cobertura da raiz quando estiver abaixada e tocando o tapete.", maxPoints: 20, warning: null, rules: [
    booleanRule("root_cover_down_on_mat", "Cobertura da raiz abaixada, tocando o tapete", 20),
  ] },
  { number: 12, code: "M12", name: missionNames[11], description: "Pontue a bengala e o laço de suporte conforme as posições oficiais.", maxPoints: 30, warning: null, rules: [
    booleanRule("cane_fully_raised", "Bengala completamente elevada, tocando a árvore", 20),
    booleanRule("support_loop_around_post", "Laço de suporte ao redor do poste", 10),
  ] },
  { number: 13, code: "M13", name: missionNames[12], description: "Pontue a espécie-chave e as árvores jovens elevadas.", maxPoints: 30, warning: null, rules: [
    booleanRule("keystone_on_restoration_platform", "Espécie-chave na plataforma de restauração e árvores jovens elevadas", 30),
  ] },
  { number: 14, code: "M14", name: missionNames[13], description: "Informe as quantidades de sementes em cada condição oficial.", maxPoints: null, warning: null, rules: [
    quantityRule("seeds_in_replanting_station", "Cada semente contida na estação de replantio", 5),
    quantityRule("seeds_touching_mat_at_station", "Bônus: cada semente tocando o tapete na estação", 5),
  ] },
  { number: 15, code: "M15", name: missionNames[14], description: "Pontue as três estruturas e escolha a doca do bônus ambiental.", maxPoints: 40, warning: null, rules: [
    booleanRule("nesting_canopy_raised", "Dossel de aninhamento elevado", 10),
    booleanRule("garden_skylight_inserted", "Claraboia do jardim completamente inserida", 10),
    booleanRule("compost_hatch_open_on_mat", "Escotilha de compostagem aberta, tocando o tapete", 10),
    selectRule("environmental_bonus_dock", "Bônus ambiental conforme a doca", [
      { value: "none", label: "Nenhuma doca", points: 0 },
      { value: "farm", label: "Doca Fazenda", points: 10 },
      { value: "mine", label: "Doca Mina", points: 10 },
      { value: "city", label: "Doca Cidade", points: 10 },
    ]),
  ] },
];

export const tokenPointsByRemaining: Record<number, number> = {
  0: 0,
  1: 10,
  2: 15,
  3: 25,
  4: 35,
  5: 50,
  6: 50,
};

export type MissionResultValue = {
  missionId: number;
  status: "not_attempted" | "failed" | "partial" | "complete" | "bonus" | "not_applicable";
  attempted: boolean;
  points: number;
  criteria: { key: string; label: string; achieved: boolean; quantity: number; points: number; selection: string | null }[];
  failureType: string | null;
  technicalNotes: string;
  confidence: "low" | "medium" | "high";
};

export type MissionResultInputValue = {
  missionId: number;
  criteria: { key: string; achieved: boolean; quantity: number; selection: string | null }[];
  failureType: string | null;
  technicalNotes: string;
  confidence: "low" | "medium" | "high";
};
export type TokenValue = { started: 6; remaining: number; interruptions: number; notes: string; points?: number };
export type InspectionValue = { status: "approved" | "rejected" | "unregistered"; points?: number; notes: string };
export type MissionWithRules = Mission & { scoringRules: OfficialScoringRule[] };

export function officialMissionCatalog(): MissionWithRules[] {
  return officialMissionRules.map((mission) => ({
    id: mission.number,
    number: mission.number,
    code: mission.code,
    name: mission.name,
    description: mission.description,
    maxPoints: mission.maxPoints,
    scoreConfigStatus: "verified",
    warning: mission.warning,
    sourceReference,
    scoringRules: mission.rules,
  }));
}

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
          officialMissionRules.map((mission) => ({
            number: mission.number,
            code: mission.code,
            name: mission.name,
            description: mission.description,
            maxPoints: mission.maxPoints,
            scoreConfigStatus: "verified",
            warning: mission.warning,
            sourceReference,
          })),
        );
      } else {
        await Promise.all(officialMissionRules.map((mission) => db.update(missionsTable).set({
          code: mission.code,
          name: mission.name,
          description: mission.description,
          maxPoints: mission.maxPoints,
          scoreConfigStatus: "verified",
          warning: mission.warning,
          sourceReference,
        }).where(eq(missionsTable.number, mission.number))));
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

export function withMembers(round: Round, members: Map<number, Member>, totals: ReturnType<typeof calculateRound>) {
  return {
    ...round,
    members: (round.memberIds ?? []).map((memberId) => members.get(memberId)).filter(Boolean).map((member) => ({
      memberId: member!.id,
      name: member!.name,
      nickname: member!.nickname,
    })),
    missionResults: totals.missionResults,
    tokens: totals.tokens,
    inspection: totals.inspection,
    totalScore: totals.estimatedScore,
    estimatedScore: totals.estimatedScore,
    attemptedMissions: totals.attemptedMissions,
    problemsCount: totals.problemsCount,
    scoreBreakdown: {
      missionPoints: totals.missionPoints,
      inspectionPoints: totals.inspectionPoints,
      tokenPoints: totals.tokenPoints,
      total: totals.estimatedScore,
    },
  };
}

export async function getRoundWithMembers(round: Round) {
  const members = await memberMap(round.memberIds ?? []);
  const missions = await getMissions();
  const totals = calculateRound({
    missionResults: (round.missionResults ?? []) as MissionResultInputValue[],
    tokens: round.tokens as TokenValue,
    inspection: round.inspection as InspectionValue,
  }, missions);
  return withMembers(round, members, totals);
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
  const rounds = await db.select().from(roundsTable)
    .where(and(...filters))
    .orderBy(desc(roundsTable.dateTime));
  const summaries = await Promise.all(rounds.map(summaryForRound));
  const needle = search?.trim().toLocaleLowerCase() ?? "";
  const filtered = search
    ? summaries.filter((round) => [
      round.event,
      ...round.members.map((member) => member.name),
      ...round.members.map((member) => member.nickname ?? ""),
    ].some((value) => value.toLocaleLowerCase().includes(needle)))
    : summaries;
  return filtered
    .sort((a, b) => sort === "best"
      ? b.totalScore - a.totalScore
      : sort === "oldest"
        ? a.dateTime.getTime() - b.dateTime.getTime()
        : b.dateTime.getTime() - a.dateTime.getTime())
    .slice(0, limit);
}

export async function getMissions(): Promise<MissionWithRules[]> {
  try {
    const missions = await db.select().from(missionsTable).orderBy(asc(missionsTable.number));
    return missions.map((mission) => ({
      ...mission,
      scoringRules: officialMissionRules.find((rule) => rule.number === mission.number)?.rules ?? [],
    }));
  } catch {
    return officialMissionCatalog();
  }
}

export function calculateRound(body: {
  missionResults?: MissionResultInputValue[];
  tokens?: TokenValue;
  inspection?: InspectionValue;
}, missions: MissionWithRules[] = []) {
  const missionResults = body.missionResults ?? [];
  const normalizedMissionResults: MissionResultValue[] = missionResults.map((result) => {
    const mission = missions.find((candidate) => candidate.id === result.missionId);
    const rules = officialMissionRules.find((candidate) => candidate.number === mission?.number || candidate.number === result.missionId)?.rules ?? [];
    const inputByKey = new Map((result.criteria ?? []).map((criterion) => [criterion.key, criterion]));
    const criteria = rules.map((rule) => {
      const input = inputByKey.get(rule.key);
      const quantity = rule.inputKind === "quantity" ? Math.max(0, Math.floor(input?.quantity ?? 0)) : input?.achieved ? 1 : 0;
      const selection = rule.inputKind === "select" ? (rule.options.some((option) => option.value === input?.selection) ? input?.selection ?? "none" : "none") : null;
      const optionPoints = rule.inputKind === "select" ? rule.options.find((option) => option.value === selection)?.points ?? 0 : 0;
      const points = rule.inputKind === "quantity" ? quantity * rule.points : rule.inputKind === "select" ? optionPoints : input?.achieved ? rule.points : 0;
      return {
        key: rule.key,
        label: rule.label,
        achieved: rule.inputKind === "select" ? selection !== "none" : rule.inputKind === "quantity" ? quantity > 0 : Boolean(input?.achieved),
        quantity,
        points,
        selection,
      };
    });
    if (mission?.number === 4 || result.missionId === 4) {
      const hopeRemoved = criteria.find((criterion) => criterion.key === "hope_removed_from_nest")?.achieved;
      const secondLeaf = criteria.find((criterion) => criterion.key === "second_leaf_removed");
      const firstLeaf = criteria.find((criterion) => criterion.key === "first_leaf_removed");
      const thirdLeaf = criteria.find((criterion) => criterion.key === "third_leaf_removed");
      const hopeReturned = criteria.find((criterion) => criterion.key === "hope_returned_to_leaf_habitat");
      const firstLeafPoints = rules.find((rule) => rule.key === "first_leaf_removed")?.points ?? 0;
      const secondLeafPoints = rules.find((rule) => rule.key === "second_leaf_removed")?.points ?? 0;
      if (thirdLeaf?.achieved) {
        if (firstLeaf) {
          firstLeaf.achieved = true;
          firstLeaf.points = firstLeafPoints;
        }
        if (secondLeaf) secondLeaf.achieved = true;
      } else if (secondLeaf?.achieved && firstLeaf) {
        firstLeaf.achieved = true;
        firstLeaf.points = firstLeafPoints;
      }
      if (secondLeaf) {
        if (hopeRemoved) {
          secondLeaf.points = 0;
          secondLeaf.achieved = false;
          secondLeaf.label = "Segunda folha removida e Esperança na posição inicial (bônus invalidado)";
        } else if (secondLeaf.achieved) {
          secondLeaf.points = secondLeafPoints;
        }
      }
      if (hopeReturned && !hopeRemoved) {
        hopeReturned.points = 0;
        hopeReturned.achieved = false;
        hopeReturned.label = "Esperança retornada ao habitat de folhas, se tiver sido removida (não aplicável)";
      }
    }
    const points = criteria.reduce((total, criterion) => total + criterion.points, 0);
    const attempted = criteria.some((criterion) => criterion.achieved || criterion.quantity > 0);
    const status = !attempted ? "not_attempted" : points === 0 ? "failed" : criteria.some((criterion) => criterion.key.includes("bonus") && criterion.points > 0) ? "bonus" : "complete";
    return {
      missionId: result.missionId,
      status,
      attempted,
      points,
      criteria,
      failureType: result.failureType ?? null,
      technicalNotes: result.technicalNotes ?? "",
      confidence: result.confidence ?? "medium",
    };
  });
  const missionPoints = normalizedMissionResults.reduce((total, result) => total + result.points, 0);
  const inspectionPoints = body.inspection?.status === "approved" ? 20 : 0;
  const remaining = Math.min(6, Math.max(0, Math.floor(body.tokens?.remaining ?? 6)));
  const tokenPoints = tokenPointsByRemaining[remaining] ?? 0;
  const attemptedMissions = normalizedMissionResults.filter((result) => result.attempted).length;
  const problemsCount = normalizedMissionResults.filter((result) => Boolean(result.failureType) || result.status === "failed").length;
  return {
    missionPoints,
    inspectionPoints,
    tokenPoints,
    estimatedScore: missionPoints + inspectionPoints + tokenPoints,
    attemptedMissions,
    problemsCount,
    missionResults: normalizedMissionResults,
    tokens: {
      started: 6 as const,
      remaining,
      interruptions: Math.max(0, Math.floor(body.tokens?.interruptions ?? 0)),
      notes: body.tokens?.notes ?? "",
      points: tokenPoints,
    },
    inspection: {
      status: body.inspection?.status ?? "unregistered",
      points: inspectionPoints,
      notes: body.inspection?.notes ?? "",
    },
  };
}