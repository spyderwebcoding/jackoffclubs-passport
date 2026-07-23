import { isSuperadmin } from "@/lib/server/superadmin";

// Confirms the session user administers this club (or is a superadmin), using
// the admin client since club_admins has no cross-user select policy for regular users.
export async function assertClubAdmin(admin, userId, userEmail, clubId) {
  if (isSuperadmin(userEmail)) return true;
  const { data, error } = await admin
    .from("club_admins")
    .select("id")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
