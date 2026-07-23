import { createClient } from "@/lib/supabase/server";
import { isSuperadmin } from "@/lib/server/superadmin";
import AdminReview from "@/components/AdminReview";

export const dynamic = "force-dynamic";

export default async function SuperadminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isSuperadmin(user.email)) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0A0A0F", color: "#8A8070",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "system-ui, sans-serif", fontSize: 13, letterSpacing: 1, padding: 24, textAlign: "center",
      }}>
        Not authorized.
      </div>
    );
  }

  return <AdminReview />;
}
