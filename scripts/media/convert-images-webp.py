#!/usr/bin/env python3
"""Convert JPEGs under assets/img/ to WebP (quality 82). Keeps originals; skips if WebP is larger."""

import subprocess
import sys
from pathlib import Path
from typing import Optional

try:
    import imageio_ffmpeg
except ImportError:
    print("Run: pip3 install imageio-ffmpeg", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[2]
IMG_ROOT = ROOT / "assets" / "img"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
QUALITY = 82


def convert(src: Path) -> Optional[Path]:
    dest = src.with_suffix(".webp")
    subprocess.run(
        [
            FFMPEG,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(src),
            "-c:v",
            "libwebp",
            "-quality",
            str(QUALITY),
            str(dest),
        ],
        check=True,
    )
    if dest.stat().st_size >= src.stat().st_size:
        dest.unlink()
        return None
    return dest


def main() -> None:
    total_before = 0
    total_after = 0

    for src in sorted(IMG_ROOT.rglob("*")):
        if src.suffix.lower() not in {".jpg", ".jpeg"}:
            continue
        before = src.stat().st_size
        dest = convert(src)
        if dest is None:
            print(f"{src.relative_to(ROOT)}  skipped (WebP not smaller)")
            continue
        after = dest.stat().st_size
        total_before += before
        total_after += after
        pct = (1 - after / before) * 100 if before else 0
        print(
            f"{src.relative_to(ROOT)}  "
            f"{before / 1024:.0f}K -> {after / 1024:.0f}K  ({pct:.0f}% smaller)"
        )

    if total_before:
        print(
            f"\nTotal: {total_before / (1024 * 1024):.1f} MB -> "
            f"{total_after / (1024 * 1024):.1f} MB "
            f"(saved {(total_before - total_after) / (1024 * 1024):.1f} MB)"
        )


if __name__ == "__main__":
    main()
