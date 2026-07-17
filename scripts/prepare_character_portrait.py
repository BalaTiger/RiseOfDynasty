from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize a generated character portrait for the game UI.")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    with Image.open(args.input) as source:
        portrait = ImageOps.fit(source.convert("RGB"), (512, 512), method=Image.Resampling.LANCZOS)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        portrait.save(args.output, "WEBP", quality=88, method=6)


if __name__ == "__main__":
    main()
