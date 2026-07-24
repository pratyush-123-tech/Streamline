import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";
import { AuthContext } from "../contexts/AuthContext";

export default function LandingPage() {
  const navigate = useNavigate();
  const { handleGuestLogin } = useContext(AuthContext);

  const onGuestClick = async () => {
    try {
      await handleGuestLogin();
    } catch (err) {
      console.error("Guest login failed:", err);
    }
  };

  return (
    <div className="lp-root">
      {/* ── Navbar ── */}
      <nav className="lp-nav">
        <span className="lp-logo">
          <span className="lp-logo-dot" />
          Streamline
        </span>
        <div className="lp-nav-actions">
          <button
            id="guest-nav-btn"
            className="lp-nav-link"
            onClick={onGuestClick}
          >
            Join as Guest
          </button>
          <a href="/auth" className="lp-nav-btn" id="get-started-nav-btn">
            Sign In
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-badge">
            <span className="lp-badge-dot" />
            AI-Powered Video Meetings
          </div>

          <h1 className="lp-hero-title">
            Connect With Anyone,{" "}
            <span className="gradient-text">Anywhere</span>
          </h1>

          <p className="lp-hero-subtitle">
            Crystal-clear video calls with real-time transcription, AI meeting
            summaries, and seamless screen sharing — built for teams and
            individuals alike.
          </p>

          <div className="lp-hero-actions">
            <a href="/auth" className="lp-cta-primary" id="hero-get-started-btn">
              Get Started Free →
            </a>
            <button
              id="hero-guest-btn"
              className="lp-cta-ghost"
              onClick={onGuestClick}
            >
              <span>👤</span> Join as Guest
            </button>
          </div>
        </div>
      </section>

      {/* ── Feature Chips ── */}
      <div className="lp-features">
        {[
          { icon: "🎥", label: "HD Video & Audio" },
          { icon: "🤖", label: "AI Meeting Summaries" },
          { icon: "📝", label: "Live Transcription" },
          { icon: "💬", label: "In-Call Chat" },
          { icon: "🖥️", label: "Screen Sharing" },
          { icon: "📄", label: "Downloadable Transcripts" },
        ].map((f) => (
          <div key={f.label} className="lp-feature-chip">
            <span className="chip-icon">{f.icon}</span>
            {f.label}
          </div>
        ))}
      </div>
    </div>
  );
}