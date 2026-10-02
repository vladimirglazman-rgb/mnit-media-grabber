import { parseM3u8, fetchText } from './lib/hls.js';
import { ensureReferer } from './lib/net.js';
import { isVimeoManifest, isVimeoJson, isVimeoRangePiece, parseVimeo } from './lib/vimeo.js';

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

const VIDEO_EXT = new Set(['mp4', 'm4v', 'webm', 'mov', 'mkv', 'flv', 'ogv', 'avi', '3gp']);
const AUDIO_EXT = new Set(['mp3', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'wav', 'flac']);
const SEGMENT_RE = /\.(ts|m4s|cmfv|cmfa)$/i;

function classify(url, mime, fallback) {
  const m = (mime || '').split(';')[0].trim().toLowerCase();
  let path;
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return null;
    path = u.pathname.toLowerCase();
  } catch {
    return null;
  }
  if (isVimeoManifest(url) || isVimeoJson(url, m)) return 'vimeo';
  if (isVimeoRangePiece(url)) return null;
  if (m.includes('mpegurl') || path.endsWith('.m3u8')) return 'hls';
  if (m === 'application/dash+xml' || path.endsWith('.mpd')) return 'dash';
  if (SEGMENT_RE.test(path) || m === 'video/mp2t' || m.includes('iso.segment')) return null;
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  if (m.startsWith('text/') || m.startsWith('image/') || m.includes('json')) return null;
  const ext = path.match(/\.([a-z0-9]+)$/)?.[1];
  if (VIDEO_EXT.has(ext)) return 'video';
  if (AUDIO_EXT.has(ext)) return 'audio';
  return fallback || null;
}

// Vimeo HLS: separate media playlists for video and audio (…/media.m3u8?…&st=video|audio).
function vimeoRole(url) {
  try {
    const u = new URL(url);
    if (!/(^|\.)vimeocdn\.com$/i.test(u.hostname)) return null;
    const st = u.searchParams.get('st');
    if (st !== 'video' && st !== 'audio') return null;
    const i = u.pathname.indexOf('/avf/');
    return { role: st, group: u.origin + (i > 0 ? u.pathname.slice(0, i) : u.pathname) };
  } catch {
    return null;
  }
}

function normKey(url) {
  try {
    const u = new URL(url);
    for (const p of ['range', 'bytestart', 'byteend', 'rn', 'rbuf']) u.searchParams.delete(p);
    u.hash = '';
    return u.toString();
  } catch {
    return url;
  }
}

// Serialize storage read-modify-write so parallel requests don't overwrite each other.
let queue = Promise.resolve();
function serial(fn) {
  const p = queue.then(fn);
  queue = p.catch((e) => console.warn(e));
  return p;
}

const tabKey = (id) => `tab_${id}`;
async function getTab(id) {
  return (await chrome.storage.session.get(tabKey(id)))[tabKey(id)] || { items: [], children: [] };
}
async function setTab(id, data) {
  await chrome.storage.session.set({ [tabKey(id)]: data });
  chrome.action.setBadgeText({ tabId: id, text: data.items.length ? String(data.items.length) : '' }).catch(() => {});
}

async function onMedia(tabId, url, mime, size, fallback) {
  const kind = classify(url, mime, fallback);
  if (!kind) return;
  const id = normKey(url);
  const isNew = await serial(async () => {
    const t = await getTab(tabId);
    if (t.children.includes(id)) return false;
    if (t.prefixes?.some((p) => url.startsWith(p))) return false;
    const ex = t.items.find((i) => i.id === id);
    if (ex) {
      if (size && !ex.size) {
        ex.size = size;
        await setTab(tabId, t);
      }
      return false;
    }
    const item = { id, url, kind, mime: (mime || '').split(';')[0], size: size || 0, time: Date.now() };
    const v = kind === 'hls' ? vimeoRole(url) : null;
    if (v) {
      item.role = v.role;
      item.group = v.group;
      if (v.role === 'audio') {
        const vids = t.items.filter((i) => i.group === v.group && i.role === 'video');
        if (vids.length) {
          vids.forEach((x) => { x.pairAudioUrl = x.pairAudioUrl || url; });
          t.children.push(id);
          await setTab(tabId, t);
          return false;
        }
      } else {
        const aud = t.items.find((i) => i.group === v.group && i.role === 'audio');
        if (aud) {
          item.pairAudioUrl = aud.url;
          t.items = t.items.filter((i) => i !== aud);
          t.children.push(aud.id);
        }
      }
    }
    t.items.push(item);
    await setTab(tabId, t);
    return true;
  });
  if (isNew && kind === 'hls') enrichHls(tabId, id, url);
  if (isNew && kind === 'vimeo') enrichVimeo(tabId, id, url);
}

async function enrichVimeo(tabId, id, url) {
  let m = null, error = '';
  try {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (tab?.url) await ensureReferer(url, tab.url);
    m = parseVimeo(await (await fetch(url, { credentials: 'include' })).json(), url);
  } catch (e) {
    console.warn('vimeo manifest failed', url, e);
    error = e?.message || String(e);
  }
  await serial(async () => {
    const t = await getTab(tabId);
    if (!m) {
      // A json that is clearly not a manifest is dropped; a named manifest stays, with the reason.
      if (isVimeoManifest(url)) {
        const it = t.items.find((i) => i.id === id);
        if (it) it.error = error;
      } else {
        t.items = t.items.filter((i) => i.id !== id);
      }
    } else {
      const it = t.items.find((i) => i.id === id);
      if (!it) return;
      it.variants = m.video.map((v) => ({ resolution: v.width ? `${v.width}x${v.height}` : `${v.height}p`, bandwidth: v.bitrate }));
      it.duration = m.duration;
      it.hasAudio = m.audio.length > 0;
      it.audioCodec = m.audio[0]?.codecs || '';
      const prefixes = [...m.video, ...m.audio].map((x) => x.base);
      t.prefixes = [...new Set([...(t.prefixes || []), ...prefixes])];
      t.items = t.items.filter((i) => i.id === id || !(prefixes.some((p) => i.url.startsWith(p)) || isVimeoRangePiece(i.url)));
    }
    await setTab(tabId, t);
  });
}

async function enrichHls(tabId, id, url) {
  try {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (tab?.url) await ensureReferer(url, tab.url);
    const pl = parseM3u8(await fetchText(url), url);
    await serial(async () => {
      const t = await getTab(tabId);
      const it = t.items.find((i) => i.id === id);
      if (!it) return;
      if (pl.type === 'master') {
        it.variants = pl.variants;
        it.audio = pl.audio;
        const kids = [...pl.variants.map((v) => normKey(v.url)), ...pl.audio.map((a) => normKey(a.url))];
        t.children.push(...kids);
        t.items = t.items.filter((i) => !kids.includes(i.id));
      } else {
        it.duration = pl.duration;
        it.live = !pl.ended;
        it.drm = pl.drm;
      }
      await setTab(tabId, t);
    });
  } catch (e) {
    console.warn('hls parse failed', url, e);
  }
}

chrome.webRequest.onHeadersReceived.addListener(
  (d) => {
    if (d.tabId < 0) return;
    if (d.statusCode && (d.statusCode < 200 || d.statusCode >= 300)) return;
    const h = {};
    for (const x of d.responseHeaders || []) h[x.name.toLowerCase()] = x.value;
    let size = 0;
    const cr = h['content-range'];
    if (cr) {
      const m = cr.match(/\/(\d+)/);
      if (m) size = +m[1];
    } else if (h['content-length']) {
      size = +h['content-length'];
    }
    onMedia(d.tabId, d.url, h['content-type'] || '', size);
  },
  { urls: ['<all_urls>'], types: ['media', 'xmlhttprequest', 'other', 'object'] },
  ['responseHeaders']
);

async function clearTab(tabId) {
  await serial(() => setTab(tabId, { items: [], children: [] }));
}

chrome.webNavigation.onCommitted.addListener((d) => {
  if (d.frameId === 0) clearTab(d.tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  serial(() => chrome.storage.session.remove(tabKey(tabId)));
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'scan-add') {
    Promise.all(msg.list.map((m) => onMedia(msg.tabId, m.url, '', 0, m.kind))).then(() => sendResponse(true));
    return true;
  }
  if (msg.type === 'clear') {
    clearTab(msg.tabId).then(() => sendResponse(true));
    return true;
  }
});
