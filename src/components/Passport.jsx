"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ACHIEVEMENT_DEFS, ALL_REGIONS, getTier } from "@/lib/achievements";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeClub(c) {
  return { id: c.id, name: c.name, city: c.city, region: c.region, country: c.country, logoUrl: c.logo_url, avgRating: c.avg_rating, code: c.code };
}

function getTierStyle(tier) {
  const styles = {
    Platinum: "linear-gradient(135deg, #667085 0%, #B0C4DE 50%, #E8ECF0 100%)",
    Gold: "linear-gradient(135deg, #92651B 0%, #D4A017 50%, #F5D562 100%)",
    Silver: "linear-gradient(135deg, #6B6B6B 0%, #A8A8A8 50%, #E0E0E0 100%)",
    Bronze: "linear-gradient(135deg, #8B4513 0%, #CD7F32 50%, #E8B87A 100%)",
  };
  return styles[tier] || styles.Bronze;
}

function getNextTier(uniqueClubs) {
  if (uniqueClubs >= 20) return null;
  if (uniqueClubs >= 10) return { name: "Platinum", need: 20 };
  if (uniqueClubs >= 5) return { name: "Gold", need: 10 };
  return { name: "Silver", need: 5 };
}

function fmtDate(d) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function fmtTime(d) { return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${url}`);
  return data;
}

function ClubLogo({ club, size = 40 }) {
  if (club?.logoUrl) {
    return (
      <img
        src={club.logoUrl}
        alt={club.name}
        style={{
          width: size, height: size, borderRadius: size * 0.2,
          objectFit: "cover", background: "#1A1A28",
        }}
        onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.2,
      background: "linear-gradient(135deg, #2A2A35, #1A1A28)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, color: "#CD7F32", fontWeight: 700,
      fontFamily: "system-ui, sans-serif",
    }}>
      {club?.name?.charAt(0) || "?"}
    </div>
  );
}

// ─── Shared Components ───────────────────────────────────────────────────────

function StarRating({ rating, size = 16, interactive = false, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s}
          onClick={() => interactive && onChange?.(s)}
          onMouseEnter={() => interactive && setHover(s)}
          onMouseLeave={() => interactive && setHover(0)}
          style={{ fontSize: size, cursor: interactive ? "pointer" : "default", color: s <= (hover || rating) ? "#D4A017" : "#2A2A35", transition: "color 0.15s", userSelect: "none" }}>
          ★
        </span>
      ))}
    </div>
  );
}

function Badge({ bg, children }) {
  return (
    <span style={{ display: "inline-flex", padding: "4px 12px", borderRadius: 16, background: bg, fontSize: 12, fontWeight: 700, color: "#1A1A1A", letterSpacing: 2, textTransform: "uppercase", fontFamily: "system-ui, sans-serif" }}>
      {children}
    </span>
  );
}

function Btn({ primary, children, ...props }) {
  return (
    <button {...props} style={{
      padding: primary ? "14px 24px" : "12px 20px",
      background: primary ? "linear-gradient(135deg, #8B4513 0%, #CD7F32 100%)" : "none",
      border: primary ? "none" : "1px solid #2A2A35",
      borderRadius: 12,
      color: primary ? "#0A0A0F" : "#8A8070",
      fontSize: 12, fontWeight: primary ? 700 : 400,
      letterSpacing: 3, textTransform: "uppercase",
      cursor: "pointer", fontFamily: "system-ui, sans-serif",
      width: "100%", transition: "all 0.2s",
      ...props.style,
    }}>
      {children}
    </button>
  );
}

function Card({ children, style, ...props }) {
  return (
    <div {...props} style={{
      padding: 16, borderRadius: 12,
      background: "linear-gradient(145deg, #151520, #1A1A28)",
      border: "1px solid #2A2A35", ...style,
    }}>
      {children}
    </div>
  );
}

function Overlay({ onClose, children }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.88)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#151520", borderRadius: 16, padding: 28,
        maxWidth: 340, width: "100%", border: "1px solid #2A2A35",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        {children}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#6B6560", fontFamily: "system-ui, sans-serif", marginBottom: 12 }}>
      {children}
    </div>
  );
}

// ─── Toast / Notification ────────────────────────────────────────────────────

function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 300,
      background: "linear-gradient(135deg, #8B4513, #CD7F32)", color: "#0A0A0F",
      padding: "12px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700,
      fontFamily: "system-ui, sans-serif", letterSpacing: 1,
      boxShadow: "0 8px 32px rgba(205,127,50,0.4)",
      animation: "slideDown 0.3s ease",
    }}>
      {message}
    </div>
  );
}

// ─── New Achievement Celebration ─────────────────────────────────────────────

function AchievementCelebration({ achievement, onClose }) {
  const def = ACHIEVEMENT_DEFS.find(a => a.type === achievement);
  if (!def) return null;
  return (
    <Overlay onClose={onClose}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 14, letterSpacing: 4, color: "#CD7F32", fontFamily: "system-ui, sans-serif", marginBottom: 12 }}>
          ACHIEVEMENT UNLOCKED
        </div>
        <div style={{ fontSize: 64, marginBottom: 12 }}>{def.icon}</div>
        <div style={{ fontSize: 22, color: "#F0EDE6", marginBottom: 4 }}>{def.title}</div>
        <div style={{ fontSize: 13, color: "#8A8070", fontFamily: "system-ui, sans-serif", marginBottom: 24 }}>{def.desc}</div>
        <Btn primary onClick={onClose}>Nice!</Btn>
      </div>
    </Overlay>
  );
}

// ─── QR Scanner Simulation ───────────────────────────────────────────────────
// No camera integration yet — stands in for a real scanner until one's wired up.
// Real check-ins still go through POST /api/checkin/[code] with each club's real code.

function QRScanner({ clubs, onScan, onClose }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const filtered = clubs.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Overlay onClose={onClose}>
      <div style={{ textAlign: "center", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 12, letterSpacing: 3, color: "#CD7F32", fontFamily: "system-ui, sans-serif", marginBottom: 12 }}>
          SIMULATE QR SCAN
        </div>
        <div style={{ fontSize: 12, color: "#6B6560", fontFamily: "system-ui, sans-serif", marginBottom: 16 }}>
          Select a club to check in
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clubs..."
          style={{
            width: "100%", padding: "10px 14px", background: "#0E0E14",
            border: "1px solid #2A2A35", borderRadius: 10, color: "#E8E4DD",
            fontSize: 13, fontFamily: "system-ui, sans-serif", outline: "none",
            marginBottom: 12, boxSizing: "border-box",
          }}
        />
        <div style={{ overflowY: "auto", maxHeight: 280, marginBottom: 16 }}>
          {filtered.map(club => (
            <div key={club.id}
              onClick={() => setSelected(club.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                background: selected === club.id ? "rgba(205,127,50,0.15)" : "transparent",
                border: selected === club.id ? "1px solid #CD7F32" : "1px solid transparent",
                marginBottom: 4, transition: "all 0.15s",
              }}>
              <ClubLogo club={club} size={32} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 13, color: "#E8E4DD" }}>{club.name}</div>
                <div style={{ fontSize: 10, color: "#5A5550", fontFamily: "system-ui, sans-serif" }}>{club.city}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn primary onClick={() => selected && onScan(clubs.find(c => c.id === selected)?.code)} style={{ opacity: selected ? 1 : 0.4 }}>
            Check In
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Stamp Detail + Review ───────────────────────────────────────────────────

function StampDetail({ checkIn, club, review, onSaveReview, onClose }) {
  const [editing, setEditing] = useState(false);
  const [draftRating, setDraftRating] = useState(review?.rating || 0);
  const [draftBody, setDraftBody] = useState(review?.body || "");

  const visitCount = checkIn.visitCount || 1;

  function save() {
    onSaveReview(club.id, checkIn.id, draftRating, draftBody);
    setEditing(false);
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ textAlign: "center" }}>
        <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}><ClubLogo club={club} size={64} /></div>
        <div style={{ fontSize: 20, color: "#F0EDE6", marginBottom: 2 }}>{club.name}</div>
        <div style={{ fontSize: 13, color: "#8A8070", fontFamily: "system-ui, sans-serif", marginBottom: 8 }}>{club.city}</div>

        {visitCount > 1 && (
          <div style={{ fontSize: 10, color: "#CD7F32", fontFamily: "system-ui, sans-serif", marginBottom: 8, letterSpacing: 2 }}>
            VISITED {visitCount} TIMES
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          {!editing ? (
            <StarRating rating={review?.rating || 0} size={20} />
          ) : (
            <StarRating rating={draftRating} size={24} interactive onChange={setDraftRating} />
          )}
        </div>

        <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, transparent, #CD7F32, transparent)", margin: "12px auto" }} />

        {!editing ? (
          review?.body ? (
            <div style={{ fontSize: 13, color: "#A09888", fontStyle: "italic", lineHeight: 1.6, fontFamily: "system-ui, sans-serif", margin: "12px 0", padding: "0 8px" }}>
              "{review.body}"
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#4A4540", fontFamily: "system-ui, sans-serif", margin: "12px 0" }}>No review yet</div>
          )
        ) : (
          <textarea value={draftBody} onChange={e => setDraftBody(e.target.value)} placeholder="Share your experience..."
            style={{ width: "100%", minHeight: 80, background: "#0E0E14", border: "1px solid #2A2A35", borderRadius: 10, padding: 12, color: "#E8E4DD", fontSize: 13, fontFamily: "system-ui, sans-serif", resize: "vertical", outline: "none", lineHeight: 1.5, boxSizing: "border-box", margin: "8px 0" }}
          />
        )}

        <div style={{ fontSize: 12, color: "#6B6560", fontFamily: "system-ui, sans-serif", marginTop: 4 }}>
          Last visit: {fmtDate(checkIn.date)} at {fmtTime(checkIn.date)}
        </div>
        <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#CD7F32", fontFamily: "system-ui, sans-serif", marginTop: 4 }}>
          {club.region} Region
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          {!editing ? (
            <>
              <Btn primary onClick={() => { setDraftRating(review?.rating || 0); setDraftBody(review?.body || ""); setEditing(true); }}>
                {review?.body ? "Edit review" : "Leave review"}
              </Btn>
              <Btn onClick={onClose}>Close</Btn>
            </>
          ) : (
            <>
              <Btn primary onClick={save} style={{ opacity: draftRating > 0 ? 1 : 0.4 }}>Save</Btn>
              <Btn onClick={() => setEditing(false)}>Cancel</Btn>
            </>
          )}
        </div>
      </div>
    </Overlay>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function Passport() {
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState("passport"); // passport | admin
  const [tab, setTab] = useState("stamps");
  const [adminTab, setAdminTab] = useState("overview");

  const [sessionUser, setSessionUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ total_checkins: 0, unique_clubs: 0, unique_regions: 0, total_reviews: 0 });
  const [clubs, setClubs] = useState([]);
  const [scannableClubs, setScannableClubs] = useState([]);
  const [stamps, setStamps] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  const [selectedStamp, setSelectedStamp] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [toast, setToast] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [qrActive, setQrActive] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const buildStamps = useCallback((checkInRows, clubsById) => {
    const byClub = new Map();
    for (const row of checkInRows) {
      const existing = byClub.get(row.club_id);
      const isNewer = !existing || new Date(row.checked_in_at) > new Date(existing.date);
      byClub.set(row.club_id, {
        id: isNewer ? row.id : existing.id,
        clubId: row.club_id,
        date: isNewer ? row.checked_in_at : existing.date,
        visitCount: (existing?.visitCount || 0) + 1,
      });
    }
    return [...byClub.values()].map(s => ({ ...s, club: clubsById.get(s.clubId) }));
  }, []);

  const refreshAll = useCallback(async () => {
    const [me, clubsRes, checkinsRes, achievementsRes, leaderboardRes] = await Promise.all([
      fetchJSON("/api/auth/me"),
      fetchJSON("/api/clubs"),
      fetchJSON("/api/checkins"),
      fetchJSON("/api/achievements"),
      fetchJSON("/api/leaderboard"),
    ]);

    const normalizedClubs = clubsRes.clubs.map(normalizeClub);
    const clubsById = new Map(normalizedClubs.map(c => [c.id, c]));

    setSessionUser(me.user);
    setProfile(me.profile);
    setStats(me.stats || { total_checkins: 0, unique_clubs: 0, unique_regions: 0, total_reviews: 0 });
    setClubs(normalizedClubs);
    setStamps(buildStamps(checkinsRes.checkIns, clubsById));
    setReviews(checkinsRes.reviews.map(r => ({ clubId: r.club_id, checkInId: r.check_in_id, rating: r.rating, body: r.body })));
    setAchievements(achievementsRes.achievements.map(a => a.achievement_type));
    setLeaderboard(leaderboardRes.leaderboard.map(row => {
      const home = clubsById.get(row.home_club_id);
      return {
        userId: row.user_id, name: row.display_name, clubs: row.unique_clubs, tier: row.tier,
        homeClub: home ? `${home.name} — ${home.city.split(",")[0]}` : "No home club set",
        isYou: row.user_id === me.user?.id,
      };
    }));

    return me.user?.id;
  }, [buildStamps]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const userId = await refreshAll();
        if (cancelled) return;
        if (userId) {
          const scannable = await fetchJSON("/api/clubs/scannable");
          if (!cancelled) setScannableClubs(scannable.clubs.map(normalizeClub));
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshAll]);

  // PWA install prompt
  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (window.navigator.standalone === true) return;
    const dismissed = sessionStorage.getItem("installDismissed");
    if (dismissed) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowInstallPrompt(true), 3000);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      setTimeout(() => setShowInstallPrompt(true), 3000);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      });
    }
  }

  function dismissInstall() {
    setShowInstallPrompt(false);
    sessionStorage.setItem("installDismissed", "true");
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  }

  async function handleCheckIn(code) {
    if (!code) return;
    setShowScanner(false);
    try {
      const data = await fetchJSON(`/api/checkin/${code}`, { method: "POST" });
      setToast(`Checked in at ${data.club.name}!`);
      await refreshAll();
      if (data.newAchievements?.length > 0) {
        setTimeout(() => setCelebration(data.newAchievements[0]), 800);
      }
    } catch (err) {
      setToast(err.message || "Check-in failed");
    }
  }

  async function handleSaveReview(clubId, checkInId, rating, body) {
    try {
      const data = await fetchJSON("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, checkInId, rating, body }),
      });
      setToast("Review saved!");
      await refreshAll();
      setSelectedStamp(prev => prev ? { ...prev, _refresh: Date.now() } : prev);
      if (data.newAchievements?.length > 0) {
        setTimeout(() => setCelebration(data.newAchievements[0]), 800);
      }
    } catch (err) {
      setToast(err.message || "Could not save review");
    }
  }

  async function handleSaveProfile(draft) {
    try {
      await fetchJSON("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: draft.displayName, city: draft.city, bio: draft.bio, home_club_id: draft.homeClubId }),
      });
      await refreshAll();
      setEditingProfile(false);
      setToast("Profile updated!");
    } catch (err) {
      setToast(err.message || "Could not update profile");
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "center", color: "#8A8070", fontFamily: "system-ui, sans-serif", fontSize: 13, letterSpacing: 2 }}>
        LOADING PASSPORT...
      </div>
    );
  }

  const uniqueClubIds = [...new Set(stamps.map(s => s.clubId))];
  const uniqueRegions = [...new Set(stamps.map(s => s.club?.region).filter(Boolean))];
  const tier = profile?.tier || getTier(uniqueClubIds.length);
  const nextTier = getNextTier(uniqueClubIds.length);
  const earnedAchievements = achievements;

  const homeClub = clubs.find(c => c.id === profile?.home_club_id);
  const adminClub = homeClub || clubs[0];
  const adminStamps = adminClub ? stamps.filter(s => s.clubId === adminClub.id) : [];
  const adminReviews = adminClub ? reviews.filter(r => r.clubId === adminClub.id) : [];

  return (
    <div style={{
      maxWidth: 420, margin: "0 auto", minHeight: "100vh",
      background: "#0A0A0F", fontFamily: "'Georgia', 'Palatino', serif",
      color: "#E8E4DD", position: "relative", overflow: "hidden",
    }}>
      <style>{`@keyframes slideDown { from { opacity:0; transform: translateX(-50%) translateY(-20px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }`}</style>

      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(205,127,50,0.08) 0%, transparent 60%)", pointerEvents: "none", zIndex: 0 }} />

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {celebration && <AchievementCelebration achievement={celebration} onClose={() => setCelebration(null)} />}

      {/* Install Prompt */}
      {showInstallPrompt && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 250,
          background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.6) 20%)",
          padding: "40px 0 0",
        }}>
          <div style={{
            maxWidth: 420, margin: "0 auto",
            background: "#1A1A28", borderTop: "1px solid #CD7F32",
            borderRadius: "16px 16px 0 0",
            padding: "20px 24px 28px",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: "linear-gradient(135deg, #8B4513, #CD7F32)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}>
                📱
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, color: "#F0EDE6", marginBottom: 4 }}>
                  Add to Home Screen
                </div>
                {deferredPrompt ? (
                  <div style={{ fontSize: 12, color: "#8A8070", lineHeight: 1.5, fontFamily: "system-ui, sans-serif" }}>
                    Install the Jack Off Clubs passport for quick access — works like a native app.
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#8A8070", lineHeight: 1.5, fontFamily: "system-ui, sans-serif" }}>
                    Tap the <span style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle", padding: "1px 4px", background: "#2A2A35", borderRadius: 4, fontSize: 14 }}>
                      ⬆
                    </span> share button below, then tap <strong style={{ color: "#CD7F32" }}>"Add to Home Screen"</strong> for the full app experience.
                  </div>
                )}
              </div>
              <button onClick={dismissInstall} style={{
                background: "none", border: "none", color: "#5A5550",
                fontSize: 18, cursor: "pointer", padding: "0 4px", lineHeight: 1,
              }}>✕</button>
            </div>

            {deferredPrompt && (
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <Btn primary onClick={handleInstall} style={{ flex: 1 }}>Install App</Btn>
                <Btn onClick={dismissInstall} style={{ flex: 0 }}>Later</Btn>
              </div>
            )}
          </div>
        </div>
      )}
      {showScanner && <QRScanner clubs={scannableClubs} onScan={handleCheckIn} onClose={() => setShowScanner(false)} />}
      {selectedStamp && (
        <StampDetail
          checkIn={selectedStamp}
          club={clubs.find(c => c.id === selectedStamp.clubId)}
          review={reviews.find(r => r.clubId === selectedStamp.clubId)}
          onSaveReview={handleSaveReview}
          onClose={() => setSelectedStamp(null)}
        />
      )}

      {/* Profile Overlay */}
      {showProfile && profile && (() => {
        const ProfileContent = () => {
          const [draft, setDraft] = useState({
            displayName: profile.display_name, email: profile.email, city: profile.city || "",
            bio: profile.bio || "", homeClubId: profile.home_club_id || "",
          });
          const hc = clubs.find(c => c.id === draft.homeClubId);

          return (
            <Overlay onClose={() => { setShowProfile(false); setEditingProfile(false); }}>
              <div style={{ maxHeight: "75vh", overflowY: "auto" }}>
                {/* Avatar */}
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: 36, margin: "0 auto 12px",
                    background: "linear-gradient(135deg, #8B4513, #CD7F32)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 28, color: "#0A0A0F", fontWeight: 700, fontFamily: "system-ui, sans-serif",
                  }}>
                    {(draft.displayName || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  {!editingProfile && (
                    <>
                      <div style={{ fontSize: 20, color: "#F0EDE6", marginBottom: 2 }}>{profile.display_name}</div>
                      <div style={{ fontSize: 12, color: "#6B6560", fontFamily: "system-ui, sans-serif" }}>{profile.email}</div>
                    </>
                  )}
                </div>

                {!editingProfile ? (
                  <>
                    {/* Profile Details */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                      {[
                        { label: "Home Club", value: hc ? `${hc.name} — ${hc.city}` : "Not set" },
                        { label: "Location", value: profile.city || "Not set" },
                        { label: "Member Since", value: profile.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—" },
                        { label: "Tier", value: tier },
                        { label: "Clubs Visited", value: uniqueClubIds.length },
                        { label: "Reviews Left", value: reviews.length },
                      ].map(item => (
                        <div key={item.label} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "8px 0", borderBottom: "1px solid #1A1A22",
                        }}>
                          <span style={{ fontSize: 12, color: "#6B6560", fontFamily: "system-ui, sans-serif" }}>{item.label}</span>
                          <span style={{ fontSize: 13, color: "#E8E4DD", fontFamily: "system-ui, sans-serif" }}>{item.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Bio */}
                    {profile.bio && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#6B6560", fontFamily: "system-ui, sans-serif", marginBottom: 6 }}>About</div>
                        <div style={{ fontSize: 13, color: "#A09888", lineHeight: 1.6, fontFamily: "system-ui, sans-serif", fontStyle: "italic" }}>
                          "{profile.bio}"
                        </div>
                      </div>
                    )}

                    {/* Badges row */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#6B6560", fontFamily: "system-ui, sans-serif", marginBottom: 8 }}>Badges earned</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {earnedAchievements.map(a => {
                          const def = ACHIEVEMENT_DEFS.find(d => d.type === a);
                          return (
                            <span key={a} style={{
                              padding: "4px 8px", borderRadius: 8,
                              background: "rgba(205,127,50,0.12)", border: "1px solid rgba(205,127,50,0.25)",
                              fontSize: 11, color: "#CD7F32", fontFamily: "system-ui, sans-serif",
                            }}>
                              {def?.icon} {def?.title}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <Btn primary onClick={() => setEditingProfile(true)}>Edit Profile</Btn>
                      <Btn onClick={() => { setShowProfile(false); setEditingProfile(false); }}>Close</Btn>
                    </div>
                    <Btn onClick={handleLogout}>Log Out</Btn>
                  </>
                ) : (
                  <>
                    {/* Edit Form */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                      {[
                        { key: "displayName", label: "Display Name", type: "text" },
                        { key: "city", label: "City", type: "text" },
                      ].map(field => (
                        <div key={field.key}>
                          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#6B6560", fontFamily: "system-ui, sans-serif", marginBottom: 4 }}>{field.label}</div>
                          <input
                            type={field.type}
                            value={draft[field.key]}
                            onChange={e => setDraft(prev => ({ ...prev, [field.key]: e.target.value }))}
                            style={{
                              width: "100%", padding: "10px 14px", background: "#0E0E14",
                              border: "1px solid #2A2A35", borderRadius: 10, color: "#E8E4DD",
                              fontSize: 13, fontFamily: "system-ui, sans-serif", outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      ))}

                      {/* Home Club Selector */}
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#6B6560", fontFamily: "system-ui, sans-serif", marginBottom: 4 }}>Home Club</div>
                        <select
                          value={draft.homeClubId}
                          onChange={e => setDraft(prev => ({ ...prev, homeClubId: e.target.value }))}
                          style={{
                            width: "100%", padding: "10px 14px", background: "#0E0E14",
                            border: "1px solid #2A2A35", borderRadius: 10, color: "#E8E4DD",
                            fontSize: 13, fontFamily: "system-ui, sans-serif", outline: "none",
                            boxSizing: "border-box", appearance: "none",
                          }}
                        >
                          <option value="">Not set</option>
                          {clubs.map(c => (
                            <option key={c.id} value={c.id}>{c.name} — {c.city}</option>
                          ))}
                        </select>
                      </div>

                      {/* Bio */}
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#6B6560", fontFamily: "system-ui, sans-serif", marginBottom: 4 }}>Bio</div>
                        <textarea
                          value={draft.bio}
                          onChange={e => setDraft(prev => ({ ...prev, bio: e.target.value }))}
                          placeholder="Tell other members about yourself..."
                          style={{
                            width: "100%", minHeight: 80, background: "#0E0E14",
                            border: "1px solid #2A2A35", borderRadius: 10, padding: 12, color: "#E8E4DD",
                            fontSize: 13, fontFamily: "system-ui, sans-serif", resize: "vertical",
                            outline: "none", lineHeight: 1.5, boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn primary onClick={() => handleSaveProfile(draft)}>Save</Btn>
                      <Btn onClick={() => setEditingProfile(false)}>Cancel</Btn>
                    </div>
                  </>
                )}
              </div>
            </Overlay>
          );
        };
        return <ProfileContent />;
      })()}

      {/* Screen Toggle */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center", gap: 0, padding: "12px 24px 0" }}>
        {["passport", "admin"].map(s => (
          <button key={s} onClick={() => setScreen(s)} style={{
            flex: 1, padding: "8px 0", background: "none", border: "none",
            borderBottom: screen === s ? "2px solid #CD7F32" : "2px solid transparent",
            color: screen === s ? "#E8E4DD" : "#3A3A40",
            fontSize: 10, letterSpacing: 3, textTransform: "uppercase",
            cursor: "pointer", fontFamily: "system-ui, sans-serif",
          }}>
            {s === "passport" ? "My Passport" : "Club Admin"}
          </button>
        ))}
        <button onClick={() => setShowProfile(true)} style={{
          position: "absolute", right: 24, top: 10,
          width: 32, height: 32, borderRadius: 16,
          background: "linear-gradient(135deg, #8B4513, #CD7F32)",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, color: "#0A0A0F", fontWeight: 700, fontFamily: "system-ui, sans-serif",
        }}>
          {(profile?.display_name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
        </button>
      </div>

      {/* ─── PASSPORT SCREEN ──────────────────────────────────────────── */}
      {screen === "passport" && (
        <>
          {/* Header */}
          <div style={{ position: "relative", zIndex: 1, padding: "24px 24px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 11, letterSpacing: 6, textTransform: "uppercase", color: "#8A8070", marginBottom: 6 }}>Digital Passport</div>
            <h1 style={{ fontSize: 28, fontWeight: 400, margin: "0 0 2px", letterSpacing: 1, color: "#F0EDE6" }}>JACK OFF CLUBS</h1>
            <div style={{ fontSize: 10, letterSpacing: 4, color: "#5A5550", textTransform: "uppercase", fontFamily: "system-ui, sans-serif" }}>Worldwide</div>
            <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, transparent, #CD7F32, transparent)", margin: "12px auto" }} />

            <Badge bg={getTierStyle(tier)}>{tier}</Badge>

            {nextTier && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: "#6B6560", marginBottom: 6, fontFamily: "system-ui, sans-serif" }}>
                  {nextTier.need - uniqueClubIds.length} more to {nextTier.name}
                </div>
                <div style={{ width: "60%", height: 3, background: "#1E1E28", borderRadius: 2, margin: "0 auto", overflow: "hidden" }}>
                  <div style={{ width: `${(uniqueClubIds.length / nextTier.need) * 100}%`, height: "100%", background: getTierStyle(tier), borderRadius: 2, transition: "width 0.6s" }} />
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 18 }}>
              {[
                { label: "Clubs", value: uniqueClubIds.length },
                { label: "Regions", value: uniqueRegions.length },
                { label: "Reviews", value: reviews.length },
                { label: "Badges", value: earnedAchievements.length },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 300, color: "#F0EDE6" }}>{s.value}</div>
                  <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#6B6560", fontFamily: "system-ui, sans-serif" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", padding: "0 24px", position: "relative", zIndex: 1 }}>
            {["stamps", "achievements", "leaderboard"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: "12px 0", background: "none", border: "none",
                borderBottom: tab === t ? "2px solid #CD7F32" : "2px solid transparent",
                color: tab === t ? "#E8E4DD" : "#5A5550",
                fontSize: 11, letterSpacing: 3, textTransform: "uppercase",
                cursor: "pointer", fontFamily: "system-ui, sans-serif",
              }}>
                {t}
              </button>
            ))}
          </div>

          <div style={{ position: "relative", zIndex: 1, padding: "20px 24px 100px" }}>

            {/* STAMPS */}
            {tab === "stamps" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {stamps.map(s => (
                    <div key={s.clubId} onClick={() => setSelectedStamp(s)} style={{
                      aspectRatio: "1", borderRadius: 12,
                      background: "linear-gradient(145deg, #151520, #1A1A28)",
                      border: "1px solid #2A2A35",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", position: "relative", overflow: "hidden",
                    }}>
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(circle at 50% 30%, rgba(205,127,50,0.06) 0%, transparent 70%)" }} />
                      {s.visitCount > 1 && (
                        <div style={{ position: "absolute", top: 6, right: 8, fontSize: 9, color: "#CD7F32", fontFamily: "system-ui, sans-serif", fontWeight: 700 }}>
                          x{s.visitCount}
                        </div>
                      )}
                      <div style={{ marginBottom: 4, position: "relative" }}><ClubLogo club={s.club} size={36} /></div>
                      <div style={{ fontSize: 9, letterSpacing: 1, color: "#8A8070", textAlign: "center", padding: "0 6px", fontFamily: "system-ui, sans-serif", position: "relative", lineHeight: 1.3 }}>
                        {s.club?.city}
                      </div>
                      <div style={{ position: "relative", marginTop: 3, display: "flex", gap: 1 }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <span key={star} style={{ fontSize: 7, color: star <= (reviews.find(r => r.clubId === s.clubId)?.rating || 0) ? "#D4A017" : "#2A2A35" }}>★</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 7, color: "#4A4540", marginTop: 2, fontFamily: "system-ui, sans-serif", position: "relative" }}>
                        {fmtDate(s.date)}
                      </div>
                    </div>
                  ))}

                  {Array.from({ length: Math.max(0, 12 - stamps.length) }).map((_, i) => (
                    <div key={`e${i}`} style={{
                      aspectRatio: "1", borderRadius: 12, border: "1px dashed #1E1E28",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    }}>
                      <div style={{ fontSize: 20, color: "#1E1E28" }}>+</div>
                      <div style={{ fontSize: 8, color: "#2A2A30", marginTop: 2, fontFamily: "system-ui, sans-serif" }}>Scan to add</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 20 }}>
                  <Btn primary onClick={() => setShowScanner(true)}>
                    <span style={{ marginRight: 8 }}>📷</span> Scan QR Code
                  </Btn>
                </div>
              </>
            )}

            {/* ACHIEVEMENTS */}
            {tab === "achievements" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ACHIEVEMENT_DEFS.map(a => {
                  const earned = earnedAchievements.includes(a.type);
                  return (
                    <Card key={a.type} style={{ display: "flex", alignItems: "center", gap: 14, opacity: earned ? 1 : 0.4, border: earned ? "1px solid #2A2A35" : "1px solid #18181F" }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                        background: earned ? "radial-gradient(circle, rgba(205,127,50,0.15) 0%, transparent 70%)" : "#111118",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                      }}>
                        {earned ? a.icon : "🔒"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, color: earned ? "#F0EDE6" : "#4A4540" }}>{a.title}</div>
                        <div style={{ fontSize: 11, color: earned ? "#6B6560" : "#2A2A30", fontFamily: "system-ui, sans-serif", marginTop: 2 }}>{a.desc}</div>
                      </div>
                      {earned && <div style={{ fontSize: 10, color: "#CD7F32", letterSpacing: 2, fontFamily: "system-ui, sans-serif" }}>✓</div>}
                    </Card>
                  );
                })}
              </div>
            )}

            {/* LEADERBOARD */}
            {tab === "leaderboard" && (
              <div>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <SectionLabel>Top Collectors</SectionLabel>
                </div>
                {leaderboard.length === 0 && (
                  <div style={{ textAlign: "center", color: "#4A4540", fontSize: 12, fontFamily: "system-ui, sans-serif" }}>No members yet — be the first to check in.</div>
                )}
                {leaderboard.map((p, i) => (
                  <div key={p.userId} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
                    borderRadius: 12, marginBottom: 6,
                    background: p.isYou ? "linear-gradient(145deg, #1A1520, #201828)" : "transparent",
                    border: p.isYou ? "1px solid #CD7F32" : "1px solid transparent",
                  }}>
                    <div style={{ width: 28, fontSize: i < 3 ? 18 : 14, textAlign: "center", color: i < 3 ? "#F0EDE6" : "#4A4540", fontFamily: "system-ui, sans-serif" }}>
                      {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: p.isYou ? "#CD7F32" : "#E8E4DD", fontWeight: p.isYou ? 600 : 400 }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: "#5A5550", fontFamily: "system-ui, sans-serif", letterSpacing: 1 }}>{p.tier}</div>
                      <div style={{ fontSize: 9, color: "#3E3E45", fontFamily: "system-ui, sans-serif", marginTop: 2 }}>🏠 {p.homeClub}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, color: p.isYou ? "#CD7F32" : "#8A8070", fontWeight: 300 }}>{p.clubs}</div>
                      <div style={{ fontSize: 9, color: "#4A4540", fontFamily: "system-ui, sans-serif" }}>clubs</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── ADMIN SCREEN ─────────────────────────────────────────────── */}
      {screen === "admin" && (
        <>
          <div style={{ position: "relative", zIndex: 1, padding: "24px 24px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 10, letterSpacing: 5, textTransform: "uppercase", color: "#8A8070", marginBottom: 4 }}>Club Admin</div>
            <h1 style={{ fontSize: 22, fontWeight: 400, margin: "0 0 2px", color: "#F0EDE6", letterSpacing: 1 }}>{adminClub?.name || "No club selected"}</h1>
            <div style={{ fontSize: 11, color: "#5A5550", fontFamily: "system-ui, sans-serif" }}>{adminClub?.city || "Set a home club in your profile to preview its admin dashboard"}</div>
          </div>

          <div style={{ display: "flex", padding: "0 24px", position: "relative", zIndex: 1 }}>
            {["overview", "qr codes", "reviews"].map(t => (
              <button key={t} onClick={() => setAdminTab(t)} style={{
                flex: 1, padding: "12px 0", background: "none", border: "none",
                borderBottom: adminTab === t ? "2px solid #CD7F32" : "2px solid transparent",
                color: adminTab === t ? "#E8E4DD" : "#5A5550",
                fontSize: 11, letterSpacing: 3, textTransform: "uppercase",
                cursor: "pointer", fontFamily: "system-ui, sans-serif",
              }}>
                {t}
              </button>
            ))}
          </div>

          <div style={{ position: "relative", zIndex: 1, padding: "20px 24px 80px" }}>

            {adminTab === "overview" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Total check-ins", value: adminStamps.reduce((s, c) => s + (c.visitCount || 1), 0) },
                    { label: "Unique members", value: adminStamps.length },
                    { label: "Avg rating", value: adminClub?.avgRating || "—" },
                    { label: "Reviews", value: adminReviews.length },
                  ].map(s => (
                    <Card key={s.label} style={{ padding: 16 }}>
                      <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#6B6560", fontFamily: "system-ui, sans-serif", marginBottom: 6 }}>{s.label}</div>
                      <div style={{ fontSize: 28, fontWeight: 300, color: "#F0EDE6" }}>{s.value}</div>
                    </Card>
                  ))}
                </div>

                <SectionLabel>Recent activity</SectionLabel>
                {adminStamps.slice(-5).reverse().map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1A1A22" }}>
                    <div style={{ fontSize: 13, color: "#E8E4DD" }}>Check-in x{c.visitCount || 1}</div>
                    <div style={{ fontSize: 11, color: "#6B6560", fontFamily: "system-ui, sans-serif" }}>{fmtDate(c.date)}</div>
                  </div>
                ))}
              </>
            )}

            {adminTab === "qr codes" && (
              <>
                <Card style={{ padding: 24, textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: qrActive ? "#CD7F32" : "#4A4540", fontFamily: "system-ui, sans-serif", marginBottom: 12 }}>
                    {qrActive ? "Active QR code" : "QR code disabled"}
                  </div>
                  <div style={{
                    width: 160, height: 160, margin: "0 auto 16px", borderRadius: 12,
                    background: qrActive ? "#F0EDE6" : "#2A2A35",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.3s",
                  }}>
                    <div style={{ fontSize: 60, opacity: qrActive ? 1 : 0.2 }}>📱</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#8A8070", fontFamily: "system-ui, sans-serif", marginBottom: 4 }}>
                    jackoffclubs.com/checkin/{adminClub?.code || "..."}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 12 }}>
                    <span style={{ fontSize: 11, color: "#6B6560", fontFamily: "system-ui, sans-serif" }}>{qrActive ? "Active" : "Disabled"}</span>
                    <div onClick={() => setQrActive(!qrActive)} style={{
                      width: 44, height: 24, borderRadius: 12, cursor: "pointer", position: "relative",
                      background: qrActive ? "linear-gradient(135deg, #8B4513, #CD7F32)" : "#2A2A35", transition: "background 0.3s",
                    }}>
                      <div style={{ width: 18, height: 18, borderRadius: 9, background: "#F0EDE6", position: "absolute", top: 3, left: qrActive ? 23 : 3, transition: "left 0.3s" }} />
                    </div>
                  </div>
                </Card>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Btn primary>Generate new QR code</Btn>
                  <Btn>Download for print</Btn>
                  <Btn>Create event-specific code</Btn>
                </div>
              </>
            )}

            {adminTab === "reviews" && (
              <>
                <Card style={{ padding: 20, textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 36, fontWeight: 300, color: "#F0EDE6" }}>
                    {adminReviews.length ? (adminReviews.reduce((s, r) => s + r.rating, 0) / adminReviews.length).toFixed(1) : "—"}
                  </div>
                  <StarRating rating={Math.round(adminReviews.length ? adminReviews.reduce((s, r) => s + r.rating, 0) / adminReviews.length : 0)} size={18} />
                  <div style={{ fontSize: 11, color: "#6B6560", fontFamily: "system-ui, sans-serif", marginTop: 6 }}>
                    Based on {adminReviews.length} review{adminReviews.length !== 1 ? "s" : ""}
                  </div>
                  <div style={{ marginTop: 14, padding: "0 16px" }}>
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = adminReviews.filter(r => r.rating === star).length;
                      const pct = adminReviews.length ? Math.round((count / adminReviews.length) * 100) : 0;
                      return (
                        <div key={star} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: "#6B6560", fontFamily: "system-ui, sans-serif", width: 12, textAlign: "right" }}>{star}</span>
                          <span style={{ fontSize: 10, color: "#D4A017" }}>★</span>
                          <div style={{ flex: 1, height: 6, background: "#1A1A22", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #8B4513, #CD7F32)", borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 10, color: "#4A4540", fontFamily: "system-ui, sans-serif", width: 28, textAlign: "right" }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <SectionLabel>Member reviews</SectionLabel>
                {adminReviews.map((r, i) => (
                  <Card key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <StarRating rating={r.rating} size={12} />
                    </div>
                    {r.body && (
                      <div style={{ fontSize: 13, color: "#A09888", fontStyle: "italic", lineHeight: 1.5, fontFamily: "system-ui, sans-serif" }}>
                        "{r.body}"
                      </div>
                    )}
                  </Card>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
