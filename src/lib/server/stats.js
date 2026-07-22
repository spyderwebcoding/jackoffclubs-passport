import { evaluateAchievements, getTier } from "@/lib/achievements";

// Recomputes stats + achievements for a user from scratch. Runs on the admin
// (service-role) client since achievements/user_stats have no client write policy —
// the server is the only writer, so the numbers can't be spoofed from the browser.
export async function recomputeUserStats(admin, userId) {
  const [{ data: checkIns, error: ciErr }, { data: reviews, error: rErr }, { data: clubs, error: clErr }, { data: existing, error: aErr }] =
    await Promise.all([
      admin.from("check_ins").select("club_id").eq("user_id", userId),
      admin.from("reviews").select("id").eq("user_id", userId),
      admin.from("clubs").select("id, region"),
      admin.from("achievements").select("achievement_type").eq("user_id", userId),
    ]);
  if (ciErr) throw ciErr;
  if (rErr) throw rErr;
  if (clErr) throw clErr;
  if (aErr) throw aErr;

  const clubRegionById = new Map(clubs.map((c) => [c.id, c.region]));
  const visitCounts = {};
  checkIns.forEach((c) => { visitCounts[c.club_id] = (visitCounts[c.club_id] || 0) + 1; });
  const checkInSummary = Object.entries(visitCounts).map(([club_id, visit_count]) => ({ club_id, visit_count }));

  const uniqueClubIds = Object.keys(visitCounts);
  const uniqueRegions = [...new Set(uniqueClubIds.map((id) => clubRegionById.get(id)).filter(Boolean))];
  const tier = getTier(uniqueClubIds.length);

  const earnedTypes = evaluateAchievements(checkInSummary, reviews.length, clubRegionById);
  const alreadyEarned = new Set(existing.map((a) => a.achievement_type));
  const newAchievements = earnedTypes.filter((t) => !alreadyEarned.has(t));

  const stats = {
    user_id: userId,
    total_checkins: checkIns.length,
    unique_clubs: uniqueClubIds.length,
    unique_regions: uniqueRegions.length,
    total_reviews: reviews.length,
  };

  const [{ error: statsErr }, { error: tierErr }] = await Promise.all([
    admin.from("user_stats").upsert(stats),
    admin.from("profiles").update({ tier }).eq("id", userId),
  ]);
  if (statsErr) throw statsErr;
  if (tierErr) throw tierErr;

  if (newAchievements.length > 0) {
    const { error: insErr } = await admin
      .from("achievements")
      .insert(newAchievements.map((achievement_type) => ({ user_id: userId, achievement_type })));
    if (insErr) throw insErr;
  }

  return { stats: { ...stats, tier }, newAchievements };
}
