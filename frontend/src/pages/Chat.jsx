import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

const C = {
  bg: "#111318",
  accent: "#00D4FF",
  text: "#F0F0F0",
  muted: "#9CA3AF",
  border: "rgba(0,212,255,0.12)",
  userBg: "#1A1D24",
  warnBg: "rgba(245,158,11,0.12)",
  warnBorder: "rgba(245,158,11,0.35)",
};

const SUGGESTIONS = [
  "Who won the 2023 Monaco Grand Prix?",
  "How did Verstappen's tire strategy differ from Norris in the 2023 Belgian GP?",
  "What were the weather conditions at the 2024 Singapore Grand Prix?",
  "How many pit stops did Leclerc make in the 2024 Australian Grand Prix?",
];

const TYPE_STYLES = {
  lap:           { bg: "rgba(59,130,246,0.2)",  text: "#60A5FA" },
  stint:         { bg: "rgba(168,85,247,0.2)",  text: "#A78BFA" },
  pit_stop:      { bg: "rgba(251,146,60,0.2)",  text: "#FB923C" },
  race:          { bg: "rgba(34,197,94,0.2)",   text: "#22C55E" },
  race_summary:  { bg: "rgba(0,212,255,0.2)",   text: "#00D4FF" },
};

const COMPOUND_COLORS = {
  SOFT: "#FF3B3B",
  MEDIUM: "#FFD700",
  HARD: "#E0E0E0",
  INTERMEDIATE: "#39FF14",
  WET: "#00BFFF",
};

/* ─── Parsing helpers ─── */

function parseTireCompounds(content) {
  const order = [];
  const re = /\b(SOFT|MEDIUM|HARD|INTERMEDIATE|WET)\b/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const compound = m[1];
    if (order.length === 0 || order[order.length - 1] !== compound) {
      order.push(compound);
    }
  }
  return order;
}

function parsePitStopsFromContent(content) {
  const stops = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const lapMatch = line.match(/\bLap\s*(\d+)\b/i);
    const driverMatch = line.match(/\b([A-Z]{3})\b/);
    if (!lapMatch) continue;

    const changeMatch = line.match(/changing from (\w+) to (\w+)/i);
    const freshMatch = line.match(/fresh set of (\w+)/i);

    let compoundBefore = null;
    let compoundAfter = null;

    if (changeMatch) {
      const before = changeMatch[1].toUpperCase();
      const after = changeMatch[2].toUpperCase();
      if (["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"].includes(before)) compoundBefore = before;
      if (["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"].includes(after)) compoundAfter = after;
    } else if (freshMatch) {
      const c = freshMatch[1].toUpperCase();
      if (["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"].includes(c)) compoundAfter = c;
    } else {
      const compounds = line.match(/\b(SOFT|MEDIUM|HARD|INTERMEDIATE|WET)\b/g);
      if (compounds && compounds.length >= 2) {
        compoundBefore = compounds[0];
        compoundAfter = compounds[compounds.length - 1];
      } else if (compounds && compounds.length === 1) {
        compoundAfter = compounds[0];
      }
    }

    stops.push({
      lap: parseInt(lapMatch[1]),
      driver: driverMatch ? driverMatch[1] : null,
      compoundBefore,
      compoundAfter,
      text: line.trim(),
    });
  }
  return stops;
}

function parsePodium(content) {
  const result = { p1: null, p2: null, p3: null, wet: false, dry: true };
  const podiumMatch = content.match(
    /won by ([A-Z]{2,3}), with ([A-Z]{2,3}) in P2 and ([A-Z]{2,3}) in P3/
  );
  if (podiumMatch) {
    const [_, p1, p2, p3] = podiumMatch;
    result.p1 = p1;
    result.p2 = p2;
    result.p3 = p3;
  }
  if (/\b(WET|RAIN|RAINY|DAMP)\b/i.test(content)) {
    result.wet = true;
    result.dry = false;
  }
  return result;
}

function countPitStops(content) {
  const m = content.match(/(\d+)\s*stop/i);
  return m ? parseInt(m[1]) : null;
}

/* ─── Tire Strategy Timeline ─── */

function TireStrategyTimeline({ sources, lastQuestionType, driversMentioned }) {
  let raceChunks = sources.filter((c) => c.chunk_type === "race");

  if (lastQuestionType === "comparison" && driversMentioned?.length) {
    const mentioned = new Set(driversMentioned.map((d) => d.toUpperCase()));
    raceChunks = raceChunks.filter((c) => c.driver && mentioned.has(c.driver.toUpperCase()));
  } else if (lastQuestionType === "strategy" || lastQuestionType === "race_result") {
    const raceCounts = {};
    for (const c of raceChunks) {
      if (c.race) raceCounts[c.race] = (raceCounts[c.race] || 0) + 1;
    }
    const entries = Object.entries(raceCounts);
    if (entries.length > 0) {
      const dominantRace = entries.sort((a, b) => b[1] - a[1])[0][0];
      raceChunks = raceChunks.filter((c) => c.race === dominantRace);
    }
  }

  const byDriver = {};
  for (const c of raceChunks) {
    if (!c.driver) continue;
    if (!byDriver[c.driver]) byDriver[c.driver] = [];
    byDriver[c.driver].push(c);
  }
  const drivers = Object.keys(byDriver);
  if (drivers.length === 0) return null;

  return (
    <div className="source-card" style={{
      border: `1px solid ${C.border}`,
      borderRadius: "8px", padding: "1rem",
      background: "rgba(0,212,255,0.03)",
    }}>
      <div style={{
        fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem",
        color: C.accent, letterSpacing: "0.1em", marginBottom: "0.75rem",
      }}>
        TIRE STRATEGY
      </div>
      {drivers.map((driver) => {
        const content = byDriver[driver].map((c) => c.content).join(" ");
        const strategyMatch = content.match(/Tire strategy: ([^.]+)/);
        const compounds = strategyMatch
          ? strategyMatch[1].split(/\s*→\s*/)
          : [];
        const stops = countPitStops(content);
        if (compounds.length === 0) return null;
        return (
          <div key={driver} style={{ marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
              <span style={{
                fontFamily: "JetBrains Mono, monospace", fontWeight: 700,
                fontSize: "0.85rem", color: C.text, minWidth: "2.5rem",
              }}>
                {driver}
              </span>
            </div>
            <div style={{ display: "flex", gap: "3px", borderRadius: "6px", overflow: "hidden" }}>
              {compounds.map((cmp, i) => (
                <div key={i} style={{
                  flex: 1, padding: "0.3rem 0.25rem",
                  background: COMPOUND_COLORS[cmp] || "#666",
                  color: cmp === "MEDIUM" || cmp === "HARD" ? "#111" : "#FFF",
                  fontSize: "0.6rem", fontFamily: "JetBrains Mono, monospace",
                  fontWeight: 600, textAlign: "center", letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                }}>
                  {cmp}
                </div>
              ))}
            </div>
            {stops !== null && (
              <div style={{
                fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem",
                color: C.muted, marginTop: "0.2rem",
              }}>
                {stops} stop{stops !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Podium Card ─── */

function PodiumCard({ sources }) {
  const summary = sources.find((c) => c.chunk_type === "race_summary");
  if (!summary) return null;
  const podium = parsePodium(summary.content);
  if (!podium.p1 && !podium.p2 && !podium.p3) return null;

  const steps = [
    { pos: "P2", driver: podium.p2, color: "#C0C0C0", height: "90px" },
    { pos: "P1", driver: podium.p1, color: "#FFD700", height: "120px" },
    { pos: "P3", driver: podium.p3, color: "#CD7F32", height: "75px" },
  ];

  return (
    <div className="source-card" style={{
      border: `1px solid ${C.border}`,
      borderRadius: "8px", padding: "1rem",
      background: "rgba(0,212,255,0.03)",
    }}>
      <div style={{
        fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem",
        color: C.accent, letterSpacing: "0.1em", marginBottom: "0.75rem",
      }}>
        RACE RESULT
      </div>
      <div style={{
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        gap: "0.5rem", height: "8rem",
      }}>
        {steps.map((s) => (
          <div key={s.pos} style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "flex-end", gap: "0.3rem",
            width: "5rem", height: s.height,
            background: `linear-gradient(to top, ${s.color}22, ${s.color}44)`,
            border: `1px solid ${s.color}66`,
            borderRadius: "6px 6px 0 0",
            padding: "0.5rem 0.25rem",
          }}>
            <span style={{
              fontFamily: "JetBrains Mono, monospace", fontWeight: 700,
              fontSize: "1.2rem", color: s.color, lineHeight: 1,
            }}>
              {s.pos}
            </span>
            {s.driver && (
              <span style={{
                fontFamily: "JetBrains Mono, monospace", fontWeight: 700,
                fontSize: "0.8rem", color: C.text, lineHeight: 1,
              }}>
                {s.driver}
              </span>
            )}
          </div>
        ))}
      </div>
      {podium.wet && (
        <div style={{
          marginTop: "0.5rem", textAlign: "center",
          fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem",
          color: "#39FF14", padding: "0.15rem 0.5rem",
          border: "1px solid rgba(57,255,20,0.3)", borderRadius: "4px",
          display: "inline-block", background: "rgba(57,255,20,0.08)",
        }}>
          WET
        </div>
      )}
    </div>
  );
}

/* ─── Pit Stop Timeline ─── */

function PitStopTimeline({ sources }) {
  const byDriver = {};
  for (const c of sources) {
    if (c.chunk_type !== "pit_stop") continue;
    const parsed = parsePitStopsFromContent(c.content);
    for (const ps of parsed) {
      const d = ps.driver || c.driver || "UNK";
      if (!byDriver[d]) byDriver[d] = [];
      byDriver[d].push(ps);
    }
  }
  const driverCodes = Object.keys(byDriver);
  if (driverCodes.length === 0) return null;
  for (const d of driverCodes) byDriver[d].sort((a, b) => a.lap - b.lap);

  return (
    <div className="source-card" style={{
      border: `1px solid ${C.border}`,
      borderRadius: "8px", padding: "1rem",
      background: "rgba(0,212,255,0.03)",
    }}>
      <div style={{
        fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem",
        color: C.accent, letterSpacing: "0.1em", marginBottom: "0.75rem",
      }}>
        PIT STOPS
      </div>
      <div style={{
        display: "flex",
        gap: "1rem",
        flexDirection: driverCodes.length >= 2 ? "row" : "column",
      }}>
        {driverCodes.sort().map((driver) => (
          <div key={driver} style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "JetBrains Mono, monospace", fontWeight: 700,
              fontSize: "0.75rem", color: C.accent, marginBottom: "0.5rem",
              letterSpacing: "0.05em",
            }}>
              {driver}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {byDriver[driver].map((ps, i) => {
                const newColor = ps.compoundAfter
                  ? (COMPOUND_COLORS[ps.compoundAfter] || C.muted)
                  : C.accent;
                return (
                  <div key={i} style={{ display: "flex", gap: "0.6rem", alignItems: "stretch" }}>
                    <div style={{
                      fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem",
                      color: C.text, fontWeight: 700, minWidth: "3rem",
                      textAlign: "right", paddingTop: "0.2rem",
                      lineHeight: 1.3,
                    }}>
                      LAP<br />{ps.lap}
                    </div>
                    <div style={{
                      width: "2px", background: "rgba(0,212,255,0.3)",
                      borderRadius: "1px", flexShrink: 0,
                    }} />
                    <div style={{
                      flex: 1, padding: "0.4rem 0.5rem",
                      borderRadius: "6px",
                      border: `1px solid ${C.border}`,
                      borderLeft: `3px solid ${newColor}`,
                      background: "rgba(0,212,255,0.04)",
                    }}>
                      {ps.driver && (
                        <span style={{
                          fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem",
                          fontWeight: 600, padding: "0.1rem 0.4rem", borderRadius: "3px",
                          background: "rgba(0,212,255,0.15)", color: C.accent,
                          letterSpacing: "0.05em", textTransform: "uppercase",
                          marginRight: "0.35rem",
                        }}>
                          {ps.driver}
                        </span>
                      )}
                      {ps.compoundBefore && ps.compoundAfter && ps.compoundBefore !== ps.compoundAfter ? (
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem" }}>
                          <span style={{ color: COMPOUND_COLORS[ps.compoundBefore] || C.text, fontWeight: 600 }}>{ps.compoundBefore}</span>
                          <span style={{ color: C.muted, margin: "0 0.2rem" }}>→</span>
                          <span style={{ color: COMPOUND_COLORS[ps.compoundAfter] || C.text, fontWeight: 600 }}>{ps.compoundAfter}</span>
                        </span>
                      ) : ps.compoundAfter ? (
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: COMPOUND_COLORS[ps.compoundAfter] || C.text, fontWeight: 600 }}>
                          {ps.compoundAfter} (fresh)
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.7rem", color: C.muted }}>Pit stop</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Chunk Card (fallback) ─── */

function ChunkCard({ chunk, index }) {
  const [expanded, setExpanded] = useState(false);
  const ts = TYPE_STYLES[chunk.chunk_type] || { bg: "rgba(255,255,255,0.06)", text: C.muted };

  return (
    <div className="source-card" style={{
      border: `1px solid ${C.border}`,
      borderRadius: "8px",
      padding: "0.75rem",
      background: "rgba(0,212,255,0.03)",
      animation: `slideInRight 0.3s ease-out ${(index ?? 0) * 0.08}s forwards`,
      opacity: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
        <span style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "0.6rem", fontWeight: 600,
          padding: "0.15rem 0.45rem", borderRadius: "4px",
          background: ts.bg, color: ts.text,
          letterSpacing: "0.05em", textTransform: "uppercase",
        }}>
          {chunk.chunk_type}
        </span>
        {chunk.driver && (
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: C.muted }}>
            {chunk.driver}
          </span>
        )}
        {chunk.race && (
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.7rem", color: C.muted, marginLeft: "auto" }}>
            {chunk.race}
          </span>
        )}
      </div>

      <div style={{
        fontSize: "0.8rem", lineHeight: 1.5, color: C.text,
        display: "-webkit-box",
        WebkitLineClamp: expanded ? "unset" : 3,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        {chunk.content}
      </div>

      {chunk.content.length > 180 && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem",
            color: C.accent, padding: "0.25rem 0 0",
            letterSpacing: "0.05em",
          }}
        >
          {expanded ? "SHOW LESS" : "SHOW MORE"}
        </button>
      )}

      <div style={{
        fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem",
        color: C.muted, marginTop: "0.4rem", letterSpacing: "0.05em",
      }}>
        {chunk.season || ""}
      </div>
    </div>
  );
}

function ThinkingDots() {
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDot((d) => (d + 1) % 4), 400);
    return () => clearInterval(id);
  }, []);
  return <span>{". ".repeat(dot).trim() || "\u00A0".repeat(2)}</span>;
}

/* ─── Sources Panel ─── */

function SourcesPanel({ sources, loading, lastQuestionType, driversMentioned }) {
  const smartComponent = useMemo(() => {
    if (!sources || sources.length === 0) return null;

    if (lastQuestionType === "race_result") {
      return <PodiumCard sources={sources} />;
    }
    if (lastQuestionType === "strategy") {
      return <PitStopTimeline sources={sources} />;
    }
    return null;
  }, [sources, lastQuestionType]);

  return (
    <>
      <TireStrategyTimeline sources={sources} lastQuestionType={lastQuestionType} driversMentioned={driversMentioned} />
      {smartComponent}
      {sources.length === 0 && !loading && (
        <p style={{
          color: C.muted, fontSize: "0.85rem", textAlign: "center",
          padding: "3rem 1rem", lineHeight: 1.6,
        }}>
          Retrieved sources will appear here after your first question
        </p>
      )}
      {sources.map((chunk, i) => (
        <ChunkCard key={i} chunk={chunk} index={i} />
      ))}
      {loading && (
        <p style={{
          color: C.muted, fontSize: "0.75rem", textAlign: "center",
          fontFamily: "JetBrains Mono, monospace", padding: "2rem 0",
        }}>
          Loading chunks...
        </p>
      )}
    </>
  );
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState("");
  const [lastQuestionType, setLastQuestionType] = useState(null);
  const [driversMentioned, setDriversMentioned] = useState([]);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendQuestion = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    setError("");
    setHasStarted(true);

    const userMsg = { role: "user", text: q };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();

      const rawAnswer = data.answer || "";
      let displayAnswer = rawAnswer.startsWith("[Low confidence")
        ? rawAnswer.replace(/^\[Low confidence[^\]]*\]\s*/i, "")
        : rawAnswer;
      displayAnswer = displayAnswer.replace(/\[\d+\]/g, "").trim();

      const assistantMsg = {
        role: "assistant",
        answer: displayAnswer,
        rawAnswer,
        latency_ms: data.latency_ms ?? 0,
        retrieval_attempts: data.retrieval_attempts ?? 0,
        question_type: data.question_type ?? "general",
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setLastQuestionType(data.question_type ?? "general");
      setDriversMentioned(data.drivers_mentioned ?? []);
      if (data.sources) setSources(data.sources);
    } catch (e) {
      setError("Could not reach Pitwall API — is the server running?");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          answer: "",
          rawAnswer: "",
          latency_ms: 0,
          retrieval_attempts: 0,
          question_type: "error",
          error: true,
        },
      ]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  };

  const needsWarning = (msg) =>
    msg.role === "assistant" && !msg.error &&
    (msg.rawAnswer ? msg.rawAnswer.includes("[Low confidence") : false);

  return (
    <div className="fade-in" style={{
      background: C.bg, color: C.text, minHeight: "100dvh",
      display: "flex", flexDirection: "column",
      fontFamily: "Inter, sans-serif",
    }}>
      {/* ─── Top bar ─── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 2rem",
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(17,19,24,0.85)",
        backdropFilter: "blur(12px)",
        position: "relative", zIndex: 10,
      }}>
        <button
          onClick={() => navigate("/")}
          style={{
            fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
            fontSize: "1.25rem", letterSpacing: "0.15em",
            color: C.accent, background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center",
          }}
        >
          <img src="/logo.svg" alt="Pitwall" style={{height: '28px', marginRight: '8px'}} />
          PITWALL
        </button>
        {hasStarted && (
          <button
            onClick={() => { setMessages([]); setSources([]); setHasStarted(false); setError(""); setLastQuestionType(null); }}
            style={{
              fontFamily: "Rajdhani, sans-serif", fontSize: "0.8rem",
              color: C.muted, background: "none",
              border: `1px solid ${C.border}`, borderRadius: "6px",
              padding: "0.4rem 0.9rem", cursor: "pointer", letterSpacing: "0.05em",
            }}
          >
            NEW CHAT
          </button>
        )}
      </div>

      {!hasStarted ? (
        /* ─── Initial centered view ─── */
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "2rem",
        }}>
          <h1 style={{
            fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
            fontSize: "clamp(2rem, 5vw, 3.5rem)", color: C.accent,
            letterSpacing: "0.05em", marginBottom: "0.75rem",
          }}>
            PITWALL
          </h1>
          <p style={{ color: C.muted, fontSize: "0.95rem", marginBottom: "2rem" }}>
            Agentic RAG for Formula 1 race data
          </p>

          <div style={{ width: "100%", maxWidth: "640px", display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about F1 strategy, lap times, pit stops..."
              style={{
                flex: 1, padding: "1rem 1.25rem", borderRadius: "10px",
                border: `1px solid ${C.border}`,
                background: "rgba(255,255,255,0.04)",
                color: C.text, fontSize: "1rem",
                outline: "none", fontFamily: "Inter, sans-serif",
              }}
            />
            <button
              onClick={() => sendQuestion()}
              style={{
                padding: "1rem 1.5rem", borderRadius: "10px", border: "none",
                background: C.accent, color: C.bg, fontWeight: 700,
                fontFamily: "Rajdhani, sans-serif", fontSize: "1rem",
                letterSpacing: "0.05em", cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              SEND
            </button>
          </div>

          {/* Suggested questions — stagger fade-in */}
          <div style={{
            maxWidth: "640px", width: "100%",
            display: "flex", flexDirection: "column", gap: "0.5rem",
          }}>
            <p className="fade-in" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: C.muted, letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
              TRY ASKING
            </p>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={s}
                onClick={() => {
                  setInput(s);
                  inputRef.current?.focus();
                }}
                style={{
                  textAlign: "left", padding: "0.6rem 1rem", borderRadius: "8px",
                  border: `1px solid ${C.border}`,
                  background: "rgba(0,212,255,0.03)",
                  color: C.muted, fontSize: "0.8rem", cursor: "pointer",
                  fontFamily: "Inter, sans-serif", lineHeight: 1.4,
                  animation: `fadeIn 0.6s ease-out ${0.6 + i * 0.1}s forwards`,
                  opacity: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,212,255,0.08)"; e.currentTarget.style.color = C.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,212,255,0.03)"; e.currentTarget.style.color = C.muted; }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ─── Split layout ─── */
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ─── LEFT: Chat panel (60%) ─── */}
          <div style={{
            width: "60%", display: "flex", flexDirection: "column",
            borderRight: `1px solid ${C.border}`, minWidth: 0,
          }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2rem" }}>
              {messages.map((msg, i) => {
                if (msg.role === "user") {
                  return (
                    <div key={i} className="slide-in-right" style={{
                      display: "flex", justifyContent: "flex-end", marginBottom: "1.25rem",
                    }}>
                      <div style={{
                        maxWidth: "75%", padding: "0.75rem 1.1rem", borderRadius: "14px 14px 4px 14px",
                        background: C.userBg, color: C.text, fontSize: "0.9rem", lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}>
                        {msg.text}
                      </div>
                    </div>
                  );
                }

                if (msg.error) return null;

                const showWarning = needsWarning(msg);

                return (
                  <div key={i} className="slide-in-left" style={{ marginBottom: "1.25rem" }}>
                    {showWarning && (
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: "0.3rem",
                        fontSize: "0.65rem", fontFamily: "JetBrains Mono, monospace",
                        color: "#F59E0B", background: C.warnBg,
                        border: `1px solid ${C.warnBorder}`, borderRadius: "4px",
                        padding: "0.2rem 0.5rem", marginBottom: "0.35rem",
                      }}>
                        ⚠ Low confidence
                      </div>
                    )}
                    <div style={{
                      maxWidth: "80%", padding: "0.75rem 1.1rem", borderRadius: "14px 14px 14px 4px",
                      background: "rgba(0,212,255,0.05)",
                      border: `1px solid rgba(0,212,255,0.15)`,
                      color: C.text, fontSize: "0.9rem", lineHeight: 1.6,
                    }}>
                      <ReactMarkdown>{msg.answer}</ReactMarkdown>
                    </div>
                    <div style={{
                      fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem",
                      color: C.muted, marginTop: "0.35rem",
                      display: "flex", gap: "0.75rem", letterSpacing: "0.02em",
                    }}>
                      <span>{msg.question_type}</span>
                      <span>{msg.retrieval_attempts} attempt{msg.retrieval_attempts !== 1 ? "s" : ""}</span>
                      <span>{msg.latency_ms}ms</span>
                    </div>
                  </div>
                );
              })}

              {error && (
                <div style={{
                  padding: "0.75rem 1rem", borderRadius: "8px",
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                  color: "#F87171", fontSize: "0.85rem", marginBottom: "1rem",
                }}>
                  {error}
                </div>
              )}

              {loading && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <div style={{
                    maxWidth: "80%", padding: "0.75rem 1.1rem", borderRadius: "14px 14px 14px 4px",
                    background: "rgba(0,212,255,0.05)",
                    border: `1px solid rgba(0,212,255,0.15)`,
                    color: "rgba(0,212,255,0.6)", fontSize: "0.85rem",
                    fontFamily: "Inter, sans-serif",
                  }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                      Retrieving F1 data
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "1rem", letterSpacing: "0.15em" }}>
                        <ThinkingDots />
                      </span>
                    </span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input pinned to bottom */}
            <div style={{ padding: "1rem 2rem", borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about F1 strategy, lap times, pit stops..."
                  style={{
                    flex: 1, padding: "0.75rem 1rem", borderRadius: "8px",
                    border: `1px solid ${C.border}`,
                    background: "rgba(255,255,255,0.04)",
                    color: C.text, fontSize: "0.9rem",
                    outline: "none", fontFamily: "Inter, sans-serif",
                  }}
                />
                <button
                  onClick={() => sendQuestion()}
                  disabled={loading}
                  style={{
                    padding: "0.75rem 1.25rem", borderRadius: "8px", border: "none",
                    background: C.accent, color: C.bg, fontWeight: 700,
                    fontFamily: "Rajdhani, sans-serif", fontSize: "0.9rem",
                    letterSpacing: "0.05em",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  ASK
                </button>
              </div>
            </div>
          </div>

          {/* ─── RIGHT: Sources panel (40%) ─── */}
          <div style={{
            width: "40%", display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            <div style={{
              padding: "1rem 1.25rem",
              borderBottom: `1px solid ${C.border}`,
              fontFamily: "Rajdhani, sans-serif", fontWeight: 600,
              fontSize: "0.85rem", letterSpacing: "0.1em", color: C.accent,
            }}>
              SOURCES ({sources.length})
            </div>
            <div style={{
              flex: 1, overflowY: "auto", padding: "1rem 1.25rem",
              display: "flex", flexDirection: "column", gap: "0.75rem",
            }}>
              <SourcesPanel sources={sources} loading={loading} lastQuestionType={lastQuestionType} driversMentioned={driversMentioned} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
