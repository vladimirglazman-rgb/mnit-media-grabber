const LOGO = 'icons/logo256.png';
const label = (text, pos = 'below r') => `<span class="pin-label ${pos}">${text}</span>`;

const bar = (url, extra = '') => `
  <div class="m-bar">
    <span class="m-ico">←</span><span class="m-ico">↻</span>
    <div class="m-url">${url}</div>
    ${extra}
  </div>`;

const MOCK = {
  download: () => `
    <div class="mock">${bar('MNIT Media Grabber — הורדה', `<span class="m-ico target">⬇${label('ההורדות שלך', 'below r')}</span>`)}
      <div class="m-body" style="padding-top:44px">
        <div class="m-card"><span style="font-size:26px">🗜️</span><div class="grow"><b>media-grabber.zip</b><div class="m-muted">200 KB · הושלם</div></div></div>
      </div></div>`,

  extract: () => `
    <div class="mock">
      <div class="m-bar"><b style="padding:2px 6px">📁 Downloads</b></div>
      <div class="m-body" style="min-height:190px">
        <div class="m-file sel">🗜️ media-grabber.zip</div>
        <div class="m-menu" style="left:150px; top:30px">
          <div>Open</div>
          <div class="target">Extract All...${label('לחץ כאן', 'left')}</div>
          <div class="sep"></div><div>Copy</div><div>Delete</div>
        </div>
      </div></div>`,

  location: () => `
    <div class="mock">
      <div class="m-bar"><b style="padding:2px 6px">📁 Documents › media-grabber</b></div>
      <div class="m-body">
        <div class="m-file">📁 icons</div>
        <div class="m-file">📁 lib</div>
        <div class="m-file">📄 background.js</div>
        <div class="m-file">📘 guide.html</div>
        <div class="m-file target">📄 manifest.json${label('הקובץ הזה חייב להיות כאן', 'inside')}</div>
        <div class="m-file">📄 sidepanel.html</div>
      </div></div>`,

  extPage: () => `
    <div class="mock">${bar('<span class="target" style="padding:0 4px">chrome://extensions' + label('הקלד כאן', 'below l') + '</span>')}
      <div class="m-body" style="padding-top:40px">
        <div class="m-row"><span class="m-title">🧩 Extensions</span><span class="m-muted">Developer mode <span class="m-toggle"></span></span></div>
        <div class="m-card"><div class="m-muted">All Extensions…</div></div>
      </div></div>`,

  devMode: () => `
    <div class="mock">${bar('chrome://extensions')}
      <div class="m-body">
        <div class="m-row"><span class="m-title">🧩 Extensions</span>
          <span class="m-muted target" style="padding:2px 4px">Developer mode <span class="m-toggle on"></span>${label('הדלק את המתג', 'below r')}</span></div>
        <div style="height:40px"></div>
        <div class="m-row" style="justify-content:flex-start"><span class="m-btn">Load unpacked</span><span class="m-btn">Pack extension</span><span class="m-btn">Update</span></div>
      </div></div>`,

  loadUnpacked: () => `
    <div class="mock">${bar('chrome://extensions')}
      <div class="m-body">
        <div class="m-row"><span class="m-title">🧩 Extensions</span><span class="m-muted">Developer mode <span class="m-toggle on"></span></span></div>
        <div class="m-row" style="justify-content:flex-start"><span class="m-btn target">Load unpacked${label('לחץ כאן', 'below l')}</span><span class="m-btn">Pack extension</span></div>
        <div style="height:40px"></div>
      </div></div>`,

  selectFolder: () => `
    <div class="mock"><div class="m-body">
      <div class="m-dialog">
        <div class="head">Select the extension directory</div>
        <div style="padding:8px">
          <div class="m-file sel">📁 media-grabber</div>
          <div class="m-file">📁 Desktop</div>
          <div class="m-file">📁 Music</div>
        </div>
        <div class="foot"><span class="m-btn target" style="border-radius:4px">Select Folder${label('בחר את התיקייה ולחץ כאן', 'above r')}</span><span class="m-btn" style="border-radius:4px">Cancel</span></div>
      </div></div></div>`,

  installed: () => `
    <div class="mock">${bar('chrome://extensions')}
      <div class="m-body">
        <div class="m-card target"><img src="${LOGO}" alt=""><div class="grow"><b>MNIT Media Grabber</b> <span class="m-muted">1.x</span>
          <div class="m-muted">Personal tool: detects video/audio…</div></div><span class="m-toggle on"></span>
          ${label('התוסף מותקן ✓', 'below r')}</div>
        <div style="height:40px"></div>
      </div></div>`,

  pin: () => `
    <div class="mock">${bar('…', `<span class="m-ico target">🧩${label('1. לחץ על הפאזל', 'below r')}</span>`)}
      <div class="m-body" style="min-height:250px">
        <div class="m-menu" style="right:8px; top:52px; min-width:240px; padding-bottom:40px">
          <div class="m-muted" style="padding-bottom:4px">Extensions</div>
          <div style="display:flex;align-items:center;gap:8px"><img src="${LOGO}" alt="" style="width:18px;height:18px;border-radius:3px">MNIT Media Grabber
            <span class="target" style="margin-left:auto;padding:0 4px">📌${label('2. לחץ על הסיכה', 'below r')}</span></div>
          <div>Adobe Acrobat</div><div>Bitwarden</div>
        </div>
      </div></div>`,

  play: () => `
    <div class="mock">${bar('www.example.com/video')}
      <div class="m-body">
        <div class="m-video"><span class="target" style="padding:0 10px; border-radius:50%">▶${label('הפעל את הסרטון', 'below l')}</span></div>
        <div style="height:30px"></div>
      </div></div>`,

  panel: () => `
    <div class="mock">${bar('www.example.com/video', `<span class="m-ico target"><img src="${LOGO}" alt="">${label('1. פתח את הפאנל', 'below r')}</span>`)}
      <div class="m-body" style="display:grid;grid-template-columns:1fr 1.3fr;gap:0;padding:0;min-height:210px">
        <div style="padding:10px"><div class="m-video" style="height:80px;font-size:22px">▶</div></div>
        <div class="m-panel" style="padding-top:44px">
          <div class="m-item"><b>הסרטון שלי</b><div class="m-muted">MP4 · 245 MB</div>
            <div class="m-btn solid target" style="display:block;margin-top:8px">הורדה${label('2. לחץ הורדה', 'below r')}</div></div>
        </div>
      </div></div>`,

  folder: () => `
    <div class="mock">
      <div class="m-panel" style="border:0;border-radius:10px">
        <div class="m-item"><b>הסרטון שלי</b><div class="m-muted" style="color:#15803d">הושלם ✓</div></div>
        <div style="height:36px"></div>
        <div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
          <span class="m-ico">⚙️</span><span class="m-ico">🕘</span><span class="m-ico target">📁${label('פותח את תיקיית ההורדות', 'above r')}</span><span class="m-ico">🗑️</span><span class="m-ico">?</span>
        </div>
      </div></div>`,

  update: () => `
    <div class="mock">${bar('chrome://extensions')}
      <div class="m-body">
        <div class="m-card"><img src="${LOGO}" alt=""><div class="grow"><b>MNIT Media Grabber</b><div class="m-muted">Details · Remove</div></div>
          <span class="target" style="font-size:18px;padding:0 4px">↻${label('לחץ ↻ אחרי החלפת הקבצים', 'below r')}</span><span class="m-toggle on"></span></div>
        <div style="height:46px"></div>
      </div></div>`,

  help: () => `
    <div class="mock"><div class="m-panel" style="border:0;border-radius:10px;text-align:center;padding:24px 10px">
      <img src="${LOGO}" alt="" style="width:64px;height:64px;border-radius:12px">
      <div style="margin:8px 0 2px">ממתין למדיה...</div>
      <div class="m-muted">הפעל את הסרטון בדף, והוא יופיע כאן.</div>
      <div style="height:20px"></div>
      <div style="display:flex;justify-content:center"><span class="m-btn target" style="border-radius:6px">אין וידאו?${label('טיפים כשלא מופיע כלום', 'above l')}</span></div>
    </div></div>`,
};

const copyBtn = (text) => `<button class="copy" data-copy="${text}">העתק</button>`;

const STEPS = [
  { s: 'install', title: 'מורידים את קובץ התוסף', mock: 'download', body: `
      <ol><li>הורד את הקובץ <code>media-grabber.zip</code> שקיבלת.</li>
      <li>הוא יישמר בתיקיית <b>Downloads</b> (הורדות) במחשב.</li></ol>
      <div class="tip">צריך מחשב עם Chrome או Edge. בטלפון התוסף לא עובד.</div>` },
  { s: 'install', title: 'מחלצים את הקובץ', mock: 'extract', body: `
      <ol><li>פתח את תיקיית <b>Downloads</b>.</li>
      <li>לחץ <b>קליק ימני</b> על <code>media-grabber.zip</code>.</li>
      <li>בחר <b>Extract All...</b> (חלץ הכל).</li></ol>` },
  { s: 'install', title: 'שומרים במקום קבוע', mock: 'location', body: `
      <ol><li>שמור את התיקייה במקום שלא תמחק, למשל <b>Documents</b> (מסמכים).</li>
      <li>היכנס לתיקייה ובדוק שרואים בה את הקובץ <code>manifest.json</code>.</li></ol>
      <div class="warn">אל תשמור על דיסק נשלף (Disk on Key / דיסק חיצוני). אם תנתק אותו — התוסף יפסיק לעבוד.</div>` },
  { s: 'install', title: 'פותחים את דף התוספים', mock: 'extPage', body: `
      <ol><li>פתח את Chrome.</li>
      <li>בשורת הכתובת הקלד: <code>chrome://extensions</code> ${copyBtn('chrome://extensions')}</li>
      <li>לחץ <b>Enter</b>.</li></ol>
      <div class="tip">ב-Edge הכתובת היא <code>edge://extensions</code> ${copyBtn('edge://extensions')}</div>` },
  { s: 'install', title: 'מדליקים "מצב מפתח"', mock: 'devMode', body: `
      <ol><li>למעלה בצד ימין יש מתג <b>Developer mode</b>.</li>
      <li>לחץ עליו כך שיהיה <b>כחול</b> (דולק).</li></ol>
      <div class="tip">אם הוא כבר כחול — מצוין, עבור לשלב הבא.</div>` },
  { s: 'install', title: 'טוענים את התוסף', mock: 'loadUnpacked', body: `
      <ol><li>למעלה משמאל הופיע כפתור <b>Load unpacked</b>.</li>
      <li>לחץ עליו.</li></ol>` },
  { s: 'install', title: 'בוחרים את התיקייה', mock: 'selectFolder', body: `
      <ol><li>בחלון שנפתח, נווט לתיקייה ששמרת בשלב 3.</li>
      <li>סמן את התיקייה <code>media-grabber</code> (זו שבתוכה <code>manifest.json</code>).</li>
      <li>לחץ <b>Select Folder</b>.</li></ol>` },
  { s: 'install', title: 'בודקים שהתוסף מותקן', mock: 'installed', body: `
      <p>ברשימת התוספים הופיע כרטיס בשם <b>MNIT Media Grabber</b> עם מתג כחול.</p>
      <div class="done-check">✓ ההתקנה הושלמה.</div>
      <div class="tip">מופיעה שגיאה אדומה? כנראה בחרת תיקייה לא נכונה. לחץ Remove וחזור לשלב 7.</div>` },
  { s: 'install', title: 'מצמידים את האייקון לסרגל', mock: 'pin', body: `
      <ol><li>למעלה מימין לשורת הכתובת לחץ על <b>חתיכת הפאזל</b> 🧩.</li>
      <li>ליד <b>MNIT Media Grabber</b> לחץ על <b>הסיכה</b> 📌.</li></ol>
      <p>עכשיו הלוגו (הקובייה הכחולה) תמיד בסרגל.</p>` },
  { s: 'use', title: 'פותחים סרטון ומפעילים אותו', mock: 'play', body: `
      <ol><li>היכנס לאתר עם הסרטון.</li>
      <li>לחץ <b>Play</b> (▶). הכלי מזהה סרטון רק אחרי שהוא מתחיל להיטען.</li></ol>` },
  { s: 'use', title: 'מורידים', mock: 'panel', body: `
      <ol><li>לחץ על הלוגו בסרגל — נפתח פאנל בצד.</li>
      <li>הסרטון מופיע ברשימה. אם יש בחירת איכות — הכי גבוהה כבר מסומנת.</li>
      <li>לחץ <b>הורדה</b>.</li></ol>
      <div class="warn">בסטרים (סרט ארוך שמגיע בחלקים) — השאר את הפאנל פתוח עד שכתוב "הושלם ✓".</div>` },
  { s: 'use', title: 'איפה הקובץ?', mock: 'folder', body: `
      <ol><li>בפאנל למטה לחץ על <b>התיקייה</b> 📁.</li>
      <li>הקבצים נמצאים בתוך <b>Downloads › Media Grabber</b>.</li></ol>
      <div class="tip">קובץ שמסתיים ב-<code>.ts</code> נפתח הכי טוב ב-<b>VLC</b> (נגן חינמי).</div>` },
  { s: 'update', title: 'מעדכנים לגרסה חדשה', mock: 'update', body: `
      <ol><li>חלץ את ה-zip החדש <b>לאותה תיקייה</b> ובחר <b>Replace</b> (החלף).</li>
      <li>ב-<code>chrome://extensions</code> לחץ <b>↻</b> בכרטיס של התוסף.</li>
      <li>בפאנל למעלה תראה את מספר הגרסה החדש.</li></ol>
      <div class="warn">לא ללחוץ Remove! הסרה והתקנה מחדש מוחקות את ההגדרות ואת הנעיצה בסרגל.</div>` },
  { s: 'help', title: 'לא מופיע סרטון?', mock: 'help', body: `
      <ol><li>ודא שהסרטון <b>מתנגן</b>.</li>
      <li>לחץ ↻ (סריקה) למעלה בפאנל.</li>
      <li>רענן את הדף (<span class="kbd">F5</span>) והפעל שוב.</li>
      <li>בהגדרות ⚙️ — הקטן את "להסתיר קבצים קטנים מ-".</li></ol>
      <div class="warn"><b>לא יעבוד:</b> YouTube, Netflix, Disney+, Spotify ואתרים עם הגנת העתקה (DRM). זו מגבלה, לא תקלה.</div>
      <div class="done-check">זהו — סיימת את המדריך ✓</div>` },
];

const SECTIONS = { install: 'התקנה', use: 'שימוש', update: 'עדכון', help: 'עזרה' };
let idx = 0;

function go(i) {
  idx = Math.max(0, Math.min(STEPS.length - 1, i));
  const st = STEPS[idx];
  document.getElementById('text').innerHTML = `<div class="num">${idx + 1}</div><h2>${st.title}</h2>${st.body}`;
  document.getElementById('visual').innerHTML = MOCK[st.mock]();
  document.getElementById('stepOf').textContent = `שלב ${idx + 1} מתוך ${STEPS.length}`;
  document.getElementById('sectionName').textContent = SECTIONS[st.s];
  document.getElementById('bar').style.width = `${((idx + 1) / STEPS.length) * 100}%`;
  document.getElementById('prev').disabled = idx === 0;
  const next = document.getElementById('next');
  next.textContent = idx === STEPS.length - 1 ? 'חזרה להתחלה ↺' : 'הבא ←';
  document.getElementById('nextHint').innerHTML = idx < STEPS.length - 1
    ? `הבא: <b>${STEPS[idx + 1].title}</b>` : '';
  document.querySelectorAll('#sections button').forEach((b) => b.classList.toggle('on', b.dataset.s === st.s));
  if (location.hash !== '#' + (idx + 1)) history.replaceState(null, '', '#' + (idx + 1));
  document.getElementById('step').scrollIntoView({ block: 'nearest' });
}

const nav = document.getElementById('sections');
for (const [key, name] of Object.entries(SECTIONS)) {
  const b = document.createElement('button');
  b.textContent = name;
  b.dataset.s = key;
  b.onclick = () => go(STEPS.findIndex((x) => x.s === key));
  nav.append(b);
}
document.getElementById('prev').onclick = () => go(idx - 1);
document.getElementById('next').onclick = () => go(idx === STEPS.length - 1 ? 0 : idx + 1);
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') go(idx + 1);   // RTL: left = forward
  if (e.key === 'ArrowRight') go(idx - 1);
});
document.addEventListener('click', async (e) => {
  const c = e.target.closest('[data-copy]');
  if (!c) return;
  try { await navigator.clipboard.writeText(c.dataset.copy); c.textContent = 'הועתק ✓'; }
  catch { c.textContent = 'סמן והעתק ידנית'; }
  setTimeout(() => { c.textContent = 'העתק'; }, 1500);
});
window.addEventListener('hashchange', () => go((parseInt(location.hash.slice(1), 10) || 1) - 1));
go((parseInt(location.hash.slice(1), 10) || 1) - 1);
