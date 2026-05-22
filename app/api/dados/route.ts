import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

// ── In-memory cache (persists while Vercel function is warm) ──────────────────
let cachedData: any = null;
let cachedAt: string = "";

// ── POST — recebe Excel em base64 do Power Automate ───────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { excel, filename } = body;

    if (!excel) {
      return NextResponse.json({ ok: false, erro: "Campo 'excel' não enviado" }, { status: 400 });
    }

    const buffer = Buffer.from(excel, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const parsed = parseWorkbook(workbook, filename || "");
    cachedData = parsed;
    cachedAt = new Date().toISOString();

    console.log(`[/api/dados POST] Dados atualizados: ${parsed.resumo.totalRegistros} registros`);
    return NextResponse.json({ ok: true, registros: parsed.resumo.totalRegistros, atualizadoEm: cachedAt });

  } catch (err) {
    console.error("[/api/dados POST] Erro:", err);
    return NextResponse.json({ ok: false, erro: String(err) }, { status: 500 });
  }
}

// ── GET — retorna dados em cache ou mock ──────────────────────────────────────
export async function GET() {
  try {
    if (cachedData) {
      return NextResponse.json({ ...cachedData, fonte: "cache", cachedAt });
    }

    // Tenta buscar do OneDrive se configurado
    const url = process.env.ONEDRIVE_EXCEL_URL;
    if (url) {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const parsed = parseWorkbook(workbook, "onedrive");
        cachedData = parsed;
        cachedAt = new Date().toISOString();
        return NextResponse.json({ ...parsed, fonte: "onedrive", cachedAt });
      }
    }

    // Fallback: mock data
    return NextResponse.json({ ...mockData(), fonte: "mock" });

  } catch (err) {
    console.error("[/api/dados GET] Erro:", err);
    return NextResponse.json({ ...mockData(), fonte: "mock" });
  }
}

// ── Parser de workbook ────────────────────────────────────────────────────────
function parseWorkbook(workbook: XLSX.WorkBook, filename: string) {
  // Prioriza aba GERAL, senão usa a última aba com dados
  let sheetName = workbook.SheetNames.find(n => n.toUpperCase().includes("GERAL"))
    || workbook.SheetNames[workbook.SheetNames.length - 1];

  const sheet = workbook.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  // Encontra linha de cabeçalho (UF / Unidade)
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[0]).trim().toUpperCase() === "UF" || String(r[1]).trim().toUpperCase() === "UNIDADE") {
      headerIdx = i;
      break;
    }
  }

  // Extrai metadados (primeiras linhas)
  let atualizacaoBI = "";
  for (let i = 0; i < (headerIdx > 0 ? headerIdx : 5); i++) {
    const cell = String(rows[i]?.[0] || "");
    if (cell.includes("Atualização BI:")) atualizacaoBI = cell.replace("Atualização BI:", "").trim();
  }

  if (headerIdx === -1) return { ...mockData(), aviso: "Cabeçalho não encontrado" };

  const hospitais: any[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const uf = String(r[0] || "").trim();
    const unidade = String(r[1] || "").trim();
    if (!uf && !unidade) continue;
    if (uf.toUpperCase() === "TOTAL") break;

    const tempoStr = String(r[5] || "").trim();
    const tempoMin = toMinutes(tempoStr);

    hospitais.push({
      uf,
      unidade,
      especialidade:        String(r[2] || "").trim(),
      pacientesAguardando:  Number(r[3]) || 0,
      pacientesAtendimento: Number(r[4]) || 0,
      tempoMaximo:          tempoStr,
      tempoMaximoMin:       tempoMin,
      status:               classifyStatus(tempoMin),
      motivo:               String(r[6] || "").trim(),
      observacoes:          String(r[7] || "").trim(),
    });
  }

  const sorted = [...hospitais].sort((a, b) => b.tempoMaximoMin - a.tempoMaximoMin);
  const temposValidos = hospitais.filter(h => h.tempoMaximoMin > 0).map(h => h.tempoMaximoMin);
  const tempoMedio = temposValidos.length
    ? Math.round(temposValidos.reduce((a, b) => a + b, 0) / temposValidos.length) : 0;

  return {
    ok: true,
    atualizadoEm: atualizacaoBI || new Date().toISOString(),
    arquivo: filename,
    aba: sheetName,
    resumo: {
      totalRegistros:      hospitais.length,
      totalAguardando:     hospitais.reduce((s, h) => s + h.pacientesAguardando, 0),
      totalAtendimento:    hospitais.reduce((s, h) => s + h.pacientesAtendimento, 0),
      tempoMedioFormatado: fromMinutes(tempoMedio),
      maiorEspera:         sorted[0]?.tempoMaximo || "00:00",
      maiorEsperaUnidade:  sorted[0]?.unidade || "",
      maiorEsperaUF:       sorted[0]?.uf || "",
      criticos:            hospitais.filter(h => h.status === "Crítico").length,
      graves:              hospitais.filter(h => h.status === "Grave").length,
      atencao:             hospitais.filter(h => h.status === "Atenção").length,
      normais:             hospitais.filter(h => h.status === "Normal").length,
    },
    top10:    sorted.slice(0, 10),
    hospitais: sorted,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function toMinutes(t: string): number {
  if (!t || t === "*") return 0;
  const mMin = t.match(/^(\d+)\s*MIN$/i);
  if (mMin) return parseInt(mMin[1]);
  const mHora = t.match(/^(\d+):(\d{2})$/);
  if (mHora) return parseInt(mHora[1]) * 60 + parseInt(mHora[2]);
  return 0;
}
function fromMinutes(m: number): string {
  if (!m) return "00:00";
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function classifyStatus(min: number): string {
  if (min >= 90) return "Crítico";
  if (min >= 30) return "Grave";
  if (min >= 15) return "Atenção";
  return "Normal";
}

// ── Mock data ─────────────────────────────────────────────────────────────────
function mockData() {
  const hospitais = [
    { uf:"PI", unidade:"Hospital Rio Poty",         especialidade:"Clínica Médica", pacientesAguardando:3,  pacientesAtendimento:1, tempoMaximo:"4:53", tempoMaximoMin:293, status:"Crítico", motivo:"", observacoes:"" },
    { uf:"BA", unidade:"Hospital Teresa de Lisieux",especialidade:"Obstetrícia",    pacientesAguardando:6,  pacientesAtendimento:0, tempoMaximo:"2:38", tempoMaximoMin:158, status:"Crítico", motivo:"", observacoes:"" },
    { uf:"PE", unidade:"PA Derby",                  especialidade:"Clínica Médica", pacientesAguardando:14, pacientesAtendimento:7, tempoMaximo:"2:37", tempoMaximoMin:157, status:"Crítico", motivo:"", observacoes:"" },
    { uf:"SP", unidade:"Hosp Notrecare ABC",         especialidade:"Pediatria",      pacientesAguardando:11, pacientesAtendimento:6, tempoMaximo:"2:16", tempoMaximoMin:136, status:"Crítico", motivo:"", observacoes:"" },
    { uf:"SP", unidade:"Hospital Salvalus",          especialidade:"Clínica Médica", pacientesAguardando:8,  pacientesAtendimento:6, tempoMaximo:"2:09", tempoMaximoMin:129, status:"Crítico", motivo:"", observacoes:"" },
    { uf:"SP", unidade:"PA Barueri",                 especialidade:"Pediatria",      pacientesAguardando:5,  pacientesAtendimento:3, tempoMaximo:"1:31", tempoMaximoMin:91,  status:"Crítico", motivo:"", observacoes:"" },
    { uf:"CE", unidade:"Hospital Ana Lima",          especialidade:"Clínica Médica", pacientesAguardando:7,  pacientesAtendimento:4, tempoMaximo:"1:29", tempoMaximoMin:89,  status:"Grave",  motivo:"", observacoes:"" },
    { uf:"CE", unidade:"Hosp. Eugenia Pinheiro",     especialidade:"Ortopedia",      pacientesAguardando:4,  pacientesAtendimento:2, tempoMaximo:"1:25", tempoMaximoMin:85,  status:"Grave",  motivo:"", observacoes:"" },
    { uf:"GO", unidade:"Hospital Encore Goiás",      especialidade:"Clínica Médica", pacientesAguardando:2,  pacientesAtendimento:5, tempoMaximo:"0:22", tempoMaximoMin:22,  status:"Atenção",motivo:"", observacoes:"" },
    { uf:"MG", unidade:"Hosp. Hapvida BH",           especialidade:"Ortopedia",      pacientesAguardando:3,  pacientesAtendimento:4, tempoMaximo:"0:18", tempoMaximoMin:18,  status:"Normal", motivo:"", observacoes:"" },
  ];
  return {
    ok: true,
    atualizadoEm: new Date().toISOString(),
    resumo: {
      totalRegistros: hospitais.length,
      totalAguardando: hospitais.reduce((s,h)=>s+h.pacientesAguardando,0),
      totalAtendimento: hospitais.reduce((s,h)=>s+h.pacientesAtendimento,0),
      tempoMedioFormatado: "00:28",
      maiorEspera: "4:53",
      maiorEsperaUnidade: "Hospital Rio Poty",
      maiorEsperaUF: "PI",
      criticos: 6, graves: 2, atencao: 1, normais: 1,
    },
    top10: hospitais.slice(0, 10),
    hospitais,
  };
}