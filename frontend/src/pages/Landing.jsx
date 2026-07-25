import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SonicWaveform from "../components/SonicWaveform";

const C = {
  bg: "#111318",
  accent: "#00D4FF",
  panel: "#1A1D24",
  panelAlt: "#161920",
  text: "#F0F0F0",
  muted: "#6B7280",
  border: "rgba(0,212,255,0.12)",
  statBg: "#0D0F14",
};

const STATS = [
  { value: 84174, label: "Embedded Chunks" },
  { value: 70, label: "Races Indexed" },
  { value: 3, label: "Seasons (2023\u20132025)" },
  { value: 0.815, label: "Faithfulness Score", decimals: 3 },
];

const STEPS = [
  { num: "01", title: "Ask", desc: "Ask any F1 question in plain English." },
  { num: "02", title: "Agent Classifies", desc: "The agent determines the question type — comparison, strategy, result, or general." },
  { num: "03", title: "Targeted Retrieval", desc: "Only the most relevant chunks are retrieved per driver, race, and compound." },
  { num: "04", title: "Verified Answer", desc: "Every answer is grounded in real data and verified before delivery." },
];

const WHY_POINTS = [
  { icon: "→", label: "Not a chatbot", desc: "Pitwall doesn't generate answers from model memory. Every answer is grounded in real FastF1 timing data from 70 races across 2023–2025." },
  { icon: "✗", label: "Not a search engine", desc: "It doesn't return links. It reads the data, reasons over it, and gives you a direct answer with the source chunks it used." },
  { icon: "◈", label: "Measurably accurate", desc: "Evaluated on a 30-question test set.", metrics: true },
];

const TECH_CHIPS = [
  "LangGraph", "FastF1", "pgvector", "Groq", "sentence-transformers",
  "FastAPI", "PostgreSQL", "React", "LangChain", "RAGAS",
];

function useCountUp(target, duration = 1500, decimals = 0) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let startTime = null;
    function tick(now) {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [started, target, duration]);

  return { count, ref };
}

function AnimatedStat({ stat }) {
  const { count, ref } = useCountUp(stat.value, 1500, stat.decimals || 0);
  return (
    <div ref={ref} style={{ textAlign: "center", flex: 1, minWidth: 0, padding: "0.5rem" }}>
      <div style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "2.5rem", color: C.accent, lineHeight: 1.1 }}>
        {stat.decimals ? count.toFixed(stat.decimals) : Math.round(count).toLocaleString()}
      </div>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: C.muted, marginTop: "0.25rem", letterSpacing: "0.05em" }}>
        {stat.label}
      </div>
    </div>
  );
}

function FadeSection({ children, className, style: extStyle, ...props }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(40px)", transition: "opacity 0.6s ease, transform 0.6s ease", ...extStyle }} {...props}>
      {children}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const stepsContainerRef = useRef(null);
  const [stepsVisible, setStepsVisible] = useState(false);

  useEffect(() => {
    const el = stepsContainerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStepsVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "Inter, sans-serif", letterSpacing: "0.02em", overflow: "hidden" }}>

      {/* ─── NAV ─── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 2rem",
        background: "rgba(17,19,24,0.85)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "1.25rem", letterSpacing: "0.15em", color: C.accent }}>
          PITWALL
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          {["How it works", "Why Pitwall", "Demo"].map((label) => {
            const id = label.toLowerCase().replace(/\s+/g, "-");
            return (
              <a key={label} href={`#${id}`} style={{ fontSize: "0.875rem", color: C.muted, textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = C.text}
                onMouseLeave={(e) => e.currentTarget.style.color = C.muted}
              >{label}</a>
            );
          })}
          <button onClick={() => navigate("/chat")} style={{
            background: C.accent, color: C.bg, fontWeight: 700, fontSize: "0.875rem",
            padding: "0.5rem 1.25rem", borderRadius: "6px", border: "none",
            cursor: "pointer", fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.05em",
          }}>TRY IT</button>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", overflow: "hidden" }}>
        <SonicWaveform />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 0%, rgba(17,19,24,0.7) 100%)", pointerEvents: "none", zIndex: 2 }} />

        <div style={{ position: "relative", zIndex: 3, maxWidth: "900px", padding: "0 1.5rem" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem", color: C.accent, letterSpacing: "0.2em", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, display: "inline-block" }} />
            AGENTIC RAG · F1 DATA INTELLIGENCE
          </div>
          <h1 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "clamp(5rem, 12vw, 9rem)", lineHeight: 0.95, letterSpacing: "-0.03em", marginBottom: "1.5rem" }}>
            <span style={{ color: C.text }}>ASK ANYTHING.</span><br />
            <span style={{ color: C.accent }}>GET REAL ANSWERS.</span>
          </h1>
          <p style={{ color: C.muted, fontSize: "1.1rem", maxWidth: "600px", margin: "0 auto 2rem", lineHeight: 1.6 }}>
            84,174 embedded chunks. 70 races. 3 seasons. Zero hallucinations.
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
            <button onClick={() => navigate("/chat")} style={{
              background: C.accent, color: C.bg, fontWeight: 700, fontSize: "1rem",
              padding: "0.875rem 2rem", borderRadius: "8px", border: "none",
              cursor: "pointer", fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.05em",
            }}>
              ASK PITWALL →
            </button>
            <a href="https://github.com/Mohammad-Adnan-Shakil/PitWall" target="_blank" rel="noreferrer" style={{
              color: C.text, fontSize: "1rem", textDecoration: "none",
              padding: "0.875rem 2rem", borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.15)",
            }}>
              VIEW ON GITHUB
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
          <style>{`@keyframes pulseDown { 0% { height: 0; opacity: 1; } 100% { height: 40px; opacity: 0; } }`}</style>
          <div style={{ width: "1px", height: "40px", background: `linear-gradient(to bottom, ${C.accent}, transparent)`, animation: "pulseDown 1.5s ease-in-out infinite" }} />
        </div>
      </section>

      {/* ─── STATS STRIP ─── */}
      <FadeSection style={{ background: C.statBg, borderTop: `1px solid rgba(0,212,255,0.08)`, borderBottom: `1px solid rgba(0,212,255,0.08)`, padding: "2.5rem 2rem" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", justifyContent: "space-around", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          {STATS.map((stat, i) => (
            <div key={stat.label} style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: 0 }}>
              <AnimatedStat stat={stat} />
              {i < STATS.length - 1 && (
                <div style={{ width: "1px", height: "3rem", background: "rgba(0,212,255,0.12)", flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" style={{ padding: "8rem 2rem", maxWidth: "1100px", margin: "0 auto" }}>
        <FadeSection>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: C.accent, letterSpacing: "0.2em", marginBottom: "1rem" }}>HOW IT WORKS</div>
          <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "clamp(2.5rem, 6vw, 4rem)", marginBottom: "4rem", letterSpacing: "0.02em" }}>
            Not a chatbot. An agent.
          </h2>
        </FadeSection>

        <div ref={stepsContainerRef} style={{ display: "flex", gap: "0", position: "relative" }}>
          <style>{`
            @keyframes drawLine {
              from { width: 0; }
              to { width: 100%; }
            }
            .step-line { animation: drawLine 0.8s ease-out forwards; }
          `}</style>
          {STEPS.map((step, i) => (
            <FadeSection key={step.num} style={{ flex: 1, minWidth: 0, textAlign: "center", position: "relative", padding: "0 1rem" }}>
              {/* Connecting arrow */}
              {i < STEPS.length - 1 && (
                <div className="step-line" style={{
                  position: "absolute", top: "1.5rem", left: "calc(50% + 2rem)",
                  width: stepsVisible ? "calc(100% - 4rem)" : "0",
                  height: "1px", background: `linear-gradient(to right, ${C.accent}44, ${C.border})`,
                  transition: "width 0.8s ease-out",
                  transitionDelay: `${i * 0.2}s`,
                  pointerEvents: "none",
                }} />
              )}
              <div style={{ width: "3rem", height: "3rem", borderRadius: "50%", border: `2px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "0.9rem", color: C.accent, background: "rgba(0,212,255,0.06)" }}>
                {step.num}
              </div>
              <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.5rem", color: C.text }}>{step.title}</h3>
              <p style={{ color: C.muted, fontSize: "0.85rem", lineHeight: 1.6, maxWidth: "220px", margin: "0 auto" }}>{step.desc}</p>
            </FadeSection>
          ))}
        </div>
        {/* Mobile vertical fallback */}
        <style>{`
          @media (max-width: 768px) {
            #how-it-works > div:last-child { flex-direction: column !important; gap: 2rem !important; }
            #how-it-works .step-line { display: none !important; }
          }
        `}</style>
      </section>

      {/* ─── WHY PITWALL ─── */}
      <section id="why-pitwall" style={{ background: C.panelAlt, padding: "8rem 2rem", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <FadeSection style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: C.accent, letterSpacing: "0.2em", marginBottom: "1rem" }}>WHY PITWALL</div>
          <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "clamp(2rem, 5vw, 3.5rem)", marginBottom: "3rem" }}>
            Most people think this is a chatbot.<br />It isn't.
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {WHY_POINTS.map((pt) => (
              <div key={pt.label} style={{
                display: "flex", alignItems: "flex-start", gap: "1rem",
                padding: "1.5rem", borderRadius: "8px",
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${C.accent}`,
                background: "rgba(0,212,255,0.02)",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  minWidth: "2rem", height: "2rem", marginTop: "2px",
                  borderRadius: "6px", background: "rgba(0,212,255,0.1)",
                  color: C.accent, fontSize: "1rem", flexShrink: 0,
                }}>{pt.icon}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.35rem" }}>{pt.label}</h3>
                  <p style={{ color: C.muted, fontSize: "0.9rem", lineHeight: 1.6 }}>
                    {pt.desc}
                    {pt.metrics && (
                      <span style={{ display: "inline-flex", gap: "0.5rem", marginLeft: "0.5rem", verticalAlign: "middle" }}>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: C.accent, padding: "0.15rem 0.5rem", borderRadius: "4px", border: `1px solid ${C.border}`, background: "rgba(0,212,255,0.06)" }}>Faithfulness: 0.815</span>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: C.accent, padding: "0.15rem 0.5rem", borderRadius: "4px", border: `1px solid ${C.border}`, background: "rgba(0,212,255,0.06)" }}>Context precision: 0.812</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </FadeSection>
      </section>

      {/* ─── LIVE DEMO ─── */}
      <section id="demo" style={{ padding: "8rem 2rem" }}>
        <FadeSection style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: C.accent, letterSpacing: "0.2em", marginBottom: "1rem" }}>LIVE DEMO</div>
          <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "clamp(2rem, 5vw, 3.5rem)", marginBottom: "3rem" }}>
            See it in action
          </h2>
        </FadeSection>

        <FadeSection style={{ maxWidth: "900px", margin: "0 auto", borderRadius: "12px", border: `1px solid ${C.border}`, background: C.panel, overflow: "hidden" }}>
          {/* Mockup header */}
          <div style={{ padding: "0.75rem 1.25rem", background: C.statBg, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EAB308" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22C55E" }} />
            <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.75rem", color: C.muted, marginLeft: "0.75rem", letterSpacing: "0.1em" }}>PITWALL CHAT</span>
          </div>
          {/* Mockup body - split layout */}
          <div style={{ display: "flex", minHeight: "320px" }}>
            {/* Left: chat */}
            <div style={{ flex: "6", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem", borderRight: `1px solid ${C.border}` }}>
              {/* User bubble */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ maxWidth: "80%", padding: "0.6rem 0.9rem", borderRadius: "12px 12px 4px 12px", background: "#1A1D24", color: C.text, fontSize: "0.8rem", lineHeight: 1.5 }}>
                  How did Verstappen's strategy differ from Norris in the 2023 Belgian GP?
                </div>
              </div>
              {/* Assistant bubble */}
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ maxWidth: "85%", padding: "0.6rem 0.9rem", borderRadius: "12px 12px 12px 4px", background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)", color: C.text, fontSize: "0.8rem", lineHeight: 1.6 }}>
                  <strong>Verstappen</strong> ran a two-stop strategy: <strong style={{color:"#FF3B3B"}}>SOFT</strong> → <strong style={{color:"#FFD700"}}>MEDIUM</strong> → <strong style={{color:"#FF3B3B"}}>SOFT</strong>, with stops on laps 12 and 28. <strong>Norris</strong> ran <strong style={{color:"#FFD700"}}>MEDIUM</strong> → <strong style={{color:"#E0E0E0"}}>HARD</strong> → <strong style={{color:"#FF3B3B"}}>SOFT</strong>, stopping on laps 14 and 30. Verstappen's shorter first stint on SOFT gave him track position.
                </div>
              </div>
              {/* Metadata */}
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.55rem", color: C.muted, display: "flex", gap: "0.5rem", paddingLeft: "0.5rem" }}>
                <span>comparison</span><span>2 attempts</span><span>2847ms</span>
              </div>
            </div>
            {/* Right: strategy bars */}
            <div style={{ flex: "4", padding: "1rem", background: "rgba(0,212,255,0.02)", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.55rem", color: C.accent, letterSpacing: "0.1em" }}>TIRE STRATEGY</div>
              <div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700, fontSize: "0.75rem", color: C.text, marginBottom: "0.25rem" }}>VER</div>
                <div style={{ display: "flex", gap: "2px", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ flex: 1, padding: "0.25rem", background: "#FF3B3B", color: "#FFF", fontSize: "0.55rem", fontFamily: "JetBrains Mono, monospace", fontWeight: 600, textAlign: "center" }}>SOFT</div>
                  <div style={{ flex: 1, padding: "0.25rem", background: "#FFD700", color: "#111", fontSize: "0.55rem", fontFamily: "JetBrains Mono, monospace", fontWeight: 600, textAlign: "center" }}>MEDIUM</div>
                  <div style={{ flex: 1, padding: "0.25rem", background: "#FF3B3B", color: "#FFF", fontSize: "0.55rem", fontFamily: "JetBrains Mono, monospace", fontWeight: 600, textAlign: "center" }}>SOFT</div>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700, fontSize: "0.75rem", color: C.text, marginBottom: "0.25rem" }}>NOR</div>
                <div style={{ display: "flex", gap: "2px", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ flex: 1, padding: "0.25rem", background: "#FFD700", color: "#111", fontSize: "0.55rem", fontFamily: "JetBrains Mono, monospace", fontWeight: 600, textAlign: "center" }}>MEDIUM</div>
                  <div style={{ flex: 1, padding: "0.25rem", background: "#E0E0E0", color: "#111", fontSize: "0.55rem", fontFamily: "JetBrains Mono, monospace", fontWeight: 600, textAlign: "center" }}>HARD</div>
                  <div style={{ flex: 1, padding: "0.25rem", background: "#FF3B3B", color: "#FFF", fontSize: "0.55rem", fontFamily: "JetBrains Mono, monospace", fontWeight: 600, textAlign: "center" }}>SOFT</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: "0.6rem 1rem", borderTop: `1px solid ${C.border}`, fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: C.muted, textAlign: "center" }}>
            Live example — click TRY IT to ask your own questions
          </div>
        </FadeSection>
      </section>

      {/* ─── CTA ─── */}
      <section style={{ padding: "8rem 2rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", width: "600px", height: "600px", transform: "translate(-50%, -50%)", background: "radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <FadeSection style={{ position: "relative", zIndex: 1 }}>
          <h2 style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "clamp(2rem, 5vw, 3.5rem)", marginBottom: "0.75rem" }}>
            Ready to ask Pitwall?
          </h2>
          <p style={{ color: C.muted, marginBottom: "2rem" }}>No sign up. No API key. Just ask.</p>
          <button onClick={() => navigate("/chat")} style={{
            background: C.accent, color: C.bg, fontWeight: 700, fontSize: "1.25rem",
            padding: "1rem 2.5rem", borderRadius: "8px", border: "none",
            cursor: "pointer", fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.05em",
          }}>
            ASK PITWALL →
          </button>
        </FadeSection>
      </section>

      {/* ─── TECH STRIP ─── */}
      <div style={{ background: C.statBg, borderTop: `1px solid rgba(0,212,255,0.08)`, borderBottom: `1px solid rgba(0,212,255,0.08)`, padding: "1.5rem 0", overflow: "hidden" }}>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .marquee-track { animation: marquee 30s linear infinite; }
        `}</style>
        <div style={{ display: "flex", whiteSpace: "nowrap" }}>
          <div className="marquee-track" style={{ display: "flex", gap: "2rem", paddingRight: "2rem" }}>
            {[...TECH_CHIPS, ...TECH_CHIPS].map((chip, i) => (
              <span key={i} style={{
                fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem",
                color: C.muted, padding: "0.375rem 1rem", borderRadius: "4px",
                border: `1px solid ${C.border}`, letterSpacing: "0.05em",
                background: "rgba(0,212,255,0.03)",
              }}>{chip}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer style={{
        padding: "2rem 2rem", borderTop: `1px solid rgba(0,212,255,0.08)`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "1rem",
      }}>
        <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 700, letterSpacing: "0.1em", color: C.accent }}>PITWALL</span>
        <span style={{ fontSize: "0.8rem", color: C.muted }}>Built by Mohammad Adnan Shakil</span>
        <a href="https://github.com/Mohammad-Adnan-Shakil/PitWall" target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", color: C.muted, textDecoration: "none", transition: "color 0.2s" }}
          onMouseEnter={(e) => e.currentTarget.style.color = C.accent}
          onMouseLeave={(e) => e.currentTarget.style.color = C.muted}
        >GitHub →</a>
      </footer>
    </div>
  );
}
