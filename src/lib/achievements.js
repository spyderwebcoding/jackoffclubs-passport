export const ACHIEVEMENT_DEFS = [
  { type: "first_night_out", title: "First Night Out", desc: "Visit your first club", icon: "⭐" },
  { type: "hat_trick", title: "Hat Trick", desc: "Visit 3 different clubs", icon: "🎩" },
  { type: "high_five", title: "High Five", desc: "Visit 5 different clubs", icon: "🖐️" },
  { type: "road_tripper", title: "Road Tripper", desc: "Visit clubs in 3 regions", icon: "🗺️" },
  { type: "repeat_customer", title: "Repeat Customer", desc: "Attend the same club 5+ times", icon: "🔁" },
  { type: "the_critic", title: "The Critic", desc: "Leave 5 reviews", icon: "📝" },
  { type: "perfect_ten", title: "Perfect Ten", desc: "Visit 10 different clubs", icon: "💎" },
  { type: "coast_to_coast", title: "Coast to Coast", desc: "Visit every region", icon: "🌎" },
  { type: "legend", title: "Legend", desc: "Visit 25 different clubs", icon: "👑" },
];

export const ALL_REGIONS = ["Southeast", "Southwest", "Northeast", "Northwest", "Midwest", "Mountain", "International"];

export function getTier(uniqueClubs) {
  if (uniqueClubs >= 20) return "Platinum";
  if (uniqueClubs >= 10) return "Gold";
  if (uniqueClubs >= 5) return "Silver";
  return "Bronze";
}

// checkIns: [{ club_id, visit_count }], reviewCount: number, clubRegionById: Map<club_id, region>
export function evaluateAchievements(checkIns, reviewCount, clubRegionById) {
  const uniqueClubIds = [...new Set(checkIns.map((c) => c.club_id))];
  const uniqueRegions = [...new Set(uniqueClubIds.map((id) => clubRegionById.get(id)).filter(Boolean))];
  const maxVisits = Math.max(0, ...checkIns.map((c) => c.visit_count || 1));

  const earned = [];
  if (uniqueClubIds.length >= 1) earned.push("first_night_out");
  if (uniqueClubIds.length >= 3) earned.push("hat_trick");
  if (uniqueClubIds.length >= 5) earned.push("high_five");
  if (uniqueClubIds.length >= 10) earned.push("perfect_ten");
  if (uniqueClubIds.length >= 25) earned.push("legend");
  if (uniqueRegions.length >= 3) earned.push("road_tripper");
  if (uniqueRegions.length >= ALL_REGIONS.length) earned.push("coast_to_coast");
  if (maxVisits >= 5) earned.push("repeat_customer");
  if (reviewCount >= 5) earned.push("the_critic");
  return earned;
}
