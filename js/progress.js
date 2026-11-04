/*
 * Activity recap + the group's good decisions, shared by summary.html and progress.html.
 * Expects MAX (best possible score per activity key) to be set by the page's data scripts.
 * Set window.DISCOVERED_ONLY = true to show only activities the group has visited (same rule as
 * the menu in js/site.js); if storage is blocked, everything is shown.
 */
(function () {
  // Same keys the games save under (see js/store.js, js/quiz.js)
  const ACTIVITIES = [
    { key: 'guess',                   file: 'guess.html' },
    { key: 'photohunt',               file: 'photo-gallery.html' },
    { key: 'colorhunt',               file: 'color-hunt.html' },
    { key: 'quiz:trail-markers.html', file: 'trail-markers.html' },
    { key: 'quiz:know-place.html',    file: 'know-place.html' },
    { key: 'quiz:quiz.html',          file: 'quiz.html' },
  ];
  let visited = null;
  try { visited = JSON.parse(localStorage.getItem('sagi2026:visited')) || []; } catch (e) {}
  const discovered = f => !window.DISCOVERED_ONLY || visited === null || visited.indexOf(f) !== -1;

  const byFile = {};
  PAGES.forEach(function (p) { byFile[p.file] = p; });
  const shown = ACTIVITIES.filter(a => discovered(a.file));
  const recap = document.getElementById('recap');
  recap.innerHTML = shown.map(function (a) {
    const p = byFile[a.file], best = Store.get(a.key + ':best');
    const line = best === null ? 'עוד לא סיימתם - אפשר לנסות!' : 'השיא שלכם: ' + best + ' מתוך ' + MAX[a.key];
    return '<a class="page-card" href="' + a.file + '"><div class="icon">' + p.icon + '</div><h3>' + p.title +
      '</h3><p>' + line + '</p></a>';
  }).join('');
  if (!shown.length) {
    recap.className = '';
    recap.innerHTML = '<div class="card" style="text-align:center"><p>עוד לא גיליתם פעילויות - הן יופיעו כאן כשתגיעו אליהן בשביל.</p></div>';
  }

  const mine = Store.get('decisions') || [];
  const box = document.getElementById('decisions');
  if (!mine.length && !discovered('memory-add.html')) {
    box.style.display = 'none';
    if (box.previousElementSibling) box.previousElementSibling.style.display = 'none'; // its heading
  } else if (!mine.length) {
    box.innerHTML = '<div class="card" style="text-align:center"><p>עוד לא לקחתם החלטה טובה.</p>' +
      '<a class="btn" href="memory-add.html">לקחת החלטה טובה</a></div>';
  } else {
    box.className = 'memories-wall';
    mine.forEach(function (d) {
      const card = document.createElement('div');
      card.className = 'card memory-card';
      const p = document.createElement('p');
      p.textContent = d.text;
      card.appendChild(p);
      box.appendChild(card);
    });
  }
})();
