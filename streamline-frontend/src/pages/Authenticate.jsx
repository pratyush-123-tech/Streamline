import * as React from "react";
import { AuthContext } from "../contexts/AuthContext";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

export default function Authenticate() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [formState, setFormState] = React.useState(0); // 0 = sign in, 1 = sign up
  const [snackMsg, setSnackMsg] = React.useState("");
  const [snackOpen, setSnackOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const { handleLogin, handleRegister } = React.useContext(AuthContext);

  const handleAuth = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (formState === 0) {
        await handleLogin(username, password);
      } else {
        const result = await handleRegister(username, password);
        setSnackMsg(result || "Account created!");
        setSnackOpen(true);
        setFormState(0);
        setUsername("");
        setPassword("");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.root}>
      {/* Background mesh */}
      <div style={s.mesh} />

      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoRow}>
          <div style={s.logoDot} />
          <span style={s.logoText}>Streamline</span>
        </div>

        {/* Heading */}
        <h1 style={s.heading}>
          {formState === 0 ? "Welcome back" : "Create account"}
        </h1>
        <p style={s.subheading}>
          {formState === 0
            ? "Sign in to your account to continue"
            : "Join Streamline and start collaborating"}
        </p>

        {/* Tab toggle */}
        <div style={s.tabRow}>
          <button
            id="tab-signin"
            style={formState === 0 ? s.tabActive : s.tabInactive}
            onClick={() => { setFormState(0); setError(""); }}
          >
            Sign In
          </button>
          <button
            id="tab-signup"
            style={formState === 1 ? s.tabActive : s.tabInactive}
            onClick={() => { setFormState(1); setError(""); }}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <div style={s.formGroup}>
          <label style={s.label} htmlFor="auth-username">Username</label>
          <input
            id="auth-username"
            style={s.input}
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            autoFocus
          />
        </div>

        <div style={s.formGroup}>
          <label style={s.label} htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            style={s.input}
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
          />
        </div>

        {error && <p style={s.errorMsg}>{error}</p>}

        <button
          id="auth-submit-btn"
          style={loading ? s.submitBtnDisabled : s.submitBtn}
          onClick={handleAuth}
          disabled={loading}
        >
          {loading ? "Please wait…" : formState === 0 ? "Sign In →" : "Create Account →"}
        </button>

        <div style={s.divider}>
          <span style={s.dividerLine} />
          <span style={s.dividerText}>or</span>
          <span style={s.dividerLine} />
        </div>

        <a href="/" style={s.backLink}>← Back to home</a>
      </div>

      <Snackbar
        open={snackOpen}
        autoHideDuration={4000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" sx={{ width: "100%" }}>
          {snackMsg}
        </Alert>
      </Snackbar>
    </div>
  );
}

const s = {
  root: {
    minHeight: "100vh",
    width: "100vw",
    background: "var(--bg-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
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
  card: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 440,
    background: "var(--bg-card)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-xl)",
    padding: "40px 36px",
    boxShadow: "var(--shadow-lg)",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 28,
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #ff8c42 0%, #e55d87 100%)",
    boxShadow: "0 0 12px rgba(255,140,66,0.7)",
  },
  logoText: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
  },
  heading: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
    marginBottom: 6,
  },
  subheading: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    marginBottom: 28,
  },
  tabRow: {
    display: "flex",
    background: "var(--bg-elevated)",
    borderRadius: "var(--radius-md)",
    padding: 4,
    gap: 4,
    marginBottom: 28,
    border: "1px solid var(--border-subtle)",
  },
  tabActive: {
    flex: 1,
    padding: "9px 0",
    border: "none",
    borderRadius: 9,
    background: "var(--bg-card)",
    color: "var(--text-primary)",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "var(--shadow-sm)",
    transition: "all var(--transition-fast)",
  },
  tabInactive: {
    flex: 1,
    padding: "9px 0",
    border: "none",
    borderRadius: 9,
    background: "transparent",
    color: "var(--text-muted)",
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    display: "block",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    letterSpacing: "0.04em",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-medium)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    fontFamily: "Inter, sans-serif",
    outline: "none",
    transition: "border-color var(--transition-fast)",
  },
  errorMsg: {
    color: "#f87171",
    fontSize: "0.83rem",
    marginBottom: 12,
    padding: "10px 14px",
    background: "rgba(248, 113, 113, 0.1)",
    borderRadius: "var(--radius-sm)",
    border: "1px solid rgba(248, 113, 113, 0.2)",
  },
  submitBtn: {
    width: "100%",
    padding: "13px",
    background: "linear-gradient(135deg, #ff8c42 0%, #e55d87 100%)",
    color: "white",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "0.97rem",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "var(--shadow-glow-orange)",
    transition: "opacity var(--transition-fast), transform var(--transition-fast)",
    marginTop: 4,
  },
  submitBtnDisabled: {
    width: "100%",
    padding: "13px",
    background: "var(--bg-elevated)",
    color: "var(--text-muted)",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "0.97rem",
    fontWeight: 600,
    cursor: "not-allowed",
    marginTop: 4,
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "22px 0",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "var(--border-subtle)",
  },
  dividerText: {
    color: "var(--text-muted)",
    fontSize: "0.8rem",
  },
  backLink: {
    display: "block",
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: "0.88rem",
    textDecoration: "none",
    transition: "color var(--transition-fast)",
  },
};
