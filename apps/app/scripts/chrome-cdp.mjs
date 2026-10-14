// Drives a throwaway Google Chrome over the DevTools protocol, for checking
// Web Push end to end (the Claude app's browser pane has no push service).
// Start Chrome with its own profile (your own Chrome is untouched):
//   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//     --user-data-dir=/tmp/pn-chrome --remote-debugging-port=9333 --no-first-run http://localhost:8081/
// then:
//   node scripts/chrome-cdp.mjs grant                 allow notifications for localhost:8081 (no prompt)
//   node scripts/chrome-cdp.mjs page '<js>'           run JS in the app's tab (awaited; `return` a value)
//   node scripts/chrome-cdp.mjs sw '<js>'             run JS in the service worker, e.g. fire its click handler:
//       const [n] = await self.registration.getNotifications();
//       self.dispatchEvent(new NotificationEvent('notificationclick', { notification: n, action: 'snooze' }));
//     (waitUntil throws for a synthetic event, but the handler's work still runs; an idle worker
//      stops after ~30 s, so wake it with a page call first)
//   node scripts/chrome-cdp.mjs click 'Turn on'       a real mouse click on the button with that text
//   node scripts/chrome-cdp.mjs shot '<js>' out.png   phone-sized screenshot (after optional JS)
// Shown notifications can be read from the page: (await navigator.serviceWorker.ready).getNotifications().
const [, , mode, expr] = process.argv;
const version = await (await fetch('http://127.0.0.1:9333/json/version')).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
const send = (method, params = {}, sessionId) =>
  new Promise((resolve) => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params, sessionId })); });

if (mode === 'grant') {
  console.log(JSON.stringify(await send('Browser.grantPermissions', { origin: 'http://localhost:8081', permissions: ['notifications'] })));
} else {
  const { result } = await send('Target.getTargets');
  const target = result.targetInfos.find((t) =>
    mode === 'sw' ? t.type === 'service_worker' && t.url.startsWith('http://localhost:8081/') : (t.type === 'page') && t.url.startsWith('http://localhost:8081'));
  if (!target) { console.log('no target', JSON.stringify(result.targetInfos.map((t) => [t.type, t.url]))); process.exit(1); }
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  if (mode === 'click') {
    // A real mouse click on the element whose text is exactly `expr`.
    const found = await send('Runtime.evaluate', { expression: `(() => { const el = [...document.querySelectorAll('[role=button],button')].find((e) => e.innerText.trim() === ${JSON.stringify(expr)}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`, returnByValue: true }, sessionId);
    const at = found.result.result.value;
    if (!at) { console.log('not found:', expr); process.exit(1); }
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1 }, sessionId);
    }
    console.log('clicked', expr);
    ws.close();
    process.exit(0);
  }
  if (mode === 'shot') {
    await send('Emulation.setDeviceMetricsOverride', { width: 420, height: 900, deviceScaleFactor: 2, mobile: true }, sessionId);
    if (expr) await send('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true }, sessionId);
    await new Promise((r) => setTimeout(r, 1200));
    const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    (await import('node:fs')).writeFileSync(process.argv[4], Buffer.from(shot.result.data, 'base64'));
    console.log('saved', process.argv[4]);
    ws.close();
    process.exit(0);
  }
  const out = await send('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true }, sessionId);
  console.log(JSON.stringify(out.result?.result?.value ?? out.result?.exceptionDetails ?? out, null, 1));
}
ws.close();
