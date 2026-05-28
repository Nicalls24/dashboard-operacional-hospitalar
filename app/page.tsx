"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Activity, Clock3, Hospital, ShieldAlert, Bell, Download,
  Settings, Trophy, Stethoscope, Map, Menu, RefreshCw,
  Search, AlertTriangle, TrendingUp, TrendingDown, Minus,
  HeartPulse, ChevronUp, ChevronDown, X, CheckCircle2,
  FileText, Filter, BarChart2, Users, Zap
} from "lucide-react";

const SB_URL = "https://fwdvzsywudpieqlqnxkp.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3ZHZ6c3l3dWRwaWVxbHFueGtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1ODcyNzEsImV4cCI6MjA5NDE2MzI3MX0.SkyfE_HVulz_TyQldI6XpENSJAuu6xDgUEDz4vObKYQ";
const sb = createClient(SB_URL, SB_KEY);

type Registro = {
  id: number; uf: string; nm_local: string; nm_medico: string;
  ds_especialidade: string; cidade: string; qt_pacientes_aguardando: number;
  tempo_espera_min: number; tempo_atraso_min: number | null;
  status: string; atraso: string; hr_registro_espera_min: number;
  data_agenda: string; dt_registro: string;
};

function minToHM(min: number) {
  if (!min && min !== 0) return "—";
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  const sign = min < 0 ? "-" : "";
  return h > 0 ? `${sign}${h}h${m.toString().padStart(2,"0")}` : `${sign}${m}min`;
}

function statusColor(min: number) {
  if (min > 60) return "#ef4444";
  if (min > 30) return "#f97316";
  if (min > 15) return "#facc15";
  return "#22c55e";
}

function statusLabel(min: number) {
  if (min > 60) return "Crítico";
  if (min > 30) return "Grave";
  if (min > 15) return "Atenção";
  return "Normal";
}

function statusBg(min: number) {
  if (min > 60) return "bg-red-500/20 text-red-400";
  if (min > 30) return "bg-orange-500/20 text-orange-400";
  if (min > 15) return "bg-yellow-500/20 text-yellow-400";
  return "bg-green-500/20 text-green-400";
}

const NAV = [
  { id: "visao", label: "Visão Geral", icon: Activity },
  { id: "vivo", label: "Operação ao Vivo", icon: Clock3 },
  { id: "ranking", label: "Ranking", icon: Trophy },
  { id: "especialidades", label: "Especialidades", icon: Stethoscope },
  { id: "estados", label: "Estados (UF)", icon: Map },
  { id: "sla", label: "SLA & Metas", icon: ShieldAlert },
  { id: "alertas", label: "Alertas", icon: Bell },
  { id: "relatorios", label: "Relatórios", icon: Download },
  { id: "configuracoes", label: "Configurações", icon: Settings },
];

const BRAZIL_PATHS: Record<string, { path: string; label: string; cx: number; cy: number }> = {
  AM: { path: "M70 90 L180 70 L280 80 L320 110 L310 160 L280 200 L220 230 L160 240 L100 220 L60 180 Z", label: "Amazonas", cx: 170, cy: 165 },
  RR: { path: "M180 40 L240 30 L270 60 L280 80 L180 70 Z", label: "Roraima", cx: 218, cy: 55 },
  AP: { path: "M280 40 L320 35 L330 60 L310 70 L285 65 Z", label: "Amapá", cx: 308, cy: 52 },
  PA: { path: "M160 240 L220 230 L280 200 L290 240 L270 290 L230 310 L180 300 L150 270 Z", label: "Pará", cx: 208, cy: 268 },
  MA: { path: "M280 80 L370 60 L400 90 L390 130 L360 160 L320 150 L310 110 Z", label: "Maranhão", cx: 340, cy: 115 },
  PI: { path: "M360 160 L400 150 L420 170 L410 210 L380 220 L355 200 Z", label: "Piauí", cx: 388, cy: 185 },
  CE: { path: "M370 60 L430 65 L460 90 L450 130 L410 155 L390 130 L400 90 Z", label: "Ceará", cx: 418, cy: 105 },
  RN: { path: "M450 90 L480 85 L495 105 L480 130 L455 130 L450 110 Z", label: "R. Norte", cx: 473, cy: 108 },
  PB: { path: "M455 130 L480 130 L490 145 L465 160 L450 148 Z", label: "Paraíba", cx: 468, cy: 143 },
  PE: { path: "M430 65 L500 60 L530 80 L540 120 L510 155 L470 160 L450 130 L460 90 Z", label: "Pernambuco", cx: 488, cy: 108 },
  AL: { path: "M480 160 L515 158 L520 175 L495 185 L475 178 Z", label: "Alagoas", cx: 497, cy: 170 },
  SE: { path: "M490 180 L520 175 L528 195 L505 205 L488 195 Z", label: "Sergipe", cx: 507, cy: 190 },
  BA: { path: "M410 155 L450 130 L470 160 L510 155 L520 200 L490 260 L440 290 L400 270 L380 240 L400 210 Z", label: "Bahia", cx: 453, cy: 215 },
  TO: { path: "M310 160 L355 155 L360 160 L355 200 L380 220 L370 250 L330 260 L290 240 L280 200 Z", label: "Tocantins", cx: 325, cy: 205 },
  GO: { path: "M290 240 L330 260 L340 310 L310 350 L270 360 L240 340 L230 310 L270 290 Z", label: "Goiás", cx: 282, cy: 317 },
  MT: { path: "M100 220 L160 240 L150 270 L180 300 L170 340 L130 350 L90 330 L80 290 Z", label: "Mato Grosso", cx: 125, cy: 295 },
  RO: { path: "M70 230 L100 220 L80 290 L90 330 L55 325 L45 280 Z", label: "Rondônia", cx: 70, cy: 283 },
  AC: { path: "M45 280 L55 325 L35 335 L20 310 L30 280 Z", label: "Acre", cx: 36, cy: 305 },
  MG: { path: "M370 250 L400 270 L440 290 L450 340 L420 380 L380 390 L340 370 L330 330 L340 310 Z", label: "Minas Gerais", cx: 390, cy: 330 },
  MS: { path: "M230 310 L270 290 L240 340 L270 360 L260 400 L230 410 L195 390 L200 350 Z", label: "Mato G. Sul", cx: 232, cy: 360 },
  SP: { path: "M310 350 L340 370 L380 390 L390 430 L360 460 L320 450 L290 420 L290 390 Z", label: "São Paulo", cx: 337, cy: 415 },
  RJ: { path: "M450 340 L490 320 L510 355 L490 390 L460 400 L440 380 L420 380 Z", label: "Rio de Jan.", cx: 470, cy: 360 },
  ES: { path: "M445 300 L470 295 L485 320 L465 340 L445 330 Z", label: "Espírito Santo", cx: 463, cy: 317 },
  PR: { path: "M260 400 L290 390 L290 420 L320 450 L310 480 L280 490 L250 470 L235 445 Z", label: "Paraná", cx: 278, cy: 437 },
  SC: { path: "M250 470 L280 490 L295 510 L275 525 L250 520 L235 505 Z", label: "Santa Catar.", cx: 265, cy: 497 },
  RS: { path: "M235 505 L250 520 L260 545 L235 555 L205 545 L195 525 L210 505 Z", label: "Rio G. Sul", cx: 228, cy: 528 },
  DF: { path: "M318 308 L328 308 L328 318 L318 318 Z", label: "DF", cx: 323, cy: 313 },
};

export default function Dashboard() {
  const [data, setData] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");
  const [activeSection, setActiveSection] = useState("visao");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [slaThreshold, setSlaThreshold] = useState(30);
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  // Filters for main table
  const [searchQ, setSearchQ] = useState("");
  const [filterUF, setFilterUF] = useState("Todos");
  const [filterEsp, setFilterEsp] = useState("Todas");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [sortBy, setSortBy] = useState<"tempo_espera_min" | "qt_pacientes_aguardando" | "nm_local">("tempo_espera_min");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  // Vivo section
  const [vivoSearchQ, setVivoSearchQ] = useState("");
  const [vivoFilterUF, setVivoFilterUF] = useState("Todos");
  const [vivoFilterStatus, setVivoFilterStatus] = useState("Todos");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Ranking filter
  const [rankingType, setRankingType] = useState<"local" | "uf" | "especialidade">("local");

  // States section
  const [selectedUF, setSelectedUF] = useState<string | null>(null);

  // Especialidades section
  const [espSearch, setEspSearch] = useState("");

  // Alertas section
  const [alertasType, setAlertasType] = useState<"critico" | "atraso" | "falta">("critico");

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await sb
      .from("espera")
      .select("*")
      .order("tempo_espera_min", { ascending: false });
    if (rows) {
      setData(rows as Registro[]);
      setLastUpdate(new Date().toLocaleTimeString("pt-BR"));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) {
      intervalRef.current = setInterval(loadData, refreshInterval * 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, refreshInterval, loadData]);

  // Derived data
  const ufs = useMemo(() => ["Todos", ...Array.from(new Set(data.map(r => r.uf))).sort()], [data]);
  const especialidades = useMemo(() => ["Todas", ...Array.from(new Set(data.map(r => r.ds_especialidade))).sort()], [data]);

  const filtered = useMemo(() => {
    return data.filter(r => {
      const q = searchQ.toLowerCase();
      if (q && !r.nm_local.toLowerCase().includes(q) && !r.uf.toLowerCase().includes(q) && !r.ds_especialidade.toLowerCase().includes(q) && !r.nm_medico.toLowerCase().includes(q)) return false;
      if (filterUF !== "Todos" && r.uf !== filterUF) return false;
      if (filterEsp !== "Todas" && r.ds_especialidade !== filterEsp) return false;
      if (filterStatus !== "Todos") {
        const lbl = statusLabel(r.tempo_espera_min);
        if (lbl !== filterStatus) return false;
      }
      return true;
    }).sort((a, b) => {
      const val = sortDir === "desc" ? -1 : 1;
      if (sortBy === "nm_local") return val * a.nm_local.localeCompare(b.nm_local);
      return val * (a[sortBy] - b[sortBy]);
    });
  }, [data, searchQ, filterUF, filterEsp, filterStatus, sortBy, sortDir]);

  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // KPIs
  const kpis = useMemo(() => {
    const aguardando = data.reduce((s, r) => s + (r.qt_pacientes_aguardando || 0), 0);
    const tempoMedio = data.length ? Math.round(data.reduce((s, r) => s + r.tempo_espera_min, 0) / data.length) : 0;
    const maiorEspera = data.length ? Math.max(...data.map(r => r.tempo_espera_min)) : 0;
    const criticos = data.filter(r => r.tempo_espera_min > 60).length;
    const hospitaisCriticos = new Set(data.filter(r => r.tempo_espera_min > 60).map(r => r.nm_local)).size;
    return { aguardando, tempoMedio, maiorEspera, criticos, hospitaisCriticos, total: data.length };
  }, [data]);

  // Status distribution
  const distStatus = useMemo(() => {
    const c = { Crítico: 0, Grave: 0, Atenção: 0, Normal: 0 };
    data.forEach(r => { const l = statusLabel(r.tempo_espera_min) as keyof typeof c; c[l]++; });
    return [
      { name: "Crítico", value: c.Crítico, color: "#ef4444" },
      { name: "Grave", value: c.Grave, color: "#f97316" },
      { name: "Atenção", value: c.Atenção, color: "#facc15" },
      { name: "Normal", value: c.Normal, color: "#22c55e" },
    ];
  }, [data]);

  // Por hora
  const porHora = useMemo(() => {
    const map: Record<number, { count: number; total: number }> = {};
    data.forEach(r => {
      const h = Math.floor(r.hr_registro_espera_min / 60);
      if (!map[h]) map[h] = { count: 0, total: 0 };
      map[h].count++;
      map[h].total += r.tempo_espera_min;
    });
    return Object.entries(map)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([h, v]) => ({ hora: `${h}h`, media: Math.round(v.total / v.count), registros: v.count }));
  }, [data]);

  // Por especialidade top 10
  const porEsp = useMemo(() => {
    const map: Record<string, { count: number; total: number; critico: number }> = {};
    data.forEach(r => {
      if (!map[r.ds_especialidade]) map[r.ds_especialidade] = { count: 0, total: 0, critico: 0 };
      map[r.ds_especialidade].count++;
      map[r.ds_especialidade].total += r.tempo_espera_min;
      if (r.tempo_espera_min > 60) map[r.ds_especialidade].critico++;
    });
    return Object.entries(map)
      .map(([esp, v]) => ({ esp, count: v.count, media: Math.round(v.total / v.count), critico: v.critico }))
      .sort((a, b) => b.media - a.media);
  }, [data]);

  // Por UF
  const porUF = useMemo(() => {
    const map: Record<string, { count: number; total: number; critico: number; grave: number; atencao: number; normal: number; hospitais: Set<string> }> = {};
    data.forEach(r => {
      if (!map[r.uf]) map[r.uf] = { count: 0, total: 0, critico: 0, grave: 0, atencao: 0, normal: 0, hospitais: new Set() };
      const m = map[r.uf];
      m.count++;
      m.total += r.tempo_espera_min;
      m.hospitais.add(r.nm_local);
      const lbl = statusLabel(r.tempo_espera_min);
      if (lbl === "Crítico") m.critico++;
      else if (lbl === "Grave") m.grave++;
      else if (lbl === "Atenção") m.atencao++;
      else m.normal++;
    });
    return Object.entries(map).map(([uf, v]) => ({
      uf, count: v.count, media: Math.round(v.total / v.count),
      critico: v.critico, grave: v.grave, atencao: v.atencao, normal: v.normal,
      hospitais: v.hospitais.size,
      statusPrincipal: v.critico > 0 ? "Crítico" : v.grave > 0 ? "Grave" : v.atencao > 0 ? "Atenção" : "Normal",
    })).sort((a, b) => b.critico - a.critico);
  }, [data]);

  // Ranking
  const rankingData = useMemo(() => {
    if (rankingType === "local") {
      const map: Record<string, { total: number; count: number; critico: number }> = {};
      data.forEach(r => {
        if (!map[r.nm_local]) map[r.nm_local] = { total: 0, count: 0, critico: 0 };
        map[r.nm_local].total += r.tempo_espera_min;
        map[r.nm_local].count++;
        if (r.tempo_espera_min > 60) map[r.nm_local].critico++;
      });
      return Object.entries(map)
        .map(([name, v]) => ({ name, media: Math.round(v.total / v.count), critico: v.critico, count: v.count }))
        .sort((a, b) => b.media - a.media).slice(0, 20);
    } else if (rankingType === "uf") {
      return porUF.map(u => ({ name: u.uf, media: u.media, critico: u.critico, count: u.count }));
    } else {
      return porEsp.slice(0, 20).map(e => ({ name: e.esp, media: e.media, critico: e.critico, count: e.count }));
    }
  }, [rankingType, data, porUF, porEsp]);

  // Alertas
  const alertas = useMemo(() => {
    if (alertasType === "critico") return data.filter(r => r.tempo_espera_min > 60).slice(0, 50);
    if (alertasType === "atraso") return data.filter(r => r.atraso === "SIM").slice(0, 50);
    return data.filter(r => r.atraso === "FALTA").slice(0, 50);
  }, [data, alertasType]);

  // SLA
  const sla = useMemo(() => {
    const total = data.length;
    if (!total) return { dentroSLA: 0, foraSLA: 0, pct: 0, porUF: [] };
    const dentroSLA = data.filter(r => r.tempo_espera_min <= slaThreshold).length;
    const foraSLA = total - dentroSLA;
    const pct = Math.round((dentroSLA / total) * 100);
    const ufSLA = porUF.map(u => {
      const ufData = data.filter(r => r.uf === u.uf);
      const ok = ufData.filter(r => r.tempo_espera_min <= slaThreshold).length;
      return { uf: u.uf, pct: Math.round((ok / ufData.length) * 100), total: ufData.length, ok, hospitais: u.hospitais };
    }).sort((a, b) => a.pct - b.pct);
    return { dentroSLA, foraSLA, pct, porUF: ufSLA };
  }, [data, slaThreshold, porUF]);

  // Vivo filtered
  const vivoFiltered = useMemo(() => {
    return data.filter(r => {
      const q = vivoSearchQ.toLowerCase();
      if (q && !r.nm_local.toLowerCase().includes(q) && !r.uf.toLowerCase().includes(q) && !r.nm_medico.toLowerCase().includes(q)) return false;
      if (vivoFilterUF !== "Todos" && r.uf !== vivoFilterUF) return false;
      if (vivoFilterStatus !== "Todos" && statusLabel(r.tempo_espera_min) !== vivoFilterStatus) return false;
      return true;
    }).slice(0, 200);
  }, [data, vivoSearchQ, vivoFilterUF, vivoFilterStatus]);

  // Especialidades filtered
  const espFiltered = useMemo(() => {
    return porEsp.filter(e => e.esp.toLowerCase().includes(espSearch.toLowerCase()));
  }, [porEsp, espSearch]);

  function exportCSV() {
    const headers = ["UF","Unidade","Médico","Especialidade","Cidade","Aguardando","Tempo Espera (min)","Tempo Atraso (min)","Status","Atraso"];
    const rows = filtered.map(r => [r.uf, r.nm_local, r.nm_medico, r.ds_especialidade, r.cidade, r.qt_pacientes_aguardando, r.tempo_espera_min, r.tempo_atraso_min ?? "", r.status, r.atraso]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `hapvida-espera-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  function SortTh({ col, label }: { col: "tempo_espera_min" | "qt_pacientes_aguardando" | "nm_local"; label: string }) {
    return (
      <th className="text-left pb-3 pr-4 text-xs text-slate-400 font-medium whitespace-nowrap cursor-pointer select-none hover:text-white"
        onClick={() => { if (sortBy === col) setSortDir(d => d === "desc" ? "asc" : "desc"); else { setSortBy(col); setSortDir("desc"); } }}>
        <span className="flex items-center gap-1">{label}
          {sortBy === col ? (sortDir === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />) : <Minus size={12} className="opacity-30" />}
        </span>
      </th>
    );
  }

  const card = "rounded-2xl border border-white/5 bg-[#06111F]/95 p-4";
  const card2 = "rounded-2xl border border-white/5 bg-[#071220]/95 p-4";
  const inputCls = "bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500/50 placeholder-slate-500";
  const selectCls = "bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300 outline-none cursor-pointer";

  return (
    <div className="flex min-h-screen" style={{ background: "#020611", color: "#fff" }}>
      {/* Sidebar */}
      <aside style={{ width: sidebarOpen ? 210 : 60, background: "#030B18", borderRight: "1px solid rgba(255,255,255,0.05)", transition: "width 0.2s", flexShrink: 0 }}
        className="flex flex-col px-3 py-5 relative z-10">
        <div className="flex items-center gap-2 mb-8" style={{ overflow: "hidden" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shrink-0" style={{ background: "#ff6b00" }}>✳</div>
          {sidebarOpen && <div><p className="text-lg font-black leading-tight">Hapvida</p><p className="text-xs text-slate-400">Central Operacional</p></div>}
        </div>
        <nav className="space-y-1 flex-1">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id;
            const alertCount = id === "alertas" ? kpis.criticos : 0;
            return (
              <button key={id} onClick={() => setActiveSection(id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-sm"
                style={{ background: active ? "linear-gradient(to right,#2563EB,#4F46E5)" : "transparent", color: active ? "#fff" : "#94a3b8", boxShadow: active ? "0 4px 20px rgba(37,99,235,.35)" : "none" }}>
                <Icon size={16} className="shrink-0" />
                {sidebarOpen && <span className="truncate">{label}</span>}
                {sidebarOpen && alertCount > 0 && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-xs font-bold shrink-0">
                    {alertCount > 99 ? "99+" : alertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        {sidebarOpen && (
          <div className="mt-4 rounded-xl border border-white/10 p-3" style={{ background: "linear-gradient(135deg,#0F172A,#07101D)" }}>
            <div className="flex items-center gap-2 mb-2">
              <HeartPulse size={16} className="text-blue-400" />
              <p className="text-sm font-black">Hapvida</p>
            </div>
            <p className="text-slate-400 text-xs">Inteligência operacional em tempo real.</p>
            <div className="mt-3 rounded-xl border border-blue-400/20 flex items-center justify-center text-blue-400 text-xs font-semibold py-1.5" style={{ background: "linear-gradient(to right,#123B8B,#0B2B5C)" }}>
              ● LIVE DATA
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 sticky top-0 z-10" style={{ background: "#020611cc", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(o => !o)} className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5">
              <Menu size={16} />
            </button>
            <div>
              <h1 className="text-lg font-black tracking-tight">Central Operacional — Tempo de Espera Médica</h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: "0 0 8px rgba(74,222,128,.9)" }} />
                <span className="text-xs text-slate-400">Atualizado: {loading ? "carregando..." : lastUpdate}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAutoRefresh(a => !a)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-sm hover:bg-white/5"
              style={{ color: autoRefresh ? "#22c55e" : "#94a3b8" }}>
              <RefreshCw size={14} className={autoRefresh ? "animate-spin" : ""} />
              <span className="hidden sm:block">{autoRefresh ? "Auto ON" : "Auto OFF"}</span>
            </button>
            <button onClick={loadData} className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="px-3 py-2 rounded-xl border border-white/10 text-xs font-mono text-slate-400">
              {data.length.toLocaleString("pt-BR")} registros
            </div>
          </div>
        </header>

        <div className="p-4">
          {loading && !data.length && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <RefreshCw size={32} className="animate-spin text-blue-400" />
              <p className="text-slate-400">Carregando dados do Supabase...</p>
            </div>
          )}

          {/* ── VISÃO GERAL ── */}
          {activeSection === "visao" && (
            <div className="space-y-3">
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Pacientes Aguardando", value: kpis.aguardando.toLocaleString("pt-BR"), color: "#8B5CF6", icon: Hospital },
                  { label: "Em Atendimento", value: data.filter(r=>r.status==="Em Atendimento").length, color: "#3B82F6", icon: Activity },
                  { label: "Tempo Médio", value: minToHM(kpis.tempoMedio), color: "#F59E0B", icon: Clock3 },
                  { label: "Maior Espera", value: minToHM(kpis.maiorEspera), color: "#EF4444", icon: ShieldAlert },
                  { label: "Hospitais Críticos", value: kpis.hospitaisCriticos, color: "#EF4444", icon: Bell },
                  { label: "Total Registros", value: kpis.total.toLocaleString("pt-BR"), color: "#22C55E", icon: CheckCircle2 },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className={card} style={{ boxShadow: `0 16px 40px ${color}12` }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}20` }}>
                      <Icon size={18} style={{ color }} />
                    </div>
                    <p className="text-xs text-slate-400 mb-1">{label}</p>
                    <p className="text-2xl font-black">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-12 gap-3">
                {/* Mapa */}
                <div className={`${card2} col-span-12 lg:col-span-4`}>
                  <h2 className="text-base font-black mb-3">Mapa de Criticidade</h2>
                  <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "#030D1A", height: 320 }}>
                    <svg viewBox="0 0 580 580" className="w-full h-full">
                      {Object.entries(BRAZIL_PATHS).map(([uf, { path, label, cx, cy }]) => {
                        const ufData = porUF.find(u => u.uf === uf);
                        const fill = ufData ? statusColor(ufData.media) : "#1e293b";
                        return (
                          <g key={uf} style={{ cursor: "pointer" }} onClick={() => { setSelectedUF(uf); setActiveSection("estados"); }}>
                            <path d={path} fill={fill} stroke="#0a1a2e" strokeWidth={1.5} opacity={0.9} />
                            <text x={cx} y={cy - 5} fill="white" fontSize={9} fontWeight="bold" textAnchor="middle">{uf}</text>
                            {ufData && <text x={cx} y={cy + 8} fill="rgba(255,255,255,0.7)" fontSize={7} textAnchor="middle">{ufData.media}min</text>}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                  <div className="flex gap-3 mt-2 flex-wrap">
                    {[["#ef4444","Crítico (>1h)"],["#f97316","Grave (30-60m)"],["#facc15","Atenção (15-30m)"],["#22c55e","Normal (<15m)"]].map(([c,l]) => (
                      <div key={l} className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} /><span className="text-xs text-slate-300">{l}</span></div>
                    ))}
                  </div>
                </div>

                {/* Top 10 */}
                <div className={`${card2} col-span-12 lg:col-span-4`}>
                  <h2 className="text-base font-black mb-3">Top 10 Maiores Esperas</h2>
                  <div className="space-y-2">
                    {data.slice(0, 10).map((r, i) => (
                      <div key={r.id} className="flex items-center gap-2">
                        <span className="text-xs font-bold w-5 text-slate-500">{i+1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{r.nm_local}</p>
                          <p className="text-xs text-slate-500 truncate">{r.uf} · {r.ds_especialidade}</p>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-sm font-black" style={{ color: statusColor(r.tempo_espera_min) }}>{minToHM(r.tempo_espera_min)}</span>
                          <span className="text-xs text-slate-500">{r.qt_pacientes_aguardando} pac.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Distribuição */}
                <div className={`${card2} col-span-12 lg:col-span-4`}>
                  <h2 className="text-base font-black mb-3">Distribuição por Status</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={distStatus} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2}>
                        {distStatus.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [Number(v).toLocaleString("pt-BR"), ""]} contentStyle={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {distStatus.map(d => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /><span className="text-xs text-slate-300">{d.name}</span></div>
                        <div><span className="font-bold text-sm mr-1">{d.value.toLocaleString("pt-BR")}</span><span className="text-slate-500 text-xs">({data.length ? Math.round(d.value/data.length*100) : 0}%)</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Gráfico evolução + especialidade */}
              <div className="grid grid-cols-12 gap-3">
                <div className={`${card2} col-span-12 lg:col-span-8`}>
                  <h2 className="text-base font-black mb-3">Tempo Médio de Espera por Hora</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={porHora}>
                      <defs>
                        <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="hora" tick={{ fill: "#64748b", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} formatter={(v) => [`${Number(v)} min`, "Média"]} />
                      <Area type="monotone" dataKey="media" stroke="#2563EB" fill="url(#grad1)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className={`${card2} col-span-12 lg:col-span-4`}>
                  <h2 className="text-base font-black mb-3">Top Especialidades</h2>
                  <div className="space-y-2 overflow-auto" style={{ maxHeight: 220 }}>
                    {porEsp.slice(0, 10).map(e => (
                      <div key={e.esp} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate">{e.esp}</p>
                          <div className="h-1 rounded-full mt-1 overflow-hidden bg-white/5">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (e.media/Math.max(...porEsp.map(x=>x.media)))*100)}%`, background: statusColor(e.media) }} />
                          </div>
                        </div>
                        <span className="text-xs font-bold shrink-0" style={{ color: statusColor(e.media) }}>{e.media}min</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tabela */}
              <div className={card2}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-black">Hospitais em Tempo Real</h2>
                  <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs hover:bg-white/5">
                    <Download size={12} />Exportar CSV
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={searchQ} onChange={e => { setSearchQ(e.target.value); setPage(1); }} placeholder="Buscar hospital, médico..." className={inputCls + " pl-8 w-64"} />
                  </div>
                  <select value={filterUF} onChange={e => { setFilterUF(e.target.value); setPage(1); }} className={selectCls}>
                    {ufs.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <select value={filterEsp} onChange={e => { setFilterEsp(e.target.value); setPage(1); }} className={selectCls}>
                    {especialidades.map(e => <option key={e} value={e}>{e.length > 30 ? e.slice(0,28)+"…" : e}</option>)}
                  </select>
                  <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={selectCls}>
                    {["Todos","Crítico","Grave","Atenção","Normal"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {(searchQ || filterUF !== "Todos" || filterEsp !== "Todas" || filterStatus !== "Todos") && (
                    <button onClick={() => { setSearchQ(""); setFilterUF("Todos"); setFilterEsp("Todas"); setFilterStatus("Todos"); setPage(1); }} className="flex items-center gap-1 px-2 py-2 rounded-xl bg-white/5 text-xs text-slate-400 hover:bg-white/10">
                      <X size={12} />Limpar
                    </button>
                  )}
                  <span className="text-xs text-slate-500 py-2 ml-auto">{filtered.length.toLocaleString("pt-BR")} resultados</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left pb-3 pr-4 text-xs text-slate-400 font-medium">UF</th>
                        <SortTh col="nm_local" label="Unidade" />
                        <th className="text-left pb-3 pr-4 text-xs text-slate-400 font-medium">Especialidade</th>
                        <SortTh col="qt_pacientes_aguardando" label="Aguardando" />
                        <SortTh col="tempo_espera_min" label="Tempo Espera" />
                        <th className="text-left pb-3 pr-4 text-xs text-slate-400 font-medium">Atraso</th>
                        <th className="text-left pb-3 pr-4 text-xs text-slate-400 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map(r => (
                        <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="py-2 pr-4 text-xs font-bold text-slate-300">{r.uf}</td>
                          <td className="py-2 pr-4 text-xs max-w-48 truncate" title={r.nm_local}>{r.nm_local}</td>
                          <td className="py-2 pr-4 text-xs text-slate-400 max-w-36 truncate" title={r.ds_especialidade}>{r.ds_especialidade}</td>
                          <td className="py-2 pr-4 text-xs text-center">{r.qt_pacientes_aguardando}</td>
                          <td className="py-2 pr-4 text-sm font-bold" style={{ color: statusColor(r.tempo_espera_min) }}>{minToHM(r.tempo_espera_min)}</td>
                          <td className="py-2 pr-4 text-xs" style={{ color: r.atraso === "SIM" ? "#f97316" : r.atraso === "FALTA" ? "#ef4444" : "#94a3b8" }}>{r.tempo_atraso_min !== null ? minToHM(r.tempo_atraso_min) : r.atraso}</td>
                          <td className="py-2 pr-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBg(r.tempo_espera_min)}`}>{statusLabel(r.tempo_espera_min)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-3">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-xl border border-white/10 text-xs disabled:opacity-30 hover:bg-white/5">← Anterior</button>
                    <span className="text-xs text-slate-400">Pág {page} de {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-xl border border-white/10 text-xs disabled:opacity-30 hover:bg-white/5">Próxima →</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── OPERAÇÃO AO VIVO ── */}
          {activeSection === "vivo" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black">Operação ao Vivo</h2>
                  <p className="text-sm text-slate-400">Dados em tempo real · Última atualização: {lastUpdate}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAutoRefresh(a => !a)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm"
                    style={{ borderColor: autoRefresh ? "#22c55e" : "rgba(255,255,255,0.1)", color: autoRefresh ? "#22c55e" : "#94a3b8", background: autoRefresh ? "rgba(34,197,94,0.1)" : "transparent" }}>
                    <RefreshCw size={14} className={autoRefresh ? "animate-spin" : ""} />
                    {autoRefresh ? `Auto-refresh ${refreshInterval}s` : "Auto-refresh OFF"}
                  </button>
                  <button onClick={loadData} className="px-4 py-2 rounded-xl border border-white/10 text-sm hover:bg-white/5 flex items-center gap-2">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />Atualizar
                  </button>
                </div>
              </div>

              {/* Mini KPIs vivo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Críticos", value: kpis.criticos, color: "#ef4444" },
                  { label: "Graves", value: distStatus.find(d=>d.name==="Grave")?.value ?? 0, color: "#f97316" },
                  { label: "Atenção", value: distStatus.find(d=>d.name==="Atenção")?.value ?? 0, color: "#facc15" },
                  { label: "Normal", value: distStatus.find(d=>d.name==="Normal")?.value ?? 0, color: "#22c55e" },
                ].map(({ label, value, color }) => (
                  <div key={label} className={card} style={{ borderColor: `${color}30` }}>
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-3xl font-black mt-1" style={{ color }}>{value.toLocaleString("pt-BR")}</p>
                  </div>
                ))}
              </div>

              <div className={card2}>
                <div className="flex flex-wrap gap-2 mb-3">
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={vivoSearchQ} onChange={e => setVivoSearchQ(e.target.value)} placeholder="Buscar..." className={inputCls + " pl-8 w-56"} />
                  </div>
                  <select value={vivoFilterUF} onChange={e => setVivoFilterUF(e.target.value)} className={selectCls}>
                    {ufs.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <select value={vivoFilterStatus} onChange={e => setVivoFilterStatus(e.target.value)} className={selectCls}>
                    {["Todos","Crítico","Grave","Atenção","Normal"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span className="text-xs text-slate-500 py-2 ml-auto">{vivoFiltered.length} registros</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        {["UF","Unidade","Especialidade","Médico","Aguard.","Espera","Atraso","Status"].map(h => (
                          <th key={h} className="text-left pb-3 pr-4 text-xs text-slate-400 font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vivoFiltered.map(r => (
                        <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="py-2 pr-4 text-xs font-bold">{r.uf}</td>
                          <td className="py-2 pr-4 text-xs max-w-40 truncate" title={r.nm_local}>{r.nm_local}</td>
                          <td className="py-2 pr-4 text-xs text-slate-400 max-w-32 truncate">{r.ds_especialidade}</td>
                          <td className="py-2 pr-4 text-xs text-slate-400 max-w-32 truncate">{r.nm_medico}</td>
                          <td className="py-2 pr-4 text-xs text-center">{r.qt_pacientes_aguardando}</td>
                          <td className="py-2 pr-4 text-sm font-black" style={{ color: statusColor(r.tempo_espera_min) }}>{minToHM(r.tempo_espera_min)}</td>
                          <td className="py-2 pr-4 text-xs" style={{ color: r.atraso === "SIM" ? "#f97316" : r.atraso === "FALTA" ? "#ef4444" : "#64748b" }}>
                            {r.tempo_atraso_min !== null ? minToHM(r.tempo_atraso_min) : r.atraso}
                          </td>
                          <td className="py-2 pr-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusBg(r.tempo_espera_min)}`}>{statusLabel(r.tempo_espera_min)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── RANKING ── */}
          {activeSection === "ranking" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">Ranking</h2>
                <div className="flex gap-2">
                  {[["local","Hospitais"],["uf","Estados"],["especialidade","Especialidades"]].map(([k,l]) => (
                    <button key={k} onClick={() => setRankingType(k as "local"|"uf"|"especialidade")}
                      className="px-3 py-1.5 rounded-xl text-sm"
                      style={{ background: rankingType === k ? "#2563EB" : "rgba(255,255,255,0.04)", color: rankingType === k ? "#fff" : "#94a3b8" }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-12 gap-3">
                <div className={`${card2} col-span-12 lg:col-span-7`}>
                  <h3 className="text-base font-black mb-4">Top {rankingData.length} — Maior Tempo Médio de Espera</h3>
                  <div className="space-y-2.5">
                    {rankingData.map((r, i) => (
                      <div key={r.name} className="flex items-center gap-3">
                        <span className="text-sm font-black w-6 shrink-0" style={{ color: i < 3 ? ["#FFD700","#C0C0C0","#CD7F32"][i] : "#64748b" }}>#{i+1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-medium truncate">{r.name}</p>
                            <span className="text-sm font-black ml-2 shrink-0" style={{ color: statusColor(r.media) }}>{r.media}min</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(r.media/rankingData[0].media)*100}%`, background: statusColor(r.media) }} />
                          </div>
                        </div>
                        {r.critico > 0 && <span className="text-xs text-red-400 shrink-0">{r.critico} crít.</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`${card2} col-span-12 lg:col-span-5`}>
                  <h3 className="text-base font-black mb-3">Distribuição</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={rankingData.slice(0,10)} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} width={100} tickFormatter={v => v.length > 15 ? v.slice(0,13)+"…" : v} />
                      <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} formatter={(v) => [`${Number(v)} min`, "Tempo Médio"]} />
                      <Bar dataKey="media" radius={[0,4,4,0]}>
                        {rankingData.slice(0,10).map((r) => <Cell key={r.name} fill={statusColor(r.media)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ── ESPECIALIDADES ── */}
          {activeSection === "especialidades" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">Especialidades</h2>
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={espSearch} onChange={e => setEspSearch(e.target.value)} placeholder="Filtrar especialidade..." className={inputCls + " pl-8 w-64"} />
                </div>
              </div>
              <div className="grid grid-cols-12 gap-3">
                <div className={`${card2} col-span-12 lg:col-span-8`}>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={espFiltered.slice(0,15)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="esp" tick={{ fill: "#64748b", fontSize: 9 }} tickFormatter={v => v.slice(0,12)} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} formatter={(v) => [`${Number(v)} min`, "Tempo Médio"]} />
                      <Bar dataKey="media" radius={[4,4,0,0]}>
                        {espFiltered.slice(0,15).map(e => <Cell key={e.esp} fill={statusColor(e.media)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className={`${card2} col-span-12 lg:col-span-4`}>
                  <h3 className="text-sm font-black mb-3 text-slate-400 uppercase tracking-wider">Todas ({espFiltered.length})</h3>
                  <div className="space-y-2 overflow-auto" style={{ maxHeight: 340 }}>
                    {espFiltered.map(e => (
                      <div key={e.esp} className="p-2.5 rounded-xl border border-white/5 hover:border-white/10">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium leading-tight">{e.esp}</p>
                          <span className="text-sm font-black shrink-0" style={{ color: statusColor(e.media) }}>{e.media}min</span>
                        </div>
                        <div className="flex gap-3 mt-1.5 text-xs text-slate-500">
                          <span>{e.count.toLocaleString("pt-BR")} registros</span>
                          {e.critico > 0 && <span className="text-red-400">{e.critico} críticos</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ESTADOS ── */}
          {activeSection === "estados" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">Estados (UF)</h2>
                {selectedUF && (
                  <button onClick={() => setSelectedUF(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-sm hover:bg-white/5">
                    <X size={12} /> Limpar seleção ({selectedUF})
                  </button>
                )}
              </div>
              <div className="grid grid-cols-12 gap-3">
                <div className={`${card2} col-span-12 lg:col-span-5`}>
                  <h3 className="text-sm font-black mb-3">Mapa — clique para filtrar</h3>
                  <svg viewBox="0 0 580 580" className="w-full" style={{ maxHeight: 380 }}>
                    {Object.entries(BRAZIL_PATHS).map(([uf, { path, cx, cy }]) => {
                      const ufData = porUF.find(u => u.uf === uf);
                      const fill = ufData ? statusColor(ufData.media) : "#1e293b";
                      const sel = selectedUF === uf;
                      return (
                        <g key={uf} style={{ cursor: "pointer" }} onClick={() => setSelectedUF(selectedUF === uf ? null : uf)}>
                          <path d={path} fill={fill} stroke={sel ? "#fff" : "#0a1a2e"} strokeWidth={sel ? 2.5 : 1.5} opacity={selectedUF && !sel ? 0.4 : 0.9} />
                          <text x={cx} y={cy} fill="white" fontSize={9} fontWeight="bold" textAnchor="middle" dominantBaseline="middle">{uf}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <div className={`${card2} col-span-12 lg:col-span-7`}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/5">
                          {["UF","Hospitais","Registros","Tempo Médio","Crítico","Grave","Normal","Status"].map(h => (
                            <th key={h} className="text-left pb-3 pr-3 text-xs text-slate-400 font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedUF ? porUF.filter(u => u.uf === selectedUF) : porUF).map(u => (
                          <tr key={u.uf} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer" onClick={() => setSelectedUF(selectedUF === u.uf ? null : u.uf)}>
                            <td className="py-2 pr-3 text-sm font-black">{u.uf}</td>
                            <td className="py-2 pr-3 text-xs text-slate-400">{u.hospitais}</td>
                            <td className="py-2 pr-3 text-xs">{u.count.toLocaleString("pt-BR")}</td>
                            <td className="py-2 pr-3 text-sm font-bold" style={{ color: statusColor(u.media) }}>{u.media}min</td>
                            <td className="py-2 pr-3 text-xs text-red-400 font-bold">{u.critico}</td>
                            <td className="py-2 pr-3 text-xs text-orange-400">{u.grave}</td>
                            <td className="py-2 pr-3 text-xs text-green-400">{u.normal}</td>
                            <td className="py-2 pr-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${statusBg(u.media)}`}>{statusLabel(u.media)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {selectedUF && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <h3 className="text-sm font-black mb-2">Hospitais em {selectedUF}</h3>
                      <div className="space-y-1.5 overflow-auto" style={{ maxHeight: 200 }}>
                        {data.filter(r => r.uf === selectedUF).sort((a,b) => b.tempo_espera_min - a.tempo_espera_min).slice(0,30).map(r => (
                          <div key={r.id} className="flex items-center justify-between gap-2 py-1">
                            <div className="min-w-0">
                              <p className="text-xs truncate">{r.nm_local}</p>
                              <p className="text-xs text-slate-500 truncate">{r.ds_especialidade}</p>
                            </div>
                            <span className="text-sm font-bold shrink-0" style={{ color: statusColor(r.tempo_espera_min) }}>{minToHM(r.tempo_espera_min)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── SLA & METAS ── */}
          {activeSection === "sla" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">SLA & Metas</h2>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">Meta SLA:</span>
                  {[15,30,45,60].map(v => (
                    <button key={v} onClick={() => setSlaThreshold(v)}
                      className="px-3 py-1.5 rounded-xl text-sm"
                      style={{ background: slaThreshold === v ? "#2563EB" : "rgba(255,255,255,0.04)", color: slaThreshold === v ? "#fff" : "#94a3b8" }}>
                      {v}min
                    </button>
                  ))}
                </div>
              </div>

              {/* SLA cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className={`${card} col-span-1`} style={{ boxShadow: "0 16px 40px rgba(37,99,235,.12)" }}>
                  <p className="text-sm text-slate-400 mb-2">Dentro do SLA (≤{slaThreshold}min)</p>
                  <div className="flex items-end gap-2">
                    <p className="text-4xl font-black text-green-400">{sla.pct}%</p>
                    <p className="text-sm text-slate-400 mb-1">{sla.dentroSLA.toLocaleString("pt-BR")} registros</p>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 mt-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${sla.pct}%`, background: sla.pct >= 70 ? "#22c55e" : sla.pct >= 50 ? "#facc15" : "#ef4444" }} />
                  </div>
                </div>
                <div className={card}>
                  <p className="text-sm text-slate-400 mb-2">Fora do SLA (&gt;{slaThreshold}min)</p>
                  <div className="flex items-end gap-2">
                    <p className="text-4xl font-black text-red-400">{100-sla.pct}%</p>
                    <p className="text-sm text-slate-400 mb-1">{sla.foraSLA.toLocaleString("pt-BR")} registros</p>
                  </div>
                </div>
                <div className={card}>
                  <p className="text-sm text-slate-400 mb-2">Estados acima da meta</p>
                  <p className="text-4xl font-black text-orange-400">{sla.porUF.filter(u => u.pct < 70).length}</p>
                  <p className="text-sm text-slate-400">{sla.porUF.filter(u => u.pct < 70).map(u => u.uf).slice(0,5).join(", ")}</p>
                </div>
              </div>

              <div className={card2}>
                <h3 className="text-base font-black mb-3">SLA por Estado</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        {["UF","Hospitais","Registros","Dentro SLA","Fora SLA","% SLA","Semáforo"].map(h => (
                          <th key={h} className="text-left pb-3 pr-4 text-xs text-slate-400 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sla.porUF.map(u => (
                        <tr key={u.uf} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="py-2 pr-4 text-sm font-black">{u.uf}</td>
                          <td className="py-2 pr-4 text-xs text-slate-400">{u.hospitais}</td>
                          <td className="py-2 pr-4 text-xs">{u.total.toLocaleString("pt-BR")}</td>
                          <td className="py-2 pr-4 text-xs text-green-400 font-bold">{u.ok.toLocaleString("pt-BR")}</td>
                          <td className="py-2 pr-4 text-xs text-red-400 font-bold">{(u.total - u.ok).toLocaleString("pt-BR")}</td>
                          <td className="py-2 pr-4 text-sm font-black" style={{ color: u.pct >= 70 ? "#22c55e" : u.pct >= 50 ? "#facc15" : "#ef4444" }}>{u.pct}%</td>
                          <td className="py-2 pr-4">
                            <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${u.pct}%`, background: u.pct >= 70 ? "#22c55e" : u.pct >= 50 ? "#facc15" : "#ef4444" }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── ALERTAS ── */}
          {activeSection === "alertas" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black">Alertas</h2>
                  <p className="text-sm text-slate-400">{kpis.criticos} registros críticos · {data.filter(r=>r.atraso==="SIM").length} com atraso · {data.filter(r=>r.atraso==="FALTA").length} com falta</p>
                </div>
              </div>
              <div className="flex gap-2">
                {[["critico","🔴 Críticos (>1h)"],["atraso","🟠 Com Atraso"],["falta","⚫ Falta Médica"]].map(([k,l]) => (
                  <button key={k} onClick={() => setAlertasType(k as "critico"|"atraso"|"falta")}
                    className="px-4 py-2 rounded-xl text-sm"
                    style={{ background: alertasType === k ? "#2563EB" : "rgba(255,255,255,0.04)", color: alertasType === k ? "#fff" : "#94a3b8" }}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {alertas.map(r => (
                  <div key={r.id} className="rounded-xl border p-3 hover:border-white/10 transition-colors" style={{ background: "#06111F", borderColor: `${statusColor(r.tempo_espera_min)}30` }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate">{r.nm_local}</p>
                        <p className="text-xs text-slate-400">{r.uf} · {r.cidade}</p>
                      </div>
                      <span className="text-xl font-black ml-2 shrink-0" style={{ color: statusColor(r.tempo_espera_min) }}>{minToHM(r.tempo_espera_min)}</span>
                    </div>
                    <p className="text-xs text-slate-300 mb-1 truncate">{r.ds_especialidade}</p>
                    <p className="text-xs text-slate-500 truncate">{r.nm_medico}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                      <span className="text-xs text-slate-400">{r.qt_pacientes_aguardando} pac. aguardando</span>
                      {r.tempo_atraso_min !== null && <span className="text-xs" style={{ color: r.tempo_atraso_min < 0 ? "#f97316" : "#94a3b8" }}>Atraso: {minToHM(r.tempo_atraso_min)}</span>}
                    </div>
                    {r.status && r.status !== "OK" && <p className="text-xs mt-1 text-orange-400">{r.status}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── RELATÓRIOS ── */}
          {activeSection === "relatorios" && (
            <div className="space-y-3">
              <h2 className="text-xl font-black">Relatórios</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { title: "Todos os Registros", desc: "Export completo da tabela espera com todos os campos", action: exportCSV, icon: FileText, color: "#2563EB" },
                  { title: "Registros Críticos", desc: "Apenas registros com tempo de espera > 60 minutos", action: () => { const prev = searchQ; setSearchQ(""); setFilterStatus("Crítico"); setTimeout(() => { exportCSV(); setFilterStatus("Todos"); setSearchQ(prev); }, 100); }, icon: AlertTriangle, color: "#ef4444" },
                  { title: "Por Estado (UF)", desc: "Resumo agregado por UF com médias e contagens", action: () => {
                    const rows = porUF.map(u => `"${u.uf}","${u.hospitais}","${u.count}","${u.media}","${u.critico}","${u.grave}","${u.atencao}","${u.normal}"`);
                    const csv = `"UF","Hospitais","Registros","Tempo Médio (min)","Crítico","Grave","Atenção","Normal"\n${rows.join("\n")}`;
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = `hapvida-por-uf.csv`; a.click(); URL.revokeObjectURL(url);
                  }, icon: Map, color: "#22c55e" },
                  { title: "Por Especialidade", desc: "Resumo de tempo médio e críticos por especialidade", action: () => {
                    const rows = porEsp.map(e => `"${e.esp}","${e.count}","${e.media}","${e.critico}"`);
                    const csv = `"Especialidade","Registros","Tempo Médio (min)","Críticos"\n${rows.join("\n")}`;
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = `hapvida-especialidades.csv`; a.click(); URL.revokeObjectURL(url);
                  }, icon: Stethoscope, color: "#8B5CF6" },
                  { title: "Evolução por Hora", desc: "Tempo médio de espera agrupado por hora do dia", action: () => {
                    const rows = porHora.map(h => `"${h.hora}","${h.media}","${h.registros}"`);
                    const csv = `"Hora","Tempo Médio (min)","Registros"\n${rows.join("\n")}`;
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = `hapvida-por-hora.csv`; a.click(); URL.revokeObjectURL(url);
                  }, icon: BarChart2, color: "#F59E0B" },
                  { title: "SLA por UF", desc: `Porcentagem de registros dentro da meta de ${slaThreshold}min por estado`, action: () => {
                    const rows = sla.porUF.map(u => `"${u.uf}","${u.total}","${u.ok}","${u.total-u.ok}","${u.pct}%"`);
                    const csv = `"UF","Total","Dentro SLA","Fora SLA","% SLA"\n${rows.join("\n")}`;
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = `hapvida-sla.csv`; a.click(); URL.revokeObjectURL(url);
                  }, icon: TrendingUp, color: "#22c55e" },
                ].map(({ title, desc, action, icon: Icon, color }) => (
                  <button key={title} onClick={action}
                    className="text-left rounded-2xl border border-white/5 p-5 hover:border-white/10 hover:bg-white/[0.02] transition-all group"
                    style={{ background: "#06111F" }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}20` }}>
                      <Icon size={20} style={{ color }} />
                    </div>
                    <p className="text-base font-black mb-1">{title}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                    <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color }}>
                      <Download size={12} />
                      <span>Baixar CSV</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── CONFIGURAÇÕES ── */}
          {activeSection === "configuracoes" && (
            <div className="space-y-3 max-w-2xl">
              <h2 className="text-xl font-black">Configurações</h2>
              {[
                {
                  title: "Atualização Automática",
                  desc: "Controla o intervalo de refresh automático dos dados",
                  content: (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Auto-refresh</span>
                        <button onClick={() => setAutoRefresh(a => !a)}
                          className="relative w-12 h-6 rounded-full transition-colors"
                          style={{ background: autoRefresh ? "#2563EB" : "rgba(255,255,255,0.1)" }}>
                          <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: autoRefresh ? "calc(100% - 20px)" : 4 }} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400 w-40">Intervalo (segundos)</span>
                        <div className="flex gap-1.5">
                          {[30,60,120,300].map(v => (
                            <button key={v} onClick={() => setRefreshInterval(v)}
                              className="px-3 py-1.5 rounded-xl text-xs"
                              style={{ background: refreshInterval === v ? "#2563EB" : "rgba(255,255,255,0.05)", color: refreshInterval === v ? "#fff" : "#94a3b8" }}>
                              {v}s
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  title: "Meta de SLA",
                  desc: "Define o limiar de tempo de espera para cálculo do SLA",
                  content: (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400 w-40">Threshold (minutos)</span>
                      <div className="flex gap-1.5">
                        {[15,20,30,45,60].map(v => (
                          <button key={v} onClick={() => setSlaThreshold(v)}
                            className="px-3 py-1.5 rounded-xl text-xs"
                            style={{ background: slaThreshold === v ? "#2563EB" : "rgba(255,255,255,0.05)", color: slaThreshold === v ? "#fff" : "#94a3b8" }}>
                            {v}min
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                },
                {
                  title: "Notificações",
                  desc: "Controla se o badge de alertas é exibido no menu",
                  content: (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Badge de alertas no menu</span>
                      <button onClick={() => setAlertsEnabled(a => !a)}
                        className="relative w-12 h-6 rounded-full transition-colors"
                        style={{ background: alertsEnabled ? "#2563EB" : "rgba(255,255,255,0.1)" }}>
                        <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: alertsEnabled ? "calc(100% - 20px)" : 4 }} />
                      </button>
                    </div>
                  )
                },
                {
                  title: "Informações do Sistema",
                  desc: "Detalhes da fonte de dados e status da conexão",
                  content: (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-400">Fonte de dados</span><span>Supabase · espera</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Registros carregados</span><span>{data.length.toLocaleString("pt-BR")}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Última atualização</span><span>{lastUpdate || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Status da conexão</span><span className="text-green-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Online</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Estados com dados</span><span>{porUF.length} UFs</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Especialidades</span><span>{porEsp.length}</span></div>
                    </div>
                  )
                },
              ].map(({ title, desc, content }) => (
                <div key={title} className={card2}>
                  <h3 className="text-base font-black mb-1">{title}</h3>
                  <p className="text-xs text-slate-400 mb-4">{desc}</p>
                  {content}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
