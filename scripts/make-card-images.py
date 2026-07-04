from PIL import Image
from pathlib import Path

# Mesmas 5 fotos que o bot Hanork rota no PV (infos/menu.jpg … menu5.jpg).
INFOS = Path(r'c:\Users\boots\Downloads\hanork\infos')
OUT = Path(r'c:\Users\boots\Downloads\Hats444.github.io\assets\images')
OUT.mkdir(parents=True, exist_ok=True)

SIZE = 512

# card do site → foto de menu do bot (ordem menuSortKey em menuPhoto.js)
MAPPING = {
    'card-hanork.jpg': 'menu.jpg',
    'card-div.jpg': 'menu2.jpg',
    'card-wa.jpg': 'menu3.jpg',
    'card-ig.jpg': 'menu4.jpg',
    'card-gh.jpg': 'menu5.jpg',
}


def center_square(path: Path) -> Image.Image:
    im = Image.open(path).convert('RGB')
    w, h = im.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return im.crop((left, top, left + side, top + side)).resize(
        (SIZE, SIZE), Image.Resampling.LANCZOS
    )


for out_name, src_name in MAPPING.items():
    src = INFOS / src_name
    if not src.exists():
        raise SystemExit(f'missing {src}')
    img = center_square(src)
    img.save(OUT / out_name, 'JPEG', quality=88, optimize=True)
    print(f'{out_name} <= {src_name} OK')

logo = Image.open(OUT / 'card-hanork.jpg')
logo.resize((128, 128), Image.Resampling.LANCZOS).save(OUT / 'logo-hanork.jpg', 'JPEG', quality=88)
print('logo-hanork.jpg OK')
