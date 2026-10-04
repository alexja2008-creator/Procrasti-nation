import { supabase } from '@/lib/supabase';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const TIMEOUT_MS = 90_000; // plans usually take 10–20s; the server allows 60s

export class ApiError extends Error {
  /** HTTP status, or 0 when the request never got a response. */
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** POST JSON to apps/site's /api/* as the signed-in user (the site keeps the secret keys). */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  if (!BASE_URL) throw new ApiError('EXPO_PUBLIC_API_BASE_URL is not set', 0);
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError('Not signed in', 401);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('Network request failed', 0);
  } finally {
    clearTimeout(timer);
  }

  const json = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new ApiError(json.error ?? `HTTP ${response.status}`, response.status);
  return json as T;
}
