/**
 * Sessions are time-boxed to 24 hours from the last real sign-in. Supabase refresh
 * tokens rotate indefinitely on their own, so without this a browser stays signed in
 * forever. `last_sign_in_at` only moves on an actual sign-in, not on a token refresh,
 * which is what makes it the right clock to measure against.
 */
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Fails open: a missing or unparseable timestamp returns false rather than signing the
 * user out. This is a defence-in-depth timeout, not the auth boundary itself — that is
 * still the Supabase JWT — so a bad value should not lock anyone out of the app.
 */
export function isSessionExpired(
  lastSignInAt: string | null | undefined,
  now: number = Date.now()
): boolean {
  if (!lastSignInAt) {
    return false;
  }
  const signedInAt = Date.parse(lastSignInAt);
  return !Number.isNaN(signedInAt) && now - signedInAt >= SESSION_MAX_AGE_MS;
}
