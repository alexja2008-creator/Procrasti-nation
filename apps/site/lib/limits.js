// Metered AI requests: one ai_requests row per request, counted per person over a window. Every
// request is logged before it's counted, this one included, so parallel requests can't all slip
// under a limit (RLS: people insert and read their own rows).
export const DAY_MS = 24 * 60 * 60 * 1000;

export async function logAndCount(db, userId, kind, sinceMs) {
  const { error: logError } = await db.from('ai_requests').insert({ user_id: userId, kind });
  if (logError) throw logError;
  const { count, error } = await db
    .from('ai_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('created_at', new Date(Date.now() - sinceMs).toISOString());
  if (error) throw error;
  return count;
}
