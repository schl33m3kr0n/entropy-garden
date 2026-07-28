#!/usr/bin/env python3
"""Render Mr. Disco as a 15s seamless loop MP4 (spinning ball + spinny eyes).

Requires Google Chrome and imageio-ffmpeg (pip3 install imageio-ffmpeg).
"""

import base64
import json
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

try:
    import imageio_ffmpeg
except ImportError:
    print("Run: pip3 install imageio-ffmpeg", file=sys.stderr)
    sys.exit(1)

try:
    import websocket
except ImportError:
    print("Run: pip3 install websocket-client", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "video" / "mr-disco-loop.mp4"
FRAMES_DIR = ROOT / ".tmp" / "mr-disco-frames"
CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

DURATION = 15.0
FPS = 30
SIZE = 1080
DEBUG_PORT = 9333


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        return


def pick_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def start_server(port):
    handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(ROOT), **kwargs)
    server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def wait_for_chrome(port, timeout=20):
    deadline = time.time() + timeout
    url = f"http://127.0.0.1:{port}/json/version"
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1) as resp:
                json.load(resp)
                return
        except OSError:
            time.sleep(0.1)
    raise RuntimeError("Chrome remote debugging did not start")


def cdp_connect(page_url):
    create_url = (
        f"http://127.0.0.1:{DEBUG_PORT}/json/new?"
        f"{urllib.parse.quote(page_url, safe='')}"
    )
    req = urllib.request.Request(create_url, method="PUT")
    with urllib.request.urlopen(req) as resp:
        tab = json.load(resp)

    ws = websocket.create_connection(tab["webSocketDebuggerUrl"], timeout=30)
    return ws, tab["id"]


def cdp_send(ws, msg_id, method, params=None):
    ws.send(json.dumps({"id": msg_id, "method": method, "params": params or {}}))
    while True:
        payload = json.loads(ws.recv())
        if payload.get("id") == msg_id:
            if payload.get("error"):
                raise RuntimeError(payload["error"])
            return payload.get("result", {})


def capture_frame(ws, page_url, msg_id):
    msg_id += 1
    cdp_send(ws, msg_id, "Page.navigate", {"url": page_url})

    deadline = time.time() + 10
    while time.time() < deadline:
        msg_id += 1
        result = cdp_send(ws, msg_id, "Runtime.evaluate", {
            "expression": "document.title",
            "returnByValue": True,
        })
        if result.get("result", {}).get("value") == "ready":
            break
        time.sleep(0.02)
    else:
        raise RuntimeError(f"Timed out waiting for render: {page_url}")

    msg_id += 1
    shot = cdp_send(ws, msg_id, "Page.captureScreenshot", {"format": "png"})
    return base64.b64decode(shot["data"]), msg_id + 1


def encode_video():
    pattern = str(FRAMES_DIR / "frame_%05d.png")
    tmp = OUT.with_suffix(".tmp.mp4")
    subprocess.run(
        [
            FFMPEG,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-framerate",
            str(FPS),
            "-i",
            pattern,
            "-t",
            str(DURATION),
            "-c:v",
            "libx264",
            "-crf",
            "22",
            "-preset",
            "slow",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-an",
            str(tmp),
        ],
        check=True,
    )
    tmp.replace(OUT)


def main():
    if not CHROME.is_file():
        print(f"Chrome not found at {CHROME}", file=sys.stderr)
        sys.exit(1)

    frame_count = int(round(DURATION * FPS))
    if FRAMES_DIR.exists():
        shutil.rmtree(FRAMES_DIR)
    FRAMES_DIR.mkdir(parents=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)

    http_port = pick_port()
    server = start_server(http_port)

    chrome_proc = subprocess.Popen(
        [
            str(CHROME),
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            f"--remote-debugging-port={DEBUG_PORT}",
            "--remote-allow-origins=*",
            f"--window-size={SIZE},{SIZE}",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    try:
        wait_for_chrome(DEBUG_PORT)

        ws, target_id = cdp_connect("about:blank")
        try:
            msg_id = 1
            cdp_send(ws, msg_id, "Page.enable")
            msg_id += 1
            cdp_send(ws, msg_id, "Emulation.setDeviceMetricsOverride", {
                "width": SIZE,
                "height": SIZE,
                "deviceScaleFactor": 1,
                "mobile": False,
            })
            msg_id += 1

            for index in range(frame_count):
                t = index / FPS
                page_url = (
                    f"http://127.0.0.1:{http_port}/pages/mr-disco-loop-render.html"
                    f"?t={t:.6f}"
                )
                png, msg_id = capture_frame(ws, page_url, msg_id)
                frame_path = FRAMES_DIR / f"frame_{index:05d}.png"
                frame_path.write_bytes(png)
                print(f"frame {index + 1}/{frame_count}  t={t:.3f}s", flush=True)
        finally:
            try:
                cdp_send(ws, 9999, "Target.closeTarget", {"targetId": target_id})
            except Exception:
                pass
            ws.close()

        encode_video()
        size_kb = OUT.stat().st_size // 1024
        print(f"Wrote {OUT} ({size_kb} KiB, {DURATION}s @ {FPS}fps, {SIZE}px)")
        shutil.rmtree(FRAMES_DIR, ignore_errors=True)
    finally:
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            chrome_proc.kill()
        server.shutdown()


if __name__ == "__main__":
    main()
