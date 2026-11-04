// Per-browser persistence (localStorage). Every call is safe if storage is blocked or full.
window.Store = (function () {
  const P = 'sagi2026:';

  function get(key) {
    try { return JSON.parse(localStorage.getItem(P + key)); } catch (e) { return null; }
  }
  // Returns false if the value could not be saved (storage blocked or full)
  function set(key, val) {
    try { localStorage.setItem(P + key, JSON.stringify(val)); return true; } catch (e) { return false; }
  }
  function del(key) {
    try { localStorage.removeItem(P + key); } catch (e) {}
  }

  // Saved in-progress run { i, score }, or null if missing or out of range
  function progress(key, total) {
    const s = get(key);
    return s && Number.isInteger(s.i) && s.i > 0 && s.i < total && Number.isFinite(s.score) ? s : null;
  }

  // Records a finished run; returns the best score so far
  function finish(key, score) {
    del(key);
    const best = Math.max(score, get(key + ':best') || 0);
    set(key + ':best', best);
    return best;
  }

  // Start-screen extras: "continue" button (if a run is saved) and the best score line
  function startExtras(key, total, max, unit) {
    const p = progress(key, total), best = get(key + ':best');
    return (p ? '<p><button class="btn secondary" id="resume">להמשיך מהמקום שעצרתי (' + p.i + ' מתוך ' + total + ')</button></p>' : '') +
      (best ? '<p>השיא שלך: <strong>' + best + (max ? ' מתוך ' + max : '') + '</strong></p>' : '');
  }

  return { get: get, set: set, del: del, progress: progress, finish: finish, startExtras: startExtras };
})();
