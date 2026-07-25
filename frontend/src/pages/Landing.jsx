import { useNavigate } from "react-router-dom";
import SonicWaveform from "../components/SonicWaveform";

const TECH_CHIPS = [
  "LangGraph", "FastF1", "pgvector", "Groq", "sentence-transformers", "FastAPI", "PostgreSQL"
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "You ask a real F1 question",
    desc: "Anything from pit stop strategy to lap-by-lap pace comparisons across 3 seasons of race data."
  },
  {
    step: "02",
    title: "The agent decides what to retrieve",
    desc: "Unlike a chatbot, Pitwall classifies your question and retrieves specifically relevant data — per driver, per race, per compound."
  },
  {
    step: "03",
    title: "It checks if what it found is enough",
    desc: "If a comparison question only retrieved one driver's data, the agent retrieves again before answering. It knows when it's incomplete."
  },
  {
    step: "04",
    title: "The answer is grounded and verified",
    desc: "Every claim in the answer maps back to real retrieved data. The system flags its own low-confidence answers rather than hallucinating."
  },
];

const DIFF_POINTS = [
  {
    label: "Not a chatbot",
    desc: "Pitwall doesn't generate answers from model memory. Every answer is grounded in real FastF1 timing data from 70 races across 2023\u20132025."
  },
  {
    label: "Not a search engine",
    desc: "It doesn't return links. It reads the data, reasons over it, and gives you a direct answer with the source chunks it used."
  },
  {
    label: "Measurably accurate",
    desc: "Evaluated on a 30-question test set."
  },
];

const S = {
  bg: "#111318",
  accent: "#00D4FF",
  text: "#F0F0F0",
  muted: "#9CA3AF",
  border: "rgba(0,212,255,0.12)",
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen fade-in" style={{ background: S.bg, color: S.text, fontFamily: "Inter, sans-serif", letterSpacing: "0.02em" }}>

      {/* ─── Nav ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ background: "rgba(17,19,24,0.85)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${S.border}` }}>
        <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "1.25rem", letterSpacing: "0.15em", color: S.accent }}>
          PITWALL
        </span>
        <div className="flex items-center gap-8">
          <a href="#how-it-works" style={{ fontSize: "0.875rem", color: S.muted, letterSpacing: "0.02em" }} className="hover:text-white transition-colors">How it works</a>
          <a href="#what-makes-it-different" style={{ fontSize: "0.875rem", color: S.muted, letterSpacing: "0.02em" }} className="hover:text-white transition-colors">Why Pitwall</a>
          <button
            onClick={() => navigate("/chat")}
            style={{ background: S.accent, color: S.bg, fontWeight: 700, fontSize: "0.875rem", padding: "0.5rem 1.25rem", borderRadius: "6px", border: "none", cursor: "pointer", fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.05em" }}
          >
            TRY IT
          </button>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative flex flex-col items-center justify-center text-center"
        style={{ minHeight: "100dvh", padding: "0 1.5rem", overflow: "hidden" }}>
        <SonicWaveform />

        {/* Vignette overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(17,19,24,0.7) 100%)",
          pointerEvents: "none", zIndex: 2,
        }} />

        {/* Timing split line */}
        <div style={{
          position: "absolute", left: 0, right: 0, top: "50%", height: 0, zIndex: 2,
          borderTop: "1px solid rgba(0,212,255,0.2)",
          pointerEvents: "none",
        }} />

        <div className="relative z-10 max-w-4xl mx-auto" style={{ position: "relative", zIndex: 3 }}>
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full"
            style={{ border: `1px solid rgba(0,212,255,0.3)`, background: "rgba(0,212,255,0.08)", fontSize: "0.75rem", letterSpacing: "0.1em", color: S.accent }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: S.accent, display: "inline-block" }} />
            84,174 CHUNKS · 70 RACES · 3 SEASONS
          </div>
          <h1 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "clamp(4rem, 10vw, 8rem)", lineHeight: 1.0, letterSpacing: "-0.02em", marginBottom: "1.5rem" }}>
            <span style={{ color: S.text }}>Ask anything.</span><br />
            <span style={{ color: S.accent }}>Get grounded answers.</span>
          </h1>
          <p style={{ fontSize: "clamp(1rem, 2vw, 1.25rem)", color: S.muted, maxWidth: "600px", margin: "0 auto 2.5rem", lineHeight: 1.6, letterSpacing: "0.02em" }}>
            An agentic RAG system for Formula 1 — grounded in real race data, not model memory. Strategy, lap times, pit stops, race results across 2023–2025.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => navigate("/chat")}
              style={{ background: S.accent, color: S.bg, fontWeight: 700, fontSize: "1rem", padding: "0.875rem 2rem", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.05em" }}
            >
              ASK PITWALL →
            </button>
            <a href="#how-it-works"
              style={{ color: S.text, fontSize: "1rem", textDecoration: "none", padding: "0.875rem 2rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)" }}>
              See how it works
            </a>
          </div>
        </div>

        {/* scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1" style={{ color: "#4B5563", fontSize: "0.75rem", letterSpacing: "0.1em", zIndex: 3 }}>
          <span>SCROLL</span>
          <span>↓</span>
        </div>
      </section>

      {/* Tech chips */}
      <div className="flex flex-wrap justify-center gap-3 py-8 px-8"
        style={{ borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}` }}>
        {TECH_CHIPS.map(chip => (
          <span key={chip} style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color: "#6B7280", padding: "0.375rem 0.875rem", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.08)", letterSpacing: "0.05em" }}>
            {chip}
          </span>
        ))}
      </div>

      {/* ─── How it works ─── */}
      <section id="how-it-works" className="max-w-5xl mx-auto" style={{ padding: "8rem 2rem" }}>
        <p style={{ fontFamily: "Rajdhani, sans-serif", color: S.accent, fontSize: "0.75rem", letterSpacing: "0.2em", marginBottom: "1rem" }}>HOW IT WORKS</p>
        <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "clamp(2rem, 5vw, 3rem)", marginBottom: "4rem", letterSpacing: "0.02em" }}>
          Not a chatbot. An agent.
        </h2>
        <div className="grid grid-cols-1 gap-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {HOW_IT_WORKS.map(item => (
            <div key={item.step} className="group" style={{
              padding: "1.5rem", borderRadius: "8px",
              border: `1px solid ${S.border}`,
              borderLeft: `3px solid ${S.accent}`,
              background: "rgba(0,212,255,0.03)",
              position: "relative", overflow: "hidden",
              transition: "background 0.25s, border-color 0.25s",
            }}>
              {/* Ghosted step number */}
              <span style={{
                position: "absolute", top: "0.25rem", right: "0.5rem",
                fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
                fontSize: "4rem", lineHeight: 1,
                color: S.accent, opacity: 0.06,
                pointerEvents: "none", userSelect: "none",
              }}>{item.step}</span>
              <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "1.25rem", margin: "0 0 0.5rem", position: "relative" }}>{item.title}</h3>
              <p style={{ color: S.muted, fontSize: "0.9rem", lineHeight: 1.6, position: "relative" }}>{item.desc}</p>
              <style>{`
                .group:hover {
                  background: rgba(0,212,255,0.07) !important;
                  border-left-color: ${S.accent} !important;
                }
              `}</style>
            </div>
          ))}
        </div>
      </section>

      {/* ─── What makes it different ─── */}
      <section id="what-makes-it-different" style={{ padding: "8rem 2rem", background: "rgba(0,212,255,0.03)", borderTop: `1px solid ${S.border}` }}>
        <div className="max-w-5xl mx-auto">
          <p style={{ fontFamily: "Rajdhani, sans-serif", color: S.accent, fontSize: "0.75rem", letterSpacing: "0.2em", marginBottom: "1rem" }}>WHY PITWALL</p>
          <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "clamp(2rem, 5vw, 3rem)", marginBottom: "4rem" }}>
            Most people think this is a chatbot.<br />It isn't.
          </h2>
          <div className="flex flex-col gap-6">
            {DIFF_POINTS.map(point => (
              <div key={point.label} className="flex gap-6 items-start" style={{ padding: "1.5rem", borderRadius: "8px", border: `1px solid ${S.border}` }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: "2rem", height: "2rem", marginTop: "2px",
                  borderRadius: "999px", background: "rgba(0,212,255,0.12)",
                  color: S.accent, fontSize: "1rem", fontFamily: "sans-serif",
                }}>▸</span>
                <div>
                  <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.5rem" }}>{point.label}</h3>
                  <p style={{ color: S.muted, fontSize: "0.9rem", lineHeight: 1.6 }}>
                    {point.desc}
                    {point.label === "Measurably accurate" && (
                      <span style={{ display: "inline-flex", gap: "0.5rem", marginLeft: "0.5rem" }}>
                        <span style={{
                          fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem",
                          color: S.accent, padding: "0.15rem 0.5rem", borderRadius: "4px",
                          border: `1px solid ${S.border}`, background: "rgba(0,212,255,0.06)",
                          letterSpacing: "0.02em",
                        }}>Faithfulness: 0.815</span>
                        <span style={{
                          fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem",
                          color: S.accent, padding: "0.15rem 0.5rem", borderRadius: "4px",
                          border: `1px solid ${S.border}`, background: "rgba(0,212,255,0.06)",
                          letterSpacing: "0.02em",
                        }}>Context precision: 0.812</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="text-center" style={{ padding: "8rem 2rem" }}>
        <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "clamp(2rem, 5vw, 3rem)", marginBottom: "1rem" }}>
          Ready to ask Pitwall?
        </h2>
        <p style={{ color: S.muted, marginBottom: "2rem" }}>No sign up. Just ask.</p>
        <button
          onClick={() => navigate("/chat")}
          style={{ background: S.accent, color: S.bg, fontWeight: 700, fontSize: "1rem", padding: "0.875rem 2rem", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.05em" }}
        >
          ASK PITWALL →
        </button>
      </section>

      {/* ─── Footer ─── */}
      <footer className="px-8 py-6 flex items-center justify-between"
        style={{ borderTop: `1px solid ${S.border}`, fontSize: "0.75rem", color: "#4B5563" }}>
        <span className="pitwall-logo" style={{ fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.1em", color: S.accent, transition: "text-shadow 0.25s" }}>
          PITWALL
        </span>
        <span>Built by Mohammad Adnan Shakil</span>
        <a href="https://github.com/Mohammad-Adnan-Shakil/PitWall" style={{ color: "#4B5563", textDecoration: "none" }} className="hover:text-white transition-colors">GitHub →</a>
        <style>{`
          .pitwall-logo:hover {
            text-shadow: 0 0 12px ${S.accent}, 0 0 24px rgba(0,212,255,0.4);
          }
        `}</style>
      </footer>
    </div>
  );
}
