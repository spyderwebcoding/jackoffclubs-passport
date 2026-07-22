import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recomputeUserStats } from "@/lib/server/stats";

export async function POST(request, { params }) {
  const { code } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  const { data: qr, error: qrErr } = await admin
    .from("qr_codes")
    .select("id, club_id, active, expires_at, clubs(id, name, city, region, country, logo_url)")
    .eq("code", code)
    .maybeSingle();
  if (qrErr) return NextResponse.json({ error: qrErr.message }, { status: 500 });
  if (!qr || !qr.active) return NextResponse.json({ error: "Invalid or inactive QR code" }, { status: 404 });
  if (qr.expires_at && new Date(qr.expires_at) < new Date()) {
    return NextResponse.json({ error: "This QR code has expired" }, { status: 410 });
  }

  const { error: insErr } = await admin
    .from("check_ins")
    .insert({ user_id: user.id, club_id: qr.club_id, qr_code_id: qr.id });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  const { stats, newAchievements } = await recomputeUserStats(admin, user.id);

  return NextResponse.json({ club: qr.clubs, stats, newAchievements });
}
