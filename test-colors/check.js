// Runs the color hunt's own analyze() (from js/color-hunt.js) on photos that test.py already shrank.
// Usage: node check.js <pixel dir> [color-hunt.js] [--shares]
// Prints PASS/FAIL per photo, then which other game colors each photo would also pass.
// --shares also prints how much of each photo every colorful target covers (to pick SCATTER_MIN).
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const showShares = args.includes('--shares');
const [dir, file = path.join(__dirname, '..', 'js', 'color-hunt.js')] = args.filter(a => a !== '--shares');
const src = fs.readFileSync(file, 'utf8');
const items = JSON.parse(fs.readFileSync(path.join(dir, 'index.json')));

// Same thresholds as data/color-hunt-data.js, read from it so the test follows any change there
const data = {};
new Function('window', fs.readFileSync(path.join(__dirname, '..', 'data', 'color-hunt-data.js'), 'utf8'))(data);
const C = data.COLOR_HUNT;
const GAME = C.colors.map(c => c.color);

// analyze() draws the photo on a canvas and reads its pixels back; hand it the pre-shrunk pixels instead
let current;
const document = { createElement: () => ({ getContext: () => ({ drawImage() {}, getImageData: () => ({ data: current }) }) }) };
const cut = (from, to) => src.slice(src.indexOf(from), src.indexOf(to));
const body = cut('  const SAMPLE', '  const THUMB') + cut('  const NAMES', '  function esc') +
  'function pct(p) { return p.toFixed(0) + "%"; } for (const k in NAMES) NAMES[k] = k;' +  // English names in the output
  cut('  function hsv', '  function thumbnail');
const analyze = new Function('C', 'document', body + '; return analyze;')(C, document);

function run(it, color) {
  current = new Uint8ClampedArray(fs.readFileSync(path.join(dir, it.raw)));
  return analyze({ naturalWidth: it.w, naturalHeight: it.h }, color);
}

let passed = 0;
for (const it of items) {
  const r = run(it, it.color);
  if (r.ok) passed++;
  console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + it.color.padEnd(7) + ' share ' + r.share.toFixed(1).padStart(5) +
    '% patch ' + r.patch.toFixed(1).padStart(5) + '%  [' + r.top.join(', ') + ']  ' + it.file);
}
console.log(passed + '/' + items.length + ' passed\n\n--- also passes ---');
for (const it of items)
  console.log(it.color.padEnd(7) + it.file.padEnd(24) + GAME.filter(c => c !== it.color && run(it, c).ok).join(' '));

if (showShares) {
  const A = ['red', 'orange', 'yellow', 'blue', 'purple', 'pink'];
  console.log('\n--- share of each colorful target (* = the photo\'s own color) ---');
  console.log(''.padEnd(32) + A.map(a => a.padStart(7)).join(''));
  for (const it of items)
    console.log((it.color + ' ' + it.file).padEnd(32) + A.map(a =>
      ((a === it.color ? '*' : '') + run(it, a).share.toFixed(1)).padStart(7)).join(''));
}
