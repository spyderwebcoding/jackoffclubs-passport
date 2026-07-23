import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperadmin } from "@/lib/server/superadmin";

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperadmin(user.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const status = new URL(request.url).searchParams.get("status") || "pending";
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("club_claim_requests")
    .select("*, clubs(id, name, city), profiles!club_claim_requests_user_id_fkey(display_name, email)")
    .eq("status", status)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ claims: data });
}
