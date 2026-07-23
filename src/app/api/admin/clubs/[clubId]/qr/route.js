import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertClubAdmin } from "@/lib/server/clubAdmin";

export async function PATCH(request, { params }) {
  const { clubId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const authorized = await assertClubAdmin(admin, user.id, user.email, clubId);
  if (!authorized) return NextResponse.json({ error: "Not an admin of this club" }, { status: 403 });

  const { qrCodeId, active } = await request.json();
  if (!qrCodeId || typeof active !== "boolean") {
    return NextResponse.json({ error: "qrCodeId and active are required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("qr_codes")
    .update({ active })
    .eq("id", qrCodeId)
    .eq("club_id", clubId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ qrCode: data });
}
