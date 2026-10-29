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
      '<label>שם <small>(לא חובה)</small><input id="mem-name" maxlength="' + C.MAX_NAME + '" autocomplete="off"></label>' +
      '<label>ההחלטה הטובה שלכם<textarea id="mem-text" rows="6" maxlength="' + C.MAX_TEXT + '" required></textarea><div class="mem-counter" id="mem-counter">0 / ' + C.MAX_TEXT + '</div></label>' +
      '<input id="mem-hp" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button class="btn" id="mem-send" type="submit">שליחה</button>' +
      '<div id="mem-msg" class="feedback" style="display:none"></div></form></div>';
    const form = document.getElementById('mem-form');
    const ta = document.getElementById('mem-text');
    ta.oninput = function () { document.getElementById('mem-counter').textContent = ta.value.length + ' / ' + C.MAX_TEXT; };
    form.onsubmit = function (e) {
      e.preventDefault();
      const text = document.getElementById('mem-text').value.trim();
      if (!text || document.getElementById('mem-hp').value) return;
      const body = new URLSearchParams();
      if (C.FIELD_NAME) body.set(C.FIELD_NAME, document.getElementById('mem-name').value.trim());
      body.set(C.FIELD_TEXT, text);
      const btn = document.getElementById('mem-send');
      btn.disabled = true;
      // no-cors: the response is opaque, so success can't be confirmed from here
      fetch(C.FORM_URL, { method: 'POST', mode: 'no-cors', body: body })
        .then(function () {
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
  function wall() {
    if (!C.SHEET_ID) return notConfigured();
    root.innerHTML = '<p class="lead">טוען זיכרונות...</p>';
    function fail() {
      root.innerHTML = '<div class="card"><p>לא הצלחנו לטעון את ההחלטות. נסו לרענן.</p></div>';
    }
    window.__memoriesCb = function (resp) {
      if (!resp || resp.status !== 'ok') return fail();
      // Columns: timestamp, name, text. Newest first.
      const rows = resp.table.rows.filter(function (r) { return r.c[2] && String(r.c[2].v || '').trim(); });
      root.innerHTML = '';
      if (!rows.length) { root.innerHTML = '<div class="card memory-empty"><p>עדיין אין החלטות. אפשר להיות הראשונים.</p></div>'; return; }
      const count = document.getElementById('mem-count');
      if (count) count.textContent = rows.length === 1 ? 'החלטה אחת' : rows.length + ' החלטות';
      const wall = document.createElement('div');
      wall.className = 'memories-wall';
      root.appendChild(wall);
      rows.reverse().forEach(function (r, i) {
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
        const when = r.c[0] && r.c[0].f ? r.c[0].f.split(' ')[0] : '';
        if (when) {
          const d = document.createElement('span');
          d.className = 'memory-date';
          d.textContent = when;
          by.appendChild(d);
        }
        card.appendChild(by);
        wall.appendChild(card);
      });
    };
    const s = document.createElement('script');
    s.src = 'https://docs.google.com/spreadsheets/d/' + C.SHEET_ID +
      '/gviz/tq?tqx=out:json;responseHandler:__memoriesCb&_=' + Date.now();
    s.onerror = fail;
    document.head.appendChild(s);
  }

  mode === 'add' ? add() : wall();
})();
