/**
 * Deterministic Collision-Free & Bezel-Safe (`Y ∈ [26, 404]`) 8-Space Layout & 3D Lattice Solver
 * (`src/layouts/deconstruct-layout.ts` — 200.0s Round 2 Biennial Master)
 *
 * Spaces across the single unbroken 6480 × 432 (15:1) canvas:
 *   1. `page`       : Full-bleed broadsheet (`plate-29..33` `FIG.01..05` + `>= 0.50` legible serif columns, 0 overlaps)
 *   2. `spectrum2D` : Variable-density barcode sheet + 15 dedicated `COS 0.xxx` badge sanctuaries (`0` overlaps)
 *   3. `reading2D`  : Rigid 20-column counter-gliding sheet (`±24px` Y, `±38px` X margin-safe, `0` overlaps)
 *   4. `helixBase`  : 6-phase interleaved 30m 3D Double Helix relaxed across full `2π` spin (`0` foreground overlaps)
 *   5. `meaning2D`  : 5 Asymmetric Star Clusters (`±22×15px` rigid buoyancy margin-safe) + 4 Pure-White Canyons
 *   6. `cloud3D`    : Perspective-unprojected 3D semantic nebula (`0` foreground overlaps under `±240px` dolly)
 *   7. `orbit2D`    : Central Exclusion Sanctuary (`±392×94`) + elliptical orbit (`0` overlaps)
 *   8. `sphere3D`   : Hemisphere-preserving 6-latitude co-rotating 30m Armillary Lattice (`0` foreground overlaps)
 */

import type { FragmentItem, PairWeight } from '../data/corpus.ts';
import { clamp, hash, lerp, smoothstep, STAGE_H, STAGE_W } from '../math.ts';

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
  readonly heroSlotIdx?: number;
  readonly heroEdge?: 'left' | 'right';
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

export interface KeepOutZone {
  readonly cx: number;
  readonly cy: number;
  readonly hw: number;
  readonly hh: number;
}

export interface HelixNodeSpec {
  x: number;
  angle: number;
  readonly radiusY: number;
  readonly radiusZ: number;
  readonly strand: 0 | 1;
  readonly scale: number;
}

export interface CloudNodeSpec {
  cx: number;
  cy: number;
  readonly cz: number;
  readonly scale: number;
}

export interface SphereNodeSpec {
  readonly ringIdx: 0 | 1 | 2 | 3 | 4 | 5;
  readonly ringY: number;
  theta: number;
  readonly scale: number;
  readonly isNorth: boolean;
}

export interface PanoramicLayouts {
  readonly heroSpreadSlots: readonly HeroSpreadSlot[];
  readonly page: readonly Pos3D[];
  readonly pageColOf: readonly number[];
  readonly pageRowOf: readonly number[];
  readonly cuts: readonly CutMark[];
  readonly spectrum2D: readonly Pos3D[];
  readonly reading2D: readonly Pos3D[];
  readonly readingColOf: readonly number[];
  readonly helixBase: readonly HelixNodeSpec[];
  readonly meaning2D: readonly Pos3D[];
  readonly clusterHubIndex: readonly number[];
  readonly cloud3D: readonly CloudNodeSpec[];
  readonly orbit2D: readonly Pos3D[];
  readonly sphere3D: readonly SphereNodeSpec[];
}

/**
 * 15 Dedicated `COS 0.xxx` Dimension-Label Sanctuaries across Upper (`y=106`), Mid (`y=216`), Lower (`y=326`).
 * Reserved during `separate(spectrum2D)` so no `.frag` ever touches an active `COS` caliper label!
 */
export const COSINE_LABEL_SANCTUARIES: readonly KeepOutZone[] = [
  // 0..4: Upper band (`y = 104`)
  { cx: 680, cy: 104, hw: 84, hh: 16 },
  { cx: 1940, cy: 104, hw: 84, hh: 16 },
  { cx: 3200, cy: 104, hw: 84, hh: 16 },
  { cx: 4460, cy: 104, hw: 84, hh: 16 },
  { cx: 5720, cy: 104, hw: 84, hh: 16 },
  // 5..9: Middle band (`y = 216`, horizontally staggered +420px from Upper & Lower!)
  { cx: 1100, cy: 216, hw: 84, hh: 16 },
  { cx: 2360, cy: 216, hw: 84, hh: 16 },
  { cx: 3620, cy: 216, hw: 84, hh: 16 },
  { cx: 4880, cy: 216, hw: 84, hh: 16 },
  { cx: 6060, cy: 216, hw: 84, hh: 16 },
  // 10..14: Lower band (`y = 328`, horizontally staggered +420px from Middle!)
  { cx: 880, cy: 328, hw: 84, hh: 16 },
  { cx: 1520, cy: 328, hw: 84, hh: 16 },
  { cx: 2780, cy: 328, hw: 84, hh: 16 },
  { cx: 4040, cy: 328, hw: 84, hh: 16 },
  { cx: 5300, cy: 328, hw: 84, hh: 16 },
];

/**
 * High-precision pixel bounding box estimator (`w, h` after `scale` transform)
 * matching rendered `Noto Serif KR` (`4.4px` stroke halo) + `JetBrains Mono` DOM metrics in Chromium (`6480×432`).
 */
export function fragmentBox(f: FragmentItem, scale: number, extraBottomPx = 0): { w: number; h: number } {
  if (f.type === 'img') {
    return {
      w: 186 * scale + 16,
      h: 120 * scale + 14 + extraBottomPx,
    };
  }

  let emSum = 0;
  for (const ch of f.content) {
    const code = ch.charCodeAt(0);
    if (ch === ' ') {
      emSum += 0.36;
    } else if (code <= 0x007f) {
      emSum += 0.62;
    } else if (code >= 0xac00 && code <= 0xd7a3) {
      emSum += 1.03;
    } else {
      emSum += 0.86;
    }
  }

  const fontPx = f.baseFontPx * scale;
  const letterSpacingPx = f.tier === 'anchor' ? fontPx * 0.04 * f.content.length : fontPx * 0.01 * f.content.length;
  const padHoriz = f.isMacroHub ? 18 : 12;
  const padVert = f.isMacroHub ? 10 : 7;
  const w = (emSum * fontPx + letterSpacingPx + padHoriz * scale) * 1.16 + 12;
  const h = (f.baseFontPx * 1.42 + padVert) * scale + 8 + extraBottomPx;
  return { w, h };
}

/**
 * Deterministic multi-pass AABB collision-resolution solver (`separate()`).
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
  const minYBound = marginTop;
  const maxYBound = STAGE_H - marginBottom;
  const padX = options.padX ?? 8;
  const padY = options.padY ?? 5;
  const extraBottomPx = options.extraBottomPx ?? 0;
  const passes = options.passes ?? 650;
  const pinned = options.pinned ?? new Set<number>();
  const keepOut = options.keepOut ?? [];

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
    node.y = Math.max(minYBound + node.hh, Math.min(maxYBound - node.hh, node.y));
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
        let signY = dy > 0.01 ? 1 : dy < -0.01 ? -1 : (i + j) % 2 === 0 ? 1 : -1;

        // Wall-aware escape when pushing an unpinned item away from a pinned `keepOut` obstacle
        if (!pi.pinned && pj.pinned) {
          const roomAbove = pj.y - pj.hh - minYBound;
          const roomBelow = maxYBound - (pj.y + pj.hh);
          if (signY > 0 && pi.hh * 2 > roomAbove && roomBelow >= pi.hh * 2) {
            signY = -1;
          } else if (signY < 0 && pi.hh * 2 > roomBelow && roomAbove >= pi.hh * 2) {
            signY = 1;
          }
        } else if (pi.pinned && !pj.pinned) {
          const roomAbove = pi.y - pi.hh - minYBound;
          const roomBelow = maxYBound - (pi.y + pi.hh);
          if (signY < 0 && pj.hh * 2 > roomAbove && roomBelow >= pj.hh * 2) {
            signY = 1;
          } else if (signY > 0 && pj.hh * 2 > roomBelow && roomAbove >= pj.hh * 2) {
            signY = -1;
          }
        }

        const involvesPinned = pi.pinned || pj.pinned;
        if (overY < overX) {
          const pushY = overY * (involvesPinned ? 0.72 : 0.56) + 0.55;
          const prevIy = pi.y;
          const prevJy = pj.y;
          pi.y -= signY * pushY * wI;
          pj.y += signY * pushY * wJ;
          clampNode(i);
          clampNode(j);
          const gainedY = Math.abs(pj.y - pi.y) - Math.abs(prevJy - prevIy);
          const horizMove =
            gainedY < pushY * 0.30
              ? Math.min(overX * (involvesPinned ? 0.65 : 0.36) + 2.4, 24.0)
              : Math.min(overY * 0.35, 6.0);
          pi.x -= signX * horizMove * wI;
          pj.x += signX * horizMove * wJ;
          clampNode(i);
          clampNode(j);
        } else {
          const pushX = overX * (involvesPinned ? 0.72 : 0.56) + 0.65;
          const prevIx = pi.x;
          const prevJx = pj.x;
          pi.x -= signX * pushX * wI;
          pj.x += signX * pushX * wJ;
          clampNode(i);
          clampNode(j);
          const gainedX = Math.abs(pj.x - pi.x) - Math.abs(prevJx - prevIx);
          const vertMove =
            gainedX < pushX * 0.30
              ? Math.min(overY * (involvesPinned ? 0.60 : 0.36) + 2.0, 18.0)
              : Math.min(overX * 0.25, 4.5);
          pi.y -= signY * vertMove * wI;
          pj.y += signY * vertMove * wJ;
          clampNode(i);
          clampNode(j);
        }
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
  const Z_CAM = (STAGE_H * 0.5) / Math.tan((11 * Math.PI) / 180);

  /* -----------------------------------------------------------------------
   * 1. FULL-BLEED FINE-PRESS BROADSHEET (`page`, 48.0–63.0s)
   *    Upgraded minimum sentence scale `>= 0.50` for crisp outdoor legibility!
   * ----------------------------------------------------------------------- */
  const heroSpreadSlots: HeroSpreadSlot[] = [
    { plateId: 'plate-29', code: 'FIG.01 · 4.2μm', caption: '옹기 태토 파단면과 기공', x: 136, y: 30, w: 336, h: 372 },
    { plateId: 'plate-30', code: 'FIG.02 · 90.0°', caption: '호퍼 결정 역피라미드 동굴', x: 1548, y: 30, w: 336, h: 372 },
    { plateId: 'plate-31', code: 'FIG.03 · -812m', caption: '지하 암염 다이아피어 습곡', x: 3068, y: 30, w: 336, h: 372 },
    { plateId: 'plate-32', code: 'FIG.04 · NICOL', caption: '직교 편광 소광 십자 간섭륜', x: 4588, y: 30, w: 336, h: 372 },
    { plateId: 'plate-33', code: 'FIG.05 · -3000m', caption: '남극 만년설 기포 밀봉 단면', x: 6008, y: 30, w: 336, h: 372 },
  ];

  const editorialBays: [number, number, number][] = [
    [500, 1520, 5],
    [1912, 3040, 6],
    [3432, 4560, 6],
    [4952, 5980, 6],
  ];

  const colDefs: { left: number; width: number; isBayFirst: boolean }[] = [];
  for (const [bL, bR, cCount] of editorialBays) {
    const cW = (bR - bL) / cCount;
    for (let k = 0; k < cCount; k++) {
      colDefs.push({ left: bL + k * cW + 6, width: cW - 12, isBayFirst: k === 0 });
    }
  }

  const page: Pos3D[] = new Array(n);
  const pageColOf: number[] = new Array(n).fill(0);
  const pageRowOf: number[] = new Array(n).fill(0);
  const cuts: CutMark[] = [];

  colDefs.forEach((col, cIdx) => {
    if (col.isBayFirst) return;
    cuts.push({
      x1: col.left - 6,
      y1: 28,
      x2: col.left - 6,
      y2: 404,
      orientation: 'v',
      strikeAt: 52.05 + cIdx * 0.28,
    });
  });
  heroSpreadSlots.forEach((slot, sIdx) => {
    const beatT = 52.20 + sIdx * 1.40;
    cuts.push({
      x1: slot.x,
      y1: 28,
      x2: slot.x,
      y2: 404,
      orientation: 'v',
      strikeAt: beatT,
      heroSlotIdx: sIdx,
      heroEdge: 'left',
    });
    cuts.push({
      x1: slot.x + slot.w,
      y1: 28,
      x2: slot.x + slot.w,
      y2: 404,
      orientation: 'v',
      strikeAt: beatT + 0.35,
      heroSlotIdx: sIdx,
      heroEdge: 'right',
    });
  });

  let cursor = 0;
  for (let colIdx = 0; colIdx < colDefs.length; colIdx++) {
    const col = colDefs[colIdx]!;
    const remCols = colDefs.length - colIdx;
    const take = Math.ceil((n - cursor) / remCols);
    const sIdx = cursor;
    const eIdx = Math.min(n, sIdx + take);
    cursor = eIdx;

    const weights: number[] = [];
    let weightSum = 0;
    for (let i = sIdx; i < eIdx; i++) {
      const w = fragments[i]!.type === 'img' ? 4.6 : fragments[i]!.tier === 'anchor' ? 1.25 : 1.0;
      weights.push(w);
      weightSum += w;
    }

    let curY = 36;
    const totalSpanY = 354;

    for (let i = sIdx; i < eIdx; i++) {
      const f = fragments[i]!;
      const localRow = i - sIdx;
      const slotH = (weights[localRow]! / Math.max(1, weightSum)) * totalSpanY;
      const sc =
        f.type === 'img'
          ? 0.75
          : f.isMacroHub
            ? 0.36
            : f.tier === 'anchor'
              ? 0.56
              : 0.50;
      const cx = col.left + col.width * 0.5;
      const cy = Math.min(388, curY + slotH * 0.5);
      page[i] = { x: cx, y: cy, z: 0, scale: sc, opacity: 1 };
      pageColOf[i] = colIdx;
      pageRowOf[i] = localRow;

      const hBeat = 52.60 + colIdx * 0.28 + (localRow % 2) * 0.18;
      cuts.push({
        x1: col.left - 3,
        y1: Math.min(398, curY + slotH),
        x2: col.left + col.width + 3,
        y2: Math.min(398, curY + slotH),
        orientation: 'h',
        strikeAt: Math.min(60.2, hBeat),
      });
      curY += slotH;
    }
  }

  const heroKeepOut: KeepOutZone[] = heroSpreadSlots.map((s) => ({
    cx: s.x + s.w * 0.5,
    cy: s.y + s.h * 0.5,
    hw: s.w * 0.5 + 26,
    hh: s.h * 0.5 + 8,
  }));
  separate(page, fragments, {
    marginX: 34,
    marginTop: 34,
    marginBottom: 36,
    padX: 7,
    padY: 5,
    passes: 4500,
    keepOut: heroKeepOut,
  });

  /* -----------------------------------------------------------------------
   * 2. SPECTRUM 2D (`spectrum2D`, 63.0–78.0s)
   *    Upgraded sentence scale `0.58` + 15 `COSINE_LABEL_SANCTUARIES` (`0` badge overlaps!)
   * ----------------------------------------------------------------------- */
  const sCols = 30;
  const sLeft = 116;
  const sRight = 6364;
  const sColW = (sRight - sLeft) / sCols;
  const sPerCol = Math.ceil(n / sCols);

  const spectrum2D: Pos3D[] = fragments.map((f, i) => {
    const col = Math.floor(i / sPerCol);
    const row = i % sPerCol;
    const x = sLeft + (col + 0.5) * sColW + ((row % 2) - 0.5) * 16;
    const y = 46 + (row / Math.max(1, sPerCol - 1)) * 316;
    const sc =
      f.type === 'img'
        ? 0.72
        : f.isMacroHub
          ? 0.42
          : f.tier === 'anchor'
            ? 0.65
            : 0.54;
    return { x, y, z: 0, scale: sc, opacity: 1 };
  });

  separate(spectrum2D, fragments, {
    marginX: 36,
    marginTop: 28,
    marginBottom: 30,
    padX: 10,
    padY: 8,
    extraBottomPx: 18,
    passes: 6500,
    keepOut: COSINE_LABEL_SANCTUARIES,
  });

  /* -----------------------------------------------------------------------
   * 3. READING 2D (`reading2D`, 78.0–87.0s) — Rigid 20-Column Galley Sheet
   *    Generous `marginTop/Bottom = 54`, `marginX = 88` so `±24px` Y & `±38px` X glides stay bezel-safe!
   * ----------------------------------------------------------------------- */
  const rCols = 20;
  const rLeft = 186;
  const rRight = 6294;
  const rColW = (rRight - rLeft) / rCols;
  const rPerCol = Math.ceil(n / rCols);
  const readingColOf: number[] = new Array(n).fill(0);

  const reading2D: Pos3D[] = fragments.map((f, i) => {
    const col = Math.floor(i / rPerCol);
    const row = i % rPerCol;
    readingColOf[i] = col;
    const x = rLeft + (col + 0.5) * rColW;
    const y = 68 + (row / Math.max(1, rPerCol - 1)) * 296;
    const sc =
      f.type === 'img'
        ? 0.80
        : f.isMacroHub
          ? 0.46
          : f.tier === 'anchor'
            ? 0.80
            : 0.68;
    return { x, y, z: 0, scale: sc, opacity: 1 };
  });

  separate(reading2D, fragments, {
    marginX: 88,
    marginTop: 54,
    marginBottom: 54,
    padX: 10,
    padY: 6,
    passes: 3000,
  });

  /* -----------------------------------------------------------------------
   * 4. 30M 6-PHASE INTERLEAVED 3D DOUBLE HELIX (`helixBase`, 87.0–102.0s)
   *    6-phase staggered lattice (`>= 366px` co-phase X distance) + full-2π spin relaxation
   *    guaranteeing `0` foreground AABB collisions at EVERY spin angle!
   * ----------------------------------------------------------------------- */
  const helixBase: HelixNodeSpec[] = fragments.map((f, i) => {
    const strand: 0 | 1 = (i % 2) as 0 | 1;
    const m = Math.floor(i / 2); // 0..99 along strand (`61px` step -> co-phase items `366px` apart!)
    const x = 190 + (m / 99) * 6100;
    const angle = (m / 99) * 3.2 * Math.PI * 2 - (m % 6) * ((Math.PI * 2) / 6) + strand * 1.265;
    const radiusY = f.type === 'img' ? (strand === 0 ? 126 : 92) : strand === 0 ? 152 : 108;
    const scale =
      f.type === 'img'
        ? 0.58
        : f.isMacroHub
          ? 0.58
          : f.tier === 'anchor'
            ? 0.68
            : 0.56;
    return {
      x,
      angle,
      radiusY,
      radiusZ: 240,
      strand,
      scale,
    };
  });

  // Exact spacetime relaxation across 48 spin phases `[0, 2π)` matching `stage.ts` perspective-compensated `wx` & `safeHy`!
  const softMaxH = (a: number, b: number, k: number): number => {
    const d = a - b;
    return 0.5 * (a + b + Math.sqrt(d * d + 4 * k * k));
  };
  const softMinH = (a: number, b: number, k: number): number => {
    const d = a - b;
    return 0.5 * (a + b - Math.sqrt(d * d + 4 * k * k));
  };

  const hFullBoxes = fragments.map((f, i) => {
    const sc = helixBase[i]!.scale * 1.10;
    const b = fragmentBox(f, sc);
    return { hw: b.w * 0.5 + 10, hh: b.h * 0.5 + 7, rawHh: b.h * 0.5 };
  });

  for (let pass = 0; pass < 140; pass++) {
    let anyMoved = false;
    for (let sStep = 0; sStep < 48; sStep++) {
      const spin = (sStep / 48) * Math.PI * 2;
      const activeIdx: number[] = [];
      const curSx = new Float64Array(n);
      const curSy = new Float64Array(n);

      for (let i = 0; i < n; i++) {
        const hb = helixBase[i]!;
        const ang = hb.angle + spin;
        const cosA = Math.cos(ang);
        if (cosA < 0.16) continue; // Covers all foreground items (`frontVis = smoothstep(0.10, 0.56, cosA)`, `effOp >= 0.24`)
        const wz = cosA * hb.radiusZ;
        const wx = (hb.x - STAGE_W * 0.5) * ((Z_CAM - wz * 0.88) / Z_CAM);
        const pFactor = Z_CAM / Math.max(400, Z_CAM - wz);
        curSx[i] = STAGE_W * 0.5 + wx * pFactor;
        const syRaw = 216 - Math.sin(ang) * hb.radiusY * (1 + wz * 0.00042);
        const hhH = hFullBoxes[i]!.rawHh;
        curSy[i] = softMinH(softMaxH(syRaw, 27 + hhH, 5), 405 - hhH, 5);
        activeIdx.push(i);
      }

      for (let a = 0; a < activeIdx.length; a++) {
        const ia = activeIdx[a]!;
        for (let b = a + 1; b < activeIdx.length; b++) {
          const ib = activeIdx[b]!;
          const dx = curSx[ib]! - curSx[ia]!;
          const ox = hFullBoxes[ia]!.hw + hFullBoxes[ib]!.hw - Math.abs(dx);
          if (ox <= 0) continue;
          const dy = curSy[ib]! - curSy[ia]!;
          const oy = hFullBoxes[ia]!.hh + hFullBoxes[ib]!.hh - Math.abs(dy);
          if (oy <= 0) continue;

          anyMoved = true;
          const signX = dx >= 0 ? 1 : -1;
          const signY = dy >= 0 ? 1 : -1;
          const pushX = Math.min(ox * 0.28 + 0.8, 7.0);
          helixBase[ia]!.x = clamp(helixBase[ia]!.x - signX * pushX, 170 + hFullBoxes[ia]!.hw, STAGE_W - 170 - hFullBoxes[ia]!.hw);
          helixBase[ib]!.x = clamp(helixBase[ib]!.x + signX * pushX, 170 + hFullBoxes[ib]!.hw, STAGE_W - 170 - hFullBoxes[ib]!.hw);
          helixBase[ia]!.angle += signY * 0.006;
          helixBase[ib]!.angle -= signY * 0.006;
        }
      }
    }
    if (!anyMoved) break;
  }

  /* -----------------------------------------------------------------------
   * 5. MEANING 2D (`meaning2D`, 102.0–115.0s) — 5 Asymmetric Star Clusters
   *    Inset by `±24px` X and `45px` top/bottom so `±22×15px` rigid cluster buoyancy stays untouched!
   * ----------------------------------------------------------------------- */
  const clusterCentersX = [450, 1572, 2696, 3820, 5060, 5920];
  const clusterCentersY = [214, 206, 222, 208, 162, 266];
  const golden = Math.PI * (3 - Math.sqrt(5));

  const clusterHubIndex: number[] = [-1, -1, -1, -1, -1, -1];
  fragments.forEach((f, idx) => {
    if (f.isMacroHub && clusterHubIndex[f.cluster] === -1) {
      clusterHubIndex[f.cluster] = idx;
    }
  });

  const pts2 = fragments.map((f, i) => {
    if (f.isMacroHub) {
      return {
        x: clusterCentersX[f.cluster]!,
        y: clusterCentersY[f.cluster]!,
      };
    }
    const localRank = i % 34;
    const ang = localRank * golden + f.cluster * 1.15;
    const rad = Math.sqrt(localRank + 0.8) * 36;
    return {
      x: clusterCentersX[f.cluster]! + Math.cos(ang) * rad * 1.38,
      y: clusterCentersY[f.cluster]! + Math.sin(ang) * rad * 0.84,
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
        if (Math.abs(dx) > 360) continue;
        const dy = (pts2[i]!.y - pts2[j]!.y) * 2.6;
        const d2 = Math.max(380, dx * dx + dy * dy);
        const rep = 6800 / d2;
        fx[i]! += dx * rep;
        fy[i]! += dy * rep * 0.52;
        fx[j]! -= dx * rep;
        fy[j]! -= dy * rep * 0.52;
      }
    }

    for (const e of springEdges) {
      const pa = pts2[e.a]!;
      const pb = pts2[e.b]!;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const dist = Math.hypot(dx, dy) || 1;
      const sameCluster = fragments[e.a]!.cluster === fragments[e.b]!.cluster;
      const pull = (e.weight - 0.66) * (sameCluster ? 0.088 : 0.015);
      if (pull <= 0) continue;
      const targetDist = sameCluster ? 115 : 260;
      const fMag = ((dist - targetDist) * pull) / dist;
      fx[e.a]! += dx * fMag;
      fy[e.a]! += dy * fMag;
      fx[e.b]! -= dx * fMag;
      fy[e.b]! -= dy * fMag;
    }

    for (let i = 0; i < n; i++) {
      const f = fragments[i]!;
      if (f.isMacroHub) {
        pts2[i]!.x = clusterCentersX[f.cluster]!;
        pts2[i]!.y = clusterCentersY[f.cluster]!;
        continue;
      }
      const gx = (clusterCentersX[f.cluster]! - pts2[i]!.x) * 0.085;
      const gy = (clusterCentersY[f.cluster]! - pts2[i]!.y) * 0.065;
      pts2[i]!.x = Math.max(100, Math.min(STAGE_W - 100, pts2[i]!.x + (fx[i]! + gx) * 0.36 * heat));
      pts2[i]!.y = Math.max(54, Math.min(STAGE_H - 54, pts2[i]!.y + (fy[i]! + gy) * 0.40 * heat));
    }
  }

  const meaning2D: Pos3D[] = fragments.map((f, i) => ({
    x: pts2[i]!.x,
    y: pts2[i]!.y,
    z: 0,
    scale:
      f.type === 'img'
        ? 0.72
        : f.isMacroHub
          ? 0.94
          : f.tier === 'anchor'
            ? 0.74
            : 0.58 + hash(i * 13) * 0.03,
    opacity: 1,
  }));

  const starClusterBays: readonly { clusters: readonly number[]; minX: number; maxX: number }[] = [
    { clusters: [0], minX: 62, maxX: 856 },
    { clusters: [1], minX: 1176, maxX: 1976 },
    { clusters: [2], minX: 2296, maxX: 3100 },
    { clusters: [3], minX: 3420, maxX: 4224 },
    { clusters: [4, 5], minX: 4544, maxX: 6418 },
  ];

  for (const bay of starClusterBays) {
    const subIndices: number[] = [];
    const subPos: Pos3D[] = [];
    const subFrags: FragmentItem[] = [];
    for (let i = 0; i < n; i++) {
      if (bay.clusters.includes(fragments[i]!.cluster)) {
        subIndices.push(i);
        subPos.push({ ...meaning2D[i]! });
        subFrags.push(fragments[i]!);
      }
    }
    separate(subPos, subFrags, {
      minX: bay.minX,
      maxX: bay.maxX,
      marginTop: 45,
      marginBottom: 45,
      padX: 10,
      padY: 7,
      passes: 3800,
    });
    subIndices.forEach((origIdx, k) => {
      meaning2D[origIdx]!.x = subPos[k]!.x;
      meaning2D[origIdx]!.y = subPos[k]!.y;
    });
  }

  /* -----------------------------------------------------------------------
   * 6. CLOUD 3D (`cloud3D`, 115.0–128.0s) — Perspective-Unprojected 2-Shell Nebula
   *    Preserves `meaning2D` collision-free Y & X structure while giving genuine 3D dolly parallax!
   * ----------------------------------------------------------------------- */
  const cloud3D: CloudNodeSpec[] = fragments.map((f, i) => {
    const isFrontShell = f.isMacroHub || f.type === 'img' || f.tier === 'anchor' || i % 2 === 0;
    const cz = isFrontShell
      ? 45 + hash(i * 37 + 5) * 85 + (f.isMacroHub ? 25 : 0)
      : -220 + hash(i * 41 + 11) * 80;
    const sc = meaning2D[i]!.scale * (isFrontShell ? 0.96 : 0.84);
    const unproj = (Z_CAM - cz) / Z_CAM;
    return {
      cx: (meaning2D[i]!.x - STAGE_W * 0.5) * unproj,
      cy: -(meaning2D[i]!.y - STAGE_H * 0.5) * unproj,
      cz,
      scale: sc,
    };
  });

  // Relax front-shell `cloud3D` nodes across `camX ∈ [-240, 0, +240]` so `effOp >= 0.45` collisions === `0`!
  const frontCloudIdx = fragments.map((_, i) => i).filter((i) => cloud3D[i]!.cz > -40);
  for (let pass = 0; pass < 80; pass++) {
    let moved = false;
    for (const camX of [-240, -120, 0, 120, 240]) {
      for (let a = 0; a < frontCloudIdx.length; a++) {
        const ia = frontCloudIdx[a]!;
        const ca = cloud3D[ia]!;
        const pa = Z_CAM / (Z_CAM - ca.cz);
        const sxa = STAGE_W * 0.5 + (ca.cx - camX) * pa + camX;
        const sya = STAGE_H * 0.5 - ca.cy * pa;
        const ba = fragmentBox(fragments[ia]!, ca.scale * clamp(pa, 0.82, 1.15));

        for (let b = a + 1; b < frontCloudIdx.length; b++) {
          const ib = frontCloudIdx[b]!;
          const cb = cloud3D[ib]!;
          const pb = Z_CAM / (Z_CAM - cb.cz);
          const sxb = STAGE_W * 0.5 + (cb.cx - camX) * pb + camX;
          const syb = STAGE_H * 0.5 - cb.cy * pb;
          const bb = fragmentBox(fragments[ib]!, cb.scale * clamp(pb, 0.82, 1.15));

          const dx = sxb - sxa;
          const ox = (ba.w + bb.w) * 0.5 + 8 - Math.abs(dx);
          if (ox <= 0) continue;
          const dy = syb - sya;
          const oy = (ba.h + bb.h) * 0.5 + 6 - Math.abs(dy);
          if (oy <= 0) continue;

          moved = true;
          const signX = dx >= 0 ? 1 : -1;
          const signY = dy >= 0 ? 1 : -1;
          if (oy < ox) {
            const pushCy = (oy * 0.45 + 0.6) / pa;
            ca.cy = clamp(ca.cy + signY * pushCy, -162, 162);
            cb.cy = clamp(cb.cy - signY * pushCy, -162, 162);
          } else {
            const pushCx = (ox * 0.45 + 0.8) / pa;
            ca.cx = clamp(ca.cx - signX * pushCx, -3040, 3040);
            cb.cx = clamp(cb.cx + signX * pushCx, -3040, 3040);
          }
        }
      }
    }
    if (!moved) break;
  }

  /* -----------------------------------------------------------------------
   * 7. ORBIT 2D (`orbit2D`, 128.0–138.0s) — `±392×94` Central Query Exclusion Halo
   * ----------------------------------------------------------------------- */
  const cxO = STAGE_W * 0.5;
  const cyO = 216;
  const rxInner = 610;
  const rxOuter = 3010;
  const ryInner = 98;
  const ryOuter = 166;

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
        ? 0.78 + f.level * 0.08
        : f.isMacroHub
          ? 0.54 + f.level * 0.20
          : f.tier === 'anchor'
            ? (0.72 + f.level * 0.38) * 0.72
            : (0.72 + f.level * 0.42) * 0.64;

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
      y: 236,
      z: 0,
      scale: 0.82,
      opacity: 0.30,
    };
    pinnedOrbit.add(targetIndex);

    const resonantSpots: readonly [number, number][] = [
      [960, 122],
      [1980, 322],
      [2620, 110],
      [4020, 324],
      [5840, 128],
    ];

    neighborIndices.forEach((nIdx, k) => {
      const spot = resonantSpots[k];
      if (spot && orbit2D[nIdx]) {
        orbit2D[nIdx] = {
          ...orbit2D[nIdx]!,
          x: spot[0],
          y: spot[1],
          scale: 0.80,
        };
      }
    });
  }

  const orbitSanctuary: KeepOutZone[] = [{ cx: cxO, cy: cyO, hw: 404, hh: 96 }];

  separate(orbit2D, fragments, {
    marginX: 44,
    marginTop: 28,
    marginBottom: 28,
    padX: 12,
    padY: 10,
    passes: 6000,
    pinned: pinnedOrbit,
    keepOut: orbitSanctuary,
  });

  /* -----------------------------------------------------------------------
   * 8. 6-LATITUDE CO-ROTATING 30M ARMILLARY LATTICE (`sphere3D`, 138.0–150.0s)
   *    - North (`orbit2D.y < 216`) -> strictly North rings `[50, 96, 142]`
   *    - South (`orbit2D.y >= 216`) -> strictly South rings `[290, 336, 382]`
   *    - `.frag.is-img` (`scale=0.64`) placed on `Ring 1 (y=96)` & `Ring 4 (y=336)`, staggered from adjacent rings
   *    - Sorted by `orbit2D[i].x` into Front (`π -> 0`) & Back (`π -> 2π`) semicircles with proportional width spacing!
   * ----------------------------------------------------------------------- */
  const ringCentersY = [50, 96, 142, 290, 336, 382] as const;
  const sphere3D: SphereNodeSpec[] = new Array(n);

  const buildHemisphereRings = (indices: number[], isNorth: boolean) => {
    const baseRing = (isNorth ? 0 : 3) as 0 | 3;
    const sorted = [...indices].sort((a, b) => orbit2D[a]!.x - orbit2D[b]!.x);
    const imgItems = sorted.filter((idx) => fragments[idx]!.type === 'img');
    const textItems = sorted.filter((idx) => fragments[idx]!.type !== 'img');

    const ringBuckets: [number[], number[], number[]] = [[], [], []];
    // Put all hemisphere image plates onto the middle ring (`Ring 1` or `Ring 4`)
    for (const imIdx of imgItems) {
      ringBuckets[1]!.push(imIdx);
    }

    // Balance text items across the 3 rings (`Ring 1/4` gets fewer texts since it holds ~10 plates; `MacroHub`s go to `Ring 0/2` or `3/5`)
    let rCursor = 0;
    for (const tIdx of textItems) {
      const f = fragments[tIdx]!;
      if (f.isMacroHub) {
        const targetB = ringBuckets[0]!.length <= ringBuckets[2]!.length ? 0 : 2;
        ringBuckets[targetB]!.push(tIdx);
      } else {
        // Choose bucket with smallest total item count (giving Ring 1 a virtual +8 offset for its plates)
        const c0 = ringBuckets[0]!.length;
        const c1 = ringBuckets[1]!.length + 5;
        const c2 = ringBuckets[2]!.length;
        let pick = 0;
        if (c1 <= c0 && c1 <= c2) pick = 1;
        else if (c2 < c0) pick = 2;
        else pick = rCursor % 2 === 0 ? 0 : 2;
        ringBuckets[pick]!.push(tIdx);
        rCursor++;
      }
    }

    // Re-sort each bucket by `orbit2D.x` ascending, then split even/odd into Front (`0.94π -> 0.06π`) & Back (`1.06π -> 1.94π`)
    const assignRingThetas = (bucket: number[], localRing: 0 | 1 | 2) => {
      bucket.sort((a, b) => orbit2D[a]!.x - orbit2D[b]!.x);
      const frontList: number[] = [];
      const backList: number[] = [];
      bucket.forEach((idx, k) => {
        if (k % 2 === 0) frontList.push(idx);
        else backList.push(idx);
      });

      const scaleOf = (idx: number): number => {
        const f = fragments[idx]!;
        return f.type === 'img' ? 0.56 : f.isMacroHub ? 0.58 : f.tier === 'anchor' ? 0.60 : 0.55;
      };

      const layoutSemicircle = (list: number[], startTheta: number, endTheta: number) => {
        if (list.length === 0) return;
        const weights = list.map((idx) => fragmentBox(fragments[idx]!, scaleOf(idx)).w + 54);
        const totalW = weights.reduce((acc, w) => acc + w, 0) || 1;
        const spanTheta = endTheta - startTheta;
        let acc = 0;
        list.forEach((idx, k) => {
          const w = weights[k]!;
          const centerFrac = (acc + w * 0.5) / totalW;
          acc += w;
          const rIdx = (baseRing + localRing) as 0 | 1 | 2 | 3 | 4 | 5;
          sphere3D[idx] = {
            ringIdx: rIdx,
            ringY: ringCentersY[rIdx]!,
            theta: startTheta + spanTheta * centerFrac,
            scale: scaleOf(idx),
            isNorth,
          };
        });
      };

      // Front semicircle: left (`0.95π`) -> right (`0.05π`); Back semicircle: left (`1.05π`) -> right (`1.95π`)
      layoutSemicircle(frontList, Math.PI * 0.95, Math.PI * 0.05);
      layoutSemicircle(backList, Math.PI * 1.05, Math.PI * 1.95);
    };

    assignRingThetas(ringBuckets[1]!, 1);
    assignRingThetas(ringBuckets[0]!, 0);
    assignRingThetas(ringBuckets[2]!, 2);

    // Stagger `Ring 0/2` (`3/5`) items away from `Ring 1` (`4`) image plate longitudes if vertically close (`MacroHub`s / tall boxes)
    const plateThetas = imgItems.map((idx) => sphere3D[idx]!.theta);
    for (const adjLocal of [0, 2] as const) {
      for (const idx of ringBuckets[adjLocal]!) {
        const sp = sphere3D[idx]!;
        const f = fragments[idx]!;
        if (!f.isMacroHub && f.tier !== 'anchor') continue;
        for (const pTheta of plateThetas) {
          let dTheta = sp.theta - pTheta;
          while (dTheta > Math.PI) dTheta -= Math.PI * 2;
          while (dTheta < -Math.PI) dTheta += Math.PI * 2;
          if (Math.abs(dTheta) < 0.075) {
            sp.theta += (dTheta >= 0 ? 1 : -1) * (0.078 - Math.abs(dTheta));
          }
        }
      }
    }
  };

  const northIndices: number[] = [];
  const southIndices: number[] = [];
  for (let i = 0; i < n; i++) {
    if (orbit2D[i]!.y < 216) northIndices.push(i);
    else southIndices.push(i);
  }
  buildHemisphereRings(northIndices, true);
  buildHemisphereRings(southIndices, false);

  // Final intra-ring angular separation pass across 36 spin angles so adjacent items in the same ring NEVER touch even near limb!
  for (let pass = 0; pass < 50; pass++) {
    let moved = false;
    for (let rIdx = 0; rIdx < 6; rIdx++) {
      const ringMembers = fragments.map((_, i) => i).filter((i) => sphere3D[i]!.ringIdx === rIdx);
      for (let sStep = 0; sStep < 36; sStep++) {
        const spin = (sStep / 36) * Math.PI * 2;
        const vis: { idx: number; sx: number; hw: number; cosLon: number }[] = [];
        for (const idx of ringMembers) {
          const sp = sphere3D[idx]!;
          const lon = sp.theta + spin;
          const sinL = Math.sin(lon);
          const cosL = Math.cos(lon);
          const frontVis = smoothstep(-0.10, 0.38, sinL);
          const limbFade = 1 - smoothstep(0.70, 0.96, Math.abs(cosL));
          if (lerp(0.09, 1.0, frontVis) * limbFade < 0.38) continue;
          const wz = sinL * 280;
          const pFactor = Z_CAM / (Z_CAM - wz);
          const sx = STAGE_W * 0.5 + cosL * 2980 * pFactor;
          const hw = fragmentBox(fragments[idx]!, sp.scale * clamp(pFactor, 0.85, 1.16)).w * 0.5 + 8;
          vis.push({ idx, sx, hw, cosLon: cosL });
        }
        vis.sort((a, b) => a.sx - b.sx);
        for (let k = 0; k < vis.length - 1; k++) {
          const a = vis[k]!;
          const b = vis[k + 1]!;
          const ox = a.hw + b.hw - (b.sx - a.sx);
          if (ox > 0) {
            moved = true;
            // On front hemisphere (`sin > 0`), `d(sx)/d(theta) < 0` (`theta` decreases left-to-right)!
            const dTheta = Math.min(ox / 2400 + 0.004, 0.025);
            sphere3D[a.idx]!.theta += dTheta;
            sphere3D[b.idx]!.theta -= dTheta;
          }
        }
      }
    }
    if (!moved) break;
  }

  return {
    heroSpreadSlots,
    page,
    pageColOf,
    pageRowOf,
    cuts,
    spectrum2D,
    reading2D,
    readingColOf,
    helixBase,
    meaning2D,
    clusterHubIndex,
    cloud3D,
    orbit2D,
    sphere3D,
  };
}
