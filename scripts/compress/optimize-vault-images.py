#!/usr/bin/env python3
"""Resize oversized vault JPGs and write deploy-facing WebP assets."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
VAULT = ROOT / "assets" / "img" / "vault"
MAX_DIM = 2400
WEBP_QUALITY = 82


def save_webp(src: Path, dest: Path, *, max_dim: int = MAX_DIM) -> None:
    with Image.open(src) as img:
        img = img.convert("RGB")
        w, h = img.size
        scale = min(1.0, max_dim / max(w, h))
        if scale < 1.0:
            nw, nh = int(w * scale), int(h * scale)
            img = img.resize((nw, nh), Image.Resampling.LANCZOS)
        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest, "WEBP", quality=WEBP_QUALITY, method=6)


def main() -> None:
    targets = [
        (VAULT / "descent.jpg", VAULT / "descent.webp"),
        (VAULT / "ahoy.jpg", VAULT / "ahoy.webp"),
    ]
    for src, dest in targets:
        if not src.is_file():
            print(f"skip missing {src.relative_to(ROOT)}")
            continue
        save_webp(src, dest)
        print(f"wrote {dest.relative_to(ROOT)} ({dest.stat().st_size // 1024} KiB)")


if __name__ == "__main__":
    main()
