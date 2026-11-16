import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Archive, ArrowRight, BarChart3, BookOpen, Check, CheckCircle2,
  CircleHelp, ClipboardList, Copy, Database, FileText, Gauge, LayoutDashboard,
  Pause, Pencil, Play, Plus, Printer, RefreshCw, Search, Settings2, ShieldCheck,
  Sparkles, Target, TimerReset, Trash2, TrendingUp, Users,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Link, Route, Switch, useLocation, useParams } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import {
  getGetRoundQueryKey, getGetTeamQueryKey, getListMembersQueryKey, getListRoundsQueryKey,
  useArchiveRound, useCreateMember, useCreateRound, useDeleteMember, useDuplicateRound,
  useGetAnalytics, useGetDashboard, useGetRound, useGetTeam, useHealthCheck,
  useListMembers, useListMissions, useListRounds, useUpdateMember, useUpdateRound,
  useUpdateTeam,
} from '@workspace/api-client-react';

const logoSrc = '/.local/conversation-workspace/files/attached_assets/77248700-98d3-11f1-935b-7db94e674134_1788022027301.jpg';
const queryClient = new QueryClient();

const nav = [
  { href: '/', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/rounds/new', label: 'Registrar round', icon: TimerReset },
  { href: '/rounds', label: 'Histórico de rounds', icon: ClipboardList },
  { href: '/analytics', label: 'Evolução', icon: TrendingUp },
  { href: '/missions', label: 'Missões', icon: Target },
];
const moreNav = [
  { href: '/team', label: 'Equipe', icon: Users },
  { href: '/settings', label: 'Configurações', icon: Settings2 },
];

const roundTypeLabels: Record<string, string> = {
  training: 'Treino',
  simulation: 'Simulação',
  official: 'Oficial',
};
const statusLabels: Record<string, string> = {
  saved: 'Salvo',
  draft: 'Rascunho',
  archived: 'Arquivado',
  verified: 'Verificado',
  pending: 'Pendente',
  complete: 'Concluída',
  failed: 'Falhou',
  partial: 'Parcial',
  bonus: 'Bônus',
  not_attempted: 'Não tentada',
  not_applicable: 'Não se aplica',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  unregistered: 'Não registrada',
};
const missionChartMetrics = [
  { key: 'bestScore', label: 'Melhor pontuação', unit: 'pts', color: 'hsl(var(--chart-1))' },
  { key: 'averageScore', label: 'Média de pontos', unit: 'pts', color: 'hsl(var(--chart-2))' },
  { key: 'successRate', label: 'Taxa de sucesso', unit: '%', color: 'hsl(143 48% 38%)' },
  { key: 'attempts', label: 'Tentativas', unit: '', color: 'hsl(var(--chart-3))' },
] as const;
type MissionChartMetricKey = typeof missionChartMetrics[number]['key'];

function formatRoundType(value: string) {
  return roundTypeLabels[value] || value;
}

function formatStatus(value: string) {
  return statusLabels[value] || value;
}

function MissionMetricsTooltip({ active, payload }: any) {
  const mission = payload?.[0]?.payload;
  if (!active || !mission) return null;
  const priority = mission.priority === 'high' ? 'Alta' : mission.priority === 'medium' ? 'Média' : 'Baixa';
  return (
    <div className="mission-chart-tooltip">
      <strong>M{String(mission.missionNumber).padStart(2, '0')} · {mission.missionName}</strong>
      <span>Melhor: {mission.bestScore} pts</span>
      <span>Média: {Number(mission.averageScore).toFixed(1)} pts</span>
      <span>Sucesso: {mission.successRate}%</span>
      <span>Tentativas: {mission.attempts}</span>
      <span>Prioridade: {priority}</span>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const health = useHealthCheck();
  const currentPage = nav.concat(moreNav).find((item) =>
    location === item.href || (item.href !== '/' && location.startsWith(item.href)),
  )?.label || 'Detalhes do round';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" data-testid="link-brand">
          <div className="brand-mark">
            <img src={logoSrc} alt="TechEra" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
            <span>TE</span>
          </div>
          <div className="brand-copy">
            <strong>TechEra</strong>
            <span>espaço BIOGLOW</span>
          </div>
        </Link>
        <div className="nav-label">Pista</div>
        <nav className="nav-group">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${location === href || (href !== '/' && location.startsWith(href)) ? 'active' : ''}`}
              data-testid={`link-nav-${href === '/' ? 'overview' : href.slice(1).replaceAll('/', '-')}`}
            >
              <Icon /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="nav-label">Espaço de trabalho</div>
        <nav className="nav-group">
          {moreNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${location.startsWith(href) ? 'active' : ''}`}
              data-testid={`link-nav-${href.slice(1)}`}
            >
              <Icon /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          Temporada ativa<br />
          <b>BIOGLOW 2026–2027</b><br />
          Divisão Challenge
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="crumb"><span>TechEra</span><ArrowRight size={12} /><strong>{currentPage}</strong></div>
          <div className="top-actions">
            <div className="health"><i />{health.isError ? 'offline' : 'sistema pronto'}</div>
            <Link href="/rounds/new" className="button button-lime" data-testid="button-top-capture">
              <Plus size={14} />Registrar round
            </Link>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function PageHeading({
  eyebrow, title, subtitle, action,
}: { eyebrow: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="page-heading">
      <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p className="subtitle">{subtitle}</p>}</div>
      {action}
    </div>
  );
}

function LoadingState() {
  return <div className="grid card" style={{ padding: 22, gap: 15 }}><div className="skeleton" style={{ width: '35%' }} /><div className="skeleton" style={{ width: '75%', height: 28 }} /><div className="skeleton" /><div className="skeleton" /></div>;
}

function ErrorState({ retry }: { retry?: () => void }) {
  return (
    <div className="card empty">
      <AlertTriangle size={26} />
      <strong>Não foi possível carregar esta tela</strong>
      <p>O espaço de trabalho não recebeu uma resposta. Verifique a conexão e tente novamente.</p>
      {retry && <button className="button button-primary" onClick={retry} data-testid="button-retry"><RefreshCw size={14} />Tentar novamente</button>}
    </div>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="empty"><Sparkles size={26} /><strong>{title}</strong><p>{body}</p>{action}</div>;
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <div className="card metric" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="label">{label}</div><div className="value">{value}</div><div className="detail">{detail}</div></div>;
}

function RoundRow({ round }: { round: any }) {
  return (
    <Link href={`/rounds/${round.id}`} className="round-row" data-testid={`row-round-${round.id}`}>
      <div>
        <div className="round-title">{round.event || 'Sessão de treino'} <span style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}>· {formatRoundType(round.type)}</span></div>
        <div className="round-meta">
          {new Date(round.dateTime).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} · {round.members?.map((member: any) => member.nickname || member.name).join(', ') || 'Nenhum integrante registrado'}
        </div>
      </div>
      <div className="score">{round.totalScore ?? 0}</div>
      <span className={`status-chip ${round.status}`}>{formatStatus(round.status)}</span>
    </Link>
  );
}

const tokenPointsByRemaining: Record<number, number> = { 0: 0, 1: 10, 2: 15, 3: 25, 4: 35, 5: 50, 6: 50 };
const DEFAULT_ROUND_DURATION_SECONDS = 150;
type TimerMode = 'countdown' | 'stopwatch';
const problemCauseOptions = [
  { value: 'position', label: 'Posição' },
  { value: 'curve', label: 'Curva' },
  { value: 'attachment_error', label: 'Erro no anexo' },
  { value: 'nervousness', label: 'Nervosismo' },
  { value: 'programming', label: 'Programação' },
  { value: 'time', label: 'Tempo' },
] as const;
const problemCauseLabels = Object.fromEntries(problemCauseOptions.map((option) => [option.value, option.label]));

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const remainingSeconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

function DurationInputs({
  idPrefix,
  label,
  valueSeconds,
  onChange,
  minSeconds = 0,
  className = 'field',
  disabled = false,
}: {
  idPrefix: string;
  label: string;
  valueSeconds: number | null;
  onChange: (seconds: number) => void;
  minSeconds?: number;
  className?: string;
  disabled?: boolean;
}) {
  const safeSeconds = Math.max(0, valueSeconds ?? 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = Math.floor(safeSeconds % 60);
  const updateMinutes = (value: string) => {
    const nextMinutes = Math.max(0, Math.floor(Number(value) || 0));
    onChange(Math.max(minSeconds, nextMinutes * 60 + seconds));
  };
  const updateSeconds = (value: string) => {
    const nextSeconds = Math.min(59, Math.max(0, Math.floor(Number(value) || 0)));
    onChange(Math.max(minSeconds, minutes * 60 + nextSeconds));
  };

  return (
    <div className={className}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 7 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="field">
          <label htmlFor={`${idPrefix}-minutes`}>Minutos</label>
          <input id={`${idPrefix}-minutes`} type="number" min="0" step="1" className="input" value={valueSeconds == null ? '' : minutes} onChange={(event) => updateMinutes(event.target.value)} disabled={disabled} />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-seconds`}>Segundos</label>
          <input id={`${idPrefix}-seconds`} type="number" min="0" max="59" step="1" className="input" value={valueSeconds == null ? '' : seconds} onChange={(event) => updateSeconds(event.target.value)} disabled={disabled} />
        </div>
      </div>
      <small>Tempo: {formatDuration(valueSeconds)}</small>
    </div>
  );
}

function TimerModeSelector({
  mode,
  onChange,
  idPrefix,
  disabled = false,
  className = 'field',
}: {
  mode: TimerMode;
  onChange: (mode: TimerMode) => void;
  idPrefix: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 7 }}>Modo do cronômetro</div>
      <div role="group" aria-label="Modo do cronômetro" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 7 }}>
        <button type="button" className={`button ${mode === 'countdown' ? 'button-primary' : 'button-ghost'}`} aria-pressed={mode === 'countdown'} onClick={() => onChange('countdown')} disabled={disabled} data-testid={`${idPrefix}-countdown`}>
          <span>Contagem regressiva</span>
        </button>
        <button type="button" className={`button ${mode === 'stopwatch' ? 'button-primary' : 'button-ghost'}`} aria-pressed={mode === 'stopwatch'} onClick={() => onChange('stopwatch')} disabled={disabled} data-testid={`${idPrefix}-stopwatch`}>
          <span>Cronômetro livre</span>
        </button>
      </div>
      <small>{mode === 'countdown' ? 'Começa no tempo definido e para em 00:00.' : 'Começa em 00:00 e conta até você parar.'}</small>
    </div>
  );
}

function defaultCriterion(rule: any) {
  return {
    key: rule.key,
    achieved: false,
    quantity: 0,
    selection: rule.inputKind === 'select' ? (rule.options?.[0]?.value || 'none') : null,
  };
}

function clientCriterionPoints(mission: any, rule: any, value: any, criteria: Record<string, any>) {
  if (rule.inputKind === 'quantity') return Math.max(0, Number(value?.quantity || 0)) * rule.points;
  if (rule.inputKind === 'select') return rule.options?.find((option: any) => option.value === value?.selection)?.points || 0;
  if (mission.number === 4 && rule.key === 'first_leaf_removed' && (criteria.second_leaf_removed?.achieved || criteria.third_leaf_removed?.achieved)) return rule.points;
  if (mission.number === 4 && rule.key === 'second_leaf_removed' && criteria.third_leaf_removed?.achieved && !criteria.hope_removed_from_nest?.achieved) return rule.points;
  if (mission.number === 4 && rule.key === 'second_leaf_removed' && criteria.hope_removed_from_nest?.achieved) return 0;
  if (mission.number === 4 && rule.key === 'hope_returned_to_leaf_habitat' && !criteria.hope_removed_from_nest?.achieved) return 0;
  return value?.achieved ? rule.points : 0;
}

function clientMissionPoints(mission: any, criteria: Record<string, any>) {
  return (mission.scoringRules || []).reduce((total: number, rule: any) =>
    total + clientCriterionPoints(mission, rule, criteria[rule.key], criteria), 0);
}

function criterionIsAttempted(rule: any, value: any) {
  return rule.inputKind === 'quantity'
    ? Number(value?.quantity || 0) > 0
    : rule.inputKind === 'select'
      ? value?.selection && value.selection !== 'none'
      : Boolean(value?.achieved);
}

function Overview() {
  const dashboard = useGetDashboard();
  if (dashboard.isLoading) return <div className="content"><LoadingState /></div>;
  if (dashboard.isError) return <div className="content"><PageHeading eyebrow="BIOGLOW / central de comando" title="Que bom ver você." subtitle="A inteligência dos seus rounds em um só lugar." /><ErrorState retry={() => dashboard.refetch()} /></div>;
  const data: any = dashboard.data;
  const rounds = data?.latestRounds || [];
  const focus = data?.focusMissions || [];

  return (
    <div className="content">
      <PageHeading
        eyebrow="BIOGLOW / central de comando"
        title="Treine com uma visão clara."
        subtitle="Uma leitura clara de onde a TechEra está evoluindo — e no que focar em seguida."
        action={<Link href="/rounds/new" className="button button-primary" data-testid="button-start-round"><Play size={15} />Iniciar um round</Link>}
      />
      <div className="grid metrics">
        <Metric label="Melhor pontuação" value={data?.bestScore ?? '—'} detail="todos os rounds registrados" />
        <Metric label="Média recente" value={data?.recentAverage ?? '—'} detail="conjunto de treinos mais recente" />
        <Metric label="Última pontuação" value={data?.lastScore ?? '—'} detail="resultado mais recente" />
        <Metric label="Rounds registrados" value={data?.totalRounds ?? 0} detail={`${data?.averageTokens ?? '—'} tokens restantes em média`} />
      </div>
      <div className="grid two-col">
        <section className="card">
          <div className="card-head"><div><h2>Rounds recentes</h2><span className="muted">Seus registros mais recentes em campo</span></div><Link href="/rounds" className="link" data-testid="link-all-rounds">Ver histórico <ArrowRight size={12} style={{ verticalAlign: 'middle' }} /></Link></div>
          <div className="card-body"><div className="round-list">{rounds.length ? rounds.slice(0, 5).map((round: any) => <RoundRow key={round.id} round={round} />) : <EmptyState title="Nenhum round ainda" body="Registre o primeiro round BIOGLOW e comece a criar sua linha de base." action={<Link href="/rounds/new" className="button button-primary" data-testid="button-empty-capture">Registrar primeiro round</Link>} />}</div></div>
        </section>
        <section className="card">
          <div className="card-head"><div><h2>Foco do treinador</h2><span className="muted">Missões de maior impacto</span></div><Target size={17} color="hsl(var(--primary))" /></div>
          <div className="card-body">{focus.length ? focus.slice(0, 3).map((mission: any, index: number) => <div className="focus-item" key={mission.missionId}><div className="focus-index">0{index + 1}</div><div><strong>M{mission.missionNumber} · {mission.missionName}</strong><span>{mission.successRate ?? 0}% de sucesso · {mission.averageScore ?? 0} pontos em média</span></div></div>) : <EmptyState title="O foco aparecerá aqui" body="Registre alguns rounds para revelar as missões que merecem o próximo bloco de treino." />}</div>
        </section>
      </div>
      <div className="grid two-col" style={{ marginTop: 18 }}>
        <section className="card">
          <div className="card-head"><div><h2>Pulso da pontuação</h2><span className="muted">As últimas cinco pontuações registradas</span></div><BarChart3 size={17} color="hsl(var(--primary))" /></div>
          <div className="card-body">{rounds.length ? <div className="bar-chart">{rounds.slice(0, 5).reverse().map((round: any, index: number) => <div className="bar-col" key={round.id}><div className="bar" style={{ height: `${Math.max(8, Math.min(100, (round.totalScore || 0) / 4))}%` }} /><small>{round.totalScore}</small><small>R{index + 1}</small></div>)}</div> : <EmptyState title="Sua evolução está esperando" body="As pontuações formarão um pulso visual do treino conforme você registrar rounds." />}</div>
        </section>
        <section className="card">
          <div className="card-head"><div><h2>Problemas frequentes</h2><span className="muted">Padrões para entender, não culpar</span></div><CircleHelp size={17} color="hsl(var(--primary))" /></div>
          <div className="card-body">{data?.frequentProblems?.length ? data.frequentProblems.map((problem: string, index: number) => <div className="focus-item" key={problem}><div className="focus-index" style={{ background: 'hsl(var(--secondary))', color: 'hsl(var(--primary))' }}>{index + 1}</div><div><strong>{problem}</strong><span>apareceu nos rounds recentes</span></div></div>) : <EmptyState title="Nenhum problema recorrente" body="Continue registrando detalhes nas notas dos rounds para tornar os padrões visíveis." />}</div>
        </section>
      </div>
    </div>
  );
}

function NewRound() {
  const [, setLocation] = useLocation();
  const missions = useListMissions();
  const members = useListMembers();
  const create = useCreateRound();
  const [timerMode, setTimerMode] = useState<TimerMode>('countdown');
  const plannedDurationSeconds = DEFAULT_ROUND_DURATION_SECONDS;
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [event, setEvent] = useState('Campo de treino');
  const [roundType, setRoundType] = useState('training');
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [notes, setNotes] = useState('');
  const [problemCauses, setProblemCauses] = useState<string[]>([]);
  const [otherProblem, setOtherProblem] = useState('');
  const [results, setResults] = useState<Record<number, Record<string, any>>>({});
  const [missionStatuses, setMissionStatuses] = useState<Record<number, 'automatic' | 'not_attempted' | 'not_executed'>>({});
  const [tokensRemaining, setTokensRemaining] = useState(6);
  const [inspectionStatus, setInspectionStatus] = useState('unregistered');
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setElapsed((seconds) => timerMode === 'countdown'
        ? Math.min(seconds + 1, plannedDurationSeconds)
        : seconds + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, timerMode, plannedDurationSeconds]);
  useEffect(() => {
    if (timerMode === 'countdown' && elapsed >= plannedDurationSeconds) setRunning(false);
  }, [elapsed, plannedDurationSeconds, timerMode]);
  const list: any[] = missions.data || [];
  const displayedSeconds = timerMode === 'countdown'
    ? Math.max(plannedDurationSeconds - elapsed, 0)
    : elapsed;
  const displayedTime = formatDuration(displayedSeconds);
  const timerComplete = timerMode === 'countdown' && elapsed >= plannedDurationSeconds;
  const changeTimerMode = (nextMode: TimerMode) => {
    if (nextMode === timerMode) return;
    setRunning(false);
    setElapsed(0);
    setTimerMode(nextMode);
  };
  const setCriterion = (missionId: number, rule: any, patch: any) => setResults((old) => ({
    ...old,
    [missionId]: {
      ...(old[missionId] || {}),
      [rule.key]: { ...defaultCriterion(rule), ...(old[missionId]?.[rule.key] || {}), ...patch },
    },
  }));
  const missionInputs = list.map((mission: any) => {
    const criteria = mission.scoringRules?.reduce((all: Record<string, any>, rule: any) => {
      all[rule.key] = { ...defaultCriterion(rule), ...(results[mission.id]?.[rule.key] || {}) };
      return all;
    }, {}) || {};
    return { mission, criteria, status: missionStatuses[mission.id] || 'automatic' };
  });
  const attempted = missionInputs.filter(({ mission, criteria, status }) =>
    status === 'automatic' && (mission.scoringRules || []).some((rule: any) => criterionIsAttempted(rule, criteria[rule.key]))).length;
  const missionScore = missionInputs.reduce((total, { mission, criteria, status }) =>
    total + (status === 'automatic' ? clientMissionPoints(mission, criteria) : 0), 0);
  const inspectionPoints = inspectionStatus === 'approved' ? 20 : 0;
  const score = missionScore + inspectionPoints + tokenPointsByRemaining[tokensRemaining];
  const toggleProblemCause = (cause: string) => setProblemCauses((current) =>
    current.includes(cause) ? current.filter((item) => item !== cause) : [...current, cause],
  );
  const save = () => create.mutate({
    data: {
      dateTime: new Date().toISOString(), type: roundType, seasonName: 'BIOGLOW 2026–2027', event, memberIds,
      plannedDurationSeconds: timerMode === 'countdown' ? plannedDurationSeconds : 0,
      actualDurationSeconds: elapsed, robotVersion: 'Versão atual',
      fieldSetup: '', fieldConditions: '', generalNotes: notes, problemCauses, otherProblem,
      missionResults: missionInputs.map(({ mission, criteria, status }) => ({
        missionId: mission.id,
        criteria: status === 'automatic'
          ? Object.values(criteria)
          : (mission.scoringRules || []).map((rule: any) => defaultCriterion(rule)),
        failureType: null,
        technicalNotes: '',
        confidence: 'medium',
      })),
      tokens: { started: 6, remaining: tokensRemaining, interruptions: 0, notes: '' },
      inspection: { status: inspectionStatus, notes: '' },
      officialScoreNotes: '', status: 'saved',
    } as any,
  }, {
    onSuccess: (round: any) => setLocation(`/rounds/${round.id}`),
    onError: () => window.alert('Não foi possível salvar o round. Verifique a conexão e tente novamente.'),
  });

  return (
    <div className="content">
      <PageHeading eyebrow="BIOGLOW / registro em campo" title="Registre a execução." subtitle="Rápido o suficiente para o box. Detalhado o suficiente para a próxima conversa do treinador." action={<button className="button button-primary" onClick={save} disabled={create.isPending} data-testid="button-save-round">{create.isPending ? 'Salvando…' : <><Check size={15} />Salvar round</>}</button>} />
      <div className="capture-layout">
        <div className="grid">
          <section className="card capture-card">
            <div className="capture-toolbar"><div><div className="eyebrow">Configuração do round</div><h2>Antes do lançamento</h2></div><div className={`timer ${running ? 'live' : ''}`} data-testid="text-round-timer">{displayedTime}</div></div>
            <div className="form-grid">
              <div className="field"><label htmlFor="round-event">Nome da sessão</label><input id="round-event" className="input" value={event} onChange={(inputEvent) => setEvent(inputEvent.target.value)} data-testid="input-round-event" /></div>
              <div className="field"><label htmlFor="round-type">Tipo de round</label><select id="round-type" className="select" value={roundType} onChange={(selectEvent) => setRoundType(selectEvent.target.value)} data-testid="select-round-type"><option value="training">Treino</option><option value="simulation">Simulação</option><option value="official">Oficial</option></select></div>
              <TimerModeSelector mode={timerMode} onChange={changeTimerMode} idPrefix="round-timer-mode" disabled={running} className="field full" />
              <div className="field full"><label>Equipe na mesa</label><div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>{(members.data || []).filter((member: any) => member.active).map((member: any) => <button type="button" key={member.id} className={`button ${memberIds.includes(member.id) ? 'button-primary' : 'button-ghost'}`} onClick={() => setMemberIds((ids) => ids.includes(member.id) ? ids.filter((id) => id !== member.id) : [...ids, member.id])} data-testid={`button-member-${member.id}`}>{memberIds.includes(member.id) && <Check size={12} />}{member.nickname || member.name}</button>)}</div><small>{memberIds.length ? `${memberIds.length} integrante${memberIds.length === 1 ? '' : 's'} selecionado${memberIds.length === 1 ? '' : 's'}` : 'Selecione quem está executando esta sessão'}</small></div>
              <div className="field"><label htmlFor="inspection-status">Inspeção de equipamento</label><select id="inspection-status" className="select" value={inspectionStatus} onChange={(event) => setInspectionStatus(event.target.value)} data-testid="select-inspection-status"><option value="unregistered">Não registrada</option><option value="rejected">Não aprovada</option><option value="approved">Aprovada — 20 pontos</option></select><small>Equipamento em apenas uma área de lançamento pontua 20.</small></div>
              <div className="field"><label htmlFor="tokens-remaining">Tokens de precisão restantes</label><select id="tokens-remaining" className="select" value={tokensRemaining} onChange={(event) => setTokensRemaining(Number(event.target.value))} data-testid="select-tokens-remaining">{[6, 5, 4, 3, 2, 1, 0].map((value) => <option key={value} value={value}>{value} tokens — {tokenPointsByRemaining[value]} pontos</option>)}</select><small>O valor é fixo conforme a tabela oficial.</small></div>
            </div>
          </section>
          <section className="card capture-card">
            <div className="capture-toolbar"><div><div className="eyebrow">Resultados das missões</div><h2>O que aconteceu em campo?</h2></div><div style={{ display: 'flex', gap: 7 }}><button className={`button ${running ? 'button-danger' : 'button-lime'}`} onClick={() => setRunning((value) => !value)} disabled={timerComplete} data-testid="button-toggle-timer">{running ? <><Pause size={14} />Parar cronômetro</> : timerComplete ? 'Tempo encerrado' : <><Play size={14} />{elapsed ? 'Continuar cronômetro' : 'Iniciar cronômetro'}</>}</button><button className="button button-ghost" onClick={() => { setElapsed(0); setRunning(false); }} aria-label="Reiniciar cronômetro" data-testid="button-reset-timer"><TimerReset size={14} /></button></div></div>
            <div className="mission-grid">{list.length ? list.map((mission: any) => {
              const missionInput = missionInputs.find(({ mission: item }) => item.id === mission.id);
              const criteria = missionInput?.criteria || {};
              const missionStatus = missionInput?.status || 'automatic';
              const statusOverridesScoring = missionStatus !== 'automatic';
              const subtotal = statusOverridesScoring ? 0 : clientMissionPoints(mission, criteria);
              const attemptedMission = !statusOverridesScoring && (mission.scoringRules || []).some((rule: any) => criterionIsAttempted(rule, criteria[rule.key]));
              return <div className={`mission-entry ${attemptedMission ? 'selected' : ''} ${statusOverridesScoring ? 'status-overridden' : ''}`} key={mission.id}>
                <div className="mission-number">{String(mission.number).padStart(2, '0')}</div>
                <div style={{ minWidth: 0, flex: 1 }}><strong>{mission.code} · {mission.name}</strong><p>{mission.description}</p>{mission.warning && <div className="notice" style={{ marginTop: 8 }}><CircleHelp size={13} />{mission.warning}</div>}
                  <div className="mission-status-field">
                    <label htmlFor={`mission-status-${mission.id}`}>Status da missão</label>
                    <select
                      id={`mission-status-${mission.id}`}
                      className="select"
                      value={missionStatus}
                      onChange={(event) => setMissionStatuses((current) => ({ ...current, [mission.id]: event.target.value as 'automatic' | 'not_attempted' | 'not_executed' }))}
                      data-testid={`select-mission-status-${mission.id}`}
                    >
                      <option value="automatic">Calcular pelos critérios</option>
                      <option value="not_attempted">Não tentada</option>
                      <option value="not_executed">Não executada</option>
                    </select>
                    {statusOverridesScoring && <small>Esta situação é temporária e não será salva com o round. A pontuação fica zerada.</small>}
                  </div>
                  <div className="grid" style={{ gap: 7, marginTop: 12 }}>{(mission.scoringRules || []).map((rule: any) => {
                    const value = criteria[rule.key] || defaultCriterion(rule);
                    const points = statusOverridesScoring ? 0 : clientCriterionPoints(mission, rule, value, criteria);
                    return <div key={rule.key} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {rule.inputKind === 'boolean' && <button type="button" className={`button ${value.achieved ? 'button-primary' : 'button-ghost'}`} style={{ padding: '7px 9px', flex: '1 1 280px', justifyContent: 'flex-start' }} onClick={() => setCriterion(mission.id, rule, { achieved: !value.achieved })} disabled={statusOverridesScoring} data-testid={`button-condition-${mission.id}-${rule.key}`}>{value.achieved ? <Check size={13} /> : <Plus size={13} />}<span>{rule.label}</span></button>}
                      {rule.inputKind === 'quantity' && <><label style={{ flex: '1 1 280px', fontSize: 12 }}>{rule.label}<input type="number" min="0" step="1" className="input" style={{ marginTop: 5 }} value={value.quantity || ''} onChange={(event) => setCriterion(mission.id, rule, { quantity: Math.max(0, Number(event.target.value) || 0), achieved: Number(event.target.value) > 0 })} disabled={statusOverridesScoring} data-testid={`input-condition-${mission.id}-${rule.key}`} /></label></>}
                      {rule.inputKind === 'select' && <label style={{ flex: '1 1 280px', fontSize: 12 }}>{rule.label}<select className="select" style={{ marginTop: 5 }} value={value.selection || 'none'} onChange={(event) => setCriterion(mission.id, rule, { selection: event.target.value, achieved: event.target.value !== 'none' })} disabled={statusOverridesScoring} data-testid={`select-condition-${mission.id}-${rule.key}`}>{rule.options.map((option: any) => <option key={option.value} value={option.value}>{option.label}{option.points ? ` — ${option.points} pontos` : ''}</option>)}</select></label>}
                      <span className="status-chip" style={{ minWidth: 78, textAlign: 'center' }}>{points} pts</span>
                    </div>;
                  })}</div>
                </div>
                <div className="score" title="Calculado automaticamente pelas condições oficiais">{subtotal}</div>
              </div>;
            }) : <EmptyState title="Catálogo de missões indisponível" body="A configuração das missões ainda está carregando ou não pôde ser acessada." />}</div>
          </section>
          <section className="card capture-card">
            <div className="card-head" style={{ padding: 0, marginBottom: 14 }}><div><h2>Erros e causas do round</h2><span className="muted">Marque tudo o que atrapalhou esta execução.</span></div><AlertTriangle size={17} color="hsl(var(--primary))" /></div>
            <div className="field">
              <label>Causa do erro</label>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {problemCauseOptions.map((option) => <button type="button" key={option.value} className={`button ${problemCauses.includes(option.value) ? 'button-primary' : 'button-ghost'}`} onClick={() => toggleProblemCause(option.value)} aria-pressed={problemCauses.includes(option.value)} data-testid={`button-problem-cause-${option.value}`}>{problemCauses.includes(option.value) && <Check size={12} />}{option.label}</button>)}
              </div>
              <small>{problemCauses.length ? `${problemCauses.length} causa${problemCauses.length === 1 ? '' : 's'} selecionada${problemCauses.length === 1 ? '' : 's'}` : 'Nenhuma causa selecionada'}</small>
            </div>
            <div className="field" style={{ marginTop: 16 }}><label htmlFor="round-other-problem">Outro problema</label><textarea id="round-other-problem" className="textarea" value={otherProblem} onChange={(event) => setOtherProblem(event.target.value)} placeholder="Descreva outro problema, se aconteceu…" data-testid="textarea-round-other-problem" /></div>
          </section>
          <section className="card capture-card"><div className="field"><label htmlFor="round-notes">Notas do round</label><textarea id="round-notes" className="textarea" value={notes} onChange={(inputEvent) => setNotes(inputEvent.target.value)} placeholder="Uma observação útil para o próximo round…" data-testid="textarea-round-notes" /></div></section>
        </div>
        <aside className="grid side-sticky">
          <div className="summary-total"><div className="eyebrow">Estimativa ao vivo</div><div className="total" data-testid="text-live-score">{score}</div><span>pontos estimados · BIOGLOW 2026–2027</span></div>
            <div className="card" style={{ padding: 20 }}><div className="card-head" style={{ padding: 0, marginBottom: 14 }}><h3>Pulso da execução</h3><Gauge size={17} color="hsl(var(--primary))" /></div><div className="setting-row" style={{ padding: '12px 0' }}><div><strong>Tentadas</strong><p>missões registradas</p></div><b>{attempted}/15</b></div><div className="setting-row" style={{ padding: '12px 0' }}><div><strong>{timerMode === 'countdown' ? 'Tempo restante' : 'Tempo decorrido'}</strong><p>{timerMode === 'countdown' ? `limite ${formatDuration(plannedDurationSeconds)}` : 'cronômetro livre'}</p></div><b>{displayedTime}</b></div><div className="setting-row" style={{ padding: '12px 0' }}><div><strong>Tokens restantes</strong><p>pontuação oficial</p></div><b>{tokensRemaining} · {tokenPointsByRemaining[tokensRemaining]} pts</b></div><div className="setting-row" style={{ padding: '12px 0 0' }}><div><strong>Inspeção</strong><p>equipamento em uma área</p></div><b>{inspectionPoints} pts</b></div></div>
            <div className="notice"><CircleHelp size={15} />{timerMode === 'countdown' ? 'A contagem regressiva para automaticamente em 00:00.' : 'O cronômetro livre começa em 00:00 e só para quando você clicar em “Parar cronômetro”.'} Pausar ou parar não fecha o round; ele continua aberto até você clicar em “Salvar round”.</div>
        </aside>
      </div>
    </div>
  );
}

function Rounds() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const params: any = { search: search || undefined, type: type === 'all' ? undefined : type, sort: 'recent', limit: 100 };
  const rounds = useListRounds(params);
  const archive = useArchiveRound();
  const duplicate = useDuplicateRound();
  const list: any[] = rounds.data || [];
  const archiveOne = (id: number) => {
    if (window.confirm('Arquivar este round? Ele sairá do histórico ativo.')) {
      archive.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListRoundsQueryKey(params) }) });
    }
  };

  return (
    <div className="content">
      <PageHeading eyebrow="BIOGLOW / histórico" title="Histórico de rounds." subtitle="O registro de treino é o registro do coaching." action={<Link href="/rounds/new" className="button button-primary" data-testid="button-history-new"><Plus size={15} />Novo round</Link>} />
      <div className="toolbar"><div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 330 }}><Search size={15} style={{ position: 'absolute', top: 11, left: 11, color: 'hsl(var(--muted-foreground))' }} /><input className="input" style={{ paddingLeft: 33 }} placeholder="Buscar sessão ou integrante…" value={search} onChange={(event) => setSearch(event.target.value)} data-testid="input-round-search" /></div><select className="select" style={{ width: 150 }} value={type} onChange={(event) => setType(event.target.value)} data-testid="select-round-filter"><option value="all">Todos os tipos</option><option value="training">Treino</option><option value="simulation">Simulação</option><option value="official">Oficial</option></select><button className="button button-ghost" onClick={() => rounds.refetch()} data-testid="button-refresh-rounds"><RefreshCw size={14} />Atualizar</button></div>
      <div className="card table-wrap">{rounds.isLoading ? <div style={{ padding: 22 }}><LoadingState /></div> : rounds.isError ? <ErrorState retry={() => rounds.refetch()} /> : list.length ? <table><thead><tr><th>Sessão</th><th>Tipo</th><th>Data</th><th>Pontuação</th><th>Cobertura</th><th>Status</th><th aria-label="Ações" /></tr></thead><tbody>{list.map((round: any) => <tr key={round.id}><td><Link href={`/rounds/${round.id}`} className="link" data-testid={`link-round-${round.id}`}>{round.event || 'Sessão de treino'}</Link><div className="round-meta">{round.members?.map((member: any) => member.nickname || member.name).join(', ') || 'Nenhum integrante'}</div></td><td><span className="status-chip">{formatRoundType(round.type)}</span></td><td>{new Date(round.dateTime).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</td><td><b style={{ color: 'hsl(var(--primary))' }}>{round.totalScore ?? 0}</b></td><td>{round.attemptedMissions ?? 0}/15</td><td><span className={`status-chip ${round.status}`}>{formatStatus(round.status)}</span></td><td><div style={{ display: 'flex', gap: 5 }}><Link href={`/rounds/${round.id}?edit=1`} className="button button-ghost" style={{ padding: 7 }} data-testid={`button-edit-round-${round.id}`}><Pencil size={13} /></Link><button className="button button-ghost" style={{ padding: 7 }} onClick={() => duplicate.mutate({ id: round.id }, { onSuccess: (copy: any) => setLocation(`/rounds/${copy.id}`) })} data-testid={`button-duplicate-round-${round.id}`}><Copy size={13} /></button><button className="button button-danger" style={{ padding: 7 }} onClick={() => archiveOne(round.id)} data-testid={`button-archive-round-${round.id}`}><Archive size={13} /></button></div></td></tr>)}</tbody></table> : <EmptyState title="Nenhum round encontrado" body={search ? 'Tente outra busca ou limpe o filtro.' : 'Registre seu primeiro round para transformar o tempo em campo em um histórico útil.'} action={!search ? <Link href="/rounds/new" className="button button-primary" data-testid="button-empty-history">Registrar um round</Link> : undefined} />}</div>
    </div>
  );
}

function RoundDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const detail = useGetRound(id);
  const queryClient = useQueryClient();
  const update = useUpdateRound();
  const [editing, setEditing] = useState(() => new URLSearchParams(window.location.search).get('edit') === '1');
  const [timerMode, setTimerMode] = useState<TimerMode>('countdown');
  const [plannedDurationSeconds, setPlannedDurationSeconds] = useState(DEFAULT_ROUND_DURATION_SECONDS);
  const [actualDurationSeconds, setActualDurationSeconds] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [problemCauses, setProblemCauses] = useState<string[]>([]);
  const [otherProblem, setOtherProblem] = useState('');
  useEffect(() => {
    if (detail.data) {
      const data: any = detail.data;
      const plannedDuration = Math.max(0, Math.floor(Number(data.plannedDurationSeconds ?? DEFAULT_ROUND_DURATION_SECONDS)));
      setTimerMode(plannedDuration === 0 ? 'stopwatch' : 'countdown');
      setPlannedDurationSeconds(plannedDuration || DEFAULT_ROUND_DURATION_SECONDS);
      setActualDurationSeconds(data.actualDurationSeconds == null ? null : Math.max(0, Math.floor(Number(data.actualDurationSeconds))));
      setNotes(data.generalNotes || '');
      setProblemCauses(Array.isArray(data.problemCauses) ? data.problemCauses : []);
      setOtherProblem(data.otherProblem || '');
    }
  }, [detail.data]);
  if (detail.isLoading) return <div className="content"><LoadingState /></div>;
  if (detail.isError || !detail.data) return <div className="content"><ErrorState retry={() => detail.refetch()} /></div>;
  const round: any = detail.data;
  const results: any[] = round.missionResults || [];
  const toggleDetailProblemCause = (cause: string) => setProblemCauses((current) =>
    current.includes(cause) ? current.filter((item) => item !== cause) : [...current, cause],
  );
  const saveRoundChanges = () => update.mutate({
    id,
    data: {
      generalNotes: notes,
      problemCauses,
      otherProblem,
      plannedDurationSeconds: timerMode === 'countdown' ? Math.max(1, plannedDurationSeconds) : 0,
      actualDurationSeconds,
    } as any,
  }, {
    onSuccess: (next: any) => {
      queryClient.setQueryData(getGetRoundQueryKey(id), next);
      setEditing(false);
    },
  });

  return (
    <div className="content">
      <PageHeading eyebrow={`BIOGLOW / ${formatRoundType(round.type)}`} title={round.event || 'Sessão de treino'} subtitle={`${new Date(round.dateTime).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })} · Robô ${round.robotVersion || '—'}`} action={<div className="no-print" style={{ display: 'flex', gap: 8 }}><button className="button button-ghost" onClick={() => window.print()} data-testid="button-print-round"><Printer size={14} />Imprimir resumo</button><button className="button button-primary" onClick={() => setEditing((value) => !value)} data-testid="button-edit-detail"><Pencil size={14} />{editing ? 'Fechar edição' : 'Editar round'}</button></div>} />
      <div className="grid two-col">
        <div className="grid">
          <section className="card" style={{ padding: 24 }}><div className="eyebrow">Resultado do round</div><div className="detail-score"><b data-testid="text-round-total-score">{round.totalScore ?? 0}</b><span>pontos no total</span></div><div style={{ display: 'flex', gap: 12, marginTop: 13, flexWrap: 'wrap' }}><span className="status-chip">{round.attemptedMissions ?? 0} missões tentadas</span><span className="status-chip">{round.problemsCount ?? 0} problemas registrados</span><span className={`status-chip ${round.status}`}>{formatStatus(round.status)}</span></div></section>
          <section className="card"><div className="card-head"><div><h2>Leitura das missões</h2><span className="muted">Cada condição e subtotal calculados pelo regulamento oficial</span></div><Target size={17} color="hsl(var(--primary))" /></div><div className="card-body"><div className="round-list">{results.length ? results.map((mission: any) => <div className="round-row" key={mission.missionId}><div style={{ flex: 1 }}><div className="round-title">Missão {String(mission.missionId).padStart(2, '0')}</div><div className="grid" style={{ gap: 4, marginTop: 7 }}>{(mission.criteria || []).map((criterion: any) => <div key={criterion.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11, color: 'hsl(var(--muted-foreground))' }}><span>{criterion.label}{criterion.quantity > 1 ? ` · ${criterion.quantity} unidades` : ''}</span><b style={{ color: criterion.points ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>{criterion.points} pts</b></div>)}</div><div className="round-meta" style={{ marginTop: 7 }}>{mission.technicalNotes || 'Nenhuma nota técnica registrada'}</div></div><div className="score" title="Subtotal oficial da missão">{mission.points ?? 0}</div><span className={`status-chip ${mission.status === 'complete' || mission.status === 'bonus' ? 'complete' : mission.status === 'not_attempted' ? '' : 'pending'}`}>{formatStatus(mission.status)}</span></div>) : <EmptyState title="Nenhum detalhe de missão" body="Este round foi salvo sem resultados individuais das missões." />}</div></div></section>
        </div>
        <aside className="grid">
          <section className="card" style={{ padding: 21 }}>
            <div className="card-head" style={{ padding: 0, marginBottom: 14 }}>
              <div><h3>Tempo do round</h3><span className="muted">Modo e duração registrados</span></div>
              <TimerReset size={16} color="hsl(var(--primary))" />
            </div>
            {editing ? (
              <div className="grid" style={{ gap: 12 }}>
                <TimerModeSelector mode={timerMode} onChange={setTimerMode} idPrefix="edit-round-timer-mode" />
                {timerMode === 'countdown' && <DurationInputs idPrefix="edit-round-planned-duration" label="Tempo da contagem regressiva" valueSeconds={plannedDurationSeconds} onChange={setPlannedDurationSeconds} minSeconds={1} />}
                <DurationInputs idPrefix="edit-round-actual-duration" label="Tempo realizado" valueSeconds={actualDurationSeconds} onChange={setActualDurationSeconds} />
                <small>Salve as alterações no botão ao final da edição.</small>
              </div>
            ) : (
              <>
                <div className="setting-row"><div><strong>Modo</strong><p>tipo de cronômetro</p></div><b>{round.plannedDurationSeconds === 0 ? 'Cronômetro livre' : 'Contagem regressiva'}</b></div>
                <div className="setting-row"><div><strong>Tempo definido</strong><p>limite da contagem</p></div><b>{round.plannedDurationSeconds === 0 ? 'Sem limite' : formatDuration(round.plannedDurationSeconds ?? DEFAULT_ROUND_DURATION_SECONDS)}</b></div>
                <div className="setting-row"><div><strong>Tempo realizado</strong><p>duração registrada</p></div><b>{formatDuration(round.actualDurationSeconds)}</b></div>
              </>
            )}
          </section>
          <section className="card" style={{ padding: 21 }}>
            <div className="card-head" style={{ padding: 0, marginBottom: 14 }}><div><h3>Erros e causas</h3><span className="muted">O que atrapalhou este round</span></div><AlertTriangle size={16} color="hsl(var(--primary))" /></div>
            {editing ? (
              <>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>{problemCauseOptions.map((option) => <button type="button" key={option.value} className={`button ${problemCauses.includes(option.value) ? 'button-primary' : 'button-ghost'}`} style={{ padding: '7px 9px' }} onClick={() => toggleDetailProblemCause(option.value)} aria-pressed={problemCauses.includes(option.value)} data-testid={`button-edit-problem-cause-${option.value}`}>{problemCauses.includes(option.value) && <Check size={12} />}{option.label}</button>)}</div>
                <textarea className="textarea" style={{ marginTop: 12 }} value={otherProblem} onChange={(event) => setOtherProblem(event.target.value)} placeholder="Outro problema, se aplicável…" data-testid="textarea-edit-other-problem" />
                <textarea className="textarea" style={{ marginTop: 12 }} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notas gerais do round…" data-testid="textarea-edit-round-notes" />
              </>
            ) : (
              <>{round.problemCauses?.length || round.otherProblem ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{(round.problemCauses || []).map((cause: string) => <span className="status-chip pending" key={cause}>{problemCauseLabels[cause] || cause}</span>)}{round.otherProblem && <span className="status-chip pending">Outro: {round.otherProblem}</span>}</div> : <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>Nenhuma causa registrada neste round.</p>}</>
            )}
          </section>
          <div className="card" style={{ padding: 21 }}><div className="eyebrow">Resumo oficial da pontuação</div><div className="setting-row"><div><strong>Missões</strong><p>condições cumpridas</p></div><b>{round.scoreBreakdown?.missionPoints ?? 0} pts</b></div><div className="setting-row"><div><strong>Inspeção</strong><p>equipamento em uma área</p></div><b>{round.scoreBreakdown?.inspectionPoints ?? round.inspection?.points ?? 0} pts</b></div><div className="setting-row"><div><strong>Tokens restantes</strong><p>{round.tokens?.remaining ?? '—'} tokens</p></div><b>{round.scoreBreakdown?.tokenPoints ?? round.tokens?.points ?? 0} pts</b></div><div className="setting-row"><div><strong>Total calculado</strong><p>sem pontuação manual</p></div><b>{round.scoreBreakdown?.total ?? round.totalScore ?? 0} pts</b></div></div>
          {editing && <button className="button button-primary" style={{ width: '100%' }} onClick={saveRoundChanges} disabled={update.isPending} data-testid="button-save-round-notes">{update.isPending ? 'Salvando…' : 'Salvar alterações'}</button>}
        </aside>
      </div>
      <div className="print-only"><h1>TechEra · BIOGLOW 2026–2027</h1><p>Resumo do round · {round.event || 'Sessão de treino'} · {round.totalScore ?? 0} pontos</p></div>
    </div>
  );
}

function AnalyticsPage() {
  const analytics = useGetAnalytics();
  const [chartMetric, setChartMetric] = useState<MissionChartMetricKey>('averageScore');
  if (analytics.isLoading) return <div className="content"><LoadingState /></div>;
  if (analytics.isError) return <div className="content"><ErrorState retry={() => analytics.refetch()} /></div>;
  const data: any = analytics.data;
  const trend: any[] = data?.scoreTrend || [];
  const metrics: any[] = data?.missionMetrics || [];
  const max = Math.max(...trend.map((item) => item.score), 1);
  const selectedChartMetric = missionChartMetrics.find((metric) => metric.key === chartMetric)!;
  const missionChartData = metrics.map((mission) => ({
    ...mission,
    missionLabel: `M${String(mission.missionNumber).padStart(2, '0')}`,
    chartValue: Number(mission[chartMetric]) || 0,
  }));

  return (
    <div className="content">
      <PageHeading eyebrow="BIOGLOW / evolução" title="Veja o treino evoluir." subtitle="Use os dados para escolher o próximo bloco de trabalho." action={<Link href="/rounds/new" className="button button-primary" data-testid="button-analytics-capture"><Plus size={15} />Registrar outro round</Link>} />
      <div className="grid two-col score-evolution-layout">
        <section className="card score-evolution-card">
          <div className="card-head">
            <div>
              <h2>Evolução da pontuação</h2>
              <span className="muted">Verde acima de 400 pontos · roxo até 400</span>
            </div>
            <TrendingUp size={17} color="hsl(var(--primary))" />
          </div>
          <div className="card-body">
            {trend.length ? (
              <div
                className="score-evolution-scroll"
                role="region"
                aria-label="Gráfico de evolução da pontuação. Deslize horizontalmente para consultar todos os registros."
                tabIndex={0}
              >
                <div
                  className="score-evolution-chart"
                  style={{
                    width: `${trend.length * 68 + Math.max(0, trend.length - 1) * 12 + 24}px`,
                  }}
                >
                  {trend.map((item, index) => {
                    const barHeight = Math.max(8, (item.score / max) * 82);
                    return (
                      <div className="score-evolution-column" key={`${item.date}-${index}`}>
                        <div className="score-evolution-plot">
                          <small
                            className="score-evolution-value"
                            style={{ bottom: `calc(${barHeight}% + 5px)` }}
                          >
                            {item.score}
                          </small>
                          <div
                            className="score-evolution-bar"
                            style={{
                              height: `${barHeight}%`,
                              background: item.score > 400 ? 'hsl(143 48% 38%)' : 'hsl(var(--primary))',
                            }}
                          />
                        </div>
                        <small className="score-evolution-date">
                          {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </small>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <EmptyState title="Ainda não há curva de evolução" body="Registre vários rounds para ver como o treino está mudando a pontuação." />
            )}
          </div>
        </section>
        <section className="card"><div className="card-head"><div><h2>Histórico de problemas</h2><span className="muted">O que continua aparecendo</span></div><AlertTriangle size={17} color="hsl(var(--primary))" /></div><div className="card-body">{data?.problemHistory?.length ? data.problemHistory.map((problem: any) => <div className="focus-item" key={problem.label}><div className="focus-index" style={{ background: 'hsl(33 92% 61%/.2)', color: 'hsl(28 65% 31%)' }}>{problem.count}</div><div><strong>{problem.label}</strong><span>ocorrências registradas</span></div></div>) : <EmptyState title="Nenhum padrão de problema" body="Notas específicas de campo se transformam em padrões aqui." />}</div></section>
      </div>
      <section className="card" style={{ marginTop: 18 }}>
        <div className="card-head"><div><h2>Mapa de foco das missões</h2><span className="muted">Compare os indicadores e mantenha a tabela completa</span></div><Target size={17} color="hsl(var(--primary))" /></div>
        <div className="card-body">
          <div className="mission-chart-controls" role="group" aria-label="Indicador do gráfico de missões">
            {missionChartMetrics.map((metric) => (
              <button
                key={metric.key}
                type="button"
                className={`button ${chartMetric === metric.key ? 'button-primary' : 'button-ghost'}`}
                onClick={() => setChartMetric(metric.key)}
                aria-pressed={chartMetric === metric.key}
                data-testid={`button-mission-chart-${metric.key}`}
              >
                {metric.label}
              </button>
            ))}
          </div>
          {missionChartData.length && metrics.some((mission) => mission.attempts > 0) ? (
            <>
              <div
                className="mission-chart-wrap"
                style={{ height: Math.max(260, Math.min(480, missionChartData.length * 30)) }}
                data-testid="chart-mission-focus"
                aria-label={`${selectedChartMetric.label} por missão`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={missionChartData} layout="vertical" margin={{ top: 5, right: 18, bottom: 5, left: 0 }}>
                    <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      domain={[0, chartMetric === 'successRate' ? 100 : 'auto']}
                      allowDecimals={chartMetric === 'averageScore'}
                      tickFormatter={(value) => chartMetric === 'successRate' ? `${value}%` : String(value)}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="missionLabel"
                      width={44}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<MissionMetricsTooltip />} cursor={{ fill: 'hsl(var(--muted) / .5)' }} />
                    <Bar dataKey="chartValue" name={selectedChartMetric.label} fill={selectedChartMetric.color} radius={[0, 5, 5, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mission-chart-caption">Passe o cursor sobre uma barra para ver todos os indicadores da missão. A tabela abaixo mantém os valores completos.</p>
            </>
          ) : (
            <EmptyState title="Ainda não há dados para o gráfico" body="Registre ao menos uma tentativa para comparar os indicadores das missões." />
          )}
        </div>
        <div className="table-wrap"><table><thead><tr><th>Missão</th><th>Melhor</th><th>Média</th><th>Sucesso</th><th>Tentativas</th><th>Prioridade</th></tr></thead><tbody>{metrics.length ? metrics.map((mission: any) => <tr key={mission.missionId}><td><b>M{mission.missionNumber}</b> · {mission.missionName}</td><td>{mission.bestScore}</td><td>{mission.averageScore}</td><td>{mission.successRate}%</td><td>{mission.attempts}</td><td><span className={`status-chip ${mission.priority === 'high' ? 'pending' : 'saved'}`}>{mission.priority === 'high' ? 'Alta' : mission.priority === 'medium' ? 'Média' : 'Baixa'}</span></td></tr>) : <tr><td colSpan={6}><EmptyState title="As métricas aparecem após o primeiro round" body="O desempenho por missão se torna útil quando a equipe tem alguns resultados para comparar." /></td></tr>}</tbody></table></div>
      </section>
    </div>
  );
}

function MissionsPage() {
  const missions = useListMissions();
  const [tab, setTab] = useState('all');
  const list: any[] = missions.data || [];
  const shown = list.filter((mission) => tab === 'all' || mission.scoreConfigStatus === tab);
  return (
    <div className="content">
      <PageHeading eyebrow="BIOGLOW / catálogo de missões" title="Conheça as missões." subtitle="A fonte única da configuração de pontuação do BIOGLOW." action={<div className="status-chip verified"><CheckCircle2 size={12} style={{ verticalAlign: 'middle' }} /> {list.filter((mission) => mission.scoreConfigStatus === 'verified').length} verificadas</div>} />
      <div className="toolbar"><div className="tabs"><button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')} data-testid="tab-missions-all">Todas as missões</button><button className={`tab ${tab === 'verified' ? 'active' : ''}`} onClick={() => setTab('verified')} data-testid="tab-missions-verified">Verificadas</button><button className={`tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')} data-testid="tab-missions-pending">Precisam de revisão</button></div><span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 11 }}>15 missões BIOGLOW · nenhuma outra temporada</span></div>
      {missions.isLoading ? <LoadingState /> : missions.isError ? <ErrorState retry={() => missions.refetch()} /> : <div className="mission-catalog">{shown.length ? shown.map((mission: any) => <article className="card mission-card" key={mission.id} data-testid={`card-mission-${mission.id}`}><div className="m-top"><span className="mission-code">M{String(mission.number).padStart(2, '0')} / {mission.code}</span><span className={`status-chip ${mission.scoreConfigStatus}`}>{formatStatus(mission.scoreConfigStatus)}</span></div><h3>{mission.name}</h3><p>{mission.description}</p><div className="grid" style={{ gap: 7, marginTop: 14 }}>{(mission.scoringRules || []).map((rule: any) => <div key={rule.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', fontSize: 12 }}><span>{rule.label}{rule.helper && <small style={{ display: 'block', color: 'hsl(var(--muted-foreground))', marginTop: 3 }}>{rule.helper}</small>}</span><b style={{ whiteSpace: 'nowrap', color: 'hsl(var(--primary))' }}>{rule.inputKind === 'quantity' ? `${rule.points} pts/unidade` : rule.inputKind === 'select' ? rule.options.filter((option: any) => option.points > 0).map((option: any) => `${option.label}: ${option.points}`).join(' · ') : `${rule.points} pts`}</b></div>)}</div><footer><span>{mission.maxPoints ? `Até ${mission.maxPoints} pts` : 'Pontuação por unidade'}</span><span title={mission.sourceReference}><BookOpen size={13} style={{ verticalAlign: 'middle' }} /> Fonte oficial</span></footer>{mission.warning && <div className="notice" style={{ marginTop: 12 }}><AlertTriangle size={14} />{mission.warning}</div>}</article>) : <div className="card" style={{ gridColumn: '1/-1' }}><EmptyState title="Nenhuma missão corresponde a esta visão" body="Tente outro status de configuração." /></div>}</div>}
    </div>
  );
}

function TeamPage() {
  const queryClient = useQueryClient();
  const team = useGetTeam();
  const members = useListMembers();
  const updateTeam = useUpdateTeam();
  const create = useCreateMember();
  const update = useUpdateMember();
  const remove = useDeleteMember();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [newName, setNewName] = useState('');
  const [newNick, setNewNick] = useState('');
  useEffect(() => { if (team.data) setForm(team.data); }, [team.data]);
  if (team.isLoading || members.isLoading) return <div className="content"><LoadingState /></div>;
  if (team.isError || members.isError) return <div className="content"><ErrorState retry={() => { team.refetch(); members.refetch(); }} /></div>;
  const data: any = team.data;
  const saveTeam = () => updateTeam.mutate({ data: { name: form.name, number: form.number, city: form.city, country: form.country, robotName: form.robotName } as any }, { onSuccess: (next: any) => { queryClient.setQueryData(getGetTeamQueryKey(), next); setEditing(false); } });
  const addMember = () => { if (!newName.trim()) return; create.mutate({ data: { name: newName, nickname: newNick } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() }); setNewName(''); setNewNick(''); } }); };

  return (
    <div className="content">
      <PageHeading eyebrow="BIOGLOW / identidade" title="As pessoas por trás do robô." subtitle="Mantenha a equipe alinhada, em campo e nos registros." action={<button className="button button-primary" onClick={() => setEditing((value) => !value)} data-testid="button-edit-team"><Pencil size={14} />{editing ? 'Fechar edição' : 'Editar identidade'}</button>} />
      <div className="profile-banner"><div className="profile-orb">{data?.number || 'TE'}</div><div><h2>{data?.name || 'TechEra'}</h2><p>Equipe {data?.number} · {data?.city}, {data?.country} · {data?.division}</p></div></div>
      <div className="grid two-col">
        <section className="card settings-section">{editing ? <><div className="form-grid"><div className="field"><label>Nome da equipe</label><input className="input" value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} data-testid="input-team-name" /></div><div className="field"><label>Número da equipe</label><input className="input" value={form.number || ''} onChange={(event) => setForm({ ...form, number: event.target.value })} data-testid="input-team-number" /></div><div className="field"><label>Cidade</label><input className="input" value={form.city || ''} onChange={(event) => setForm({ ...form, city: event.target.value })} data-testid="input-team-city" /></div><div className="field"><label>País</label><input className="input" value={form.country || ''} onChange={(event) => setForm({ ...form, country: event.target.value })} data-testid="input-team-country" /></div><div className="field full"><label>Nome do robô</label><input className="input" value={form.robotName || ''} onChange={(event) => setForm({ ...form, robotName: event.target.value })} data-testid="input-robot-name" /></div></div><button className="button button-primary" style={{ marginTop: 18 }} onClick={saveTeam} disabled={updateTeam.isPending} data-testid="button-save-team">{updateTeam.isPending ? 'Salvando…' : 'Salvar identidade'}</button></> : <><div className="setting-row"><div><strong>Robô</strong><p>{data?.robotName || 'Sem nome'}</p></div><b>{data?.number}</b></div><div className="setting-row"><div><strong>Temporada</strong><p>Temporada exclusiva do espaço</p></div><b>BIOGLOW 2026–2027</b></div><div className="setting-row"><div><strong>Regulamento</strong><p>Última verificação {data?.rulesUpdatedAt ? new Date(data.rulesUpdatedAt).toLocaleDateString('pt-BR') : 'não registrada'}</p></div><b>{data?.rulebookVersion || '—'}</b></div></>}</section>
        <section className="card settings-section"><div className="card-head" style={{ padding: 0, marginBottom: 14 }}><div><h2>Integrantes ativos</h2><span className="muted">Pessoas atualmente na equipe</span></div><Users size={17} color="hsl(var(--primary))" /></div><div className="member-list">{(members.data as any[]).filter((member) => member.active).map((member) => <div className="member" key={member.id}><div className="avatar">{(member.nickname || member.name).slice(0, 2).toUpperCase()}</div><div className="member-info"><strong>{member.name}</strong><span>{member.nickname ? `“${member.nickname}”` : 'Sem apelido'}</span></div><div className="member-actions"><button className="button button-ghost" style={{ padding: 7 }} onClick={() => update.mutate({ id: member.id, data: { active: false } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() }) })} data-testid={`button-archive-member-${member.id}`}><Archive size={13} /></button><button className="button button-danger" style={{ padding: 7 }} onClick={() => { if (window.confirm('Remover este integrante da equipe?')) remove.mutate({ id: member.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() }) }); }} data-testid={`button-delete-member-${member.id}`}><Trash2 size={13} /></button></div></div>)}<div className="member" style={{ alignItems: 'flex-end' }}><div style={{ flex: 1, display: 'flex', gap: 7 }}><input className="input" placeholder="Nome do integrante" value={newName} onChange={(event) => setNewName(event.target.value)} data-testid="input-new-member-name" /><input className="input" placeholder="Apelido" value={newNick} onChange={(event) => setNewNick(event.target.value)} data-testid="input-new-member-nickname" /></div><button className="button button-primary" style={{ padding: 10 }} onClick={addMember} disabled={create.isPending} data-testid="button-add-member"><Plus size={14} /></button></div></div></section>
      </div>
    </div>
  );
}

function SettingsPage() {
  const team = useGetTeam();
  return (
    <div className="content">
      <PageHeading eyebrow="BIOGLOW / configuração" title="Mantenha a fonte confiável." subtitle="A confiança na pontuação começa com um regulamento que toda a equipe pode consultar." />
      <div className="grid two-col">
        <section className="card settings-section"><div className="card-head" style={{ padding: 0, marginBottom: 20 }}><div><h2>Fonte oficial da pontuação</h2><span className="muted">Regras fixas do desafio BIOGLOW</span></div><ShieldCheck size={17} color="hsl(var(--primary))" /></div><div className="grid"><div className="setting-row" style={{ padding: '12px 0' }}><div><strong>Referência</strong><p>Vídeo oficial BIOGLOW 2026–2027</p></div><a className="link" href="https://youtube.com/watch?v=uhZZ8O1StiQ&feature=shared" target="_blank" rel="noreferrer">Abrir fonte <ArrowRight size={12} style={{ verticalAlign: 'middle' }} /></a></div><div className="notice"><BookOpen size={15} />Os pontos oficiais são calculados automaticamente pelas condições cumpridas. Eles não podem ser digitados, editados ou configurados neste espaço.</div><div className="setting-row" style={{ padding: '12px 0' }}><div><strong>Inspeção de equipamento</strong><p>Equipamento em apenas uma área de lançamento</p></div><b>20 pts</b></div><div className="setting-row" style={{ padding: '12px 0' }}><div><strong>Tokens de precisão</strong><p>6/5: 50 · 4: 35 · 3: 25 · 2: 15 · 1: 10 · 0: 0</p></div><b>Fixo</b></div></div></section>
        <section className="card settings-section"><div className="card-head" style={{ padding: 0, marginBottom: 20 }}><div><h2>Proteções do espaço de trabalho</h2><span className="muted">Para o que este app está preparado</span></div><Database size={17} color="hsl(var(--primary))" /></div><div className="setting-row"><div><strong>Temporada ativa</strong><p>Este espaço aceita apenas a temporada BIOGLOW atual.</p></div><span className="status-chip verified">BIOGLOW</span></div><div className="setting-row"><div><strong>Divisão</strong><p>A pontuação dos rounds e as leituras das missões estão configuradas para este formato.</p></div><b>Challenge</b></div><div className="setting-row"><div><strong>Registro da equipe</strong><p>As alterações de identidade são gerenciadas na página Equipe.</p></div><Link href="/team" className="link" data-testid="link-settings-team">Abrir equipe <ArrowRight size={12} style={{ verticalAlign: 'middle' }} /></Link></div></section>
      </div>
      {team.data && <div className="card" style={{ marginTop: 18, padding: 20 }}><div className="eyebrow">Identidade conectada</div><p style={{ fontSize: 12 }}><b>{(team.data as any).name}</b> · {(team.data as any).robotName} · {(team.data as any).rulebookVersion}</p></div>}
    </div>
  );
}

function Router() {
  return <ErrorBoundary><Switch><Route path="/" component={Overview} /><Route path="/rounds/new" component={NewRound} /><Route path="/rounds" component={Rounds} /><Route path="/rounds/:id" component={RoundDetail} /><Route path="/analytics" component={AnalyticsPage} /><Route path="/missions" component={MissionsPage} /><Route path="/team" component={TeamPage} /><Route path="/settings" component={SettingsPage} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><Shell><Router /></Shell></QueryClientProvider>;
}

export default App;