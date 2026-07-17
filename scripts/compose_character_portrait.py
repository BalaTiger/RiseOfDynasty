from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


SIZE = (512, 512)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Composite a transparent character layer over a fixed rarity background."
    )
    parser.add_argument("background", type=Path)
    parser.add_argument("foreground", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    with Image.open(args.background) as source:
        background = ImageOps.fit(
            source.convert("RGBA"), SIZE, method=Image.Resampling.LANCZOS
        )
    with Image.open(args.foreground) as source:
        foreground = ImageOps.fit(
            source.convert("RGBA"), SIZE, method=Image.Resampling.LANCZOS
        )

    portrait = Image.alpha_composite(background, foreground).convert("RGB")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    portrait.save(args.output, "WEBP", quality=90, method=6)


if __name__ == "__main__":
    main()
