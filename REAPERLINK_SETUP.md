# ReaperLink server setup

ReaperLink is installed once on the FiveM server. Players do not install anything on their own PCs.

## Required public phone URL

Add one replicated convar to `server.cfg`:

```cfg
setr reaperlink_public_url "https://phone.example.com/v-phone/physical"
```

For a direct IP/port install:

```cfg
setr reaperlink_public_url "http://PUBLIC-IP:30120/v-phone/physical"
```

The value must be the public URL a player's real phone can reach. Do not use `127.0.0.1` or a private LAN address for an Internet-hosted server.

## Player flow

1. Join the FiveM server.
2. Run `/physicalpair`.
3. The in-game phone opens a ReaperLink pairing card.
4. Scan the QR code with the real phone.
5. The browser goes directly to the one-time pairing URL and opens the same v-phone UI.

The six-digit code and text URL remain visible as fallback/debug information. Scanning the QR is the normal flow.

Pair codes are one-time use and expire after ten minutes.

## Why the URL is configured

FiveM servers may be home-hosted, VPS-hosted, behind NAT, behind a reverse proxy, or use a custom HTTPS domain. The resource does not guess an address that may be wrong. The installer/release package sets `reaperlink_public_url` once for the server owner.
