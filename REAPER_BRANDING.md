# Reaper Made It Branding Layer

This branch is the cosmetic/presentation pass built on top of the known-good `physical-phone-full-build` bridge.

## What is branded

- A short **REAPER MADE IT** boot/open splash plays whenever the phone receives the normal `action=open` event.
- The splash appears on both the in-game handset and the paired physical handset because both surfaces already receive the same open event.
- The default handset shell is polished toward a current flagship-phone look: thinner ceramic lip, dark titanium-style rail, flatter side-button material, tighter screen-to-body presentation, and a cleaner island shadow.
- The default lock/home wallpaper is a dark metallic/ghost treatment.

## What remains customizable

The lock/home wallpaper is intentionally only a CSS default. A wallpaper selected by the phone/server is written as an inline style and overrides the default, so users and server owners are not locked to the Reaper wallpaper.

The permanent maker credit is the short boot/open splash rather than a watermark sitting over somebody else's wallpaper.

## What was not changed

No physical-phone transport logic, pairing/session code, NUI callback routing, app behavior, banking, calls, messages, garage actions, waypoints, or other phone mechanics were changed by this branding pass.

The known-good full bridge remains preserved on `physical-phone-full-build`; this cosmetic work lives on `reaper-branding-polish` so it can be tested without risking the working bridge branch.

## Live test checklist

1. Install `reaper-branding-polish` as the `v-phone` resource.
2. Confirm the in-game phone still opens and every normal app works.
3. Confirm the REAPER MADE IT splash appears briefly on open and then gets out of the way.
4. Pair a physical handset with `/physicalpair` and confirm the same splash appears there.
5. Confirm an existing/custom wallpaper still replaces the default ghost wallpaper.
6. Re-test a real action such as setting a waypoint from the physical handset.
