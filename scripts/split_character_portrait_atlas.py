from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


LAYER_SIZE = (1254, 1254)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Split an evenly spaced portrait atlas into normalized character layers."
    )
    parser.add_argument("input", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("names", nargs="+")
    parser.add_argument("--columns", type=int, default=3)
    args = parser.parse_args()

    rows = (len(args.names) + args.columns - 1) // args.columns
    with Image.open(args.input) as source:
        atlas = source.convert("RGBA")
        cell_width = atlas.width // args.columns
        cell_height = atlas.height // rows
        args.output_dir.mkdir(parents=True, exist_ok=True)
        for index, name in enumerate(args.names):
            left = (index % args.columns) * cell_width
            top = (index // args.columns) * cell_height
            cell = atlas.crop((left, top, left + cell_width, top + cell_height))
            cell = cell.resize(LAYER_SIZE, Image.Resampling.LANCZOS)
            cell.save(args.output_dir / f"{name}.png")


if __name__ == "__main__":
    main()
