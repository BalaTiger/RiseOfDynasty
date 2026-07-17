from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a contact sheet for portrait QA.")
    parser.add_argument("output", type=Path)
    parser.add_argument("inputs", nargs="+", type=Path)
    parser.add_argument("--columns", type=int, default=6)
    parser.add_argument("--size", type=int, default=192)
    args = parser.parse_args()

    rows = (len(args.inputs) + args.columns - 1) // args.columns
    sheet = Image.new("RGB", (args.columns * args.size, rows * args.size), "white")
    for index, path in enumerate(args.inputs):
        with Image.open(path) as source:
            portrait = ImageOps.fit(
                source.convert("RGB"),
                (args.size, args.size),
                method=Image.Resampling.LANCZOS,
            )
        sheet.paste(portrait, ((index % args.columns) * args.size, (index // args.columns) * args.size))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output, "WEBP", quality=88, method=6)


if __name__ == "__main__":
    main()
