import React, { useContext, useState } from "react";
import withAuth from "../utils/withAuth";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

// Generates a human-readable meeting code: 3 groups of 4 alphanumeric chars
function generateMeetingCode() {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  const segment = (len) =>
    Array.from({ length: len }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  return `${segment(4)}-${segment(4)}-${segment(4)}`;
}

function Home() {
  const navigate = useNavigate();
  const isGuest = localStorage.getItem("isGuest") === "true";
  const [meetingCode, setMeetingCode] = useState("");
  const [joining, setJoining] = useState(false);

  // "New meeting" flow
  const [newCode, setNewCode] = useState("");
  const [copied, setCopied] = useState(false);

  const { addToUserHistory } = useContext(AuthContext);

  /* ── Join existing ── */
  const handleJoinVideoCall = async () => {
    if (!meetingCode.trim()) return;
    setJoining(true);
    try { await addToUserHistory(meetingCode.trim()); } catch (_) {}
    navigate(`/${meetingCode.trim()}`);
  };

  /* ── Create new meeting ── */
  const handleCreateMeeting = () => {
    const code = generateMeetingCode();
    setNewCode(code);
    setCopied(false);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(newCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {}
  };

  const handleStartMeeting = async () => {
    if (!newCode) return;
    try { await addToUserHistory(newCode); } catch (_) {}
    navigate(`/${newCode}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("isGuest");
    navigate("/");
  };

  return (
    <div style={s.root}>
      <div style={s.mesh} />

      {/* Navbar */}
      <nav style={s.nav}>
        <span style={s.logoRow}>
          <span style={s.logoDot} />
          <span style={s.logoText}>Streamline</span>
        </span>
        <div style={s.navActions}>
          <button id="history-btn" style={s.navGhost} onClick={() => navigate("/history")}>
            📋 History
          </button>
          <button id="logout-btn" style={s.navLogout} onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main */}
      <main style={s.main}>
        {/* ── Create Meeting card ── */}
        {!isGuest && (
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.iconWrap}>🚀</div>
              <h1 style={s.cardTitle}>New Meeting</h1>
              <p style={s.cardSub}>
                Generate a unique room code and invite others to join you.
              </p>
            </div>

            {!newCode ? (
              <button
                id="create-meeting-btn"
                style={s.createBtn}
                onClick={handleCreateMeeting}
              >
                + Create a Meeting
              </button>
            ) : (
              <div style={s.codeBlock}>
                {/* Generated code display */}
                <div style={s.codeRow}>
                  <span style={s.codeText}>{newCode}</span>
                  <button
                    id="copy-code-btn"
                    style={copied ? s.copiedBtn : s.copyBtn}
                    onClick={handleCopyCode}
                    title="Copy to clipboard"
                  >
                    {copied ? "✓ Copied!" : "📋 Copy"}
                  </button>
                </div>
                <p style={s.codeHint}>Share this code with participants</p>

                <div style={s.codeActions}>
                  <button
                    id="start-meeting-btn"
                    style={s.startBtn}
                    onClick={handleStartMeeting}
                  >
                    Start Meeting →
                  </button>
                  <button
                    id="regenerate-btn"
                    style={s.regenBtn}
                    onClick={handleCreateMeeting}
                  >
                    ↻ New Code
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Divider ── */}
        {!isGuest && (
          <div style={s.divider}>
            <span style={s.dividerLine} />
            <span style={s.dividerText}>or join an existing one</span>
            <span style={s.dividerLine} />
          </div>
        )}

        {/* ── Join Meeting card ── */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={s.iconWrap}>🎥</div>
            <h2 style={s.cardTitle}>Join Meeting</h2>
            <p style={s.cardSub}>
              Enter a meeting code to join an existing call.
            </p>
          </div>

          <div style={s.inputRow}>
            <input
              id="meeting-code-input"
              style={s.input}
              type="text"
              placeholder="Enter meeting code…"
              value={meetingCode}
              onChange={(e) => setMeetingCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoinVideoCall()}
            />
            <button
              id="join-call-btn"
              style={!meetingCode.trim() || joining ? s.joinBtnDisabled : s.joinBtn}
              onClick={handleJoinVideoCall}
              disabled={!meetingCode.trim() || joining}
            >
              {joining ? "Joining…" : "Join →"}
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={s.statsRow}>
          {[
            { icon: "🔒", label: "End-to-End Encrypted" },
            { icon: "⚡", label: "Zero Install" },
            { icon: "🤖", label: "AI Summaries" },
          ].map((item) => (
            <div key={item.label} style={s.statChip}>
              <span>{item.icon}</span>
              <span style={s.statLabel}>{item.label}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

const s = {
  root: {
    minHeight: "100vh",
    width: "100vw",
    background: "var(--bg-primary)",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
  },
  mesh: {
    position: "fixed",
    inset: 0,
    background: "var(--gradient-mesh)",
    pointerEvents: "none",
    zIndex: 0,
  },
  nav: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 2.5rem",
    height: 68,
    background: "rgba(10, 10, 15, 0.75)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderBottom: "1px solid var(--border-subtle)",
  },
  logoRow: { display: "flex", alignItems: "center", gap: 10 },
  logoDot: {
    display: "inline-block",
    width: 8, height: 8,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #ff8c42 0%, #e55d87 100%)",
    boxShadow: "0 0 12px rgba(255,140,66,0.7)",
  },
  logoText: {
    fontSize: "1.2rem", fontWeight: 700,
    color: "var(--text-primary)", letterSpacing: "-0.02em",
  },
  navActions: { display: "flex", alignItems: "center", gap: 10 },
  navGhost: {
    padding: "7px 16px",
    border: "1px solid var(--border-medium)",
    borderRadius: "var(--radius-full)",
    background: "transparent",
    color: "var(--text-secondary)",
    fontSize: "0.85rem", fontWeight: 500,
    cursor: "pointer", fontFamily: "inherit",
  },
  navLogout: {
    padding: "7px 16px",
    border: "1px solid rgba(248, 113, 113, 0.2)",
    borderRadius: "var(--radius-full)",
    background: "rgba(248, 113, 113, 0.1)",
    color: "#f87171",
    fontSize: "0.85rem", fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  },
  main: {
    position: "relative",
    zIndex: 1,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px",
    gap: 16,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-xl)",
    padding: "32px 32px",
    boxShadow: "var(--shadow-lg)",
  },
  cardHeader: { marginBottom: 24, textAlign: "center" },
  iconWrap: { fontSize: "2rem", marginBottom: 12 },
  cardTitle: {
    fontSize: "1.35rem", fontWeight: 700,
    color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: 6,
  },
  cardSub: {
    fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6,
  },

  /* Create button */
  createBtn: {
    width: "100%",
    padding: "13px",
    background: "linear-gradient(135deg, #ff8c42 0%, #e55d87 100%)",
    color: "white",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "0.97rem", fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit",
    boxShadow: "var(--shadow-glow-orange)",
    transition: "opacity 0.15s, transform 0.15s",
  },

  /* Generated code display */
  codeBlock: {
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-medium)",
    borderRadius: "var(--radius-md)",
    padding: "16px",
  },
  codeRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
  },
  codeText: {
    fontFamily: "'Courier New', monospace",
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#ff8c42",
    letterSpacing: "0.12em",
  },
  copyBtn: {
    padding: "6px 14px",
    border: "1px solid var(--border-medium)",
    borderRadius: "var(--radius-full)",
    background: "transparent",
    color: "var(--text-secondary)",
    fontSize: "0.8rem", fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
    whiteSpace: "nowrap",
    transition: "all 0.15s",
  },
  copiedBtn: {
    padding: "6px 14px",
    border: "1px solid rgba(74, 222, 128, 0.35)",
    borderRadius: "var(--radius-full)",
    background: "rgba(74, 222, 128, 0.1)",
    color: "#4ade80",
    fontSize: "0.8rem", fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
    whiteSpace: "nowrap",
  },
  codeHint: {
    fontSize: "0.78rem",
    color: "var(--text-muted)",
    marginBottom: 14,
  },
  codeActions: {
    display: "flex",
    gap: 10,
  },
  startBtn: {
    flex: 1,
    padding: "11px",
    background: "linear-gradient(135deg, #ff8c42 0%, #e55d87 100%)",
    color: "white",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "0.92rem", fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit",
    boxShadow: "var(--shadow-glow-orange)",
  },
  regenBtn: {
    padding: "11px 16px",
    border: "1px solid var(--border-medium)",
    borderRadius: "var(--radius-md)",
    background: "transparent",
    color: "var(--text-secondary)",
    fontSize: "0.88rem", fontWeight: 500,
    cursor: "pointer", fontFamily: "inherit",
    whiteSpace: "nowrap",
  },

  /* Divider */
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    maxWidth: 480,
  },
  dividerLine: { flex: 1, height: 1, background: "var(--border-subtle)" },
  dividerText: { color: "var(--text-muted)", fontSize: "0.8rem", whiteSpace: "nowrap" },

  /* Join section */
  inputRow: { display: "flex", gap: 10 },
  input: {
    flex: 1,
    padding: "12px 16px",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-medium)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    fontFamily: "Inter, sans-serif",
    outline: "none",
  },
  joinBtn: {
    padding: "12px 22px",
    background: "linear-gradient(135deg, #ff8c42 0%, #e55d87 100%)",
    color: "white",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "0.95rem", fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit",
    boxShadow: "var(--shadow-glow-orange)",
    whiteSpace: "nowrap",
  },
  joinBtnDisabled: {
    padding: "12px 22px",
    background: "var(--bg-elevated)",
    color: "var(--text-muted)",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "0.95rem", fontWeight: 700,
    cursor: "not-allowed", fontFamily: "inherit",
    whiteSpace: "nowrap",
  },

  /* Stats strip */
  statsRow: { display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" },
  statChip: {
    display: "flex", alignItems: "center", gap: 7,
    padding: "9px 16px",
    background: "var(--bg-glass)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-full)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  },
  statLabel: { fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 500 },
};

export default withAuth(Home);