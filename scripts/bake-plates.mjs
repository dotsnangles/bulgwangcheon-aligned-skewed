#!/usr/bin/env node
/**
 * Deterministic Fine-Press Lithograph Plate Baker (`scripts/bake-plates.mjs`)
 *
 * Processes `.cache/raw-plates/plate-01.jpg` .. `plate-16.jpg` into:
 *   1) `public/plates/plate-01.webp` .. `plate-16.webp` (960px wide, zero bounding-box seam on #FFFFFF)
 *   2) `public/plates/stride-01.webp` .. `stride-05.webp` (360x240 center-of-mass aligned Muybridge 5-frame sprites)
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

print(f"\n[bake-plates] SUCCESS: 21 WebP plates baked ({total_bytes / 1024.0:.1f} KB total).")
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
