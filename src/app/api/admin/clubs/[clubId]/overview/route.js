import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertClubAdmin } from "@/lib/server/clubAdmin";

export async function GET(request, { params }) {
  const { clubId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const authorized = await assertClubAdmin(admin, user.id, user.email, clubId);
  if (!authorized) return NextResponse.json({ error: "Not an admin of this club" }, { status: 403 });

  const [{ data: club, error: clubErr }, { data: checkIns, error: ciErr }, { data: reviews, error: rErr }, { data: qr, error: qrErr }] =
    await Promise.all([
      admin.from("clubs").select("*").eq("id", clubId).single(),
      admin
        .from("check_ins")
        .select("id, checked_in_at, profiles(display_name)")
        .eq("club_id", clubId)
        .order("checked_in_at", { ascending: false }),
      admin
        .from("reviews")
        .select("id, rating, body, created_at, profiles(display_name)")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false }),
      admin.from("qr_codes").select("*").eq("club_id", clubId).order("created_at", { ascending: false }),
    ]);
  if (clubErr) return NextResponse.json({ error: clubErr.message }, { status: 500 });
  if (ciErr) return NextResponse.json({ error: ciErr.message }, { status: 500 });
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  if (qrErr) return NextResponse.json({ error: qrErr.message }, { status: 500 });

  const uniqueMembers = new Set();
  // check_ins has no user_id in this select; refetch minimal for uniqueness
  const { data: ciUsers } = await admin.from("check_ins").select("user_id").eq("club_id", clubId);
  (ciUsers || []).forEach((c) => uniqueMembers.add(c.user_id));

  return NextResponse.json({ club, checkIns, reviews, qrCodes: qr, uniqueMembers: uniqueMembers.size });
}
