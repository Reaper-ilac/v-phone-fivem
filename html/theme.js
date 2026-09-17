// v-ui | theme.js — included by every NUI page in the framework.
//
// A NUI page can only talk to the resource that owns it, so v-ui cannot message
// v-inventory's page directly. What it CAN do is regenerate `theme-vars.css`, which every
// page links; this script re-fetches that stylesheet when the theme changes so the new
// palette lands without anyone reopening a menu.
(function () {
  var LINK_ID = 'v-ui-vars';

  function ensureLink() {
    var l = document.getElementById(LINK_ID);
    if (!l) {
      l = document.createElement('link');
      l.id = LINK_ID;
      l.rel = 'stylesheet';
      l.href = 'https://cfx-nui-v-ui/theme-vars.css';
      document.head.appendChild(l);
    }
    return l;
  }

  // Stamp the OWNING resource onto <html> so the scoped block for this module applies.
  // A NUI page is served from the resource that owns it, so its own hostname is the name:
  //   https://cfx-nui-v-inventory/index.html  ->  v-inventory
  //   https://v-inventory/index.html          ->  v-inventory
  function stampModule() {
    var h = (location.hostname || '').replace(/^cfx-nui-/, '');
    if (h && h !== 'localhost') document.documentElement.setAttribute('data-vmod', h);
    return h;
  }

  function apply(version) {
    var l = ensureLink();
    // a new href is the only reliable way to make CEF drop a cached stylesheet
    l.href = 'https://cfx-nui-v-ui/theme-vars.css?v=' + (version || 0);
  }

  // The owning resource forwards v-ui's version to its own page.
  window.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.action === 'v-ui:theme') apply(d.version);
  });

  // A module may also declare its identity explicitly, which is useful when a page is
  // previewed outside the game: <html data-vmod="v-inventory">
  // The link is NOT created here. v-ui is optional, and on a server without it
  // `https://cfx-nui-v-ui/theme-vars.css` is a stylesheet request to a resource that does
  // not exist - one guaranteed failed fetch on every page load, for a palette nobody is
  // going to push. apply() creates it the moment a theme actually arrives, which is the
  // only moment it can be useful.
  function boot() {
    if (!document.documentElement.getAttribute('data-vmod')) stampModule();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

// ═══════════════════════════════════════════════════════════════════════════════
// Reaper Made It presentation layer
//
// Cosmetic only: no callbacks, pairing, banking, messages, calls, routing or other phone
// mechanics are changed here. The working full bridge stays untouched underneath it.
//
// The production credit is the boot splash. The lock wallpaper below is only the DEFAULT:
// a wallpaper written by the phone itself is an inline style and wins over this stylesheet,
// so server/player custom wallpapers continue to work normally.
// ═══════════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var SPLASH_MS = 1750;
  var splashTimer = null;
  var ready = false;

  var ghost = 'reaper-mark.svg';

  function installStyle() {
    if (document.getElementById('rmi-brand-style')) return;
    var style = document.createElement('style');
    style.id = 'rmi-brand-style';
    style.textContent = `
      body:not(.physical-handset) #device {
        width: 378px;
        height: 798px;
      }
      body:not(.physical-handset) #device .bezel {
        padding: 7px;
        border-radius: 58px;
        background:
          linear-gradient(90deg, rgba(255,255,255,.18), transparent 8%, transparent 92%, rgba(255,255,255,.10)),
          linear-gradient(145deg, #777b80 0%, #2f3236 15%, #151719 46%, #3a3e42 78%, #0a0b0c 100%);
        box-shadow:
          0 44px 95px rgba(0,0,0,.68),
          0 8px 22px rgba(0,0,0,.52),
          inset 0 1px 0 rgba(255,255,255,.28),
          inset 0 -1px 0 rgba(0,0,0,.8);
      }
      body:not(.physical-handset) #device .bezel::before {
        inset: 4px;
        border-radius: 55px;
        background: #030405;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.035);
      }
      body:not(.physical-handset) #screen {
        border-radius: 50px;
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,.045),
          0 0 0 1px rgba(0,0,0,.9);
      }
      body:not(.physical-handset) .btn-side {
        background: linear-gradient(180deg, #70747a 0%, #303338 32%, #17191c 100%);
        box-shadow:
          inset 1px 0 0 rgba(255,255,255,.18),
          inset -1px 0 0 rgba(0,0,0,.6),
          0 2px 4px rgba(0,0,0,.45);
      }
      body:not(.physical-handset) #island {
        box-shadow: 0 1px 1px rgba(255,255,255,.035), 0 5px 15px rgba(0,0,0,.5);
      }

      #wallpaper {
        background-image:
          linear-gradient(180deg, rgba(0,0,0,.02), rgba(0,0,0,.30)),
          url("${ghost}"),
          radial-gradient(circle at 70% 18%, rgba(110,118,128,.30), transparent 28%),
          radial-gradient(circle at 24% 74%, rgba(45,50,57,.75), transparent 34%),
          linear-gradient(155deg, #16191d 0%, #090b0d 52%, #020304 100%);
        background-size: cover, 72% auto, cover, cover, cover;
        background-position: center, center 48%, center, center, center;
        background-repeat: no-repeat;
      }

      .rmi-splash {
        position: absolute;
        inset: 0;
        z-index: 2147483000;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: inherit;
        background:
          radial-gradient(circle at 50% 39%, rgba(110,118,128,.16), transparent 28%),
          linear-gradient(160deg, #101215 0%, #050607 48%, #000 100%);
        color: #f6f7f8;
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
      }
      .rmi-splash.rmi-show {
        visibility: visible;
        animation: rmiSplash ${SPLASH_MS}ms ease both;
      }
      .rmi-splash-inner {
        width: 78%;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        transform: translateY(-2%);
      }
      .rmi-sigil {
        width: 118px;
        height: 118px;
        margin-bottom: 22px;
        opacity: .92;
        filter: drop-shadow(0 12px 28px rgba(0,0,0,.55));
      }
      .rmi-sigil { object-fit: contain; }
      .rmi-maker {
        font: 750 21px/1.1 'Segoe UI Variable Display','Segoe UI',system-ui,sans-serif;
        letter-spacing: .20em;
        text-indent: .20em;
        white-space: nowrap;
      }
      .rmi-sub {
        margin-top: 10px;
        color: rgba(235,238,242,.48);
        font: 600 10px/1.2 'Segoe UI',system-ui,sans-serif;
        letter-spacing: .28em;
        text-indent: .28em;
        text-transform: uppercase;
      }
      .rmi-hairline {
        width: 68px;
        height: 1px;
        margin-top: 18px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.40), transparent);
      }
      @keyframes rmiSplash {
        0%   { opacity: 0; }
        10%  { opacity: 1; }
        72%  { opacity: 1; }
        100% { opacity: 0; }
      }
      body.physical-handset .rmi-splash { border-radius: 0; }
      .rmi-pairing {
        position:absolute; inset:0; z-index:2147482990;
        display:none; place-items:center; padding:22px;
        background:rgba(2,3,4,.86);
        backdrop-filter:blur(18px);
        color:#f7f8f9;
      }
      .rmi-pairing.rmi-pairing-show { display:grid; }
      .rmi-pair-card {
        width:min(100%,320px);
        border:1px solid rgba(255,255,255,.12);
        border-radius:26px;
        padding:20px 18px 18px;
        background:linear-gradient(160deg,rgba(36,39,43,.97),rgba(10,11,13,.98));
        box-shadow:0 28px 70px rgba(0,0,0,.62), inset 0 1px 0 rgba(255,255,255,.08);
        text-align:center;
        position:relative;
      }
      .rmi-pair-close {
        position:absolute; right:11px; top:10px;
        width:32px; height:32px; border-radius:50%;
        background:rgba(255,255,255,.09);
        color:#fff; font-size:20px; line-height:32px;
      }
      .rmi-pair-brand {
        font:750 12px/1 'Segoe UI',system-ui,sans-serif;
        letter-spacing:.18em; color:rgba(255,255,255,.50);
        margin-bottom:8px;
      }
      .rmi-pair-title {
        font:760 24px/1.12 'Segoe UI Variable Display','Segoe UI',system-ui,sans-serif;
        margin:0 20px 7px;
      }
      .rmi-pair-copy {
        color:rgba(235,238,242,.62);
        font:500 13px/1.4 'Segoe UI',system-ui,sans-serif;
        margin:0 auto 15px;
        max-width:260px;
      }
      .rmi-pair-qr {
        width:220px; height:220px; margin:0 auto 13px;
        background:#fff; border-radius:18px; padding:10px;
        display:grid; place-items:center; overflow:hidden;
        box-shadow:0 8px 25px rgba(0,0,0,.38);
      }
      .rmi-pair-qr svg { width:100%; height:100%; display:block; }
      .rmi-pair-code {
        font:800 21px/1.1 ui-monospace,SFMono-Regular,Consolas,monospace;
        letter-spacing:.18em; text-indent:.18em;
      }
      .rmi-pair-url {
        margin-top:9px; color:rgba(235,238,242,.38);
        font:500 9px/1.25 ui-monospace,SFMono-Regular,Consolas,monospace;
        overflow-wrap:anywhere;
      }
      .rmi-pair-error {
        border:1px solid rgba(255,80,80,.28);
        border-radius:14px; padding:14px;
        background:rgba(130,15,18,.20);
        color:#ffb7b7; font:600 13px/1.4 'Segoe UI',system-ui,sans-serif;
      }
    `;
    document.head.appendChild(style);
  }

  function installSplash() {
    var screen = document.getElementById('screen');
    if (!screen) return null;
    var splash = document.getElementById('rmi-splash');
    if (splash) return splash;

    splash = document.createElement('div');
    splash.id = 'rmi-splash';
    splash.className = 'rmi-splash';
    splash.setAttribute('aria-hidden', 'true');
    splash.innerHTML = `
      <div class="rmi-splash-inner">
        <img class="rmi-sigil" src="reaper-mark.svg" alt="" aria-hidden="true">
        <div class="rmi-maker">REAPER MADE IT</div>
        <div class="rmi-sub">FiveM Mobile Experience</div>
        <div class="rmi-hairline"></div>
      </div>`;
    screen.appendChild(splash);
    return splash;
  }


  function ensurePairOverlay() {
    var screen = document.getElementById('screen');
    if (!screen) return null;
    var overlay = document.getElementById('rmi-pairing');
    if (overlay) return overlay;

    overlay = document.createElement('section');
    overlay.id = 'rmi-pairing';
    overlay.className = 'rmi-pairing';
    overlay.setAttribute('aria-label', 'ReaperLink physical phone pairing');
    overlay.innerHTML = `
      <div class="rmi-pair-card">
        <button class="rmi-pair-close" type="button" aria-label="Close">&times;</button>
        <div class="rmi-pair-brand">REAPER MADE IT</div>
        <h2 class="rmi-pair-title">Pair Your Phone</h2>
        <p class="rmi-pair-copy">Scan this code with your real phone. It opens and pairs automatically.</p>
        <div class="rmi-pair-qr" id="rmi-pair-qr"></div>
        <div class="rmi-pair-code" id="rmi-pair-code"></div>
        <div class="rmi-pair-url" id="rmi-pair-url"></div>
      </div>`;
    screen.appendChild(overlay);
    overlay.querySelector('.rmi-pair-close').addEventListener('click', function () {
      overlay.classList.remove('rmi-pairing-show');
    });
    return overlay;
  }

  function renderPairQr(target, value) {
    target.innerHTML = '';
    if (!value || typeof qrcode !== 'function') return false;
    try {
      var qr = qrcode(0, 'M');
      qr.addData(value);
      qr.make();
      target.innerHTML = qr.createSvgTag({
        cellSize: 5,
        margin: 4,
        scalable: true,
        alt: 'Scan to pair ReaperLink'
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  function showPairing(data) {
    var overlay = ensurePairOverlay();
    if (!overlay) return;

    var qr = document.getElementById('rmi-pair-qr');
    var code = document.getElementById('rmi-pair-code');
    var url = document.getElementById('rmi-pair-url');
    var copy = overlay.querySelector('.rmi-pair-copy');

    var pairUrl = String(data.url || '');
    var configured = data.configured === true && pairUrl.length > 0;

    code.textContent = String(data.code || '');
    url.textContent = configured ? pairUrl : '';

    if (configured && renderPairQr(qr, pairUrl)) {
      qr.style.display = 'grid';
      copy.className = 'rmi-pair-copy';
      copy.textContent = 'Scan this code with your real phone. It opens and pairs automatically.';
    } else {
      qr.style.display = 'none';
      copy.className = 'rmi-pair-copy rmi-pair-error';
      copy.textContent = 'ReaperLink public URL is not configured on this server. The server owner must set reaperlink_public_url.';
    }

    overlay.classList.add('rmi-pairing-show');

    clearTimeout(showPairing.timer);
    var seconds = Math.max(10, Number(data.seconds) || 600);
    showPairing.timer = setTimeout(function () {
      overlay.classList.remove('rmi-pairing-show');
    }, seconds * 1000);
  }

  function ensureBranding() {
    installStyle();
    installSplash();
    ready = true;
  }

  function showSplash() {
    if (!ready) ensureBranding();
    var splash = installSplash();
    if (!splash) return;

    clearTimeout(splashTimer);
    splash.classList.remove('rmi-show');
    void splash.offsetWidth;
    splash.classList.add('rmi-show');
    splashTimer = setTimeout(function () {
      splash.classList.remove('rmi-show');
    }, SPLASH_MS + 60);
  }

  function bootBranding() {
    ensureBranding();
    var device = document.getElementById('device');
    if (device && !device.classList.contains('hidden')) showSplash();
  }

  window.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.action === 'open') showSplash();
    if (d.action === 'reaperlink:pairing') showPairing(d);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootBranding);
  } else {
    bootBranding();
  }
})();
