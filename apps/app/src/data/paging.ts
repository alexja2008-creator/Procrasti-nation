// Supabase answers at most 1,000 rows per request (the API's "Max rows"
// setting), and a list cut off there fails silently: the newest tasks just
// stop showing. Anything that can grow is fetched a page at a time.

/** Rows per request: must not exceed the API's Max rows (1,000 by default). */
export const ROWS_PER_REQUEST = 1000;

type Page<R> = PromiseLike<{ data: R[] | null; error: unknown }>;

/**
 * Every row a query matches, requesting `ROWS_PER_REQUEST` at a time.
 * `page(from, to)` builds the query for that range (inclusive), with an order
 * that doesn't change between requests. `max` stops early.
 */
export async function fetchAllPages<R>(page: (from: number, to: number) => Page<R>, max = Infinity): Promise<R[]> {
  const rows: R[] = [];
  while (rows.length < max) {
    const from = rows.length;
    const size = Math.min(ROWS_PER_REQUEST, max - from);
    const { data, error } = await page(from, from + size - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < size) break;
  }
  return rows;
}

/** Splits ids into groups small enough for one request's `in (…)` filter. */
export function chunks<T>(items: T[], size = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
