import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function History() {
  const { getHistoryOfUser } = useContext(AuthContext);
  const [meetings, setMeetings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const normalize = (history) => {
      if (!history) return [];
      if (Array.isArray(history)) return history;
      if (typeof history === "string") {
        try {
          const parsed = JSON.parse(history);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          return [];
        }
      }
      if (typeof history === "object") {
        if (Array.isArray(history.data)) return history.data;
        if (Array.isArray(history.meetings)) return history.meetings;
        if (Array.isArray(history.items)) return history.items;
      }
      return [];
    };

    const fetchHistory = async () => {
      try {
        const raw = await getHistoryOfUser();
        if (mounted) setMeetings(normalize(raw));
      } catch {
        if (mounted) setMeetings([]);
      }
    };

    fetchHistory();
    return () => { mounted = false; };
  }, [getHistoryOfUser]);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div style={s.root}>
      <div style={s.mesh} />

      {/* Nav */}
      <nav style={s.nav}>
        <button id="back-home-btn" style={s.backBtn} onClick={() => navigate("/home")}>
          ← Back
        </button>
        <span style={s.navTitle}>Meeting History</span>
        <span />
      </nav>

      {/* Content */}
      <main style={s.main}>
        <div style={s.container}>
          <div style={s.header}>
            <h1 style={s.heading}>Your Meetings</h1>
            <p style={s.sub}>All meetings you have participated in.</p>
          </div>

          {meetings.length === 0 ? (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>📭</div>
              <p style={s.emptyTitle}>No meetings yet</p>
              <p style={s.emptySub}>
                When you join a meeting, it will appear here.
              </p>
              <button
                id="go-home-empty-btn"
                style={s.goHomeBtn}
                onClick={() => navigate("/home")}
              >
                Start a Meeting
              </button>
            </div>
          ) : (
            <div style={s.list}>
              {meetings.map((e, i) => (
                <div key={e.id ?? e.meetingCode ?? i} style={s.meetingCard}>
                  <div style={s.meetingIcon}>🎥</div>
                  <div style={s.meetingInfo}>
                    <p style={s.meetingCode}>
                      {e.meetingCode ?? "Unknown Code"}
                    </p>
                    <p style={s.meetingDate}>{formatDate(e.date)}</p>
                  </div>
                  <button
                    id={`rejoin-btn-${i}`}
                    style={s.rejoinBtn}
                    onClick={() => navigate(`/${e.meetingCode}`)}
                  >
                    Rejoin
                  </button>
                </div>
              ))}
            </div>
          )}
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
  backBtn: {
    padding: "7px 16px",
    border: "1px solid var(--border-medium)",
    borderRadius: "var(--radius-full)",
    background: "transparent",
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  navTitle: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  main: {
    position: "relative",
    zIndex: 1,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "48px 24px",
  },
  container: {
    width: "100%",
    maxWidth: 600,
  },
  header: {
    marginBottom: 32,
  },
  heading: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
    marginBottom: 6,
  },
  sub: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  meetingCard: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "18px 20px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    transition: "border-color 0.15s ease",
  },
  meetingIcon: {
    fontSize: "1.4rem",
    flexShrink: 0,
  },
  meetingInfo: {
    flex: 1,
  },
  meetingCode: {
    fontSize: "0.97rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 2,
    fontFamily: "monospace",
  },
  meetingDate: {
    fontSize: "0.82rem",
    color: "var(--text-muted)",
  },
  rejoinBtn: {
    padding: "7px 16px",
    background: "linear-gradient(135deg, #ff8c42 0%, #e55d87 100%)",
    color: "white",
    border: "none",
    borderRadius: "var(--radius-full)",
    fontSize: "0.82rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "var(--shadow-glow-orange)",
    transition: "opacity 0.15s, transform 0.15s",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 24px",
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-xl)",
  },
  emptyIcon: {
    fontSize: "3rem",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 8,
  },
  emptySub: {
    fontSize: "0.88rem",
    color: "var(--text-secondary)",
    marginBottom: 24,
  },
  goHomeBtn: {
    padding: "11px 28px",
    background: "linear-gradient(135deg, #ff8c42 0%, #e55d87 100%)",
    color: "white",
    border: "none",
    borderRadius: "var(--radius-full)",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "var(--shadow-glow-orange)",
  },
};
