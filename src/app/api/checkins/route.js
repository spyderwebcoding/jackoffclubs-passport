import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("check_ins")
    .select("id, club_id, checked_in_at, clubs(id, name, city, region, country, logo_url)")
    .eq("user_id", user.id)
    .order("checked_in_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: reviews, error: rErr } = await supabase
    .from("reviews")
    .select("*")
    .eq("user_id", user.id);
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  return NextResponse.json({ checkIns: data, reviews });
}
