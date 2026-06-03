#!/usr/bin/env python3
"""Build a production static bundle (respects deploy.exclude)."""

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXCLUDE = ROOT / "deploy.exclude"
DEFAULT_DEST = ROOT / "dist"


def load_excludes():
    patterns = []
    for line in EXCLUDE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        patterns.append(line)
    return patterns


def main():
    dest = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DEFAULT_DEST
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)

    excludes = load_excludes()
    cmd = ["rsync", "-a"]
    for pattern in excludes:
        cmd.extend(["--exclude", pattern])
    cmd.extend([f"{ROOT}/", f"{dest}/"])

    subprocess.run(cmd, check=True)

    size_mb = sum(f.stat().st_size for f in dest.rglob("*") if f.is_file()) / (1024 * 1024)
    print(f"Deploy bundle: {dest} ({size_mb:.1f} MiB)")


if __name__ == "__main__":
    main()
