# MNIT Media Grabber

Personal Chrome / Edge extension (Manifest V3) by MNIT Cyber AI. Detects video and audio on the open page
and downloads it from a side panel.

**Personal use only. Download only content you are allowed to download.**

## What it handles

| Source | Result |
|---|---|
| Direct files (MP4, WebM, MP3, …) | Saved through Chrome's download manager |
| HLS (`.m3u8`) — clear or AES-128, TS or fMP4, master playlists with quality choice | One `.ts` / `.mp4` file, streamed to disk (long videos OK) |
| Vimeo `playlist.json` (separate video/audio tracks) | One `.mp4` with video + audio |
| Vimeo split HLS (`…/media.m3u8?st=video` + `st=audio`) | One `.mp4` with video + audio |
| DRM (Widevine / FairPlay / SAMPLE-AES), DASH `.mpd` | Not supported — shown as such |

## Install (one time)

1. Copy the `extension/` folder to a permanent place (not a removable drive).
2. Open `chrome://extensions` (Edge: `edge://extensions`) and turn on **Developer mode**.
3. **Load unpacked** → select the `extension/` folder.
4. Pin the icon (puzzle → pin).

Full illustrated step-by-step guide: open `extension/guide.html` (or press **?** in the panel).

**Updating:** replace the files in the same folder, then press ↻ on the extension card. Do not press Remove
(it changes the extension ID, unpins it and resets settings).

## Layout

```
extension/
  manifest.json      MV3 manifest (bump "version" on every release)
  background.js      detects media from network responses (webRequest), per-tab list in storage.session
  sidepanel.*        the panel UI (Hebrew / English)
  guide.html/.js     step-by-step install & usage guide (no inline scripts — extension CSP)
  lib/hls.js         m3u8 parser + parallel segment downloader (AES-128, byte ranges, fMP4)
  lib/vimeo.js       Vimeo manifest parser + fMP4 two-track merger (video+audio → one MP4)
  lib/net.js         sets Referer/Origin for the extension's own requests (DNR session rules)
tests/               Playwright end-to-end tests with local fixtures (see tests/README.md)
```

Downloads of streams are written to the Origin Private File System first, then handed to Chrome's
download manager, so memory stays small. Keep the panel open until "Done ✓".
