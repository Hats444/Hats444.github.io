from PIL import Image
from pathlib import Path

# Mesmas 5 fotos que o bot Hanork rota no PV (infos/menu.jpg … menu5.jpg).
INFOS = Path(r'c:\Users\boots\Downloads\hanork\infos')
OUT = Path(r'c:\Users\boots\Downloads\Hats444.github.io\assets\images')
OUT.mkdir(parents=True, exist_ok=True)

SIZE = 512
BG = (10, 10, 10)

MAPPING = {
    'card-hanork.jpg': 'menu.jpg',
    'card-div.jpg': 'menu2.jpg',
    'card-wa.jpg': 'menu3.jpg',
    'card-ig.jpg': 'menu4.jpg',
    'card-gh.jpg': 'menu5.jpg',
}


def letterbox_square(path: Path) -> Image.Image:
    """Encaixa a foto inteira (16:9) num quadrado — sem cortar."""
    im = Image.open(path).convert('RGB')
    w, h = im.size
    scale = min(SIZE / w, SIZE / h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new('RGB', (SIZE, SIZE), BG)
    canvas.paste(im, ((SIZE - nw) // 2, (SIZE - nh) // 2))
    return canvas


for out_name, src_name in MAPPING.items():
    src = INFOS / src_name
    if not src.exists():
        raise SystemExit(f'missing {src}')
    img = letterbox_square(src)
    img.save(OUT / out_name, 'JPEG', quality=88, optimize=True)
    print(f'{out_name} <= {src_name} OK')

logo = letterbox_square(INFOS / 'menu.jpg')
logo.resize((128, 128), Image.Resampling.LANCZOS).save(OUT / 'logo-hanork.jpg', 'JPEG', quality=88)
print('logo-hanork.jpg OK')
