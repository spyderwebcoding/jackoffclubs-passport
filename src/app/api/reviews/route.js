import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recomputeUserStats } from "@/lib/server/stats";

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { clubId, checkInId, rating, body } = await request.json();
  if (!clubId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "clubId and a rating 1-5 are required" }, { status: 400 });
  }

  const { data: review, error } = await supabase
    .from("reviews")
    .upsert(
      { user_id: user.id, club_id: clubId, check_in_id: checkInId || null, rating, body: body || null },
      { onConflict: "user_id,club_id" }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = createAdminClient();

  const { data: clubReviews, error: crErr } = await admin.from("reviews").select("rating").eq("club_id", clubId);
  if (!crErr && clubReviews.length > 0) {
    const avg = clubReviews.reduce((s, r) => s + r.rating, 0) / clubReviews.length;
    await admin.from("clubs").update({ avg_rating: Math.round(avg * 10) / 10 }).eq("id", clubId);
  }

  const { stats, newAchievements } = await recomputeUserStats(admin, user.id);

  return NextResponse.json({ review, stats, newAchievements });
}
