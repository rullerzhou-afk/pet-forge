"""Solid-color chroma key removal for APNG animation pipelines.

Usage:
  python chroma_key.py <input_video> [output_apng] [--plays 0]

Pipeline: video -> extract frames -> chroma key -> resize -> quantize -> APNG
"""
import argparse
import glob
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image
import numpy as np

# Default config
TARGET_HEIGHT = 200
TARGET_FPS = 8
MAX_COLORS = 192
PLAYS = 1          # 1 = play once, 0 = loop forever
DEFAULT_KEY_RGB = (0, 177, 64)

def parse_key_color(value: str) -> tuple[int, int, int]:
    raw = value.strip()
    if raw.startswith("#"):
        raw = raw[1:]
    if len(raw) != 6:
        raise argparse.ArgumentTypeError("key color must be a 6-digit hex color, such as #00B140")
    try:
        return tuple(int(raw[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError as exc:
        raise argparse.ArgumentTypeError("key color must be a 6-digit hex color") from exc


def chroma_key_frame(
    img: Image.Image,
    key_rgb: tuple[int, int, int] = DEFAULT_KEY_RGB,
    tolerance: float = 50,
) -> Image.Image:
    """Remove key-color background from a single RGBA frame."""
    arr = np.array(img.convert('RGBA'))
    r, g, b, a = arr[:,:,0], arr[:,:,1], arr[:,:,2], arr[:,:,3]

    # Measure only distance from the requested key. The previous implementation
    # always ORed in a broad green-hue mask and always despilled green, so using
    # --key-color with magenta still erased legitimate green subjects.
    key_r, key_g, key_b = [float(c) for c in key_rgb]
    dist_to_key = np.sqrt(
        (r.astype(float) - key_r) ** 2 +
        (g.astype(float) - key_g) ** 2 +
        (b.astype(float) - key_b) ** 2
    )
    is_key_color = dist_to_key <= tolerance

    # Fade pixels between the hard tolerance and a wider edge tolerance. This
    # handles compression and antialiasing around any requested key color.
    edge_tolerance = max(tolerance * 1.8, tolerance + 35)
    is_key_edge = (dist_to_key > tolerance) & (dist_to_key <= edge_tolerance)
    edge_span = max(edge_tolerance - tolerance, 1.0)
    edge_coverage = np.clip((dist_to_key - tolerance) / edge_span, 0.0, 1.0)

    # Apply
    new_a = a.copy()
    new_a[is_key_color] = 0
    new_a[is_key_edge] = (
        new_a[is_key_edge].astype(float) * edge_coverage[is_key_edge]
    ).astype(np.uint8)

    # Remove key-color spill from partially transparent edge pixels. Assuming
    # observed = coverage * foreground + (1 - coverage) * key, solve for the
    # foreground color. Restrict this to the edge band so opaque subject colors
    # remain byte-for-byte unchanged.
    recoverable_edge = is_key_edge & (edge_coverage > 0.05)
    if np.any(recoverable_edge):
        coverage = edge_coverage[recoverable_edge]
        observed = arr[:, :, :3][recoverable_edge].astype(float)
        key = np.array(key_rgb, dtype=float)
        recovered = (observed - (1.0 - coverage[:, None]) * key) / coverage[:, None]
        arr[:, :, :3][recoverable_edge] = np.clip(recovered, 0, 255).astype(np.uint8)

    # Also erode alpha edges by 1px to remove any remaining fringe
    from PIL import ImageFilter
    alpha_ch = Image.fromarray(new_a)
    alpha_ch = alpha_ch.filter(ImageFilter.MinFilter(3))
    arr[:,:,3] = np.array(alpha_ch)

    return Image.fromarray(arr)


def parse_args():
    parser = argparse.ArgumentParser(description="Remove a solid key-color background and assemble APNG.")
    parser.add_argument("input_video", help="input video path")
    parser.add_argument("output_apng", nargs="?", help="output APNG path; defaults beside input video")
    parser.add_argument("--plays", type=int, default=PLAYS, help="APNG play count: 0 loops forever, 1 plays once")
    parser.add_argument("--key-color", type=parse_key_color, default=DEFAULT_KEY_RGB, help="hex key color, default #00B140")
    parser.add_argument("--tolerance", type=float, default=50, help="RGB distance tolerance for key-color removal")
    parser.add_argument("--fps", type=int, default=TARGET_FPS, help="target APNG frame rate")
    parser.add_argument("--height", type=int, default=TARGET_HEIGHT, help="target frame height in pixels")
    parser.add_argument("--max-colors", type=int, default=MAX_COLORS, help="max colors per quantized frame")
    return parser.parse_args()


def main():
    args = parse_args()
    input_video = args.input_video
    output_apng = args.output_apng or str(Path(input_video).with_suffix(".apng"))
    Path(output_apng).parent.mkdir(parents=True, exist_ok=True)

    workdir = tempfile.mkdtemp(prefix="pet-forge-chroma-")
    raw_dir = os.path.join(workdir, "raw")
    key_dir = os.path.join(workdir, "keyed")
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(key_dir, exist_ok=True)

    try:
        # Step 1: Extract all frames
        print(f"[1/5] Extracting frames from {input_video}...")
        result = subprocess.run([
            "ffmpeg", "-y", "-i", input_video,
            os.path.join(raw_dir, "frame_%03d.png")
        ], capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or "ffmpeg frame extraction failed")

        raw_frames = sorted(glob.glob(os.path.join(raw_dir, "*.png")))
        if not raw_frames:
            raise RuntimeError("no frames extracted from input video")
        print(f"      {len(raw_frames)} frames extracted")

        # Step 2: Downsample to target FPS (assume most generation APIs return 24fps video)
        step = max(1, round(24 / args.fps))
        selected = raw_frames[::step]
        print(f"[2/5] Downsampled {len(raw_frames)} -> {len(selected)} frames ({args.fps}fps)")

        # Step 3: Chroma key + resize + quantize
        print(f"[3/5] Chroma keying + resize to {args.height}px + quantize to {args.max_colors} colors...")
        for i, frame_path in enumerate(selected):
            img = Image.open(frame_path).convert('RGBA')
            img = chroma_key_frame(img, key_rgb=args.key_color, tolerance=args.tolerance)

            ratio = args.height / img.height
            new_w = int(img.width * ratio)
            img = img.resize((new_w, args.height), Image.LANCZOS)

            img = img.quantize(
                colors=args.max_colors,
                method=Image.Quantize.FASTOCTREE,
                dither=Image.Dither.NONE,
            ).convert('RGBA')

            img.save(os.path.join(key_dir, f"frame_{i+1:03d}.png"), optimize=True)
            if (i + 1) % 10 == 0:
                print(f"      {i+1}/{len(selected)} frames done")

        print(f"      All {len(selected)} frames processed")

        # Step 4: Assemble APNG
        print(f"[4/5] Assembling APNG (plays={args.plays})...")
        result = subprocess.run([
            "ffmpeg", "-y", "-framerate", str(args.fps),
            "-i", os.path.join(key_dir, "frame_%03d.png"),
            "-plays", str(args.plays), "-f", "apng", output_apng
        ], capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or "ffmpeg APNG assembly failed")

        size_kb = os.path.getsize(output_apng) / 1024
        print(f"[5/5] Done! -> {output_apng} ({size_kb:.0f}KB)")

        if size_kb > 500:
            print("      WARNING: File > 500KB, consider reducing --height or --max-colors")
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
        print("      Temp files cleaned up")


if __name__ == "__main__":
    main()
