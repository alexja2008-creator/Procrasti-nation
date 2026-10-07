// What a click on a web reminder asks for. The service worker (public/sw.js)
// posts it to an open tab of the app; with none open it opens one at that
// address instead. Snooze is handled by the service worker and the site;
// there's no Done on the web, so no Dones to save.
import type { Task } from '@pn/core';

export type Destination = { to: 'task' | 'start'; taskId: string } | { to: 'today' };

const ID = '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})';

/** The paths lib/push.js gives a reminder, and nothing else. */
export function destinationOf(path: string): Destination | null {
  if (path === '/') return { to: 'today' };
  const task = new RegExp(`^/task/${ID}$`).exec(path);
  if (task) return { to: 'task', taskId: task[1] };
  const start = new RegExp(`^/start/${ID}\\?minutes=5$`).exec(path);
  if (start) return { to: 'start', taskId: start[1] };
  return null;
}

export const onDoneSaved = (_listener: (task: Task) => void) => () => undefined;

export const saveDones = async (): Promise<void> => undefined;

export function onDestination(open: (d: Destination) => void): () => void {
  const worker = typeof navigator === 'undefined' ? undefined : navigator.serviceWorker;
  if (!worker) return () => undefined;
  const listener = (event: MessageEvent) => {
    const path = event.data?.type === 'pn-open' ? event.data.path : null;
    const destination = typeof path === 'string' ? destinationOf(path) : null;
    if (destination) open(destination);
  };
  worker.addEventListener('message', listener);
  return () => worker.removeEventListener('message', listener);
}
