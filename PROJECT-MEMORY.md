# Project memory — MNIT Media Grabber

Append-only. Newest at the bottom. Keep under ~200 lines, then start PROJECT-MEMORY-2.md.

## 2026-10-02 — v1.0 → v1.7.0 built in one session

- [scope] Personal-use clone of Video DownloadHelper's core (side panel, detect + download). Separate
  project from Dr. Noam. Desktop only (Chrome/Edge); phones can't run extensions.
- [branding] Name "MNIT Media Grabber", "by MNIT Cyber AI", blue glass-cube logo (icons/logo256.png).
  Logo is a detailed 3D image → unreadable at 16px; a flat icon would be sharper (open item).
- [arch] MV3 service worker + webRequest.onHeadersReceived → per-tab items in storage.session.
  Panel scans <video>/<audio> too (cached media). Streams: OPFS temp files → Blob(File) → downloads API.
- [bug-fixed] Extension pages block inline scripts (CSP) → guide script must stay in guide.js.
- [bug-fixed] Long HLS was built in RAM → now streamed to disk with a bounded window.
- [vimeo] Real site (letsai / Vimeo) served: `/v2/range/prot/<base64 "range=a-b">/avf/<id>.mp4?…&range=a-b`
  pieces (hidden now — useless alone) and split HLS `…/avf/<id>/media.m3u8?…&st=video|audio`.
  Fix: pair st=video with st=audio (same path before /avf/) and merge both fMP4 tracks into one MP4.
  User confirmed v1.7.0 works with sound on the real site.
- [ux] Don't auto-open the guide on install (user found it confusing). Guide via ? button or guide.html.
- [ops] User repeatedly used Remove + Load unpacked → ID changes, pin lost. Tell them: replace files + ↻.
- [selling] Advised against selling as-is: legal risk (copyright / site ToS — needs Israeli lawyer),
  free competitors, needs Chrome Web Store review. Recommended using it as an MNIT showcase instead.

### Open items (priority order)
1. Keep downloading when the panel is closed (offscreen document / background).
2. Notification when a download finishes.
3. DASH (.mpd) support.
4. Edit file name before download.
5. Remux .ts → .mp4 so Windows' built-in player opens it.
6. English version of the guide; flat 16px icon.

## 2026-10-06 — Pro badge, howto page, mnitcyberai.com/tools WhatsApp preview

- [ui] Non-functional "⭐ Pro" badge in sidepanel card-foot (click → "בקרוב" for 2s). Extension stays free.
- [ops] GitHub Pages builds from branch `claude/compassionate-bohr-hcdvwg` /docs, NOT main.
  Push docs changes to BOTH (main, then `git push origin main:claude/compassionate-bohr-hcdvwg`).
- [og] mnitcyberai.com (Lovable) og:image on /tools → hardcoded
  `https://vladimirglazman-rgb.github.io/mnit-media-grabber/tools-og-cover.png`.
  Lovable CDN asset URLs (/__l5e/assets-v1/…) are NOT fetched by WhatsApp's crawler.
- [og] WhatsApp desktop crops og:image to a center square → keep logo/icon/title in the middle 630px.
  Keep file small (cover is ~70KB, 256-color PNG). Bust WhatsApp cache with `?v=N` on the page URL.
- [lovable] User is on free tier (≈1 build credit/day, code view read-only). Avoid Lovable edits;
  prefer changes that live in this repo's docs/. Lovable flagged "1 critical security issue" — unreviewed.
- [privacy] User does not want github.com/repo links shared publicly (code copying); share mnitcyberai.com.
- [status][stated] Published on Chrome Web Store:
  https://chromewebstore.google.com/detail/mnit-media-grabber/aplagchkcncggiibcfchajffegnbokli — being sent to users.
- [business][stated] Extension stays free; Pro badge is prep for a future paid tier.
- [site][stated] Goal: all of the user's tools eventually live on mnitcyberai.com.
- [site][stated] Site is organized by topics; /tools page is VOD/Netflix style (cards).
- [branding][stated] Every visual must use the real MNIT logo (glass cube); no AI-generated art without it.
- [design][stated] User designs visuals in Canva.
