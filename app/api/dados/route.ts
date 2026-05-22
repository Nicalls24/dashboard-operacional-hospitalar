// app/api/dados/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// HOW TO USE:
//   1. Paste this file at:  app/api/dados/route.ts
//   2. Set your OneDrive share link in .env.local:
//        ONEDRIVE_EXCEL_URL="https://onedrive.live.com/download?..."
//      (use the direct-download link — append &download=1 if needed)
//   3. Run:  npm run dev
//   4. Visit:  http://localhost:3000/api/dados
// ─────────────────────────────────────────────────────────────────────────────

import * as XLSX from "xlsx";
import { NextResponse } from "next/server";

// ── Helpers ────────────────────────────────────────────────────────────────

function toMinutes(str: string): number {
  if (!str) return 0;
  const parts = String(str).split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 60 + parts[1];
  return Number(str) || 0;
}

function classifyStatus(mediaMinutes: number): string {
  if (mediaMinutes > 60) return "Crítico";
  if (mediaMinutes > 30) return "Grave";
  if (mediaMinutes > 15) return "Atenção";
  return "Normal";
}

// ── GET handler ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // 1. Resolve URL ────────────────────────────────────────────────────────
    const excelUrl = process.env.ONEDRIVE_EXCEL_URL;

    if (!excelUrl) {
      // Return mock data so the dashboard still works without the env var
      return NextResponse.json(mockData(), { status: 200 });
    }

    // 2. Download the file ──────────────────────────────────────────────────
    const response = await fetch(excelUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      // Next.js 15+: revalidate every 30 seconds
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      console.error("OneDrive fetch failed:", response.status, response.statusText);
      return NextResponse.json(mockData(), { status: 200 });
    }

    const buffer = await response.arrayBuffer();

    // 3. Parse workbook ─────────────────────────────────────────────────────
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // Adjust sheet name if yours is different
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON (header row = row 1)
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows.length) {
      return NextResponse.json(mockData(), { status: 200 });
    }

    // 4. Transform rows ─────────────────────────────────────────────────────
    // Adapt column names below to match your actual Excel headers
    const hospitais = rows.map((row) => {
      const mediaStr = String(row["Média Espera"] || row["media_espera"] || row["MediaEspera"] || "00:00");
      const mediaMin = toMinutes(mediaStr);

      return {
        uf:         String(row["UF"] || row["Estado"] || ""),
        unidade:    String(row["Unidade"] || row["Hospital"] || row["Nome"] || ""),
        esp:        String(row["Especialidade"] || ""),
        aguardando: Number(row["Aguardando"] || row["Fila"] || 0),
        atendimento:Number(row["Em Atendimento"] || row["Atendimento"] || 0),
        tempoMax:   String(row["Tempo Máximo"] || row["TempoMaximo"] || "00:00"),
        mediaEspera:mediaStr,
        status:     classifyStatus(mediaMin),
      };
    });

    // 5. Compute KPIs ───────────────────────────────────────────────────────
    const totalAguardando  = hospitais.reduce((s, h) => s + h.aguardando, 0);
    const totalAtendimento = hospitais.reduce((s, h) => s + h.atendimento, 0);
    const criticos         = hospitais.filter((h) => h.status === "Crítico").length;
    const slaOk            = hospitais.filter((h) => toMinutes(h.mediaEspera) < 30).length;
    const slaPct           = hospitais.length
      ? ((slaOk / hospitais.length) * 100).toFixed(1) + "%"
      : "—";

    const sorted = [...hospitais].sort(
      (a, b) => toMinutes(b.tempoMax) - toMinutes(a.tempoMax)
    );

    const maiorEspera = sorted[0] ?? null;

    // Distribuição por faixa de espera
    const dist = [
      { name: "< 15m",     value: 0, color: "#22c55e" },
      { name: "15m - 30m", value: 0, color: "#06b6d4" },
      { name: "30m - 45m", value: 0, color: "#3b82f6" },
      { name: "45m - 1h",  value: 0, color: "#facc15" },
      { name: "1h - 1h30", value: 0, color: "#fb923c" },
      { name: "> 1h30",    value: 0, color: "#ef4444" },
    ];
    hospitais.forEach((h) => {
      const m = toMinutes(h.mediaEspera);
      if (m < 15)       dist[0].value++;
      else if (m < 30)  dist[1].value++;
      else if (m < 45)  dist[2].value++;
      else if (m < 60)  dist[3].value++;
      else if (m < 90)  dist[4].value++;
      else              dist[5].value++;
    });

    // 6. Return JSON ────────────────────────────────────────────────────────
    return NextResponse.json({
      ok: true,
      atualizadoEm: new Date().toISOString(),
      kpis: {
        totalAguardando,
        totalAtendimento,
        hospitaisCriticos: criticos,
        slaMenor30min: slaPct,
        maiorEspera: maiorEspera
          ? { nome: maiorEspera.unidade, uf: maiorEspera.uf, tempo: maiorEspera.tempoMax }
          : null,
      },
      distribuicao: dist,
      top10: sorted.slice(0, 10).map((h) => ({
        nome:   `${h.unidade} - ${h.uf}`,
        tempo:  h.tempoMax,
        status: h.status,
      })),
      hospitais: sorted,
    });
  } catch (err) {
    console.error("[/api/dados] Error:", err);
    // Always return something so the dashboard never shows a blank screen
    return NextResponse.json(
      { ok: false, erro: String(err), ...(() => { const d = mockData(); delete (d as any).ok; return d; })() },
      { status: 200 }
    );
  }
}

// ── Mock data (returned when no Excel URL is configured) ───────────────────

function mockData() {
  return {
    ok: true,
    atualizadoEm: new Date().toISOString(),
    kpis: {
      totalAguardando:   327,
      totalAtendimento:  184,
      hospitaisCriticos: 14,
      slaMenor30min:     "68.4%",
      maiorEspera: { nome: "Hospital Rio Poty", uf: "PI", tempo: "4:53" },
    },
    distribuicao: [
      { name: "< 15m",     value: 133, color: "#22c55e" },
      { name: "15m - 30m", value: 89,  color: "#06b6d4" },
      { name: "30m - 45m", value: 41,  color: "#3b82f6" },
      { name: "45m - 1h",  value: 32,  color: "#facc15" },
      { name: "1h - 1h30", value: 18,  color: "#fb923c" },
      { name: "> 1h30",    value: 14,  color: "#ef4444" },
    ],
    top10: [
      { nome: "Hospital Rio Poty - PI",              tempo: "4:53", status: "Crítico" },
      { nome: "Hospital Teresa de Lisieux - BA",     tempo: "2:38", status: "Crítico" },
      { nome: "PA Derby - PE",                       tempo: "2:37", status: "Crítico" },
      { nome: "Hosp Notrecare ABC - SP",             tempo: "2:16", status: "Crítico" },
      { nome: "Hospital Salvalus - SP",              tempo: "2:09", status: "Crítico" },
      { nome: "PA Barueri - SP",                     tempo: "1:31", status: "Grave"   },
      { nome: "Hospital Ana Lima - CE",              tempo: "1:29", status: "Grave"   },
      { nome: "Hosp. Eugenia Pinheiro - CE",         tempo: "1:25", status: "Grave"   },
      { nome: "Hosp Keila Ferreira Guarulhos - SP",  tempo: "1:25", status: "Grave"   },
      { nome: "CC Cotia 1 - SP",                     tempo: "1:23", status: "Grave"   },
    ],
    hospitais: [
      { uf: "PI", unidade: "Hospital Rio Poty",            esp: "Clínica Médica", aguardando: 3,  atendimento: 1, tempoMax: "4:53", mediaEspera: "01:15", status: "Crítico"  },
      { uf: "BA", unidade: "Hospital Teresa de Lisieux",   esp: "Obstetrícia",    aguardando: 6,  atendimento: 0, tempoMax: "2:38", mediaEspera: "00:58", status: "Crítico"  },
      { uf: "PE", unidade: "PA Derby",                     esp: "Clínica Médica", aguardando: 14, atendimento: 7, tempoMax: "2:37", mediaEspera: "00:47", status: "Grave"    },
      { uf: "SP", unidade: "Hosp Notrecare ABC",           esp: "Pediatria",      aguardando: 11, atendimento: 6, tempoMax: "2:16", mediaEspera: "00:42", status: "Grave"    },
      { uf: "SP", unidade: "Hospital Salvalus",            esp: "Clínica Médica", aguardando: 8,  atendimento: 6, tempoMax: "2:09", mediaEspera: "00:40", status: "Grave"    },
      { uf: "SP", unidade: "PA Barueri",                   esp: "Pediatria",      aguardando: 5,  atendimento: 3, tempoMax: "1:31", mediaEspera: "00:31", status: "Atenção"  },
      { uf: "CE", unidade: "Hospital Ana Lima",            esp: "Clínica Médica", aguardando: 7,  atendimento: 4, tempoMax: "1:29", mediaEspera: "00:29", status: "Atenção"  },
      { uf: "CE", unidade: "Hosp. Eugenia Pinheiro",       esp: "Ortopedia",      aguardando: 4,  atendimento: 2, tempoMax: "1:25", mediaEspera: "00:27", status: "Atenção"  },
    ],
  };
}
