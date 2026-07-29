from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Remove only chroma-key pixels connected to the image border."
    )
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--threshold", type=int, default=72)
    parser.add_argument("--feather", type=float, default=0.55)
    args = parser.parse_args()

    image = Image.open(args.input).convert("RGB")
    width, height = image.size
    pixels = image.load()
    corners = [pixels[0, 0], pixels[width - 1, 0]]
    key = tuple(sum(color[channel] for color in corners) // len(corners) for channel in range(3))

    def is_key(x: int, y: int) -> bool:
        color = pixels[x, y]
        return max(abs(color[channel] - key[channel]) for channel in range(3)) <= args.threshold

    background = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        for y in (0, height - 1):
            if is_key(x, y):
                queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            if is_key(x, y):
                queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        index = y * width + x
        if background[index] or not is_key(x, y):
            continue
        background[index] = 255
        if x:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))

    alpha = Image.frombytes("L", (width, height), bytes(255 - value for value in background))
    if args.feather > 0:
        alpha = alpha.filter(ImageFilter.GaussianBlur(args.feather))
    result = image.convert("RGBA")
    result.putalpha(alpha)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.save(args.output)
    print(f"Wrote {args.output} with key {key}")


if __name__ == "__main__":
    main()
