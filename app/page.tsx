"use client";
import { useState, useEffect } from "react";
import {
  Bell, Activity, Clock3, Hospital, ShieldAlert, Menu, Moon, Map,
  Stethoscope, Trophy, Settings, Download, HeartPulse, Search,
  Filter, ChevronDown, AlertTriangle, CheckCircle, XCircle,
  TrendingUp, TrendingDown, Users, Zap, FileText, BarChart2,
  PieChart as PieIcon, RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, CartesianGrid,
} from "recharts";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface DashData {
  resumo: {
    totalRegistros: number;
    totalAguardando: number;
    totalAtendimento: number;
    tempoMedioFormatado: string;
    maiorEspera: string;
    maiorEsperaUnidade: string;
    maiorEsperaUF: string;
    criticos: number;
    graves: number;
    atencao: number;
    normais: number;
  };
  top10: any[];
  hospitais: any[];
  atualizadoEm: string;
  turno?: string;
  data?: string;
}

// ─── DATA ────────────────────────────────────────────────────────────────────
const sparkData = [{v:4},{v:7},{v:5},{v:8},{v:4},{v:9},{v:6},{v:8},{v:5},{v:10}];
const lineData = [
  {t:"15:00",v:48},{t:"17:00",v:41},{t:"19:00",v:35},{t:"21:00",v:46},
  {t:"23:00",v:33},{t:"01:00",v:22},{t:"03:00",v:18},{t:"05:00",v:20},
  {t:"07:00",v:26},{t:"09:00",v:31},{t:"11:00",v:19},{t:"13:00",v:24},{t:"15:00",v:34},
];
const donutDataMock = [
  {name:"< 15m",    value:133,pct:"40.7%",color:"#22c55e"},
  {name:"15m-30m",  value:89, pct:"27.2%",color:"#06b6d4"},
  {name:"30m-45m",  value:41, pct:"12.5%",color:"#3b82f6"},
  {name:"45m-1h",   value:32, pct:"9.8%", color:"#facc15"},
  {name:"1h-1h30",  value:18, pct:"5.5%", color:"#fb923c"},
  {name:"> 1h30",   value:14, pct:"4.3%", color:"#ef4444"},
];
const top10Mock = [
  ["Hospital Rio Poty - PI","4:53","#ef4444"],
  ["Hospital Teresa de Lisieux - BA","2:38","#ef4444"],
  ["PA Derby - PE","2:37","#ef4444"],
  ["Hosp Notrecare ABC - SP","2:16","#ef4444"],
  ["Hospital Salvalus - SP","2:09","#ef4444"],
  ["PA Barueri - SP","1:31","#fb923c"],
  ["Hospital Ana Lima - CE","1:29","#fb923c"],
  ["Hosp. Eugenia Pinheiro - CE","1:25","#fb923c"],
  ["Hosp Keila Ferreira Guarulhos - SP","1:25","#fb923c"],
  ["CC Cotia 1 - SP","1:23","#fb923c"],
];
const specialties = [
  ["Pediatria","00:31","#ef4444",92],
  ["Clínica Médica","00:27","#fb923c",84],
  ["Obstetrícia","00:26","#facc15",76],
  ["Ortopedia","00:24","#3b82f6",69],
  ["Ginecologia","00:22","#06b6d4",61],
  ["Traumatologia","00:21","#22c55e",55],
  ["Oftalmologia","00:18","#a78bfa",44],
];
const tableDataMock = [
  {uf:"PI",unidade:"Hospital Rio Poty",         esp:"Clínica Médica",agu:3, ate:1,max:"4:53",med:"01:15",status:"Crítico"},
  {uf:"BA",unidade:"Hospital Teresa de Lisieux",esp:"Obstetrícia",   agu:6, ate:0,max:"2:38",med:"00:58",status:"Crítico"},
  {uf:"PE",unidade:"PA Derby",                  esp:"Clínica Médica",agu:14,ate:7,max:"2:37",med:"00:47",status:"Grave"},
  {uf:"SP",unidade:"Hosp Notrecare ABC",        esp:"Pediatria",     agu:11,ate:6,max:"2:16",med:"00:42",status:"Grave"},
  {uf:"SP",unidade:"Hospital Salvalus",         esp:"Clínica Médica",agu:8, ate:6,max:"2:09",med:"00:40",status:"Grave"},
  {uf:"SP",unidade:"PA Barueri",                esp:"Pediatria",     agu:5, ate:3,max:"1:31",med:"00:31",status:"Atenção"},
  {uf:"CE",unidade:"Hospital Ana Lima",         esp:"Clínica Médica",agu:7, ate:4,max:"1:29",med:"00:29",status:"Atenção"},
  {uf:"CE",unidade:"Hosp. Eugenia Pinheiro",    esp:"Ortopedia",     agu:4, ate:2,max:"1:25",med:"00:27",status:"Atenção"},
  {uf:"GO",unidade:"Hospital Encore Goiás",     esp:"Clínica Médica",agu:2, ate:5,max:"0:22",med:"00:18",status:"Normal"},
  {uf:"MG",unidade:"Hosp. Hapvida BH",          esp:"Ortopedia",     agu:3, ate:4,max:"0:18",med:"00:14",status:"Normal"},
];
const rankingData = [
  {pos:1, nome:"Hospital Encore Goiás - GO",    score:98,med:"00:12",agu:2, status:"Normal", trend:"up"},
  {pos:2, nome:"Hosp. Hapvida BH - MG",         score:95,med:"00:14",agu:3, status:"Normal", trend:"up"},
  {pos:3, nome:"PA São Paulo Centro - SP",       score:91,med:"00:17",agu:4, status:"Normal", trend:"up"},
  {pos:4, nome:"Hapvida Fortaleza - CE",         score:87,med:"00:19",agu:5, status:"Normal", trend:"same"},
  {pos:5, nome:"Clínica Hapvida Recife - PE",    score:83,med:"00:21",agu:6, status:"Normal", trend:"up"},
  {pos:6, nome:"PA Barueri - SP",                score:72,med:"00:31",agu:5, status:"Atenção",trend:"down"},
  {pos:7, nome:"Hospital Ana Lima - CE",         score:68,med:"00:29",agu:7, status:"Atenção",trend:"same"},
  {pos:8, nome:"Hosp. Eugenia Pinheiro - CE",    score:61,med:"00:27",agu:4, status:"Atenção",trend:"down"},
  {pos:9, nome:"PA Derby - PE",                  score:44,med:"00:47",agu:14,status:"Grave",  trend:"down"},
  {pos:10,nome:"Hospital Salvalus - SP",         score:41,med:"00:40",agu:8, status:"Grave",  trend:"down"},
];
const ufData = [
  {uf:"SP",hospitais:8, agu:52,criticos:3,med:"00:38",status:"Grave"},
  {uf:"CE",hospitais:6, agu:34,criticos:2,med:"00:29",status:"Atenção"},
  {uf:"PE",hospitais:5, agu:38,criticos:2,med:"00:42",status:"Grave"},
  {uf:"BA",hospitais:4, agu:22,criticos:2,med:"00:51",status:"Crítico"},
  {uf:"PI",hospitais:2, agu:8, criticos:1,med:"01:15",status:"Crítico"},
  {uf:"GO",hospitais:3, agu:12,criticos:0,med:"00:18",status:"Normal"},
  {uf:"MG",hospitais:4, agu:15,criticos:0,med:"00:16",status:"Normal"},
  {uf:"RJ",hospitais:3, agu:18,criticos:1,med:"00:33",status:"Atenção"},
  {uf:"AM",hospitais:2, agu:9, criticos:0,med:"00:21",status:"Normal"},
  {uf:"PA",hospitais:2, agu:7, criticos:0,med:"00:19",status:"Normal"},
];
const slaData = [
  {esp:"Clínica Médica",meta:85,real:72,trend:-5},
  {esp:"Pediatria",     meta:85,real:61,trend:-12},
  {esp:"Obstetrícia",   meta:80,real:68,trend:2},
  {esp:"Ortopedia",     meta:80,real:74,trend:4},
  {esp:"Ginecologia",   meta:85,real:88,trend:6},
  {esp:"Traumatologia", meta:80,real:91,trend:8},
  {esp:"Oftalmologia",  meta:85,real:94,trend:3},
];
const slaHist = [
  {mes:"Nov",sla:71},{mes:"Dez",sla:68},{mes:"Jan",sla:73},
  {mes:"Fev",sla:70},{mes:"Mar",sla:75},{mes:"Abr",sla:72},{mes:"Mai",sla:68},
];
const alertasInit = [
  {id:1, tipo:"Crítico",msg:"Hospital Rio Poty - PI: tempo de espera 4h53 — maior da rede",       hora:"15:24",lido:false},
  {id:2, tipo:"Crítico",msg:"Hospital Teresa - BA: 6 pacientes aguardando sem atendimento",        hora:"15:21",lido:false},
  {id:3, tipo:"Crítico",msg:"PA Derby - PE: 14 pacientes na fila — capacidade excedida",           hora:"15:18",lido:false},
  {id:4, tipo:"Grave",  msg:"Hosp Notrecare ABC - SP: SLA violado nas últimas 2 horas",            hora:"15:10",lido:false},
  {id:5, tipo:"Grave",  msg:"Hospital Salvalus - SP: médico ausente — Clínica Médica",             hora:"15:05",lido:false},
  {id:6, tipo:"Grave",  msg:"PA Barueri - SP: tempo médio subiu 8 min na última hora",             hora:"14:58",lido:true},
  {id:7, tipo:"Atenção",msg:"Hospital Ana Lima - CE: fila aumentando — monitorar",                  hora:"14:45",lido:true},
  {id:8, tipo:"Atenção",msg:"Hosp. Eugenia Pinheiro - CE: 4 pacientes aguardando ortopedia",       hora:"14:32",lido:true},
  {id:9, tipo:"Info",   msg:"14 hospitais sincronizados com sucesso",                               hora:"14:00",lido:true},
  {id:10,tipo:"Info",   msg:"Relatório diário gerado com sucesso",                                  hora:"13:00",lido:true},
];
const SC: Record<string,string> = {
  Crítico:"#ef4444",Grave:"#fb923c",Atenção:"#facc15",Normal:"#22c55e",Info:"#3b82f6",
};
const NAV: [string,any,string?][] = [
  ["Visão Geral",Activity],["Operação ao Vivo",Clock3],["Ranking",Trophy],
  ["Especialidades",Stethoscope],["Estados (UF)",Map],["SLA & Metas",ShieldAlert],
  ["Alertas",Bell,"14"],["Relatórios",Download],["Configurações",Settings],
];

// ─── ATOMS ───────────────────────────────────────────────────────────────────
function Spark({color}:{color:string}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={sparkData}><Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false}/></LineChart>
    </ResponsiveContainer>
  );
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
function BrazilMap() {
  return (
    <svg viewBox="0 0 580 580" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path d="M70 90 L180 70 L280 80 L320 110 L310 160 L280 200 L220 230 L160 240 L100 220 L60 180 Z" fill="#22c55e" stroke="#0a1a2e" strokeWidth="2"/>
      <path d="M180 40 L240 30 L270 60 L280 80 L180 70 Z" fill="#22c55e" stroke="#0a1a2e" strokeWidth="2"/>
      <path d="M280 80 L370 60 L400 90 L390 130 L360 160 L320 150 L310 110 Z" fill="#22c55e" stroke="#0a1a2e" strokeWidth="2"/>
      <path d="M370 60 L430 65 L460 90 L450 130 L410 155 L390 130 L400 90 Z" fill="#fb923c" stroke="#0a1a2e" strokeWidth="2"/>
      <path d="M430 65 L500 60 L530 80 L540 120 L510 155 L470 160 L450 130 L460 90 Z" fill="#ef4444" stroke="#0a1a2e" strokeWidth="2"/>
      <path d="M310 160 L360 160 L390 130 L410 155 L400 210 L370 250 L330 260 L290 240 L280 200 Z" fill="#facc15" stroke="#0a1a2e" strokeWidth="2"/>
      <path d="M410 155 L450 130 L470 160 L510 155 L520 200 L490 260 L440 290 L400 270 L380 240 L400 210 Z" fill="#ef4444" stroke="#0a1a2e" strokeWidth="2"/>
      <path d="M160 240 L220 230 L280 200 L290 240 L270 290 L230 310 L180 300 L150 270 Z" fill="#22c55e" stroke="#0a1a2e" strokeWidth="2"/>
      <path d="M230 310 L270 290 L290 240 L330 260 L340 310 L310 350 L270 360 L240 340 Z" fill="#facc15" stroke="#0a1a2e" strokeWidth="2"/>
      <path d="M370 250 L400 270 L440 290 L450 340 L420 380 L380 390 L340 370 L330 330 L340 310 L370 290 Z" fill="#fb923c" stroke="#0a1a2e" strokeWidth="2"/>
      <path d="M450 340 L490 320 L510 355 L490 390 L460 400 L440 380 L420 380 Z" fill="#ef4444" stroke="#0a1a2e" strokeWidth="2"/>
      <path d="M310 350 L340 370 L380 390 L390 430 L360 460 L320 450 L290 420 L290 390 Z" fill="#ef4444" stroke="#0a1a2e" strokeWidth="2"/>
      <path d="M290 420 L320 450 L350 470 L340 500 L300 510 L270 490 L260 460 Z" fill="#fb923c" stroke="#0a1a2e" strokeWidth="2"/>
      <path d="M270 490 L300 510 L310 530 L280 545 L255 530 L250 510 Z" fill="#22c55e" stroke="#0a1a2e" strokeWidth="2"/>
      <path d="M250 510 L255 530 L280 545 L270 570 L240 575 L210 560 L200 535 L220 515 Z" fill="#22c55e" stroke="#0a1a2e" strokeWidth="2"/>
      <path d="M100 270 L150 270 L180 300 L170 340 L130 350 L90 330 L80 290 Z" fill="#22c55e" stroke="#0a1a2e" strokeWidth="2"/>
    </svg>
  );
}

// ─── VIEWS ────────────────────────────────────────────────────────────────────
function VGeral({ac,sac,dash}:any) {
  const r = dash?.resumo;
  const tot = r?.totalRegistros || 1;

  // Dados reais do Firestore com fallback para mock
  const t10 = dash?.top10?.slice(0,10).map((h:any) => [
    `${h.unidade} - ${h.uf}`,
    h.tempoMaximo,
    h.status==="Crítico"?"#ef4444":h.status==="Grave"?"#fb923c":"#facc15"
  ]) || top10Mock;

  const tbl = dash?.hospitais?.map((h:any) => ({
    uf: h.uf, unidade: h.unidade, esp: h.especialidade,
    agu: h.pacientesAguardando, ate: h.pacientesAtendimento,
    max: h.tempoMaximo, med: "-", status: h.status,
  })) || tableDataMock;

  const donut = r ? [
    {name:"Normal",  value:r.normais,  pct:`${Math.round(r.normais/tot*100)}%`,  color:"#22c55e"},
    {name:"Atenção", value:r.atencao,  pct:`${Math.round(r.atencao/tot*100)}%`,  color:"#06b6d4"},
    {name:"Grave",   value:r.graves,   pct:`${Math.round(r.graves/tot*100)}%`,   color:"#fb923c"},
    {name:"Crítico", value:r.criticos, pct:`${Math.round(r.criticos/tot*100)}%`, color:"#ef4444"},
  ] : donutDataMock;

  const totalDonut = r?.totalRegistros || 327;

  return (
    <>
      <div className="grid grid-cols-6 gap-3 mb-3">
        <KPI title="Pacientes Aguardando" value={String(r?.totalAguardando ?? 327)}   trend="12%"      sub="vs último período" color="#8B5CF6" icon={<Hospital size={20}/>}/>
        <KPI title="Em Atendimento"       value={String(r?.totalAtendimento ?? 184)}  trend="8%"       sub="vs último período" color="#3B82F6" icon={<Activity size={20}/>}/>
        <KPI title="Tempo Médio"          value={r?.tempoMedioFormatado ?? "00:28"}   trend="5 min"    sub="vs último período" color="#F59E0B" icon={<Clock3 size={20}/>}/>
        <KPI title="Maior Espera"         value={r?.maiorEspera ?? "04:53"}           trend={r?.maiorEsperaUnidade ?? "Rio Poty"} sub={r?.maiorEsperaUF ?? "PI"} color="#EF4444" icon={<ShieldAlert size={20}/>}/>
        <KPI title="Hospitais Críticos"   value={String(r?.criticos ?? 14)}           trend="3 novos"  sub="críticos"          color="#EF4444" icon={<Bell size={20}/>}/>
        <KPI title="SLA < 30 min"         value="68,4%"                               trend="6,2%"     sub="vs último período" color="#22C55E" icon={<ShieldAlert size={20}/>}/>
      </div>
      <div className="grid grid-cols-12 gap-3 mb-3">
        <Card className="col-span-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,.12),transparent_50%)]"/>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-black">Mapa de Criticidade por Estado</h2>
              <div className="flex flex-col gap-1">{["+","−","⤢"].map(b=><button key={b} className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-sm">{b}</button>)}</div>
            </div>
            <div className="rounded-[16px] border border-white/[0.06] bg-[#030D1A] h-[300px] relative flex items-center justify-center p-2 overflow-hidden">
              <div className="relative z-10 w-full h-full flex items-center justify-center"><BrazilMap/></div>
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
            {t10.map(([n,t,c]:any,i:number)=>(
              <div key={i} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 border border-white/[0.03]">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-[12px] text-slate-400">{i+1}</div>
                  <span className="text-[13px] text-slate-200">{n}</span>
                </div>
                <span className="text-[20px] font-black" style={{color:c}}>{t}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="col-span-4">
          <h2 className="text-[16px] font-black mb-3">Distribuição por Tempo de Espera</h2>
          <div className="flex items-center h-[300px] gap-2">
            <div className="w-[55%] h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={donut} dataKey="value" innerRadius={65} outerRadius={105} paddingAngle={2} stroke="transparent">{donut.map((e:any,i:number)=><Cell key={i} fill={e.color}/>)}</Pie></PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[44px] font-black leading-none">{totalDonut}</span>
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
                <Tooltip contentStyle={{background:"#081120",border:"1px solid rgba(255,255,255,.06)",borderRadius:"12px",color:"#fff",fontSize:12}} formatter={(v:any)=>[`${v} min`,"Tempo médio"]}/>
                <Area type="monotone" dataKey="v" stroke="#3B82F6" strokeWidth={2.5} fill="url(#gB)" dot={{r:3,fill:"#3B82F6"}} activeDot={{r:5}}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="col-span-4">
          <div className="flex items-center gap-2 mb-4"><h2 className="text-[16px] font-black">Por Especialidade</h2><span className="text-slate-400 text-[11px]">(média de espera)</span></div>
          <div className="space-y-4">
            {specialties.map(([n,t,c,p],i)=>(
              <div key={i}>
                <div className="flex items-center justify-between mb-1"><span className="text-[13px]">{n as string}</span><span className="text-slate-400 text-[12px]">{t as string}</span></div>
                <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden"><div className="h-full rounded-full" style={{width:`${p as number}%`,background:c as string,boxShadow:`0 0 12px ${c as string}80`}}/></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-black">Hospitais em Tempo Real</h2>
          <div className="flex items-center gap-2">
            <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" placeholder="Buscar hospital, unidade ou especialidade..." className="bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-[13px] text-slate-300 placeholder-slate-500 outline-none focus:border-blue-500/50 w-72"/></div>
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.03] text-[13px] text-slate-300"><Filter size={14}/> Filtros</button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.03] text-[13px] text-slate-300">Todas UF <ChevronDown size={12}/></button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.03] text-[13px] text-slate-300">Todas Especialidades <ChevronDown size={12}/></button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.03] text-[13px] text-slate-300"><Download size={14}/> Exportar</button>
          </div>
        </div>
        <table className="w-full">
          <thead><tr className="border-b border-white/[0.06]">{["UF","Unidade","Especialidade","Aguardando","Em Atendimento","Tempo Máximo","Média Espera","Status","Tendência"].map(h=><th key={h} className="text-left pb-3 pr-4 text-[12px] text-slate-400 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{tbl.map((r:any,i:number)=><tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"><td className="py-2.5 pr-4 text-[13px] font-bold text-slate-300">{r.uf}</td><td className="py-2.5 pr-4 text-[13px]">{r.unidade}</td><td className="py-2.5 pr-4 text-[13px] text-slate-300">{r.esp}</td><td className="py-2.5 pr-4 text-[13px] font-bold">{r.agu}</td><td className="py-2.5 pr-4 text-[13px]">{r.ate}</td><td className="py-2.5 pr-4 text-[13px] font-bold" style={{color:SC[r.status]}}>{r.max}</td><td className="py-2.5 pr-4 text-[13px]">{r.med}</td><td className="py-2.5 pr-4"><Badge status={r.status}/></td><td className="py-2.5"><Tiny color={SC[r.status]}/></td></tr>)}</tbody>
        </table>
      </Card>
    </>
  );
}

function VOperacao({dash}:any) {
  const r = dash?.resumo;
  const tbl = dash?.hospitais?.map((h:any) => ({
    uf:h.uf, unidade:h.unidade, esp:h.especialidade,
    agu:h.pacientesAguardando, ate:h.pacientesAtendimento,
    max:h.tempoMaximo, med:"-", status:h.status,
  })) || tableDataMock;

  return (
    <>
      <Title t="Operação ao Vivo" s="Monitoramento em tempo real · atualiza a cada 30s"/>
      <div className="grid grid-cols-4 gap-3 mb-3">
        {[
          {l:"Hospitais Online",v:String(r?.totalRegistros ?? 47),   i:<Zap size={18}/>,        c:"#22c55e"},
          {l:"Críticos",        v:String(r?.criticos ?? 14),         i:<AlertTriangle size={18}/>,c:"#ef4444"},
          {l:"Total na Fila",   v:String(r?.totalAguardando ?? 327), i:<Users size={18}/>,       c:"#8b5cf6"},
          {l:"Atendidos hoje",  v:"1.284",                           i:<CheckCircle size={18}/>, c:"#06b6d4"},
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
          <table className="w-full">
            <thead><tr className="border-b border-white/[0.06]">{["UF","Unidade","Especialidade","Fila","Atend.","Máx","Média","Status"].map(h=><th key={h} className="text-left pb-2 pr-3 text-[11px] text-slate-400 font-medium">{h}</th>)}</tr></thead>
            <tbody>{tbl.map((r:any,i:number)=><tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]"><td className="py-2 pr-3 text-[12px] font-bold text-slate-300">{r.uf}</td><td className="py-2 pr-3 text-[12px]">{r.unidade}</td><td className="py-2 pr-3 text-[12px] text-slate-400">{r.esp}</td><td className="py-2 pr-3 text-[12px] font-black" style={{color:r.agu>8?"#ef4444":r.agu>4?"#fb923c":"#22c55e"}}>{r.agu}</td><td className="py-2 pr-3 text-[12px]">{r.ate}</td><td className="py-2 pr-3 text-[12px] font-bold" style={{color:SC[r.status]}}>{r.max}</td><td className="py-2 pr-3 text-[12px]">{r.med}</td><td className="py-2"><Badge status={r.status}/></td></tr>)}</tbody>
          </table>
        </Card>
        <Card className="col-span-4">
          <h2 className="text-[16px] font-black mb-3">Fila por Estado</h2>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ufData.slice(0,7)} layout="vertical" margin={{left:8,right:16}}>
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

function VRanking() {
  return (
    <>
      <Title t="Ranking de Hospitais" s="Classificação por performance e SLA"/>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {rankingData.slice(0,3).map((r,i)=>(
          <Card key={i} className="text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{background:`radial-gradient(circle at center,${["#facc15","#94a3b8","#b45309"][i]},transparent 60%)`}}/>
            <div className="relative z-10">
              <div className="text-[40px] mb-2">{["🥇","🥈","🥉"][i]}</div>
              <p className="text-[13px] text-slate-300 font-medium mb-1">{r.nome}</p>
              <div className="text-[42px] font-black" style={{color:["#facc15","#94a3b8","#b45309"][i]}}>{r.score}</div>
              <p className="text-slate-400 text-[12px]">Score de performance</p>
              <div className="mt-3 flex justify-center gap-3 text-[12px]">
                <span className="text-slate-400">Média: <span className="text-white font-bold">{r.med}</span></span>
                <span className="text-slate-400">Fila: <span className="text-white font-bold">{r.agu}</span></span>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="text-[16px] font-black mb-4">Classificação Completa</h2>
        <table className="w-full">
          <thead><tr className="border-b border-white/[0.06]">{["Pos","Hospital","Score","Média","Fila","Status","Tendência"].map(h=><th key={h} className="text-left pb-3 pr-4 text-[12px] text-slate-400 font-medium">{h}</th>)}</tr></thead>
          <tbody>{rankingData.map((r,i)=>(
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

function VEspec() {
  return (
    <>
      <Title t="Por Especialidade" s="Análise de tempo de espera por área médica"/>
      <div className="grid grid-cols-4 gap-3 mb-3">
        {specialties.map(([n,t,c,p],i)=>(
          <Card key={i}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${c as string}20`}}><Stethoscope size={18} style={{color:c as string}}/></div>
              <Badge status={(p as number)>80?"Crítico":(p as number)>65?"Grave":(p as number)>50?"Atenção":"Normal"}/>
            </div>
            <p className="text-slate-400 text-[12px]">{n as string}</p>
            <p className="text-[28px] font-black mt-1">{t as string}</p>
            <div className="mt-3 h-2 rounded-full bg-white/[0.05] overflow-hidden"><div className="h-full rounded-full" style={{width:`${p as number}%`,background:c as string,boxShadow:`0 0 10px ${c as string}80`}}/></div>
            <p className="text-slate-500 text-[11px] mt-1">Pressão: {p as number}%</p>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-12 gap-3">
        <Card className="col-span-7">
          <h2 className="text-[16px] font-black mb-3">Pressão de Fila por Especialidade</h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={specialties.map(([n,,c,p])=>({name:(n as string).substring(0,9),v:p as number}))} margin={{left:0,right:8}}>
                <XAxis dataKey="name" stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}}/>
                <YAxis stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}} domain={[0,100]}/>
                <Tooltip contentStyle={{background:"#081120",border:"1px solid rgba(255,255,255,.06)",borderRadius:"12px",color:"#fff",fontSize:12}}/>
                <Bar dataKey="v" radius={[6,6,0,0]} name="Pressão">{specialties.map(([,,c],i)=><Cell key={i} fill={c as string}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="col-span-5">
          <h2 className="text-[16px] font-black mb-3">Radar de Especialidades</h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={specialties.map(([n,,,p])=>({esp:(n as string).substring(0,6),val:p as number}))}>
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

function VEstados() {
  return (
    <>
      <Title t="Por Estado (UF)" s="Visão consolidada por unidade federativa"/>
      <div className="grid grid-cols-12 gap-3">
        <Card className="col-span-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,.12),transparent_50%)]"/>
          <h2 className="text-[16px] font-black mb-3 relative z-10">Mapa de Criticidade</h2>
          <div className="rounded-[16px] border border-white/[0.06] bg-[#030D1A] h-[360px] relative flex items-center justify-center p-2 overflow-hidden">
            <div className="relative z-10 w-full h-full flex items-center justify-center"><BrazilMap/></div>
          </div>
        </Card>
        <Card className="col-span-8">
          <h2 className="text-[16px] font-black mb-3">Desempenho por UF</h2>
          <table className="w-full">
            <thead><tr className="border-b border-white/[0.06]">{["UF","Hospitais","Aguardando","Críticos","Média Espera","Status"].map(h=><th key={h} className="text-left pb-3 pr-4 text-[12px] text-slate-400 font-medium">{h}</th>)}</tr></thead>
            <tbody>{ufData.map((r,i)=><tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]"><td className="py-3 pr-4"><span className="text-[16px] font-black" style={{color:SC[r.status]}}>{r.uf}</span></td><td className="py-3 pr-4 text-[13px]">{r.hospitais}</td><td className="py-3 pr-4 text-[13px] font-bold">{r.agu}</td><td className="py-3 pr-4 text-[13px] font-bold" style={{color:r.criticos>0?"#ef4444":"#22c55e"}}>{r.criticos}</td><td className="py-3 pr-4 text-[13px]">{r.med}</td><td className="py-3"><Badge status={r.status}/></td></tr>)}</tbody>
          </table>
        </Card>
      </div>
    </>
  );
}

function VSLA() {
  return (
    <>
      <Title t="SLA & Metas" s="Acompanhamento dos indicadores de nível de serviço"/>
      <div className="grid grid-cols-4 gap-3 mb-3">
        {[{l:"SLA Geral",v:"68,4%",m:"85%",ok:false,c:"#ef4444"},{l:"Hospitais no SLA",v:"33/47",m:"47",ok:false,c:"#fb923c"},{l:"Meta do Mês",v:"75%",m:"85%",ok:false,c:"#facc15"},{l:"Melhor UF",v:"MG",m:"94%",ok:true,c:"#22c55e"}].map((k,i)=>(
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
          <h2 className="text-[16px] font-black mb-3">SLA por Especialidade vs Meta</h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slaData} margin={{left:0,right:8}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f"/>
                <XAxis dataKey="esp" stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:10,fill:"#64748b"}}/>
                <YAxis stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}} domain={[0,100]} tickFormatter={v=>`${v}%`}/>
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
                <YAxis stroke="#334155" axisLine={false} tickLine={false} tick={{fontSize:11,fill:"#64748b"}} domain={[60,90]} tickFormatter={v=>`${v}%`} width={40}/>
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
                <div className="h-full rounded-full absolute top-0 left-0" style={{width:`${d.real}%`,background:d.real>=d.meta?"#22c55e":"#ef4444",boxShadow:`0 0 10px ${d.real>=d.meta?"#22c55e":"#ef4444"}80`}}/>
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

function VRelatorios() {
  return (
    <>
      <Title t="Relatórios" s="Geração e exportação de relatórios operacionais"/>
      <div className="grid grid-cols-3 gap-3">
        {[
          {titulo:"Relatório Diário",    desc:"Resumo do dia com todos os indicadores", icon:<FileText size={24}/>,   color:"#3b82f6",freq:"Diário"},
          {titulo:"Relatório Semanal",   desc:"Análise de tendências da semana",         icon:<BarChart2 size={24}/>,  color:"#8b5cf6",freq:"Semanal"},
          {titulo:"Relatório Mensal",    desc:"Consolidado mensal com comparativos",     icon:<PieIcon size={24}/>,    color:"#06b6d4",freq:"Mensal"},
          {titulo:"SLA por Hospital",    desc:"Detalhamento do SLA por unidade",         icon:<ShieldAlert size={24}/>,color:"#22c55e",freq:"Semanal"},
          {titulo:"Ranking de UF",       desc:"Performance por estado federativo",       icon:<Map size={24}/>,        color:"#f59e0b",freq:"Mensal"},
          {titulo:"Por Especialidade",   desc:"Tempo de espera por área médica",         icon:<Stethoscope size={24}/>,color:"#ef4444",freq:"Semanal"},
        ].map((r,i)=>(
          <Card key={i} className="cursor-pointer hover:border-white/[0.15] transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background:`${r.color}20`}}><span style={{color:r.color}}>{r.icon}</span></div>
              <span className="text-[11px] text-slate-400 bg-white/[0.05] px-2 py-1 rounded-lg">{r.freq}</span>
            </div>
            <h3 className="text-[15px] font-bold mb-1">{r.titulo}</h3>
            <p className="text-slate-400 text-[12px] mb-4">{r.desc}</p>
            <button className="w-full py-2 rounded-xl border border-white/[0.06] bg-white/[0.03] text-[13px] text-slate-300 hover:bg-white/[0.07] transition-all flex items-center justify-center gap-2"><Download size={14}/> Exportar PDF</button>
          </Card>
        ))}
      </div>
    </>
  );
}

function VConfig() {
  const [iv,setIv] = useState("30");
  const [au,setAu] = useState(true);
  return (
    <>
      <Title t="Configurações" s="Preferências do sistema operacional"/>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h2 className="text-[16px] font-black mb-4">Atualização de Dados</h2>
          <div className="space-y-4">
            <div>
              <label className="text-[13px] text-slate-400 block mb-2">Intervalo de atualização</label>
              <select value={iv} onChange={e=>setIv(e.target.value)} className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-white outline-none">
                <option value="10">A cada 10 segundos</option>
                <option value="30">A cada 30 segundos</option>
                <option value="60">A cada 1 minuto</option>
                <option value="300">A cada 5 minutos</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div><p className="text-[13px] font-medium">Atualização automática</p><p className="text-[11px] text-slate-400">Recarrega dados automaticamente</p></div>
              <button onClick={()=>setAu(n=>!n)} className={`w-12 h-6 rounded-full transition-all relative ${au?"bg-blue-600":"bg-white/[0.1]"}`}><div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${au?"left-7":"left-1"}`}/></button>
            </div>
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
            <a href="/upload" className="w-full py-2.5 rounded-xl bg-[#2563EB] text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-blue-500 transition-all"><RefreshCw size={14}/> Atualizar Dados</a>
          </div>
        </Card>
        <Card>
          <h2 className="text-[16px] font-black mb-4">Sobre o Sistema</h2>
          <div className="space-y-3 text-[13px]">
            {[["Versão","1.0.0"],["Ambiente","Vercel"],["Framework","Next.js + TypeScript"],["Banco","Firebase Firestore"],["UI","TailwindCSS + Recharts"]].map(([k,v])=>(
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
  const [clock,setClock]  = useState("");
  const [nav,setNav]      = useState("Visão Geral");
  const [ac,sac]          = useState<"Linha"|"Área"|"Barras">("Linha");
  const [dashData, setDashData] = useState<DashData | null>(null);
  const [ultimaAtu, setUltimaAtu] = useState("carregando...");

  useEffect(()=>{
    const fmt=()=>setClock(new Date().toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    fmt(); const id=setInterval(fmt,1000); return()=>clearInterval(id);
  },[]);

  useEffect(()=>{
    const load = async () => {
      try {
        const res = await fetch("/api/dados");
        const data = await res.json();
        if (data.resumo) {
          setDashData(data);
          const info = [data.turno, data.data].filter(Boolean).join(" — ");
          setUltimaAtu(info || data.atualizadoEm || "agora");
        }
      } catch(e) {
        console.error("Erro ao buscar dados:", e);
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  },[]);

  return (
    <main className="min-h-screen bg-[#020611] text-white flex overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-300px] left-[15%] w-[900px] h-[900px] rounded-full bg-blue-600/8 blur-[200px]"/>
        <div className="absolute bottom-[-200px] right-[-100px] w-[700px] h-[700px] rounded-full bg-cyan-500/8 blur-[180px]"/>
      </div>

      {/* SIDEBAR */}
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
            <div className="mt-4 h-9 rounded-xl bg-gradient-to-r from-[#123B8B] to-[#0B2B5C] border border-blue-400/20 flex items-center justify-center text-[#60A5FA] text-[12px] font-semibold tracking-widest">● LIVE DATA</div>
          </div>
        </div>
      </aside>

      {/* CONTENT */}
      <section className="flex-1 px-4 py-4 overflow-auto relative z-10">
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] flex items-center justify-center"><Menu size={18}/></button>
            <div className="flex items-center gap-3">
              <h1 className="text-[20px] font-black tracking-tight">Central Operacional — Tempo de Espera Médica</h1>
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

        {nav==="Visão Geral"      && <VGeral ac={ac} sac={sac} dash={dashData}/>}
        {nav==="Operação ao Vivo" && <VOperacao dash={dashData}/>}
        {nav==="Ranking"          && <VRanking/>}
        {nav==="Especialidades"   && <VEspec/>}
        {nav==="Estados (UF)"     && <VEstados/>}
        {nav==="SLA & Metas"      && <VSLA/>}
        {nav==="Alertas"          && <VAlertas/>}
        {nav==="Relatórios"       && <VRelatorios/>}
        {nav==="Configurações"    && <VConfig/>}
      </section>
    </main>
  );
}