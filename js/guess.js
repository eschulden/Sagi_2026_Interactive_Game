(function () {
  const G = window.GUESS;
  const M = window.IsraelMap;
  const root = document.getElementById('guess');
  const NS = 'http://www.w3.org/2000/svg';

  let idx = 0, score = 0, answered = false, hintsUsed = 0;
  const HINT_COST = 1;
  const maxScore = G.places.length * 10;

  function esc(t) { return String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  function pointsFor(km) {
    if (km <= 15) return 10;
    if (km <= 35) return 8;
    if (km <= 70) return 6;
    if (km <= 130) return 4;
    if (km <= 200) return 2;
    return 1;
  }

  function start() {
    idx = 0; score = 0;
    root.innerHTML = '<div class="card" style="text-align:center"><h2>נחשו את המקום</h2><p class="lead">' + esc(G.intro) +
      '</p><button class="btn" id="go">מתחילים</button>' + Store.startExtras('guess', G.places.length, maxScore) + '</div>';
    document.getElementById('go').onclick = show;
    const r = document.getElementById('resume');
    if (r) r.onclick = () => { const p = Store.progress('guess', G.places.length); idx = p.i; score = p.score; show(); };
  }

  function show() {
    answered = false; hintsUsed = 0;
    Store.set('guess', { i: idx, score: score });
    const p = G.places[idx];
    const pct = (idx / G.places.length) * 100;
    root.innerHTML = '<div class="game-layout"><div class="map-wrap"><svg id="gmap" viewBox="0 0 ' + M.W + ' ' + M.H +
      '" role="img" aria-label="מפת ישראל - לחצו כדי לנחש" style="cursor:crosshair">' +
      M.baseSvg() + '</svg></div>' +
      '<div class="card"><div class="stats"><span>מקום ' + (idx + 1) + ' מתוך ' + G.places.length +
      '</span><span>ניקוד: ' + score + '</span></div><div class="progress"><div style="width:' + pct + '%"></div></div>' +
      (p.image ? '<img src="' + esc(p.image) + '" alt="" style="width:100%;border-radius:12px;margin-bottom:12px">' : '') +
      '<h2>איפה זה?</h2><p>' + esc(p.clue) + '</p><ul class="hints" id="hints"></ul>' +
      (p.hints && p.hints.length ? '<button class="btn secondary" id="hintBtn"></button>' : '') +
      '<p class="lead" id="hint">לחצו על המפה כדי לסמן את הניחוש.</p><div id="after"></div></div></div>';
    document.getElementById('gmap').addEventListener('click', onMapClick);
    const hb = document.getElementById('hintBtn');
    if (hb) {
      const label = () => { hb.textContent = '💡 רמז נוסף (מחיר: ' + HINT_COST + ' נקודות)'; };
      label();
      hb.onclick = () => {
        const li = document.createElement('li');
        li.textContent = p.hints[hintsUsed++];
        document.getElementById('hints').appendChild(li);
        if (hintsUsed >= p.hints.length) hb.remove();
      };
    }
  }

  function mark(svg, x, y, color, r) {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', r || 6);
    c.setAttribute('fill', color); c.setAttribute('stroke', '#fff'); c.setAttribute('stroke-width', 2);
    svg.appendChild(c);
  }

  function onMapClick(e) {
    if (answered) return;
    answered = true;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    const p = G.places[idx];
    const km = M.km(M.latOf(q.y), M.lonOf(q.x), p.lat, p.lon);
    const base = pointsFor(km);
    // Each hint costs points, but a close guess still earns at least 1
    const pts = base ? Math.max(1, base - hintsUsed * HINT_COST) : 0;
    score += pts;
    const hb = document.getElementById('hintBtn');
    if (hb) hb.remove();
    // Show the hints that weren't asked for, so the player learns them too
    (p.hints || []).slice(hintsUsed).forEach(function (h) {
      const li = document.createElement('li');
      li.className = 'unused';
      li.textContent = h;
      document.getElementById('hints').appendChild(li);
    });

    const tx = M.px(p.lon), ty = M.py(p.lat);
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', q.x); line.setAttribute('y1', q.y);
    line.setAttribute('x2', tx); line.setAttribute('y2', ty);
    line.setAttribute('class', 'route');
    svg.appendChild(line);
    mark(svg, q.x, q.y, '#c8612b');
    mark(svg, tx, ty, '#2e8b57', 7);
    const label = document.createElementNS(NS, 'text');
    label.setAttribute('x', tx + 10); label.setAttribute('y', ty + 4);
    label.setAttribute('style', 'font-size:11px;font-weight:700;paint-order:stroke;stroke:#fff;stroke-width:3px');
    label.textContent = p.name;
    svg.appendChild(label);
    svg.style.cursor = 'default';

    document.getElementById('hint').remove();
    const last = idx === G.places.length - 1;
    document.getElementById('after').innerHTML =
      '<div class="feedback"><strong>' + esc(p.name) + '</strong><br>' +
      (km < 1 ? 'בול!' : (km < 20 ? 'ממש קרוב!' : km < 60 ? 'כמעט!' : 'כיוון טוב!') + ' רק ' + Math.round(km) + ' ק"מ מהמקום') + (pts ? ' · ' + pts + ' נקודות' + (hintsUsed ? ' (' + (hintsUsed === 1 ? 'עם רמז' : 'עם ' + hintsUsed + ' רמזים') + ')' : '') : '') + '</div>' +
      (p.fact ? '<div class="memory">' + esc(p.fact) + '</div>' : '') +
      '<button class="btn" id="next">' + (last ? 'לתוצאה' : 'למקום הבא') + '</button>';
    const next = document.getElementById('next');
    const arrow = scrollArrow(next);
    next.onclick = () => { arrow(); idx++; idx < G.places.length ? show() : finish(); };
  }

  // Small faded ↓ at the bottom of the screen while the result is off-screen; tap scrolls to it.
  // Returns a function that removes it.
  function scrollArrow(target) {
    const btn = document.createElement('button');
    btn.className = 'scroll-down gone';
    btn.setAttribute('aria-label', 'גללו לתוצאה');
    btn.textContent = '↓';
    btn.onclick = () => target.scrollIntoView({ behavior: 'smooth', block: 'end' });
    document.body.appendChild(btn);
    const io = new IntersectionObserver(es => btn.classList.toggle('gone', es[0].isIntersecting));
    io.observe(target);
    return () => { io.disconnect(); btn.remove(); };
  }

  function finish() {
    const pct = (score / maxScore) * 100;
    let end = G.endings[0];
    G.endings.forEach(e => { if (pct >= e.min) end = e; });
    const best = Store.finish('guess', score);
    root.innerHTML = '<div class="card" style="text-align:center"><h2>' + Group.cheer() + '</h2>' +
      '<p style="font-size:2.4rem;margin:0">📍</p><h2>' + esc(end.title) + '</h2><p class="lead">' + esc(end.text) +
      '</p><p>ניקוד: <strong>' + score + ' מתוך ' + maxScore + '</strong> · שיא: ' + best + '</p><button class="btn" id="again">שוב</button>' + Group.nextStop() + '</div>';
    document.getElementById('again').onclick = start;
  }

  start();
})();
