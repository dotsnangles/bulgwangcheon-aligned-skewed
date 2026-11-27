/**
 * Deterministic Collision-Free & Bezel-Safe (`Y ∈ [26, 404]`) 8-Space Layout Solver
 * (`src/layouts/deconstruct-layout.ts` — Round 3 Master Director's Cut)
 *
 * Spaces across the single unbroken 6480 × 432 (15:1) canvas:
 *   1. `page`       : Full-bleed broadsheet (5 hero plates + 20 serif columns, `>= 12px` plate codes, 0 overlaps)
 *   2. `spectrum2D` : Variable-density barcode & dimension-arc layout (`+18px` bottom barcode slot, 0 overlaps)
 *   3. `reading2D`  : Counter-drifting 20-column reading sheet (`0` overlaps at phase-zero `t = 48.2s`)
 *   4. `helixBase`  : 30m 3D Horizontal Double Helix (`z in [-255, +255]`)
 *   5. `meaning2D`  : 5 Asymmetric Star Clusters + 4 Sculptural Pure-White Canyons (`330~350px` wide) + `42px` Macro Hubs
 *   6. `cloud3D`    : Volumetric 3D semantic nebula
 *   7. `orbit2D`    : Central Exclusion Sanctuary (`±390×94`) + P4.6 `0.28` floor elliptical orbit (`0` overlaps)
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
  readonly pageColOf: readonly number[];
  readonly pageRowOf: readonly number[];
  readonly cuts: readonly CutMark[];
  readonly spectrum2D: readonly Pos3D[];
  readonly reading2D: readonly Pos3D[];
  readonly readingColOf: readonly number[];
  readonly helixBase: readonly { x: number; angle: number; radiusY: number; radiusZ: number; strand: 0 | 1 }[];
  readonly meaning2D: readonly Pos3D[];
  readonly clusterHubIndex: readonly number[];
  readonly cloud3D: readonly { cx: number; cy: number; cz: number }[];
  readonly orbit2D: readonly Pos3D[];
  readonly sphere3D: readonly { phi: number; theta: number; shellR: number }[];
}

/**
 * High-precision pixel bounding box estimator (`w, h` after `scale` transform + paper halo padding)
 * matching rendered `Noto Serif KR` + `JetBrains Mono` DOM metrics in Chromium (`6480×432`).
 * Includes generous `.frag.is-img` clearance (`156*scale + 16 × 122*scale + 14`) so lithographs & `PL.XX` labels never graze text.
 */
export function fragmentBox(f: FragmentItem, scale: number, extraBottomPx = 0): { w: number; h: number } {
  if (f.type === 'img') {
    return {
      w: 156 * scale + 16,
      h: 106 * scale + 14 + extraBottomPx,
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
      emSum += 1.02;
    } else {
      emSum += 0.84;
    }
  }

  const fontPx = f.baseFontPx * scale;
  const letterSpacingPx = f.tier === 'anchor' ? fontPx * 0.04 * f.content.length : fontPx * 0.01 * f.content.length;
  const padHoriz = f.isMacroHub ? 16 : 10;
  const padVert = f.isMacroHub ? 8 : 5;
  const w = (emSum * fontPx + letterSpacingPx + padHoriz * scale) * 1.10 + 8;
  const h = (f.baseFontPx * 1.34 + padVert) * scale + 4 + extraBottomPx;
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
 * Enforces strict vertical bezel safety (`Y ∈ [marginTop, STAGE_H - marginBottom]`) and rigid `keepOut` sanctuaries.
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
          const slideX = Math.min(overX * 0.14 + 2.8, 13.0);
          pi.y -= signY * pushY * wI;
          pj.y += signY * pushY * wJ;
          pi.x -= signX * slideX * wI;
          pj.x += signX * slideX * wJ;
        } else {
          const pushX = overX * 0.65 + 1.6;
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
   * 1. FULL-BLEED FINE-PRESS BROADSHEET (`page`, 30.0–37.6s)
   *    5 Monumental Hero Lithograph Plates (`Y = 30..402`, bezel-safe!) + 20 columns
   *    + `>= 12px` Bold Mono `.frag-lab` (`img scale = 0.88`) + Tectonic Shear Cuts (`32.05..37.1s`)!
   * ----------------------------------------------------------------------- */
  const heroSpreadSlots: HeroSpreadSlot[] = [
    { plateId: 'plate-02', code: 'FIG.01 · 4.2μm', caption: '옹기 미세 기공과 소금 꽃', x: 136, y: 30, w: 344, h: 372 },
    { plateId: 'plate-03', code: 'FIG.02 · 90.0°', caption: '정육면체 호퍼 결정 계단', x: 1556, y: 30, w: 344, h: 372 },
    { plateId: 'plate-05', code: 'FIG.03 · -812m', caption: '지하 812m 암염 돔 습곡', x: 3068, y: 30, w: 344, h: 372 },
    { plateId: 'plate-07', code: 'FIG.04 · 280MA', caption: '페름기 암염 유체 포유물', x: 4580, y: 30, w: 344, h: 372 },
    { plateId: 'plate-09', code: 'FIG.05 · -3000m', caption: '남극 심부 빙하 포획 대기', x: 6000, y: 30, w: 344, h: 372 },
  ];

  const editorialBays: [number, number, number][] = [
    [496, 1540, 5],
    [1916, 3052, 6],
    [3428, 4564, 6],
    [4940, 5984, 6],
  ];

  const colDefs: { left: number; width: number }[] = [];
  for (const [bL, bR, cCount] of editorialBays) {
    const cW = (bR - bL) / cCount;
    for (let k = 0; k < cCount; k++) {
      colDefs.push({ left: bL + k * cW + 6, width: cW - 12 });
    }
  }

  const page: Pos3D[] = new Array(n);
  const pageColOf: number[] = new Array(n).fill(0);
  const pageRowOf: number[] = new Array(n).fill(0);
  const cuts: CutMark[] = [];

  colDefs.forEach((col, cIdx) => {
    cuts.push({
      x1: col.left - 6,
      y1: 28,
      x2: col.left - 6,
      y2: 404,
      orientation: 'v',
      strikeAt: 32.05 + cIdx * 0.21,
    });
  });
  heroSpreadSlots.forEach((slot, sIdx) => {
    const beatT = 32.05 + sIdx * 0.80;
    cuts.push({ x1: slot.x, y1: 28, x2: slot.x, y2: 404, orientation: 'v', strikeAt: beatT });
    cuts.push({ x1: slot.x + slot.w, y1: 28, x2: slot.x + slot.w, y2: 404, orientation: 'v', strikeAt: beatT + 0.25 });
  });

  let cursor = 0;
  for (let colIdx = 0; colIdx < colDefs.length; colIdx++) {
    const col = colDefs[colIdx]!;
    const remCols = colDefs.length - colIdx;
    const take = Math.ceil((n - cursor) / remCols);
    const sIdx = cursor;
    const eIdx = Math.min(n, sIdx + take);
    cursor = eIdx;

    // Weight vertical allocation so `.frag.is-img` (`scale = 0.88`, `>= 12px` Bold Mono label) gets generous vertical air!
    const weights: number[] = [];
    let weightSum = 0;
    for (let i = sIdx; i < eIdx; i++) {
      const w = fragments[i]!.type === 'img' ? 4.4 : fragments[i]!.tier === 'anchor' ? 1.25 : 1.0;
      weights.push(w);
      weightSum += w;
    }

    let curY = 34;
    const totalSpanY = 364;

    for (let i = sIdx; i < eIdx; i++) {
      const f = fragments[i]!;
      const localRow = i - sIdx;
      const slotH = (weights[localRow]! / Math.max(1, weightSum)) * totalSpanY;
      // Note: `.frag-lab` is `16px` Bold Mono, so `scale = 0.75` renders at exact `12.0px >= 12px` Bold Mono!
      const sc =
        f.type === 'img'
          ? 0.75
          : f.isMacroHub
            ? 0.32
            : f.tier === 'anchor'
              ? 0.54
              : 0.42;
      const cx = col.left + col.width * 0.5;
      const cy = Math.min(394, curY + slotH * 0.5);
      page[i] = { x: cx, y: cy, z: 0, scale: sc, opacity: 1 };
      pageColOf[i] = colIdx;
      pageRowOf[i] = localRow;

      const hBeat = 32.5 + colIdx * 0.22 + (localRow % 2) * 0.125;
      cuts.push({
        x1: col.left - 3,
        y1: Math.min(402, curY + slotH),
        x2: col.left + col.width + 3,
        y2: Math.min(402, curY + slotH),
        orientation: 'h',
        strikeAt: Math.min(37.0, hBeat),
      });
      curY += slotH;
    }
  }

  const heroKeepOut: KeepOutZone[] = heroSpreadSlots.map((s) => ({
    cx: s.x + s.w * 0.5,
    cy: s.y + s.h * 0.5,
    hw: s.w * 0.5 + 8,
    hh: s.h * 0.5 + 6,
  }));
  separate(page, fragments, {
    marginX: 36,
    marginTop: 28,
    marginBottom: 28,
    padX: 6,
    padY: 5,
    passes: 2000,
    keepOut: heroKeepOut,
  });

  /* -----------------------------------------------------------------------
   * 2. SPECTRUM 2D (`spectrum2D`, 37.6–46.0s) — Variable-Density Barcode Sheet
   *    30 airy columns + `+20px` bottom barcode slot + upper dimension-arc sanctuaries!
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
    const y = 48 + (row / Math.max(1, sPerCol - 1)) * 314;
    const sc =
      f.type === 'img'
        ? 0.76
        : f.isMacroHub
          ? 0.40
          : f.tier === 'anchor'
            ? 0.66
            : 0.54;
    return { x, y, z: 0, scale: sc, opacity: 1 };
  });

  const spectrumSanctuaries: KeepOutZone[] = [
    { cx: 920, cy: 42, hw: 170, hh: 16 },
    { cx: 3180, cy: 42, hw: 170, hh: 16 },
    { cx: 4920, cy: 42, hw: 170, hh: 16 },
  ];

  separate(spectrum2D, fragments, {
    marginX: 38,
    marginTop: 28,
    marginBottom: 30,
    padX: 8,
    padY: 6,
    extraBottomPx: 20,
    passes: 2000,
    keepOut: spectrumSanctuaries,
  });

  /* -----------------------------------------------------------------------
   * 3. READING 2D (`reading2D`, 46.0–49.6s) — Counter-Drifting 20-Column Sheet
   * ----------------------------------------------------------------------- */
  const rCols = 20;
  const rLeft = 166;
  const rRight = 6314;
  const rColW = (rRight - rLeft) / rCols;
  const rPerCol = Math.ceil(n / rCols);
  const readingColOf: number[] = new Array(n).fill(0);

  const reading2D: Pos3D[] = fragments.map((f, i) => {
    const col = Math.floor(i / rPerCol);
    const row = i % rPerCol;
    readingColOf[i] = col;
    const x = rLeft + (col + 0.5) * rColW;
    const y = 54 + (row / Math.max(1, rPerCol - 1)) * 320;
    const sc =
      f.type === 'img'
        ? 0.84
        : f.isMacroHub
          ? 0.48
          : f.tier === 'anchor'
            ? 0.84
            : 0.72;
    return { x, y, z: 0, scale: sc, opacity: 1 };
  });

  separate(reading2D, fragments, {
    marginX: 46,
    marginTop: 28,
    marginBottom: 28,
    padX: 9,
    padY: 4,
    passes: 700,
  });

  /* -----------------------------------------------------------------------
   * 4. 30M HORIZONTAL 3D DOUBLE HELIX (`helixBase`, 49.6–59.8s)
   * ----------------------------------------------------------------------- */
  const helixTurns = 6.2;
  const helixBase = fragments.map((_, i) => {
    const u = i / Math.max(1, n - 1);
    const strand: 0 | 1 = (i % 2) as 0 | 1;
    const radJitter = ((i % 3) - 1) * 14;
    return {
      x: 190 + u * 6100,
      angle: u * helixTurns * Math.PI * 2 + (strand === 1 ? Math.PI : 0) + (i % 5) * 0.11,
      radiusY: 132 + radJitter,
      radiusZ: 255,
      strand,
    };
  });

  /* -----------------------------------------------------------------------
   * 5. MEANING 2D (`meaning2D`, 59.8–66.8s) — 5 Asymmetric Star Clusters
   *    + 4 Guaranteed `330~350px` Pure-White Canyons + `42px` Macro Hubs!
   *    Solved per Star Cluster inside disjoint `[minX, maxX]` bays so canyons stay
   *    100% untouched `#FFFFFF` and every cluster converges to `0` overlaps!
   * ----------------------------------------------------------------------- */
  const clusterCentersX = [444, 1564, 2689, 3814, 5060, 5940];
  const clusterCentersY = [214, 206, 222, 208, 158, 268];
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
    const rad = Math.sqrt(localRank + 0.8) * 38;
    return {
      x: clusterCentersX[f.cluster]! + Math.cos(ang) * rad * 1.42,
      y: clusterCentersY[f.cluster]! + Math.sin(ang) * rad * 0.88,
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
      pts2[i]!.x = Math.max(90, Math.min(STAGE_W - 90, pts2[i]!.x + (fx[i]! + gx) * 0.36 * heat));
      pts2[i]!.y = Math.max(48, Math.min(STAGE_H - 48, pts2[i]!.y + (fy[i]! + gy) * 0.40 * heat));
    }
  }

  const meaning2D: Pos3D[] = fragments.map((f, i) => ({
    x: pts2[i]!.x,
    y: pts2[i]!.y,
    z: 0,
    scale:
      f.type === 'img'
        ? 0.78
        : f.isMacroHub
          ? 1.0
          : f.tier === 'anchor'
            ? 0.80
            : 0.62 + hash(i * 13) * 0.05,
    opacity: 1,
  }));

  // 5 Disjoint Star-Cluster Bays separated by 4 Pure-White Canyons (`320~326px` wide each!):
  //   Bay 0 (`c=0`): `44 .. 844`   | Canyon 1: `844 .. 1164` (`320px`)
  //   Bay 1 (`c=1`): `1164 .. 1964`| Canyon 2: `1964 .. 2284` (`320px`)
  //   Bay 2 (`c=2`): `2284 .. 3094`| Canyon 3: `3094 .. 3414` (`320px`)
  //   Bay 3 (`c=3`): `3414 .. 4214`| Canyon 4: `4214 .. 4540` (`326px`)
  //   Bay 4 (`c=4,5`): `4540 .. 6440` (`1,900px` wide for the binary outer nebula!)
  const starClusterBays: readonly { clusters: readonly number[]; minX: number; maxX: number }[] = [
    { clusters: [0], minX: 44, maxX: 844 },
    { clusters: [1], minX: 1164, maxX: 1964 },
    { clusters: [2], minX: 2284, maxX: 3094 },
    { clusters: [3], minX: 3414, maxX: 4214 },
    { clusters: [4, 5], minX: 4540, maxX: 6440 },
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
      marginTop: 28,
      marginBottom: 28,
      padX: 7,
      padY: 5,
      passes: 2200,
    });
    subIndices.forEach((origIdx, k) => {
      meaning2D[origIdx]!.x = subPos[k]!.x;
      meaning2D[origIdx]!.y = subPos[k]!.y;
    });
  }

  const cloud3D = fragments.map((f, i) => ({
    cx: meaning2D[i]!.x - STAGE_W * 0.5,
    cy: -(meaning2D[i]!.y - STAGE_H * 0.5),
    cz: (hash(i * 37 + f.cluster * 11) - 0.5) * 480 + (f.isMacroHub ? 110 : f.tier === 'anchor' ? 65 : 0),
  }));

  /* -----------------------------------------------------------------------
   * 6. ORBIT 2D (`orbit2D`, 75.2–80.0s) — `±390×94` Central Query Exclusion Halo
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
      y: 216,
      z: 0,
      scale: 0.82,
      opacity: 0.28,
    };
    pinnedOrbit.add(targetIndex);

    const resonantSpots: readonly [number, number][] = [
      [960, 128],
      [1980, 316],
      [2620, 114],
      [4020, 318],
      [5840, 134],
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

  const orbitSanctuary: KeepOutZone[] = [{ cx: cxO, cy: cyO, hw: 392, hh: 94 }];

  separate(orbit2D, fragments, {
    marginX: 44,
    marginTop: 28,
    marginBottom: 28,
    padX: 10,
    padY: 7,
    passes: 1400,
    pinned: pinnedOrbit,
    keepOut: orbitSanctuary,
  });

  /* -----------------------------------------------------------------------
   * 7. 30M PANORAMIC CELESTIAL ARMILLARY DOME (`sphere3D`, 79.5–88.0s)
   * ----------------------------------------------------------------------- */
  const sphere3D = fragments.map((f, i) => {
    const distU = 1 - f.level;
    const shellR = 0.48 + 0.52 * Math.pow(distU, 0.72);
    const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
    const theta = golden * i * 3.0;
    return { phi, theta, shellR };
  });

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
