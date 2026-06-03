#!/usr/bin/env python3
"""Re-encode playlist MP3s to 160 kbps. Lossless originals saved to archive/music-originals/."""

import re
import shutil
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
MUSIC = ROOT / "assets" / "audio" / "music"
ORIGINALS = ROOT / "archive" / "music-originals"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
TARGET_KBPS = 160


def probe_bitrate(path: Path) -> Optional[int]:
    result = subprocess.run(
        [FFMPEG, "-hide_banner", "-i", str(path)],
        capture_output=True,
        text=True,
    )
    for line in result.stderr.splitlines():
        if "Audio:" in line:
            match = re.search(r"(\d+)\s*kb/s", line)
            if match:
                return int(match.group(1))
    match = re.search(r"bitrate:\s*(\d+)\s*kb/s", result.stderr)
    return int(match.group(1)) if match else None


def encode(path: Path, tmp: Path) -> None:
    subprocess.run(
        [
            FFMPEG,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(path),
            "-codec:a",
            "libmp3lame",
            "-b:a",
            f"{TARGET_KBPS}k",
            str(tmp),
        ],
        check=True,
    )


def main() -> None:
    ORIGINALS.mkdir(exist_ok=True)
    before = sum(f.stat().st_size for f in MUSIC.glob("*.mp3"))

    for path in sorted(MUSIC.glob("*.mp3")):
        bitrate = probe_bitrate(path)
        if bitrate is None:
            print(f"SKIP (unknown bitrate): {path.name}")
            continue
        if bitrate <= TARGET_KBPS:
            print(f"SKIP (already {bitrate} kbps): {path.name}")
            continue

        backup = ORIGINALS / path.name
        if not backup.exists():
            shutil.copy2(path, backup)

        tmp = path.with_suffix(".compressed.mp3")
        try:
            encode(path, tmp)
            tmp.replace(path)
            new_bitrate = probe_bitrate(path)
            size_mb = path.stat().st_size / (1024 * 1024)
            print(
                f"ENCODED: {path.name}  {bitrate}k -> {new_bitrate}k  ({size_mb:.1f} MB)"
            )
        except subprocess.CalledProcessError as err:
            print(f"FAILED: {path.name} ({err})")
            if tmp.exists():
                tmp.unlink()

    after = sum(f.stat().st_size for f in MUSIC.glob("*.mp3"))
    saved = (before - after) / (1024 * 1024)
    print(f"\nTotal: {before / (1024 * 1024):.1f} MB -> {after / (1024 * 1024):.1f} MB (saved {saved:.1f} MB)")


if __name__ == "__main__":
    main()
