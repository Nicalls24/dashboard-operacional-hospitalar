"use client";
import { useState, useRef } from "react";

export default function UploadPage() {
  const [senha, setSenha]       = useState("");
  const [status, setStatus]     = useState<"idle"|"loading"|"ok"|"erro">("idle");
  const [mensagem, setMensagem] = useState("");
  const [arquivo, setArquivo]   = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleUpload() {
    if (!arquivo) { setMensagem("Selecione um arquivo Excel."); setStatus("erro"); return; }
    if (!senha)   { setMensagem("Digite a senha."); setStatus("erro"); return; }

    setStatus("loading");
    setMensagem("Processando arquivo...");

    try {
      const base64 = await toBase64(arquivo);
      const res = await fetch("/api/dados", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ excel: base64, filename: arquivo.name, senha }),
      });

      const data = await res.json();

      if (data.ok) {
        setStatus("ok");
        setMensagem(`✅ Dashboard atualizado! ${data.registros} registros carregados.`);
        setArquivo(null);
        if (inputRef.current) inputRef.current.value = "";
      } else {
        setStatus("erro");
        setMensagem(`❌ Erro: ${data.erro}`);
      }
    } catch (err) {
      setStatus("erro");
      setMensagem(`❌ Erro: ${String(err)}`);
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0f172a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif" }}>
      <div style={{ background:"#1e293b", borderRadius:16, padding:40, width:420, boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🏥</div>
          <h1 style={{ color:"#f1f5f9", fontSize:22, margin:0 }}>Hapvida Dashboard</h1>
          <p style={{ color:"#94a3b8", fontSize:14, margin:"8px 0 0" }}>Atualizar dados operacionais</p>
        </div>

        <div onClick={() => inputRef.current?.click()} onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setArquivo(f); }}
          style={{ border:`2px dashed ${arquivo ? "#22c55e" : "#334155"}`, borderRadius:12, padding:32, textAlign:"center", cursor:"pointer", marginBottom:20, background: arquivo ? "rgba(34,197,94,0.05)" : "transparent" }}>
          <input ref={inputRef} type="file" accept=".xlsx,.xlsm,.xls" style={{ display:"none" }} onChange={e => setArquivo(e.target.files?.[0] || null)} />
          {arquivo ? (
            <><div style={{ fontSize:32, marginBottom:8 }}>📊</div>
            <p style={{ color:"#22c55e", margin:0, fontWeight:600 }}>{arquivo.name}</p>
            <p style={{ color:"#64748b", fontSize:12, margin:"4px 0 0" }}>{(arquivo.size/1024).toFixed(1)} KB</p></>
          ) : (
            <><div style={{ fontSize:32, marginBottom:8 }}>📁</div>
            <p style={{ color:"#94a3b8", margin:0 }}>Arraste o Excel aqui ou clique para selecionar</p>
            <p style={{ color:"#475569", fontSize:12, margin:"4px 0 0" }}>.xlsx, .xlsm, .xls</p></>
          )}
        </div>

        <input type="password" placeholder="Senha de acesso" value={senha} onChange={e => setSenha(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleUpload()}
          style={{ width:"100%", padding:"12px 16px", borderRadius:10, border:"1px solid #334155", background:"#0f172a", color:"#f1f5f9", fontSize:15, marginBottom:16, outline:"none", boxSizing:"border-box" }} />

        <button onClick={handleUpload} disabled={status === "loading"}
          style={{ width:"100%", padding:"14px", borderRadius:10, border:"none", background: status === "loading" ? "#334155" : "#3b82f6", color:"#fff", fontSize:16, fontWeight:600, cursor: status === "loading" ? "not-allowed" : "pointer" }}>
          {status === "loading" ? "⏳ Enviando..." : "🚀 Atualizar Dashboard"}
        </button>

        {mensagem && (
          <div style={{ marginTop:16, padding:"12px 16px", borderRadius:10,
            background: status === "ok" ? "rgba(34,197,94,0.1)" : status === "erro" ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)",
            border: `1px solid ${status === "ok" ? "#22c55e" : status === "erro" ? "#ef4444" : "#3b82f6"}`,
            color: status === "ok" ? "#22c55e" : status === "erro" ? "#ef4444" : "#93c5fd",
            fontSize:14, textAlign:"center" }}>
            {mensagem}
          </div>
        )}
        <div style={{ textAlign:"center", marginTop:24 }}>
          <a href="/" style={{ color:"#475569", fontSize:13, textDecoration:"none" }}>← Voltar ao dashboard</a>
        </div>
      </div>
    </div>
  );
}
