import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });

  const [{ data: profile, error: pErr }, { data: stats, error: sErr }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_stats").select("*").eq("user_id", user.id).single(),
  ]);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  return NextResponse.json({ user: { id: user.id, email: user.email }, profile, stats: stats || null });
}

export async function PATCH(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const allowed = ["display_name", "city", "bio", "home_club_id"];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  const { data, error } = await supabase.from("profiles").update(updates).eq("id", user.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ profile: data });
}
