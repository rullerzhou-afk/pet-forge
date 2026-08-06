"""Fix gray background bleed in extracted PNG frames.

Usage:
  python fix_gray_bleed.py <input_frames_dir> [output_frames_dir]
"""
import argparse
import glob
from pathlib import Path

from PIL import Image
import numpy as np

TARGET_HEIGHT = 200
MAX_COLORS = 192


def parse_args():
    parser = argparse.ArgumentParser(description="Remove cool gray edge bleed from RGBA animation frames.")
    parser.add_argument("input_frames_dir", help="directory containing PNG frames")
    parser.add_argument("output_frames_dir", nargs="?", help="output directory; defaults to <input>-fixed")
    parser.add_argument("--height", type=int, default=TARGET_HEIGHT, help="target frame height")
    parser.add_argument("--max-colors", type=int, default=MAX_COLORS, help="max colors per quantized frame")
    parser.add_argument("--pattern", default="*.png", help="frame filename glob, default *.png")
    return parser.parse_args()


def fix_frame(frame_path: str, output_path: Path, height: int, max_colors: int) -> int:
    img = Image.open(frame_path).convert("RGBA")
    arr = np.array(img)
    r = arr[:, :, 0].astype(float)
    g = arr[:, :, 1].astype(float)
    b = arr[:, :, 2].astype(float)
    a = arr[:, :, 3]

    cmax = np.maximum(r, np.maximum(g, b))
    cmin = np.minimum(r, np.minimum(g, b))
    delta = cmax - cmin
    brightness = cmax

    is_translucent = (a > 0) & (a < 255)
    is_gray_color = (delta < 35) & (brightness > 60) & (brightness < 200)
    is_gray = is_gray_color & is_translucent

    # Only touch cool gray pixels directly beside transparency. Applying the
    # color heuristic to the whole frame destroys legitimate gray characters.
    transparent = a <= 128
    padded = np.pad(transparent, 1, constant_values=False)
    near_transparent = (
        padded[:-2, :-2] | padded[:-2, 1:-1] | padded[:-2, 2:] |
        padded[1:-1, :-2] | padded[1:-1, 2:] |
        padded[2:, :-2] | padded[2:, 1:-1] | padded[2:, 2:]
    )
    # Guard: don't erase a gray pixel that sits next to an OPAQUE gray pixel
    # of similar brightness — that is the character's own anti-aliased edge,
    # not background bleed. Bleed is gray fuzz around a NON-gray character.
    opaque_gray = is_gray_color & (a >= 255)
    padded_og = np.pad(opaque_gray, 1, constant_values=False)
    near_opaque_gray = (
        padded_og[:-2, :-2] | padded_og[:-2, 1:-1] | padded_og[:-2, 2:] |
        padded_og[1:-1, :-2] | padded_og[1:-1, 2:] |
        padded_og[2:, :-2] | padded_og[2:, 1:-1] | padded_og[2:, 2:]
    )
    warm_ratio = (r + 1) / (b + 1)
    is_cool_gray = is_gray & (warm_ratio < 1.15) & near_transparent & ~near_opaque_gray

    fixed_pixels = int(np.sum(is_cool_gray))
    if fixed_pixels:
        arr[:, :, 3][is_cool_gray] = 0

    result = Image.fromarray(arr)
    ratio = height / result.height
    new_w = int(result.width * ratio)
    result = result.resize((new_w, height), Image.LANCZOS)
    result = result.quantize(
        colors=max_colors,
        method=Image.Quantize.FASTOCTREE,
        dither=Image.Dither.NONE,
    ).convert("RGBA")
    result.save(output_path, optimize=True)
    return fixed_pixels


def main():
    args = parse_args()
    input_dir = Path(args.input_frames_dir)
    output_dir = Path(args.output_frames_dir) if args.output_frames_dir else input_dir.with_name(f"{input_dir.name}-fixed")
    output_dir.mkdir(parents=True, exist_ok=True)

    frames = sorted(glob.glob(str(input_dir / args.pattern)))
    if not frames:
        raise SystemExit(f"No frames matched {input_dir / args.pattern}")

    fixed_count = 0
    for i, frame_path in enumerate(frames):
        output_path = output_dir / f"frame_{i + 1:03d}.png"
        fixed_pixels = fix_frame(frame_path, output_path, args.height, args.max_colors)
        if fixed_pixels:
            fixed_count += 1
            print(f"  frame_{i + 1:03d}: fixed {fixed_pixels} gray pixels")

    print(f"\nFixed {fixed_count}/{len(frames)} frames -> {output_dir}")


if __name__ == "__main__":
    main()
