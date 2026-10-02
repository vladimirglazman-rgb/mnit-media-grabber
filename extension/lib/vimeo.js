// Vimeo adaptive streams (playlist.json / master.json): separate fMP4 video and audio tracks,
// split into segments. We download both tracks to temporary files on disk, then merge them
// into one playable fragmented MP4 (one moov with two tracks + interleaved fragments).
import { fetchBytes, HlsError } from './hls.js';

export function isVimeoManifest(url) {
  try {
    const p = new URL(url).pathname;
    return /\/(playlist|master)\.json$/i.test(p);
  } catch {
    return false;
  }
}

const isVimeoHost = (u) => /(^|\.)vimeocdn\.com$/i.test(u.hostname);

// A byte-range piece of a bigger Vimeo file — useless on its own, never listed.
export function isVimeoRangePiece(url) {
  try {
    const u = new URL(url);
    return isVimeoHost(u) && (u.pathname.includes('/range/') || u.searchParams.has('range'));
  } catch {
    return false;
  }
}

// JSON served by Vimeo's CDN is a candidate manifest even if its name changes.
export function isVimeoJson(url, mime) {
  try {
    return isVimeoHost(new URL(url)) && /json/i.test(mime || '');
  } catch {
    return false;
  }
}

export function parseVimeo(json, manifestUrl) {
  if (!json || !Array.isArray(json.video) || !json.video.length) throw new HlsError('not_vimeo');
  const base = new URL(json.base_url || '', manifestUrl);
  const stream = (s) => {
    const b = new URL(s.base_url || '', base);
    return {
      width: s.width || 0,
      height: s.height || 0,
      bitrate: s.bitrate || s.avg_bitrate || 0,
      codecs: s.codecs || '',
      base: b.toString(),
      init: s.init_segment || null,
      initUrl: s.init_segment_url ? new URL(s.init_segment_url, b).toString() : null,
      segments: (s.segments || []).map((g) => ({ url: new URL(g.url, b).toString(), start: +g.start || 0 })),
    };
  };
  const video = json.video.map(stream).sort((a, b) => (b.height - a.height) || (b.bitrate - a.bitrate));
  // AAC first: Windows' built-in player cannot play Opus audio.
  const isAac = (x) => /^mp4a/i.test(x.codecs) ? 1 : 0;
  const audio = (json.audio || []).map(stream).sort((a, b) => (isAac(b) - isAac(a)) || (b.bitrate - a.bitrate));
  const last = video[0].segments[video[0].segments.length - 1];
  return { video, audio, duration: +json.duration || (last ? last.start : 0), query: new URL(manifestUrl).search };
}

/* ---------- MP4 box helpers ---------- */

function* boxes(buf, start = 0, end = buf.length) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let p = start;
  while (p + 8 <= end) {
    let size = dv.getUint32(p);
    let hdr = 8;
    if (size === 1) { size = Number(dv.getBigUint64(p + 8)); hdr = 16; }
    else if (size === 0) size = end - p;
    if (size < hdr || p + size > end) break;
    yield { type: String.fromCharCode(buf[p + 4], buf[p + 5], buf[p + 6], buf[p + 7]), start: p, size, hdr };
    p += size;
  }
}
const children = (buf, b) => [...boxes(buf, b.start + b.hdr, b.start + b.size)];
const copy = (buf, b) => buf.slice(b.start, b.start + b.size);
const setU32 = (buf, off, v) => new DataView(buf.buffer, buf.byteOffset).setUint32(off, v);

function box(type, parts) {
  const len = 8 + parts.reduce((n, x) => n + x.length, 0);
  const out = new Uint8Array(len);
  setU32(out, 0, len);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  let p = 8;
  for (const x of parts) { out.set(x, p); p += x.length; }
  return out;
}

function trakWithId(buf, trakBox, id) {
  const t = copy(buf, trakBox);
  for (const c of boxes(t, trakBox.hdr, t.length)) {
    if (c.type === 'tkhd') setU32(t, c.start + (t[c.start + 8] === 1 ? 28 : 20), id);
  }
  return t;
}

function trexWithId(buf, b, id) {
  const t = copy(buf, b);
  setU32(t, 12, id);
  return t;
}

function newTrex(id) {
  const p = new Uint8Array(20);
  setU32(p, 4, id);
  setU32(p, 8, 1); // default_sample_description_index
  return box('trex', [new Uint8Array(4), p.subarray(4)]);
}

function findTrex(buf, moov) {
  const mvex = children(buf, moov).find((b) => b.type === 'mvex');
  return mvex ? children(buf, mvex).find((b) => b.type === 'trex') : null;
}

function buildInit(vInit, aInit) {
  const vTop = [...boxes(vInit)];
  const ftyp = vTop.find((b) => b.type === 'ftyp');
  const vMoov = vTop.find((b) => b.type === 'moov');
  if (!vMoov) throw new HlsError('bad_init');
  let aTrak = null, aTrex = null;
  if (aInit) {
    const aMoov = [...boxes(aInit)].find((b) => b.type === 'moov');
    const ac = children(aInit, aMoov);
    aTrak = trakWithId(aInit, ac.find((b) => b.type === 'trak'), 2);
    const trex = findTrex(aInit, aMoov);
    aTrex = trex ? trexWithId(aInit, trex, 2) : newTrex(2);
  }
  let hasMvex = false;
  const parts = [];
  for (const c of children(vInit, vMoov)) {
    if (c.type === 'mvhd') {
      const m = copy(vInit, c);
      setU32(m, m.length - 4, aInit ? 3 : 2);
      parts.push(m);
    } else if (c.type === 'trak') {
      parts.push(trakWithId(vInit, c, 1));
      if (aTrak) parts.push(aTrak);
    } else if (c.type === 'mvex') {
      hasMvex = true;
      const mv = children(vInit, c).map((x) => (x.type === 'trex' ? trexWithId(vInit, x, 1) : copy(vInit, x)));
      if (!mv.some((x) => String.fromCharCode(...x.subarray(4, 8)) === 'trex')) mv.unshift(newTrex(1));
      if (aTrex) mv.push(aTrex);
      parts.push(box('mvex', mv));
    } else {
      parts.push(copy(vInit, c));
    }
  }
  if (!hasMvex) parts.push(box('mvex', aTrex ? [newTrex(1), aTrex] : [newTrex(1)]));
  const moov = box('moov', parts);
  return ftyp ? [copy(vInit, ftyp), moov] : [moov];
}

// Keep only moof+mdat from a media segment and set the track id in every tfhd.
function fragment(buf, id) {
  const out = [];
  for (const b of boxes(buf)) {
    if (b.type === 'moof') {
      const m = copy(buf, b);
      for (const traf of boxes(m, b.hdr, m.length)) {
        if (traf.type !== 'traf') continue;
        for (const c of boxes(m, traf.start + traf.hdr, traf.start + traf.size)) {
          if (c.type === 'tfhd') setU32(m, c.start + 12, id);
        }
      }
      out.push(m);
    } else if (b.type === 'mdat') {
      out.push(buf.subarray(b.start, b.start + b.size));
    }
  }
  return out;
}

function b64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ---------- download ---------- */

async function tempFile(root, name) {
  const fh = await root.getFileHandle(name, { create: true });
  return { name, fh, w: await fh.createWritable() };
}

// Downloads segments in parallel, writes them to `w` in order, returns their sizes.
async function fetchTrack(track, w, { signal, concurrency, onSeg, query }) {
  const total = track.segments.length;
  const sizes = new Array(total);
  const ready = new Map();
  let next = 0, flushIdx = 0, failed = null, flushing = Promise.resolve();
  let withQuery = false;

  const get = async (url) => {
    if (withQuery || !query) return fetchBytes(withQuery ? url + (url.includes('?') ? '&' : '?') + query.slice(1) : url, null, signal);
    try {
      return await fetchBytes(url, null, signal, 1);
    } catch (e) {
      if (signal?.aborted) throw e;
      withQuery = true; // newer manifests need the manifest's signed query string on each segment
      return get(url);
    }
  };
  const flush = async () => {
    while (!failed && ready.has(flushIdx)) {
      const d = ready.get(flushIdx);
      ready.delete(flushIdx);
      await w.write(d);
      sizes[flushIdx++] = d.length;
    }
  };
  const worker = async () => {
    while (!failed && next < total) {
      while (!failed && next - flushIdx > concurrency * 4) await new Promise((r) => setTimeout(r, 100));
      if (failed || next >= total) break;
      const i = next++;
      try {
        ready.set(i, await get(track.segments[i].url));
        onSeg();
        flushing = flushing.then(flush).catch((e) => { failed = failed || e; });
      } catch (e) {
        failed = failed || e;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
  await flushing;
  if (failed) throw failed;
  return sizes;
}

async function initOf(track, signal) {
  if (track.init) return b64(track.init);
  if (track.initUrl) return fetchBytes(track.initUrl, null, signal);
  throw new HlsError('bad_init');
}

// Returns { file, cleanup } — `file` is a disk-backed File of the merged MP4.
export async function downloadVimeo(manifestUrl, videoIndex, { signal, onProgress, concurrency = 6 }) {
  const r = await fetch(manifestUrl, { signal, credentials: 'include' });
  if (!r.ok) throw new HlsError('http', 'HTTP ' + r.status);
  const m = parseVimeo(await r.json(), manifestUrl);
  const v = m.video[videoIndex] || m.video[0];
  const a = m.audio[0] || null;

  const root = await navigator.storage.getDirectory();
  const stamp = Date.now();
  const temps = [];
  const cleanup = () => Promise.all(temps.map((n) => root.removeEntry(n).catch(() => {})));
  try {
    const total = v.segments.length + (a ? a.segments.length : 0);
    let done = 0, bytes = 0;
    const onSeg = () => { done++; onProgress?.(done, total + 1); };

    const tracks = [{ t: v, id: 1 }];
    if (a) tracks.push({ t: a, id: 2 });
    for (const tr of tracks) {
      const tmp = await tempFile(root, `job-${stamp}-${tr.id}`);
      temps.push(tmp.name);
      tr.init = await initOf(tr.t, signal);
      tr.sizes = await fetchTrack(tr.t, tmp.w, { signal, concurrency, onSeg, query: m.query });
      await tmp.w.close();
      tr.file = await tmp.fh.getFile();
    }

    for (const tr of tracks) tr.starts = tr.t.segments.map((x) => x.start);
    const out = await mergeTracks(root, `job-${stamp}-out`, tracks, signal);
    temps.push(out.name);
    onProgress?.(total + 1, total + 1);
    return { file: out.file, cleanup, bytes: out.file.size, hasAudio: !!a, audioCodec: a ? a.codecs : '' };
  } catch (e) {
    await cleanup();
    throw e;
  }
}

// tracks: [{ id, init, file, sizes, starts }] (id 1 = video, 2 = audio). Writes one fMP4.
export async function mergeTracks(root, name, tracks, signal) {
  const out = await tempFile(root, name);
  try {
    for (const part of buildInit(tracks[0].init, tracks[1] ? tracks[1].init : null)) await out.w.write(part);
    const order = [];
    for (const tr of tracks) {
      let off = 0;
      tr.sizes.forEach((len, i) => {
        order.push({ tr, start: tr.starts[i] || 0, off, len });
        off += len;
      });
    }
    order.sort((x, y) => (x.start - y.start) || (x.tr.id - y.tr.id));
    for (const o of order) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const buf = new Uint8Array(await o.tr.file.slice(o.off, o.off + o.len).arrayBuffer());
      for (const part of fragment(buf, o.tr.id)) await out.w.write(part);
    }
    await out.w.close();
  } catch (e) {
    await out.w.abort().catch(() => {});
    await root.removeEntry(name).catch(() => {});
    throw e;
  }
  return { name, file: await out.fh.getFile() };
}
