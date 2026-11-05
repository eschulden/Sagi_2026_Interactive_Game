/*
 * Trail-marker graphics. A marker is [top, middle, bottom] stripe colours,
 * e.g. ['#d32f2f', '#fff', '#d32f2f'] (red trail) or the Israel National Trail:
 * ['#f08a1c', '#fff', '#1e5bb8'].
 */
window.TrailMarker = {
  COLORS: { red: '#d32f2f', green: '#2e8b3e', blue: '#1e5bb8', black: '#222', orange: '#f08a1c', white: '#fff', purple: '#7b3fa0' },
  // a null stripe is left transparent; dot ('#hex') adds a coloured dot in the corner of the top stripe
  svg: function (stripes, width, dot) {
    const w = width || 72, h = Math.round(w * 0.75), s = h / 3;
    return '<svg class="marker" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="סימון שביל">' +
      stripes.map((c, i) => c ? '<rect x="0" y="' + i * s + '" width="' + w + '" height="' + s + '" fill="' + c + '"/>' : '').join('') +
      (dot ? '<circle cx="' + (w - h / 6 - 3) + '" cy="' + (h / 6 + 3) + '" r="' + h / 6 + '" fill="' + dot + '"/>' : '') +
      '<rect x=".75" y=".75" width="' + (w - 1.5) + '" height="' + (h - 1.5) + '" rx="4" fill="none" stroke="#8a8478" stroke-width="1.5"/></svg>';
  },
  // Graduated marker: three vertical brush strokes (left to right), each stepped lower than the last
  // (rev: stepped higher than the last instead)
  stepped: function (colors, width, rev) {
    const w = width || 110, sw = w / 4, gap = 0, drop = w * 0.12, h = w * 0.9, sh = h - 2 * drop;
    const total = colors.length * sw + (colors.length - 1) * gap;
    const x0 = (w - total) / 2;
    return '<svg class="marker" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="סימון מדורג">' +
      colors.map((c, i) => '<rect x="' + (x0 + i * (sw + gap)) + '" y="' + ((rev ? colors.length - 1 - i : i) * drop) + '" width="' + sw + '" height="' + sh + '" rx="' + sw / 4 + '" fill="' + c + '" stroke="#8a8478" stroke-width=".75"/>').join('') +
      '</svg>';
  }
};
