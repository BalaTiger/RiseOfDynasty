from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Clear a thin alpha border left by atlas resampling or chroma keying."
    )
    parser.add_argument("inputs", nargs="+", type=Path)
    parser.add_argument("--width", type=int, default=1)
    args = parser.parse_args()

    for path in args.inputs:
        with Image.open(path) as source:
            image = source.convert("RGBA")
        alpha = image.getchannel("A")
        width = min(args.width, image.width // 2, image.height // 2)
        alpha.paste(0, (0, 0, image.width, width))
        alpha.paste(0, (0, image.height - width, image.width, image.height))
        alpha.paste(0, (0, 0, width, image.height))
        alpha.paste(0, (image.width - width, 0, image.width, image.height))
        image.putalpha(alpha)
        image.save(path)


if __name__ == "__main__":
    main()
