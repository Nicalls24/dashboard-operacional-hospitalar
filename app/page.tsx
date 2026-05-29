"use client";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Activity, Clock3, Hospital, ShieldAlert, Bell, Download,
  Settings, Trophy, Stethoscope, Map, Menu, RefreshCw,
  Search, AlertTriangle, TrendingUp, HeartPulse, ChevronDown,
  CheckCircle2, FileText, BarChart2, Users, Moon, Filter,
} from "lucide-react";

const SB_URL = "https://fwdvzsywudpieqlqnxkp.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3ZHZ6c3l3dWRwaWVxbHFueGtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1ODcyNzEsImV4cCI6MjA5NDE2MzI3MX0.SkyfE_HVulz_TyQldI6XpENSJAuu6xDgUEDz4vObKYQ";
const sb = createClient(SB_URL, SB_KEY);

const SLA_MIN = 15;
const SLA_META = 75;

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
  return h > 0 ? `${h}:${m.toString().padStart(2,"0")}` : `0:${m.toString().padStart(2,"0")}`;
}
function statusColor(min: number) {
  if (min > 60) return "#ef4444";
  if (min > 30) return "#fb923c";
  if (min > 15) return "#facc15";
  return "#22c55e";
}
function statusLabel(min: number) {
  if (min > 60) return "Crítico";
  if (min > 30) return "Grave";
  if (min > 15) return "Atenção";
  return "Normal";
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

const BRAZIL_PATHS: Record<string, { path: string; cx: number; cy: number }> = {
  AM: { path: "M70 90 L180 70 L280 80 L320 110 L310 160 L280 200 L220 230 L160 240 L100 220 L60 180 Z", cx: 170, cy: 165 },
  RR: { path: "M180 40 L240 30 L270 60 L280 80 L180 70 Z", cx: 218, cy: 55 },
  AP: { path: "M280 40 L320 35 L330 60 L310 70 L285 65 Z", cx: 308, cy: 52 },
  PA: { path: "M160 240 L220 230 L280 200 L290 240 L270 290 L230 310 L180 300 L150 270 Z", cx: 208, cy: 268 },
  MA: { path: "M280 80 L370 60 L400 90 L390 130 L360 160 L320 150 L310 110 Z", cx: 340, cy: 115 },
  PI: { path: "M360 160 L400 150 L420 170 L410 210 L380 220 L355 200 Z", cx: 388, cy: 185 },
  CE: { path: "M370 60 L430 65 L460 90 L450 130 L410 155 L390 130 L400 90 Z", cx: 418, cy: 105 },
  RN: { path: "M450 90 L480 85 L495 105 L480 130 L455 130 L450 110 Z", cx: 473, cy: 108 },
  PB: { path: "M455 130 L480 130 L490 145 L465 160 L450 148 Z", cx: 468, cy: 143 },
  PE: { path: "M430 65 L500 60 L530 80 L540 120 L510 155 L470 160 L450 130 L460 90 Z", cx: 488, cy: 108 },
  AL: { path: "M480 160 L515 158 L520 175 L495 185 L475 178 Z", cx: 497, cy: 170 },
  SE: { path: "M490 180 L520 175 L528 195 L505 205 L488 195 Z", cx: 507, cy: 190 },
  BA: { path: "M410 155 L450 130 L470 160 L510 155 L520 200 L490 260 L440 290 L400 270 L380 240 L400 210 Z", cx: 453, cy: 215 },
  TO: { path: "M310 160 L355 155 L360 160 L355 200 L380 220 L370 250 L330 260 L290 240 L280 200 Z", cx: 325, cy: 205 },
  GO: { path: "M290 240 L330 260 L340 310 L310 350 L270 360 L240 340 L230 310 L270 290 Z", cx: 282, cy: 317 },
  MT: { path: "M100 220 L160 240 L150 270 L180 300 L170 340 L130 350 L90 330 L80 290 Z", cx: 125, cy: 295 },
  RO: { path: "M70 230 L100 220 L80 290 L90 330 L55 325 L45 280 Z", cx: 70, cy: 283 },
  AC: { path: "M45 280 L55 325 L35 335 L20 310 L30 280 Z", cx: 36, cy: 305 },
  MG: { path: "M370 250 L400 270 L440 290 L450 340 L420 380 L380 390 L340 370 L330 330 L340 310 Z", cx: 390, cy: 330 },
  MS: { path: "M230 310 L270 290 L240 340 L270 360 L260 400 L230 410 L195 390 L200 350 Z", cx: 232, cy: 360 },
  SP: { path: "M310 350 L340 370 L380 390 L390 430 L360 460 L320 450 L290 420 L290 390 Z", cx: 337, cy: 415 },
  RJ: { path: "M450 340 L490 320 L510 355 L490 390 L460 400 L440 380 L420 380 Z", cx: 470, cy: 360 },
  ES: { path: "M445 300 L470 295 L485 320 L465 340 L445 330 Z", cx: 463, cy: 317 },
  PR: { path: "M260 400 L290 390 L290 420 L320 450 L310 480 L280 490 L250 470 L235 445 Z", cx: 278, cy: 437 },
  SC: { path: "M250 470 L280 490 L295 510 L275 525 L250 520 L235 505 Z", cx: 265, cy: 497 },
  RS: { path: "M235 505 L250 520 L260 545 L235 555 L205 545 L195 525 L210 505 Z", cx: 228, cy: 528 },
  DF: { path: "M318 308 L328 308 L328 318 L318 318 Z", cx: 323, cy: 313 },
};

export default function Dashboard() {
  const [data, setData] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");
  const [active, setActive] = useState("visao");
  const [chartType, setChartType] = useState<"linha"|"area"|"barras">("linha");
  const [searchQ, setSearchQ] = useState("");
  const [filterUF, setFilterUF] = useState("Todas UF");
  const [filterEsp, setFilterEsp] = useState("Todas Especialidades");
  const [rankingType, setRankingType] = useState<"local"|"uf"|"esp">("local");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshSec, setRefreshSec] = useState(60);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await sb.from("espera").select("*").order("tempo_espera_min", { ascending: false });
    if (rows) { setData(rows as Registro[]); setLastUpdate(new Date().toLocaleTimeString("pt-BR")); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) intervalRef.current = setInterval(loadData, refreshSec * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, refreshSec, loadData]);

  // --- KPIs ---
  const total = data.length;
  const aguardando = useMemo(() => data.reduce((s,r) => s + (r.qt_pacientes_aguardando||0), 0), [data]);
  const emAtend = useMemo(() => data.filter(r => r.status === "Em Atendimento").length, [data]);
  const tempoMedio = useMemo(() => total ? Math.round(data.reduce((s,r)=>s+r.tempo_espera_min,0)/total) : 0, [data, total]);
  const maiorEspera = useMemo(() => total ? Math.max(...data.map(r=>r.tempo_espera_min)) : 0, [data, total]);
  const hospCriticos = useMemo(() => new Set(data.filter(r=>r.tempo_espera_min>60).map(r=>r.nm_local)).size, [data]);
  const slaPct = useMemo(() => total ? Math.round((data.filter(r=>r.tempo_espera_min<=SLA_MIN).length/total)*100) : 0, [data, total]);

  // --- Derived ---
  const ufs = useMemo(() => ["Todas UF", ...Array.from(new Set(data.map(r=>r.uf))).sort()], [data]);
  const esps = useMemo(() => ["Todas Especialidades", ...Array.from(new Set(data.map(r=>r.ds_especialidade))).sort()], [data]);

  const porHora = useMemo(() => {
    const m: Record<number,{total:number;ok:number;soma:number}> = {};
    data.forEach(r => {
      const h = Math.floor(r.hr_registro_espera_min/60);
      if(!m[h]) m[h]={total:0,ok:0,soma:0};
      m[h].total++; m[h].soma+=r.tempo_espera_min;
      if(r.tempo_espera_min<=SLA_MIN) m[h].ok++;
    });
    return Object.entries(m).sort(([a],[b])=>Number(a)-Number(b)).map(([h,v])=>({
      hora:`${h}h`, media:Math.round(v.soma/v.total), sla:Math.round((v.ok/v.total)*100), meta:SLA_META
    }));
  }, [data]);

  const porEsp = useMemo(() => {
    const m: Record<string,{count:number;soma:number;ok:number}> = {};
    data.forEach(r => {
      if(!m[r.ds_especialidade]) m[r.ds_especialidade]={count:0,soma:0,ok:0};
      m[r.ds_especialidade].count++; m[r.ds_especialidade].soma+=r.tempo_espera_min;
      if(r.tempo_espera_min<=SLA_MIN) m[r.ds_especialidade].ok++;
    });
    return Object.entries(m).map(([esp,v])=>({esp,count:v.count,media:Math.round(v.soma/v.count),ok:v.ok,sla:Math.round((v.ok/v.count)*100)}))
      .sort((a,b)=>b.media-a.media);
  }, [data]);

  const porUF = useMemo(() => {
    const m: Record<string,{count:number;soma:number;ok:number;hosp:Set<string>}> = {};
    data.forEach(r => {
      if(!m[r.uf]) m[r.uf]={count:0,soma:0,ok:0,hosp:new Set()};
      m[r.uf].count++; m[r.uf].soma+=r.tempo_espera_min; m[r.uf].hosp.add(r.nm_local);
      if(r.tempo_espera_min<=SLA_MIN) m[r.uf].ok++;
    });
    return Object.entries(m).map(([uf,v])=>({uf,count:v.count,media:Math.round(v.soma/v.count),ok:v.ok,sla:Math.round((v.ok/v.count)*100),hosp:v.hosp.size}))
      .sort((a,b)=>b.count-a.count);
  }, [data]);

  // Table aggregated by hospital
  const tableData = useMemo(() => {
    const m: Record<string,{uf:string;nm_local:string;ds_especialidade:string;aguardando:number;atendendo:number;maxEspera:number;somaEspera:number;count:number}> = {};
    data.forEach(r => {
      const k = `${r.nm_local}|||${r.ds_especialidade}`;
      if(!m[k]) m[k]={uf:r.uf,nm_local:r.nm_local,ds_especialidade:r.ds_especialidade,aguardando:0,atendendo:0,maxEspera:0,somaEspera:0,count:0};
      m[k].aguardando+=r.qt_pacientes_aguardando||0;
      if(r.status==="Em Atendimento") m[k].atendendo++;
      m[k].maxEspera=Math.max(m[k].maxEspera,r.tempo_espera_min);
      m[k].somaEspera+=r.tempo_espera_min; m[k].count++;
    });
    return Object.values(m).sort((a,b)=>b.maxEspera-a.maxEspera);
  }, [data]);

  const filteredTable = useMemo(() => tableData.filter(r => {
    const q = searchQ.toLowerCase();
    if(q && !r.nm_local.toLowerCase().includes(q) && !r.ds_especialidade.toLowerCase().includes(q)) return false;
    if(filterUF!=="Todas UF" && r.uf!==filterUF) return false;
    if(filterEsp!=="Todas Especialidades" && r.ds_especialidade!==filterEsp) return false;
    return true;
  }), [tableData, searchQ, filterUF, filterEsp]);

  const dist = useMemo(() => {
    const b = [0,0,0,0,0,0];
    data.forEach(r => {
      if(r.tempo_espera_min>90) b[0]++;
      else if(r.tempo_espera_min>60) b[1]++;
      else if(r.tempo_espera_min>45) b[2]++;
      else if(r.tempo_espera_min>30) b[3]++;
      else if(r.tempo_espera_min>15) b[4]++;
      else b[5]++;
    });
    return [
      {l:"> 1h30",v:b[0],c:"#ef4444"},
      {l:"1h-1h30",v:b[1],c:"#fb923c"},
      {l:"45m-1h",v:b[2],c:"#facc15"},
      {l:"30m-45m",v:b[3],c:"#3b82f6"},
      {l:"15m-30m",v:b[4],c:"#06b6d4"},
      {l:"< 15m",v:b[5],c:"#22c55e"},
    ];
  }, [data]);

  // SLA analytics
  const slaOk = useMemo(() => data.filter(r=>r.tempo_espera_min<=SLA_MIN).length, [data]);
  const slaFora = total - slaOk;
  const hospOk = useMemo(() => new Set(data.filter(r=>r.tempo_espera_min<=SLA_MIN).map(r=>r.nm_local)).size, [data]);
  const hospFora = useMemo(() => new Set(data.filter(r=>r.tempo_espera_min>SLA_MIN).map(r=>r.nm_local)).size, [data]);
  const ufSLA = useMemo(() => porUF.map(u=>({...u,pct:u.sla})).sort((a,b)=>b.sla-a.sla), [porUF]);
  const melhorUF = ufSLA[0];
  const piorUF = ufSLA[ufSLA.length-1];

  const alertas = useMemo(() => data.filter(r=>r.tempo_espera_min>60).slice(0,60), [data]);

  const rankData = useMemo(() => {
    if(rankingType==="local") return tableData.slice(0,20).map(r=>({name:r.nm_local,media:Math.round(r.somaEspera/r.count),max:r.maxEspera}));
    if(rankingType==="uf") return porUF.map(u=>({name:u.uf,media:u.media,max:u.media}));
    return porEsp.slice(0,20).map(e=>({name:e.esp,media:e.media,max:e.media}));
  }, [rankingType, tableData, porUF, porEsp]);

  const espSLA = useMemo(() => porEsp.map(e=>({...e,pct:e.sla})).sort((a,b)=>b.sla-a.sla), [porEsp]);

  // ─────────────────────────────────────────────────
  const kpiCards = [
    { label:"Pacientes Aguardando", value: aguardando.toLocaleString("pt-BR"), color:"#8B5CF6", icon: Hospital, trend:"▲ dados reais", sub:"Supabase" },
    { label:"Em Atendimento", value: emAtend.toLocaleString("pt-BR"), color:"#3B82F6", icon: Activity, trend:"", sub:"" },
    { label:"Tempo Médio", value: minToHM(tempoMedio), color:"#F59E0B", icon: Clock3, trend:"SLA: 15min", sub:"" },
    { label:"Maior Espera", value: minToHM(maiorEspera), color:"#EF4444", icon: ShieldAlert, trend:"", sub:"" },
    { label:"Hospitais Críticos", value: hospCriticos.toString(), color:"#EF4444", icon: Bell, trend:"", sub:"" },
    { label:"SLA Emergência", value: `${slaPct}%`, color: slaPct>=SLA_META ? "#22C55E" : "#EF4444", icon: ShieldAlert, trend: slaPct>=SLA_META ? "✓ Meta 75% atingida" : "✗ Abaixo de 75%", sub:"meta: 75% em ≤15min" },
  ];

  return (
    <main className="min-h-screen text-white flex overflow-hidden" style={{background:"#020611"}}>
      {/* BG glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute rounded-full" style={{top:-300,left:"15%",width:900,height:900,background:"rgba(37,99,235,0.08)",filter:"blur(200px)"}}/>
        <div className="absolute rounded-full" style={{bottom:-200,right:-100,width:700,height:700,background:"rgba(6,182,212,0.08)",filter:"blur(180px)"}}/>
      </div>

      {/* Sidebar */}
      <aside className="w-[210px] shrink-0 flex flex-col px-4 py-5 relative z-10" style={{background:"rgba(3,11,24,0.95)",borderRight:"1px solid rgba(255,255,255,0.05)"}}>
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black" style={{background:"#ff6b00"}}>✳</div>
          <div><h1 className="text-[18px] font-black leading-tight">Hapvida</h1><p className="text-[11px] text-slate-400">Central Operacional</p></div>
        </div>
        <nav className="space-y-1">
          {NAV.map(({id,label,icon:Icon}) => {
            const isActive = active===id;
            const badge = id==="alertas" ? alertas.length : 0;
            return (
              <button key={id} onClick={()=>setActive(id)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
                style={{background:isActive?"linear-gradient(to right,#2563EB,#4F46E5)":"transparent",boxShadow:isActive?"0 4px 20px rgba(37,99,235,.35)":"none",color:isActive?"#fff":"#cbd5e1"}}>
                <div className="flex items-center gap-2.5">
                  <Icon size={16}/>
                  <span className="text-[14px]">{label}</span>
                </div>
                {badge>0 && <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold">{badge>99?"99+":badge}</div>}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto rounded-[20px] border border-white/[0.06] p-4 relative overflow-hidden" style={{background:"linear-gradient(135deg,#0F172A,#07101D)"}}>
          <div className="absolute inset-0" style={{background:"radial-gradient(circle at top left,rgba(37,99,235,.2),transparent 50%)"}}/>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3"><HeartPulse size={18} className="text-blue-400"/>
              <div><p className="text-[15px] font-black">Hapvida</p><p className="text-[11px] text-slate-400">Data Lakehouse</p></div>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">Inteligência operacional em tempo real.</p>
            <div className="mt-4 h-9 rounded-xl border border-blue-400/20 flex items-center justify-center text-blue-400 text-[12px] font-semibold tracking-widest" style={{background:"linear-gradient(to right,#123B8B,#0B2B5C)"}}>● LIVE DATA</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <section className="flex-1 px-4 py-4 overflow-auto relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-xl border border-white/[0.06] flex items-center justify-center" style={{background:"rgba(255,255,255,0.03)"}}>
              <Menu size={18}/>
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-[20px] font-black tracking-tight">Central Operacional — Tempo de Espera Emergência</h1>
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" style={{boxShadow:"0 0 12px rgba(74,222,128,.9)"}}/>
              <span className="text-slate-400 text-[12px]">{loading?"Atualizando...":"Atualizado: "+lastUpdate}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setAutoRefresh(a=>!a)} className="w-10 h-10 rounded-xl border border-white/[0.06] flex items-center justify-center relative" style={{background:"rgba(255,255,255,0.03)",color:autoRefresh?"#22c55e":"#94a3b8"}}>
              <RefreshCw size={16} className={autoRefresh?"animate-spin":""}/>
            </button>
            <button onClick={loadData} className="w-10 h-10 rounded-xl border border-white/[0.06] flex items-center justify-center" style={{background:"rgba(255,255,255,0.03)"}}>
              <Moon size={16}/>
            </button>
            <div className="px-4 py-2 rounded-xl border border-white/[0.06] text-[13px] font-mono" style={{background:"rgba(255,255,255,0.03)"}}>{total.toLocaleString("pt-BR")} registros</div>
          </div>
        </header>

        {/* ── VISÃO GERAL ── */}
        {active==="visao" && (
          <div>
            {/* KPI cards */}
            <div className="grid grid-cols-6 gap-3 mb-3">
              {kpiCards.map(({label,value,color,icon:Icon,trend,sub})=>(
                <div key={label} className="relative overflow-hidden rounded-[20px] border border-white/[0.06] p-4 flex flex-col gap-3"
                  style={{background:"rgba(6,17,31,0.95)",boxShadow:`0 16px 40px ${color}12`}}>
                  <div className="absolute inset-0 opacity-25 pointer-events-none" style={{background:`radial-gradient(circle at top right,${color}35,transparent 55%)`}}/>
                  <div className="relative z-10 flex items-start justify-between">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{background:`${color}20`}}>
                      <Icon size={20} style={{color}}/>
                    </div>
                  </div>
                  <div className="relative z-10">
                    <p className="text-slate-400 text-[13px]">{label}</p>
                    <h2 className="text-[32px] leading-none font-black tracking-tight mt-1">{value}</h2>
                    {trend && <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] font-bold" style={{color}}>{trend}</span>
                      {sub && <span className="text-[11px] text-slate-500">{sub}</span>}
                    </div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Row 2: Map + Top10 + Dist */}
            <div className="grid grid-cols-12 gap-3 mb-3">
              {/* Map */}
              <div className="rounded-[20px] border border-white/[0.06] p-4 col-span-4 relative overflow-hidden" style={{background:"rgba(7,18,32,0.95)"}}>
                <div className="absolute inset-0" style={{background:"radial-gradient(circle at top left,rgba(37,99,235,.12),transparent 50%)"}}/>
                <div className="relative z-10">
                  <h2 className="text-[16px] font-black mb-3">Mapa de Criticidade por Estado</h2>
                  <div className="rounded-[16px] border border-white/[0.06] h-[300px] relative flex items-center justify-center p-2 overflow-hidden" style={{background:"#030D1A"}}>
                    <svg viewBox="0 0 580 580" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                      {Object.entries(BRAZIL_PATHS).map(([uf,{path,cx,cy}]) => {
                        const ufData = porUF.find(u=>u.uf===uf);
                        const fill = ufData ? statusColor(ufData.media) : "#1e293b";
                        return (
                          <g key={uf}>
                            <path d={path} fill={fill} stroke="#0a1a2e" strokeWidth={2}/>
                            <text x={cx} y={cy} fill="white" fontSize={8} fontWeight="bold" textAnchor="middle" dominantBaseline="middle">{uf}</text>
                          </g>
                        );
                      })}
                    </svg>
                    <div className="absolute left-3 bottom-3 space-y-1.5">
                      {[["#EF4444","Crítico (>1h)"],["#F97316","Grave (30m-1h)"],["#FACC15","Atenção (15m-30m)"],["#22C55E","Normal (<15m)"]].map(([c,l])=>(
                        <div key={l} className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{background:c}}/><span className="text-[11px] text-slate-300">{l}</span></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Top 10 */}
              <div className="rounded-[20px] border border-white/[0.06] p-4 col-span-4" style={{background:"rgba(7,18,32,0.95)"}}>
                <h2 className="text-[16px] font-black mb-3">Top 10 Maiores Tempos de Espera</h2>
                <div className="space-y-2">
                  {data.slice(0,10).map((r,i)=>(
                    <div key={r.id} className="flex items-center justify-between rounded-xl px-3 py-2 border border-white/[0.03]" style={{background:"rgba(255,255,255,0.03)"}}>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] text-slate-400" style={{background:"rgba(255,255,255,0.05)"}}>{i+1}</div>
                        <div>
                          <p className="text-[13px] text-slate-200">{r.nm_local} <span className="text-slate-500">- {r.uf}</span></p>
                          <p className="text-[11px] text-slate-500">{r.ds_especialidade}</p>
                        </div>
                      </div>
                      <span className="text-[20px] font-black" style={{color:statusColor(r.tempo_espera_min)}}>{minToHM(r.tempo_espera_min)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distribution */}
              <div className="rounded-[20px] border border-white/[0.06] p-4 col-span-4" style={{background:"rgba(7,18,32,0.95)"}}>
                <h2 className="text-[16px] font-black mb-3">Distribuição por Tempo de Espera</h2>
                <div className="flex items-center h-[300px] gap-2">
                  <div className="w-[55%] h-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dist} dataKey="v" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2}>
                          {dist.map(d=><Cell key={d.l} fill={d.c}/>)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[44px] font-black leading-none">{total.toLocaleString("pt-BR")}</span>
                      <span className="text-slate-400 text-[12px]">Total</span>
                    </div>
                  </div>
                  <div className="w-[45%] space-y-3">
                    {dist.map(d=>(
                      <div key={d.l} className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{background:d.c}}/><span className="text-[12px] text-slate-300">{d.l}</span></div>
                        <div><span className="font-bold text-[13px] mr-1">{d.v}</span><span className="text-slate-500 text-[11px]">({total?Math.round(d.v/total*100):0}%)</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Evolução + Especialidades */}
            <div className="grid grid-cols-12 gap-3 mb-3">
              <div className="rounded-[20px] border border-white/[0.06] p-4 col-span-8" style={{background:"rgba(7,18,32,0.95)"}}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[16px] font-black">Evolução do Tempo Médio de Espera</h2>
                  <div className="flex items-center gap-2">
                    {(["linha","area","barras"] as const).map(t=>(
                      <button key={t} onClick={()=>setChartType(t)}
                        className="px-3 py-1.5 rounded-lg text-[12px] transition-all capitalize"
                        style={{background:chartType===t?"#2563EB":"rgba(255,255,255,0.04)",color:chartType===t?"#fff":"#94a3b8"}}>
                        {t==="linha"?"Linha":t==="area"?"Área":"Barras"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType==="barras" ? (
                      <BarChart data={porHora}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                        <XAxis dataKey="hora" tick={{fill:"#64748b",fontSize:11}}/>
                        <YAxis tick={{fill:"#64748b",fontSize:11}}/>
                        <Tooltip contentStyle={{background:"#0F172A",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8}} formatter={(v)=>[`${v} min`,"Média"]}/>
                        <Bar dataKey="media" fill="#2563EB" radius={[4,4,0,0]}/>
                      </BarChart>
                    ) : chartType==="area" ? (
                      <AreaChart data={porHora}>
                        <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563EB" stopOpacity={0.4}/><stop offset="95%" stopColor="#2563EB" stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                        <XAxis dataKey="hora" tick={{fill:"#64748b",fontSize:11}}/>
                        <YAxis tick={{fill:"#64748b",fontSize:11}}/>
                        <Tooltip contentStyle={{background:"#0F172A",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8}} formatter={(v)=>[`${v} min`,"Média"]}/>
                        <Area type="monotone" dataKey="media" stroke="#2563EB" fill="url(#g1)" strokeWidth={2} dot={false}/>
                      </AreaChart>
                    ) : (
                      <LineChart data={porHora}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                        <XAxis dataKey="hora" tick={{fill:"#64748b",fontSize:11}}/>
                        <YAxis tick={{fill:"#64748b",fontSize:11}}/>
                        <Tooltip contentStyle={{background:"#0F172A",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8}} formatter={(v)=>[`${v} min`,"Média"]}/>
                        <Line type="monotone" dataKey="media" stroke="#2563EB" strokeWidth={2.5} dot={false}/>
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[20px] border border-white/[0.06] p-4 col-span-4" style={{background:"rgba(7,18,32,0.95)"}}>
                <div className="flex items-center gap-2 mb-4"><h2 className="text-[16px] font-black">Por Especialidade</h2><span className="text-slate-400 text-[11px]">(média de espera)</span></div>
                <div className="space-y-4 overflow-auto" style={{maxHeight:220}}>
                  {porEsp.slice(0,8).map(e=>{
                    const w = Math.min(100,(e.media/Math.max(...porEsp.map(x=>x.media)))*100);
                    const c = statusColor(e.media);
                    return (
                      <div key={e.esp}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[13px] truncate">{e.esp}</span>
                          <span className="text-slate-400 text-[12px] ml-2 shrink-0">{minToHM(e.media)}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.05)"}}>
                          <div className="h-full rounded-full" style={{width:`${w}%`,background:c,boxShadow:`0 0 12px ${c}80`}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-[20px] border border-white/[0.06] p-4" style={{background:"rgba(7,18,32,0.95)"}}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[16px] font-black">Hospitais em Tempo Real</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Buscar hospital, unidade ou especialidade..."
                      className="border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-[13px] text-slate-300 placeholder-slate-500 outline-none focus:border-blue-500/50 w-72"
                      style={{background:"rgba(255,255,255,0.03)"}}/>
                  </div>
                  <select value={filterUF} onChange={e=>setFilterUF(e.target.value)}
                    className="border border-white/[0.06] rounded-xl px-3 py-2 text-[13px] text-slate-300 outline-none"
                    style={{background:"rgba(255,255,255,0.03)"}}>
                    {ufs.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                  <select value={filterEsp} onChange={e=>setFilterEsp(e.target.value)}
                    className="border border-white/[0.06] rounded-xl px-3 py-2 text-[13px] text-slate-300 outline-none"
                    style={{background:"rgba(255,255,255,0.03)"}}>
                    {esps.map(e=><option key={e} value={e}>{e.length>30?e.slice(0,28)+"…":e}</option>)}
                  </select>
                  <span className="text-[12px] text-slate-500">{filteredTable.length} registros</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["UF","Unidade","Especialidade","Aguardando","Em Atendimento","Tempo Máximo","Média Espera","Status"].map(h=>(
                        <th key={h} className="text-left pb-3 pr-4 text-[12px] text-slate-400 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTable.slice(0,50).map((r,i)=>{
                      const media = Math.round(r.somaEspera/r.count);
                      const sc = statusColor(r.maxEspera);
                      const sl = statusLabel(r.maxEspera);
                      return (
                        <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 pr-4 text-[13px] font-bold text-slate-300">{r.uf}</td>
                          <td className="py-2.5 pr-4 text-[13px] max-w-[180px] truncate" title={r.nm_local}>{r.nm_local}</td>
                          <td className="py-2.5 pr-4 text-[13px] text-slate-300 max-w-[140px] truncate">{r.ds_especialidade}</td>
                          <td className="py-2.5 pr-4 text-[13px] font-bold">{r.aguardando}</td>
                          <td className="py-2.5 pr-4 text-[13px]">{r.atendendo}</td>
                          <td className="py-2.5 pr-4 text-[13px] font-bold" style={{color:sc}}>{minToHM(r.maxEspera)}</td>
                          <td className="py-2.5 pr-4 text-[13px]">{minToHM(media)}</td>
                          <td className="py-2.5 pr-4">
                            <span className="px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
                              style={{background:`${sc}20`,color:sc,border:`1px solid ${sc}40`}}>{sl}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── OPERAÇÃO AO VIVO ── */}
        {active==="vivo" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div><h2 className="text-xl font-black">Operação ao Vivo</h2><p className="text-sm text-slate-400">Dados em tempo real · {lastUpdate}</p></div>
              <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.06] text-sm hover:bg-white/[0.04]" style={{background:"rgba(255,255,255,0.03)"}}>
                <RefreshCw size={14} className={loading?"animate-spin":""}/>Atualizar
              </button>
            </div>
            <div className="rounded-[20px] border border-white/[0.06] p-4" style={{background:"rgba(7,18,32,0.95)"}}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["UF","Unidade","Especialidade","Médico","Aguardando","Tempo Máx","Média","Status"].map(h=>(
                        <th key={h} className="text-left pb-3 pr-4 text-[12px] text-slate-400 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0,100).map(r=>(
                      <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 pr-4 text-[13px] font-bold text-slate-300">{r.uf}</td>
                        <td className="py-2.5 pr-4 text-[13px] max-w-[160px] truncate">{r.nm_local}</td>
                        <td className="py-2.5 pr-4 text-[13px] text-slate-300 max-w-[140px] truncate">{r.ds_especialidade}</td>
                        <td className="py-2.5 pr-4 text-[13px] text-slate-400 max-w-[130px] truncate">{r.nm_medico}</td>
                        <td className="py-2.5 pr-4 text-[13px] font-bold">{r.qt_pacientes_aguardando}</td>
                        <td className="py-2.5 pr-4 text-[13px] font-bold" style={{color:statusColor(r.tempo_espera_min)}}>{minToHM(r.tempo_espera_min)}</td>
                        <td className="py-2.5 pr-4 text-[13px]">{minToHM(r.tempo_espera_min)}</td>
                        <td className="py-2.5 pr-4">
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold" style={{background:`${statusColor(r.tempo_espera_min)}20`,color:statusColor(r.tempo_espera_min),border:`1px solid ${statusColor(r.tempo_espera_min)}40`}}>{statusLabel(r.tempo_espera_min)}</span>
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
        {active==="ranking" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black">Ranking</h2>
              <div className="flex gap-2">
                {[["local","Hospitais"],["uf","Estados"],["esp","Especialidades"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setRankingType(k as "local"|"uf"|"esp")}
                    className="px-3 py-1.5 rounded-xl text-sm"
                    style={{background:rankingType===k?"#2563EB":"rgba(255,255,255,0.04)",color:rankingType===k?"#fff":"#94a3b8"}}>{l}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 rounded-[20px] border border-white/[0.06] p-4" style={{background:"rgba(7,18,32,0.95)"}}>
                <div className="space-y-2.5">
                  {rankData.map((r,i)=>(
                    <div key={r.name} className="flex items-center gap-3">
                      <span className="text-sm font-black w-7 shrink-0" style={{color:i<3?["#FFD700","#C0C0C0","#CD7F32"][i]:"#64748b"}}>#{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium truncate">{r.name}</p>
                          <span className="text-sm font-black ml-2 shrink-0" style={{color:statusColor(r.media)}}>{minToHM(r.media)}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.05)"}}>
                          <div className="h-full rounded-full" style={{width:`${(r.media/rankData[0].media)*100}%`,background:statusColor(r.media)}}/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ESPECIALIDADES ── */}
        {active==="especialidades" && (
          <div>
            <h2 className="text-xl font-black mb-4">Especialidades</h2>
            <div className="rounded-[20px] border border-white/[0.06] p-4" style={{background:"rgba(7,18,32,0.95)"}}>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={porEsp.slice(0,15)} layout="vertical" margin={{left:10,right:40}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false}/>
                  <XAxis type="number" tick={{fill:"#64748b",fontSize:10}}/>
                  <YAxis type="category" dataKey="esp" tick={{fill:"#94a3b8",fontSize:10}} width={160} tickFormatter={v=>v.length>22?v.slice(0,20)+"…":v}/>
                  <Tooltip contentStyle={{background:"#0F172A",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8}} formatter={(v)=>[`${v} min`,"Média"]}/>
                  <Bar dataKey="media" radius={[0,4,4,0]} label={{position:"right",fontSize:10,fill:"#94a3b8",formatter:(v)=>`${minToHM(Number(v))}`}}>
                    {porEsp.slice(0,15).map(e=><Cell key={e.esp} fill={statusColor(e.media)}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── ESTADOS ── */}
        {active==="estados" && (
          <div>
            <h2 className="text-xl font-black mb-4">Estados (UF)</h2>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4 rounded-[20px] border border-white/[0.06] p-4" style={{background:"rgba(7,18,32,0.95)"}}>
                <svg viewBox="0 0 580 580" className="w-full" style={{maxHeight:400}}>
                  {Object.entries(BRAZIL_PATHS).map(([uf,{path,cx,cy}])=>{
                    const d=porUF.find(u=>u.uf===uf);
                    const fill=d?statusColor(d.media):"#1e293b";
                    return (<g key={uf}><path d={path} fill={fill} stroke="#0a1a2e" strokeWidth={2}/><text x={cx} y={cy} fill="white" fontSize={8} fontWeight="bold" textAnchor="middle" dominantBaseline="middle">{uf}</text></g>);
                  })}
                </svg>
              </div>
              <div className="col-span-8 rounded-[20px] border border-white/[0.06] p-4" style={{background:"rgba(7,18,32,0.95)"}}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-white/[0.06]">
                      {["UF","Hospitais","Registros","Tempo Médio","SLA%","Status"].map(h=><th key={h} className="text-left pb-3 pr-4 text-[12px] text-slate-400 font-medium">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {porUF.map(u=>(
                        <tr key={u.uf} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="py-2.5 pr-4 text-sm font-black">{u.uf}</td>
                          <td className="py-2.5 pr-4 text-sm text-slate-400">{u.hosp}</td>
                          <td className="py-2.5 pr-4 text-sm">{u.count.toLocaleString("pt-BR")}</td>
                          <td className="py-2.5 pr-4 text-sm font-bold" style={{color:statusColor(u.media)}}>{minToHM(u.media)}</td>
                          <td className="py-2.5 pr-4 text-sm font-bold" style={{color:u.sla>=SLA_META?"#22c55e":"#ef4444"}}>{u.sla}%</td>
                          <td className="py-2.5 pr-4"><span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{background:`${statusColor(u.media)}20`,color:statusColor(u.media)}}>{statusLabel(u.media)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SLA & METAS ── */}
        {active==="sla" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><h2 className="text-xl font-black">SLA & Metas</h2><p className="text-sm text-slate-400">Tempo de Espera Emergência · SLA 15min · Meta 75%</p></div>
              <div className="flex gap-2">
                <div className="rounded-xl border border-blue-500/30 px-4 py-2 text-center" style={{background:"rgba(37,99,235,0.08)"}}><p className="text-xs text-slate-400">SLA</p><p className="text-xl font-black text-blue-400">15 min</p></div>
                <div className="rounded-xl border border-green-500/30 px-4 py-2 text-center" style={{background:"rgba(34,197,94,0.08)"}}><p className="text-xs text-slate-400">Meta</p><p className="text-xl font-black text-green-400">75%</p></div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {label:"Tempo de Espera Emergência (%)",value:`${slaPct}%`,sub:slaPct>=SLA_META?"✓ Meta atingida":"✗ Abaixo da meta",color:slaPct>=SLA_META?"#22c55e":"#ef4444",big:true},
                {label:"Meta Institucional",value:"75%",sub:"Pacientes em até 15min",color:"#60a5fa",big:false},
                {label:"Pacientes Dentro da Meta",value:slaOk.toLocaleString("pt-BR"),sub:"tempo ≤ 15min",color:"#22c55e",big:false},
                {label:"Pacientes Fora da Meta",value:slaFora.toLocaleString("pt-BR"),sub:"tempo > 15min",color:"#ef4444",big:false},
                {label:"Hospitais Dentro da Meta",value:hospOk.toString(),sub:"unidades OK",color:"#22c55e",big:false},
                {label:"Hospitais Fora da Meta",value:hospFora.toString(),sub:"unidades críticas",color:"#ef4444",big:false},
                {label:"Melhor UF",value:melhorUF?.uf??"—",sub:`${melhorUF?.sla??0}% dentro da meta`,color:"#22c55e",big:false},
                {label:"Pior UF",value:piorUF?.uf??"—",sub:`${piorUF?.sla??0}% dentro da meta`,color:"#ef4444",big:false},
              ].map(({label,value,sub,color,big})=>(
                <div key={label} className="rounded-[20px] border border-white/[0.06] p-4" style={{background:"rgba(6,17,31,0.95)",borderColor:`${color}25`}}>
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <p className={`font-black ${big?"text-4xl":"text-2xl"}`} style={{color}}>{value}</p>
                  <p className="text-xs mt-1" style={{color:big?color:"#64748b"}}>{sub}</p>
                  {big && <div className="mt-3 h-2 rounded-full relative overflow-visible" style={{background:"rgba(255,255,255,0.05)"}}>
                    <div className="h-full rounded-full" style={{width:`${slaPct}%`,background:slaPct>=SLA_META?"#22c55e":"#ef4444"}}/>
                    <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-white/50" style={{left:"75%"}}/>
                  </div>}
                </div>
              ))}
            </div>
            <div className="rounded-[20px] border border-white/[0.06] p-4" style={{background:"rgba(7,18,32,0.95)"}}>
              <h3 className="text-base font-black mb-3">SLA por Estado — Meta: 75% abaixo de 15min</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-white/[0.06]">
                    {["UF","Hospitais","Registros","Dentro SLA","Fora SLA","% SLA","vs Meta"].map(h=><th key={h} className="text-left pb-3 pr-4 text-[12px] text-slate-400 font-medium">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {ufSLA.map(u=>(
                      <tr key={u.uf} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="py-2.5 pr-4 text-sm font-black">{u.uf}</td>
                        <td className="py-2.5 pr-4 text-xs text-slate-400">{u.hosp}</td>
                        <td className="py-2.5 pr-4 text-xs">{u.count.toLocaleString("pt-BR")}</td>
                        <td className="py-2.5 pr-4 text-xs text-green-400 font-bold">{u.ok.toLocaleString("pt-BR")}</td>
                        <td className="py-2.5 pr-4 text-xs text-red-400 font-bold">{(u.count-u.ok).toLocaleString("pt-BR")}</td>
                        <td className="py-2.5 pr-4 text-sm font-black" style={{color:u.sla>=SLA_META?"#22c55e":"#ef4444"}}>{u.sla}%</td>
                        <td className="py-2.5 pr-4 text-xs font-bold" style={{color:u.sla>=SLA_META?"#22c55e":"#ef4444"}}>{u.sla>=SLA_META?"✓":u.sla-SLA_META+"%"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── ALERTAS ── */}
        {active==="alertas" && (
          <div>
            <h2 className="text-xl font-black mb-4">Alertas — {alertas.length} registros críticos (&gt;1h)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {alertas.map(r=>(
                <div key={r.id} className="rounded-[20px] border p-4 hover:border-white/[0.1] transition-colors"
                  style={{background:"rgba(6,17,31,0.95)",borderColor:`${statusColor(r.tempo_espera_min)}30`}}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1"><p className="text-sm font-bold truncate">{r.nm_local}</p><p className="text-xs text-slate-400">{r.uf} · {r.cidade}</p></div>
                    <span className="text-xl font-black ml-2 shrink-0" style={{color:statusColor(r.tempo_espera_min)}}>{minToHM(r.tempo_espera_min)}</span>
                  </div>
                  <p className="text-xs text-slate-300 mb-1 truncate">{r.ds_especialidade}</p>
                  <p className="text-xs text-slate-500 truncate">{r.nm_medico}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.05]">
                    <span className="text-xs text-slate-400">{r.qt_pacientes_aguardando} pac. aguardando</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:`${statusColor(r.tempo_espera_min)}20`,color:statusColor(r.tempo_espera_min)}}>{statusLabel(r.tempo_espera_min)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RELATÓRIOS (Área Analítica) ── */}
        {active==="relatorios" && (
          <div className="space-y-4">
            <div><h2 className="text-xl font-black">Área Analítica</h2><p className="text-sm text-slate-400 mt-0.5">Tempo de Espera Emergência · SLA 15min · Meta 75%</p></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {label:"Indicador Geral",value:`${slaPct}%`,sub:"Meta: 75%",color:slaPct>=75?"#22c55e":"#ef4444"},
                {label:"Dentro da Meta (≤15min)",value:slaOk.toLocaleString("pt-BR"),sub:"pacientes",color:"#22c55e"},
                {label:"Fora da Meta (>15min)",value:slaFora.toLocaleString("pt-BR"),sub:"pacientes",color:"#ef4444"},
                {label:"Total Registros",value:total.toLocaleString("pt-BR"),sub:"analisados",color:"#60a5fa"},
              ].map(({label,value,sub,color})=>(
                <div key={label} className="rounded-[20px] border border-white/[0.06] p-4" style={{background:"rgba(6,17,31,0.95)",borderColor:`${color}25`}}>
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <p className="text-2xl font-black" style={{color}}>{value}</p>
                  <p className="text-xs text-slate-500">{sub}</p>
                </div>
              ))}
            </div>
            <div className="rounded-[20px] border border-white/[0.06] p-4" style={{background:"rgba(7,18,32,0.95)"}}>
              <div className="flex items-center justify-between mb-3">
                <div><h3 className="text-base font-black">Evolução do SLA — Tempo de Espera Emergência</h3><p className="text-xs text-slate-400">% dentro da meta (≤15min) por hora</p></div>
                <span className="text-xs px-2 py-1 rounded-full font-bold" style={{background:slaPct>=75?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)",color:slaPct>=75?"#22c55e":"#ef4444"}}>{slaPct>=75?"✓ Meta atingida":"✗ Abaixo da meta"} · {slaPct}%</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={porHora}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                  <XAxis dataKey="hora" tick={{fill:"#64748b",fontSize:11}}/>
                  <YAxis domain={[0,100]} tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>`${v}%`}/>
                  <Tooltip contentStyle={{background:"#0F172A",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8}} formatter={(v,name)=>[name==="meta"?"75%":`${v}%`,name==="meta"?"Meta":"SLA"]}/>
                  <Line type="monotone" dataKey="meta" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="6 3" dot={false}/>
                  <Line type="monotone" dataKey="sla" stroke="#2563EB" strokeWidth={2.5} dot={{fill:"#2563EB",r:4}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 md:col-span-4 rounded-[20px] border border-white/[0.06] p-4" style={{background:"rgba(7,18,32,0.95)"}}>
                <h3 className="text-base font-black mb-1">Relatório Diário</h3>
                <p className="text-xs text-slate-400 mb-3">Visão D-1 · dados do dia atual</p>
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl border border-white/[0.05]" style={{background:"#030D1A"}}>
                    <p className="text-xs text-slate-400 mb-1">Indicador do dia</p>
                    <p className="text-3xl font-black" style={{color:slaPct>=75?"#22c55e":"#ef4444"}}>{slaPct}%</p>
                    <p className="text-xs text-slate-500 mt-1">{slaPct>=75?"✓ Dentro da meta":"✗ Fora da meta"}</p>
                  </div>
                  {[{l:"Total de atendimentos",v:total.toLocaleString("pt-BR")},{l:"Dentro da meta (≤15min)",v:slaOk.toLocaleString("pt-BR"),c:"#22c55e"},{l:"Fora da meta (>15min)",v:slaFora.toLocaleString("pt-BR"),c:"#ef4444"},{l:"Meta institucional",v:"75%",c:"#60a5fa"}].map(({l,v,c})=>(
                    <div key={l} className="flex justify-between items-center py-1.5 border-b border-white/[0.05]">
                      <span className="text-xs text-slate-400">{l}</span>
                      <span className="text-sm font-bold" style={{color:c??"#fff"}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-12 md:col-span-8 rounded-[20px] border border-white/[0.06] p-4" style={{background:"rgba(7,18,32,0.95)"}}>
                <h3 className="text-base font-black mb-1">SLA por Período</h3>
                <p className="text-xs text-slate-400 mb-3">% dentro da meta (≤15min) por hora do dia</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={porHora}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                    <XAxis dataKey="hora" tick={{fill:"#64748b",fontSize:11}}/>
                    <YAxis domain={[0,100]} tick={{fill:"#64748b",fontSize:11}} tickFormatter={v=>`${v}%`}/>
                    <Tooltip contentStyle={{background:"#0F172A",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8}} formatter={(v)=>[`${v}%`,"SLA"]}/>
                    <Bar dataKey="sla" radius={[4,4,0,0]} maxBarSize={40}>
                      {porHora.map(d=><Cell key={d.hora} fill={d.sla>=75?"#22c55e":"#ef4444"}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-[20px] border border-white/[0.06] p-4" style={{background:"rgba(7,18,32,0.95)"}}>
              <h3 className="text-base font-black mb-3">Performance por UF — ordenado do melhor ao pior</h3>
              <ResponsiveContainer width="100%" height={Math.max(280,ufSLA.length*24)}>
                <BarChart data={ufSLA} layout="vertical" margin={{left:10,right:50}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false}/>
                  <XAxis type="number" domain={[0,100]} tick={{fill:"#64748b",fontSize:10}} tickFormatter={v=>`${v}%`}/>
                  <YAxis type="category" dataKey="uf" tick={{fill:"#94a3b8",fontSize:11}} width={28}/>
                  <Tooltip contentStyle={{background:"#0F172A",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8}} formatter={(v)=>[`${v}%`,"SLA"]}/>
                  <Bar dataKey="sla" radius={[0,4,4,0]} label={{position:"right",fontSize:10,fill:"#94a3b8",formatter:(v)=>`${Number(v)}%`}}>
                    {ufSLA.map(d=><Cell key={d.uf} fill={d.sla>=75?"#22c55e":"#ef4444"}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-[20px] border border-white/[0.06] p-4" style={{background:"rgba(7,18,32,0.95)"}}>
              <h3 className="text-base font-black mb-3">Performance por Especialidade</h3>
              <ResponsiveContainer width="100%" height={Math.max(320,Math.min(espSLA.length,20)*28)}>
                <BarChart data={espSLA.slice(0,20)} layout="vertical" margin={{left:10,right:50}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false}/>
                  <XAxis type="number" domain={[0,100]} tick={{fill:"#64748b",fontSize:10}} tickFormatter={v=>`${v}%`}/>
                  <YAxis type="category" dataKey="esp" tick={{fill:"#94a3b8",fontSize:10}} width={160} tickFormatter={v=>v.length>22?v.slice(0,20)+"…":v}/>
                  <Tooltip contentStyle={{background:"#0F172A",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8}} formatter={(v)=>[`${v}%`,"SLA"]}/>
                  <Bar dataKey="sla" radius={[0,4,4,0]} label={{position:"right",fontSize:10,fill:"#94a3b8",formatter:(v)=>`${Number(v)}%`}}>
                    {espSLA.slice(0,20).map(d=><Cell key={d.esp} fill={d.sla>=75?"#22c55e":"#ef4444"}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── CONFIGURAÇÕES ── */}
        {active==="configuracoes" && (
          <div className="space-y-3 max-w-2xl">
            <h2 className="text-xl font-black">Configurações</h2>
            {[
              {title:"Atualização Automática",desc:"Controla o intervalo de refresh automático dos dados",content:(
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Auto-refresh</span>
                    <button onClick={()=>setAutoRefresh(a=>!a)} className="relative w-12 h-6 rounded-full transition-colors" style={{background:autoRefresh?"#2563EB":"rgba(255,255,255,0.1)"}}>
                      <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{left:autoRefresh?"calc(100% - 20px)":4}}/>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400 w-40">Intervalo</span>
                    <div className="flex gap-1.5">
                      {[30,60,120,300].map(v=>(
                        <button key={v} onClick={()=>setRefreshSec(v)} className="px-3 py-1.5 rounded-xl text-xs"
                          style={{background:refreshSec===v?"#2563EB":"rgba(255,255,255,0.05)",color:refreshSec===v?"#fff":"#94a3b8"}}>{v}s</button>
                      ))}
                    </div>
                  </div>
                </div>
              )},
              {title:"Definição de SLA",desc:"Parâmetros fixos de negócio — Tempo de Espera Emergência",content:(
                <div className="grid grid-cols-3 gap-3">
                  {[["Processo","Tempo de Espera Emergência","#94a3b8"],["SLA","15 min","#60a5fa"],["Meta","75% < 15m","#22c55e"]].map(([l,v,c])=>(
                    <div key={l} className="rounded-xl border border-white/[0.1] p-3 text-center" style={{background:"#030D1A"}}>
                      <p className="text-xs text-slate-400 mb-1">{l}</p>
                      <p className="text-sm font-black" style={{color:c}}>{v}</p>
                    </div>
                  ))}
                </div>
              )},
              {title:"Informações do Sistema",desc:"Detalhes da fonte de dados e status",content:(
                <div className="space-y-2 text-sm">
                  {[["Fonte","Supabase · tabela espera"],["Registros",total.toLocaleString("pt-BR")],["Atualizado",lastUpdate||"—"],["Status","● Online"],["UFs",porUF.length.toString()],["Especialidades",porEsp.length.toString()]].map(([k,v])=>(
                    <div key={k} className="flex justify-between"><span className="text-slate-400">{k}</span><span className={k==="Status"?"text-green-400":""}>{v}</span></div>
                  ))}
                </div>
              )},
            ].map(({title,desc,content})=>(
              <div key={title} className="rounded-[20px] border border-white/[0.06] p-4" style={{background:"rgba(7,18,32,0.95)"}}>
                <h3 className="text-base font-black mb-1">{title}</h3>
                <p className="text-xs text-slate-400 mb-4">{desc}</p>
                {content}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
