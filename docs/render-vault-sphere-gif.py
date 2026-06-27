#!/usr/bin/env python3
"""Render vault checkered sphere + starburst + eyes to an HD GIF."""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

# Match js/modules/vault-sphere.js + css tuned values
CHECKS = 12
TILT_X = 0.33
SPIN_SPEED = 0.50
SPHERE_SCALE = 0.23
CENTER_Y = 0.50
FOCAL_MUL = 1.5
LIGHT = np.array([0.35, 0.55, 0.75], dtype=np.float64)
LIGHT /= np.linalg.norm(LIGHT)

STARBURST_SIZE = 0.89
STARBURST_SPIN_S = 15.0
EYE_WIDTH = 0.15
EYE_GAP = 0.04

STARBURST_OUTER = 46
STARBURST_INNER = 16

SIZE = 2048
FPS = 20
# Loop length: starburst (15s) × 4, sphere × 5, rainbow × 1 — all close at 60s.
LOOP_SECONDS = 60.0
SPHERE_ROTATIONS = 5
RAINBOW_CYCLES = 1
SPIN_SPEED = math.tau * SPHERE_ROTATIONS / LOOP_SECONDS
RAINBOW_RATE = 100.0 * RAINBOW_CYCLES / LOOP_SECONDS
OUT_PATH = Path(__file__).resolve().parent / "vault-sphere.gif"


def starburst_points(outer: float, inner: float, cx: float = 50, cy: float = 50, n: int = 16) -> list[tuple[float, float]]:
    pts = []
    for i in range(n * 2):
        r = outer if i % 2 == 0 else inner
        a = (i / (n * 2)) * math.tau - math.pi / 2
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def rotate_xy(x: float, y: float, cx: float, cy: float, deg: float) -> tuple[float, float]:
    rad = math.radians(deg)
    cos_a, sin_a = math.cos(rad), math.sin(rad)
    dx, dy = x - cx, y - cy
    return cx + dx * cos_a - dy * sin_a, cy + dx * sin_a + dy * cos_a


def rotate_point(v: np.ndarray, rot_x: float, rot_y: float) -> np.ndarray:
    x, y, z = v
    cy, sy = math.cos(rot_y), math.sin(rot_y)
    x, z = x * cy - z * sy, x * sy + z * cy
    cx, sx = math.cos(rot_x), math.sin(rot_x)
    y, z = y * cx - z * sx, y * sx + z * cx
    return np.array([x, y, z], dtype=np.float64)


def rotate_point_inverse(v: np.ndarray, rot_x: float, rot_y: float) -> np.ndarray:
    x, y, z = v
    cx, sx = math.cos(-rot_x), math.sin(-rot_x)
    y, z = y * cx - z * sx, y * sx + z * cx
    cy, sy = math.cos(-rot_y), math.sin(-rot_y)
    x, z = x * cy - z * sy, x * sy + z * cy
    return np.array([x, y, z], dtype=np.float64)


def render_starburst(size: int, deg: float) -> Image.Image:
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    scale = size * STARBURST_SIZE / 100.0
    cx = cy = size * 0.5
    base = starburst_points(STARBURST_OUTER, STARBURST_INNER)
    pts = []
    for bx, by in base:
        sx = cx + (bx - 50) * scale
        sy = cy + (by - 50) * scale
        rx, ry = rotate_xy(sx, sy, cx, cy, deg)
        pts.append((rx, ry))
    draw.polygon(pts, fill=(0, 0, 0, 255))
    return layer


def _inv_rotate_batch(rx: np.ndarray, ry: np.ndarray, rz: np.ndarray, rot_x: float, rot_y: float):
    """Inverse rotate many unit ray directions (world -> local)."""
    cx, sx = math.cos(-rot_x), math.sin(-rot_x)
    ly = ry * cx - rz * sx
    lz = ry * sx + rz * cx
    cy, sy = math.cos(-rot_y), math.sin(-rot_y)
    lx = rx * cy - lz * sy
    lz = rx * sy + lz * cy
    return lx, ly, lz


def render_sphere_layer(size: int, rot_y: float) -> Image.Image:
    cx = size * 0.5
    cy = size * CENTER_Y
    radius = size * SPHERE_SCALE
    focal = size * FOCAL_MUL

    y0 = max(0, int(math.floor(cy - radius - 1)))
    y1 = min(size - 1, int(math.ceil(cy + radius + 1)))
    x0 = max(0, int(math.floor(cx - radius - 1)))
    x1 = min(size - 1, int(math.ceil(cx + radius + 1)))

    ys = np.arange(y0, y1 + 1, dtype=np.float64)
    xs = np.arange(x0, x1 + 1, dtype=np.float64)
    dx, dy = np.meshgrid(xs - cx, ys - cy)

    rd_x = dx
    rd_y = dy
    rd_z = np.full_like(dx, focal)
    rd_len = np.sqrt(rd_x * rd_x + rd_y * rd_y + rd_z * rd_z)
    rd_x /= rd_len
    rd_y /= rd_len
    rd_z /= rd_len

    ro = np.array([0.0, 0.0, -focal], dtype=np.float64)
    ro_l = rotate_point_inverse(ro, TILT_X, rot_y)

    lx, ly, lz = _inv_rotate_batch(rd_x, rd_y, rd_z, TILT_X, rot_y)
    b = 2.0 * (ro_l[0] * lx + ro_l[1] * ly + ro_l[2] * lz)
    c = np.dot(ro_l, ro_l) - radius * radius
    disc = b * b - 4.0 * c
    hit = disc >= 0

    s = np.sqrt(np.maximum(disc, 0.0))
    t_near = (-b - s) * 0.5
    t_far = (-b + s) * 0.5
    t = np.where(t_near >= 0, t_near, t_far)
    hit &= t >= 0

    px = ro_l[0] + lx * t
    py = ro_l[1] + ly * t
    pz = ro_l[2] + lz * t
    plen = np.sqrt(px * px + py * py + pz * pz)
    nx_l = px / plen
    ny_l = py / plen
    nz_l = pz / plen

    cy_r, sy_r = math.cos(rot_y), math.sin(rot_y)
    nx_w = nx_l * cy_r - nz_l * sy_r
    nz_w = nx_l * sy_r + nz_l * cy_r
    cx_r, sx_r = math.cos(TILT_X), math.sin(TILT_X)
    ny_w = ny_l * cx_r - nz_w * sx_r
    nz_w = ny_l * sx_r + nz_w * cx_r

    lat = np.arcsin(np.clip(ny_l, -1.0, 1.0))
    lon = np.arctan2(nx_l, nz_l)
    u = (lon / math.pi + 1.0) * 0.5
    v = lat / math.pi + 0.5
    on_white = (np.floor(u * CHECKS) + np.floor(v * CHECKS)) % 2 == 1

    lit = np.maximum(0.0, nx_w * LIGHT[0] + ny_w * LIGHT[1] + nz_w * LIGHT[2])
    gray = np.round(10 + 32 * lit).astype(np.uint8)

    h, w = dx.shape
    rgb = np.zeros((h, w, 3), dtype=np.uint8)
    rgb[hit & on_white] = (255, 255, 255)
    g = gray[hit & ~on_white]
    rgb[hit & ~on_white] = np.stack([g, g, g], axis=-1)

    alpha = (hit.astype(np.uint8) * 255)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    patch = Image.fromarray(rgb).convert("RGBA")
    patch.putalpha(Image.fromarray(alpha))
    layer.paste(patch, (x0, y0), patch)
    return layer


EYE_VIEW = 24.0
EYE_SCLERA_PATH = [
    ("M", (12.0, 4.5)),
    ("C", (7.0, 4.5), (2.7, 7.8), (1.0, 12.0)),
    ("C", (2.7, 16.2), (7.0, 19.5), (12.0, 19.5)),
    ("C", (17.0, 19.5), (21.3, 16.2), (23.0, 12.0)),
    ("C", (21.3, 7.8), (17.0, 4.5), (12.0, 4.5)),
]
IRIS_CX, IRIS_CY, IRIS_R = 12.0, 12.0, 4.5
PUPIL_R = 1.6

RAINBOW_STOPS = (
    (0.0, 0),
    (0.17, 60),
    (0.33, 120),
    (0.50, 180),
    (0.67, 240),
    (0.83, 300),
    (1.0, 360),
)


def cubic_bezier(p0, p1, p2, p3, t: float):
    u = 1.0 - t
    return (
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    )


def eye_sclera_polygon(steps: int = 28) -> list[tuple[float, float]]:
    pts: list[tuple[float, float]] = []
    segs = []
    cur = EYE_SCLERA_PATH[0][1]
    for cmd, *args in EYE_SCLERA_PATH[1:]:
        segs.append((cur, args[0], args[1], args[2]))
        cur = args[2]
    for p0, p1, p2, p3 in segs:
        for i in range(steps):
            t = i / steps
            pts.append(cubic_bezier(p0, p1, p2, p3, t))
    return pts


def hsl_to_rgb(h: float, s: float, l: float) -> tuple[int, int, int]:
    h = h % 360.0
    c = (1.0 - abs(2 * l - 1.0)) * s
    x = c * (1.0 - abs((h / 60.0) % 2 - 1.0))
    m = l - c / 2.0
    if h < 60:
        r, g, b = c, x, 0.0
    elif h < 120:
        r, g, b = x, c, 0.0
    elif h < 180:
        r, g, b = 0.0, c, x
    elif h < 240:
        r, g, b = 0.0, x, c
    elif h < 300:
        r, g, b = x, 0.0, c
    else:
        r, g, b = c, 0.0, x
    return int((r + m) * 255), int((g + m) * 255), int((b + m) * 255)


def rainbow_hue_at(u: float) -> tuple[int, int, int]:
    u = u % 1.0
    for i in range(len(RAINBOW_STOPS) - 1):
        u0, h0 = RAINBOW_STOPS[i]
        u1, h1 = RAINBOW_STOPS[i + 1]
        if u <= u1 or i == len(RAINBOW_STOPS) - 2:
            span = u1 - u0 or 1.0
            t = (u - u0) / span
            h = h0 + (h1 - h0) * t
            return hsl_to_rgb(h, 1.0, 0.5)
    return hsl_to_rgb(0, 1.0, 0.5)


RAINBOW_LUT = np.array([rainbow_hue_at(i / 255.0) for i in range(256)], dtype=np.uint8)


def render_single_eye(px: int, sclera_rgb: tuple[int, int, int], mirror_iris: bool, rainbow_cycle: float) -> Image.Image:
    layer = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    scale = px / EYE_VIEW

    poly = [(x * scale, y * scale) for x, y in eye_sclera_polygon()]
    draw.polygon(poly, fill=(*sclera_rgb, 255))

    icx = IRIS_CX * scale
    icy = IRIS_CY * scale
    ir = IRIS_R * scale
    x0 = max(0, int(icx - ir - 1))
    y0 = max(0, int(icy - ir - 1))
    x1 = min(px - 1, int(icx + ir + 1))
    y1 = min(px - 1, int(icy + ir + 1))

    yy, xx = np.mgrid[y0 : y1 + 1, x0 : x1 + 1]
    lx = (xx + 0.5) / scale
    ly = (yy + 0.5) / scale
    dist = np.sqrt((lx - IRIS_CX) ** 2 + (ly - IRIS_CY) ** 2)
    in_iris = dist <= IRIS_R
    in_pupil = dist <= PUPIL_R

    grad_x = EYE_VIEW - lx if mirror_iris else lx
    idx = ((grad_x + rainbow_cycle) % 100.0 / 100.0 * 255.0).astype(np.uint8)

    h, w = idx.shape
    iris_px = np.zeros((h, w, 4), dtype=np.uint8)
    mask = in_iris & ~in_pupil
    iris_px[mask, :3] = RAINBOW_LUT[idx[mask]]
    iris_px[mask, 3] = 255
    iris_px[in_pupil] = (10, 10, 10, 255)

    layer.alpha_composite(Image.fromarray(iris_px), (x0, y0))
    return layer


def render_eyes(size: int, t: float) -> Image.Image:
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    eye_px = max(8, int(round(size * EYE_WIDTH)))
    gap_px = int(round(size * EYE_GAP))
    total_w = eye_px * 2 + gap_px
    left_x = (size - total_w) // 2
    right_x = left_x + eye_px + gap_px
    top_y = (size - eye_px) // 2

    rainbow_cycle = (t * RAINBOW_RATE) % 100.0

    left = render_single_eye(eye_px, (0, 0, 0), mirror_iris=False, rainbow_cycle=rainbow_cycle)
    right = render_single_eye(eye_px, (255, 255, 255), mirror_iris=True, rainbow_cycle=rainbow_cycle)
    layer.paste(left, (left_x, top_y), left)
    layer.paste(right, (right_x, top_y), right)
    return layer


def compose_frame(size: int, t: float) -> Image.Image:
    rot_y = SPIN_SPEED * t
    star_deg = (t / STARBURST_SPIN_S) * 360.0

    frame = Image.new("RGB", (size, size), (255, 255, 255))
    star = render_starburst(size, star_deg)
    sphere = render_sphere_layer(size, rot_y)
    eyes = render_eyes(size, t)

    frame.paste(star, (0, 0), star)
    frame.paste(sphere, (0, 0), sphere)
    frame.paste(eyes, (0, 0), eyes)
    return frame


def main() -> None:
    frames = max(1, int(round(LOOP_SECONDS * FPS)))
    star_rots = LOOP_SECONDS / STARBURST_SPIN_S
    print(
        f"Rendering {frames} frames at {SIZE}px "
        f"({LOOP_SECONDS}s loop @ {FPS}fps — "
        f"starburst ×{star_rots:g}, sphere ×{SPHERE_ROTATIONS}, rainbow ×{RAINBOW_CYCLES})…"
    )
    imgs = []
    for i in range(frames):
        t = i * LOOP_SECONDS / frames
        imgs.append(compose_frame(SIZE, t))
        if (i + 1) % 20 == 0 or i + 1 == frames:
            print(f"  {i + 1}/{frames}")

    duration_ms = int(1000 / FPS)
    imgs[0].save(
        OUT_PATH,
        save_all=True,
        append_images=imgs[1:],
        duration=duration_ms,
        loop=0,
        optimize=True,
    )
    print(f"Wrote {OUT_PATH} ({OUT_PATH.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
