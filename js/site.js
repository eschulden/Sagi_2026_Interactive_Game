/*
 * Site navigation: header menu (only pages the group has opened so far, see VISITED_KEY),
 * QR scan button, footer, and the page cards on main.html.
 *
 * To add a new page:
 *   1. Copy page-template.html to a new file (e.g. photos.html)
 *   2. Add one line to PAGES below.
 * The menu and the main-page cards update automatically.
 */
const SITE_TITLE = 'בשביל שגיא';

const PAGES = [
  { file: 'main.html',          title: 'בית',                      icon: '🏠' },
  { file: 'about.html',         title: 'על המשחק',                 icon: 'ℹ️', desc: 'הסבר על בשביל שגיא וקודי ה-QR לאורך המסלול.' },
  { file: 'sagi.html',          title: 'על שגיא',                  icon: '🌿', desc: 'קצת על שגיא - מי הוא היה, מה אהב, ומה נזכור ממנו.' },
  { file: 'guess.html',         title: 'נחשו את המקום',            icon: '📍', desc: 'רמז על מקום בארץ - סמנו על המפה איפה הוא.' },
  { file: 'trail-markers.html', title: 'סימוני שבילים',            icon: '🥾', desc: 'חידון על סימוני שבילים וכללי הליכה בשטח.' },
  { file: 'photo-gallery.html', title: 'איפה צילמתי?',            icon: '📸', desc: 'מצאו את המקום המדויק שבו צולמה כל תמונה - ירוק כשאתם בדיוק שם, צהוב כשאתם קרובים.' },
  { file: 'color-hunt.html',    title: 'ציד צבעים',                icon: '🎨', desc: 'צלמו בשביל משהו בכל צבע - האתר בודק שהצבע באמת בתמונה.' },
  { file: 'know-place.html',    title: 'הכר את המקום',             icon: '🌳', desc: 'חידון על נחל השופט - המקום שבו אתם מטיילים עכשיו.' },
  { file: 'sagi-quiz.html',     title: 'כמה אתם מכירים את שגיא?', icon: '❓', desc: 'שאלות על שגיא - הוכיחו שאתם באמת מכירים אותו.' },
  { file: 'decisions.html',     title: 'ההחלטות הטובות',          icon: '🌱', desc: 'קחו החלטה טובה לעצמכם, וקראו את ההחלטות שמטיילים אחרים לקחו.' },
  { file: 'progress.html',     title: 'ההתקדמות שלכם',           icon: '📊', desc: 'השיאים שלכם בכל פעילות וההחלטות הטובות שלקחתם עד עכשיו.' },
  { file: 'summary.html',      title: 'סיכום המשחק',             icon: '🌅', desc: 'סוף המשחק - סיכום הפעילויות ומילות סיום.' },
  // { file: 'photos.html', title: 'תמונות', icon: '📷', desc: 'אלבום תמונות.' },
];

// Group name chosen on login.html; kept in this browser and shown by every page and game.
window.Group = (function () {
  const KEY = 'sagi2026:group';
  function get() { try { return JSON.parse(localStorage.getItem(KEY)) || ''; } catch (e) { return ''; } }
  function set(name) { try { localStorage.setItem(KEY, JSON.stringify(name)); } catch (e) {} }
  // Group name escaped for innerHTML
  function html() { return get().replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  // End-of-game title: "כל הכבוד, <group>!"
  function cheer() { return get() ? 'כל הכבוד, ' + html() + '!' : 'סיימתם!'; }
  return { get: get, set: set, html: html, cheer: cheer };
})();

// Pages that open without a group name (info pages, and the login page itself)
const NO_LOGIN = ['login.html', 'sagi.html', 'about.html', 'all.html'];

(function () {
  // No group yet: go to login first, then come back here. If storage is blocked the
  // name can't be kept anyway, so don't trap the visitor in a login loop.
  const page = location.pathname.split('/').pop() || 'index.html';
  let canStore = true;
  try { localStorage.setItem('sagi2026:probe', '1'); localStorage.removeItem('sagi2026:probe'); } catch (e) { canStore = false; }
  if (canStore && !Group.get() && NO_LOGIN.indexOf(page) === -1) {
    location.replace('login.html?next=' + encodeURIComponent(page + location.search + location.hash));
    return;
  }

  // Pages renamed since the game started: carry over what this browser already saved
  // (unlocked pages and the Sagi quiz score) under the new file names.
  const RENAMED = { 'memories.html': 'decisions.html', 'memory-add.html': 'decisions.html', 'quiz.html': 'sagi-quiz.html' };
  try {
    const v = JSON.parse(localStorage.getItem('sagi2026:visited'));
    if (Array.isArray(v) && v.some(f => RENAMED[f])) {
      const fixed = v.map(f => RENAMED[f] || f).filter((f, i, a) => a.indexOf(f) === i);
      localStorage.setItem('sagi2026:visited', JSON.stringify(fixed));
    }
    ['', ':best'].forEach(function (end) {
      const from = 'sagi2026:quiz:quiz.html' + end, to = 'sagi2026:quiz:sagi-quiz.html' + end;
      const old = localStorage.getItem(from);
      if (old !== null) {
        if (localStorage.getItem(to) === null) localStorage.setItem(to, old);
        localStorage.removeItem(from);
      }
    });
  } catch (e) {}

  const icon = document.createElement('link');
  icon.rel = 'icon'; icon.href = 'images/logo.webp';
  document.head.appendChild(icon);

  const current = location.pathname.split('/').pop() || 'main.html';

  // Pages become visible in the menu once visited (opened directly, from a QR code, or via
  // the scan button), and stay visible.
  // Opening summary.html (end of the game) makes all of them visible.
  // If storage is blocked, nothing can be remembered, so show everything.
  const VISITED_KEY = 'sagi2026:visited';
  let visited = null;
  try {
    visited = JSON.parse(localStorage.getItem(VISITED_KEY)) || [];
    const unlock = current === 'summary.html' ? PAGES.map(p => p.file) : PAGES.some(p => p.file === current) ? [current] : [];
    const fresh = unlock.filter(f => visited.indexOf(f) === -1);
    if (fresh.length) {
      visited = visited.concat(fresh);
      localStorage.setItem(VISITED_KEY, JSON.stringify(visited));
    }
  } catch (e) { visited = null; }
  const ALWAYS_VISIBLE = ['main.html', 'about.html', 'sagi.html', 'progress.html'];
  const visible = PAGES.filter(p => ALWAYS_VISIBLE.indexOf(p.file) !== -1 || visited === null || visited.indexOf(p.file) !== -1);

  // "Group: X" chip in the header; tapping it opens login.html to rename the group
  const group = Group.get();
  const groupChip = !group || current === 'login.html' ? '' : (function () {
    const a = document.createElement('a');
    a.className = 'group-chip';
    a.href = 'login.html?next=' + encodeURIComponent(current + location.search);
    a.title = 'שינוי שם הקבוצה';
    a.textContent = '👥 ' + group;
    return a.outerHTML;
  })();

  // "Scan QR" button in the header (see QrScan below); not on the group-name page
  const QR_BTN = current === 'login.html' ? '' : '<button class="qr-btn" id="qr-scan-btn" type="button" aria-label="סריקת קוד QR">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3M7 12h10"/></svg>' +
    '<span>סריקה</span></button>';

  const header = document.getElementById('site-header');
  if (header) {
    const navLinks = visible.map(p =>
      '<a href="' + p.file + '"' + (p.file === current ? ' class="active"' : '') + '>' + p.icon + ' ' + p.title + '</a>'
    ).join('');

    header.className = 'site-header';
    header.innerHTML =
      '<div class="inner">' +
        '<a class="site-title" href="main.html"><img src="images/logo.webp" alt="' + SITE_TITLE + '"></a>' +
        '<div class="header-actions">' + QR_BTN + groupChip +
          '<button class="hamburger" id="hamburger" aria-label="תפריט" aria-expanded="false">&#9776;</button>' +
        '</div>' +
      '</div>' +
      '<div class="nav-drawer" id="nav-drawer">' + navLinks + '</div>' +
      '<div class="nav-overlay" id="nav-overlay"></div>';

    const btn = document.getElementById('hamburger');
    const drawer = document.getElementById('nav-drawer');
    const overlay = document.getElementById('nav-overlay');
    function openDrawer() {
      drawer.classList.add('open');
      overlay.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      btn.innerHTML = '&#10005;';
    }
    function closeDrawer() {
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '&#9776;';
    }
    btn.addEventListener('click', function () {
      drawer.classList.contains('open') ? closeDrawer() : openDrawer();
    });
    overlay.addEventListener('click', closeDrawer);
    drawer.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeDrawer); });
    const qrBtn = document.getElementById('qr-scan-btn');
    if (qrBtn) qrBtn.addEventListener('click', function () { QrScan.open(); });
  }

  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.className = 'site-footer';
    // "על שגיא" button appears on every page
    const sagiBtn = current === 'sagi.html' ? '' :
      '<a href="sagi.html" class="sagi-footer-btn">🌿 על שגיא</a>';
    footer.innerHTML = sagiBtn + '<div class="footer-copy">' + SITE_TITLE + ' · 2026</div>';
  }

  // Page cards: only on main.html
  const grid = document.getElementById('page-cards');
  if (grid) {
    grid.innerHTML = visible.filter(p => p.file !== 'main.html').map(p =>
      '<a class="page-card" href="' + p.file + '"><div class="icon">' + p.icon + '</div><h3>' + p.title +
      '</h3><p>' + (p.desc || '') + '</p></a>'
    ).join('');
  }
})();

/*
 * QR scanner opened from the header button. A scanned link to one of this site's pages
 * (on this server, or on the published GitHub Pages site) unlocks that page and opens it.
 * Uses the browser's BarcodeDetector where there is one (Android Chrome), otherwise
 * jsQR (iPhone Safari), loaded only the first time the scanner opens.
 */
window.QrScan = (function () {
  const JSQR_URL = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
  const PUBLISHED_BASE = 'https://eschulden.github.io/sagi_2026_interactive_game/';
  const VISITED_KEY = 'sagi2026:visited';
  let box, video, status, stream, timer, detect, lastBad = '';

  // { file, url } if text is a link to one of the game's pages, else null
  function gamePage(text) {
    let u;
    try { u = new URL(String(text).trim(), location.href); } catch (e) { return null; }
    const here = (location.origin + location.pathname.replace(/[^/]*$/, '')).toLowerCase();
    const dir = (u.origin + u.pathname.replace(/[^/]*$/, '')).toLowerCase();
    if (dir !== here && dir !== PUBLISHED_BASE) return null;
    const file = u.pathname.split('/').pop() || 'main.html';
    if (!PAGES.some(p => p.file === file)) return null;
    return { file: file, url: file + u.search + u.hash };
  }

  function unlock(file) {
    try {
      const v = JSON.parse(localStorage.getItem(VISITED_KEY)) || [];
      if (v.indexOf(file) === -1) { v.push(file); localStorage.setItem(VISITED_KEY, JSON.stringify(v)); }
    } catch (e) {}
  }

  function say(msg, cls) { status.textContent = msg; status.className = 'qr-status' + (cls ? ' ' + cls : ''); }

  function found(text) {
    const page = gamePage(text);
    if (!page) {
      if (text !== lastBad) { lastBad = text; say('הקוד הזה לא שייך למשחק - נסו קוד אחר', 'bad'); }
      return;
    }
    const info = PAGES.find(p => p.file === page.file);
    say('נפתח! ' + info.icon + ' ' + info.title, 'good');
    unlock(page.file);
    stop();
    setTimeout(function () { location.href = page.url; }, 600);
  }

  function loadJsQR() {
    if (window.jsQR) return Promise.resolve();
    return new Promise(function (ok, fail) {
      const s = document.createElement('script');
      s.src = JSQR_URL; s.onload = ok; s.onerror = fail;
      document.head.appendChild(s);
    });
  }

  // Returns an async function that reads one video frame and resolves to the QR text or null
  async function makeDetector() {
    if ('BarcodeDetector' in window) {
      try {
        const formats = await BarcodeDetector.getSupportedFormats();
        if (formats.indexOf('qr_code') !== -1) {
          const d = new BarcodeDetector({ formats: ['qr_code'] });
          return async function () { const r = await d.detect(video); return r.length ? r[0].rawValue : null; };
        }
      } catch (e) {}
    }
    await loadJsQR();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    return async function () {
      const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const r = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
      return r ? r.data : null;
    };
  }

  function build() {
    box = document.createElement('div');
    box.className = 'qr-scan';
    box.innerHTML =
      '<div class="qr-panel" role="dialog" aria-modal="true" aria-label="סריקת קוד QR">' +
        '<button class="qr-close" type="button" aria-label="סגירה">&#10005;</button>' +
        '<h2>סריקת קוד QR</h2>' +
        '<div class="qr-view"><video playsinline muted></video><div class="qr-frame"></div></div>' +
        '<p class="qr-status"></p>' +
      '</div>';
    document.body.appendChild(box);
    video = box.querySelector('video');
    status = box.querySelector('.qr-status');
    box.querySelector('.qr-close').addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box.classList.contains('open')) close(); });
  }

  async function open() {
    if (!box) build();
    box.classList.add('open');
    lastBad = '';
    say('כוונו את המצלמה אל קוד ה-QR');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      say('הדפדפן הזה לא מאפשר שימוש במצלמה. אפשר לסרוק עם אפליקציית המצלמה של הטלפון.', 'bad');
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    } catch (e) {
      say('אין גישה למצלמה. אשרו גישה למצלמה בהגדרות הדפדפן ונסו שוב.', 'bad');
      return;
    }
    if (!box.classList.contains('open')) { stop(); return; } // closed while asking for permission
    video.srcObject = stream;
    try { await video.play(); } catch (e) {}
    try { detect = detect || await makeDetector(); } catch (e) {
      say('לא הצלחנו לטעון את הסורק. בדקו את החיבור לאינטרנט ונסו שוב.', 'bad');
      return;
    }
    let busy = false;
    timer = setInterval(async function () {
      if (busy || !stream || video.readyState < 2) return;
      busy = true;
      try { const text = await detect(); if (text && stream) found(text); } catch (e) {}
      busy = false;
    }, 200);
  }

  function stop() {
    clearInterval(timer); timer = null;
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (video) video.srcObject = null;
  }

  function close() { stop(); box.classList.remove('open'); }

  return { open: open, close: close, gamePage: gamePage };
})();
