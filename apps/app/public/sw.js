// ProcrastiNation's service worker: Web Push reminders, sent by apps/site's
// /api/cron/push (lib/push.js `reminderPayload` builds what arrives).
// Plain JS, served at /sw.js, so it isn't bundled with the app.
//
// It shows each reminder. A click opens the task (the morning list opens
// Today), Start 5 min opens Start Mode with a five-minute timer, and Snooze
// 10 min asks the site to ring it again without opening anything. There's no
// Done here on purpose: dismissing a notification must never finish a task.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

const ICON = '/notification-icon.png';

function show(data) {
  return self.registration.showNotification(data.title, {
    body: data.body,
    // One notification per reminder, even if it arrives twice.
    tag: data.id,
    timestamp: data.at,
    icon: ICON,
    data,
    actions: (data.buttons || []).map((b) => ({ action: b.action, title: b.title })),
  });
}

self.addEventListener('push', (event) => {
  let data = null;
  try {
    data = event.data ? event.data.json() : null;
  } catch {
    data = null;
  }
  if (!data || data.v !== 1 || typeof data.title !== 'string') return;
  event.waitUntil(show(data));
});

/** Focuses an open tab of the app and tells it where to go (no reload), or opens one there. */
async function openPath(path) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const tab = windows.find((w) => new URL(w.url).origin === self.location.origin);
  if (tab) {
    await tab.focus().catch(() => undefined);
    tab.postMessage({ type: 'pn-open', path });
    return;
  }
  await self.clients.openWindow(new URL(path, self.location.origin).href);
}

async function snooze(data, button) {
  try {
    const response = await fetch(button.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'snooze', token: button.token }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch {
    // Offline or refused: put the reminder back rather than lose it.
    await show(data);
  }
}

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  event.notification.close();
  const button = (data.buttons || []).find((b) => b.action === event.action);
  if (button && button.action === 'snooze') {
    event.waitUntil(snooze(data, button));
    return;
  }
  event.waitUntil(openPath(button ? button.path : data.path || '/'));
});
