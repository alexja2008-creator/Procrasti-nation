import { createClient } from '@supabase/supabase-js';

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * Returns { user, token } on success, or { user: null, error } on failure.
 */
export async function requireAuth(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return { user: null, token: null, error: 'Authentication required' };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { user: null, token: null, error: 'Invalid or expired session' };
  }

  return { user, token, error: null };
}
