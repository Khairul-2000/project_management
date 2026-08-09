import { useState } from "react";
import { useTheme } from "../lib/theme";
import { login } from "../lib/auth";
import RunningHorseLoader from "./RunningHorseLoader";

export default function LoginPage({ onLoggedIn }) {
  const { colors, card, mode, toggleTheme } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(username.trim(), password);
      onLoggedIn(user);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: `linear-gradient(160deg, ${colors.bg} 0%, ${colors.bgAccent} 100%)`,
        fontFamily: "Manrope, sans-serif",
        color: colors.text,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          ...card,
          width: "100%",
          maxWidth: 380,
          padding: "28px 26px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 12, color: colors.muted, fontWeight: 600, marginBottom: 6 }}>
              Delivery Ops Console
            </div>
            <h1 className="disp" style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
              Sign in
            </h1>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              background: colors.panel2,
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              color: colors.text,
              padding: "8px 10px",
              fontSize: 12,
              fontWeight: 650,
            }}
          >
            {mode === "dark" ? "Light" : "Dark"}
          </button>
        </div>

        <label style={{ display: "block", marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: colors.muted, fontWeight: 650, marginBottom: 5 }}>Username</div>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: colors.panel2,
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              padding: "11px 12px",
              color: colors.text,
              fontSize: 14,
            }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: colors.muted, fontWeight: 650, marginBottom: 5 }}>Password</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: colors.panel2,
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              padding: "11px 12px",
              color: colors.text,
              fontSize: 14,
            }}
          />
        </label>

        {error ? (
          <div style={{ color: colors.late, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{error}</div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          style={{
            width: "100%",
            background: colors.accent,
            color: colors.onAccent,
            border: "none",
            borderRadius: 12,
            padding: "12px 0",
            fontWeight: 750,
            fontSize: 14,
            opacity: busy ? 0.75 : 1,
          }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        {busy ? (
          <div style={{ display: "grid", placeItems: "center", marginTop: 16 }}>
            <RunningHorseLoader size={40} />
          </div>
        ) : null}
      </form>
    </div>
  );
}
