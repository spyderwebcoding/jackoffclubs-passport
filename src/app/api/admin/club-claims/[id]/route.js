import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/server/superadmin";

export async function PATCH(request, { params }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperadmin(user.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { action } = await request.json();
  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: claim, error: fetchErr } = await admin
    .from("club_claim_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 404 });
  if (claim.status !== "pending") {
    return NextResponse.json({ error: "This claim was already reviewed" }, { status: 409 });
  }

  if (action === "reject") {
    const { error } = await admin
      .from("club_claim_requests")
      .update({ status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // approve
  let clubId = claim.club_id;
  if (!clubId) {
    const { data: newClub, error: clubErr } = await admin
      .from("clubs")
      .insert({
        name: claim.proposed_name,
        city: claim.proposed_city,
        region: claim.proposed_region,
        country: claim.proposed_country || "USA",
      })
      .select()
      .single();
    if (clubErr) return NextResponse.json({ error: clubErr.message }, { status: 500 });
    clubId = newClub.id;

    const code = `${claim.proposed_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${clubId.slice(0, 4)}`;
    const { error: qrErr } = await admin.from("qr_codes").insert({ club_id: clubId, code });
    if (qrErr) return NextResponse.json({ error: qrErr.message }, { status: 500 });
  }

  const { error: adminErr } = await admin
    .from("club_admins")
    .insert({ user_id: claim.user_id, club_id: clubId })
    .select()
    .maybeSingle();
  if (adminErr && adminErr.code !== "23505") {
    return NextResponse.json({ error: adminErr.message }, { status: 500 });
  }

  const { error: updateErr } = await admin
    .from("club_claim_requests")
    .update({ status: "approved", club_id: clubId, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, clubId });
}
