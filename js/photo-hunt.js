(function () {
  const H = window.PHOTO_HUNT;
  const root = document.getElementById('photo-hunt');

  let idx = 0, tries = 0, lastM = null, busy = false;
  // A fix this bad is barely usable; we ask the player to wait for a better one
  const POOR_ACC_M = 40;
  // The game is played one photo at a time: ?photo=N, opened from photo-gallery.html
  const pick = /[?&]photo=(\d+)/.exec(location.search);
  const single = pick && +pick[1] >= 1 && +pick[1] <= H.photos.length ? +pick[1] - 1 : null;
  const gallery = 'photo-gallery.html' + (location.search.indexOf('hidden') !== -1 ? '?hidden' : '');

  // Last result per photo, keyed by image path: points (0 = gave up). The gallery colors tiles by it.
  // photohunt:best holds the current total, for summary.html.
  function saveResult(pts) {
    const r = Store.get('photohunt:results') || {};
    r[H.photos[idx].image] = pts;
    Store.set('photohunt:results', r);
    Store.set('photohunt:best', Object.keys(r).reduce((sum, k) => sum + r[k], 0));
  }

  function esc(t) { return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // Great-circle distance in meters
  function meters(lat1, lon1, lat2, lon2) {
    const R = 6371000, r = Math.PI / 180;
    const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  // Compass direction from the player to the spot, in Hebrew
  function direction(lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180;
    const y = Math.sin((lon2 - lon1) * r) * Math.cos(lat2 * r);
    const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon2 - lon1) * r);
    const deg = (Math.atan2(y, x) / r + 360) % 360;
    return ['צפון', 'צפון-מזרח', 'מזרח', 'דרום-מזרח', 'דרום', 'דרום-מערב', 'מערב', 'צפון-מערב'][Math.round(deg / 45) % 8];
  }

  // Live "how good is the GPS right now" line on the photo screen
  let liveId = null;
  function accLabel(acc) {
    const m = Math.round(acc);
    if (acc <= 10) return '🟢 קליטה מצוינת. הטלפון יודע איפה אתם בטעות של עד ' + m + ' מטר. אפשר ללחוץ "אני כאן".';
    if (acc <= 25) return '🟡 קליטה בינונית. הטלפון יודע איפה אתם בטעות של עד ' + m + ' מטר. אפשר לנסות, או לחכות כמה שניות שהקליטה תשתפר.';
    return '🔴 קליטה חלשה. הטלפון יכול לטעות במיקום שלכם בעד ' + m + ' מטר. צאו למקום פתוח, רחוק מעצים ומבניינים, וחכו כמה שניות.';
  }
  function startLive() {
    stopLive();
    if (!navigator.geolocation) return;
    liveId = navigator.geolocation.watchPosition(function (pos) {
      const el = document.getElementById('gps');
      if (el) el.textContent = accLabel(pos.coords.accuracy);
    }, function () {
      const el = document.getElementById('gps');
      if (el) el.textContent = '⚪ הטלפון עוד לא מצא את המיקום שלכם. בדקו שה-GPS דלוק ושאישרתם גישה למיקום.';
    }, { enableHighAccuracy: true, maximumAge: 0 });
  }
  function stopLive() {
    if (liveId !== null) navigator.geolocation.clearWatch(liveId);
    liveId = null;
  }

  function dist(m) { return m < 1000 ? Math.round(m) + ' מטר' : (m / 1000).toFixed(1) + ' ק"מ'; }

  // cls: found (green) / near (yellow) / far (red)
  function box(cls, title, lines) {
    return '<div class="feedback ' + cls + '"><span class="result-title">' + title + '</span>' + lines.join('<br>') + '</div>';
  }

  function pointsFor(m) {
    if (m <= H.FULL_M) return 10;
    if (m <= H.HALF_M) return 5;
    return 0;
  }

  function geoError(err) {
    if (!window.isSecureContext) return 'המיקום עובד רק בכתובת https. פתחו את האתר מהכתובת המפורסמת.';
    if (!err) return 'הדפדפן הזה לא תומך במיקום.';
    if (err.code === 1) return 'צריך לאשר גישה למיקום. בהגדרות הדפדפן אפשרו מיקום לאתר הזה, ונסו שוב.';
    if (err.code === 3) return 'לא הצלחנו לקבל מיקום בזמן. נסו לצאת למקום פתוח יותר ולנסות שוב.';
    return 'לא הצלחנו לקבל מיקום. בדקו שה-GPS בטלפון דלוק ונסו שוב.';
  }

  // Watches GPS for a few seconds and resolves with the most accurate fix seen
  function locate(onProgress) {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) return reject(null);
      let best = null;
      const id = navigator.geolocation.watchPosition(function (pos) {
        if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
        if (onProgress) onProgress(best.coords.accuracy);
        if (best.coords.accuracy <= 10) done();
      }, function (err) {
        if (!best) { navigator.geolocation.clearWatch(id); clearTimeout(t); reject(err); }
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
      const t = setTimeout(done, 8000);
      function done() {
        navigator.geolocation.clearWatch(id); clearTimeout(t);
        best ? resolve(best) : reject({ code: 3 });
      }
    });
  }

  function show() {
    tries = 0; lastM = null; busy = false;
    const p = H.photos[idx];
    root.innerHTML = '<div class="card"><div class="stats"><span>תמונה ' + (idx + 1) + ' מתוך ' + H.photos.length +
      '</span><a href="' + gallery + '">כל התמונות</a></div>' +
      '<img src="' + esc(p.image) + '" alt="התמונה שצריך למצוא" style="width:100%;border-radius:12px;margin-bottom:12px">' +
      (p.hint ? '<p><strong>רמז:</strong> ' + esc(p.hint) + '</p>' : '') +
      '<p class="lead">עמדו בדיוק במקום שממנו צולמה התמונה, ולחצו על הכפתור.</p>' +
      '<p id="gps" style="color:var(--muted)">⚪ מחפשים את המיקום שלכם...</p>' +
      '<div id="status"></div>' +
      '<p><button class="btn" id="here">📍 אני כאן</button></p>' +
      '<p><button class="btn secondary" id="skip">מוותרים על התמונה הזו</button></p></div>';
    document.getElementById('here').onclick = check;
    document.getElementById('skip').onclick = () => reveal(0, null);
    startLive();
  }

  function status(html) { document.getElementById('status').innerHTML = html; }

  function check() {
    if (busy) return;
    busy = true;
    const btn = document.getElementById('here');
    btn.disabled = true; btn.textContent = 'מאתרים מיקום...';
    status('<div class="feedback">מחפשים את המיקום שלכם. עמדו רגע במקום...</div>');
    locate(function (acc) {
      status('<div class="feedback">מחפשים את המיקום שלכם... (כרגע בטעות של עד ' + Math.round(acc) + ' מטר)</div>');
    }).then(function (pos) {
      busy = false;
      btn.disabled = false; btn.textContent = '📍 אני כאן';
      const p = H.photos[idx], c = pos.coords;
      const raw = meters(c.latitude, c.longitude, p.lat, p.lon);
      // Give the player the benefit of GPS error, but cap it so a vague fix can't win on its own
      const m = Math.max(0, raw - Math.min(c.accuracy, 15));
      const pts = pointsFor(m);
      if (pts === 10) return reveal(pts, raw);
      tries++;
      const d = '<strong>' + dist(raw) + '</strong>';
      const [cls, title, line] =
        pts ? ['near', '🟡 ממש קרוב!', 'אתם בערך ' + d + ' מהמקום.'] :
        raw <= 200 ? ['near', '🟡 אתם מתקרבים', 'נשארו בערך ' + d + ' עד המקום.'] :
        raw <= 1000 ? ['far', '🔴 אתם רחוקים', 'אתם בערך ' + d + ' מהמקום.'] :
        ['far', '🔴 אתם רחוקים מאוד', 'אתם בערך ' + d + ' מהמקום. הסתכלו שוב בתמונה וחפשו רמזים.'];
      const lines = [line];
      if (lastM !== null) {
        if (raw < lastM - 5) lines.push('🔥 חם יותר - התקרבתם מאז הניסיון הקודם.');
        else if (raw > lastM + 5) lines.push('🧊 קר יותר - התרחקתם מאז הניסיון הקודם.');
        else lines.push('↔️ בערך באותו מרחק כמו בניסיון הקודם.');
      }
      lastM = raw;
      if (tries >= 2) lines.push('🧭 המקום נמצא ל<strong>' + direction(c.latitude, c.longitude, p.lat, p.lon) + '</strong> מכם.');
      if (c.accuracy > POOR_ACC_M) lines.push('⚠️ הקליטה חלשה כרגע, אז המרחק יכול לטעות בעד ' + Math.round(c.accuracy) + ' מטר. נסו שוב בעוד רגע, במקום פתוח יותר.');
      status(box(cls, title, lines) +
        (pts ? '<p>אפשר לקחת ' + pts + ' נקודות עכשיו, או להתקרב עוד קצת ולנסות לקבל 10.</p>' +
               '<p><button class="btn secondary" id="take">לקחת ' + pts + ' נקודות</button></p>' : ''));
      const take = document.getElementById('take');
      if (take) take.onclick = () => reveal(pts, raw);
    }).catch(function (err) {
      busy = false;
      btn.disabled = false; btn.textContent = '📍 אני כאן';
      status(box('far', '⚠️ לא הצלחנו למצוא את המיקום שלכם', [esc(geoError(err))]));
    });
  }

  function reveal(pts, m) {
    stopLive();
    saveResult(pts);
    const p = H.photos[idx];
    const result =
      pts === 10 ? box('found', '🎯 מצאתם את המקום!', [m < 5 ? 'עמדתם בדיוק במקום שבו צילמתי.' : 'הייתם רק ' + dist(m) + ' מהנקודה שבה צילמתי.', 'קיבלתם <strong>10 נקודות</strong>.']) :
      pts ? box('found', '👍 כמעט בול!', ['הייתם בערך ' + dist(m) + ' מהנקודה שבה צילמתי.', 'קיבלתם <strong>' + pts + ' נקודות</strong>.']) :
      box('far', '🤷 התמונה הזו נשארה בגדר תעלומה', ['לא נורא - אפשר לנסות אותה שוב מתוך כל התמונות.']);
    root.innerHTML = '<div class="card"><img src="' + esc(p.image) + '" alt="" style="width:100%;border-radius:12px;margin-bottom:12px">' +
      result +
      (p.fact ? '<div class="memory">' + esc(p.fact) + '</div>' : '') +
      (pts ? '' : '<p><a href="https://www.google.com/maps/search/?api=1&query=' + p.lat + ',' + p.lon + '" target="_blank" rel="noopener">איפה זה היה? פתחו במפה</a></p>') +
      '<a class="btn" href="' + gallery + '">חזרה לכל התמונות</a></div>';
  }

  // ?setup: live coordinates, for recording where each photo was taken
  function setup() {
    root.innerHTML = '<div class="card"><h2>מצב הגדרה</h2><p class="lead">עמדו בנקודה שבה צילמתם, חכו שהדיוק ירד מתחת ל-10 מטר, והעתיקו את השורה לקובץ data/photo-hunt-data.js.</p>' +
      '<div class="feedback" id="pos">מחכים למיקום...</div><button class="btn" id="copy" disabled>העתקה</button></div>';
    const pos = document.getElementById('pos'), copy = document.getElementById('copy');
    let line = '';
    if (!navigator.geolocation) { pos.textContent = geoError(null); return; }
    navigator.geolocation.watchPosition(function (p) {
      const c = p.coords;
      line = 'lat: ' + c.latitude.toFixed(6) + ', lon: ' + c.longitude.toFixed(6) + ',';
      pos.innerHTML = '<code dir="ltr">' + line + '</code><br>דיוק: ' + Math.round(c.accuracy) + ' מטר' + (c.accuracy <= 10 ? ' ✅' : ' (מחכים לדיוק טוב יותר)');
      copy.disabled = false;
    }, function (err) { pos.textContent = geoError(err); }, { enableHighAccuracy: true, maximumAge: 0 });
    copy.onclick = function () {
      navigator.clipboard.writeText(line).then(() => { copy.textContent = 'הועתק ✓'; setTimeout(() => { copy.textContent = 'העתקה'; }, 1500); },
        () => { prompt('העתיקו:', line); });
    };
  }

  if (/[?&]setup\b/.test(location.search)) setup();
  else if (single !== null) { idx = single; show(); }
  else location.replace(gallery);
})();
