import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ── Firebase Admin ────────────────────────────────────────────────────────────
function getAdminDb() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

// ── POST — recebe Excel em base64, processa e salva no Firestore ──────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { excel, filename, senha } = body;

    if (senha !== process.env.UPLOAD_PASSWORD) {
      return NextResponse.json({ ok: false, erro: "Senha incorreta" }, { status: 401 });
    }
    if (!excel) {
      return NextResponse.json({ ok: false, erro: "Campo 'excel' não enviado" }, { status: 400 });
    }

    const buffer   = Buffer.from(excel, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const parsed   = parseWorkbook(workbook, filename || "");

    const db = getAdminDb();

    // Salvar como dado atual
    await db.collection("dashboard").doc("atual").set({
      ...parsed,
      salvoEm: new Date().toISOString(),
    });

    // Salvar no histórico usando data + turno como chave
    const snapshotId = `${parsed.data}_${parsed.turno}`.replace(/[/:]/g, "-").replace(/\s/g, "_");
    await db.collection("snapshots").doc(snapshotId).set({
      ...parsed,
      salvoEm: new Date().toISOString(),
    });

    return NextResponse.json({
      ok:          true,
      registros:   parsed.resumo.totalRegistros,
      atualizadoEm: parsed.atualizadoEm,
      turno:       parsed.turno,
      data:        parsed.data,
      snapshotId,
    });

  } catch (err) {
    console.error("[POST /api/dados]", err);
    return NextResponse.json({ ok: false, erro: String(err) }, { status: 500 });
  }
}

// ── GET — lê dados atuais do Firestore ────────────────────────────────────────
export async function GET() {
  try {
    const db  = getAdminDb();
    const doc = await db.collection("dashboard").doc("atual").get();
    if (doc.exists) {
      return NextResponse.json({ ...doc.data(), fonte: "firestore" });
    }
    return NextResponse.json({ ...mockData(), fonte: "mock" });
  } catch (err) {
    console.error("[GET /api/dados]", err);
    return NextResponse.json({ ...mockData(), fonte: "mock" });
  }
}

// ── Parser de workbook ────────────────────────────────────────────────────────
function parseWorkbook(workbook: XLSX.WorkBook, filename: string) {

  // 1. Selecionar aba: preferir horárias (21H, 22H...) — ignorar GERAL
  const hourlySheets = workbook.SheetNames.filter(n => /^\d{1,2}H$/i.test(n.trim()));
  const sheetName = hourlySheets.length > 0
    ? hourlySheets[hourlySheets.length - 1]                          // última aba horária
    : workbook.SheetNames.find(n => !n.toUpperCase().includes("GERAL") && !n.toUpperCase().includes("MOTIVO"))
      || workbook.SheetNames[0];

  const turno = sheetName; // ex: "21H"

  const sheet = workbook.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  // 2. Encontrar linha de cabeçalho e metadados
  let headerIdx   = -1;
  let atualizacaoBI = "";
  let dataExcel   = "";

  for (let i = 0; i < rows.length; i++) {
    const cell = String(rows[i]?.[0] || "");

    // Extrair data/hora da atualização
    if (cell.includes("Atualização BI:")) {
      atualizacaoBI = cell.replace("Atualização BI:", "").trim();
      // Extrair apenas a data (DD/MM/YYYY)
      const match = atualizacaoBI.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (match) dataExcel = match[1];
    }

    // Detectar cabeçalho
    if (String(rows[i][0]).trim().toUpperCase() === "UF" ||
        String(rows[i][1]).trim().toUpperCase() === "UNIDADE") {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) return { ...mockData(), aviso: "Cabeçalho não encontrado" };

  // 3. Parsear linhas de hospitais
  // Mapeamento correto das colunas:
  // r[0]=UF, r[1]=Unidade, r[2]=Especialidade,
  // r[3]=Pac.Aguardando, r[4]=Pac.Atendimento,
  // r[5]=TempoMáximo, r[6]=TempoMédio,
  // r[7]=%ForaPrazo, r[8]=Qtd.ForaPrazo,
  // r[9]=MOTIVO, r[10]=Observações

  const hospitais: any[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r       = rows[i];
    const uf      = String(r[0] || "").trim();
    const unidade = String(r[1] || "").trim();
    if (!uf && !unidade) continue;
    if (uf.toUpperCase() === "TOTAL") break;

    const tempoStr = formatTempo(r[5]);
    const tempoMin = toMinutes(tempoStr);

    hospitais.push({
      uf,
      unidade,
      especialidade:        String(r[2]  || "").trim(),
      pacientesAguardando:  Number(r[3]) || 0,
      pacientesAtendimento: Number(r[4]) || 0,
      tempoMaximo:          tempoStr,
      tempoMaximoMin:       tempoMin,
      status:               classifyStatus(tempoMin),
      motivo:               String(r[9]  || "").trim(),
      observacoes:          String(r[10] || "").trim(),
    });
  }

  const sorted      = [...hospitais].sort((a, b) => b.tempoMaximoMin - a.tempoMaximoMin);
  const temposValidos = hospitais.filter(h => h.tempoMaximoMin > 0).map(h => h.tempoMaximoMin);
  const tempoMedio  = temposValidos.length
    ? Math.round(temposValidos.reduce((a, b) => a + b, 0) / temposValidos.length) : 0;

  return {
    ok:          true,
    atualizadoEm: atualizacaoBI || new Date().toISOString(),
    data:        dataExcel,
    turno,
    arquivo:     filename,
    aba:         sheetName,
    resumo: {
      totalRegistros:      hospitais.length,
      totalAguardando:     hospitais.reduce((s, h) => s + h.pacientesAguardando, 0),
      totalAtendimento:    hospitais.reduce((s, h) => s + h.pacientesAtendimento, 0),
      tempoMedioFormatado: fromMinutes(tempoMedio),
      maiorEspera:         sorted[0]?.tempoMaximo  || "00:00",
      maiorEsperaUnidade:  sorted[0]?.unidade      || "",
      maiorEsperaUF:       sorted[0]?.uf           || "",
      criticos:  hospitais.filter(h => h.status === "Crítico").length,
      graves:    hospitais.filter(h => h.status === "Grave").length,
      atencao:   hospitais.filter(h => h.status === "Atenção").length,
      normais:   hospitais.filter(h => h.status === "Normal").length,
    },
    top10:     sorted.slice(0, 10),
    hospitais: sorted,
  };
}

// ── Formatar tempo vindo do Excel ─────────────────────────────────────────────
function formatTempo(val: any): string {
  if (!val || val === "*" || val === "") return "";

  // Já é string (ex: "02:45" ou "10MIN")
  if (typeof val === "string") return val.trim();

  // Número fracionário Excel (fração do dia: 0-1)
  if (typeof val === "number" && val > 0 && val < 1) {
    const totalMin = Math.round(val * 24 * 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // Objeto Date vindo do cellDates:true
  if (val instanceof Date) {
    const h = val.getUTCHours();
    const m = val.getUTCMinutes();
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  return String(val).trim();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function toMinutes(t: string): number {
  if (!t || t === "*") return 0;
  const mMin  = t.match(/^(\d+)\s*MIN$/i);
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
function mockData() {
  return {
    ok: true, atualizadoEm: new Date().toISOString(), data: "", turno: "",
    resumo: {
      totalRegistros: 0, totalAguardando: 0, totalAtendimento: 0,
      tempoMedioFormatado: "00:00", maiorEspera: "00:00",
      maiorEsperaUnidade: "", maiorEsperaUF: "",
      criticos: 0, graves: 0, atencao: 0, normais: 0,
    },
    top10: [], hospitais: [],
  };
}