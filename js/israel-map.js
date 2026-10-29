/*
 * Shared map of Israel: projection helpers + base SVG (seas, land, neighbours, lakes).
 * Needs data/israel-map-data.js loaded first.
 */
window.IsraelMap = (function () {
  const D = window.IsraelMapData;
  // Visible window; W/H keep the aspect ratio right for ~31.5N (cos = 0.853)
  const LON0 = 33.8, LON1 = 36.4, LAT0 = 28.7, LAT1 = 33.6, H = 560;
  const W = Math.round(H * ((LON1 - LON0) * 0.853) / (LAT1 - LAT0));
  const px = lon => ((lon - LON0) / (LON1 - LON0)) * W;
  const py = lat => ((LAT1 - lat) / (LAT1 - LAT0)) * H;
  const lonOf = x => LON0 + (x / W) * (LON1 - LON0);
  const latOf = y => LAT1 - (y / H) * (LAT1 - LAT0);

  const path = rings => rings.map(r =>
    'M' + r.map(p => px(p[0]).toFixed(1) + ' ' + py(p[1]).toFixed(1)).join('L') + 'Z').join('');

  function seaLabel(text, lon, lat, anchor) {
    return '<text class="sea-label" x="' + px(lon).toFixed(1) + '" y="' + py(lat).toFixed(1) +
      '" text-anchor="' + (anchor || 'middle') + '">' + text + '</text>';
  }

  // Everything drawn under the pins: sea (background), neighbours, Israel, lakes, sea names.
  function baseSvg() {
    const neighbours = ['LBN', 'SYR', 'JOR', 'SAU', 'EGY'].map(k => '<path class="neighbour" d="' + path(D[k]) + '"/>').join('');
    return '<rect class="sea" x="0" y="0" width="' + W + '" height="' + H + '"/>' + neighbours +
      '<path class="land" d="' + path(D.ISR.concat(D.PSX)) + '"/>' +
      '<path class="lake" d="' + path(D.LAKES) + '"/>' +
      seaLabel('הים התיכון', 34.05, 32.2) +
      seaLabel('ים המלח', 35.62, 31.42, 'start') +
      seaLabel('כנרת', 35.67, 32.8, 'start') +
      seaLabel('מפרץ אילת', 34.95, 28.85, 'middle');
  }

  // Haversine distance in km
  function km(lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180, R = 6371;
    const a = Math.sin((lat2 - lat1) * r / 2) ** 2 +
      Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  return { W, H, px, py, lonOf, latOf, baseSvg, km };
})();
