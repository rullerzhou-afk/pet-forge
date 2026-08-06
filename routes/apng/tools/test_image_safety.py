"""Small regression checks for destructive APNG post-processing behavior."""
import importlib.util
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image


HERE = Path(__file__).resolve().parent


def load_module(name):
    spec = importlib.util.spec_from_file_location(name, HERE / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    chroma_key = load_module("chroma_key")
    red = chroma_key.chroma_key_frame(Image.new("RGBA", (100, 100), (255, 0, 0, 255)))
    assert np.all(np.array(red)[:, :, 3] == 255), "chroma key erased non-green pixels"

    # Regression: yellow / yellow-green pixels must survive chroma keying.
    # The green_ratio > 0.45 heuristic used to catch any yellow pixel
    # anywhere in the frame and crush its alpha to 30% — devastating for
    # pets with beaks, eyes, stars, or yellow clothing.
    for yellow_rgb in [(255, 220, 0), (200, 230, 50)]:
        frame = np.full((40, 40, 4), (0, 177, 64, 255), dtype=np.uint8)
        frame[10:30, 10:30] = (*yellow_rgb, 255)
        keyed = chroma_key.chroma_key_frame(Image.fromarray(frame))
        alpha = np.array(keyed)[15:25, 15:25, 3]
        assert alpha.mean() == 255, (
            f"chroma key crushed yellow {yellow_rgb} alpha to {alpha.mean():.0f}"
        )

    # Regression: probe_video_fps falls back to 24.0 for unreadable input.
    assert chroma_key.probe_video_fps("/nonexistent/video.mp4") == 24.0

    gray_bleed = load_module("fix_gray_bleed")
    with tempfile.TemporaryDirectory() as temp_dir:
        temp = Path(temp_dir)
        opaque = temp / "opaque-gray.png"
        opaque_fixed = temp / "opaque-gray-fixed.png"
        Image.new("RGBA", (10, 10), (100, 100, 110, 255)).save(opaque)
        assert gray_bleed.fix_frame(str(opaque), opaque_fixed, 10, 192) == 0

        # Regression: a gray character's own anti-aliased edge must NOT be
        # erased. Semi-transparent gray pixels adjacent to opaque gray pixels
        # are the character's silhouette, not background bleed.
        gray_char = np.zeros((7, 7, 4), dtype=np.uint8)
        gray_char[2:5, 2:5] = (120, 120, 120, 255)     # opaque gray body
        gray_char[2:5, 1] = (120, 120, 120, 200)        # semi-transparent edge
        gray_char[2:5, 5] = (120, 120, 120, 200)
        gc_path = temp / "gray-char.png"
        gc_fixed = temp / "gray-char-fixed.png"
        Image.fromarray(gray_char).save(gc_path)
        erased = gray_bleed.fix_frame(str(gc_path), gc_fixed, 7, 192)
        assert erased == 0, f"fix_gray_bleed erased {erased} pixels of a gray character's own edge"

        # Positive case: actual gray bleed next to a NON-gray character must
        # still be removed. Gray pixels adjacent to opaque red (not opaque
        # gray) are bleed, not the character body.
        bleed = np.zeros((7, 7, 4), dtype=np.uint8)
        bleed[2:5, 2:5] = (200, 0, 0, 255)              # red body (opaque)
        bleed[2:5, 1] = (100, 100, 110, 200)            # gray bleed at edge
        bleed_path = temp / "bleed.png"
        bleed_fixed = temp / "bleed-fixed.png"
        Image.fromarray(bleed).save(bleed_path)
        erased = gray_bleed.fix_frame(str(bleed_path), bleed_fixed, 7, 192)
        assert erased > 0, "fix_gray_bleed failed to remove actual gray bleed next to a red body"

        frames = temp / "frames"
        frames.mkdir()
        Image.new("RGBA", (20, 20), (0, 0, 0, 255)).save(frames / "frame_001.png")
        result = subprocess.run(
            [sys.executable, str(HERE / "check_dark.py"), str(frames), "--ratio", "0"],
            capture_output=True,
            text=True,
        )
        assert result.returncode == 1, "check_dark did not report a failing exit code"

    print("Image safety checks passed.")


if __name__ == "__main__":
    main()
