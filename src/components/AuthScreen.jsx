"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthScreen() {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName || email.split("@")[0] } },
      });
      setLoading(false);
      if (error) return setError(error.message);
      if (!data.session) {
        setNotice("Check your email to confirm your account, then log in.");
        setMode("login");
        return;
      }
      window.location.reload();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    window.location.reload();
  }

  const inputStyle = {
    width: "100%", padding: "12px 14px", background: "#0E0E14",
    border: "1px solid #2A2A35", borderRadius: 10, color: "#E8E4DD",
    fontSize: 13, fontFamily: "system-ui, sans-serif", outline: "none",
    boxSizing: "border-box", marginBottom: 12,
  };

  return (
    <div style={{
      maxWidth: 420, margin: "0 auto", minHeight: "100vh",
      background: "#0A0A0F", color: "#E8E4DD",
      fontFamily: "'Georgia', 'Palatino', serif",
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: 24, boxSizing: "border-box",
    }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: 6, textTransform: "uppercase", color: "#8A8070", marginBottom: 6 }}>Digital Passport</div>
        <h1 style={{ fontSize: 28, fontWeight: 400, margin: "0 0 2px", letterSpacing: 1, color: "#F0EDE6" }}>JACK OFF CLUBS</h1>
        <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, transparent, #CD7F32, transparent)", margin: "12px auto" }} />
      </div>

      <form onSubmit={handleSubmit}>
        {mode === "signup" && (
          <input
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={inputStyle}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={inputStyle}
        />

        {error && <div style={{ color: "#E07856", fontSize: 12, fontFamily: "system-ui, sans-serif", marginBottom: 12 }}>{error}</div>}
        {notice && <div style={{ color: "#CD7F32", fontSize: 12, fontFamily: "system-ui, sans-serif", marginBottom: 12 }}>{notice}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%", padding: "14px 24px",
            background: "linear-gradient(135deg, #8B4513 0%, #CD7F32 100%)",
            border: "none", borderRadius: 12, color: "#0A0A0F",
            fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase",
            cursor: loading ? "default" : "pointer", fontFamily: "system-ui, sans-serif",
            opacity: loading ? 0.6 : 1, marginBottom: 12,
          }}
        >
          {loading ? "..." : mode === "login" ? "Log In" : "Sign Up"}
        </button>
      </form>

      <button
        onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setNotice(""); }}
        style={{
          background: "none", border: "none", color: "#8A8070",
          fontSize: 12, fontFamily: "system-ui, sans-serif", cursor: "pointer", textAlign: "center",
        }}
      >
        {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
      </button>
    </div>
  );
}
