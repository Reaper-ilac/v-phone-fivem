# Physical Phone Full Build

This branch is the isolated full-build track for the physical-phone project.

## Branch roles

- `main` — untouched upstream/base phone.
- `physical-phone-dev` — known-good transport proof: real handset -> LAN -> FXServer -> paired player -> existing v-phone command.
- `physical-phone-full-build` — full physical-handset implementation built on top of the proven transport.

## Current implementation status

Gate 1 has been proven live on the test server. The full-build branch now implements Gates 2–6 as the generic bridge layer and is ready for live handset testing.

### Implemented

- One-time `/physicalpair` code with a ten-minute lifetime.
- A long random browser-session token created only after the one-time code is accepted.
- Session binding to the live FiveM source and current character identity.
- Session invalidation on disconnect, character change, replacement pairing, or idle expiry.
- The existing `html/index.html` FruitOS frontend served to the real handset; no second mock phone UI.
- The physical handset uses the same `html/style.css`, `html/theme.css`, `html/theme-vars.css`, `html/theme.js`, `html/sdk.js`, and `html/app.js` shipped by v-phone.
- The handset presentation fills the real mobile screen while preserving the existing phone DOM/apps.
- Generic routing of the frontend's normal `https://v-phone/<callback>` calls to the paired FiveM client.
- Reuse of the exact already-registered NUI callback handlers rather than reimplementing Messages, Contacts, Bank, Garage, Settings, etc. separately.
- Mirroring of normal `SendNUIMessage` traffic back to the physical browser for open/close state, notifications, calls, power/signal updates and app refreshes.
- Event sequencing and a bounded mirror queue so the handset can reconnect after a brief Wi-Fi/browser stall.
- An `Open iFruit` recovery surface on the handset when the in-game phone is closed.
- Chunked GET transport for callback JSON so the bridge does not depend on the currently broken `SetHttpHandler` POST-body callback on FiveM Enhanced.
- Callback timeouts, per-session request rate limiting, static-file path restrictions, no-referrer headers, cache controls, and session cleanup.
- No new game-side abilities: a physical request executes through the same callback on the paired player's client and therefore reaches the same existing server permission/inventory/banking/garage/phone rules as the normal NUI.

## Live test procedure

1. Install/download the `physical-phone-full-build` branch as the server's `v-phone` resource.
2. Keep the already-proven FXServer LAN bind (`0.0.0.0:30120`) and local-subnet TCP firewall rule.
3. Start MySQL, FXServer, FiveM and load the character.
4. On the real phone, open `http://<SERVER-LAN-IP>:30120/v-phone/physical`.
5. In FiveM run `/physicalpair`.
6. Enter the six-digit code on the real phone.
7. The browser redirects into the real FruitOS/v-phone frontend and the FiveM handset is refreshed once so the browser receives a complete `action=open` state.
8. Validate Messages, Contacts, Bank, Garage and Calls first; they cover read/write state, framework data, money, notifications and live call state.

## Target behavior

A player's real Android/iPhone pairs to the same FiveM character/session and becomes another control surface for the exact same v-phone. The physical handset must not grant any ability the in-game phone does not already have.

## Architecture

### Browser -> FiveM

`html/physical.js` intercepts only v-phone NUI callback requests. It encodes the existing callback payload into bounded URL-safe chunks and sends them through the resource HTTP handler. The server validates the physical session and forwards the callback name/data only to the paired player. The client invokes the already-registered NUI callback and returns its normal callback result to the waiting browser request.

### FiveM -> browser

Because this branch loads the bridge before the stock client scripts, it wraps `SendNUIMessage` once. The normal in-game NUI still receives every message unchanged. While a physical session is active, the same message is also queued server-side for that player's handset. The browser polls the ordered queue and dispatches each entry as the same DOM `message` event the stock frontend already understands.

### Frontend

The server reads the existing `html/index.html`, injects a session-scoped base URL plus `html/physical.js`, and serves the normal resource assets from a token-protected static route. `app.js` and the individual apps are not forked into a second implementation.

## First apps to validate

1. Messages
2. Contacts
3. Bank
4. Garage
5. Calls

Once those work through the generic callback/event bridge, the remaining built-in apps use the same transport rather than bespoke physical-phone handlers.

## Rule

Do not merge this branch into `physical-phone-dev`. The dev branch remains the small known-good transport fallback. Continue full handset work and fixes only on `physical-phone-full-build` until the full live test passes.
