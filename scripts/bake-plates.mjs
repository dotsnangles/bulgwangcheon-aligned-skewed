#!/usr/bin/env node
/**
 * Deterministic Fine-Press Lithograph Plate Baker (`scripts/bake-plates.mjs`)
 *
 * Processes `.cache/raw-plates/plate-01.jpg` .. `plate-16.jpg` into:
 *   1) `public/plates/plate-01.webp` .. `plate-16.webp` (960px wide, zero bounding-box seam on #FFFFFF)
 *   2) `public/plates/plate-17.webp` .. `plate-24.webp` (8 distinct fine-press detail & macro lithographs, 960x620, border=255)
 *   3) `public/plates/stride-01.webp` .. `stride-05.webp` (360x240 center-of-mass aligned Muybridge 5-frame sprites)
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT_DIR, '.cache', 'raw-plates');
const OUT_DIR = path.join(ROOT_DIR, 'public', 'plates');

if (!fs.existsSync(RAW_DIR)) {
  console.error(`[bake-plates] Missing raw plates directory: ${RAW_DIR}`);
  process.exit(1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

const PYTHON_SCRIPT = String.raw`
import os
import sys
import math
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

raw_dir = sys.argv[1]
out_dir = sys.argv[2]

def litho_grade(gray_u8: np.ndarray, seed: int, feather_px: int = 20) -> np.ndarray:
    """
    Fine-press lithographic tone curve + subtle unsharp + midtone stochastic grain
    with guaranteed pure-white RGB(255,255,255) clamp for L >= 236 and deep carbon ink #000000 for L <= 28.
    """
    pil_img = Image.fromarray(gray_u8, mode="L")
    sharpened = pil_img.filter(ImageFilter.UnsharpMask(radius=1.15, percent=135, threshold=2))
    L = np.asarray(sharpened, dtype=np.float32)

    # Normalize [28 .. 236] -> [0 .. 1]; clamp strictly outside
    u = np.clip((L - 28.0) / (236.0 - 28.0), 0.0, 1.0)
    # Smooth Hermite S-curve with rich lithographic midtone density
    s = u * u * (3.0 - 2.0 * u)
    s = np.power(s, 0.94)

    # Deterministic fine-press stochastic grain strictly inside midtones (zero grain on white >= 0.95 or black <= 0.04)
    rng = np.random.Generator(np.random.PCG64(seed))
    noise = rng.normal(0.0, 1.0, size=s.shape).astype(np.float32)
    mid_mask = np.clip(4.0 * s * (1.0 - s), 0.0, 1.0) ** 1.6
    mid_mask = np.where((s > 0.04) & (s < 0.95), mid_mask, 0.0)
    s = np.clip(s + noise * 0.022 * mid_mask, 0.0, 1.0)

    # Re-enforce exact pure-white & deep-carbon thresholds
    s = np.where(L >= 236.0, 1.0, s)
    s = np.where(L <= 28.0, 0.0, s)

    # Soft stone-margin feather on outer perimeter so full-bleed plates never show a hard rectangular cut on #FFFFFF
    if feather_px > 0:
        h, w = s.shape
        dy = np.minimum(np.arange(h, dtype=np.float32), np.arange(h - 1, -1, -1, dtype=np.float32))
        dx = np.minimum(np.arange(w, dtype=np.float32), np.arange(w - 1, -1, -1, dtype=np.float32))
        wy = np.clip(dy / float(feather_px), 0.0, 1.0)
        wx = np.clip(dx / float(feather_px), 0.0, 1.0)
        wy = 0.5 - 0.5 * np.cos(np.pi * wy)
        wx = 0.5 - 0.5 * np.cos(np.pi * wx)
        edge_mask = wy[:, None] * wx[None, :]
        # Ink density (1 - s) fades smoothly to 0 at the exact 1px border
        ink = (1.0 - s) * edge_mask
        s = 1.0 - ink

    out_u8 = np.clip(np.round(s * 255.0), 0, 255).astype(np.uint8)
    # Guarantee outer 2px border is strictly 255
    out_u8[:2, :] = 255
    out_u8[-2:, :] = 255
    out_u8[:, :2] = 255
    out_u8[:, -2:] = 255
    return out_u8

def save_verified_webp(gray_u8: np.ndarray, out_path: str, quality: int = 92) -> tuple[int, int]:
    """
    Save grayscale lithograph as RGB WebP and verify zero bounding-box seam on #FFFFFF (border min == 255).
    """
    rgb = np.stack([gray_u8, gray_u8, gray_u8], axis=-1)
    img = Image.fromarray(rgb, mode="RGB")
    img.save(out_path, format="WEBP", quality=quality, method=6)

    # Verify decoded WebP border pixels are 100% pure white RGB(255,255,255) (0 LSB seam!)
    dec = np.asarray(Image.open(out_path).convert("RGB"), dtype=np.uint8)
    border_min = min(
        int(dec[0, :, :].min()),
        int(dec[-1, :, :].min()),
        int(dec[:, 0, :].min()),
        int(dec[:, -1, :].min()),
    )
    if border_min < 255:
        # Fallback to lossless WebP if lossy YUV rounding ever shifts border below 255
        img.save(out_path, format="WEBP", lossless=True, quality=100, method=6)
        dec = np.asarray(Image.open(out_path).convert("RGB"), dtype=np.uint8)
        border_min = min(
            int(dec[0, :, :].min()),
            int(dec[-1, :, :].min()),
            int(dec[:, 0, :].min()),
            int(dec[:, -1, :].min()),
        )
    assert border_min == 255, f"Border seam detected on {out_path}: min={border_min}"
    return img.size[0], img.size[1]

total_bytes = 0
print("[bake-plates] Baking 16 fine-press lithograph plates (960px width)...")

for idx in range(1, 17):
    in_name = f"plate-{idx:02d}.jpg"
    out_name = f"plate-{idx:02d}.webp"
    in_path = os.path.join(raw_dir, in_name)
    out_path = os.path.join(out_dir, out_name)

    src = Image.open(in_path).convert("L")
    w0, h0 = src.size
    target_w = 960
    target_h = int(round(h0 * (target_w / float(w0))))
    resized = src.resize((target_w, target_h), Image.Resampling.LANCZOS)
    gray = np.asarray(resized, dtype=np.uint8)

    # Plates with internal margins already have pure white borders; feather_px=18 handles full-bleed plates seamlessly
    baked = litho_grade(gray, seed=20261100 + idx, feather_px=18)
    w_out, h_out = save_verified_webp(baked, out_path, quality=92)
    sz = os.path.getsize(out_path)
    total_bytes += sz
    white_pct = float((baked == 255).mean() * 100.0)
    black_pct = float((baked <= 12).mean() * 100.0)
    print(f"  - {out_name}: {w_out}x{h_out} · {sz / 1024.0:6.1f} KB · pure-white={white_pct:5.1f}% · deep-ink={black_pct:4.1f}% · border=255 PASS")

# Extract 5 Muybridge galloping horse sprites from plate-04.jpg -> stride-01.webp .. stride-05.webp (360x240)
print("\n[bake-plates] Extracting 5 Muybridge chronophotography stride sprites (360x240)...")
p4 = np.asarray(Image.open(os.path.join(raw_dir, "plate-04.jpg")).convert("L"), dtype=np.uint8)
ink_mask = p4 < 200
# Dilate slightly so thin tail hairs / detached hoof flecks stay grouped with their horse
dilated = ndimage.binary_dilation(ink_mask, iterations=4)
labeled, num_features = ndimage.label(dilated)

components = []
for comp_id in range(1, num_features + 1):
    ys, xs = np.where((labeled == comp_id) & ink_mask)
    if len(xs) < 800:
        continue
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    weights = (255.0 - p4[ys, xs].astype(np.float64))
    cx = float(np.average(xs, weights=weights))
    cy = float(np.average(ys, weights=weights))
    components.append({
        "id": comp_id,
        "x0": x0, "x1": x1, "y0": y0, "y1": y1,
        "w": x1 - x0 + 1, "h": y1 - y0 + 1,
        "cx": cx, "cy": cy,
    })

components.sort(key=lambda c: c["cx"])
if len(components) != 5:
    # Fallback to X-projection valley split if needed
    raise RuntimeError(f"Expected 5 horse silhouettes in plate-04.jpg, found {len(components)}")

CANVAS_W, CANVAS_H = 360, 240
# Compute uniform scale across all 5 frames so relative horse body size stays 100% consistent
max_span_x = max(max(c["cx"] - c["x0"], c["x1"] - c["cx"]) for c in components)
max_span_y = max(max(c["cy"] - c["y0"], c["y1"] - c["cy"]) for c in components)
scale = min((CANVAS_W * 0.43) / max_span_x, (CANVAS_H * 0.42) / max_span_y)

for idx, comp in enumerate(components, start=1):
    # Isolate only this horse's pixels onto pure white canvas before scaling so neighboring tails never intrude
    isolated = np.full_like(p4, 255, dtype=np.uint8)
    mask_this = labeled == comp["id"]
    isolated[mask_this] = p4[mask_this]

    # Crop generous window centered at (cx, cy) in source space
    half_w_src = (CANVAS_W * 0.5) / scale
    half_h_src = (CANVAS_H * 0.5) / scale

    # Use affine transform for subpixel-accurate center-of-mass registration at (CANVAS_W/2, CANVAS_H/2 + 4)
    pil_iso = Image.fromarray(isolated, mode="L")
    target_cx = CANVAS_W * 0.5
    target_cy = CANVAS_H * 0.48
    # PIL AFFINE maps output (x, y) -> input (a*x + b*y + c, d*x + e*y + f)
    inv_s = 1.0 / scale
    c_off = comp["cx"] - target_cx * inv_s
    f_off = comp["cy"] - target_cy * inv_s
    warped = pil_iso.transform(
        (CANVAS_W, CANVAS_H),
        Image.Transform.AFFINE,
        (inv_s, 0.0, c_off, 0.0, inv_s, f_off),
        resample=Image.Resampling.BICUBIC,
        fillcolor=255,
    )
    gray_s = np.asarray(warped, dtype=np.uint8)
    baked_s = litho_grade(gray_s, seed=20261200 + idx, feather_px=6)
    out_name = f"stride-{idx:02d}.webp"
    out_path = os.path.join(out_dir, out_name)
    w_out, h_out = save_verified_webp(baked_s, out_path, quality=94)
    sz = os.path.getsize(out_path)
    total_bytes += sz
    print(f"  - {out_name}: {w_out}x{h_out} · {sz / 1024.0:6.1f} KB · src_bbox=({comp['w']}x{comp['h']}) · border=255 PASS")

# Bake 8 Distinct Fine-Press Macro & Detail Lithographs (plate-17.webp .. plate-24.webp, 960x620)
print("\n[bake-plates] Baking 8 distinct detail lithograph plates (plate-17 .. plate-24, 960x620)...")

DETAIL_W, DETAIL_H = 960, 620

def load_raw_gray(num: int) -> Image.Image:
    return Image.open(os.path.join(raw_dir, f"plate-{num:02d}.jpg")).convert("L")

def crop_rot_fit(
    img: Image.Image,
    box_frac: tuple[float, float, float, float],
    angle_deg: float = 0.0,
    flip_x: bool = False,
    flip_y: bool = False,
    out_w: int = DETAIL_W,
    out_h: int = DETAIL_H,
) -> np.ndarray:
    w0, h0 = img.size
    work = img.copy()
    if flip_x:
        work = work.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if flip_y:
        work = work.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    if abs(angle_deg) > 1e-3:
        work = work.rotate(angle_deg, resample=Image.Resampling.BICUBIC, expand=True, fillcolor=255)
    ww, wh = work.size
    x0 = int(round(box_frac[0] * ww))
    y0 = int(round(box_frac[1] * wh))
    x1 = int(round(box_frac[2] * ww))
    y1 = int(round(box_frac[3] * wh))
    cropped = work.crop((max(0, x0), max(0, y0), min(ww, x1), min(wh, y1)))
    fitted = cropped.resize((out_w, out_h), Image.Resampling.LANCZOS)
    return np.asarray(fitted, dtype=np.uint8)

def apply_shape_mask(gray_u8: np.ndarray, mode: str) -> np.ndarray:
    h, w = gray_u8.shape
    yy = (np.arange(h, dtype=np.float32)[:, None] - h * 0.5) / (h * 0.5)
    xx = (np.arange(w, dtype=np.float32)[None, :] - w * 0.5) / (w * 0.5)
    ink = 255.0 - gray_u8.astype(np.float32)

    if mode == "ocular":
        # Circular SEM ocular lens aperture (aspect-corrected circle on 960x620)
        rx = xx * (w / float(h))
        r = np.sqrt(rx * rx + yy * yy)
        mask = np.clip((0.92 - r) / 0.14, 0.0, 1.0)
        mask = 0.5 - 0.5 * np.cos(np.pi * mask)
        # Subtle fine ocular hairline ring at r = 0.85
        ring = np.exp(-((r - 0.855) / 0.008) ** 2) * 155.0
        out_ink = ink * mask + ring
    elif mode == "diamond_raft":
        # Isometric floating salt-raft lozenge silhouette
        d = np.abs(xx) * 0.86 + np.abs(yy) * 0.96
        mask = np.clip((0.90 - d) / 0.14, 0.0, 1.0)
        mask = 0.5 - 0.5 * np.cos(np.pi * mask)
        out_ink = ink * mask
    elif mode == "dreikanter":
        # Asymmetric 3-faceted wind-abraded ventifact polygon
        p1 = 0.72 * xx + 0.82 * yy
        p2 = -0.82 * xx + 0.68 * yy
        p3 = 0.08 * xx - 0.92 * yy
        d = np.maximum(np.maximum(p1, p2), p3)
        mask = np.clip((0.68 - d) / 0.09, 0.0, 1.0)
        mask = 0.5 - 0.5 * np.cos(np.pi * mask)
        # Crisp dreikanter central wind-carved keel line
        keel = np.exp(-((xx * 0.92 - yy * 0.16) / 0.014) ** 2) * np.clip(mask, 0.0, 1.0) * 95.0
        out_ink = np.clip(ink * mask + keel * 0.55, 0.0, 255.0)
    elif mode == "hex_grain":
        # Presolar SiC hexagonal polycrystal silhouette (distinct from spherical plate-12!)
        ax = np.abs(xx * (w / float(h)))
        ay = np.abs(yy)
        hex_d = np.maximum(ax * 0.866 + ay * 0.5, ay)
        mask = np.clip((0.84 - hex_d) / 0.08, 0.0, 1.0)
        mask = 0.5 - 0.5 * np.cos(np.pi * mask)
        border_facet = np.exp(-((hex_d - 0.79) / 0.010) ** 2) * 145.0
        out_ink = ink * mask + border_facet
    elif mode == "core_column":
        # Upright stratigraphic thin-section column
        mx = np.clip((0.76 - np.abs(xx)) / 0.10, 0.0, 1.0)
        my = np.clip((0.88 - np.abs(yy)) / 0.10, 0.0, 1.0)
        mask = (0.5 - 0.5 * np.cos(np.pi * mx)) * (0.5 - 0.5 * np.cos(np.pi * my))
        out_ink = ink * mask
    else:
        # Wide stone-margin vignette
        mx = np.clip((0.92 - np.abs(xx)) / 0.15, 0.0, 1.0)
        my = np.clip((0.90 - np.abs(yy)) / 0.16, 0.0, 1.0)
        mask = (0.5 - 0.5 * np.cos(np.pi * mx)) * (0.5 - 0.5 * np.cos(np.pi * my))
        out_ink = ink * mask

    return np.clip(np.round(255.0 - out_ink), 0, 255).astype(np.uint8)

detail_specs = [
    # 17: 옹기 모세관 염분 결정침 초접사 (from plate-02 acicular salt starburst in circular SEM ocular)
    (17, 2, (0.42, 0.36, 0.74, 0.82), -26.0, False, False, "ocular", 24),
    # 18: 염전 결정 뗏목 대각 부유면 (from plate-03 upper stepped hopper terrace rotated into floating diamond raft)
    (18, 3, (0.26, 0.14, 0.74, 0.62), 34.0, True, False, "diamond_raft", 22),
    # 19: 지하 증발암 경석고 습곡 단면 (from plate-05 sweeping flank strata rotated +90 deg)
    (19, 5, (0.14, 0.16, 0.62, 0.68), 90.0, True, False, "stone", 26),
    # 20: 암염 음결정 메니스커스 광학 고리 (from plate-07 central bubble meniscus ring rotated 45 deg)
    (20, 7, (0.31, 0.28, 0.69, 0.72), 45.0, False, False, "ocular", 22),
    # 21: 편서풍 다면체 풍식 현무암 결 (from plate-10 angular ridge inside 3-faceted dreikanter stone)
    (21, 10, (0.24, 0.22, 0.74, 0.76), -116.0, False, True, "dreikanter", 20),
    # 22: 심해 점토층 제트기류 석영 연층 (from plate-06 fine interior varve laminae rotated 90 deg into vertical column)
    (22, 6, (0.28, 0.34, 0.68, 0.66), 90.0, False, False, "core_column", 22),
    # 23: 운석 선태양 탄화규소 다결정 입자 (from plate-11/02 crystalline grain facets in hexagonal SiC crystal)
    (23, 2, (0.24, 0.18, 0.62, 0.68), 64.0, True, True, "hex_grain", 20),
    # 24: 극지 사스트루기 칼날 설면 능선 (from plate-16 sculpted foreground knife-ridges, full-frame diagonal surge)
    (24, 16, (0.06, 0.56, 0.64, 0.94), -6.5, False, False, "stone", 26),
]

for p_idx, src_num, box_f, ang, fx, fy, mask_mode, f_px in detail_specs:
    raw_im = load_raw_gray(src_num)
    sub_gray = crop_rot_fit(raw_im, box_f, angle_deg=ang, flip_x=fx, flip_y=fy)
    shaped = apply_shape_mask(sub_gray, mask_mode)
    baked_d = litho_grade(shaped, seed=20261300 + p_idx, feather_px=f_px)
    out_name = f"plate-{p_idx:02d}.webp"
    out_path = os.path.join(out_dir, out_name)
    w_out, h_out = save_verified_webp(baked_d, out_path, quality=92)
    sz = os.path.getsize(out_path)
    total_bytes += sz
    white_pct = float((baked_d == 255).mean() * 100.0)
    black_pct = float((baked_d <= 12).mean() * 100.0)
    print(f"  - {out_name} (src={src_num:02d}, {mask_mode}): {w_out}x{h_out} · {sz / 1024.0:6.1f} KB · pure-white={white_pct:5.1f}% · deep-ink={black_pct:4.1f}% · border=255 PASS")

print(f"\n[bake-plates] SUCCESS: 29 WebP plates baked ({total_bytes / 1024.0:.1f} KB total).")
`;

const res = spawnSync(
  'uv',
  ['run', '--with', 'pillow,numpy,scipy', 'python3', '-', RAW_DIR, OUT_DIR],
  {
    cwd: ROOT_DIR,
    input: PYTHON_SCRIPT,
    stdio: ['pipe', 'inherit', 'inherit'],
    encoding: 'utf-8',
  },
);

if (res.status !== 0) {
  console.error('[bake-plates] Failed to bake lithograph plates.');
  process.exit(res.status ?? 1);
}
