import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("club_claim_requests")
    .select("*, clubs(id, name, city)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ claims: data });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { clubId, newClub, contactNote } = body;

  if (!contactNote || !contactNote.trim()) {
    return NextResponse.json({ error: "Tell us how we can verify you run this club" }, { status: 400 });
  }
  if (!clubId && !newClub?.name) {
    return NextResponse.json({ error: "Select a club to claim or provide a new club's name" }, { status: 400 });
  }

  const row = clubId
    ? { user_id: user.id, club_id: clubId, contact_note: contactNote.trim() }
    : {
        user_id: user.id,
        proposed_name: newClub.name?.trim(),
        proposed_city: newClub.city?.trim() || null,
        proposed_region: newClub.region?.trim() || null,
        proposed_country: newClub.country?.trim() || "USA",
        contact_note: contactNote.trim(),
      };

  const { data, error } = await supabase.from("club_claim_requests").insert(row).select().single();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "You already have a pending request for this club" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ claim: data });
}
