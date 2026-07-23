// Superadmins review and approve/reject club ownership claims.
// Backed by an env var allowlist rather than a DB flag — small, trusted
// list for the beta, changeable without a migration.
export function isSuperadmin(email) {
  if (!email) return false;
  const allowlist = (process.env.SUPERADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}
