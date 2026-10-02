# MNIT Media Grabber — CLAUDE.md

## Product Identity
MNIT Media Grabber — personal Chrome extension for detecting and downloading video/audio from web pages.
Owner: vladimirglazman@gmail.com
GitHub: vladimirglazman-rgb/mnit-media-grabber

## Architecture
- Chrome Extension Manifest V3 (MV3)
- Side Panel UI (chrome.sidePanel API)
- No build step — plain JS files loaded directly
- Service worker: background.js (ES module)
- UI: sidepanel.html + sidepanel.js (bilingual Hebrew/English)
- Guide: guide.html + guide.js (14-step interactive guide)

## File Structure
```
extension/
  manifest.json       — MV3 manifest (version tracked here)
  background.js       — media detection, storage, enrichment
  sidepanel.html/js   — UI (Hebrew default, English toggle)
  guide.html/js       — interactive installation guide
  icons/              — icon16/32/48/128.png
  lib/
    hls.js            — HLS parser + downloader (AES-128, fMP4, byte-ranges)
    vimeo.js          — Vimeo playlist.json + split HLS downloader + fMP4 merger
    net.js            — DNR session rules for Referer/Origin headers
tests/
  make-fixtures.sh    — builds local test media with ffmpeg
  test.mjs            — Playwright E2E: direct MP4, AES-128 HLS, fMP4 HLS
  vtest.mjs           — Playwright E2E: Vimeo playlist.json
  vhtest.mjs          — Playwright E2E: Vimeo split HLS (st=video + st=audio)
  gtest.mjs           — guide UI test
```

## Key Technical Concepts
- `classify(url, mime)` — detects hls / vimeo / video / audio
- `vimeoRole(url)` — pairs st=video + st=audio Vimeo HLS playlists
- OPFS streaming — large files written to Origin Private File System, not RAM
- `mergeTracks()` — merges fMP4 video+audio tracks into single MP4
- `ensureReferer()` — sets Referer via declarativeNetRequest session rules

## OFF-LIMITS
- Never store API keys or secrets in the repo
- Do not add React, bundlers, or build steps — plain JS only
- Do not touch the Dr. Noam project (MNIT-DrNoam repo)

## Version History
- v1.0 — basic detection + direct download
- v1.3 — OPFS streaming for large files
- v1.5 — guide tab, branding, logo
- v1.6 — Vimeo chunk fix (filter byte-range pieces)
- v1.7 — Vimeo split HLS audio fix (vimeoRole + mergeTracks)

## Open Improvements
1. Keep downloading when panel is closed (offscreen document)
2. Notification when download finishes
3. DASH (.mpd) support
4. Edit filename before download
5. Remux .ts → .mp4 for Windows built-in player
6. English guide version
