import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

const C = {
  bg: "#0A1A0F",
  accent: "#3BE07A",
  text: "#F0F0F0",
  muted: "#9CA3AF",
  border: "rgba(59,224,122,0.12)",
  userBg: "#1A3D22",
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
  race_summary:  { bg: "rgba(59,224,122,0.2)",  text: "#3BE07A" },
};

function ChunkCard({ chunk }) {
  const [expanded, setExpanded] = useState(false);
  const ts = TYPE_STYLES[chunk.chunk_type] || { bg: "rgba(255,255,255,0.06)", text: C.muted };

  return (
    <div style={{
      border: `1px solid ${C.border}`,
      borderRadius: "8px",
      padding: "0.75rem",
      background: "rgba(59,224,122,0.03)",
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

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState("");
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
      const res = await fetch("http://localhost:8000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();

      const rawAnswer = data.answer || "";
      const displayAnswer = rawAnswer.startsWith("[Low confidence") || rawAnswer.startsWith("[Low confidence")
        ? rawAnswer.replace(/^\[Low confidence[^\]]*\]\s*/i, "")
        : rawAnswer;

      const assistantMsg = {
        role: "assistant",
        answer: displayAnswer,
        rawAnswer,
        latency_ms: data.latency_ms ?? 0,
        retrieval_attempts: data.retrieval_attempts ?? 0,
        question_type: data.question_type ?? "general",
      };
      setMessages((prev) => [...prev, assistantMsg]);
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
    <div style={{
      background: C.bg, color: C.text, minHeight: "100dvh",
      display: "flex", flexDirection: "column",
      fontFamily: "Inter, sans-serif",
    }}>
      {/* ─── Top bar ─── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 2rem",
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(10,26,15,0.85)",
        backdropFilter: "blur(12px)",
        position: "relative", zIndex: 10,
      }}>
        <button
          onClick={() => navigate("/")}
          style={{
            fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
            fontSize: "1.25rem", letterSpacing: "0.15em",
            color: C.accent, background: "none", border: "none", cursor: "pointer",
          }}
        >
          PITWALL
        </button>
        {hasStarted && (
          <button
            onClick={() => { setMessages([]); setSources([]); setHasStarted(false); setError(""); }}
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

          {/* Suggested questions */}
          <div style={{
            maxWidth: "640px", width: "100%",
            display: "flex", flexDirection: "column", gap: "0.5rem",
          }}>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: C.muted, letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
              TRY ASKING
            </p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setInput(s);
                  inputRef.current?.focus();
                }}
                style={{
                  textAlign: "left", padding: "0.6rem 1rem", borderRadius: "8px",
                  border: `1px solid ${C.border}`,
                  background: "rgba(59,224,122,0.03)",
                  color: C.muted, fontSize: "0.8rem", cursor: "pointer",
                  fontFamily: "Inter, sans-serif", lineHeight: 1.4,
                  transition: "background 0.2s, color 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(59,224,122,0.08)"; e.currentTarget.style.color = C.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(59,224,122,0.03)"; e.currentTarget.style.color = C.muted; }}
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
                    <div key={i} style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.25rem" }}>
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
                  <div key={i} style={{ marginBottom: "1.25rem" }}>
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
                      background: "rgba(59,224,122,0.05)",
                      border: `1px solid rgba(59,224,122,0.15)`,
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
                    background: "rgba(59,224,122,0.05)",
                    border: `1px solid rgba(59,224,122,0.15)`,
                    color: "rgba(59,224,122,0.6)", fontSize: "0.85rem",
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
              {sources.length === 0 && !loading && (
                <p style={{
                  color: C.muted, fontSize: "0.85rem", textAlign: "center",
                  padding: "3rem 1rem", lineHeight: 1.6,
                }}>
                  Retrieved sources will appear here after your first question
                </p>
              )}
              {sources.map((chunk, i) => (
                <ChunkCard key={i} chunk={chunk} />
              ))}
              {loading && (
                <p style={{
                  color: C.muted, fontSize: "0.75rem", textAlign: "center",
                  fontFamily: "JetBrains Mono, monospace", padding: "2rem 0",
                }}>
                  Loading chunks...
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
