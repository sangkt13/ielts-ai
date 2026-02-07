// app/page.tsx
"use client";

import { useMemo, useState } from "react";

type Result = any;

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export default function Page() {
  const [topic, setTopic] = useState(
    "Describe a time you helped someone. What happened? How did you feel?"
  );
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const SpeechRecognition = useMemo(() => {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  const startDictation = () => {
    setError(null);
    if (!SpeechRecognition) {
      setError("Trình duyệt của bạn không hỗ trợ SpeechRecognition.");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;

    let finalText = "";

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += text + " ";
        else interim += text;
      }
      setTranscript((finalText + interim).trim());
    };

    rec.onerror = () => setError("Không ghi âm được. Hãy thử lại.");
    rec.onend = () => {};

    rec.start();

    // auto stop after 60s
    setTimeout(() => {
      try { rec.stop(); } catch {}
    }, 60000);
  };

  const evaluate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, topic }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Request failed");
      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>IELTS Speaking AI Coach</h1>
      <p style={{ opacity: 0.8 }}>
        Dán câu trả lời (hoặc bấm ghi âm) → AI chấm theo 4 tiêu chí + gợi ý nâng band.
      </p>

      <section style={{ marginTop: 18 }}>
        <label style={{ fontWeight: 700 }}>Topic / Question</label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={3}
          style={{ width: "100%", marginTop: 8, padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
        />
      </section>

      <section style={{ marginTop: 18 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ fontWeight: 700, flex: 1 }}>Your answer (transcript)</label>
          <button
            onClick={startDictation}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", cursor: "pointer" }}
          >
            🎙️ Ghi âm 60s
          </button>
        </div>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={8}
          placeholder="Type or paste your speaking transcript here..."
          style={{ width: "100%", marginTop: 8, padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button
            onClick={evaluate}
            disabled={loading || transcript.trim().length < 10}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              background: "#111",
              color: "white",
              fontWeight: 700,
            }}
          >
            {loading ? "Đang chấm..." : "Chấm & góp ý bằng AI"}
          </button>

          <button
            onClick={() => { setTranscript(""); setResult(null); setError(null); }}
            style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid #ddd", cursor: "pointer" }}
          >
            Reset
          </button>
        </div>

        {error && (
          <p style={{ marginTop: 10, color: "crimson" }}>{error}</p>
        )}
      </section>

      {result && (
        <section style={{ marginTop: 22, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Kết quả</h2>

          <p style={{ fontSize: 18 }}>
            <b>Estimated overall band:</b> {result.estimated_band_overall}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <Card title="Fluency & Coherence" value={result.band_by_criterion?.fluency_coherence} />
            <Card title="Lexical Resource" value={result.band_by_criterion?.lexical_resource} />
            <Card title="Grammar" value={result.band_by_criterion?.grammar_accuracy} />
            <Card title="Pronunciation*" value={result.band_by_criterion?.pronunciation} />
          </div>

          <p style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            *Pronunciation chỉ ước lượng từ transcript (không nghe audio).
          </p>

          <ListBlock title="Strengths" items={result.strengths} />
          <ListBlock title="Issues" items={result.issues} />
          <ListBlock title="Coherence tips" items={result.coherence_tips} />
          <ListBlock title="Next practice tasks" items={result.next_practice_tasks} />

          <h3 style={{ marginTop: 14, fontSize: 16, fontWeight: 800 }}>Better answer (improved)</h3>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
            {result.better_answers?.improved_version}
          </p>

          <h3 style={{ marginTop: 14, fontSize: 16, fontWeight: 800 }}>Vocab upgrades</h3>
          <ul>
            {(result.vocab_upgrades || []).map((x: any, i: number) => (
              <li key={i}>
                <b>{x.from}</b> → <b>{x.to}</b> ({x.note})
              </li>
            ))}
          </ul>

          <h3 style={{ marginTop: 14, fontSize: 16, fontWeight: 800 }}>Grammar fixes</h3>
          <ul>
            {(result.grammar_fixes || []).map((x: any, i: number) => (
              <li key={i}>
                <div><b>Original:</b> {x.original}</div>
                <div><b>Fixed:</b> {x.fixed}</div>
                <div style={{ opacity: 0.85 }}><i>{x.why}</i></div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer style={{ marginTop: 26, opacity: 0.75, fontSize: 13 }}>
        Tip: Deploy Vercel → add OPENAI_API_KEY in Project Settings → Environment Variables.
      </footer>
    </main>
  );
}

function Card({ title, value }: { title: string; value: any }) {
  return (
    <div style={{ padding: 12, borderRadius: 12, border: "1px solid #eee" }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>
        {value ?? "-"}
      </div>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <>
      <h3 style={{ marginTop: 14, fontSize: 16, fontWeight: 800 }}>{title}</h3>
      <ul>
        {items.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </>
  );
}
