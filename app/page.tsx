"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Bell, Activity, Clock3, Hospital, ShieldAlert, Menu, Moon, Map,
  Stethoscope, Trophy, Settings, Download, HeartPulse, Search,
  Filter, ChevronDown, AlertTriangle, CheckCircle, XCircle,
  TrendingUp, TrendingDown, Users, Zap, FileText, BarChart2,
  PieChart as PieIcon, RefreshCw, X,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, CartesianGrid, ReferenceLine,
} from "recharts";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Hospital { uf:string; unidade:string; especialidade:string; pacientesAguardando:number; pacientesAtendimento:number; tempoMaximo:string; tempoMaximoMin:number; status:string; motivo:string; observacoes:string; }
interface DashData { resumo:{ totalRegistros:number; totalAguardando:number; totalAtendimento:number; tempoMedioFormatado:string; maiorEspera:string; maiorEsperaUnidade:string; maiorEsperaUF:string; criticos:number; graves:number; atencao:number; normais:number; }; top10:Hospital[]; hospitais:Hospital[]; atualizadoEm:string; turno?:string; data?:string; }

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fromMin = (m:number) => `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
const SC: Record<string,string> = { Crítico:"#ef4444", Grave:"#fb923c", Atenção:"#facc15", Normal:"#22c55e", Info:"#3b82f6" };
const UF_NAMES: Record<string,string> = { AC:"Acre",AL:"Alagoas",AM:"Amazonas",AP:"Amapá",BA:"Bahia",CE:"Ceará",DF:"Dist. Federal",ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MG:"Minas Gerais",MS:"Mato G. Sul",MT:"Mato Grosso",PA:"Pará",PB:"Paraíba",PE:"Pernambuco",PI:"Piauí",PR:"Paraná",RJ:"Rio de Janeiro",RN:"Rio G. Norte",RO:"Rondônia",RR:"Roraima",RS:"Rio G. Sul",SC:"Santa Catarina",SE:"Sergipe",SP:"São Paulo",TO:"Tocantins" };

// ─── STATIC DATA (fallback) ───────────────────────────────────────────────────
const sparkData = [{v:4},{v:7},{v:5},{v:8},{v:4},{v:9},{v:6},{v:8},{v:5},{v:10}];
const lineData = [{t:"15:00",v:48},{t:"17:00",v:41},{t:"19:00",v:35},{t:"21:00",v:46},{t:"23:00",v:33},{t:"01:00",v:22},{t:"03:00",v:18},{t:"05:00",v:20},{t:"07:00",v:26},{t:"09:00",v:31},{t:"11:00",v:19},{t:"13:00",v:24},{t:"15:00",v:34}];

// AJUSTE 3/4/5: meta=75, real ajustado para regra ≤15min
const slaData = [
  {esp:"Clínica Médica",meta:75,real:55,trend:-5},
  {esp:"Pediatria",     meta:75,real:42,trend:-12},
  {esp:"Obstetrícia",   meta:75,real:61,trend:2},
  {esp:"Ortopedia",     meta:75,real:70,trend:4},
  {esp:"Ginecologia",   meta:75,real:78,trend:6},
  {esp:"Traumatologia", meta:75,real:83,trend:8},
  {esp:"Oftalmologia",  meta:75,real:91,trend:3},
];
const slaHist = [{mes:"Nov",sla:61},{mes:"Dez",sla:58},{mes:"Jan",sla:63},{mes:"Fev",sla:60},{mes:"Mar",sla:65},{mes:"Abr",sla:68},{mes:"Mai",sla:68}];

// AJUSTE 1: dados para a nova aba Relatórios
const evolucaoSLA = [
  {dia:"17/Mai",sla:61},{dia:"18/Mai",sla:58},{dia:"19/Mai",sla:63},{dia:"20/Mai",sla:66},
  {dia:"21/Mai",sla:60},{dia:"22/Mai",sla:64},{dia:"23/Mai",sla:67},{dia:"24/Mai",sla:65},
  {dia:"25/Mai",sla:70},{dia:"26/Mai",sla:68},{dia:"27/Mai",sla:66},{dia:"28/Mai",sla:71},
  {dia:"29/Mai",sla:69},{dia:"30/Mai",sla:68},
];
const relDiario = {data:"29/Mai/2025",totalAtendimentos:1284,dentroDaMeta:886,foraDaMeta:398,indicador:69};
const relSemanal = [
  {dia:"Seg",sla:64},{dia:"Ter",sla:70},{dia:"Qua",sla:66},
  {dia:"Qui",sla:71},{dia:"Sex",sla:65},{dia:"Sáb",sla:72},{dia:"Dom",sla:69},
];
const relMensal = [{sem:"Sem 1",sla:62},{sem:"Sem 2",sla:65},{sem:"Sem 3",sla:67},{sem:"Sem 4",sla:69}];
const comparMeses = [{mes:"Mar",sla:65},{mes:"Abr",sla:68},{mes:"Mai",sla:68}];
const ufPerfSLA = [
  {uf:"MG",sla:86},{uf:"GO",sla:83},{uf:"PA",sla:81},{uf:"AM",sla:79},
  {uf:"CE",sla:70},{uf:"RJ",sla:68},{uf:"SP",sla:58},{uf:"PE",sla:52},{uf:"BA",sla:41},{uf:"PI",sla:28},
];
const espPerfSLA = [
  {esp:"Oftalmologia",sla:91},{esp:"Traumatologia",sla:83},{esp:"Ginecologia",sla:78},
  {esp:"Ortopedia",sla:70},{esp:"Obstetrícia",sla:61},{esp:"Clínica Médica",sla:55},{esp:"Pediatria",sla:42},
];

const alertasInit = [
  {id:1,tipo:"Crítico",msg:"Hospital Rio Poty - PI: tempo de espera 4h53 — maior da rede",hora:"15:24",lido:false},
  {id:2,tipo:"Crítico",msg:"Hospital Teresa - BA: 6 pacientes aguardando sem atendimento",hora:"15:21",lido:false},
  {id:3,tipo:"Crítico",msg:"PA Derby - PE: 14 pacientes na fila — capacidade excedida",hora:"15:18",lido:false},
  {id:4,tipo:"Grave",msg:"Hosp Notrecare ABC - SP: SLA violado nas últimas 2 horas",hora:"15:10",lido:false},
  {id:5,tipo:"Grave",msg:"Hospital Salvalus - SP: médico ausente — Clínica Médica",hora:"15:05",lido:false},
  {id:6,tipo:"Grave",msg:"PA Barueri - SP: tempo médio subiu 8 min na última hora",hora:"14:58",lido:true},
  {id:7,tipo:"Atenção",msg:"Hospital Ana Lima - CE: fila aumentando — monitorar",hora:"14:45",lido:true},
  {id:8,tipo:"Atenção",msg:"Hosp. Eugenia Pinheiro - CE: 4 pacientes aguardando ortopedia",hora:"14:32",lido:true},
  {id:9,tipo:"Info",msg:"14 hospitais sincronizados com sucesso",hora:"14:00",lido:true},
  {id:10,tipo:"Info",msg:"Relatório diário gerado com sucesso",hora:"13:00",lido:true},
];
const NAV: [string,any,string?][] = [
  ["Visão Geral",Activity],["Operação ao Vivo",Clock3],["Ranking",Trophy],
  ["Especialidades",Stethoscope],["Estados (UF)",Map],["SLA & Metas",ShieldAlert],
  ["Alertas",Bell,"14"],["Relatórios",Download],["Configurações",Settings],
];

// ─── MAP REGIONS ──────────────────────────────────────────────────────────────
const MAP_REGIONS = [
  {uf:"AM",d:"M70 90 L180 70 L280 80 L320 110 L310 160 L280 200 L220 230 L160 240 L100 220 L60 180 Z",lx:170,ly:165},
  {uf:"RR",d:"M180 40 L240 30 L270 60 L280 80 L180 70 Z",lx:218,ly:55},
  {uf:"MA",d:"M280 80 L370 60 L400 90 L390 130 L360 160 L320 150 L310 110 Z",lx:340,ly:115},
  {uf:"CE",d:"M370 60 L430 65 L460 90 L450 130 L410 155 L390 130 L400 90 Z",lx:418,ly:103},
  {uf:"PE",d:"M430 65 L500 60 L530 80 L540 120 L510 155 L470 160 L450 130 L460 90 Z",lx:488,ly:108},
  {uf:"GO",d:"M310 160 L360 160 L390 130 L410 155 L400 210 L370 250 L330 260 L290 240 L280 200 Z",lx:333,ly:205},
  {uf:"BA",d:"M410 155 L450 130 L470 160 L510 155 L520 200 L490 260 L440 290 L400 270 L380 240 L400 210 Z",lx:453,ly:215},
  {uf:"PA",d:"M160 240 L220 230 L280 200 L290 240 L270 290 L230 310 L180 300 L150 270 Z",lx:208,ly:268},
  {uf:"MS",d:"M230 310 L270 290 L290 240 L330 260 L340 310 L310 350 L270 360 L240 340 Z",lx:278,ly:322},
  {uf:"MG",d:"M370 250 L400 270 L440 290 L450 340 L420 380 L380 390 L340 370 L330 330 L340 310 L370 290 Z",lx:390,ly:320},
  {uf:"RJ",d:"M450 340 L490 320 L510 355 L490 390 L460 400 L440 380 L420 380 Z",lx:466,ly:360},
  {uf:"SP",d:"M310 350 L340 370 L380 390 L390 430 L360 460 L320 450 L290 420 L290 390 Z",lx:337,ly:408},
  {uf:"PR",d:"M290 420 L320 450 L350 470 L340 500 L300 510 L270 490 L260 460 Z",lx:302,ly:465},
  {uf:"SC",d:"M270 490 L300 510 L310 530 L280 545 L255 530 L250 510 Z",lx:280,ly:518},
  {uf:"RS",d:"M250 510 L255 530 L280 545 L270 570 L240 575 L210 560 L200 535 L220 515 Z",lx:237,ly:548},
  {uf:"AC",d:"M100 270 L150 270 L180 300 L170 340 L130 350 L90 330 L80 290 Z",lx:125,ly:308},
];

// ─── ATOMS ───────────────────────────────────────────────────────────────────
function Spark({color}:{color:string}) {
  return <ResponsiveContainer width="100%" height="100%"><LineChart data={sparkData}><Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer>;
}
function KPI({title,value,color,icon,trend,sub}:any) {
  return (
    <div className="relative overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#06111F]/95 p-4 flex flex-col gap-3" style={{boxShadow:`0 16px 40px ${color}12`}}>
      <div className="absolute inset-0 opacity-25 pointer-events-none" style={{background:`radial-gradient(circle at top right,${color}35,transparent 55%)`}}/>
      <div className="relative z-10 flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{background:`${color}20`}}><span style={{color}}>{icon}</span></div>
        <div className="w-20 h-7"><Spark color={color}/></div>
      </div>
      <div className="relative z-10">
        <p className="text-slate-400 text-[13px]">{title}</p>
        <h2 className="text-[32px] leading-none font-black tracking-tight mt-1">{value}</h2>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] font-bold" style={{color}}>▲ {trend}</span>
          <span className="text-[11px] text-slate-500">{sub}</span>
        </div>
      </div>
    </div>
  );
}
function Badge({status}:{status:string}) {
  const c=SC[status]??"#888";
  return <span className="px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap" style={{background:`${c}20`,color:c,border:`1px solid ${c}40`}}>{status}</span>;
}
function Tiny({color="#ef4444"}:{color?:string}) {
  const d=[3,5,4,7,6,8,5,9].map(v=>({v}));
  return <div className="w-16 h-7"><ResponsiveContainer width="100%" height="100%"><LineChart data={d}><Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false}/></LineChart></ResponsiveContainer></div>;
}
function Card({children,className=""}:{children:React.ReactNode;className?:string}) {
  return <div className={`rounded-[20px] border border-white/[0.06] bg-[#071220]/95 p-4 ${className}`}>{children}</div>;
}
function Title({t,s}:{t:string;s?:string}) {
  return <div className="mb-4"><h1 className="text-[26px] font-black tracking-tight">{t}</h1>{s&&<p className="text-slate-400 text-[14px] mt-1">{s}</p>}</div>;
}
function BrazilMap({ufStatus}:{ufStatus:Record<string,string>}) {
  const getColor = (uf:string) => SC[ufStatus[uf]||"Normal"]??"#22c55e";
  return (
    <svg viewBox="0 0 580 580" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {MAP_REGIONS.map(r=>(
        <g key={r.uf}>
          <path d={r.d} fill={getColor(r.uf)} stroke="#0a1a2e" strokeWidth="1.5"/>
          <text x={r.lx} y={r.ly} fill="white" fontSize="11" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" style={{filter:"drop-shadow(0 1px 2px rgba(0,0,0,0.9))"}}>
            {r.uf}
          </text>
          <text x={r.lx} y={r.ly+13} fill="rgba(255,255,255,0.75)" fontSize="8" textAnchor="middle" dominantBaseline="middle" style={{filter:"drop-shadow(0 1px 1px rgba(0,0,0,0.9))"}}>
            {(UF_NAMES[r.uf]||"").substring(0,10)}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── FILTER BAR ───────────────────────────────────────────────────────────────
function FilterBar({search,setSearch,filterUF,setFilterUF,filterEsp,setFilterEsp,filterStatus,setFilterStatus,ufs,especialidades}:any) {
  const hasFilter = filterUF!=="Todos"||filterEsp!=="Todas"||filterStatus!=="Todos"||search!=="";
  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} type="text" placeholder="Buscar hospital, UF, especialidade..." className="bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-[13px] text-slate-300 placeholder-slate-500 outline-none focus:border-blue-500/50 w-72"/>
      </div>
      <select value={filterUF} onChange={e=>setFilterUF(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-slate-300 outline-none">
        <option value="Todos">Todas UF</option>
        {ufs.map((u:string)=><option key={u} value={u}>{u} — {UF_NAMES[u]||u}</option>)}
      </select>
      <select value={filterEsp} onChange={e=>setFilterEsp(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-slate-300 outline-none">
        <option value="Todas">Todas Especialidades</option>
        {especialidades.map((e:string)=><option key={e} value={e}>{e}</option>)}
      </select>
      <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-slate-300 outline-none">
        <option value="Todos">Todos Status</option>
        {["Crítico","Grave","Atenção","Normal"].map(s=><option key={s} value={s}>{s}</option>)}
      </select>
      {hasFilter&&(
        <button onClick={()=>{setSearch("");setFilterUF("Todos");setFilterEsp("Todas");setFilterStatus("Todos");}} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-[13px] text-red-400 hover:bg-red-500/20 transition-all">
          <X size={13}/> Limpar filtros
        </button>
      )}
      {hasFilter&&<span className="text-[12px] text-slate-400">Filtros ativos</span>}
    </div>
  );
}

// ─── VIEWS ────────────────────────────────────────────────────────────────────
function VGeral({ac,sac,fH,fR,ufStatus,specialtiesReal,search,setSearch,filterUF,setFilterUF,filterEsp,setFilterEsp,filterStatus,setFilterStatus,ufs,especialidades}:any) {
  const sorted = [...fH].sort((a:any,b:any)=>b.tempoMaximoMin-a.tempoMaximoMin);
  const tot = fR.totalRegistros||1;
  const donut = [
    {name:"Normal",  value:fR.normais,  pct:`${Math.round(fR.normais/tot*100)}%`,  color:"#22c55e"},
    {name:"Atenção", value:fR.atencao,  pct:`${Math.round(fR.atencao/tot*100)}%`,  color:"#06b6d4"},
    {name:"Grave",   value:fR.graves,   pct:`${Math.round(fR.graves/tot*100)}%`,   color:"#fb923c"},
    {name:"Crítico", value:fR.criticos, pct:`${Math.round(fR.criticos/tot*100)}%`, color:"#ef4444"},
  ];
  return (
    <>
      <div className="grid grid-cols-6 gap-3 mb-3">
        <KPI title="Pacientes Aguardando" value={String(fR.totalAguardando)} trend="vs último período" sub="" color="#8B5CF6" icon={<Hospital size={20}/>}/>
        <KPI title="Em Atendimento"       value={String(fR.totalAtendimento)} trend="vs último período" sub="" color="#3B82F6" icon={<Activity size={20}/>}/>
        <KPI title="Tempo Médio"          value={fR.tempoMedioFormatado} trend="vs último período" sub="" color="#F59E0B" icon={<Clock3 size={20}/>}/>
        <KPI title="Maior Espera"         value={fR.maiorEspera} trend={fR.maiorEsperaUnidade?.substring(0,12)||""} sub={fR.maiorEsperaUF||""} color="#EF4444" icon={<ShieldAlert size={20}/>}/>
        <KPI title="Hospitais Críticos"   value={String(fR.criticos)} trend="críticos" sub="" color="#EF4444" icon={<Bell size={20}/>}/>
        <KPI title="Total Registros"      value={String(fR.totalRegistros)} trend="hospitais" sub="" color="#22C55E" icon={<ShieldAlert size={20}/>}/>
      </div>
      <div className="grid grid-cols-12 gap-3 mb-3">
        <Card className="col-span-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,.12),transparent_50%)]"/>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-black">Mapa de Criticidade</h2>
              <div className="flex flex-col gap-1">{["+","−","⤢"].map(b=><button key={b} className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-sm">{b}</button>)}</div>
            </div>
            <div className="rounded-[16px] border border-white/[0.06] bg-[#030D1A] h-[300px] relative flex items-center justify-center p-2 overflow-hidden">
              <div className="relative z-10 w-full h-full flex items-center justify-center"><BrazilMap ufStatus={ufStatus}/></div>
              <div className="absolute left-3 bottom-3 space-y-1.5">
                {[["Crítico (>1h)","#EF4444"],["Grave (30m-1h)","#F97316"],["Atenção (15m-30m)","#FACC15"],["Normal (<15m)","#22C55E"]].map(([l,c])=>(
                  <div key={l} className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{background:c}}/><span className="text-[11px] text-slate-300">{l}</span></div>
                ))}
              </div>
            </div>
          </div>
        </Card>
        <Card className="col-span-4">
          <h2 className="text-[16px] font-black mb-3">Top 10 Maiores Tempos de Espera</h2>
          <div className="space-y-2">
            {sorted.slice(0,10).map((h:any,i:number)=>(
              <div key={i} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 border border-white/[0.03]">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-[12px] text-slate-400">{i+1}</div>
                  <div>
                    <span className="text-[12px] text-slate-200 block">{h.unidade} - {h.uf}</span>
                    <span className="text-[10px] text-slate-500">{h.especialidade}</span>
                  </div>
                </div>
                <span className="text-[20px] font-black" style={{color:SC[h.status]}}>{h.tempoMaximo}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="col-span-4">
          <h2 className="text-[16px] font-black mb-3">Distribuição por Status</h2>
          <div className="flex items-center h-[300px] gap-2">
            <div className="w-[55%] h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={donut} dataKey="value" innerRadius={65} outerRadius={105} paddingAngle={2} stroke="transparent">{donut.map((e:any,i:number)=><Cell key={i} fill={e.color}/>)}</Pie></PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[44px] font-black leading-none">{fR.totalRegistros}</span>
                <span className="text-slate-400 text-[12px]">Total</span>
              </div>
            </div>
            <div className="w-[45%] space-y-3">
              {[...donut].reverse().map((item:any,i:number)=>(
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{background:item.color}}/><span className="text-[12px] text-slate-300">{item.name}</span></div>
                  <div><span className="font-bold text-[13px] mr-1">{item.value}</span><span className="text-slate-500 text-[11px]">({item.pct})</span></div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-12 gap-3 mb-3">
        <Card className="col-span-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-black">Evolução do Tempo Médio de Espera</h2>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] text-[12px] text-slate-300">Últimas 24 horas <ChevronDown size={12}/></button>
              {(["Linha","Área","Barras"] as const).map(m=>(
                <button key={m} onClick={()=>sac(m)} className={`px-3 py-1.5 rounded-lg text-[12px] transition-all ${ac===m?"bg-[#2563EB]":"bg-white/[0.04] text-slate-400"}`}>{m}</button>
              ))}
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineData} margin={{left:0,right:8,top:4,bottom:0}}>
                <defs><linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563EB" stopOpacity={0.4}/><stop offset="100%" stopColor="#2563EB" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="t" stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}}/>
                <YAxis stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}} tickFormatter={v=>`${v} min`} domain={[0,65]} ticks={[0,15,30,45,60]} width={45}/>
                <ReferenceLine y={15} stroke="#facc15" strokeDasharray="4 3" label={{value:"SLA 15min",fill:"#facc15",fontSize:10,position:"insideTopRight"}}/>
                <Tooltip contentStyle={{background:"#081120",border:"1px solid rgba(255,255,255,.06)",borderRadius:"12px",color:"#fff",fontSize:12}} formatter={(v:any)=>[`${v} min`,"Tempo médio"]}/>
                <Area type="monotone" dataKey="v" stroke="#3B82F6" strokeWidth={2.5} fill="url(#gB)" dot={{r:3,fill:"#3B82F6"}} activeDot={{r:5}}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="col-span-4">
          <div className="flex items-center gap-2 mb-4"><h2 className="text-[16px] font-black">Por Especialidade</h2><span className="text-slate-400 text-[11px]">(média de espera)</span></div>
          <div className="space-y-4">
            {specialtiesReal.map(([n,t,c,p]:any,i:number)=>(
              <div key={i}>
                <div className="flex items-center justify-between mb-1"><span className="text-[13px]">{n}</span><span className="text-slate-400 text-[12px]">{t}</span></div>
                <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden"><div className="h-full rounded-full" style={{width:`${p}%`,background:c,boxShadow:`0 0 12px ${c}80`}}/></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-black">Hospitais em Tempo Real</h2>
        </div>
        <FilterBar search={search} setSearch={setSearch} filterUF={filterUF} setFilterUF={setFilterUF} filterEsp={filterEsp} setFilterEsp={setFilterEsp} filterStatus={filterStatus} setFilterStatus={setFilterStatus} ufs={ufs} especialidades={especialidades}/>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/[0.06]">{["UF","Unidade","Especialidade","Aguardando","Em Atendimento","Tempo Máximo","Status","Tendência"].map(h=><th key={h} className="text-left pb-3 pr-4 text-[12px] text-slate-400 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>{sorted.map((r:any,i:number)=>(
              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 pr-4 text-[13px] font-bold text-slate-300">{r.uf}</td>
                <td className="py-2.5 pr-4 text-[13px]">{r.unidade}</td>
                <td className="py-2.5 pr-4 text-[13px] text-slate-300">{r.especialidade}</td>
                <td className="py-2.5 pr-4 text-[13px] font-bold">{r.pacientesAguardando}</td>
                <td className="py-2.5 pr-4 text-[13px]">{r.pacientesAtendimento}</td>
                <td className="py-2.5 pr-4 text-[13px] font-bold" style={{color:SC[r.status]}}>{r.tempoMaximo}</td>
                <td className="py-2.5 pr-4"><Badge status={r.status}/></td>
                <td className="py-2.5"><Tiny color={SC[r.status]}/></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function VOperacao({fH,fR}:any) {
  const sorted = [...fH].sort((a:any,b:any)=>b.tempoMaximoMin-a.tempoMaximoMin);
  return (
    <>
      <Title t="Operação ao Vivo" s="Monitoramento em tempo real · atualiza a cada 30s"/>
      <div className="grid grid-cols-4 gap-3 mb-3">
        {[
          {l:"Hospitais Online",v:String(fR.totalRegistros),   i:<Zap size={18}/>,          c:"#22c55e"},
          {l:"Críticos",        v:String(fR.criticos),         i:<AlertTriangle size={18}/>, c:"#ef4444"},
          {l:"Total na Fila",   v:String(fR.totalAguardando),  i:<Users size={18}/>,         c:"#8b5cf6"},
          {l:"Em Atendimento",  v:String(fR.totalAtendimento), i:<CheckCircle size={18}/>,   c:"#06b6d4"},
        ].map((k,i)=>(
          <Card key={i} className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background:`${k.c}20`}}><span style={{color:k.c}}>{k.i}</span></div>
            <div><p className="text-slate-400 text-[12px]">{k.l}</p><p className="text-[28px] font-black leading-none mt-0.5">{k.v}</p></div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-12 gap-3">
        <Card className="col-span-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-black">Hospitais — Situação Agora</h2>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/><span className="text-[12px] text-slate-400">LIVE</span></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-white/[0.06]">{["UF","Unidade","Especialidade","Fila","Atend.","Máx","Status"].map(h=><th key={h} className="text-left pb-2 pr-3 text-[11px] text-slate-400 font-medium">{h}</th>)}</tr></thead>
              <tbody>{sorted.map((r:any,i:number)=>(
                <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-2 pr-3 text-[12px] font-bold text-slate-300">{r.uf}</td>
                  <td className="py-2 pr-3 text-[12px]">{r.unidade}</td>
                  <td className="py-2 pr-3 text-[12px] text-slate-400">{r.especialidade}</td>
                  <td className="py-2 pr-3 text-[12px] font-black" style={{color:r.pacientesAguardando>8?"#ef4444":r.pacientesAguardando>4?"#fb923c":"#22c55e"}}>{r.pacientesAguardando}</td>
                  <td className="py-2 pr-3 text-[12px]">{r.pacientesAtendimento}</td>
                  <td className="py-2 pr-3 text-[12px] font-bold" style={{color:SC[r.status]}}>{r.tempoMaximo}</td>
                  <td className="py-2"><Badge status={r.status}/></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
        <Card className="col-span-4">
          <h2 className="text-[16px] font-black mb-3">Fila por Estado</h2>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...fH].reduce((acc:any[],h:any)=>{const e=acc.find(x=>x.uf===h.uf);if(e)e.agu+=h.pacientesAguardando;else acc.push({uf:h.uf,agu:h.pacientesAguardando});return acc;},[]).sort((a:any,b:any)=>b.agu-a.agu).slice(0,7)} layout="vertical" margin={{left:8,right:16}}>
                <XAxis type="number" stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}}/>
                <YAxis dataKey="uf" type="category" stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#94a3b8"}} width={28}/>
                <Tooltip contentStyle={{background:"#081120",border:"1px solid rgba(255,255,255,.06)",borderRadius:"12px",color:"#fff",fontSize:12}}/>
                <Bar dataKey="agu" fill="#3b82f6" radius={[0,4,4,0]} name="Aguardando"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </>
  );
}

function VRanking({rankingReal}:any) {
  return (
    <>
      <Title t="Ranking de Hospitais" s="Classificação por performance e tempo de espera — dados reais"/>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {rankingReal.slice(0,3).map((r:any,i:number)=>(
          <Card key={i} className="text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{background:`radial-gradient(circle at center,${["#facc15","#94a3b8","#b45309"][i]},transparent 60%)`}}/>
            <div className="relative z-10">
              <div className="text-[40px] mb-2">{["🥇","🥈","🥉"][i]}</div>
              <p className="text-[13px] text-slate-300 font-medium mb-1">{r.nome}</p>
              <div className="text-[42px] font-black" style={{color:["#facc15","#94a3b8","#b45309"][i]}}>{r.score}</div>
              <p className="text-slate-400 text-[12px]">Score de performance</p>
              <div className="mt-3 flex justify-center gap-3 text-[12px]">
                <span className="text-slate-400">Máx: <span className="text-white font-bold">{r.med}</span></span>
                <span className="text-slate-400">Fila: <span className="text-white font-bold">{r.agu}</span></span>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="text-[16px] font-black mb-4">Classificação Completa</h2>
        <table className="w-full">
          <thead><tr className="border-b border-white/[0.06]">{["Pos","Hospital","Score","Máx Espera","Fila","Status","Tendência"].map(h=><th key={h} className="text-left pb-3 pr-4 text-[12px] text-slate-400 font-medium">{h}</th>)}</tr></thead>
          <tbody>{rankingReal.map((r:any,i:number)=>(
            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
              <td className="py-3 pr-4"><div className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-black" style={{background:i<3?[`#facc1520`,`#94a3b820`,`#b4590920`][i]:"rgba(255,255,255,.04)",color:i<3?["#facc15","#94a3b8","#b45309"][i]:"#64748b"}}>{r.pos}</div></td>
              <td className="py-3 pr-4 text-[13px]">{r.nome}</td>
              <td className="py-3 pr-4"><div className="flex items-center gap-2"><div className="h-2 rounded-full bg-white/[0.05] overflow-hidden w-20"><div className="h-full rounded-full" style={{width:`${r.score}%`,background:r.score>90?"#22c55e":r.score>70?"#06b6d4":r.score>50?"#facc15":"#ef4444"}}/></div><span className="text-[13px] font-bold">{r.score}</span></div></td>
              <td className="py-3 pr-4 text-[13px]">{r.med}</td>
              <td className="py-3 pr-4 text-[13px]">{r.agu}</td>
              <td className="py-3 pr-4"><Badge status={r.status}/></td>
              <td className="py-3">{r.trend==="up"&&<span className="text-green-400 text-[12px] font-bold flex items-center gap-1"><TrendingUp size={14}/>Subindo</span>}{r.trend==="down"&&<span className="text-red-400 text-[12px] font-bold flex items-center gap-1"><TrendingDown size={14}/>Caindo</span>}{r.trend==="same"&&<span className="text-slate-400 text-[12px]">Estável</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
    </>
  );
}

function VEspec({specialtiesReal}:any) {
  return (
    <>
      <Title t="Por Especialidade" s="Análise de tempo de espera por área médica — dados reais"/>
      <div className="grid grid-cols-4 gap-3 mb-3">
        {specialtiesReal.map(([n,t,c,p]:any,i:number)=>(
          <Card key={i}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${c}20`}}><Stethoscope size={18} style={{color:c}}/></div>
              <Badge status={p>80?"Crítico":p>60?"Grave":p>40?"Atenção":"Normal"}/>
            </div>
            <p className="text-slate-400 text-[12px]">{n}</p>
            <p className="text-[28px] font-black mt-1">{t}</p>
            <div className="mt-3 h-2 rounded-full bg-white/[0.05] overflow-hidden"><div className="h-full rounded-full" style={{width:`${p}%`,background:c,boxShadow:`0 0 10px ${c}80`}}/></div>
            <p className="text-slate-500 text-[11px] mt-1">Pressão: {p}%</p>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-12 gap-3">
        <Card className="col-span-7">
          <h2 className="text-[16px] font-black mb-3">Pressão de Fila por Especialidade</h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={specialtiesReal.map(([n,,c,p]:any)=>({name:n.substring(0,9),v:p}))} margin={{left:0,right:8}}>
                <XAxis dataKey="name" stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}}/>
                <YAxis stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}} domain={[0,100]}/>
                <Tooltip contentStyle={{background:"#081120",border:"1px solid rgba(255,255,255,.06)",borderRadius:"12px",color:"#fff",fontSize:12}}/>
                <Bar dataKey="v" radius={[6,6,0,0]} name="Pressão">{specialtiesReal.map(([,,c]:any,i:number)=><Cell key={i} fill={c}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="col-span-5">
          <h2 className="text-[16px] font-black mb-3">Radar de Especialidades</h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={specialtiesReal.map(([n,,,p]:any)=>({esp:n.substring(0,6),val:p}))}>
                <PolarGrid stroke="#1e3a5f"/>
                <PolarAngleAxis dataKey="esp" tick={{fill:"#64748b",fontSize:11}}/>
                <Radar name="Pressão" dataKey="val" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </>
  );
}

function VEstados({ufDataReal,ufStatus}:any) {
  return (
    <>
      <Title t="Por Estado (UF)" s="Visão consolidada por unidade federativa — dados reais"/>
      <div className="grid grid-cols-12 gap-3">
        <Card className="col-span-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,.12),transparent_50%)]"/>
          <h2 className="text-[16px] font-black mb-3 relative z-10">Mapa de Criticidade</h2>
          <div className="rounded-[16px] border border-white/[0.06] bg-[#030D1A] h-[380px] relative flex items-center justify-center p-2 overflow-hidden">
            <div className="relative z-10 w-full h-full"><BrazilMap ufStatus={ufStatus}/></div>
          </div>
        </Card>
        <Card className="col-span-8">
          <h2 className="text-[16px] font-black mb-3">Desempenho por UF</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-white/[0.06]">{["UF","Estado","Registros","Aguardando","Críticos","Média Espera","Status"].map(h=><th key={h} className="text-left pb-3 pr-4 text-[12px] text-slate-400 font-medium">{h}</th>)}</tr></thead>
              <tbody>{ufDataReal.map((r:any,i:number)=>(
                <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-3 pr-4"><span className="text-[16px] font-black" style={{color:SC[r.status]}}>{r.uf}</span></td>
                  <td className="py-3 pr-4 text-[12px] text-slate-400">{UF_NAMES[r.uf]||r.uf}</td>
                  <td className="py-3 pr-4 text-[13px]">{r.hospitais}</td>
                  <td className="py-3 pr-4 text-[13px] font-bold">{r.agu}</td>
                  <td className="py-3 pr-4 text-[13px] font-bold" style={{color:r.criticos>0?"#ef4444":"#22c55e"}}>{r.criticos}</td>
                  <td className="py-3 pr-4 text-[13px]">{r.med}</td>
                  <td className="py-3"><Badge status={r.status}/></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

// AJUSTE 4: SLA & Metas com nova regra — meta 75%, SLA ≤15min
function VSLA() {
  return (
    <>
      <Title t="SLA & Metas" s="Acompanhamento dos indicadores de nível de serviço"/>
      <div className="grid grid-cols-4 gap-3 mb-3">
        {[
          {l:"SLA Geral (≤15min)", v:"68,5%", m:"75%", ok:false, c:"#ef4444"},
          {l:"Hospitais na Meta",  v:"33/47",  m:"47",  ok:false, c:"#fb923c"},
          {l:"Meta do Mês",        v:"68,5%", m:"75%", ok:false, c:"#facc15"},
          {l:"Melhor UF",          v:"MG",    m:"83%", ok:true,  c:"#22c55e"},
        ].map((k,i)=>(
          <Card key={i} className="text-center">
            <p className="text-slate-400 text-[12px] mb-2">{k.l}</p>
            <p className="text-[36px] font-black" style={{color:k.c}}>{k.v}</p>
            <p className="text-slate-500 text-[11px] mt-1">Meta: {k.m}</p>
            <div className={`mt-2 text-[11px] font-bold ${k.ok?"text-green-400":"text-red-400"}`}>{k.ok?"✓ Dentro da meta":"✗ Abaixo da meta"}</div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-12 gap-3 mb-3">
        <Card className="col-span-7">
          <h2 className="text-[16px] font-black mb-3">SLA por Especialidade vs Meta (75% ≤ 15min)</h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slaData} margin={{left:0,right:8}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f"/>
                <XAxis dataKey="esp" stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:10,fill:"#64748b"}}/>
                <YAxis stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}} domain={[0,100]} tickFormatter={v=>`${v}%`}/>
                <ReferenceLine y={75} stroke="#facc15" strokeDasharray="4 3" label={{value:"Meta 75%",fill:"#facc15",fontSize:10,position:"insideTopRight"}}/>
                <Tooltip contentStyle={{background:"#081120",border:"1px solid rgba(255,255,255,.06)",borderRadius:"12px",color:"#fff",fontSize:12}}/>
                <Bar dataKey="meta" fill="#1e3a5f" radius={[4,4,0,0]} name="Meta"/>
                <Bar dataKey="real" radius={[4,4,0,0]} name="Realizado">{slaData.map((d,i)=><Cell key={i} fill={d.real>=d.meta?"#22c55e":"#ef4444"}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="col-span-5">
          <h2 className="text-[16px] font-black mb-3">Histórico SLA — 7 Meses</h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={slaHist} margin={{left:0,right:8}}>
                <defs><linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="mes" stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}}/>
                <YAxis stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}} domain={[50,90]} tickFormatter={v=>`${v}%`} width={40}/>
                <ReferenceLine y={75} stroke="#facc15" strokeDasharray="4 3" label={{value:"Meta 75%",fill:"#facc15",fontSize:10,position:"insideTopRight"}}/>
                <Tooltip contentStyle={{background:"#081120",border:"1px solid rgba(255,255,255,.06)",borderRadius:"12px",color:"#fff",fontSize:12}}/>
                <Area type="monotone" dataKey="sla" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gS)" dot={{r:4,fill:"#3b82f6"}}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card>
        <h2 className="text-[16px] font-black mb-4">Detalhamento por Especialidade</h2>
        <div className="space-y-4">
          {slaData.map((d,i)=>(
            <div key={i} className="flex items-center gap-4">
              <span className="text-[13px] w-32 text-slate-300">{d.esp}</span>
              <div className="flex-1 h-3 rounded-full bg-white/[0.05] overflow-hidden relative">
                <div className="h-full rounded-full" style={{width:`${d.meta}%`,background:"#1e3a5f"}}/>
                <div className="h-full rounded-full absolute top-0 left-0" style={{width:`${d.real}%`,background:d.real>=d.meta?"#22c55e":"#ef4444"}}/>
              </div>
              <span className="text-[13px] font-bold w-12 text-right" style={{color:d.real>=d.meta?"#22c55e":"#ef4444"}}>{d.real}%</span>
              <span className="text-[12px] text-slate-500 w-16">meta {d.meta}%</span>
              <span className={`text-[12px] font-bold w-16 ${d.trend>0?"text-green-400":"text-red-400"}`}>{d.trend>0?`+${d.trend}%`:`${d.trend}%`}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function VAlertas() {
  const [al,setAl] = useState(alertasInit);
  const nl = al.filter(a=>!a.lido).length;
  return (
    <>
      <Title t="Central de Alertas" s={`${nl} alertas não lidos`}/>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[{tipo:"Crítico",qtd:3,c:"#ef4444",i:<XCircle size={20}/>},{tipo:"Grave",qtd:3,c:"#fb923c",i:<AlertTriangle size={20}/>},{tipo:"Atenção",qtd:2,c:"#facc15",i:<Bell size={20}/>},{tipo:"Info",qtd:2,c:"#3b82f6",i:<CheckCircle size={20}/>}].map((k,i)=>(
          <Card key={i} className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background:`${k.c}20`}}><span style={{color:k.c}}>{k.i}</span></div>
            <div><p className="text-slate-400 text-[12px]">{k.tipo}</p><p className="text-[28px] font-black leading-none">{k.qtd}</p></div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-black">Todos os Alertas</h2>
          <button onClick={()=>setAl(a=>a.map(x=>({...x,lido:true})))} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.03] text-[12px] text-slate-300"><CheckCircle size={14}/> Marcar todos como lidos</button>
        </div>
        <div className="space-y-2">
          {al.map((a,i)=>(
            <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${a.lido?"border-white/[0.03] bg-white/[0.01] opacity-60":"border-white/[0.06] bg-white/[0.03]"}`}>
              <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{background:SC[a.tipo]}}/>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1"><Badge status={a.tipo}/><span className="text-slate-500 text-[11px]">{a.hora}</span>{!a.lido&&<span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">NOVO</span>}</div>
                <p className="text-[13px] text-slate-200">{a.msg}</p>
              </div>
              <button onClick={()=>setAl(arr=>arr.map(x=>x.id===a.id?{...x,lido:true}:x))} className="text-slate-500 hover:text-white text-[11px] shrink-0 mt-1">{!a.lido?"Marcar lido":"✓"}</button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

// AJUSTE 1: Relatórios → área analítica com gráficos, sem botões PDF
function VRelatorios() {
  const mediaSemanal = Math.round(relSemanal.reduce((s,d)=>s+d.sla,0)/relSemanal.length);
  return (
    <>
      <Title t="Relatórios & Análises" s="Indicadores históricos de SLA · ≤ 15min · Meta: 75%"/>
      <Card className="mb-3">
        <h2 className="text-[16px] font-black mb-3">Evolução do SLA — Últimos 14 Dias</h2>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={evolucaoSLA} margin={{left:0,right:8,top:4,bottom:0}}>
              <defs><linearGradient id="gEv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="dia" stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:10,fill:"#64748b"}}/>
              <YAxis stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}} domain={[50,90]} tickFormatter={v=>`${v}%`} width={40}/>
              <ReferenceLine y={75} stroke="#facc15" strokeDasharray="4 3" label={{value:"Meta 75%",fill:"#facc15",fontSize:10,position:"insideTopRight"}}/>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f"/>
              <Tooltip contentStyle={{background:"#081120",border:"1px solid rgba(255,255,255,.06)",borderRadius:"12px",color:"#fff",fontSize:12}} formatter={(v:any)=>[`${v}%`,"SLA ≤15min"]}/>
              <Area type="monotone" dataKey="sla" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gEv)" dot={{r:3,fill:"#3b82f6"}} activeDot={{r:5}}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="grid grid-cols-12 gap-3 mb-3">
        <Card className="col-span-4">
          <h2 className="text-[16px] font-black mb-1">Relatório D-1</h2>
          <p className="text-slate-400 text-[12px] mb-4">Referência: {relDiario.data}</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <span className="text-[13px] text-slate-300">Total de atendimentos</span>
              <span className="text-[20px] font-black">{relDiario.totalAtendimentos.toLocaleString("pt-BR")}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-green-500/5 border border-green-500/20">
              <span className="text-[13px] text-slate-300">Dentro da meta (≤15min)</span>
              <span className="text-[20px] font-black text-green-400">{relDiario.dentroDaMeta.toLocaleString("pt-BR")}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <span className="text-[13px] text-slate-300">Fora da meta (&gt;15min)</span>
              <span className="text-[20px] font-black text-red-400">{relDiario.foraDaMeta.toLocaleString("pt-BR")}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <span className="text-[13px] text-slate-300">Indicador do dia</span>
              <span className="text-[28px] font-black" style={{color:relDiario.indicador>=75?"#22c55e":"#ef4444"}}>{relDiario.indicador}%</span>
            </div>
            <div className={`text-center text-[13px] font-bold py-2 rounded-xl ${relDiario.indicador>=75?"text-green-400 bg-green-400/10":"text-red-400 bg-red-400/10"}`}>
              {relDiario.indicador>=75?"✓ Meta atingida no dia":"✗ Meta não atingida no dia"}
            </div>
          </div>
        </Card>
        <Card className="col-span-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-black">Relatório Semanal — Por Dia da Semana</h2>
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-slate-400">Média semanal:</span>
              <span className="text-[16px] font-black" style={{color:mediaSemanal>=75?"#22c55e":"#ef4444"}}>{mediaSemanal}%</span>
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={relSemanal} margin={{left:0,right:8}}>
                <XAxis dataKey="dia" stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}}/>
                <YAxis stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}} domain={[50,90]} tickFormatter={v=>`${v}%`} width={40}/>
                <ReferenceLine y={75} stroke="#facc15" strokeDasharray="4 3" label={{value:"Meta 75%",fill:"#facc15",fontSize:10,position:"insideTopRight"}}/>
                <Tooltip contentStyle={{background:"#081120",border:"1px solid rgba(255,255,255,.06)",borderRadius:"12px",color:"#fff",fontSize:12}} formatter={(v:any)=>[`${v}%`,"SLA ≤15min"]}/>
                <Bar dataKey="sla" radius={[6,6,0,0]} name="SLA ≤15min">
                  {relSemanal.map((d,i)=><Cell key={i} fill={d.sla>=75?"#22c55e":"#ef4444"}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-12 gap-3 mb-3">
        <Card className="col-span-8">
          <h2 className="text-[16px] font-black mb-3">Relatório Mensal — Evolução por Semana (Mai/2025)</h2>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={relMensal} margin={{left:0,right:8}}>
                <defs><linearGradient id="gMes" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4}/><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="sem" stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}}/>
                <YAxis stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}} domain={[55,85]} tickFormatter={v=>`${v}%`} width={40}/>
                <ReferenceLine y={75} stroke="#facc15" strokeDasharray="4 3" label={{value:"Meta 75%",fill:"#facc15",fontSize:10,position:"insideTopRight"}}/>
                <Tooltip contentStyle={{background:"#081120",border:"1px solid rgba(255,255,255,.06)",borderRadius:"12px",color:"#fff",fontSize:12}} formatter={(v:any)=>[`${v}%`,"SLA ≤15min"]}/>
                <Area type="monotone" dataKey="sla" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gMes)" dot={{r:4,fill:"#8b5cf6"}}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="col-span-4">
          <h2 className="text-[16px] font-black mb-3">Comparativo Mensal</h2>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparMeses} margin={{left:0,right:8}}>
                <XAxis dataKey="mes" stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}}/>
                <YAxis stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}} domain={[55,85]} tickFormatter={v=>`${v}%`} width={40}/>
                <ReferenceLine y={75} stroke="#facc15" strokeDasharray="4 3"/>
                <Tooltip contentStyle={{background:"#081120",border:"1px solid rgba(255,255,255,.06)",borderRadius:"12px",color:"#fff",fontSize:12}} formatter={(v:any)=>[`${v}%`,"SLA ≤15min"]}/>
                <Bar dataKey="sla" radius={[6,6,0,0]}>{comparMeses.map((d,i)=><Cell key={i} fill={d.sla>=75?"#22c55e":"#ef4444"}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-12 gap-3">
        <Card className="col-span-6">
          <h2 className="text-[16px] font-black mb-3">Performance por UF — Melhor → Pior</h2>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ufPerfSLA} layout="vertical" margin={{left:8,right:32}}>
                <XAxis type="number" stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:10,fill:"#64748b"}} domain={[0,100]} tickFormatter={v=>`${v}%`}/>
                <YAxis dataKey="uf" type="category" stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#94a3b8"}} width={28}/>
                <ReferenceLine x={75} stroke="#facc15" strokeDasharray="4 3"/>
                <Tooltip contentStyle={{background:"#081120",border:"1px solid rgba(255,255,255,.06)",borderRadius:"12px",color:"#fff",fontSize:12}} formatter={(v:any)=>[`${v}%`,"SLA ≤15min"]}/>
                <Bar dataKey="sla" radius={[0,4,4,0]}>{ufPerfSLA.map((u,i)=><Cell key={i} fill={u.sla>=75?"#22c55e":"#ef4444"}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="col-span-6">
          <h2 className="text-[16px] font-black mb-3">Performance por Especialidade — Melhor → Pior</h2>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={espPerfSLA} layout="vertical" margin={{left:56,right:32}}>
                <XAxis type="number" stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:10,fill:"#64748b"}} domain={[0,100]} tickFormatter={v=>`${v}%`}/>
                <YAxis dataKey="esp" type="category" stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:10,fill:"#94a3b8"}} width={80}/>
                <ReferenceLine x={75} stroke="#facc15" strokeDasharray="4 3"/>
                <Tooltip contentStyle={{background:"#081120",border:"1px solid rgba(255,255,255,.06)",borderRadius:"12px",color:"#fff",fontSize:12}} formatter={(v:any)=>[`${v}%`,"SLA ≤15min"]}/>
                <Bar dataKey="sla" radius={[0,4,4,0]}>{espPerfSLA.map((d,i)=><Cell key={i} fill={d.sla>=75?"#22c55e":"#ef4444"}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </>
  );
}

function VConfig() {
  const [au,setAu] = useState(true);
  return (
    <>
      <Title t="Configurações" s="Preferências do sistema operacional"/>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h2 className="text-[16px] font-black mb-4">Atualização de Dados</h2>
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div><p className="text-[13px] font-medium">Atualização automática</p><p className="text-[11px] text-slate-400">Recarrega dados a cada 30s</p></div>
            <button onClick={()=>setAu(n=>!n)} className={`w-12 h-6 rounded-full transition-all relative ${au?"bg-blue-600":"bg-white/[0.1]"}`}><div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${au?"left-7":"left-1"}`}/></button>
          </div>
        </Card>
        <Card>
          <h2 className="text-[16px] font-black mb-4">Fonte de Dados</h2>
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[12px] text-slate-400 mb-1">Banco de Dados</p>
              <p className="text-[12px] font-mono text-blue-400">Firebase Firestore</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[12px] text-slate-400 mb-1">Status</p>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/><p className="text-[12px] text-green-400">Conectado</p></div>
            </div>
            <a href="/upload" className="w-full py-2.5 rounded-xl bg-[#2563EB] text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-blue-500 transition-all cursor-pointer"><RefreshCw size={14}/> Atualizar Dados</a>
          </div>
        </Card>
        <Card>
          <h2 className="text-[16px] font-black mb-4">Sobre o Sistema</h2>
          <div className="space-y-3 text-[13px]">
            {[["Versão","2.0.0"],["Ambiente","Vercel"],["Framework","Next.js + TypeScript"],["Banco","Firebase Firestore"],["UI","TailwindCSS + Recharts"]].map(([k,v])=>(
              <div key={k} className="flex justify-between py-2 border-b border-white/[0.04]"><span className="text-slate-400">{k}</span><span className="font-medium">{v}</span></div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function Page() {
  const [clock,setClock]   = useState("");
  const [nav,setNav]       = useState("Visão Geral");
  const [ac,sac]           = useState<"Linha"|"Área"|"Barras">("Linha");
  const [dashData,setDashData] = useState<DashData|null>(null);
  const [ultimaAtu,setUltimaAtu] = useState("carregando...");

  const [filterUF,setFilterUF]         = useState("Todos");
  const [filterEsp,setFilterEsp]       = useState("Todas");
  const [filterStatus,setFilterStatus] = useState("Todos");
  const [search,setSearch]             = useState("");

  useEffect(()=>{
    const fmt=()=>setClock(new Date().toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    fmt(); const id=setInterval(fmt,1000); return()=>clearInterval(id);
  },[]);

  useEffect(()=>{
    const load=async()=>{
      try {
        const res=await fetch("/api/dados");
        const data=await res.json();
        if(data.resumo){ setDashData(data); setUltimaAtu([data.turno,data.data].filter(Boolean).join(" — ")||data.atualizadoEm||"agora"); }
      } catch(e){ console.error("Erro:",e); }
    };
    load(); const id=setInterval(load,30000); return()=>clearInterval(id);
  },[]);

  const filteredHospitais = useMemo(()=>{
    if(!dashData?.hospitais) return [];
    return dashData.hospitais.filter((h:any)=>{
      if(filterUF!=="Todos"&&h.uf!==filterUF) return false;
      if(filterEsp!=="Todas"&&h.especialidade!==filterEsp) return false;
      if(filterStatus!=="Todos"&&h.status!==filterStatus) return false;
      if(search&&!`${h.unidade} ${h.uf} ${h.especialidade} ${h.motivo}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  },[dashData,filterUF,filterEsp,filterStatus,search]);

  const filteredResumo = useMemo(()=>{
    const h=filteredHospitais;
    const sorted=[...h].sort((a:any,b:any)=>b.tempoMaximoMin-a.tempoMaximoMin);
    const tempos=h.filter((x:any)=>x.tempoMaximoMin>0).map((x:any)=>x.tempoMaximoMin);
    const med=tempos.length?Math.round(tempos.reduce((a:number,b:number)=>a+b,0)/tempos.length):0;
    return {
      totalRegistros:h.length,
      totalAguardando:h.reduce((s:number,x:any)=>s+x.pacientesAguardando,0),
      totalAtendimento:h.reduce((s:number,x:any)=>s+x.pacientesAtendimento,0),
      criticos:h.filter((x:any)=>x.status==="Crítico").length,
      graves:h.filter((x:any)=>x.status==="Grave").length,
      atencao:h.filter((x:any)=>x.status==="Atenção").length,
      normais:h.filter((x:any)=>x.status==="Normal").length,
      tempoMedioFormatado:fromMin(med),
      maiorEspera:sorted[0]?.tempoMaximo||"00:00",
      maiorEsperaUnidade:sorted[0]?.unidade||"",
      maiorEsperaUF:sorted[0]?.uf||"",
    };
  },[filteredHospitais]);

  const ufs = useMemo(()=>[...new Set((dashData?.hospitais||[]).map((h:any)=>h.uf))].sort(),[dashData]);
  const especialidades = useMemo(()=>[...new Set((dashData?.hospitais||[]).map((h:any)=>h.especialidade))].sort(),[dashData]);

  const ufStatus = useMemo(()=>{
    const map:Record<string,string>={};
    filteredHospitais.forEach((h:any)=>{
      const cur=map[h.uf];
      const order=["Normal","Atenção","Grave","Crítico"];
      if(!cur||order.indexOf(h.status)>order.indexOf(cur)) map[h.uf]=h.status;
    });
    return map;
  },[filteredHospitais]);

  const rankingReal = useMemo(()=>{
    if(!filteredHospitais.length) return [];
    return [...filteredHospitais]
      .map((h:any)=>{
        const timeScore=Math.max(0,100-Math.round(h.tempoMaximoMin*0.7));
        const queueScore=Math.max(0,100-Math.min(100,h.pacientesAguardando*3));
        const score=Math.round(timeScore*0.65+queueScore*0.35);
        return {nome:`${h.unidade} - ${h.uf}`,score,med:h.tempoMaximo||"00:00",agu:h.pacientesAguardando,status:h.status,esp:h.especialidade};
      })
      .sort((a:any,b:any)=>b.score-a.score)
      .slice(0,10)
      .map((h:any,i:number)=>({...h,pos:i+1,trend:i<3?"up":i>6?"down":"same"}));
  },[filteredHospitais]);

  const specialtiesReal = useMemo(()=>{
    if(!filteredHospitais.length) return [];
    const groups:Record<string,number[]>={};
    filteredHospitais.forEach((h:any)=>{
      if(!groups[h.especialidade]) groups[h.especialidade]=[];
      if(h.tempoMaximoMin>0) groups[h.especialidade].push(h.tempoMaximoMin);
    });
    return Object.entries(groups).map(([name,times])=>{
      const avg=times.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length):0;
      const pressure=Math.min(100,Math.round(avg/1.5));
      const color=pressure>80?"#ef4444":pressure>60?"#fb923c":pressure>40?"#facc15":"#22c55e";
      return [name,fromMin(avg),color,pressure] as [string,string,string,number];
    }).sort((a,b)=>(b[3] as number)-(a[3] as number)).slice(0,7);
  },[filteredHospitais]);

  const ufDataReal = useMemo(()=>{
    if(!filteredHospitais.length) return [];
    const groups:Record<string,any>={};
    filteredHospitais.forEach((h:any)=>{
      if(!groups[h.uf]) groups[h.uf]={uf:h.uf,count:0,agu:0,criticos:0,tempos:[]};
      groups[h.uf].count++;
      groups[h.uf].agu+=h.pacientesAguardando;
      if(h.status==="Crítico") groups[h.uf].criticos++;
      if(h.tempoMaximoMin>0) groups[h.uf].tempos.push(h.tempoMaximoMin);
    });
    return Object.values(groups).map((g:any)=>{
      const avgMin=g.tempos.length?Math.round(g.tempos.reduce((a:number,b:number)=>a+b,0)/g.tempos.length):0;
      const status=g.criticos>0?"Crítico":avgMin>=90?"Grave":avgMin>=30?"Atenção":"Normal";
      return {uf:g.uf,hospitais:g.count,agu:g.agu,criticos:g.criticos,med:fromMin(avgMin),status};
    }).sort((a:any,b:any)=>b.agu-a.agu).slice(0,15);
  },[filteredHospitais]);

  const filterProps = {search,setSearch,filterUF,setFilterUF,filterEsp,setFilterEsp,filterStatus,setFilterStatus,ufs,especialidades};

  return (
    <main className="min-h-screen bg-[#020611] text-white flex overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-300px] left-[15%] w-[900px] h-[900px] rounded-full bg-blue-600/8 blur-[200px]"/>
        <div className="absolute bottom-[-200px] right-[-100px] w-[700px] h-[700px] rounded-full bg-cyan-500/8 blur-[180px]"/>
      </div>
      <aside className="w-[210px] shrink-0 bg-[#030B18]/95 border-r border-white/[0.05] px-4 py-5 flex flex-col relative z-10">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#ff6b00] flex items-center justify-center text-lg font-black">✳</div>
          <div><h1 className="text-[18px] font-black leading-tight">Hapvida</h1><p className="text-[11px] text-slate-400">Central Operacional</p></div>
        </div>
        <nav className="space-y-1">
          {NAV.map(([label,Icon,badge])=>(
            <button key={label as string} onClick={()=>setNav(label as string)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${nav===label?"bg-gradient-to-r from-[#2563EB] to-[#4F46E5] shadow-[0_4px_20px_rgba(37,99,235,.35)]":"hover:bg-white/[0.04] text-slate-300"}`}>
              <div className="flex items-center gap-2.5"><Icon size={16}/><span className="text-[14px]">{label as string}</span></div>
              {badge&&<div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold">{badge}</div>}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-[20px] border border-white/[0.06] bg-gradient-to-br from-[#0F172A] to-[#07101D] p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,.2),transparent_50%)]"/>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3"><HeartPulse size={18} className="text-[#60A5FA]"/><div><p className="text-[15px] font-black">Hapvida</p><p className="text-[11px] text-slate-400">Data Lakehouse</p></div></div>
            <p className="text-slate-400 text-[11px] leading-relaxed">Inteligência operacional em tempo real.</p>
            <div className="mt-4 h-9 rounded-xl bg-gradient-to-r from-[#123B8B] to-[#0B2B5C] border border-blue--400/20 flex items-center justify-center text-[#60A5FA] text-[12px] font-semibold tracking-widest">● LIVE DATA</div>
          </div>
        </div>
      </aside>
      <section className="flex-1 px-4 py-4 overflow-auto relative z-10">
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] flex items-center justify-center"><Menu size={18}/></button>
            <div className="flex items-center gap-3">
              <h1 className="text-[20px] font-black tracking-tight">Central Operacional — Tempo de Espera Emergência</h1>
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_12px_rgba(74,222,128,.9)]"/>
              <span className="text-slate-400 text-[12px]">Atualizado: {ultimaAtu}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] flex items-center justify-center relative"><Bell size={16}/><div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] flex items-center justify-center font-bold">8</div></button>
            <button className="w-10 h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] flex items-center justify-center"><Moon size={16}/></button>
            <div className="px-4 py-2 rounded-xl border border-white/[0.06] bg-white/[0.03] text-[13px] font-mono">{clock}</div>
          </div>
        </header>
        {nav==="Visão Geral"      && <VGeral ac={ac} sac={sac} fH={filteredHospitais} fR={filteredResumo} ufStatus={ufStatus} specialtiesReal={specialtiesReal} {...filterProps}/>}
        {nav==="Operação ao Vivo" && <VOperacao fH={filteredHospitais} fR={filteredResumo}/>}
        {nav==="Ranking"          && <VRanking rankingReal={rankingReal}/>}
        {nav==="Especialidades"   && <VEspec specialtiesReal={specialtiesReal}/>}
        {nav==="Estados (UF)"     && <VEstados ufDataReal={ufDataReal} ufStatus={ufStatus}/>}
        {nav==="SLA & Metas"      && <VSLA/>}
        {nav==="Alertas"          && <VAlertas/>}
        {nav==="Relatórios"       && <VRelatorios/>}
        {nav==="Configurações"    && <VConfig/>}
      </section>
    </main>
  );
}