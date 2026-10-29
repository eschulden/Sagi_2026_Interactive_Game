(function () {
  const Q = window.QUIZ;
  const root = document.getElementById('quiz');
  let i = 0, score = 0, answered = false;

  function esc(t) { return String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  // An option is plain text, or { marker: [top, middle, bottom] } to show a trail marker
  function optionHtml(o) {
    return typeof o === 'string' ? esc(o) : window.TrailMarker.svg(o.marker, 84);
  }

  function figures(list) {
    return '<div class="marker-show">' + list.map(r => '<figure style="margin:0 8px;display:inline-block;text-align:center">' + (r.stepped ? window.TrailMarker.stepped(r.stepped, 110, r.rev) : window.TrailMarker.svg(r.marker, 110, r.dot)) + (r.label ? '<figcaption>' + esc(r.label) + '</figcaption>' : '') + '</figure>').join('') + '</div>';
  }

  function start() {
    i = 0; score = 0;
    root.innerHTML = '<div class="card" style="text-align:center"><p class="lead">' + esc(Q.intro) +
      '</p><button class="btn" id="go">מתחילים</button></div>';
    document.getElementById('go').onclick = show;
  }

  function show() {
    answered = false;
    const q = Q.questions[i];
    root.innerHTML = '<div class="card">' +
      '<div class="stats"><span>שאלה ' + (i + 1) + ' מתוך ' + Q.questions.length + '</span><span>נכונות: ' + score + '</span></div>' +
      '<div class="progress"><div style="width:' + (i / Q.questions.length) * 100 + '%"></div></div>' +
      (q.show ? figures(q.show) : '') +
      (q.marker ? '<div class="marker-show">' + window.TrailMarker.svg(q.marker, 110) + '</div>' : '') +
      '<h2>' + esc(q.q) + '</h2>' +
      '<div class="options' + (typeof q.options[0] === 'string' ? '' : ' visual') + '">' + q.options.map((o, k) => '<button class="option" data-i="' + k + '">' + optionHtml(o) + '</button>').join('') + '</div>' +
      '<div id="after"></div></div>';
    root.querySelectorAll('.option').forEach(b => b.onclick = () => pick(+b.dataset.i));
  }

  function pick(k) {
    if (answered) return;
    answered = true;
    const q = Q.questions[i];
    const ok = k === q.answer;
    if (ok) score++;
    root.querySelectorAll('.option').forEach((b, j) => {
      b.disabled = true;
      if (j === q.answer) b.classList.add('correct');
      else if (j === k) b.classList.add('wrong');
    });
    const last = i === Q.questions.length - 1;
    document.getElementById('after').innerHTML =
      '<div class="feedback">' + (ok ? 'נכון! ' : 'לא בדיוק. ') + (q.note ? esc(q.note) : '') + '</div>' +
      (q.reveal ? figures(q.reveal) : '') +
      '<button class="btn" id="next">' + (last ? 'לתוצאה' : 'לשאלה הבאה') + '</button>';
    document.getElementById('next').onclick = () => { i++; i < Q.questions.length ? show() : finish(); };
  }

  function finish() {
    const pct = (score / Q.questions.length) * 100;
    let end = Q.endings[0];
    Q.endings.forEach(e => { if (pct >= e.min) end = e; });
    root.innerHTML = '<div class="card" style="text-align:center"><h2>סיימתם!</h2>' +
      '<p style="font-size:2.4rem;margin:0">❤️</p>' +
      '<p>ענית נכון על <strong>' + score + ' מתוך ' + Q.questions.length + '</strong></p>' +
      '<p class="lead">' + esc(end.text) + '</p><button class="btn" id="again">שוב</button></div>';
    document.getElementById('again').onclick = start;
  }

  start();
})();
