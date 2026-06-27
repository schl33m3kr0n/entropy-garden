#!/usr/bin/env python3
"""Convert vault-sphere.gif to an Instagram-friendly MP4."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

try:
    import imageio_ffmpeg
except ImportError:
    print("Install: pip3 install imageio-ffmpeg", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent
GIF = ROOT / "vault-sphere.gif"
OUT_SQUARE = ROOT / "vault-sphere-insta.mp4"
OUT_REEL = ROOT / "vault-sphere-reel.mp4"

# Instagram feed square: 1080×1080, H.264, yuv420p, ≤60s
# Reels: 1080×1920 (9:16), square art centered on white


def run_ffmpeg(args: list[str]) -> None:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    proc = subprocess.run([ffmpeg, *args], capture_output=True, text=True)
    if proc.returncode != 0:
        print(proc.stderr, file=sys.stderr)
        sys.exit(proc.returncode)


def main() -> None:
    if not GIF.exists():
        print(f"Missing {GIF} — run render-vault-sphere-gif.py first.", file=sys.stderr)
        sys.exit(1)

    common = [
        "-y",
        "-i",
        str(GIF),
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-crf",
        "18",
        "-preset",
        "slow",
        "-movflags",
        "+faststart",
    ]

    print(f"Square feed → {OUT_SQUARE.name} (1080×1080)…")
    run_ffmpeg([
        *common,
        "-vf",
        "scale=1080:1080:flags=lanczos,fps=20",
        str(OUT_SQUARE),
    ])

    print(f"Reel → {OUT_REEL.name} (1080×1920, centered)…")
    run_ffmpeg([
        *common,
        "-vf",
        "scale=1080:1080:flags=lanczos,fps=20,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:white",
        str(OUT_REEL),
    ])

    for p in (OUT_SQUARE, OUT_REEL):
        print(f"  {p.name}: {p.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
