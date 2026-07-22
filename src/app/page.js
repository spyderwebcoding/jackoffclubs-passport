import { createClient } from "@/lib/supabase/server";
import AuthScreen from "@/components/AuthScreen";
import Passport from "@/components/Passport";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <AuthScreen />;
  return <Passport />;
}
