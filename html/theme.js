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

  var ghost = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMDAgMzAwIj4KPGRlZnM+CiAgPGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+CiAgICA8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNkOGRkZTMiIHN0b3Atb3BhY2l0eT0iLjIyIi8+CiAgICA8c3RvcCBvZmZzZXQ9Ii41MiIgc3RvcC1jb2xvcj0iIzdiODI4YiIgc3RvcC1vcGFjaXR5PSIuMTAiLz4KICAgIDxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzBiMGMwZiIgc3RvcC1vcGFjaXR5PSIuMDIiLz4KICA8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+CjxwYXRoIGZpbGw9InVybCgjZykiIGQ9Ik0xNTAgMjhjLTQ2IDAtODIgMzAtOTYgNzZsMTgtMTFjLTcgMjEtOCA0NS0yIDY4bDE2LTE3YzAgMzYgMTQgNjcgNDEgOTVsMjMgMjQgMjMtMjRjMjctMjggNDEtNTkgNDEtOTVsMTYgMTdjNi0yMyA1LTQ3LTItNjhsMTggMTFjLTE0LTQ2LTUwLTc2LTk2LTc2eiIvPgo8cGF0aCBmaWxsPSIjZGZlNWViIiBmaWxsLW9wYWNpdHk9Ii4xMCIgZD0iTTEwNSAxMjFjMTAtMTMgMjUtMjEgNDUtMjFzMzUgOCA0NSAyMWMtMTItNS0yNy03LTQ1LTdzLTMzIDItNDUgN3oiLz4KPHBhdGggZmlsbD0iI2Y0ZjdmYiIgZmlsbC1vcGFjaXR5PSIuMTgiIGQ9Ik0xMTMgMTQ0bDIzLTggNyA5LTE3IDEwem03NCAwLTIzLTgtNyA5IDE3IDEweiIvPgo8cGF0aCBmaWxsPSIjZWVmM2Y3IiBmaWxsLW9wYWNpdHk9Ii4wOCIgZD0iTTE0MCAxNzVoMjBsLTEwIDE1eiIvPgo8cGF0aCBmaWxsPSJub25lIiBzdHJva2U9IiNmN2Y5ZmIiIHN0cm9rZS1vcGFjaXR5PSIuMTIiIHN0cm9rZS13aWR0aD0iMyIgZD0iTTkxIDExMWMxMy0zNSAzMS01MCA1OS01MHM0NiAxNSA1OSA1MCIvPgo8L3N2Zz4=';

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
      .rmi-sigil path.main { fill: rgba(242,245,248,.90); }
      .rmi-sigil path.cut { fill: #050607; }
      .rmi-sigil path.eye { fill: rgba(255,255,255,.86); }
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
        <svg class="rmi-sigil" viewBox="0 0 160 160" aria-hidden="true">
          <path class="main" d="M80 13c-28 0-51 18-60 47l16-10c-6 18-6 36-1 53l12-13c1 23 10 42 28 60l5 5 5-5c18-18 27-37 28-60l12 13c5-17 5-35-1-53l16 10c-9-29-32-47-60-47z"/>
          <path class="cut" d="M46 66c9-11 20-17 34-17s25 6 34 17c-10-4-21-6-34-6s-24 2-34 6zm16 19 16-7 6 8-13 9zm36 0-16-7-6 8 13 9zM74 111h12l-6 10z"/>
          <path class="eye" d="M63 84l15-6 5 7-12 7zm34 0-15-6-5 7 12 7z"/>
        </svg>
        <div class="rmi-maker">REAPER MADE IT</div>
        <div class="rmi-sub">FiveM Mobile Experience</div>
        <div class="rmi-hairline"></div>
      </div>`;
    screen.appendChild(splash);
    return splash;
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
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootBranding);
  } else {
    bootBranding();
  }
})();
