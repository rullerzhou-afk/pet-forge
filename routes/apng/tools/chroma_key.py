"""Chroma key (green screen removal) for APNG animation pipelines.

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

# Green screen HSV range (tuned for #00B140 ± tolerance)
HUE_MIN, HUE_MAX = 80, 160       # green hue range on a 0-360 scale
SAT_MIN = 40                      # minimum saturation to count as "green"
BRIGHT_MIN = 30                   # minimum brightness


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

    # Convert to float HSV manually (avoid opencv dependency)
    rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
    cmax = np.maximum(rf, np.maximum(gf, bf))
    cmin = np.minimum(rf, np.minimum(gf, bf))
    delta = cmax - cmin

    # Hue (0-360)
    hue = np.zeros_like(rf)
    mask_r = (cmax == rf) & (delta > 0)
    mask_g = (cmax == gf) & (delta > 0)
    mask_b = (cmax == bf) & (delta > 0)
    hue[mask_r] = 60 * (((gf[mask_r] - bf[mask_r]) / delta[mask_r]) % 6)
    hue[mask_g] = 60 * (((bf[mask_g] - rf[mask_g]) / delta[mask_g]) + 2)
    hue[mask_b] = 60 * (((rf[mask_b] - gf[mask_b]) / delta[mask_b]) + 4)

    # Saturation (0-100)
    sat = np.zeros_like(cmax)
    np.divide(delta, cmax, out=sat, where=cmax > 0)
    sat *= 100

    # Value/Brightness (0-100)
    val = cmax * 100

    # Green mask: pixels that are green enough by hue, or close to the requested key color.
    key_r, key_g, key_b = [float(c) for c in key_rgb]
    dist_to_key = np.sqrt(
        (r.astype(float) - key_r) ** 2 +
        (g.astype(float) - key_g) ** 2 +
        (b.astype(float) - key_b) ** 2
    )
    is_hsv_green = (hue >= HUE_MIN) & (hue <= HUE_MAX) & (sat >= SAT_MIN) & (val >= BRIGHT_MIN)
    is_key_color = dist_to_key <= tolerance
    is_green = is_hsv_green | is_key_color

    # Soft edge: pixels NEAR the green screen zone get partial transparency.
    # The green_ratio > 0.45 heuristic is intentionally gated behind a
    # proximity check — without it, any yellow / yellow-green pixel anywhere
    # in the frame (beaks, eyes, stars, clothing) gets its alpha crushed to
    # 30% even though it is nowhere near the key color.
    green_ratio = gf / (rf + gf + bf + 0.001)
    near_key_edge = dist_to_key <= max(tolerance * 1.8, tolerance + 35)
    # Dilate is_green by 1px so the soft-edge only touches pixels adjacent to
    # the actual green-screen region.
    padded_green = np.pad(is_green, 1, constant_values=False)
    near_green_zone = (
        padded_green[:-2, :-2] | padded_green[:-2, 1:-1] | padded_green[:-2, 2:] |
        padded_green[1:-1, :-2] | padded_green[1:-1, 2:] |
        padded_green[2:, :-2] | padded_green[2:, 1:-1] | padded_green[2:, 2:]
    )
    is_semi_green = ((green_ratio > 0.45) | near_key_edge) & (sat >= SAT_MIN * 0.5) & ~is_green & near_green_zone

    # Apply
    new_a = a.copy()
    new_a[is_green] = 0
    new_a[is_semi_green] = (new_a[is_semi_green] * 0.3).astype(np.uint8)

    # Despill: remove green tint from ALL surviving pixels
    # Any pixel where green dominates more than it should gets corrected
    surviving = new_a > 0
    if np.any(surviving):
        rs, gs, bs = r[surviving].astype(float), g[surviving].astype(float), b[surviving].astype(float)
        avg_rb = (rs + bs) / 2
        # If green exceeds the average of R and B, cap it
        too_green = gs > avg_rb
        if np.any(too_green):
            corrected_g = gs.copy()
            corrected_g[too_green] = avg_rb[too_green] * 0.85 + gs[too_green] * 0.15
            arr[:,:,1][surviving] = np.clip(corrected_g, 0, 255).astype(np.uint8)

    # Also erode alpha edges by 1px to remove any remaining fringe
    from PIL import ImageFilter
    alpha_ch = Image.fromarray(new_a)
    alpha_ch = alpha_ch.filter(ImageFilter.MinFilter(3))
    arr[:,:,3] = np.array(alpha_ch)

    return Image.fromarray(arr)


def probe_video_fps(video_path: str) -> float:
    """Probe the input video's native frame rate via ffprobe.

    Returns 24.0 (the historical assumption) as a fallback when ffprobe is
    unavailable or the stream metadata is missing, so behaviour degrades
    gracefully instead of crashing.
    """
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=r_frame_rate",
                "-of", "csv=p=0",
                video_path,
            ],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            return 24.0
        rate_str = result.stdout.strip()
        if not rate_str:
            return 24.0
        if "/" in rate_str:
            num, den = rate_str.split("/")
            den_f = float(den)
            return float(num) / den_f if den_f else 24.0
        return float(rate_str)
    except (Exception,):
        return 24.0


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

        # Step 2: Downsample to target FPS.
        # Probe the source video's native fps instead of assuming 24 — many
        # generation APIs return 30 or 60 fps, and a wrong assumption makes
        # the animation play at the wrong speed.
        source_fps = probe_video_fps(input_video)
        step = max(1, round(source_fps / args.fps))
        selected = raw_frames[::step]
        print(f"[2/5] Downsampled {len(raw_frames)} -> {len(selected)} frames "
              f"(source {source_fps:.1f}fps -> target {args.fps}fps, step={step})")

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
