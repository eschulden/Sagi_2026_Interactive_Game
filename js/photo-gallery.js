// All "איפה צילמתי?" photos; each opens photo-hunt.html?photo=N. Green = found, red = gave up.
(function () {
  const H = window.PHOTO_HUNT;
  const root = document.getElementById('photo-gallery');
  const hidden = location.search.indexOf('hidden') !== -1 ? '&hidden' : '';

  function esc(t) { return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function render() {
    const results = Store.get('photohunt:results') || {};
    let found = 0;
    const tiles = H.photos.map(function (p, i) {
      const pts = results[p.image];
      let cls = '', label = 'עוד לא ניסיתם';
      if (typeof pts === 'number') {
        if (pts > 0) { found++; cls = ' found'; label = '✅ נמצאה · ' + pts + ' נקודות'; }
        else { cls = ' missed'; label = '❌ לא נמצאה'; }
      }
      return '<a class="photo-tile' + cls + '" href="photo-hunt.html?photo=' + (i + 1) + hidden + '">' +
        '<img src="' + esc(p.image) + '" alt="תמונה ' + (i + 1) + '" loading="lazy">' +
        '<span class="photo-tile-label"><strong>תמונה ' + (i + 1) + '</strong>' + label + '</span></a>';
    }).join('');
    root.innerHTML = '<p class="lead">' + esc(H.intro) + '</p>' +
      '<p class="photo-count">נמצאו <strong>' + found + '</strong> מתוך ' + H.photos.length + '</p>' +
      '<div class="photo-grid">' + tiles + '</div>';
  }

  render();
})();
