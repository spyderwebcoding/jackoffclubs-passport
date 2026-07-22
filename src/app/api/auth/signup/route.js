import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  const { email, password, displayName } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || undefined } },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ user: data.user, needsEmailConfirmation: !data.session });
}
