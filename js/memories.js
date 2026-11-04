(function () {
  const C = window.MEMORIES;
  const root = document.getElementById('memories');
  const mode = root.dataset.mode; // 'add' | 'wall'

  function notConfigured() {
    root.innerHTML = '<div class="card"><p>החיבור ל-Google Sheets עדיין לא הוגדר. ' +
      'מלאו את הערכים ב-<code>data/memories-config.js</code>.</p></div>';
  }

  function add() {
    if (!C.FORM_URL || !C.FIELD_TEXT) return notConfigured();
    root.innerHTML = '<div class="card"><form id="mem-form">' +
      '<label>שם<input id="mem-name" maxlength="' + C.MAX_NAME + '" autocomplete="off" required></label>' +
      '<label>ההחלטה הטובה שלכם<textarea id="mem-text" rows="6" maxlength="' + C.MAX_TEXT + '" required></textarea><div class="mem-counter" id="mem-counter">0 / ' + C.MAX_TEXT + '</div></label>' +
      '<input id="mem-hp" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button class="btn" id="mem-send" type="submit">שליחה</button>' +
      '<div id="mem-msg" class="feedback" style="display:none"></div></form></div>' +
      '<div id="mem-recent" class="memories-recent-box"></div>';
    recent(document.getElementById('mem-recent'));
    document.getElementById('mem-name').value = Group.get().slice(0, C.MAX_NAME);
    const form = document.getElementById('mem-form');
    const ta = document.getElementById('mem-text');
    ta.oninput = function () { document.getElementById('mem-counter').textContent = ta.value.length + ' / ' + C.MAX_TEXT; };
    form.onsubmit = function (e) {
      e.preventDefault();
      const text = document.getElementById('mem-text').value.trim();
      const name = document.getElementById('mem-name').value.trim();
      if (!name || !text || document.getElementById('mem-hp').value) return;
      const body = new URLSearchParams();
      if (C.FIELD_NAME) body.set(C.FIELD_NAME, name);
      body.set(C.FIELD_TEXT, text);
      const btn = document.getElementById('mem-send');
      btn.disabled = true;
      // no-cors: the response is opaque, so success can't be confirmed from here
      fetch(C.FORM_URL, { method: 'POST', mode: 'no-cors', body: body })
        .then(function () {
          // Keep my own decisions in this browser, for the summary page
          const mine = Store.get('decisions') || [];
          mine.push({ name: name, text: text });
          Store.set('decisions', mine);
          root.innerHTML = '<div class="card" style="text-align:center"><h2>תודה ❤️</h2>' +
            '<p class="lead">ההחלטה נשמרה. היא תופיע בעמוד ההחלטות בקרוב.</p>' +
            '<div class="btn-row"><a class="btn" href="memories.html">לעמוד ההחלטות</a>' +
            '<button class="btn secondary" id="again">עוד החלטה</button></div></div>';
          document.getElementById('again').onclick = add;
        })
        .catch(function () {
          btn.disabled = false;
          const m = document.getElementById('mem-msg');
          m.style.display = 'block';
          m.textContent = 'השליחה נכשלה. בדקו חיבור לאינטרנט ונסו שוב.';
        });
    };
  }

  // Loaded as a <script> (JSONP) instead of fetch: no CORS, so it also works when opened from file://
  // Calls ok(rows) with the non-empty rows, newest first. Columns: timestamp, name, text.
  function loadRows(ok, fail) {
    const cb = '__memoriesCb' + Date.now();
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

  function card(r, i) {
    const card = document.createElement('div');
    card.className = 'card memory-card';
    card.style.animationDelay = Math.min(i, 8) * 60 + 'ms';
    const p = document.createElement('p');
    p.textContent = r.c[2].v;
    card.appendChild(p);
    const by = document.createElement('div');
    by.className = 'memory-by';
    const who = document.createElement('span');
    who.textContent = (r.c[1] && String(r.c[1].v || '').trim()) || 'אנונימי';
    by.appendChild(who);
    // "11/4/2026 19:49:53" -> "11/4/2026 19:49"
    const when = r.c[0] && r.c[0].f ? r.c[0].f.replace(/(\d+:\d+):\d+$/, '$1') : '';
    if (when) {
      const d = document.createElement('span');
      d.className = 'memory-date';
      d.textContent = when;
      by.appendChild(d);
    }
    card.appendChild(by);
    return card;
  }

  // The last 3 decisions, under the form on the add page. Stays hidden if loading fails.
  function recent(box) {
    if (!C.SHEET_ID || !box) return;
    loadRows(function (rows) {
      if (!rows.length) return;
      const h = document.createElement('h2');
      h.textContent = 'מה אחרים כתבו לאחרונה';
      box.appendChild(h);
      const list = document.createElement('div');
      list.className = 'memories-recent';
      rows.slice(0, 3).forEach(function (r, i) { list.appendChild(card(r, i)); });
      box.appendChild(list);
      const more = document.createElement('div');
      more.className = 'btn-row';
      more.innerHTML = '<a class="btn secondary" href="memories.html">לכל ההחלטות</a>';
      box.appendChild(more);
    }, function () {});
  }

  function wall() {
    if (!C.SHEET_ID) return notConfigured();
    root.innerHTML = '<p class="lead">טוען זיכרונות...</p>';
    loadRows(function (rows) {
      root.innerHTML = '';
      if (!rows.length) { root.innerHTML = '<div class="card memory-empty"><p>עדיין אין החלטות. אפשר להיות הראשונים.</p></div>'; return; }
      const count = document.getElementById('mem-count');
      if (count) count.textContent = rows.length === 1 ? 'החלטה אחת' : rows.length + ' החלטות';
      const wall = document.createElement('div');
      wall.className = 'memories-wall';
      root.appendChild(wall);
      rows.forEach(function (r, i) { wall.appendChild(card(r, i)); });
    }, function () {
      root.innerHTML = '<div class="card"><p>לא הצלחנו לטעון את ההחלטות. נסו לרענן.</p></div>';
    });
  }

  mode === 'add' ? add() : wall();
})();
