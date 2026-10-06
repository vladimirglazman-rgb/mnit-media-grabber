import { downloadHls, HlsError } from './lib/hls.js';
import { ensureReferer } from './lib/net.js';
import { downloadVimeo, mergeTracks, dedupeClips } from './lib/vimeo.js';

const STR = {
  he: {
    appName: 'MNIT Media Grabber',
    versionLabel: 'גרסה:', versionValue: 'אישית',
    refresh: 'סריקה מחדש', settings: 'הגדרות', language: 'English', history: 'היסטוריה',
    openFolder: 'פתח תיקיית הורדות', clearList: 'נקה רשימה', help: 'מדריך (נפתח בלשונית חדשה)', closePanel: 'סגור פאנל',
    noVideo: 'אין וידאו?',
    waiting: 'ממתין למדיה...',
    waitingHint: 'הפעל את הסרטון בדף, והוא יופיע כאן.',
    items: '{n} נמצאו', noTab: 'אין דף פתוח',
    download: 'הורדה', cancel: 'ביטול', copy: 'העתק קישור', copied: 'הועתק ✓',
    best: 'האיכות הגבוהה ביותר',
    downloading: 'מוריד... {p}% ({b})', starting: 'מתחיל...', saving: 'שומר קובץ...',
    sentToDownloads: 'נשלח להורדות ✓', done: 'הושלם ✓', cancelled: 'בוטל',
    failed: 'נכשל: {e}',
    drm: 'מוגן בהעתקה (DRM) — אי אפשר להוריד.',
    dash: 'פורמט DASH — לא נתמך בגרסה הזו.',
    live: 'שידור חי — יירד רק מה שזמין כרגע.',
    sepAudio: 'הקול נשמר בקובץ נפרד.',
    keepOpen: 'השאר את הפאנל פתוח עד הסיום.',
    audioNotYet: '🔇 עדיין לא נמצא קול. תן לסרטון להתנגן כמה שניות עם קול ולחץ ↻.',
    audioYes: '🔊 כולל קול', audioNo: '🔇 ברשימה של האתר אין קול — הקובץ יהיה בלי קול.', withAudio: 'הושלם ✓ — וידאו + קול', videoOnly: 'הושלם ✓ — וידאו בלבד, בלי קול',
    manifestErr: 'לא הצלחתי לקרוא את רשימת החלקים ({e}). העתק את הקישור 🔗 ושלח למפתח.',
    kind_video: 'וידאו', kind_audio: 'אודיו', kind_hls: 'סטרים', kind_vimeo: 'סטרים', kind_dash: 'DASH',
    unknownSize: 'גודל לא ידוע',
    back: 'חזרה',
    sFolder: 'תיקייה בתוך "הורדות"', sSaveAs: 'לשאול איפה לשמור כל קובץ',
    sMinSize: 'להסתיר קבצים קטנים מ- (KB)', sShowAudio: 'להציג קבצי אודיו',
    sConcurrency: 'הורדות מקבילות לסטרים (1–16)', saved: 'נשמר ✓',
    historyEmpty: 'עדיין לא הורדת כלום.', clearHistory: 'נקה היסטוריה',
    noVideoHtml: `
      <ol>
        <li>הפעל את הסרטון בדף (לחיצה על Play). הכלי רואה וידאו רק כשהוא מתחיל להיטען.</li>
        <li>לחץ על כפתור הסריקה ↻ למעלה.</li>
        <li>עדיין כלום? רענן את הדף (F5) והפעל שוב.</li>
        <li>בדוק בהגדרות שהסינון לפי גודל לא מסתיר את הקובץ.</li>
      </ol>
      <p><b>מה לא יעבוד:</b> YouTube, Netflix, Disney+, Spotify ואתרים עם הגנת העתקה (DRM). זו מגבלה טכנית ומשפטית, לא באג.</p>`,
    helpHtml: `
      <p><b>איך משתמשים:</b></p>
      <ol>
        <li>פותחים דף עם וידאו ומפעילים אותו.</li>
        <li>הסרטון מופיע ברשימה. בוחרים איכות (אם יש) ולוחצים <b>הורדה</b>.</li>
        <li>הקובץ נשמר בתיקיית ההורדות.</li>
      </ol>
      <p><b>סטרים (HLS):</b> הכלי מוריד את כל החלקים ומחבר לקובץ אחד (.ts או .mp4). קובץ ts נפתח ב-VLC. הקובץ נכתב ישר לדיסק, כך שגם סרט של שעתיים עובד. צריך מקום פנוי בדיסק C של פי 2 מגודל הסרט (זמנית).</p>
      <p><b>שימוש אישי בלבד.</b> הורד רק תוכן שמותר לך להוריד.</p>`,
  },
  en: {
    appName: 'MNIT Media Grabber',
    versionLabel: 'Version:', versionValue: 'Personal',
    refresh: 'Rescan', settings: 'Settings', language: 'עברית', history: 'History',
    openFolder: 'Open downloads folder', clearList: 'Clear list', help: 'Guide (opens in a new tab)', closePanel: 'Close panel',
    noVideo: 'No video?',
    waiting: 'Waiting for media...',
    waitingHint: 'Play the video on the page and it will show up here.',
    items: '{n} found', noTab: 'No page open',
    download: 'Download', cancel: 'Cancel', copy: 'Copy link', copied: 'Copied ✓',
    best: 'Best quality',
    downloading: 'Downloading... {p}% ({b})', starting: 'Starting...', saving: 'Saving file...',
    sentToDownloads: 'Sent to downloads ✓', done: 'Done ✓', cancelled: 'Cancelled',
    failed: 'Failed: {e}',
    drm: 'Copy-protected (DRM) — cannot be downloaded.',
    dash: 'DASH format — not supported in this version.',
    live: 'Live stream — only what is available now will be saved.',
    sepAudio: 'Audio is a separate track — two files will be saved.',
    keepOpen: 'Keep this panel open until it finishes.',
    audioNotYet: '🔇 No audio found yet. Let the video play a few seconds with sound, then press ↻.',
    audioYes: '🔊 Includes audio', audioNo: '🔇 The site lists no audio — the file will be silent.', withAudio: 'Done ✓ — video + audio', videoOnly: 'Done ✓ — video only, no audio',
    manifestErr: 'Could not read the stream list ({e}). Copy the link 🔗 and send it to the developer.',
    kind_video: 'Video', kind_audio: 'Audio', kind_hls: 'Stream', kind_vimeo: 'Stream', kind_dash: 'DASH',
    unknownSize: 'unknown size',
    back: 'Back',
    sFolder: 'Folder inside "Downloads"', sSaveAs: 'Ask where to save each file',
    sMinSize: 'Hide files smaller than (KB)', sShowAudio: 'Show audio files',
    sConcurrency: 'Parallel stream downloads (1–16)', saved: 'Saved ✓',
    historyEmpty: 'Nothing downloaded yet.', clearHistory: 'Clear history',
    noVideoHtml: `
      <ol>
        <li>Play the video on the page. The tool only sees media once it starts loading.</li>
        <li>Press the rescan button ↻ at the top.</li>
        <li>Still nothing? Reload the page (F5) and play again.</li>
        <li>Check that the size filter in Settings is not hiding the file.</li>
      </ol>
      <p><b>Will not work:</b> YouTube, Netflix, Disney+, Spotify and other copy-protected (DRM) sites. This is a technical and legal limit, not a bug.</p>`,
    helpHtml: `
      <p><b>How to use:</b></p>
      <ol>
        <li>Open a page with a video and play it.</li>
        <li>The video appears in the list. Pick a quality (if offered) and press <b>Download</b>.</li>
        <li>The file is saved to your Downloads folder.</li>
      </ol>
      <p><b>Streams (HLS):</b> all pieces are downloaded and joined into one file (.ts or .mp4). A .ts file opens in VLC. The file is written straight to disk, so even 2-hour movies work. You need free space on the system drive of about 2× the movie size (temporarily).</p>
      <p><b>Personal use only.</b> Download only content you are allowed to download.</p>`,
  },
};

const DEFAULTS = { lang: null, folder: 'Media Grabber', saveAs: false, minSizeKB: 300, showAudio: true, concurrency: 6 };

let settings = { ...DEFAULTS };
let activeTab = null;
let items = [];
let view = 'list';
const jobs = new Map();      // item id -> { pct, text, cls, controller, running }
const jobEls = new Map();    // item id -> { bar, status, progress, dlBtn, cancelBtn }

const $ = (s) => document.querySelector(s);
const main = $('#main');

function t(key, vars) {
  let s = STR[settings.lang]?.[key] ?? STR.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}

function el(tag, props = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v);
  }
  for (const c of children) if (c) e.append(c);
  return e;
}

function fmtBytes(n) {
  if (!n) return '';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i > 1 ? 1 : 0)} ${u[i]}`;
}

function fmtDuration(s) {
  if (!s) return '';
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(sec).padStart(2, '0')}`;
}

function sanitize(name) {
  return (name || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\s+/g, ' ')
    .replace(/^[\s.]+|[\s.]+$/g, '').slice(0, 120);
}

function urlFileName(url) {
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).pop() || '';
    return decodeURIComponent(last);
  } catch {
    return '';
  }
}

function extOf(item) {
  const fromUrl = urlFileName(item.url).match(/\.([a-z0-9]{2,4})$/i)?.[1]?.toLowerCase();
  if (fromUrl && fromUrl !== 'm3u8') return fromUrl;
  const m = item.mime || '';
  if (m.includes('webm')) return 'webm';
  if (m.includes('mpeg') && item.kind === 'audio') return 'mp3';
  if (m.includes('ogg')) return 'ogg';
  return item.kind === 'audio' ? 'm4a' : 'mp4';
}

function buildPath(base, ext) {
  const folder = (settings.folder || '').split(/[\\/]/).map(sanitize).filter(Boolean).join('/');
  const file = `${sanitize(base) || 'video'}.${ext}`;
  return folder ? `${folder}/${file}` : file;
}

/* ---------- settings / i18n ---------- */

async function loadSettings() {
  const { settings: s } = await chrome.storage.local.get('settings');
  settings = { ...DEFAULTS, ...(s || {}) };
  if (!settings.lang) settings.lang = chrome.i18n.getUILanguage().startsWith('he') ? 'he' : 'en';
}

async function saveSettings() {
  await chrome.storage.local.set({ settings });
}

function applyLang() {
  document.documentElement.lang = settings.lang;
  document.documentElement.dir = settings.lang === 'he' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach((e) => { e.title = t(e.dataset.i18nTitle); });
  $('#versionNum').textContent = 'v' + chrome.runtime.getManifest().version;
}

/* ---------- data ---------- */

async function refreshActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tab || null;
  $('#tabTitle').textContent = activeTab ? (activeTab.title || activeTab.url || '—') : t('noTab');
  await loadItems();
  render();
  scanPage();
}

async function loadItems() {
  if (!activeTab) { items = []; return; }
  const k = `tab_${activeTab.id}`;
  items = ((await chrome.storage.session.get(k))[k] || { items: [] }).items;
}

function visibleItems() {
  return dedupeClips(items).filter((i) => {
    if (i.kind === 'audio' && !settings.showAudio) return false;
    if ((i.kind === 'video' || i.kind === 'audio') && i.size && i.size < settings.minSizeKB * 1024) return false;
    return true;
  });
}

// Catches <video>/<audio> elements whose files were served from cache (no network request seen).
async function scanPage() {
  if (!activeTab || !/^https?:/.test(activeTab.url || '')) return;
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id, allFrames: true },
      func: () => {
        const out = [];
        document.querySelectorAll('video, audio, video source, audio source').forEach((e) => {
          const u = e.currentSrc || e.src;
          if (u && /^https?:/.test(u)) out.push({ url: u, kind: e.closest('audio') ? 'audio' : 'video' });
        });
        return out;
      },
    });
    const list = res.flatMap((r) => r.result || []);
    if (list.length) await chrome.runtime.sendMessage({ type: 'scan-add', tabId: activeTab.id, list });
  } catch {
    // Restricted pages (chrome://, web store) cannot be scanned.
  }
}

/* ---------- rendering ---------- */

function setActiveTb(id) {
  document.querySelectorAll('.tb').forEach((b) => b.classList.toggle('active', b.id === id));
}

function render() {
  jobEls.clear();
  main.replaceChildren();
  setActiveTb({ settings: 'btnSettings', history: 'btnHistory', help: 'btnHelp', novideo: 'btnNoVideo' }[view]);
  if (view === 'settings') return renderSettings();
  if (view === 'history') return renderHistory();
  if (view === 'help') return renderHtmlView(t('help'), t('helpHtml'));
  if (view === 'novideo') return renderHtmlView(t('noVideo'), t('noVideoHtml'));

  const list = visibleItems();
  $('#countLabel').textContent = list.length ? t('items', { n: list.length }) : '';
  if (!list.length) {
    main.append(el('div', { class: 'empty' },
      el('img', { src: 'icons/logo256.png', alt: 'MNIT' }),
      el('div', { text: t('waiting') }),
      el('div', { class: 'hint', text: t('waitingHint') })));
    return;
  }
  for (const item of list.slice().reverse()) main.append(renderItem(item));
}

function renderItem(item) {
  const title = activeTab?.title || urlFileName(item.url);
  const metaParts = [];
  if (item.kind === 'hls' || item.kind === 'vimeo') {
    if (item.duration) metaParts.push(fmtDuration(item.duration));
    if (item.variants?.length) metaParts.push(item.variants[0].resolution || '');
  } else {
    metaParts.push(extOf(item).toUpperCase());
    metaParts.push(item.size ? fmtBytes(item.size) : t('unknownSize'));
  }
  try { metaParts.push(new URL(item.url).hostname); } catch {}

  const box = el('div', { class: 'item' },
    el('div', { class: 'item-top' },
      el('div', { class: 'kind', text: t('kind_' + item.kind) }),
      el('div', { class: 'info' },
        el('div', { class: 'name', title, text: title }),
        el('div', { class: 'meta', title: item.url, text: metaParts.filter(Boolean).join(' · ') }))));

  const info = box.querySelector('.info');
  const blocked = item.kind === 'dash' || item.drm || !!item.error;
  if (item.kind === 'hls' && item.role === 'video') {
    info.append(el('div', { class: 'note' + (item.pairAudioUrl ? ' ok' : ''), text: item.pairAudioUrl ? t('audioYes', { c: 'HLS' }) : t('audioNotYet') }));
  }
  if (item.kind === 'vimeo' && !item.error) {
    info.append(el('div', { class: 'note' + (item.hasAudio ? ' ok' : ''), text: item.hasAudio ? t('audioYes', { c: audioName(item.audioCodec) }) : t('audioNo') }));
  }
  if (item.error) info.append(el('div', { class: 'note err', text: t('manifestErr', { e: item.error }) }));
  if (item.drm) info.append(el('div', { class: 'note err', text: t('drm') }));
  if (item.kind === 'dash') info.append(el('div', { class: 'note err', text: t('dash') }));
  if (item.live) info.append(el('div', { class: 'note', text: t('live') }));

  const row = el('div', { class: 'row' });
  let select = null;
  if (item.variants?.length > 1) {
    select = el('select', { 'aria-label': 'quality' });
    item.variants.forEach((v, i) => {
      const label = [v.resolution, v.bandwidth ? `${(v.bandwidth / 1e6).toFixed(1)} Mbps` : ''].filter(Boolean).join(' · ');
      select.append(el('option', { value: String(i), text: i === 0 ? `${label} (${t('best')})` : label }));
    });
    row.append(select);
  }

  const dlBtn = el('button', { class: 'btn primary', text: t('download') });
  dlBtn.disabled = blocked;
  dlBtn.addEventListener('click', () => startDownload(item, select ? +select.value : 0));
  const cancelBtn = el('button', { class: 'btn', text: t('cancel') });
  cancelBtn.hidden = true;
  cancelBtn.addEventListener('click', () => jobs.get(item.id)?.controller?.abort());
  const copyBtn = el('button', { class: 'btn', title: t('copy'), text: '🔗' });
  copyBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(item.url);
    copyBtn.textContent = '✓';
    setTimeout(() => { copyBtn.textContent = '🔗'; }, 1200);
  });
  row.append(dlBtn, cancelBtn, copyBtn);
  info.append(row);

  const bar = el('div', { class: 'bar' });
  const progress = el('div', { class: 'progress' }, bar);
  const status = el('div', { class: 'status' });
  progress.hidden = true;
  status.hidden = true;
  info.append(progress, status);

  jobEls.set(item.id, { bar, status, progress, dlBtn, cancelBtn });
  updateJobUI(item.id);
  return box;
}

function audioName(c) {
  if (/^mp4a/i.test(c || '')) return 'AAC';
  if (/opus/i.test(c || '')) return 'Opus';
  return c || '?';
}

function renderHtmlView(title, html) {
  const body = el('div', { class: 'panel help' });
  body.innerHTML = html; // static strings from STR only
  main.append(viewHead(title), body);
}

function viewHead(title) {
  return el('div', { class: 'view-head' },
    el('h2', { text: title }),
    el('button', { class: 'btn', text: t('back'), onclick: () => { view = 'list'; render(); } }));
}

function renderSettings() {
  const msg = el('div', { class: 'status ok' });
  const flash = async () => { await saveSettings(); msg.textContent = t('saved'); setTimeout(() => { msg.textContent = ''; }, 1200); };

  const folder = el('input', { type: 'text', value: settings.folder });
  folder.addEventListener('change', () => { settings.folder = folder.value; flash(); });
  const minSize = el('input', { type: 'number', min: '0', step: '50', value: String(settings.minSizeKB) });
  minSize.addEventListener('change', () => { settings.minSizeKB = Math.max(0, +minSize.value || 0); flash(); });
  const conc = el('input', { type: 'number', min: '1', max: '16', value: String(settings.concurrency) });
  conc.addEventListener('change', () => { settings.concurrency = Math.min(16, Math.max(1, +conc.value || 6)); conc.value = settings.concurrency; flash(); });
  const saveAs = el('input', { type: 'checkbox' });
  saveAs.checked = settings.saveAs;
  saveAs.addEventListener('change', () => { settings.saveAs = saveAs.checked; flash(); });
  const showAudio = el('input', { type: 'checkbox' });
  showAudio.checked = settings.showAudio;
  showAudio.addEventListener('change', () => { settings.showAudio = showAudio.checked; flash(); });

  main.append(viewHead(t('settings')), el('div', { class: 'panel' },
    el('label', { class: 'field' }, el('span', { text: t('sFolder') }), folder),
    el('label', { class: 'field' }, el('span', { text: t('sMinSize') }), minSize),
    el('label', { class: 'field' }, el('span', { text: t('sConcurrency') }), conc),
    el('label', { class: 'check' }, saveAs, el('span', { text: t('sSaveAs') })),
    el('label', { class: 'check' }, showAudio, el('span', { text: t('sShowAudio') })),
    msg));
}

async function renderHistory() {
  const { history = [] } = await chrome.storage.local.get('history');
  if (view !== 'history') return;
  const panel = el('div', { class: 'panel' });
  if (!history.length) panel.append(el('div', { class: 'status', text: t('historyEmpty') }));
  const locale = settings.lang === 'he' ? 'he-IL' : 'en-GB';
  for (const h of history) {
    panel.append(el('div', {
      class: 'hist-item',
      title: h.url,
      onclick: () => { if (h.downloadId) chrome.downloads.show(h.downloadId); },
    },
      el('div', { class: 'name', text: h.filename }),
      el('div', { class: 'meta', text: new Date(h.time).toLocaleString(locale) + (h.size ? ' · ' + fmtBytes(h.size) : '') })));
  }
  const clear = el('button', { class: 'btn', text: t('clearHistory') });
  clear.addEventListener('click', async () => { await chrome.storage.local.set({ history: [] }); render(); });
  clear.disabled = !history.length;
  main.append(viewHead(t('history')), panel, el('div', { class: 'row' }, clear));
}

/* ---------- downloads ---------- */

function setJob(id, patch) {
  jobs.set(id, { ...(jobs.get(id) || {}), ...patch });
  updateJobUI(id);
}

function updateJobUI(id) {
  const j = jobs.get(id);
  const e = jobEls.get(id);
  if (!j || !e) return;
  e.progress.hidden = !j.running && j.pct == null;
  e.bar.style.width = `${j.pct || 0}%`;
  e.status.hidden = !j.text;
  e.status.textContent = j.text || '';
  e.status.className = 'status' + (j.cls ? ' ' + j.cls : '');
  e.dlBtn.disabled = !!j.running;
  e.cancelBtn.hidden = !j.controller || !j.running;
}

async function addHistory(entry) {
  const { history = [] } = await chrome.storage.local.get('history');
  history.unshift({ ...entry, time: Date.now() });
  await chrome.storage.local.set({ history: history.slice(0, 200) });
}

async function startDownload(item, variantIndex) {
  if (jobs.get(item.id)?.running) return;
  const title = activeTab?.title || urlFileName(item.url) || 'video';
  const pageUrl = activeTab?.url || '';
  try {
    if (item.kind === 'hls') await downloadStream(item, variantIndex, title, pageUrl);
    else if (item.kind === 'vimeo') await downloadVimeoItem(item, variantIndex, title, pageUrl);
    else await downloadDirect(item, title, pageUrl);
  } catch (e) {
    const cancelled = e?.name === 'AbortError';
    const msg = e instanceof HlsError && e.code === 'drm' ? t('drm') : (e?.message || String(e));
    setJob(item.id, { running: false, controller: null, pct: null, cls: cancelled ? '' : 'err', text: cancelled ? t('cancelled') : t('failed', { e: msg }) });
  }
}

async function downloadDirect(item, title, pageUrl) {
  setJob(item.id, { running: true, pct: null, text: t('starting'), cls: '' });
  await ensureReferer(item.url, pageUrl);
  const filename = buildPath(title, extOf(item));
  const downloadId = await chrome.downloads.download({ url: item.url, filename, saveAs: settings.saveAs, conflictAction: 'uniquify' });
  await addHistory({ url: item.url, filename: filename.split('/').pop(), downloadId, size: item.size });
  setJob(item.id, { running: false, text: t('sentToDownloads'), cls: 'ok' });
}

async function downloadVimeoItem(item, variantIndex, title, pageUrl) {
  const controller = new AbortController();
  setJob(item.id, { running: true, controller, pct: 0, text: t('starting'), cls: '' });
  await ensureReferer(item.url, pageUrl);
  const res = await downloadVimeo(item.url, variantIndex, {
    signal: controller.signal,
    concurrency: settings.concurrency,
    onProgress: (done, total) => {
      const pct = Math.round((done / total) * 100);
      setJob(item.id, { pct, text: `${t('downloading', { p: pct, b: '' }).replace(' ()', '')} — ${t('keepOpen')}` });
    },
  });
  setJob(item.id, { text: t('saving') });
  const filename = buildPath(title, 'mp4');
  const downloadId = await saveBlob(new Blob([res.file], { type: 'video/mp4' }), filename, res.cleanup);
  await addHistory({ url: item.url, filename: filename.split('/').pop(), downloadId, size: res.file.size });
  const doneText = res.hasAudio ? t('withAudio', { c: audioName(res.audioCodec) }) : t('videoOnly');
  setJob(item.id, { running: false, controller: null, pct: 100, text: doneText, cls: 'ok' });
}

async function downloadStream(item, variantIndex, title, pageUrl) {
  const controller = new AbortController();
  setJob(item.id, { running: true, controller, pct: 0, text: t('starting'), cls: '' });
  await ensureReferer(item.url, pageUrl);

  const variant = item.variants?.[variantIndex];
  const videoUrl = variant ? variant.url : item.url;
  const audioUrl = variant?.audio
    ? (item.audio || []).filter((a) => a.group === variant.audio).sort((a, b) => b.isDefault - a.isDefault)[0]?.url
    : item.pairAudioUrl;
  const tracks = [{ id: 1, url: videoUrl }];
  if (audioUrl) tracks.push({ id: 2, url: audioUrl, audio: true });
  const separate = tracks.length > 1;

  const root = await navigator.storage.getDirectory();
  const stamp = Date.now();
  const temps = [];
  const cleanup = () => Promise.all(temps.map((n) => root.removeEntry(n).catch(() => {})));
  try {
    for (let n = 0; n < tracks.length; n++) {
      const tr = tracks[n];
      tr.tmp = `job-${stamp}-${n}`;
      temps.push(tr.tmp);
      const fh = await root.getFileHandle(tr.tmp, { create: true });
      const writable = await fh.createWritable();
      try {
        tr.result = await downloadHls(tr.url, {
          signal: controller.signal,
          concurrency: settings.concurrency,
          separateInit: separate,
          write: (chunk) => writable.write(chunk),
          onProgress: (done, total, bytes) => {
            const pct = Math.round(((n + done / total) / tracks.length) * 100);
            setJob(item.id, { pct, text: `${t('downloading', { p: pct, b: fmtBytes(bytes) })} — ${t('keepOpen')}` });
          },
        });
        await writable.close();
      } catch (e) {
        await writable.abort().catch(() => {});
        throw e;
      }
      tr.file = await fh.getFile();
    }
    setJob(item.id, { text: t('saving') });

    // Video + audio in fMP4: merge into one playable MP4.
    if (separate && tracks.every((x) => x.result.fmp4 && x.result.init)) {
      const out = await mergeTracks(root, `job-${stamp}-out`, tracks.map((x) => ({
        id: x.id, init: x.result.init, file: x.file, sizes: x.result.sizes, starts: x.result.starts,
      })), controller.signal);
      temps.push(out.name);
      const filename = buildPath(title, 'mp4');
      const downloadId = await saveBlob(new Blob([out.file], { type: 'video/mp4' }), filename, cleanup);
      await addHistory({ url: item.url, filename: filename.split('/').pop(), downloadId, size: out.file.size });
      setJob(item.id, { running: false, controller: null, pct: 100, text: t('withAudio', { c: 'HLS' }), cls: 'ok' });
      return;
    }

    // Otherwise each track is saved as its own file.
    for (const tr of tracks) {
      const fmp4 = tr.result.fmp4;
      const ext = fmp4 ? (tr.audio ? 'm4a' : 'mp4') : 'ts';
      const mime = fmp4 ? (tr.audio ? 'audio/mp4' : 'video/mp4') : 'video/mp2t';
      const filename = buildPath(title + (tr.audio ? ' (audio)' : ''), ext);
      const parts = separate && tr.result.init ? [tr.result.init, tr.file] : [tr.file];
      const blob = new Blob(parts, { type: mime });
      const name = tr.tmp;
      const downloadId = await saveBlob(blob, filename, () => root.removeEntry(name).catch(() => {}));
      await addHistory({ url: tr.url, filename: filename.split('/').pop(), downloadId, size: blob.size });
    }
    setJob(item.id, { running: false, controller: null, pct: 100, text: separate ? t('done') + ' ' + t('sepAudio') : t('done'), cls: 'ok' });
  } catch (e) {
    await cleanup();
    throw e;
  }
}

async function saveBlob(blob, filename, cleanup) {
  const url = URL.createObjectURL(blob);
  let id;
  try {
    id = await chrome.downloads.download({ url, filename, saveAs: settings.saveAs, conflictAction: 'uniquify' });
  } catch (e) {
    URL.revokeObjectURL(url);
    cleanup?.();
    throw e;
  }
  const onChanged = (d) => {
    if (d.id === id && d.state && d.state.current !== 'in_progress') {
      URL.revokeObjectURL(url);
      cleanup?.();
      chrome.downloads.onChanged.removeListener(onChanged);
    }
  };
  chrome.downloads.onChanged.addListener(onChanged);
  return id;
}

/* ---------- toolbar ---------- */

function toggleView(v) {
  view = view === v ? 'list' : v;
  render();
}

$('#btnSettings').addEventListener('click', () => toggleView('settings'));
$('#btnHistory').addEventListener('click', () => toggleView('history'));
$('#btnHelp').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('guide.html#10') }));
$('#btnNoVideo').addEventListener('click', () => toggleView('novideo'));
$('#btnFolder').addEventListener('click', () => chrome.downloads.showDefaultFolder());
$('#btnRefresh').addEventListener('click', () => { view = 'list'; refreshActiveTab(); });
$('#btnLang').addEventListener('click', async () => {
  settings.lang = settings.lang === 'he' ? 'en' : 'he';
  await saveSettings();
  applyLang();
  render();
});
$('#btnClear').addEventListener('click', async () => {
  if (!activeTab) return;
  await chrome.runtime.sendMessage({ type: 'clear', tabId: activeTab.id });
  for (const [id, j] of jobs) if (!j.running) jobs.delete(id);
});
$('#btnClose').addEventListener('click', async () => {
  try {
    if (chrome.sidePanel.close) {
      const win = await chrome.windows.getCurrent();
      await chrome.sidePanel.close({ windowId: win.id });
      return;
    }
  } catch {}
  window.close();
});

$('#btnPro').addEventListener('click', () => {
  const btn = $('#btnPro');
  const orig = btn.textContent;
  btn.textContent = settings.lang === 'he' ? '⭐ בקרוב!' : '⭐ Coming soon!';
  btn.style.opacity = '1';
  setTimeout(() => { btn.textContent = orig; btn.style.opacity = ''; }, 2000);
});

/* ---------- live updates ---------- */

chrome.tabs.onActivated.addListener(() => { refreshActiveTab(); });
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (!activeTab || tabId !== activeTab.id) return;
  if (info.title || info.url) {
    activeTab = tab;
    $('#tabTitle').textContent = tab.title || tab.url;
    if (view === 'list') render();
  }
  if (info.status === 'complete') scanPage();
});
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'session' && activeTab && changes[`tab_${activeTab.id}`]) {
    await loadItems();
    if (view === 'list') render();
  }
});

// Remove temp files left by a panel that was closed mid-download.
async function cleanTemp() {
  try {
    const root = await navigator.storage.getDirectory();
    for await (const name of root.keys()) if (name.startsWith('job-')) await root.removeEntry(name).catch(() => {});
  } catch {}
}

(async () => {
  cleanTemp();
  await loadSettings();
  applyLang();
  await refreshActiveTab();
})();
