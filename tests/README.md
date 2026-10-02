# Tests

End-to-end tests drive Chromium with the unpacked extension (Playwright) against local fixtures.

```bash
cd tests
./make-fixtures.sh                 # needs ffmpeg
python3 server.py site &           # serves fixtures on :8123 (CORS on)
node test.mjs                      # direct MP4 + HLS (AES-128 TS, fMP4)
node vtest.mjs                     # Vimeo playlist.json → one MP4 (video+audio)
node vhtest.mjs                    # Vimeo split HLS (st=video/audio) → one MP4
node gtest.mjs                     # guide screenshots (gshots/)
```

Set `PW=/path/to/playwright/index.mjs` if Playwright lives elsewhere. Each test prints the detected items,
download results and `ffprobe` output of the saved files.
