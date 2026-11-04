// "ציד צבעים": photograph something of each color. Photos are checked in the browser.
// A photo counts when the color covers THRESHOLD% of it, or forms one vivid patch of ACCENT_MIN%.
// Accepted photos are also sent to Google Drive through C.UPLOAD_URL (apps-script/color-hunt), and each
// color's page shows the other groups' photos from there. With no UPLOAD_URL the game stays on the phone.
// The grid is the default view; #<color> opens one color, so the phone's back button works.
(function () {
  const C = window.COLOR_HUNT;
  const root = document.getElementById('color-hunt');
  // Other groups' photos sit under the card, outside root, so re-drawing the card doesn't reload them
  const others = document.createElement('section');
  others.id = 'color-others';
  root.after(others);

  // Photos are shrunk so the longest side is SAMPLE px: fast on a phone, and it averages away specks
  const SAMPLE = 160;
  // Only pixels at least this colorful and bright can form an accent patch
  const VIVID_S = 0.45, VIVID_V = 0.3;
  // Longest side of a saved photo; small enough to keep several photos per color in localStorage
  const THUMB = 360;
  // Photos kept per color; together with THUMB this stays well under the browser's ~5MB storage
  const MAX_PHOTOS = 8;
  // Longest side of the copy sent to Drive. Only kept in memory: a photo that couldn't be sent
  // right away (no signal) is sent later from its THUMB-size saved copy.
  const UPLOAD = 1280;
  // Other groups' photos per page
  const PAGE = 12;

  const NAMES = { red: 'אדום', orange: 'כתום', yellow: 'צהוב', green: 'ירוק', cyan: 'תכלת', blue: 'כחול',
    purple: 'סגול', pink: 'ורוד', brown: 'חום', white: 'לבן', gray: 'אפור', black: 'שחור' };
  const SWATCH = { red: '#d93a2b', orange: '#f08a24', yellow: '#f2cf1d', green: '#3f9a3c', cyan: '#2bb5c9', blue: '#2f63c8',
    purple: '#7b3fb0', pink: '#e86aa6', brown: '#8a5a2b', white: '#ffffff', gray: '#9a9a9a', black: '#222222' };
  // A white sign or a dark doorway isn't "a flash of color", so these only count by share
  const NO_ACCENT = ['white', 'gray', 'black', 'brown'];
  const KEYS = Object.keys(NAMES);

  function esc(t) { return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function pct(p) { return (p < 10 ? +p.toFixed(1) : Math.round(p)) + '%'; }

  function randomId() {
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return Array.from(a, x => x.toString(16).padStart(2, '0')).join('');
  }
  function newPhoto(src) { return { src: src, id: randomId(), token: randomId() }; }

  // This phone, so the Drive list can leave out its own photos
  const device = Store.get('colorhunt:device') || randomId();
  Store.set('colorhunt:device', device);

  // Found colors, keyed by color: { share, photos }, photos oldest first. Each photo is
  // { src: small JPEG data URL, id, token: its delete key in Drive, fileId: set once it is in Drive }.
  // Older saves held a single { photo } or plain data URLs, so those are read as new, not-yet-sent photos.
  // colorhunt:best holds the current total, for summary.html: 10 per color, however many photos.
  function results() {
    const r = Store.get('colorhunt:results') || {};
    let changed = false;
    Object.keys(r).forEach(function (k) {
      if (!r[k].photos) { r[k] = { share: r[k].share, photos: r[k].photo ? [r[k].photo] : [] }; changed = true; }
      r[k].photos = r[k].photos.map(function (p) {
        if (typeof p !== 'string') return p;
        changed = true;
        return newPhoto(p);
      });
      if (!r[k].photos.length) delete r[k];
    });
    // Ids are random, so they must be saved the first time, or every read would make new ones
    if (changed) Store.set('colorhunt:results', r);
    return r;
  }
  // Returns false if the phone's storage is full, in which case nothing changes
  function saveResults(r) {
    if (!Store.set('colorhunt:results', r)) return false;
    Store.set('colorhunt:best', Object.keys(r).length * 10);
    return true;
  }
  function addPhotos(color, share, photos) {
    const r = results(), old = r[color];
    r[color] = { share: Math.round(Math.max(share, old ? old.share : 0)), photos: (old ? old.photos : []).concat(photos) };
    return saveResults(r);
  }
  // Removing a color's last photo makes it not found again, and its 10 points go.
  // A photo already in Drive is queued for deletion there too.
  function removePhoto(color, n) {
    const r = results();
    if (!r[color] || !r[color].photos[n]) return;
    const p = r[color].photos.splice(n, 1)[0];
    if (!r[color].photos.length) delete r[color];
    saveResults(r);
    if (p.fileId) queueDelete(p.fileId, p.token);
    sync();
  }

  // ---- Google Drive (see apps-script/color-hunt/Code.gs) ----

  // Drive photos waiting to be deleted: [{ fileId, token }]; kept so a delete with no signal happens later
  function queueDelete(fileId, token) {
    Store.set('colorhunt:deletes', (Store.get('colorhunt:deletes') || []).concat([{ fileId: fileId, token: token }]));
  }

  // Full-size copies of this visit's new photos, by photo id
  const big = {};
  // Photos Drive refused this visit (not a network problem); tried again on the next visit
  const refused = {};

  // A plain-text body needs no CORS preflight, which Apps Script can't answer.
  // Rejects with .offline for network trouble, so the queue just waits for the next try.
  function post(body) {
    return fetch(C.UPLOAD_URL, { method: 'POST', body: JSON.stringify(body) })
      .then(r => r.json(), function (e) { e.offline = true; throw e; })
      .then(function (j) { if (j.status !== 'ok') throw new Error(j.error); return j; });
  }

  // Sends queued deletes, then every photo not yet in Drive, one at a time. Runs on load, when the
  // signal comes back, and after each change; a second call while one is running waits for it.
  let syncing = null, again = false;
  function sync() {
    if (!C.UPLOAD_URL) return;
    if (syncing) { again = true; return; }
    syncing = (async function () {
      for (const d of Store.get('colorhunt:deletes') || []) {
        try { await post({ action: 'delete', fileId: d.fileId, token: d.token }); }
        catch (e) { if (e.offline) return; }
        // Done, or refused for good: either way it leaves the queue
        Store.set('colorhunt:deletes', (Store.get('colorhunt:deletes') || []).filter(x => x.fileId !== d.fileId));
      }
      const r = results();
      for (const color of Object.keys(r)) {
        for (const p of r[color].photos) {
          if (p.fileId || refused[p.id]) continue;
          let res;
          try {
            res = await post({ action: 'upload', color: color, group: Group.get() || 'ללא שם', device: device,
              id: p.id, token: p.token, image: big[p.id] || p.src });
          } catch (e) {
            if (e.offline) return;
            refused[p.id] = true;
            continue;
          }
          delete big[p.id];
          // Saved again from a fresh read: the photo may have been deleted while it was being sent
          const now = results(), mine = now[color] && now[color].photos.filter(x => x.id === p.id)[0];
          if (mine) { mine.fileId = res.fileId; saveResults(now); markSent(p.id); }
          else { queueDelete(res.fileId, p.token); again = true; }
        }
      }
    })().finally(function () {
      syncing = null;
      if (again) { again = false; sync(); }
    });
  }
  window.addEventListener('online', sync);

  // Clears the "waiting to upload" mark on a photo if it is on screen
  function markSent(id) {
    const el = root.querySelector('[data-photo="' + id + '"] .photo-pending');
    if (el) el.remove();
  }

  // GET as JSONP (a <script> tag), like the decisions page, so reading needs no CORS either
  let jsonpN = 0;
  function jsonp(params) {
    return new Promise(function (resolve, reject) {
      const name = '__colorHunt' + (++jsonpN), s = document.createElement('script');
      const done = function (f, v) { clearTimeout(t); window[name] = function () {}; s.remove(); f(v); };
      const t = setTimeout(() => done(reject, new Error('timeout')), 15000);
      window[name] = j => j && j.status === 'ok' ? done(resolve, j) : done(reject, new Error(j && j.error));
      s.onerror = () => done(reject, new Error('load'));
      params.callback = name;
      s.src = C.UPLOAD_URL + '?' + new URLSearchParams(params);
      document.head.appendChild(s);
    });
  }

  function driveImage(id, width) { return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + width; }

  // Other groups' photos of one color, newest first. "Load more" asks for photos older than the last
  // one shown, so photos uploaded meanwhile don't push the same photos onto the next page.
  let shown = null;  // { color, before, items }
  function loadOthers(color, more) {
    if (!C.UPLOAD_URL) return;
    if (!more) shown = { color: color, before: '', items: [] };
    const state = shown, name = NAMES[color];
    const draw = function (footer) {
      others.innerHTML = '<div class="card"><h2>📸 מה צילמו הקבוצות האחרות</h2>' +
        (state.items.length ? '<div class="color-gallery">' + state.items.map(p =>
          '<figure><img src="' + driveImage(p.id, 400) + '" alt="תמונה של ' + esc(p.group) + '" loading="lazy" data-full="' +
          driveImage(p.id, 1600) + '"><figcaption><strong>' + esc(p.group) + '</strong><br>' +
          new Date(p.time).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) +
          '</figcaption></figure>').join('') + '</div>' : '') + footer + '</div>';
      others.querySelectorAll('[data-full]').forEach(function (img) {
        img.onclick = () => view(img.dataset.full);
        img.onerror = () => img.parentNode.remove();  // e.g. removed by hand in Drive
      });
      const btn = others.querySelector('#more-others');
      if (btn) btn.onclick = () => loadOthers(color, btn.dataset.more === '1');
    };
    draw('<p class="photo-count">טוענים תמונות...</p>');
    jsonp({ color: color, size: PAGE, device: device, before: state.before }).then(function (j) {
      if (shown !== state) return;  // left this color meanwhile
      state.items = state.items.concat(j.photos);
      if (j.photos.length) state.before = j.photos[j.photos.length - 1].time;
      draw(!state.items.length ? '<p class="photo-count">עוד אף קבוצה אחרת לא העלתה תמונה בצבע ' + name + '.</p>' :
        j.more ? '<p><button class="btn secondary" id="more-others" data-more="1">עוד תמונות</button></p>' : '');
    }, function () {
      if (shown !== state) return;
      draw('<p class="photo-count">לא הצלחנו לטעון את התמונות של הקבוצות האחרות.</p>' +
        '<p><button class="btn secondary" id="more-others" data-more="' + (state.items.length ? '1' : '') + '">לנסות שוב</button></p>');
    });
  }

  // RGB 0-255 -> [hue 0-360, saturation 0-1, value 0-1]
  function hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
    let h = 0;
    if (d) h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, max ? d / max : 0, max];
  }

  // One name per pixel; first match wins, so darkness and grayness are decided before hue.
  // Brown has no hue band: it is dark orange or dark yellow. Dark olive (50-70°) is shaded leaves, so green.
  function classify(h, s, v) {
    if (v < 0.15) return 'black';
    if (s < 0.18) return v > 0.8 ? 'white' : 'gray';
    if (s < 0.25 && v > 0.9) return 'white';
    if (h >= 345 || h < 15) return s < 0.45 && v > 0.8 ? 'pink' : 'red';
    if (h < 45) return v < 0.6 ? 'brown' : 'orange';
    if (h < 70) return v >= 0.45 ? 'yellow' : h < 50 ? 'brown' : 'green';
    if (h < 165) return 'green';
    if (h < 200) return 'cyan';
    if (h < 255) return 'blue';
    if (h < 300) return 'purple';
    return 'pink';
  }

  // Size of the largest group of side-touching cells in mask (diagonals don't join)
  function largestPatch(mask, w, h) {
    const stack = new Int32Array(w * h);
    let best = 0;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] !== 1) continue;
      let size = 0, top = 0;
      stack[top++] = i; mask[i] = 2;
      while (top) {
        const j = stack[--top], x = j % w;
        size++;
        if (x > 0 && mask[j - 1] === 1) { mask[j - 1] = 2; stack[top++] = j - 1; }
        if (x < w - 1 && mask[j + 1] === 1) { mask[j + 1] = 2; stack[top++] = j + 1; }
        if (j >= w && mask[j - w] === 1) { mask[j - w] = 2; stack[top++] = j - w; }
        if (j + w < mask.length && mask[j + w] === 1) { mask[j + w] = 2; stack[top++] = j + w; }
      }
      best = Math.max(best, size);
    }
    return best;
  }

  function analyze(img, target) {
    const k = Math.min(1, SAMPLE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const px = ctx.getImageData(0, 0, w, h).data;
    const counts = {}, vivid = new Uint8Array(w * h);
    KEYS.forEach(n => { counts[n] = 0; });
    let total = 0;
    for (let i = 0; i < w * h; i++) {
      if (px[i * 4 + 3] < 128) continue;  // transparent: not part of the photo
      total++;
      const [hh, s, v] = hsv(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
      const name = classify(hh, s, v);
      counts[name]++;
      if (name === target && s >= VIVID_S && v >= VIVID_V) vivid[i] = 1;
    }
    const share = n => total ? counts[n] / total * 100 : 0;
    const res = { share: share(target), patch: 0 };
    res.byShare = res.share >= C.THRESHOLD;
    if (!res.byShare && total && NO_ACCENT.indexOf(target) === -1) res.patch = largestPatch(vivid, w, h) / total * 100;
    res.ok = res.byShare || res.patch >= C.ACCENT_MIN;
    res.top = KEYS.filter(n => share(n) >= 1).sort((a, b) => counts[b] - counts[a]).slice(0, 3)
      .map(n => NAMES[n] + ' ' + pct(share(n)));
    return res;
  }

  function thumbnail(img, size, quality) {
    const k = Math.min(1, (size || THUMB) / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement('canvas');
    cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', quality || 0.7);
  }

  // cls: found (green) / far (red), as in the photo hunt
  function box(cls, title, lines) {
    return '<div class="feedback ' + cls + '"><span class="result-title">' + title + '</span>' + lines.join('<br>') + '</div>';
  }

  function grid() {
    const r = results();
    const found = C.colors.filter(c => r[c.color]).length;
    const tiles = C.colors.map(function (c) {
      const res = r[c.color], name = NAMES[c.color];
      const n = res ? res.photos.length : 0;
      const pic = res ? '<img src="' + res.photos[0].src + '" alt="' + name + '">' +
        (n > 1 ? '<span class="photo-count-badge">📷 ' + n + '</span>' : '') :
        '<span class="color-swatch" style="background:' + SWATCH[c.color] + '"></span>';
      return '<a class="photo-tile' + (res ? ' found' : '') + '" href="#' + c.color + '">' + pic +
        '<span class="photo-tile-label"><strong>' + name + '</strong>' + (res ? '✅ נמצא · 10 נקודות' : 'עוד לא צילמתם') + '</span></a>';
    }).join('');
    root.innerHTML = '<p class="lead">' + esc(C.intro) + '</p>' +
      '<p class="photo-count">' + (found === C.colors.length ? '🎉 מצאתם את כל הצבעים!' :
        'מצאתם <strong>' + found + '</strong> מתוך ' + C.colors.length + ' צבעים') + '</p>' +
      '<div class="photo-grid">' + tiles + '</div>';
  }

  // status: optional message shown under the picker, e.g. the result of the last upload
  function detail(i, status) {
    const c = C.colors[i], name = NAMES[c.color], res = results()[c.color];
    const head = '<div class="card"><div class="stats"><a class="back-link" href="#"><span class="arrow">→</span>חזרה</a>' +
      '<span>צבע ' + (i + 1) + ' מתוך ' + C.colors.length + '</span></div>' +
      '<div class="color-banner" style="background:' + SWATCH[c.color] + '"></div>' +
      '<h2>צלמו משהו ' + name + '</h2>';
    const picker = text => '<p><label class="btn' + (res ? ' secondary' : '') + '" id="pick">' +
      '<input type="file" accept="image/*" id="file" multiple hidden>' + text + '</label></p>';
    const statusDiv = '<div id="status">' + (status || '') + '</div>' +
      (C.UPLOAD_URL ? '<p class="photo-count">תמונות שמתקבלות נשמרות גם בתיקייה משותפת, וכל הקבוצות יכולות לראות אותן.</p>' : '');
    if (res) {
      const n = res.photos.length;
      const photos = res.photos.map((p, k) => '<figure data-photo="' + p.id + '"><img src="' + p.src + '" alt="תמונה ' + (k + 1) + '" data-view>' +
        '<button class="photo-remove" data-remove="' + k + '" aria-label="למחוק את התמונה">✕</button>' +
        (C.UPLOAD_URL && !p.fileId ? '<span class="photo-pending" title="עוד לא עלתה ל-Drive. תעלה כשתהיה קליטה.">⏳ ממתינה להעלאה</span>' : '') +
        '</figure>').join('');
      root.innerHTML = head + box('found', '🎯 מצאתם ' + name + '!', ['קיבלתם <strong>10 נקודות</strong>.']) +
        '<p class="photo-count">' + (n > 1 ? n + ' תמונות ' + name : 'התמונה שצילמתם') + '</p>' +
        '<div class="color-gallery' + (n === 1 ? ' single' : '') + '">' + photos + '</div>' +
        (n >= MAX_PHOTOS ? '<p class="photo-count">הגעתם למקסימום של ' + MAX_PHOTOS + ' תמונות לצבע. כדי להוסיף, מחקו קודם תמונה.</p>' :
          picker('➕ להוסיף עוד תמונות')) + statusDiv +
        '<a class="btn" href="#">חזרה לכל הצבעים</a></div>';
    } else {
      root.innerHTML = head +
        (c.hint ? '<p><strong>רעיון:</strong> ' + esc(c.hint) + '</p>' : '') +
        '<p class="lead">הצבע צריך למלא חלק גדול מהתמונה, או להופיע בה כדבר אחד בולט - למשל פרח ' + name + ' בתוך שיח.</p>' +
        '<p>אפשר לבחור כמה תמונות בבת אחת.</p>' +
        picker('📷 צלמו או בחרו תמונות') + statusDiv + '</div>';
    }
    const file = document.getElementById('file');
    if (file) file.onchange = function () {
      if (this.files.length) check(i, Array.from(this.files));
      this.value = '';  // picking the same file again should still fire
    };
    // ✕ asks on the photo itself, with a small "delete / cancel" over it, instead of a browser pop-up
    root.querySelectorAll('[data-remove]').forEach(b => b.onclick = function () {
      const fig = b.parentNode;
      if (fig.querySelector('.photo-confirm')) return;
      fig.insertAdjacentHTML('beforeend', '<div class="photo-confirm"><span>' +
        (res.photos.length > 1 ? 'למחוק?' : 'למחוק? הצבע יסומן כלא נמצא') + '</span>' +
        '<span><button class="yes">מחיקה</button><button class="no">ביטול</button></span></div>');
      const box = fig.querySelector('.photo-confirm');
      box.querySelector('.no').onclick = () => box.remove();
      box.querySelector('.yes').onclick = function () {
        removePhoto(c.color, +b.dataset.remove);
        detail(i);
      };
    });
    root.querySelectorAll('[data-view]').forEach(img => img.onclick = () => view(img.src));
  }

  // Full-screen view of one photo; a tap anywhere closes it
  function view(src) {
    const o = document.createElement('div');
    o.className = 'photo-viewer';
    o.innerHTML = '<img src="' + src + '" alt="">';
    o.onclick = () => o.remove();
    document.body.appendChild(o);
  }

  // Resolves to the loaded image, or null if the file isn't a readable image
  function loadImage(file) {
    return new Promise(function (resolve) {
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onload = function () {
        const img = new Image();
        img.onerror = () => resolve(null);
        img.onload = () => resolve(img);
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Checks each photo in turn: the ones that pass are added to the color, the rest are shown with the reason
  async function check(i, files) {
    const color = C.colors[i].color, name = NAMES[color], res = results()[color];
    const label = document.getElementById('pick').lastChild;
    const room = MAX_PHOTOS - (res ? res.photos.length : 0);
    const passed = [], failed = [];
    let broken = 0, extra = 0, share = 0;
    for (let k = 0; k < files.length; k++) {
      label.textContent = files.length > 1 ? 'בודקים תמונה ' + (k + 1) + ' מתוך ' + files.length + '...' : 'בודקים את התמונה...';
      const img = await loadImage(files[k]);
      if (!img) { broken++; continue; }
      const r = analyze(img, color);
      if (!r.ok) { failed.push({ src: thumbnail(img), r: r }); continue; }
      if (passed.length >= room) { extra++; continue; }
      const p = newPhoto(thumbnail(img));
      if (C.UPLOAD_URL) big[p.id] = thumbnail(img, UPLOAD, 0.85);
      passed.push(p);
      share = Math.max(share, r.share);
    }
    const msgs = [];
    if (passed.length && !addPhotos(color, share, passed))
      msgs.push(box('far', '⚠️ אין מספיק מקום בטלפון', ['התמונות לא נשמרו. נסו למחוק תמונות מצבעים אחרים.']));
    else if (passed.length && files.length > 1)
      msgs.push(box('found', '✅ ' + (passed.length === 1 ? 'נוספה תמונה אחת' : 'נוספו ' + passed.length + ' תמונות'), []));
    if (extra) msgs.push(box('far', '📦 ' + (extra === 1 ? 'תמונה אחת לא נוספה' : extra + ' תמונות לא נוספו'),
      ['אפשר לשמור עד ' + MAX_PHOTOS + ' תמונות לכל צבע.']));
    if (broken) msgs.push(box('far', '⚠️ לא הצלחנו לפתוח ' + (broken === 1 ? 'תמונה אחת' : broken + ' תמונות'),
      ['נסו לצלם שוב, או לבחור תמונה אחרת.']));
    if (failed.length) {
      const one = failed.length === 1;
      msgs.push(box('far', '🔍 ' + (one ? 'לא מספיק ' + name : failed.length + ' תמונות בלי מספיק ' + name),
        ['צריך שלפחות ' + C.THRESHOLD + '% מהתמונה יהיה ' + name +
          (NO_ACCENT.indexOf(color) === -1 ? ', או דבר ' + name + ' אחד בולט.' : '.'),
         'נסו להתקרב, כך שה' + name + ' ימלא יותר מהתמונה. ' + (one ? 'התמונה הזו לא נשמרה.' : 'התמונות האלה לא נשמרו.')]) +
        '<div class="color-gallery' + (one ? ' single' : '') + '">' + failed.map(f => '<figure><img src="' + f.src + '" alt="" data-view>' +
          '<figcaption>רק ' + pct(f.r.share) + ' ' + name + (f.r.top.length ? '. בעיקר: ' + f.r.top.join(', ') : '') +
          '</figcaption></figure>').join('') + '</div>');
    }
    detail(i, msgs.join(''));
    if (passed.length) sync();
  }

  function route() {
    const i = C.colors.findIndex(c => '#' + c.color === location.hash);
    if (i === -1) { grid(); others.innerHTML = ''; shown = null; }
    else { detail(i); loadOthers(C.colors[i].color); }
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);
  route();
  sync();
})();
