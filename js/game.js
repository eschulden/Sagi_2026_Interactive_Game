(function () {
  const G = window.GAME;
  const root = document.getElementById('game');

  const { W, H, px, py } = window.IsraelMap;
  const routePts = G.stops.map(s => px(s.lon).toFixed(1) + ',' + py(s.lat).toFixed(1)).join(' ');

  let idx = 0, score = 0, answered = false;
  const maxScore = G.stops.length * 10;

  function esc(t) { return String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  function mapSvg() {
    const pins = G.stops.map((s, i) => {
      const cls = i < idx ? 'done' : i === idx ? 'current' : '';
      const x = px(s.lon), y = py(s.lat);
      return '<g class="pin ' + cls + '"><circle cx="' + x + '" cy="' + y + '" r="6"/>' +
        '<text x="' + (x + 10) + '" y="' + (y + 4) + '" text-anchor="start" direction="rtl">' + esc(s.name) + '</text></g>';
    }).join('');
    const cur = G.stops[idx] || G.stops[G.stops.length - 1];
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="מפת ישראל">' +
      window.IsraelMap.baseSvg() +
      '<polyline class="route" points="' + routePts + '"/>' + pins +
      '<g class="traveler" id="traveler" style="transform:translate(' + (px(cur.lon) - 10) + 'px,' + (py(cur.lat) + 7) + 'px)">' +
      '<text>' + G.vehicle + '</text></g></svg>';
  }

  function layout(inner) {
    root.innerHTML =
      '<div class="game-layout"><div class="map-wrap" id="map">' + mapSvg() + '</div><div class="card">' + inner + '</div></div>';
  }

  function start() {
    idx = 0; score = 0;
    root.innerHTML = '<div class="card" style="text-align:center"><h2>מוכנים לצאת לדרך?</h2><p class="lead">' + esc(G.intro) +
      '</p><button class="btn" id="go">יוצאים!</button>' + Store.startExtras('game', G.stops.length, maxScore) + '</div>';
    document.getElementById('go').onclick = showStop;
    const r = document.getElementById('resume');
    if (r) r.onclick = () => { const p = Store.progress('game', G.stops.length); idx = p.i; score = p.score; showStop(); };
  }

  function showStop() {
    answered = false;
    Store.set('game', { i: idx, score: score });
    const s = G.stops[idx];
    const pct = (idx / G.stops.length) * 100;
    layout(
      '<div class="stats"><span>תחנה ' + (idx + 1) + ' מתוך ' + G.stops.length + '</span><span>ניקוד: ' + score + '</span></div>' +
      '<div class="progress"><div style="width:' + pct + '%"></div></div>' +
      '<h2>' + esc(s.name) + '</h2><p>' + esc(s.text) + '</p><strong>' + esc(s.question) + '</strong>' +
      '<div class="options">' + s.options.map((o, i) => '<button class="option" data-i="' + i + '">' + esc(o.text) + '</button>').join('') + '</div>' +
      '<div id="after"></div>'
    );
    root.querySelectorAll('.option').forEach(b => b.onclick = () => choose(+b.dataset.i));
  }

  function choose(i) {
    if (answered) return;
    answered = true;
    const s = G.stops[idx], o = s.options[i];
    score += o.points;
    const best = Math.max.apply(null, s.options.map(x => x.points));
    root.querySelectorAll('.option').forEach((b, j) => {
      b.disabled = true;
      if (s.options[j].points === best) b.classList.add('correct');
      else if (j === i) b.classList.add('wrong');
    });
    const last = idx === G.stops.length - 1;
    document.getElementById('after').innerHTML =
      '<div class="feedback">' + esc(o.feedback) + (o.points ? ' (+' + o.points + ')' : '') + '</div>' +
      (s.memory ? '<div class="memory">' + esc(s.memory) + '</div>' : '') +
      '<button class="btn" id="next">' + (last ? 'לסיום המסע' : 'ממשיכים לתחנה הבאה') + '</button>';
    document.getElementById('next').onclick = next;
  }

  function next() {
    idx++;
    if (idx >= G.stops.length) return finish();
    // animate vehicle on the existing map, then render the next stop
    const t = document.getElementById('traveler');
    const s = G.stops[idx];
    t.style.transform = 'translate(' + (px(s.lon) - 10) + 'px,' + (py(s.lat) + 7) + 'px)';
    setTimeout(showStop, 950);
  }

  function finish() {
    let end = G.endings[0];
    const pct = (score / maxScore) * 100;
    G.endings.forEach(e => { if (pct >= e.min) end = e; });
    const best = Store.finish('game', score);
    root.innerHTML = '<div class="card" style="text-align:center"><h2>המסע הסתיים</h2>' +
      '<p style="font-size:2.4rem;margin:0">🏁</p><h2>' + esc(end.title) + '</h2>' +
      '<p class="lead">' + esc(end.text) + '</p><p>ניקוד: <strong>' + score + ' מתוך ' + maxScore + '</strong> · שיא: ' + best + '</p>' +
      '<button class="btn" id="again">לצאת למסע חדש</button></div>';
    document.getElementById('again').onclick = start;
  }

  start();
})();
