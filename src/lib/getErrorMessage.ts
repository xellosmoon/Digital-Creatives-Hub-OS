/**
 * Extracts a readable message from any thrown value. Supabase/PostgREST
 * errors are plain objects shaped like {message, details, hint, code} —
 * not instances of the native Error class — so a bare
 * `err instanceof Error ? err.message : 'fallback'` check is false for
 * essentially every real backend error and silently discards it in favor
 * of the generic fallback. This checks for a string `message` property
 * either way, so the actual reason still surfaces.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return fallback;
}
