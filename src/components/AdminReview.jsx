"use client";

import { useState, useEffect, useCallback } from "react";

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${url}`);
  return data;
}

const styles = {
  page: { maxWidth: 640, margin: "0 auto", minHeight: "100vh", background: "#0A0A0F", color: "#E8E4DD", fontFamily: "system-ui, sans-serif", padding: 24, boxSizing: "border-box" },
  card: { padding: 16, borderRadius: 12, background: "linear-gradient(145deg, #151520, #1A1A28)", border: "1px solid #2A2A35", marginBottom: 12 },
  btn: (primary) => ({
    padding: "10px 16px", background: primary ? "linear-gradient(135deg, #8B4513, #CD7F32)" : "none",
    border: primary ? "none" : "1px solid #2A2A35", borderRadius: 10,
    color: primary ? "#0A0A0F" : "#8A8070", fontSize: 12, fontWeight: primary ? 700 : 400,
    letterSpacing: 1, cursor: "pointer", fontFamily: "system-ui, sans-serif",
  }),
};

export default function AdminReview() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJSON("/api/admin/club-claims?status=pending");
      setClaims(data.claims);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function review(id, action) {
    setBusyId(id);
    setError("");
    try {
      await fetchJSON(`/api/admin/club-claims/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Club Ownership Claims</h1>
      <div style={{ fontSize: 12, color: "#6B6560", marginBottom: 24 }}>Pending requests — verify before approving.</div>

      {error && <div style={{ color: "#E07856", fontSize: 12, marginBottom: 16 }}>{error}</div>}
      {loading && <div style={{ color: "#6B6560", fontSize: 12 }}>Loading...</div>}
      {!loading && claims.length === 0 && <div style={{ color: "#4A4540", fontSize: 12 }}>No pending claims.</div>}

      {claims.map((c) => (
        <div key={c.id} style={styles.card}>
          <div style={{ fontSize: 15, marginBottom: 4 }}>
            {c.clubs ? `Claiming: ${c.clubs.name} — ${c.clubs.city}` : `New club: ${c.proposed_name} — ${c.proposed_city || "?"}`}
          </div>
          <div style={{ fontSize: 12, color: "#8A8070", marginBottom: 8 }}>
            From {c.profiles?.display_name} ({c.profiles?.email})
          </div>
          <div style={{ fontSize: 13, color: "#A09888", fontStyle: "italic", lineHeight: 1.5, marginBottom: 12, padding: 12, background: "#0E0E14", borderRadius: 8 }}>
            "{c.contact_note}"
          </div>
          <div style={{ fontSize: 10, color: "#4A4540", marginBottom: 12 }}>
            Submitted {new Date(c.created_at).toLocaleString()}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button disabled={busyId === c.id} style={styles.btn(true)} onClick={() => review(c.id, "approve")}>Approve</button>
            <button disabled={busyId === c.id} style={styles.btn(false)} onClick={() => review(c.id, "reject")}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
