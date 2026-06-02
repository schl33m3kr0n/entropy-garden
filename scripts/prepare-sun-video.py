#!/usr/bin/env python3
"""Extract vault sun poster + recompress sun.mp4. Requires imageio-ffmpeg (pip install imageio-ffmpeg)."""

import shutil
import subprocess
import sys
from pathlib import Path

try:
    import imageio_ffmpeg
except ImportError:
    print("Run: pip3 install imageio-ffmpeg", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
VIDEO = ROOT / "assets" / "video" / "sun.mp4"
ARCHIVE = ROOT / "archive" / "sun-original.mp4"
POSTER_JPG = ROOT / "assets" / "img" / "vault" / "sun-poster.jpg"
POSTER_WEBP = ROOT / "assets" / "img" / "vault" / "sun-poster.webp"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def run(cmd):
    subprocess.run(cmd, check=True)


def main():
    if not VIDEO.is_file():
        print(f"Missing {VIDEO}", file=sys.stderr)
        sys.exit(1)

    ARCHIVE.parent.mkdir(parents=True, exist_ok=True)
    if not ARCHIVE.exists():
        shutil.copy2(VIDEO, ARCHIVE)
        print(f"Backed up original → {ARCHIVE}")

    tmp = VIDEO.with_suffix(".compressed.mp4")
    run(
        [
            FFMPEG,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(VIDEO),
            "-c:v",
            "libx264",
            "-crf",
            "28",
            "-preset",
            "slow",
            "-movflags",
            "+faststart",
            "-an",
            str(tmp),
        ]
    )
    tmp.replace(VIDEO)
    print(f"Recompressed {VIDEO} ({VIDEO.stat().st_size // 1024} KiB)")

    if not POSTER_JPG.is_file():
        print(
            "Poster JPG missing — on macOS run:\n"
            f'  qlmanage -t -s 1200 "{VIDEO}" -o "{POSTER_JPG.parent}"\n'
            f"  mv {POSTER_JPG.parent / 'sun.mp4.png'} {POSTER_JPG}",
            file=sys.stderr,
        )
        sys.exit(1)

    run(
        [
            FFMPEG,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(POSTER_JPG),
            "-c:v",
            "libwebp",
            "-quality",
            "82",
            str(POSTER_WEBP),
        ]
    )
    print(f"Wrote {POSTER_WEBP} ({POSTER_WEBP.stat().st_size // 1024} KiB)")


if __name__ == "__main__":
    main()
