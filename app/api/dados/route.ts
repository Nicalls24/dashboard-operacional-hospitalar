import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ── Firebase Admin (server-side) ──────────────────────────────────────────────
function getAdminDb() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId:    process.env.FIREBASE_PROJECT_ID,
        clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:   process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
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

    // Validar senha de upload
    if (senha !== process.env.UPLOAD_PASSWORD) {
      return NextResponse.json({ ok: false, erro: "Senha incorreta" }, { status: 401 });
    }

    if (!excel) {
      return NextResponse.json({ ok: false, erro: "Campo 'excel' não enviado" }, { status: 400 });
    }

    const buffer   = Buffer.from(excel, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const parsed   = parseWorkbook(workbook, filename || "");

    // Salvar no Firestore
    const db  = getAdminDb();
    const ref = db.collection("dashboard").doc("atual");
    await ref.set({ ...parsed, salvoEm: new Date().toISOString() });

    // Salvar histórico
    await db.collection("historico").add({
      resumo:    parsed.resumo,
      arquivo:   filename,
      salvoEm:   new Date().toISOString(),
    });

    return NextResponse.json({
      ok:          true,
      registros:   parsed.resumo.totalRegistros,
      atualizadoEm: parsed.atualizadoEm,
    });

  } catch (err) {
    console.error("[POST /api/dados]", err);
    return NextResponse.json({ ok: false, erro: String(err) }, { status: 500 });
  }
}

// ── GET — lê dados do Firestore ───────────────────────────────────────────────
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
  let sheetName = workbook.SheetNames.find(n => n.toUpperCase().includes("GERAL"))
    || workbook.SheetNames[workbook.SheetNames.length - 1];

  const sheet = workbook.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[0]).trim().toUpperCase() === "UF" || String(r[1]).trim().toUpperCase() === "UNIDADE") {
      headerIdx = i;
      break;
    }
  }

  let atualizacaoBI = "";
  for (let i = 0; i < (headerIdx > 0 ? headerIdx : 5); i++) {
    const cell = String(rows[i]?.[0] || "");
    if (cell.includes("Atualização BI:")) atualizacaoBI = cell.replace("Atualização BI:", "").trim();
  }

  if (headerIdx === -1) return { ...mockData(), aviso: "Cabeçalho não encontrado" };

  const hospitais: any[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r      = rows[i];
    const uf     = String(r[0] || "").trim();
    const unidade = String(r[1] || "").trim();
    if (!uf && !unidade) continue;
    if (uf.toUpperCase() === "TOTAL") break;

    const tempoStr = String(r[5] || "").trim();
    const tempoMin = toMinutes(tempoStr);

    hospitais.push({
      uf, unidade,
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

  const sorted      = [...hospitais].sort((a, b) => b.tempoMaximoMin - a.tempoMaximoMin);
  const temposValidos = hospitais.filter(h => h.tempoMaximoMin > 0).map(h => h.tempoMaximoMin);
  const tempoMedio  = temposValidos.length
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
      criticos:  hospitais.filter(h => h.status === "Crítico").length,
      graves:    hospitais.filter(h => h.status === "Grave").length,
      atencao:   hospitais.filter(h => h.status === "Atenção").length,
      normais:   hospitais.filter(h => h.status === "Normal").length,
    },
    top10:     sorted.slice(0, 10),
    hospitais: sorted,
  };
}

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
    ok: true,
    atualizadoEm: new Date().toISOString(),
    resumo: {
      totalRegistros: 0, totalAguardando: 0, totalAtendimento: 0,
      tempoMedioFormatado: "00:00", maiorEspera: "00:00",
      maiorEsperaUnidade: "", maiorEsperaUF: "",
      criticos: 0, graves: 0, atencao: 0, normais: 0,
    },
    top10: [], hospitais: [],
  };
}