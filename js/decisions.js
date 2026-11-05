/*
 * decisions.html: the wall of good decisions (from the Google Sheet), plus a card (modal)
 * with the form for taking a new decision. The card opens from the "קחו החלטה" button,
 * or on load when the address ends with #add (used by the progress/summary links).
 */
(function () {
  const C = window.DECISIONS;
  const root = document.getElementById('decisions-root');
  let modal, body, wallEl, lastFocus;

  function notConfigured(el) {
    el.innerHTML = '<div class="card"><p>החיבור ל-Google Sheets עדיין לא הוגדר. ' +
      'מלאו את הערכים ב-<code>data/decisions-config.js</code>.</p></div>';
  }

  // ---- The "take a decision" card ----

  function buildModal() {
    modal = document.createElement('div');
    modal.className = 'mem-modal';
    modal.innerHTML =
      '<div class="mem-panel" role="dialog" aria-modal="true" aria-labelledby="mem-title">' +
        '<button class="mem-close" type="button" aria-label="סגירה">&#10005;</button>' +
        '<h2 id="mem-title">קחו החלטה טובה לעצמכם</h2>' +
        '<div class="mem-body"></div>' +
      '</div>';
    document.body.appendChild(modal);
    body = modal.querySelector('.mem-body');
    modal.querySelector('.mem-close').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
  }

  function openModal() {
    if (!modal) buildModal();
    lastFocus = document.activeElement;
    form();
    modal.classList.add('open');
    document.body.classList.add('modal-open');
    const ta = document.getElementById('mem-text');
    if (ta) ta.focus();
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
    if (location.hash === '#add') history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function form() {
    if (!C.FORM_URL || !C.FIELD_TEXT) return notConfigured(body);
    body.innerHTML = '<p class="mem-lead">הטיול כאן הוא הזדמנות לעצור רגע. כתבו החלטה טובה שאתם לוקחים לעצמכם, והיא תישמר ותופיע כאן.</p>' +
      '<form id="mem-form" class="mem-form">' +
      '<label>שם<input id="mem-name" maxlength="' + C.MAX_NAME + '" autocomplete="off" required></label>' +
      '<label>ההחלטה הטובה שלכם<textarea id="mem-text" rows="5" maxlength="' + C.MAX_TEXT + '" required></textarea><div class="mem-counter" id="mem-counter">0 / ' + C.MAX_TEXT + '</div></label>' +
      '<input id="mem-hp" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button class="btn" id="mem-send" type="submit">שליחה</button>' +
      '<div id="mem-msg" class="feedback" style="display:none"></div></form>';
    document.getElementById('mem-name').value = Group.get().slice(0, C.MAX_NAME);
    const ta = document.getElementById('mem-text');
    ta.oninput = function () { document.getElementById('mem-counter').textContent = ta.value.length + ' / ' + C.MAX_TEXT; };
    document.getElementById('mem-form').onsubmit = function (e) {
      e.preventDefault();
      const text = ta.value.trim();
      const name = document.getElementById('mem-name').value.trim();
      if (!name || !text || document.getElementById('mem-hp').value) return;
      const data = new URLSearchParams();
      if (C.FIELD_NAME) data.set(C.FIELD_NAME, name);
      data.set(C.FIELD_TEXT, text);
      const btn = document.getElementById('mem-send');
      btn.disabled = true;
      // no-cors: the response is opaque, so success can't be confirmed from here
      fetch(C.FORM_URL, { method: 'POST', mode: 'no-cors', body: data })
        .then(function () {
          // Keep my own decisions in this browser, for the progress and summary pages
          const mine = Store.get('decisions') || [];
          mine.push({ name: name, text: text });
          Store.set('decisions', mine);
          addToWall(name, text);
          body.innerHTML = '<div style="text-align:center"><p class="mem-thanks">תודה ❤️</p>' +
            '<p class="lead">ההחלטה נשמרה ונוספה לקיר ההחלטות.</p>' +
            '<div class="btn-row"><button class="btn" id="mem-done" type="button">לקיר ההחלטות</button>' +
            '<button class="btn secondary" id="mem-again" type="button">עוד החלטה</button></div></div>';
          document.getElementById('mem-done').onclick = closeModal;
          document.getElementById('mem-again').onclick = function () { form(); document.getElementById('mem-text').focus(); };
          document.getElementById('mem-done').focus();
        })
        .catch(function () {
          btn.disabled = false;
          const m = document.getElementById('mem-msg');
          m.style.display = 'block';
          m.textContent = 'השליחה נכשלה. בדקו חיבור לאינטרנט ונסו שוב.';
        });
    };
  }

  // ---- The wall ----

  // Loaded as a <script> (JSONP) instead of fetch: no CORS, so it also works when opened from file://
  // Calls ok(rows) with the non-empty rows, newest first. Columns: timestamp, name, text.
  function loadRows(ok, fail) {
    const cb = '__decisionsCb' + Date.now();
    window[cb] = function (resp) {
      delete window[cb];
      if (!resp || resp.status !== 'ok') return fail();
      ok(resp.table.rows.filter(function (r) { return r.c[2] && String(r.c[2].v || '').trim(); }).reverse());
    };
    const s = document.createElement('script');
    s.src = 'https://docs.google.com/spreadsheets/d/' + C.SHEET_ID +
      '/gviz/tq?tqx=out:json;responseHandler:' + cb + '&_=' + Date.now();
    s.onerror = fail;
    document.head.appendChild(s);
  }

  function card(text, name, when, i) {
    const card = document.createElement('div');
    card.className = 'card decision-card';
    card.style.animationDelay = Math.min(i, 8) * 60 + 'ms';
    const p = document.createElement('p');
    p.textContent = text;
    card.appendChild(p);
    const by = document.createElement('div');
    by.className = 'decision-by';
    const who = document.createElement('span');
    who.textContent = name || 'אנונימי';
    by.appendChild(who);
    if (when) {
      const d = document.createElement('span');
      d.className = 'decision-date';
      d.textContent = when;
      by.appendChild(d);
    }
    card.appendChild(by);
    return card;
  }

  function rowCard(r, i) {
    // "11/4/2026 19:49:53" -> "11/4/2026 19:49"
    const when = r.c[0] && r.c[0].f ? r.c[0].f.replace(/(\d+:\d+):\d+$/, '$1') : '';
    return card(r.c[2].v, r.c[1] && String(r.c[1].v || '').trim(), when, i);
  }

  let total = 0;
  function setCount() {
    const count = document.getElementById('mem-count');
    if (count) count.textContent = !total ? '' : total === 1 ? 'עד עכשיו נלקחה החלטה טובה אחת' : 'עד עכשיו נלקחו ' + total + ' החלטות טובות';
  }

  function ensureWall() {
    if (wallEl && wallEl.isConnected) return wallEl;
    root.innerHTML = '';
    wallEl = document.createElement('div');
    wallEl.className = 'decisions-board';
    root.appendChild(wallEl);
    return wallEl;
  }

  // A decision just sent: shown at the top right away (the sheet takes a moment to update)
  function addToWall(name, text) {
    if (!C.SHEET_ID) return;
    const w = ensureWall();
    w.insertBefore(card(text, name, 'עכשיו', 0), w.firstChild);
    total++;
    setCount();
  }

  function wall() {
    if (!C.SHEET_ID) return notConfigured(root);
    root.innerHTML = '<p class="lead" style="text-align:center">טוען החלטות...</p>';
    loadRows(function (rows) {
      root.innerHTML = '';
      if (!rows.length) { root.innerHTML = '<div class="card decision-empty"><p>עדיין אין החלטות. אפשר להיות הראשונים.</p></div>'; return; }
      total = rows.length;
      setCount();
      const w = ensureWall();
      rows.forEach(function (r, i) { w.appendChild(rowCard(r, i)); });
    }, function () {
      root.innerHTML = '<div class="card"><p>לא הצלחנו לטעון את ההחלטות. נסו לרענן.</p></div>';
    });
  }

  document.getElementById('mem-open').addEventListener('click', openModal);
  wall();
  if (location.hash === '#add') openModal();
})();
