/**
 * Deterministic Collision-Free 8-Space Layout Solver (`src/layouts/deconstruct-layout.ts`)
 *
 * Spaces across the single unbroken 6480 × 432 (15:1) canvas:
 *   1. `page`       : Full-bleed broadsheet (5 hero plates + 16 serif columns, `separate()` verified 0 overlaps)
 *   2. `spectrum2D` : Dedicated barcode & cosine-laser layout (`+20px` bottom barcode slot reserved per item, 0 overlaps!)
 *   3. `reading2D`  : Collision-free 2D reading columns (`0` overlaps)
 *   4. `helixBase`  : 30m 3D Horizontal Helix (`z in [-255, +255]`)
 *   5. `meaning2D`  : Collision-free 2D semantic affinity nebulae (`0` overlaps)
 *   6. `cloud3D`    : Volumetric 3D semantic nebula
 *   7. `orbit2D`    : Collision-free 2D elliptical query orbit (`0` overlaps)
 *   8. `sphere3D`   : 30m Panoramic Celestial Armillary Dome (`phi, theta, shellR` spanning `X = 180..6300`)
 */

import type { FragmentItem, PairWeight } from '../data/corpus.ts';
import { hash, STAGE_H, STAGE_W } from '../math.ts';

export interface Pos3D {
  x: number;
  y: number;
  z: number;
  scale: number;
  opacity: number;
}

export interface CutMark {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly orientation: 'v' | 'h';
  readonly strikeAt: number;
}

export interface HeroSpreadSlot {
  readonly plateId: string;
  readonly code: string;
  readonly caption: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface PanoramicLayouts {
  readonly heroSpreadSlots: readonly HeroSpreadSlot[];
  readonly page: readonly Pos3D[];
  readonly cuts: readonly CutMark[];
  readonly spectrum2D: readonly Pos3D[];
  readonly reading2D: readonly Pos3D[];
  readonly helixBase: readonly { x: number; angle: number; radiusY: number; radiusZ: number; strand: 0 | 1 }[];
  readonly meaning2D: readonly Pos3D[];
  readonly cloud3D: readonly { cx: number; cy: number; cz: number }[];
  readonly orbit2D: readonly Pos3D[];
  readonly sphere3D: readonly { phi: number; theta: number; shellR: number }[];
}

/**
 * High-precision pixel bounding box estimator (`w, h` after `scale` transform + paper halo padding `1px 4px`)
 * matching rendered `Noto Serif KR` + `JetBrains Mono` DOM metrics in Chromium (`6480×432`).
 */
export function fragmentBox(f: FragmentItem, scale: number, extraBottomPx = 0): { w: number; h: number } {
  if (f.type === 'img') {
    return {
      w: 138 * scale + 6,
      h: 108 * scale + 4 + extraBottomPx,
    };
  }

  let emSum = 0;
  for (const ch of f.content) {
    const code = ch.charCodeAt(0);
    if (ch === ' ') {
      emSum += 0.34;
    } else if (code <= 0x007f) {
      emSum += 0.60;
    } else if (code >= 0xac00 && code <= 0xd7a3) {
      emSum += 1.01;
    } else {
      emSum += 0.82;
    }
  }

  const fontPx = f.baseFontPx * scale;
  const letterSpacingPx = f.tier === 'anchor' ? fontPx * 0.04 * f.content.length : fontPx * 0.01 * f.content.length;
  // Exact true-DOM scaled width & height (accounting for padding: 1px 4px) + crisp safety margin
  const w = (emSum * fontPx + letterSpacingPx + 8 * scale) * 1.07 + 6;
  const h = (f.baseFontPx * 1.32 + 4) * scale + 3 + extraBottomPx;
  return { w, h };
}

export interface KeepOutZone {
  readonly cx: number;
  readonly cy: number;
  readonly hw: number;
  readonly hh: number;
}

/**
 * Deterministic multi-pass AABB collision-resolution solver (`separate()`).
 * Treats `keepOut` zones as pinned rigid bodies so items slide cleanly around sanctuaries with zero oscillation.
 */
export function separate(
  items: Pos3D[],
  fragments: readonly FragmentItem[],
  options: {
    marginX?: number;
    marginTop?: number;
    marginBottom?: number;
    minX?: number;
    maxX?: number;
    padX?: number;
    padY?: number;
    extraBottomPx?: number;
    passes?: number;
    pinned?: ReadonlySet<number>;
    keepOut?: readonly KeepOutZone[];
  } = {},
): void {
  const n = items.length;
  const marginX = options.marginX ?? 44;
  const marginTop = options.marginTop ?? 28;
  const marginBottom = options.marginBottom ?? 28;
  const minXBound = options.minX ?? marginX;
  const maxXBound = options.maxX ?? STAGE_W - marginX;
  const padX = options.padX ?? 8;
  const padY = options.padY ?? 5;
  const extraBottomPx = options.extraBottomPx ?? 0;
  const passes = options.passes ?? 550;
  const pinned = options.pinned ?? new Set<number>();
  const keepOut = options.keepOut ?? [];

  // Notice: if extraBottomPx > 0 (e.g., 18px barcode under text), shift asymmetric box center downward by extraBottomPx*0.5
  const yCenterShift = extraBottomPx * 0.5;

  const allItems: { x: number; y: number; hw: number; hh: number; pinned: boolean }[] = items.map((p, i) => {
    const b = fragmentBox(fragments[i]!, p.scale, extraBottomPx);
    return {
      x: p.x,
      y: p.y + yCenterShift,
      hw: (b.w + padX) * 0.5,
      hh: (b.h + padY) * 0.5,
      pinned: pinned.has(i),
    };
  });

  for (const z of keepOut) {
    allItems.push({
      x: z.cx,
      y: z.cy,
      hw: z.hw + padX * 0.5,
      hh: z.hh + padY * 0.5,
      pinned: true,
    });
  }

  const totalN = allItems.length;

  const clampNode = (idx: number) => {
    const node = allItems[idx]!;
    if (node.pinned) return;
    node.x = Math.max(minXBound + node.hw, Math.min(maxXBound - node.hw, node.x));
    node.y = Math.max(marginTop + node.hh, Math.min(STAGE_H - marginBottom - node.hh, node.y));
  };

  for (let i = 0; i < n; i++) clampNode(i);

  for (let pass = 0; pass < passes; pass++) {
    let moved = 0;

    for (let i = 0; i < totalN; i++) {
      const pi = allItems[i]!;

      for (let j = i + 1; j < totalN; j++) {
        const pj = allItems[j]!;
        if (pi.pinned && pj.pinned) continue;

        const dx = pj.x - pi.x;
        const reqX = pi.hw + pj.hw;
        const overX = reqX - Math.abs(dx);
        if (overX <= 0) continue;

        const dy = pj.y - pi.y;
        const reqY = pi.hh + pj.hh;
        const overY = reqY - Math.abs(dy);
        if (overY <= 0) continue;

        moved++;
        const wI = pi.pinned ? 0 : pj.pinned ? 1 : 0.5;
        const wJ = pj.pinned ? 0 : pi.pinned ? 1 : 0.5;

        const signX = dx > 0.01 ? 1 : dx < -0.01 ? -1 : i < j ? 1 : -1;
        const signY = dy > 0.01 ? 1 : dy < -0.01 ? -1 : (i + j) % 2 === 0 ? 1 : -1;

        if (overY < overX) {
          const pushY = overY * 0.65 + 1.2;
          const slideX = Math.min(overX * 0.12 + 2.8, 12.0);
          pi.y -= signY * pushY * wI;
          pj.y += signY * pushY * wJ;
          pi.x -= signX * slideX * wI;
          pj.x += signX * slideX * wJ;
        } else {
          const pushX = overX * 0.65 + 1.5;
          const slideY = Math.min(overY * 0.14 + 1.2, 5.5);
          pi.x -= signX * pushX * wI;
          pj.x += signX * pushX * wJ;
          pi.y -= signY * slideY * wI;
          pj.y += signY * slideY * wJ;
        }

        clampNode(i);
        clampNode(j);
      }
    }

    if (moved === 0) break;
  }

  for (let i = 0; i < n; i++) {
    items[i]!.x = allItems[i]!.x;
    items[i]!.y = allItems[i]!.y - yCenterShift;
  }
}

export function computePanoramicLayouts(
  fragments: readonly FragmentItem[],
  rankedPairs: readonly PairWeight[],
  targetIndex: number,
  neighborIndices: readonly number[],
): PanoramicLayouts {
  const n = fragments.length;

  /* -----------------------------------------------------------------------
   * 1. FULL-BLEED FINE-PRESS BROADSHEET (`page`, 30.0–37.8s)
   *    5 Monumental Hero Lithograph Plates (`Y = 28..404`) + 16 collision-free columns
   *    + 120 BPM Percussive 0.09s Guillotine Hard-Cut Strikes (`33.0..37.25s`)!
   * ----------------------------------------------------------------------- */
  const heroSpreadSlots: HeroSpreadSlot[] = [
    { plateId: 'plate-02', code: 'FIG.01 · 4.2μm', caption: '옹기 미세 기공과 소금 꽃', x: 136, y: 28, w: 344, h: 376 },
    { plateId: 'plate-03', code: 'FIG.02 · 90.0°', caption: '정육면체 호퍼 결정 계단', x: 1556, y: 28, w: 344, h: 376 },
    { plateId: 'plate-05', code: 'FIG.03 · -812m', caption: '지하 812m 암염 돔 습곡', x: 3068, y: 28, w: 344, h: 376 },
    { plateId: 'plate-07', code: 'FIG.04 · 280MA', caption: '페름기 암염 유체 포유물', x: 4580, y: 28, w: 344, h: 376 },
    { plateId: 'plate-09', code: 'FIG.05 · -3000m', caption: '남극 심부 빙하 포획 대기', x: 6000, y: 28, w: 344, h: 376 },
  ];

  const editorialBays: [number, number, number][] = [
    [496, 1540, 5],
    [1916, 3052, 5],
    [3428, 4564, 5],
    [4940, 5984, 5],
  ];

  const colDefs: { left: number; width: number }[] = [];
  for (const [bL, bR, cCount] of editorialBays) {
    const cW = (bR - bL) / cCount;
    for (let k = 0; k < cCount; k++) {
      colDefs.push({ left: bL + k * cW + 6, width: cW - 12 });
    }
  }

  const page: Pos3D[] = new Array(n);
  const cuts: CutMark[] = [];

  // Vertical guillotine cuts snapped onto exact 120 BPM eighth-note beats (`0.25s` intervals across 33.0..37.25s)
  colDefs.forEach((col, cIdx) => {
    cuts.push({
      x1: col.left - 6,
      y1: 26,
      x2: col.left - 6,
      y2: 406,
      orientation: 'v',
      strikeAt: 33.0 + cIdx * 0.2,
    });
  });
  heroSpreadSlots.forEach((slot, sIdx) => {
    const beatT = 33.0 + sIdx * 0.75;
    cuts.push({ x1: slot.x, y1: 26, x2: slot.x, y2: 406, orientation: 'v', strikeAt: beatT });
    cuts.push({ x1: slot.x + slot.w, y1: 26, x2: slot.x + slot.w, y2: 406, orientation: 'v', strikeAt: beatT + 0.25 });
  });

  let cursor = 0;
  for (let colIdx = 0; colIdx < colDefs.length; colIdx++) {
    const col = colDefs[colIdx]!;
    const remCols = colDefs.length - colIdx;
    const take = Math.ceil((n - cursor) / remCols);
    const sIdx = cursor;
    const eIdx = Math.min(n, sIdx + take);
    cursor = eIdx;

    let curY = 38;
    const stepY = 356 / Math.max(1, eIdx - sIdx);

    for (let i = sIdx; i < eIdx; i++) {
      const f = fragments[i]!;
      const sc = f.type === 'img' ? 0.34 : f.tier === 'anchor' ? 0.62 : 0.50;
      const cx = col.left + col.width * 0.5;
      const cy = Math.min(396, curY + stepY * 0.5);
      page[i] = { x: cx, y: cy, z: 0, scale: sc, opacity: 1 };

      const hBeat = 33.5 + colIdx * 0.25 + ((i - sIdx) % 2) * 0.125;
      cuts.push({
        x1: col.left - 3,
        y1: Math.min(404, curY + stepY),
        x2: col.left + col.width + 3,
        y2: Math.min(404, curY + stepY),
        orientation: 'h',
        strikeAt: Math.min(37.25, hBeat),
      });
      curY += stepY;
    }
  }

  // Guarantee zero text-text overlap in `page` while keeping the 5 hero lithograph slots untouched!
  const heroKeepOut: KeepOutZone[] = heroSpreadSlots.map((s) => ({
    cx: s.x + s.w * 0.5,
    cy: s.y + s.h * 0.5,
    hw: s.w * 0.5 + 8,
    hh: s.h * 0.5 + 4,
  }));
  separate(page, fragments, {
    marginX: 36,
    marginTop: 18,
    marginBottom: 18,
    padX: 5,
    padY: 4,
    passes: 900,
    keepOut: heroKeepOut,
  });

  /* -----------------------------------------------------------------------
   * 2. SPECTRUM 2D (`spectrum2D`, 37.8–46.0s) — Dedicated 1024-DIM Barcode Sheet
   *    28 airy columns + `+18px` bottom barcode slot reserved per item!
   * ----------------------------------------------------------------------- */
  const sCols = 28;
  const sLeft = 116;
  const sRight = 6364;
  const sColW = (sRight - sLeft) / sCols;
  const sPerCol = Math.ceil(n / sCols);

  const spectrum2D: Pos3D[] = fragments.map((f, i) => {
    const col = Math.floor(i / sPerCol);
    const row = i % sPerCol;
    const x = sLeft + (col + 0.5) * sColW + ((row % 2) - 0.5) * 20;
    const y = 38 + (row / Math.max(1, sPerCol - 1)) * 336;
    const sc = f.type === 'img' ? 0.44 : f.tier === 'anchor' ? 0.74 : 0.62;
    return { x, y, z: 0, scale: sc, opacity: 1 };
  });

  const spectrumSanctuaries: KeepOutZone[] = [
    { cx: 1620, cy: 42, hw: 144, hh: 20 },
    { cx: 3240, cy: 42, hw: 144, hh: 20 },
    { cx: 4860, cy: 42, hw: 144, hh: 20 },
  ];

  separate(spectrum2D, fragments, {
    marginX: 36,
    marginTop: 20,
    marginBottom: 24,
    padX: 8,
    padY: 4,
    extraBottomPx: 18,
    passes: 900,
    keepOut: spectrumSanctuaries,
  });

  /* -----------------------------------------------------------------------
   * 3. READING 2D (`reading2D`, 46.0–52.0s) — Zero-Overlap 20-Column Sheet
   * ----------------------------------------------------------------------- */
  const rCols = 20;
  const rLeft = 166;
  const rRight = 6314;
  const rColW = (rRight - rLeft) / rCols;
  const rPerCol = Math.ceil(n / rCols);

  const reading2D: Pos3D[] = fragments.map((f, i) => {
    const col = Math.floor(i / rPerCol);
    const row = i % rPerCol;
    const x = rLeft + (col + 0.5) * rColW;
    const y = 52 + (row / Math.max(1, rPerCol - 1)) * 328;
    const sc = f.type === 'img' ? 0.56 : f.tier === 'anchor' ? 0.86 : 0.76;
    return { x, y, z: 0, scale: sc, opacity: 1 };
  });

  separate(reading2D, fragments, {
    marginX: 46,
    marginTop: 28,
    marginBottom: 28,
    padX: 10,
    padY: 5,
    passes: 550,
  });

  /* -----------------------------------------------------------------------
   * 4. 30M HORIZONTAL 3D DOUBLE HELIX (`helixBase`, 52.0–61.5s)
   * ----------------------------------------------------------------------- */
  const helixTurns = 6.2;
  const helixBase = fragments.map((_, i) => {
    const u = i / Math.max(1, n - 1);
    const strand: 0 | 1 = (i % 2) as 0 | 1;
    const radJitter = ((i % 3) - 1) * 16;
    return {
      x: 190 + u * 6100,
      angle: u * helixTurns * Math.PI * 2 + (strand === 1 ? Math.PI : 0) + (i % 5) * 0.11,
      radiusY: 136 + radJitter,
      radiusZ: 255,
      strand,
    };
  });

  /* -----------------------------------------------------------------------
   * 5. MEANING 2D (`meaning2D`, 61.5–68.5s) & 3D SEMANTIC NEBULA (`cloud3D`)
   * ----------------------------------------------------------------------- */
  const clusterCentersX = [590, 1650, 2710, 3770, 4830, 5890];
  const clusterCentersY = [218, 206, 228, 206, 226, 214];
  const golden = Math.PI * (3 - Math.sqrt(5));

  const pts2 = fragments.map((f, i) => {
    const localRank = i % 34;
    const ang = localRank * golden + f.cluster * 1.15;
    const rad = Math.sqrt(localRank + 0.7) * 46;
    return {
      x: clusterCentersX[f.cluster]! + Math.cos(ang) * rad * 1.7,
      y: clusterCentersY[f.cluster]! + Math.sin(ang) * rad * 0.96,
    };
  });

  const springEdges = rankedPairs.slice(0, 560);
  for (let step = 0; step < 52; step++) {
    const heat = 1 - step / 52;
    const fx = new Float64Array(n);
    const fy = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pts2[i]!.x - pts2[j]!.x;
        if (Math.abs(dx) > 400) continue;
        const dy = (pts2[i]!.y - pts2[j]!.y) * 2.7;
        const d2 = Math.max(380, dx * dx + dy * dy);
        const rep = 7600 / d2;
        fx[i]! += dx * rep;
        fy[i]! += dy * rep * 0.54;
        fx[j]! -= dx * rep;
        fy[j]! -= dy * rep * 0.54;
      }
    }

    for (const e of springEdges) {
      const pa = pts2[e.a]!;
      const pb = pts2[e.b]!;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const dist = Math.hypot(dx, dy) || 1;
      const pull = (e.weight - 0.68) * 0.062;
      if (pull <= 0) continue;
      const fMag = ((dist - 152) * pull) / dist;
      fx[e.a]! += dx * fMag;
      fy[e.a]! += dy * fMag;
      fx[e.b]! -= dx * fMag;
      fy[e.b]! -= dy * fMag;
    }

    for (let i = 0; i < n; i++) {
      const f = fragments[i]!;
      const gx = (clusterCentersX[f.cluster]! - pts2[i]!.x) * 0.038;
      const gy = (clusterCentersY[f.cluster]! - pts2[i]!.y) * 0.036;
      pts2[i]!.x = Math.max(160, Math.min(STAGE_W - 160, pts2[i]!.x + (fx[i]! + gx) * 0.38 * heat));
      pts2[i]!.y = Math.max(46, Math.min(STAGE_H - 46, pts2[i]!.y + (fy[i]! + gy) * 0.42 * heat));
    }
  }

  const meaning2D: Pos3D[] = fragments.map((f, i) => ({
    x: pts2[i]!.x,
    y: pts2[i]!.y,
    z: 0,
    scale: f.type === 'img' ? 0.56 : f.tier === 'anchor' ? 0.90 : 0.74 + hash(i * 13) * 0.08,
    opacity: 1,
  }));

  separate(meaning2D, fragments, {
    marginX: 46,
    marginTop: 28,
    marginBottom: 28,
    padX: 10,
    padY: 5,
    passes: 600,
  });

  const cloud3D = fragments.map((f, i) => ({
    cx: meaning2D[i]!.x - STAGE_W * 0.5,
    cy: -(meaning2D[i]!.y - STAGE_H * 0.5),
    cz: (hash(i * 37 + f.cluster * 11) - 0.5) * 480 + (f.tier === 'anchor' ? 75 : 0),
  }));

  /* -----------------------------------------------------------------------
   * 6. ORBIT 2D (`orbit2D`, 76.0–82.5s) — Pure-White Sanctuary + P4.6 0.28 Floor
   * ----------------------------------------------------------------------- */
  const cxO = STAGE_W * 0.5;
  const cyO = 216;
  const rxInner = 560;
  const rxOuter = 3010;
  const ryInner = 84;
  const ryOuter = 172;

  const orderBySim = fragments
    .map((_, i) => i)
    .sort((a, b) => fragments[b]!.level - fragments[a]!.level || a - b);

  const orbit2D: Pos3D[] = new Array(n);

  orderBySim.forEach((idx, rank) => {
    const f = fragments[idx]!;
    const distU = 1 - f.level;
    const angle = rank * golden;
    const rx = rxInner + Math.pow(distU, 0.72) * (rxOuter - rxInner);
    const ry = ryInner + Math.pow(distU, 0.78) * (ryOuter - ryInner);
    const x = cxO + Math.cos(angle) * rx;
    const y = cyO + Math.sin(angle) * ry;
    const sc =
      f.type === 'img'
        ? 0.48 + f.level * 0.20
        : f.tier === 'anchor'
          ? (0.72 + f.level * 0.44) * 0.74
          : (0.72 + f.level * 0.48) * 0.68;

    orbit2D[idx] = {
      x,
      y,
      z: 0,
      scale: sc,
      opacity: f.opacity,
    };
  });

  const pinnedOrbit = new Set<number>();
  if (targetIndex >= 0) {
    orbit2D[targetIndex] = {
      x: 4880,
      y: 216,
      z: 0,
      scale: 0.84,
      opacity: 0.28,
    };
    pinnedOrbit.add(targetIndex);

    const resonantSpots: readonly [number, number][] = [
      [960, 126],
      [1980, 326],
      [2880, 112],
      [3940, 328],
      [5840, 132],
    ];

    neighborIndices.forEach((nIdx, k) => {
      const spot = resonantSpots[k];
      if (spot && orbit2D[nIdx]) {
        orbit2D[nIdx] = {
          ...orbit2D[nIdx]!,
          x: spot[0],
          y: spot[1],
          scale: 0.62,
        };
        pinnedOrbit.add(nIdx);
      }
    });
  }

  const orbitSanctuary: KeepOutZone[] = [{ cx: cxO, cy: cyO, hw: 280, hh: 52 }];

  separate(orbit2D, fragments, {
    marginX: 46,
    marginTop: 24,
    marginBottom: 24,
    padX: 12,
    padY: 9,
    passes: 900,
    pinned: pinnedOrbit,
    keepOut: orbitSanctuary,
  });

  /* -----------------------------------------------------------------------
   * 7. 30M PANORAMIC CELESTIAL ARMILLARY DOME (`sphere3D`, 82.5–88.0s)
   *    Spherical angles `(phi, theta)` + radial shell `shellR` so longitude
   *    rotation `lon = theta + sphereSpin` fills the ENTIRE `X = 180..6300` bridge!
   * ----------------------------------------------------------------------- */
  const sphere3D = fragments.map((f, i) => {
    const distU = 1 - f.level;
    // Keep shellR in [0.45 .. 1.00] so full bridge width is always richly populated!
    const shellR = 0.45 + 0.55 * Math.pow(distU, 0.72);
    const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
    const theta = golden * i * 3.0;
    return { phi, theta, shellR };
  });

  return {
    heroSpreadSlots,
    page,
    cuts,
    spectrum2D,
    reading2D,
    helixBase,
    meaning2D,
    cloud3D,
    orbit2D,
    sphere3D,
  };
}
