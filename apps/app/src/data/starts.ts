// Start Mode sessions. Every Start is a row: it powers ranks and the North
// Star ("weekly starters"). Each write sends the whole row as an upsert, so an
// end write repairs a failed begin, and writes for one session run in order
// (a slow begin can't land after the end and wipe its outcome).
import type { StartSession } from '@pn/core';

import { supabase } from '@/lib/supabase';

async function upsertSession(s: StartSession): Promise<void> {
  const { error } = await supabase.from('start_sessions').upsert({
    id: s.id,
    user_id: s.userId,
    task_id: s.taskId,
    started_at: s.startedAt,
    ended_at: s.endedAt,
    planned_minutes: s.plannedMinutes,
    outcome: s.outcome,
  });
  if (error) throw error;
}

/**
 * Saves successive states of one session in order. A failed write is retried
 * by the next one (it carries the whole row), so callers never wait or fail.
 */
export function sessionWriter() {
  let chain: Promise<void> = Promise.resolve();
  return (row: StartSession): Promise<void> => {
    chain = chain.then(() => upsertSession(row)).catch(() => undefined);
    return chain;
  };
}

export async function countStarts(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('start_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return count ?? 0;
}
