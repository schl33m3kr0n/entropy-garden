#!/usr/bin/env python3
"""Convert SFX WAV -> MP3 @ 128 kbps; re-encode large BGM tracks @ 128 kbps."""

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
SFX = ROOT / "assets" / "audio" / "sfx"
MUSIC = ROOT / "assets" / "audio" / "music"
SFX_ORIGINALS = ROOT / "archive" / "sfx-originals"
MUSIC_ORIGINALS = ROOT / "archive" / "music-originals"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
TARGET_KBPS = 128

LARGE_BGM = {"ambient3.mp3", "ambient8.mp3", "13 angels.mp3"}


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


def encode_mp3(src: Path, dest: Path) -> None:
    subprocess.run(
        [
            FFMPEG,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(src),
            "-codec:a",
            "libmp3lame",
            "-b:a",
            f"{TARGET_KBPS}k",
            str(dest),
        ],
        check=True,
    )


def convert_wav(wav: Path) -> None:
    SFX_ORIGINALS.mkdir(parents=True, exist_ok=True)
    backup = SFX_ORIGINALS / wav.name
    if not backup.exists():
        shutil.copy2(wav, backup)

    mp3 = wav.with_suffix(".mp3")
    tmp = wav.with_suffix(".tmp.mp3")
    try:
        encode_mp3(wav, tmp)
        tmp.replace(mp3)
        wav.unlink()
        size_kb = mp3.stat().st_size / 1024
        print(f"WAV->MP3: {wav.stem}  ({size_kb:.0f} KB)")
    except subprocess.CalledProcessError as err:
        print(f"FAILED WAV: {wav.name} ({err})")
        if tmp.exists():
            tmp.unlink()


def reencode_music(path: Path) -> None:
    bitrate = probe_bitrate(path)
    if bitrate is not None and bitrate <= TARGET_KBPS:
        print(f"SKIP (already {bitrate} kbps): {path.name}")
        return

    MUSIC_ORIGINALS.mkdir(parents=True, exist_ok=True)
    backup = MUSIC_ORIGINALS / path.name
    if not backup.exists():
        shutil.copy2(path, backup)

    tmp = path.with_suffix(".tmp.mp3")
    try:
        encode_mp3(path, tmp)
        tmp.replace(path)
        new_bitrate = probe_bitrate(path)
        size_mb = path.stat().st_size / (1024 * 1024)
        print(f"BGM: {path.name}  -> {new_bitrate}k  ({size_mb:.1f} MB)")
    except subprocess.CalledProcessError as err:
        print(f"FAILED BGM: {path.name} ({err})")
        if tmp.exists():
            tmp.unlink()


def main() -> None:
    for wav in sorted(SFX.glob("*.wav")):
        convert_wav(wav)

    for name in sorted(LARGE_BGM):
        path = MUSIC / name
        if path.exists():
            reencode_music(path)

    sfx_mb = sum(f.stat().st_size for f in SFX.iterdir() if f.is_file()) / (1024 * 1024)
    music_mb = sum(f.stat().st_size for f in MUSIC.glob("*.mp3")) / (1024 * 1024)
    print(f"\nSFX folder: {sfx_mb:.1f} MB | Music folder: {music_mb:.1f} MB")


if __name__ == "__main__":
    main()
