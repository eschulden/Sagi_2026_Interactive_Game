(function () {
  const G = window.GUESS;
  const M = window.IsraelMap;
  const root = document.getElementById('guess');
  const NS = 'http://www.w3.org/2000/svg';

  // results[k] = { x, y, km, pts } once place k is guessed; hints[k] = hints opened there.
  // Both are final: going back shows the guess again but can't redo it, and hints opened
  // before stepping away stay counted. reviewing = looking back from the results page.
  let idx = 0, results = [], hints = [], reviewing = false;
  const HINT_COST = 1;
  const maxScore = G.places.length * 10;

  function score() { return results.reduce((s, r) => s + (r ? r.pts : 0), 0); }
  function hintsUsed() { return hints[idx] || 0; }

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
    idx = 0; results = []; hints = []; reviewing = false;
    root.innerHTML = '<div class="card" style="text-align:center"><h2>נחשו את המקום</h2><p class="lead">' + esc(G.intro) +
      '</p><button class="btn" id="go">מתחילים</button>' + Store.startExtras('guess', G.places.length, maxScore) +
      (lastRun() ? '<p><button class="btn secondary" id="last">לצפייה בתוצאות האחרונות</button></p>' : '') + '</div>';
    document.getElementById('go').onclick = show;
    const l = document.getElementById('last');
    if (l) l.onclick = () => { const run = lastRun(); results = run.results; hints = run.hints; reviewing = true; finish(); };
    const r = document.getElementById('resume');
    if (r) r.onclick = () => {
      const p = Store.progress('guess', G.places.length);
      idx = p.i;
      results = Array.isArray(p.results) ? p.results.map(x => x || undefined) : [];
      hints = Array.isArray(p.hints) ? p.hints.map(x => x || 0) : [];
      show();
    };
  }

  // Guesses and hints of the last finished run (kept so the results can be viewed again later), or null
  function lastRun() {
    const l = Store.get('guess:last');
    return l && Array.isArray(l.results) && l.results.length === G.places.length && l.results.every(r => r) ?
      { results: l.results, hints: Array.isArray(l.hints) ? l.hints.map(x => x || 0) : [] } : null;
  }

  // Resume point is the furthest place reached, even while looking back at earlier ones
  function save() {
    if (reviewing) return;
    const far = Math.max(idx, Math.min(results.length, G.places.length - 1));
    Store.set('guess', { i: far, score: score(), results: results, hints: hints });
  }

  function show() {
    save();
    const p = G.places[idx], r = results[idx];
    const pct = (idx / G.places.length) * 100;
    root.innerHTML = '<div class="game-layout"><div class="map-wrap"><svg id="gmap" viewBox="0 0 ' + M.W + ' ' + M.H +
      '" role="img" aria-label="מפת ישראל - לחצו כדי לנחש" style="cursor:crosshair">' +
      M.baseSvg() + '</svg></div>' +
      '<div class="card"><div class="stats"><span class="q-nav">מקום ' + (idx + 1) + ' מתוך ' + G.places.length +
      '<span class="q-arrows">' +
        '<button class="q-arrow" id="prev" aria-label="למקום הקודם">‹</button>' +
        '<button class="q-arrow" id="fwd" aria-label="למקום הבא">›</button>' +
      '</span></span><span>ניקוד: <span id="score">' + score() + '</span></span></div><div class="progress"><div style="width:' + pct + '%"></div></div>' +
      (p.image ? '<img src="' + esc(p.image) + '" alt="" style="width:100%;border-radius:12px;margin-bottom:12px">' : '') +
      '<h2>איפה זה?</h2><p>' + esc(p.clue) + '</p><ul class="hints" id="hints">' +
      (p.hints || []).slice(0, hintsUsed()).map(h => '<li>' + esc(h) + '</li>').join('') + '</ul>' +
      (!r && p.hints && hintsUsed() < p.hints.length ? '<button class="btn secondary" id="hintBtn"></button>' : '') +
      (r ? '' : '<p class="lead" id="hint">לחצו על המפה כדי לסמן את הניחוש.</p>') + '<div id="after"></div>' +
      '<button class="to-map" id="toMap" type="button">↑ למפה</button></div></div>';
    document.getElementById('toMap').onclick = () =>
      document.querySelector('.map-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
    nav();
    if (r) { reveal(false); return; }
    document.getElementById('gmap').addEventListener('click', onMapClick);
    if (!introScrolled) { introScrolled = true; slowScrollTo(root.querySelector('.game-layout > .card')); }
    const hb = document.getElementById('hintBtn');
    if (hb) {
      hb.textContent = '💡 רמז נוסף (מחיר: ' + HINT_COST + ' נקודות)';
      hb.onclick = () => {
        const li = document.createElement('li');
        li.textContent = p.hints[hintsUsed()];
        hints[idx] = hintsUsed() + 1;
        save();
        document.getElementById('hints').appendChild(li);
        if (hintsUsed() >= p.hints.length) hb.remove();
      };
    }
  }

  // Small arrows by the place counter: back (from the 2nd place on) and forward
  // (once this place is guessed). The big button under the result also goes forward.
  function forward() { if (removeArrow) removeArrow(); idx++; idx < G.places.length ? show() : finish(); }
  function nav() {
    if (removeArrow) { removeArrow(); removeArrow = null; }
    const p = document.getElementById('prev'), f = document.getElementById('fwd');
    p.disabled = idx === 0;
    p.onclick = () => { idx--; show(); };
    f.disabled = !results[idx];
    f.onclick = forward;
  }
  let removeArrow = null;

  // Phone layout (card stacked under the map): after a pause, glide slowly down to el,
  // stopping where the end of its card reaches the bottom of the screen.
  // Used for the clue card on the first place of a visit, and for the result after every guess.
  // Stops if the player touches or scrolls meanwhile.
  let introScrolled = false;
  function slowScrollTo(el, delay) {
    const HEADER = 80, DELAY = delay || 700, DURATION = 1800;
    let cancelled = false, raf = 0;
    const stop = () => { cancelled = true; cancelAnimationFrame(raf); };
    const opts = { once: true, passive: true };
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(t => window.addEventListener(t, stop, opts));
    setTimeout(function () {
      const from = window.scrollY;
      // Stop once the bottom of the card holding el is in view (not at the page bottom),
      // unless the card is taller than the screen - then just bring el up under the header.
      const card = el.closest('.card') || el;
      const to = Math.min(from + el.getBoundingClientRect().top - HEADER,
        from + card.getBoundingClientRect().bottom - window.innerHeight + 16,
        document.documentElement.scrollHeight - window.innerHeight);
      const map = root.querySelector('.map-wrap');
      const stacked = map && el.getBoundingClientRect().top >= map.getBoundingClientRect().bottom;
      if (cancelled || !document.body.contains(el) || !stacked || to - from < 40) return;
      const t0 = performance.now();
      const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      (function step(now) {
        if (cancelled) return;
        const t = Math.min(1, (now - t0) / DURATION);
        window.scrollTo(0, from + (to - from) * ease(t));
        if (t < 1) raf = requestAnimationFrame(step);
      })(t0);
    }, DELAY);
  }

  function mark(svg, x, y, color, r) {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', r || 6);
    c.setAttribute('fill', color); c.setAttribute('stroke', '#fff'); c.setAttribute('stroke-width', 2);
    svg.appendChild(c);
  }

  function onMapClick(e) {
    if (results[idx]) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    const p = G.places[idx];
    const km = M.km(M.latOf(q.y), M.lonOf(q.x), p.lat, p.lon);
    const base = pointsFor(km);
    // Each hint costs points, but a close guess still earns at least 1
    const pts = base ? Math.max(1, base - hintsUsed() * HINT_COST) : 0;
    results[idx] = { x: q.x, y: q.y, km: km, pts: pts };
    save();
    document.getElementById('score').textContent = score();
    nav();
    reveal(true);
  }

  // Draws the guess on the map and shows the result: just guessed (fresh), or revisited
  function reveal(fresh) {
    const svg = document.getElementById('gmap');
    const p = G.places[idx], q = results[idx], km = q.km, pts = q.pts, used = hintsUsed();
    const hb = document.getElementById('hintBtn');
    if (hb) hb.remove();
    // The hints that weren't asked for go in the info box below, so the player learns them too
    const unused = (p.hints || []).slice(used);

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

    const prompt = document.getElementById('hint');
    if (prompt) prompt.remove();
    const last = idx === G.places.length - 1;
    document.getElementById('after').innerHTML =
      // Same distance bands as the message: close = green, almost = yellow, far = red
      '<div class="feedback ' + (km < 20 ? 'found' : km < 60 ? 'near' : 'far') + '"><strong>' + esc(p.name) + '</strong><br>' +
      (km < 1 ? 'בול!' : (km < 20 ? 'ממש קרוב!' : km < 60 ? 'כמעט!' : 'כיוון טוב!') + ' רק ' + Math.round(km) + ' ק"מ מהמקום') + (pts ? ' · ' + pts + ' נקודות' + (used ? ' (' + (used === 1 ? 'עם רמז' : 'עם ' + used + ' רמזים') + ')' : '') : '') + '</div>' +
      (p.fact || unused.length ? '<div class="memory">' +
        (unused.length ? '<ul class="hints unused-hints">' +
          unused.map(h => '<li class="unused">' + esc(h) + '</li>').join('') + '</ul>' : '') +
        (p.fact ? '<p class="fact">' + esc(p.fact) + '</p>' : '') +
        '</div>' : '') +
      '<button class="btn" id="next">' + (last ? 'לתוצאה' : 'למקום הבא') + '</button>';
    const next = document.getElementById('next');
    next.onclick = forward;
    if (fresh) {
      removeArrow = scrollArrow(next);
      slowScrollTo(document.querySelector('#after .feedback'), 1000); // let them see the line on the map first
    }
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
    const s = score();
    const pct = (s / maxScore) * 100;
    let end = G.endings[0];
    G.endings.forEach(e => { if (pct >= e.min) end = e; });
    // Record the run once; coming back here from the review just shows the result again
    if (!reviewing) Store.set('guess:last', { results: results, hints: hints });
    const best = reviewing ? Store.get('guess:best') || s : Store.finish('guess', s);
    reviewing = true;
    root.innerHTML = '<div class="card" style="text-align:center"><h2>' + Group.cheer() + '</h2>' +
      '<p style="font-size:2.4rem;margin:0">📍</p><h2>' + esc(end.title) + '</h2><p class="lead">' + esc(end.text) +
      '</p><p>ניקוד: <strong>' + s + ' מתוך ' + maxScore + '</strong> · שיא: ' + best + '</p>' +
      '<div class="btn-row"><button class="btn secondary" id="review">לצפייה במקומות ובניחושים</button><button class="btn" id="again">שוב</button></div>' +
      Group.nextStop() + '</div>';
    document.getElementById('review').onclick = () => { idx = 0; show(); };
    document.getElementById('again').onclick = start;
  }

  start();
})();
