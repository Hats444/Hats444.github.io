from PIL import Image
from pathlib import Path

SRC = Path(r'c:\Users\boots\Downloads\hanork\assets\images')
OUT = Path(r'c:\Users\boots\Downloads\Hats444.github.io\assets\images')
OUT.mkdir(parents=True, exist_ok=True)

mapping = {
    'card-hanork.jpg': 'home.jpg',
    'card-div.jpg': 'telegram.jpg',
    'card-wa.jpg': 'support.jpg',
    'card-ig.jpg': 'instagram.jpg',
    'card-gh.jpg': 'wallet.jpg',
}

SIZE = 512

for out_name, src_name in mapping.items():
    im = Image.open(SRC / src_name).convert('RGB')
    w, h = im.size
    scale = min(SIZE / w, SIZE / h)
    nw, nh = int(w * scale), int(h * scale)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new('RGB', (SIZE, SIZE), (10, 10, 10))
    canvas.paste(im, ((SIZE - nw) // 2, (SIZE - nh) // 2))
    canvas.save(OUT / out_name, 'JPEG', quality=88, optimize=True)
    print(f'{out_name} OK ({w}x{h} -> {SIZE}x{SIZE})')

thumb = Image.open(OUT / 'card-hanork.jpg')
thumb.resize((128, 128), Image.Resampling.LANCZOS).save(OUT / 'logo-hanork.jpg', 'JPEG', quality=88)
print('logo-hanork.jpg OK')
