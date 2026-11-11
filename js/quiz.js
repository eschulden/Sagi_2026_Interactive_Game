(function () {
  const Q = window.QUIZ;
  const root = document.getElementById('quiz');
  // One save slot per quiz page (sagi-quiz.html, know-place.html, trail-markers.html)
  const KEY = 'quiz:' + (location.pathname.split('/').pop() || 'sagi-quiz.html');
  // answers[k] = option chosen for question k (undefined until answered). An answer is
  // final: going back shows it again but can't change it, so the score can't be gamed.
  // reviewing = looking back over a finished run from the results page (nothing is saved)
  let i = 0, answers = [], reviewing = false;

  function score() { return answers.filter((a, k) => a === Q.questions[k].answer).length; }

  function esc(t) { return String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  // An option is plain text, or { marker: [top, middle, bottom] } to show a trail marker
  function optionHtml(o) {
    return typeof o === 'string' ? esc(o) : window.TrailMarker.svg(o.marker, 84);
  }

  function figures(list) {
    return '<div class="marker-show">' + list.map(r => '<figure style="margin:0 8px;display:inline-block;text-align:center">' + (r.stepped ? window.TrailMarker.stepped(r.stepped, 110, r.rev) : window.TrailMarker.svg(r.marker, 110, r.dot)) + (r.label ? '<figcaption>' + esc(r.label) + '</figcaption>' : '') + '</figure>').join('') + '</div>';
  }

  function start() {
    i = 0; answers = []; reviewing = false;
    root.innerHTML = '<div class="card" style="text-align:center"><p class="lead">' + esc(Q.intro) +
      '</p><button class="btn" id="go">מתחילים</button>' + Store.startExtras(KEY, Q.questions.length, Q.questions.length) +
      (lastRun() ? '<p><button class="btn secondary" id="last">לצפייה בתוצאות האחרונות</button></p>' : '') + '</div>';
    document.getElementById('go').onclick = show;
    const l = document.getElementById('last');
    if (l) l.onclick = () => { answers = lastRun(); reviewing = true; finish(); };
    const r = document.getElementById('resume');
    if (r) r.onclick = () => {
      const p = Store.progress(KEY, Q.questions.length);
      i = p.i; answers = Array.isArray(p.answers) ? p.answers.map(a => a === null ? undefined : a) : [];
      show();
    };
  }

  // Answers of the last finished run (kept so the results can be viewed again later), or null
  function lastRun() {
    const l = Store.get(KEY + ':last');
    return l && Array.isArray(l.answers) && l.answers.length === Q.questions.length ? l.answers : null;
  }

  // Resume point is the furthest question reached, even while looking back at earlier ones
  function save() {
    if (reviewing) return;
    const far = Math.max(i, Math.min(answers.length, Q.questions.length - 1));
    Store.set(KEY, { i: far, score: score(), answers: answers });
  }

  function show() {
    save();
    const q = Q.questions[i];
    root.innerHTML = '<div class="card">' +
      '<div class="stats"><span class="q-nav">' +
        'שאלה ' + (i + 1) + ' מתוך ' + Q.questions.length +
        '<span class="q-arrows">' +
          '<button class="q-arrow" id="prev" aria-label="לשאלה הקודמת">‹</button>' +
          '<button class="q-arrow" id="fwd" aria-label="לשאלה הבאה">›</button>' +
        '</span></span><span>נכונות: <span id="score">' + score() + '</span></span></div>' +
      '<div class="progress"><div style="width:' + (i / Q.questions.length) * 100 + '%"></div></div>' +
      (q.show ? figures(q.show) : '') +
      (q.marker ? '<div class="marker-show">' + window.TrailMarker.svg(q.marker, 110) + '</div>' : '') +
      '<h2>' + esc(q.q) + '</h2>' +
      '<div class="options' + (typeof q.options[0] === 'string' ? '' : ' visual') + '">' + q.options.map((o, k) => '<button class="option" data-i="' + k + '">' + optionHtml(o) + '</button>').join('') + '</div>' +
      '<div id="after"></div><div id="nav"></div></div>';
    root.querySelectorAll('.option').forEach(b => b.onclick = () => pick(+b.dataset.i));
    if (answers[i] !== undefined) reveal(); else nav();
  }

  function pick(k) {
    if (answers[i] !== undefined) return;
    answers[i] = k;
    save();
    document.getElementById('score').textContent = score();
    reveal();
  }

  // Marks the chosen answer and shows the explanation (just answered, or revisited)
  function reveal() {
    const q = Q.questions[i], k = answers[i];
    const ok = k === q.answer;
    root.querySelectorAll('.option').forEach((b, j) => {
      b.disabled = true;
      if (j === q.answer) b.classList.add('correct');
      else if (j === k) b.classList.add('wrong');
    });
    document.getElementById('after').innerHTML =
      '<div class="feedback">' + (ok ? 'נכון! ' : 'לא בדיוק. ') + (q.note ? esc(q.note) : '') + '</div>' +
      (q.reveal ? figures(q.reveal) : '') +
      (q.image ? '<img class="quiz-photo" src="' + esc(q.image) + '" alt="">' : '');
    nav();
  }

  // Small arrows by the question counter: back (from the 2nd question on) and forward
  // (once this question is answered). The big button under the explanation also goes forward.
  function nav() {
    const answered = answers[i] !== undefined, last = i === Q.questions.length - 1;
    const forward = () => { i++; i < Q.questions.length ? show() : finish(); };
    const p = document.getElementById('prev'), f = document.getElementById('fwd');
    p.disabled = i === 0;
    p.onclick = () => { i--; show(); };
    f.disabled = !answered;
    f.onclick = forward;
    document.getElementById('nav').innerHTML = answered ? '<button class="btn" id="next">' + (last ? 'לתוצאה' : 'לשאלה הבאה') + '</button>' : '';
    if (answered) document.getElementById('next').onclick = forward;
  }

  function finish() {
    const s = score();
    const pct = (s / Q.questions.length) * 100;
    let end = Q.endings[0];
    Q.endings.forEach(e => { if (pct >= e.min) end = e; });
    // Record the run once; coming back here from the review just shows the result again
    if (!reviewing) Store.set(KEY + ':last', { answers: answers });
    const best = reviewing ? Store.get(KEY + ':best') || s : Store.finish(KEY, s);
    reviewing = true;
    root.innerHTML = '<div class="card" style="text-align:center"><h2>' + Group.cheer() + '</h2>' +
      '<p style="font-size:2.4rem;margin:0">❤️</p>' +
      '<p>ענית נכון על <strong>' + s + ' מתוך ' + Q.questions.length + '</strong> · שיא: ' + best + '</p>' +
      '<p class="lead">' + esc(end.text) + '</p>' +
      '<div class="btn-row"><button class="btn secondary" id="review">לצפייה בשאלות ובתשובות</button><button class="btn" id="again">שוב</button></div>' +
      Group.nextStop() + '</div>';
    document.getElementById('review').onclick = () => { i = 0; show(); };
    document.getElementById('again').onclick = start;
  }

  start();
})();
