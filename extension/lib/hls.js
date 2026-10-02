// Minimal HLS (m3u8) parser + segment downloader. Supports clear and AES-128 streams,
// MPEG-TS and fMP4 (EXT-X-MAP), byte ranges. DRM (SAMPLE-AES etc.) is detected and refused.

export class HlsError extends Error {
  constructor(code, detail) {
    super(detail || code);
    this.code = code;
  }
}

function attrs(s) {
  const out = {};
  const re = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/g;
  let m;
  while ((m = re.exec(s))) out[m[1]] = m[2].replace(/^"|"$/g, '');
  return out;
}

function resolve(u, base) {
  try { return new URL(u, base).toString(); } catch { return u; }
}

function parseRange(v, prevEnd) {
  const [len, off] = v.split('@');
  return { length: parseInt(len, 10), offset: off !== undefined ? parseInt(off, 10) : prevEnd };
}

export function parseM3u8(text, baseUrl) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines[0] || !lines[0].startsWith('#EXTM3U')) throw new HlsError('not_m3u8');

  if (lines.some((l) => l.startsWith('#EXT-X-STREAM-INF'))) {
    const variants = [];
    const audio = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.startsWith('#EXT-X-STREAM-INF:')) {
        const a = attrs(l.slice(18));
        let j = i + 1;
        while (j < lines.length && lines[j].startsWith('#')) j++;
        if (lines[j]) {
          variants.push({
            url: resolve(lines[j], baseUrl),
            bandwidth: parseInt(a.BANDWIDTH, 10) || 0,
            resolution: a.RESOLUTION || '',
            audio: a.AUDIO || null,
          });
        }
        i = j;
      } else if (l.startsWith('#EXT-X-MEDIA:')) {
        const a = attrs(l.slice(13));
        if (a.TYPE === 'AUDIO' && a.URI) {
          audio.push({
            group: a['GROUP-ID'],
            name: a.NAME || a.LANGUAGE || 'audio',
            url: resolve(a.URI, baseUrl),
            isDefault: a.DEFAULT === 'YES',
          });
        }
      }
    }
    variants.sort((a, b) => b.bandwidth - a.bandwidth);
    return { type: 'master', variants, audio };
  }

  const segments = [];
  let seq = 0, key = null, map = null, segDur = 0, duration = 0;
  let ended = false, drm = false, pendingRange = null, lastEnd = 0;
  for (const l of lines) {
    if (l.startsWith('#EXT-X-MEDIA-SEQUENCE:')) {
      seq = parseInt(l.slice(22), 10) || 0;
    } else if (l.startsWith('#EXT-X-KEY:')) {
      const a = attrs(l.slice(11));
      if (!a.METHOD || a.METHOD === 'NONE') key = null;
      else {
        if (a.METHOD !== 'AES-128' || !a.URI) drm = true;
        key = { method: a.METHOD, uri: a.URI ? resolve(a.URI, baseUrl) : null, iv: a.IV || null };
      }
    } else if (l.startsWith('#EXT-X-MAP:')) {
      const a = attrs(l.slice(11));
      map = { url: resolve(a.URI, baseUrl), range: a.BYTERANGE ? parseRange(a.BYTERANGE, 0) : null };
    } else if (l.startsWith('#EXTINF:')) {
      segDur = parseFloat(l.slice(8)) || 0;
    } else if (l.startsWith('#EXT-X-BYTERANGE:')) {
      pendingRange = parseRange(l.slice(17), lastEnd);
    } else if (l === '#EXT-X-ENDLIST') {
      ended = true;
    } else if (!l.startsWith('#')) {
      segments.push({ url: resolve(l, baseUrl), key, map, range: pendingRange, seq: seq + segments.length, start: duration });
      duration += segDur;
      if (pendingRange) lastEnd = pendingRange.offset + pendingRange.length;
      pendingRange = null;
    }
  }
  return { type: 'media', segments, duration, ended, drm };
}

export async function fetchText(url, signal) {
  const r = await fetch(url, { signal, credentials: 'include' });
  if (!r.ok) throw new HlsError('http', 'HTTP ' + r.status);
  return r.text();
}

export async function fetchBytes(url, range, signal, tries = 3) {
  const headers = range ? { Range: `bytes=${range.offset}-${range.offset + range.length - 1}` } : undefined;
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(url, { headers, signal, credentials: 'include' });
      if (!r.ok) throw new HlsError('http', 'HTTP ' + r.status);
      return new Uint8Array(await r.arrayBuffer());
    } catch (e) {
      if (signal?.aborted || attempt >= tries) throw e;
      await new Promise((res) => setTimeout(res, 600 * attempt));
    }
  }
}

function hexToBytes(hex) {
  const h = hex.replace(/^0x/i, '').padStart(32, '0');
  const b = new Uint8Array(16);
  for (let i = 0; i < 16; i++) b[i] = parseInt(h.substr(i * 2, 2), 16);
  return b;
}

function seqIv(n) {
  const b = new Uint8Array(16);
  const dv = new DataView(b.buffer);
  dv.setUint32(8, Math.floor(n / 2 ** 32));
  dv.setUint32(12, n >>> 0);
  return b;
}

async function decrypt(data, seg, cache, signal) {
  let keyP = cache.get(seg.key.uri);
  if (!keyP) {
    keyP = fetchBytes(seg.key.uri, null, signal)
      .then((raw) => crypto.subtle.importKey('raw', raw, 'AES-CBC', false, ['decrypt']));
    cache.set(seg.key.uri, keyP);
  }
  const iv = seg.key.iv ? hexToBytes(seg.key.iv) : seqIv(seg.seq);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, await keyP, data));
}

// Downloads a media playlist (or the best variant of a master), passing bytes to `write` in order.
// Only a small window of segments is held in memory, so length is limited by disk space only.
// separateInit: don't write the EXT-X-MAP init into the stream; return it (plus per-segment
// sizes and start times) so the caller can merge this track with another one.
export async function downloadHls(url, { signal, onProgress, concurrency = 6, write, separateInit = false }) {
  let pl = parseM3u8(await fetchText(url, signal), url);
  if (pl.type === 'master') {
    if (!pl.variants.length) throw new HlsError('empty');
    url = pl.variants[0].url;
    pl = parseM3u8(await fetchText(url, signal), url);
  }
  if (pl.drm) throw new HlsError('drm');
  const total = pl.segments.length;
  if (!total) throw new HlsError('empty');

  const keyCache = new Map();
  const mapCache = new Map();
  const ready = new Map();
  const windowSize = concurrency * 4;
  let next = 0, done = 0, bytes = 0, flushIdx = 0, lastMap = null, failed = null, init = null;
  const sizes = [];
  let flushing = Promise.resolve();

  async function flush() {
    while (!failed && ready.has(flushIdx)) {
      const data = ready.get(flushIdx);
      ready.delete(flushIdx);
      const s = pl.segments[flushIdx];
      if (s.map) {
        const mk = s.map.url + '|' + (s.map.range ? s.map.range.offset : '');
        if (mk !== lastMap) {
          if (!mapCache.has(mk)) mapCache.set(mk, await fetchBytes(s.map.url, s.map.range, signal));
          if (separateInit) init = init || mapCache.get(mk);
          else await write(mapCache.get(mk));
          lastMap = mk;
        }
      }
      await write(data);
      sizes[flushIdx] = data.length;
      flushIdx++;
    }
  }

  async function worker() {
    while (!failed && next < total) {
      while (!failed && next - flushIdx > windowSize) await new Promise((r) => setTimeout(r, 100));
      if (failed || next >= total) break;
      const i = next++;
      const s = pl.segments[i];
      try {
        let data = await fetchBytes(s.url, s.range, signal);
        if (s.key) data = await decrypt(data, s, keyCache, signal);
        ready.set(i, data);
        done++;
        bytes += data.byteLength;
        onProgress?.(done, total, bytes);
        flushing = flushing.then(flush).catch((e) => { failed = failed || e; });
      } catch (e) {
        failed = failed || e;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
  await flushing;
  if (failed) throw failed;
  return { fmp4: !!pl.segments[0].map, live: !pl.ended, bytes, init, sizes, starts: pl.segments.map((x) => x.start) };
}
