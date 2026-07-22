import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Powers the "simulate QR scan" picker until a real camera scanner is wired up.
// Requires a session so anonymous callers can't enumerate every club's check-in code.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("qr_codes")
    .select("code, active, clubs(id, name, city, region, country, logo_url, avg_rating)")
    .eq("active", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const clubs = data.filter((row) => row.clubs).map((row) => ({ ...row.clubs, code: row.code }));
  return NextResponse.json({ clubs });
}
