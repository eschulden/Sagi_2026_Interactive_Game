"""Test the color hunt's color check on the photos in test-colors/<Color>/.

Each photo is shrunk the way the browser does (longest side 160px, phone rotation applied), then
check.js runs the real analyze() from js/color-hunt.js on it.

    python test-colors/test.py                     # test the current js/color-hunt.js
    python test-colors/test.py --shares            # also print every color's share per photo
    python test-colors/test.py --old               # compare with the last committed version

Needs Python with Pillow (pip install pillow) and Node.
Add photos by dropping them into the folder named after their color (Blue, Brown, ...).
Only our own trail photos (2026*.jpg, shrunk to 400px) are committed; photos downloaded from the
web are kept local through .gitignore, since they belong to others. The test shrinks to 160px
anyway, so 400px gives the same results.
"""
import json, os, subprocess, sys, tempfile
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
SAMPLE = 160  # same as SAMPLE in js/color-hunt.js


def shrink(out):
    items = []
    for color in sorted(os.listdir(HERE)):
        folder = os.path.join(HERE, color)
        if not os.path.isdir(folder) or color.startswith('_'):  # _originals: full-size backups
            continue
        for f in sorted(os.listdir(folder)):
            if not f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                continue
            im = ImageOps.exif_transpose(Image.open(os.path.join(folder, f))).convert('RGBA')
            k = min(1, SAMPLE / max(im.size))
            w, h = max(1, round(im.size[0] * k)), max(1, round(im.size[1] * k))
            raw = f'{len(items)}.raw'
            with open(os.path.join(out, raw), 'wb') as fh:
                fh.write(im.resize((w, h), Image.BILINEAR).tobytes())
            items.append({'color': color.lower(), 'file': f, 'raw': raw, 'w': w, 'h': h})
    with open(os.path.join(out, 'index.json'), 'w') as fh:
        json.dump(items, fh)


def main():
    flags = [a for a in sys.argv[1:] if a in ('--shares',)]
    with tempfile.TemporaryDirectory() as tmp:
        shrink(tmp)
        check = os.path.join(HERE, 'check.js')
        if '--old' in sys.argv:
            old = os.path.join(tmp, 'old-color-hunt.js')
            with open(old, 'wb') as fh:
                fh.write(subprocess.check_output(['git', 'show', 'HEAD:js/color-hunt.js'], cwd=HERE))
            print('=== last committed version ===', flush=True)
            subprocess.run(['node', check, tmp, old] + flags)
            print('\n=== current version ===', flush=True)
        sys.exit(subprocess.run(['node', check, tmp] + flags).returncode)


if __name__ == '__main__':
    main()
