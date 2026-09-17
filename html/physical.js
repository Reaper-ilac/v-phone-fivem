/* v-phone physical handset transport
 *
 * Loaded only by the HTTP-served physical copy of html/index.html. The in-game CEF page never
 * sees window.__VPHONE_PHYSICAL__, so this file is inert there even if somebody adds it to the
 * manifest later.
 *
 * The normal phone frontend stays untouched. Its fetch("https://v-phone/<callback>") calls are
 * intercepted here and routed to the paired FiveM client, where the exact registered NUI
 * callback is invoked. SendNUIMessage traffic is mirrored back through /events.
 */
(() => {
  'use strict';

  const cfg = window.__VPHONE_PHYSICAL__;
  if (!cfg || !cfg.token || !cfg.base) return;

  const token = String(cfg.token);
  const base = String(cfg.base).replace(/\/+$/, '');
  const resource = String(cfg.resource || 'v-phone');
  const nativeFetch = window.fetch.bind(window);
  const textEncoder = new TextEncoder();

  // The stock frontend expects this CEF helper. Supplying the real resource name makes its
  // normal URL construction identical in Chrome and in FiveM.
  window.GetParentResourceName = () => resource;
  window.__VPHONE_IS_PHYSICAL__ = true;

  function bytesToBase64Url(bytes) {
    let binary = '';
    const step = 0x8000;
    for (let i = 0; i < bytes.length; i += step) {
      binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + step, bytes.length)));
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function encodeText(value) {
    return bytesToBase64Url(textEncoder.encode(String(value ?? '')));
  }

  function requestId() {
    if (window.crypto && crypto.getRandomValues) {
      const a = new Uint32Array(4);
      crypto.getRandomValues(a);
      return Array.from(a, n => n.toString(16).padStart(8, '0')).join('');
    }
    return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
      .replace(/[^a-z0-9]/gi, '');
  }

  function callbackFromUrl(url) {
    try {
      const u = new URL(url, location.href);
      const host = u.hostname.toLowerCase();
      if (u.protocol === 'https:' && host === resource.toLowerCase()) {
        return decodeURIComponent(u.pathname.replace(/^\/+/, ''));
      }
    } catch (_) {}
    return null;
  }

  async function bridgeCallback(callbackName, init) {
    const id = requestId();
    let body = init && init.body != null ? init.body : '{}';

    if (body instanceof URLSearchParams) body = body.toString();
    if (typeof body !== 'string') {
      try { body = JSON.stringify(body); }
      catch (_) { body = '{}'; }
    }
    if (!body) body = '{}';

    const encoded = encodeText(body);
    // Conservative path size so it survives browsers, routers and Cfx's HTTP parser. Large
    // camera/media payloads become many GETs because Enhanced currently drops POST bodies.
    const chunkSize = 3500;
    const total = Math.max(1, Math.ceil(encoded.length / chunkSize));

    for (let i = 0; i < total; i++) {
      const part = encoded.slice(i * chunkSize, (i + 1) * chunkSize) || 'e30';
      const r = await nativeFetch(
        `${base}/chunk/${token}/${id}/${i + 1}/${total}/${part}`,
        { method: 'GET', cache: 'no-store', credentials: 'omit' }
      );
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(`physical bridge chunk ${i + 1}/${total} failed (${r.status}) ${text}`);
      }
    }

    const callbackKey = encodeText(callbackName);
    return nativeFetch(
      `${base}/api/${token}/${id}/${callbackKey}`,
      { method: 'GET', cache: 'no-store', credentials: 'omit' }
    );
  }

  // Keep every non-NUI fetch exactly as the phone wrote it: CDN images, previews, SDK pages,
  // and any other normal HTTP request are not the bridge's business.
  window.fetch = function physicalFetch(input, init) {
    const raw = typeof input === 'string'
      ? input
      : (input && typeof input.url === 'string' ? input.url : '');
    const callbackName = callbackFromUrl(raw);
    if (callbackName) return bridgeCallback(callbackName, init || {});
    return nativeFetch(input, init);
  };

  // A physical handset is already the phone-shaped object. Remove the desktop presentation
  // frame and let FruitOS fill the real screen while preserving every inner element/app.
  document.documentElement.classList.add('physical-handset');
  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('physical-handset');

    const style = document.createElement('style');
    style.id = 'physical-handset-css';
    style.textContent = `
      html.physical-handset, body.physical-handset {
        width:100% !important; height:100% !important; min-height:100% !important;
        background:#000 !important; overflow:hidden !important;
        overscroll-behavior:none; touch-action:manipulation;
      }
      body.physical-handset #device {
        position:fixed !important; inset:0 !important;
        width:100vw !important; height:100dvh !important;
        margin:0 !important; transform:none !important;
      }
      body.physical-handset #device .bezel {
        position:absolute !important; inset:0 !important;
        width:100% !important; height:100% !important;
        margin:0 !important; border-radius:0 !important;
        border:0 !important; box-shadow:none !important; transform:none !important;
      }
      body.physical-handset #screen {
        position:absolute !important; inset:0 !important;
        width:100% !important; height:100% !important;
        border-radius:0 !important; transform:none !important;
      }
      body.physical-handset .btn-side,
      body.physical-handset #adminview,
      body.physical-handset #forensic,
      body.physical-handset #booth { display:none !important; }
      #physical-reopen {
        position:fixed; inset:0; z-index:2147483647;
        display:none; place-items:center; background:#050507;
        color:white; font:600 18px system-ui,-apple-system,Segoe UI,sans-serif;
        padding:24px; text-align:center;
      }
      #physical-reopen.show { display:grid; }
      #physical-reopen button {
        appearance:none; border:0; border-radius:16px; padding:16px 24px;
        background:#0a84ff; color:white; font:750 18px system-ui,-apple-system,Segoe UI,sans-serif;
        min-width:min(82vw,340px);
      }
      #physical-connection {
        position:fixed; left:50%; top:max(10px,env(safe-area-inset-top));
        transform:translateX(-50%); z-index:2147483646;
        padding:7px 11px; border-radius:999px;
        background:rgba(20,20,24,.88); color:#bbb;
        font:600 12px system-ui,-apple-system,Segoe UI,sans-serif;
        pointer-events:none; opacity:0; transition:opacity .2s;
      }
      #physical-connection.show { opacity:1; }
    `;
    document.head.appendChild(style);

    const reopen = document.createElement('div');
    reopen.id = 'physical-reopen';
    reopen.innerHTML = '<div><p style="margin:0 0 18px">iFruit is closed in FiveM.</p><button type="button">Open iFruit</button></div>';
    document.body.appendChild(reopen);
    reopen.querySelector('button').addEventListener('click', async () => {
      const btn = reopen.querySelector('button');
      btn.disabled = true;
      try {
        const r = await nativeFetch(`${base}/open/${token}`, { cache: 'no-store' });
        if (!r.ok) throw new Error(String(r.status));
      } catch (_) {
        showConnection('Connection lost', 1800);
      } finally {
        btn.disabled = false;
      }
    });

    const connection = document.createElement('div');
    connection.id = 'physical-connection';
    connection.textContent = 'Connected to FiveM';
    document.body.appendChild(connection);
  });

  function showConnection(text, ms = 1200) {
    const el = document.getElementById('physical-connection');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(showConnection.timer);
    showConnection.timer = setTimeout(() => el.classList.remove('show'), ms);
  }

  let after = 0;
  let stopped = false;
  let failures = 0;

  function deliver(message) {
    if (!message || typeof message !== 'object') return;

    // Keep a way back into the handset when the stock UI receives action=close and hides itself.
    const reopen = document.getElementById('physical-reopen');
    if (reopen) {
      if (message.action === 'close') reopen.classList.add('show');
      else if (message.action === 'open') reopen.classList.remove('show');
    }

    window.dispatchEvent(new MessageEvent('message', { data: message }));
  }

  async function poll() {
    if (stopped) return;
    try {
      const r = await nativeFetch(
        `${base}/events/${token}/${after}`,
        { method: 'GET', cache: 'no-store', credentials: 'omit' }
      );

      if (r.status === 401 || r.status === 403 || r.status === 410) {
        stopped = true;
        document.body.innerHTML = `
          <main style="min-height:100vh;background:#09090c;color:#fff;display:grid;place-items:center;padding:24px;font:16px system-ui;text-align:center">
            <div><h2 style="margin:0 0 10px">Physical phone session ended</h2>
            <p style="color:#aaa">Run <b>/physicalpair</b> in FiveM and pair this phone again.</p></div>
          </main>`;
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      const payload = await r.json();
      failures = 0;
      const events = Array.isArray(payload.events) ? payload.events : [];
      for (const entry of events) {
        const seq = Number(entry && entry.seq) || 0;
        if (seq > after) after = seq;
        if (entry && entry.message) deliver(entry.message);
      }
    } catch (_) {
      failures++;
      if (failures === 2) showConnection('Reconnecting…', 3000);
    } finally {
      if (!stopped) setTimeout(poll, failures ? Math.min(2000, 250 * failures) : 180);
    }
  }

  // Do not start before app.js installs its message listener. Both scripts execute in order,
  // and this zero-delay task runs after the current script stack (including app.js) completes.
  setTimeout(() => {
    showConnection('Connected to FiveM', 900);
    poll();
  }, 0);
})();
