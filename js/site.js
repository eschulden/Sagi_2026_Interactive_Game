/*
 * Site navigation.
 *
 * TWO MODES:
 *   Hub mode (default): full navigation shown on all pages.
 *   QR / standalone mode: no nav, for QR codes placed on the trail.
 *     Append ?hidden to any URL to suppress the nav (e.g. game.html?hidden).
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
  { file: 'game.html',          title: 'מסע בישראל',               icon: '🗺️', desc: 'משחק מסע בין אתרים בארץ - נסו להגיע לכל התחנות.' },
  { file: 'guess.html',         title: 'נחשו את המקום',            icon: '📍', desc: 'רמז על מקום בארץ - סמנו על המפה איפה הוא.' },
  { file: 'trail-markers.html', title: 'סימוני שבילים',            icon: '🥾', desc: 'חידון על סימוני שבילים וכללי הליכה בשטח.' },
  { file: 'photo-gallery.html', title: 'כל התמונות',              icon: '🖼️', desc: 'כל התמונות של "איפה צילמתי?" - ירוק למה שמצאתם, אדום למה שוויתרתם.' },
  { file: 'know-place.html',    title: 'הכר את המקום',             icon: '🌳', desc: 'חידון על נחל השופט - המקום שבו אתם מטיילים עכשיו.' },
  { file: 'quiz.html',         title: 'כמה אתם מכירים את שגיא?', icon: '❓', desc: 'שאלות על שגיא - הוכיחו שאתם באמת מכירים אותו.' },
  { file: 'memory-add.html',    title: 'קחו החלטה טובה',           icon: '✍️', desc: 'כתבו החלטה טובה שאתם לוקחים לעצמכם, והיא תישמר.' },
  { file: 'memories.html',      title: 'ההחלטות הטובות',          icon: '🌱', desc: 'כל ההחלטות הטובות שמטיילים לקחו לעצמם.' },
  { file: 'summary.html',      title: 'סיכום המשחק',             icon: '🌅', desc: 'סוף המשחק - סיכום הפעילויות ומילות סיום.' },
  // { file: 'photos.html', title: 'תמונות', icon: '📷', desc: 'אלבום תמונות.' },
];

(function () {
  const icon = document.createElement('link');
  icon.rel = 'icon'; icon.href = 'images/logo.webp';
  document.head.appendChild(icon);

  // Hub mode: nav is shown by default; pass ?hidden to suppress it (for QR codes on trail)
  const current = location.pathname.split('/').pop() || 'main.html';
  const hubMode = location.search.indexOf('hidden') === -1
                  && (typeof window.SHOW_NAV === 'undefined' || window.SHOW_NAV !== false);

  // Pages become visible in the menu once visited (any mode, incl. ?hidden), and stay visible.
  // If storage is blocked, nothing can be remembered, so show everything.
  const VISITED_KEY = 'sagi2026:visited';
  let visited = null;
  try {
    visited = JSON.parse(localStorage.getItem(VISITED_KEY)) || [];
    if (PAGES.some(p => p.file === current) && visited.indexOf(current) === -1) {
      visited.push(current);
      localStorage.setItem(VISITED_KEY, JSON.stringify(visited));
    }
  } catch (e) { visited = null; }
  const ALWAYS_VISIBLE = ['main.html', 'sagi.html'];
  const visible = PAGES.filter(p => ALWAYS_VISIBLE.indexOf(p.file) !== -1 || visited === null || visited.indexOf(p.file) !== -1);

  // Links stay bare — nav is on by default, no need to propagate a param
  const href = f => f;

  const header = document.getElementById('site-header');
  if (header) {
    if (hubMode) {
      const navLinks = visible.map(p =>
        '<a href="' + href(p.file) + '"' + (p.file === current ? ' class="active"' : '') + '>' + p.icon + ' ' + p.title + '</a>'
      ).join('');

      header.className = 'site-header';
      header.innerHTML =
        '<div class="inner">' +
          '<a class="site-title" href="main.html"><img src="images/logo.webp" alt="' + SITE_TITLE + '"></a>' +
          '<nav class="site-nav" id="site-nav">' + navLinks + '</nav>' +
          '<button class="hamburger" id="hamburger" aria-label="תפריט" aria-expanded="false">&#9776;</button>' +
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
    } else {
      // QR / standalone mode: show only the logo, no links
      header.className = 'site-header site-header--standalone';
      header.innerHTML =
        '<div class="inner"><span class="site-title"><img src="images/logo.webp" alt="' + SITE_TITLE + '"></span></div>';
    }
  }

  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.className = 'site-footer';
    // "על שגיא" button appears on every page in every mode
    const sagiHref = hubMode ? 'sagi.html' : 'sagi.html?hidden';
    const sagiBtn = current === 'sagi.html' ? '' :
      '<a href="' + sagiHref + '" class="sagi-footer-btn">🌿 על שגיא</a>';
    footer.innerHTML = sagiBtn + '<div class="footer-copy">' + SITE_TITLE + ' · 2026</div>';
  }

  // Page cards: only on main.html (hub mode)
  const grid = document.getElementById('page-cards');
  if (grid) {
    grid.innerHTML = visible.filter(p => p.file !== 'main.html').map(p =>
      '<a class="page-card" href="' + href(p.file) + '"><div class="icon">' + p.icon + '</div><h3>' + p.title +
      '</h3><p>' + (p.desc || '') + '</p></a>'
    ).join('');
  }
})();
