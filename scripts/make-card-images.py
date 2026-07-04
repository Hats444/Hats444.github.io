from PIL import Image
from pathlib import Path

SRC = Path(r'c:\Users\boots\Downloads\hanork\assets\images')
OUT = Path(r'c:\Users\boots\Downloads\Hats444.github.io\assets\images')
OUT.mkdir(parents=True, exist_ok=True)

SIZE = 512
MENU = SRC / 'home.jpg'
BANNER = SRC / '.jpg'


def load_rgb(path: Path) -> Image.Image:
    return Image.open(path).convert('RGB')


def crop_square(im: Image.Image, left: int = 0, top: int = 0) -> Image.Image:
    w, h = im.size
    side = min(w, h)
    left = max(0, min(left, w - side))
    top = max(0, min(top, h - side))
    box = (left, top, left + side, top + side)
    return im.crop(box).resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def center_square(im: Image.Image) -> Image.Image:
    w, h = im.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return crop_square(im, left, top)


menu = load_rgb(MENU)
banner = load_rgb(BANNER)
mw, mh = menu.size
side = min(mw, mh)

# Cada card = recorte diferente das artes reais do Hanork (não a mesma thumb 5x).
jobs = {
    'card-hanork.jpg': center_square(banner),
    'card-div.jpg': crop_square(menu, 0, 0),
    'card-wa.jpg': crop_square(menu, (mw - side) // 2, 0),
    'card-ig.jpg': crop_square(menu, mw - side, 0),
    'card-gh.jpg': crop_square(banner, 0, 0),
}

for name, img in jobs.items():
    img.save(OUT / name, 'JPEG', quality=88, optimize=True)
    print(f'{name} OK ({img.size[0]}x{img.size[1]})')

logo = Image.open(OUT / 'card-hanork.jpg')
logo.resize((128, 128), Image.Resampling.LANCZOS).save(OUT / 'logo-hanork.jpg', 'JPEG', quality=88)
print('logo-hanork.jpg OK')
