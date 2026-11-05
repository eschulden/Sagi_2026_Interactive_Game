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

  // Main cities: [name, lat, lon, label side ('l' = left of the dot, 'r' = right), capital?]
  const CITIES = [
    ['קריית שמונה', 33.207, 35.570, 'l'],
    ['צפת', 32.965, 35.496, 'r'],
    ['חיפה', 32.794, 34.990, 'l'],
    ['טבריה', 32.795, 35.531, 'l'],
    ['עפולה', 32.607, 35.289, 'r'],
    ['נתניה', 32.329, 34.857, 'l'],
    ['תל אביב', 32.080, 34.781, 'l'],
    ['ירושלים', 31.778, 35.216, 'r', true],
    ['אשדוד', 31.804, 34.655, 'l'],
    ['באר שבע', 31.252, 34.791, 'r'],
    ['מצפה רמון', 30.610, 34.801, 'r'],
    ['אילת', 29.558, 34.952, 'r']
  ];

  function citiesSvg() {
    return '<g class="cities">' + CITIES.map(function (c) {
      const x = px(c[2]), y = py(c[1]), left = c[3] === 'l';
      return '<circle class="city-dot' + (c[4] ? ' capital' : '') + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) +
        '" r="' + (c[4] ? 3 : 2.2) + '"/><text class="city-label" x="' + (x + (left ? -4 : 4)).toFixed(1) +
        '" y="' + (y + 3).toFixed(1) + '" text-anchor="' + (left ? 'end' : 'start') + '">' + c[0] + '</text>';
    }).join('') + '</g>';
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
      seaLabel('מפרץ אילת', 34.95, 28.85, 'middle') +
      citiesSvg();
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
