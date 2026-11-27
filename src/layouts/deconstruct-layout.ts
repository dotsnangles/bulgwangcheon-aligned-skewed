/**
 * 6-Mode 2D/3D Deconstruction Layouts directly inheriting art-hackathon/apps/web/src/deconstruct-layout.ts
 * scaled & engineered for the single unbroken 6480x432 (15:1) panoramic stage!
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
  x: number;
  y: number;
  column: number;
  order: number;
}

export interface PanoramicLayouts {
  /** Scene 2: Inside #chrome panoramic 16-column document sheet (x in [460, 6020], y in [68, 372]) */
  page: Pos3D[];
  /** Exact vertical #FF0000 CUTS coordinates between running sentences on the document page */
  cuts: CutMark[];
  /** Scene 3-① (2D): Clean reading-order columns across x in [180, 6300] */
  reading2D: Pos3D[];
  /** Scene 3-① (3D): Monumental 30m Horizontal 3D Helix along X in [260, 6220] (base angle stored via index) */
  helixBase: { x: number; angle: number; radiusY: number; radiusZ: number }[];
  /** Scene 3-② (2D): Cosine-similarity 6-cluster spring layout across x in [280, 6200] */
  meaning2D: Pos3D[];
  /** Scene 3-② (3D): Volumetric 3D semantic cloud (x in [280, 6200], y in [-140, +140], z in [-260, +260]) */
  cloud3D: { cx: number; cy: number; cz: number }[];
  /** Scene 3-③ (2D): Full-span elliptical query-similarity orbit around center (3240, 222) with 0.14 floor */
  orbit2D: Pos3D[];
}

/** Deterministic pixel width estimator matching Noto Serif KR metrics (no DOM reflow) */
export function estimateFragWidth(f: FragmentItem, px: number): number {
  if (f.type === 'img') return 118;
  const chars = Array.from(f.content).length;
  return chars * px * 0.92 + 10;
}

export function computePanoramicLayouts(
  fragments: readonly FragmentItem[],
  rankedPairs: readonly PairWeight[],
  targetIndex: number,
  neighborIndices: readonly number[],
): PanoramicLayouts {
  const n = fragments.length;

  /* -----------------------------------------------------------------------
   * 1. PAGE LAYOUT inside #chrome (x in [240, 6240], y in [58, 376])
   * 18 crisp panoramic archive columns (11-12 items/col), ZERO bottom overlap,
   * inline sentences with surgical #FF0000 vertical CUTS strictly inside #chrome!
   * ----------------------------------------------------------------------- */
  const page: Pos3D[] = new Array(n);
  const cuts: CutMark[] = [];

  const numCols = 18;
  const sheetLeft = 264;
  const sheetRight = 6216;
  const colSpan = (sheetRight - sheetLeft) / numCols; // ~330.7px per column
  const colInnerW = colSpan - 26;

  // Distribute 200 items evenly across 18 columns (11 or 12 items each -> fits comfortably in y=[68..358])
  let cursor = 0;
  let cutOrder = 0;

  for (let col = 0; col < numCols; col++) {
    const remainingCols = numCols - col;
    const countHere = Math.ceil((n - cursor) / remainingCols);
    const startIdx = cursor;
    const endIdx = Math.min(n, startIdx + countHere);
    cursor = endIdx;

    const colX = sheetLeft + col * colSpan + 12;
    let curY = 66;

    for (let i = startIdx; i < endIdx; i++) {
      const f = fragments[i]!;
      if (f.type === 'img') {
        const imgH = 72;
        page[i] = { x: colX + colInnerW * 0.5, y: curY + imgH * 0.5, z: 0, scale: 0.58, opacity: 1 };
        curY += imgH + 14;
        continue;
      }

      if (f.isHeading) {
        const hW = Math.min(colInnerW, estimateFragWidth(f, 13.5));
        page[i] = { x: colX + hW * 0.5, y: curY + 9, z: 0, scale: 0.86, opacity: 1 };
        curY += 23;
        continue;
      }

      const estW = Math.min(colInnerW * 0.94, estimateFragWidth(f, 11.4));
      const yPos = Math.min(368, curY + 7);
      page[i] = { x: colX + estW * 0.5, y: yPos, z: 0, scale: 0.74, opacity: 1 };
      // Surgical red sentence boundary cut placed strictly inside #chrome column!
      cuts.push({
        x: Math.min(colX + colInnerW - 3, colX + estW + 6),
        y: yPos,
        column: col,
        order: cutOrder++,
      });
      curY += 21.8;
    }
  }

  /* -----------------------------------------------------------------------
   * 2. READING 2D (x in [180, 6300], y in [88, 378]) — airy 20-column reading sheet
   * ----------------------------------------------------------------------- */
  const reading2D: Pos3D[] = new Array(n);
  const rCols = 20;
  const rLeft = 170;
  const rRight = 6310;
  const rColW = (rRight - rLeft) / rCols; // 307px
  const rPerCol = Math.ceil(n / rCols);

  for (let i = 0; i < n; i++) {
    const col = Math.floor(i / rPerCol);
    const row = i % rPerCol;
    const f = fragments[i]!;
    const x = rLeft + (col + 0.5) * rColW;
    const y = 92 + (row / Math.max(1, rPerCol - 1)) * 276;
    reading2D[i] = {
      x,
      y,
      z: 0,
      scale: f.type === 'img' ? 0.68 : f.isHeading ? 1.0 : 0.84,
      opacity: 1,
    };
  }

  /* -----------------------------------------------------------------------
   * 3. HORIZONTAL 3D HELIX across 30m bridge (x in [240, 6240], 6.5 turns!)
   * Calibrated for Three.js PerspectiveCamera(22 deg) at Z = 1111.2 (1 unit = 1px @ z=0)
   * ----------------------------------------------------------------------- */
  const helixTurns = 6.5;
  const helixBase = fragments.map((_, i) => {
    const u = i / Math.max(1, n - 1);
    return {
      x: 240 + u * 6000,
      angle: u * helixTurns * Math.PI * 2,
      radiusY: 138,
      radiusZ: 240,
    };
  });

  /* -----------------------------------------------------------------------
   * 4. MEANING 2D & CLOUD 3D (6 distinct cosine-similarity semantic nebulae across 6480px!)
   * ----------------------------------------------------------------------- */
  const clusterCentersX = [620, 1660, 2700, 3760, 4800, 5860];
  const clusterCentersY = [224, 214, 232, 214, 232, 220];
  const golden = Math.PI * (3 - Math.sqrt(5));

  // Initial seeded cluster coordinates with full vertical breathing across y in [84..368]
  const pts2 = fragments.map((f, i) => {
    const localRank = i % 35;
    const ang = localRank * golden + f.cluster * 1.1;
    const rad = Math.sqrt(localRank + 0.6) * 48;
    return {
      x: clusterCentersX[f.cluster]! + Math.cos(ang) * rad * 1.62,
      y: clusterCentersY[f.cluster]! + Math.sin(ang) * rad * 0.94,
    };
  });

  // Deterministic cosine-similarity spring relaxation + anisotropic text de-overlap across full 6480x432
  const springEdges = rankedPairs.slice(0, 600);
  for (let step = 0; step < 48; step++) {
    const heat = 1 - step / 48;
    const fx = new Float64Array(n);
    const fy = new Float64Array(n);

    // Pairwise repulsion inside nearby X window to keep sentences crisp & legible
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pts2[i]!.x - pts2[j]!.x;
        if (Math.abs(dx) > 390) continue;
        const dy = (pts2[i]!.y - pts2[j]!.y) * 2.8;
        const d2 = Math.max(360, dx * dx + dy * dy);
        const rep = 7200 / d2;
        fx[i]! += dx * rep;
        fy[i]! += dy * rep * 0.52;
        fx[j]! -= dx * rep;
        fy[j]! -= dy * rep * 0.52;
      }
    }

    // Cosine-similarity spring pull
    for (const e of springEdges) {
      const pa = pts2[e.a]!;
      const pb = pts2[e.b]!;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const dist = Math.hypot(dx, dy) || 1;
      const pull = (e.weight - 0.68) * 0.065;
      if (pull <= 0) continue;
      const targetLen = 148;
      const fMag = ((dist - targetLen) * pull) / dist;
      fx[e.a]! += dx * fMag;
      fy[e.a]! += dy * fMag;
      fx[e.b]! -= dx * fMag;
      fy[e.b]! -= dy * fMag;
    }

    // Anchor gentle gravity to each semantic cluster's span so 6 nebulae fill the full 6480x432 canvas
    for (let i = 0; i < n; i++) {
      const f = fragments[i]!;
      const gx = (clusterCentersX[f.cluster]! - pts2[i]!.x) * 0.036;
      const gy = (clusterCentersY[f.cluster]! - pts2[i]!.y) * 0.035;
      pts2[i]!.x = Math.max(200, Math.min(STAGE_W - 200, pts2[i]!.x + (fx[i]! + gx) * 0.38 * heat));
      pts2[i]!.y = Math.max(82, Math.min(372, pts2[i]!.y + (fy[i]! + gy) * 0.42 * heat));
    }
  }

  const meaning2D: Pos3D[] = fragments.map((f, i) => ({
    x: pts2[i]!.x,
    y: pts2[i]!.y,
    z: 0,
    scale: f.type === 'img' ? 0.7 : f.isHeading ? 0.98 : 0.76 + hash(i * 13) * 0.14,
    opacity: 1,
  }));

  // Note: Three.js world +Y is UP, whereas screen +Y is DOWN -> negate Y so 2D -> 3D Cloud never flips!
  const cloud3D = fragments.map((f, i) => ({
    cx: pts2[i]!.x - STAGE_W * 0.5,
    cy: -(pts2[i]!.y - STAGE_H * 0.52),
    cz: (hash(i * 37 + f.cluster * 11) - 0.5) * 440 + Math.sin(i * 0.9) * 60,
  }));

  /* -----------------------------------------------------------------------
   * 5. ORBIT 2D (Query Similarity Elliptical Orbit around (3240, 224), 0.14 floor!)
   * High similarity (cooking/salt) orbits around clean central sanctuary;
   * Low similarity (0.14 wind/periphery) spreads far left & right (x in [200..6280])!
   * ----------------------------------------------------------------------- */
  const orbit2D: Pos3D[] = new Array(n);
  const cxO = STAGE_W * 0.5; // 3240
  const cyO = 224;
  const rxInner = 430;
  const rxOuter = 2980;
  const ryInner = 76;
  const ryOuter = 148;

  const orderBySim = fragments.map((_, i) => i).sort((a, b) => fragments[b]!.level - fragments[a]!.level || a - b);
  const orbPts: { x: number; y: number }[] = new Array(n);

  orderBySim.forEach((idx, rank) => {
    const f = fragments[idx]!;
    const distU = 1 - f.level; // 0 = closest to query, 1 = farthest (0.14 periphery!)
    const angle = rank * golden;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const rx = rxInner + Math.pow(distU, 0.9) * (rxOuter - rxInner);
    const ry = ryInner + Math.pow(distU, 0.85) * (ryOuter - ryInner);
    let x = cxO + cosA * rx;
    let y = cyO + sinA * ry;

    // Guarantee wide pure-white sanctuary around centered red "김치찌개 끓이는 법"
    if (Math.abs(x - cxO) < 330 && Math.abs(y - cyO) < 58) {
      y += y >= cyO ? 62 : -62;
    }

    orbPts[idx] = {
      x: Math.max(190, Math.min(STAGE_W - 190, x)),
      y: Math.max(82, Math.min(374, y)),
    };
  });

  // Soft 20-step pairwise label separation in Orbit so dense inner-ring sentences stay crystal legible
  for (let step = 0; step < 20; step++) {
    const heat = 1 - step / 20;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = orbPts[i]!.x - orbPts[j]!.x;
        if (Math.abs(dx) > 250) continue;
        const dy = orbPts[i]!.y - orbPts[j]!.y;
        if (Math.abs(dy) > 26) continue;
        const pushY = (dy >= 0 ? 1 : -1) * (26 - Math.abs(dy)) * 0.24 * heat;
        const pushX = (dx >= 0 ? 1 : -1) * (250 - Math.abs(dx)) * 0.03 * heat;
        orbPts[i]!.x += pushX;
        orbPts[j]!.x -= pushX;
        orbPts[i]!.y += pushY;
        orbPts[j]!.y -= pushY;
      }
    }
    for (let i = 0; i < n; i++) {
      let { x, y } = orbPts[i]!;
      if (Math.abs(x - cxO) < 330 && Math.abs(y - cyO) < 56) {
        y = y >= cyO ? cyO + 58 : cyO - 58;
      }
      orbPts[i]!.x = Math.max(190, Math.min(STAGE_W - 190, x));
      orbPts[i]!.y = Math.max(82, Math.min(374, y));
    }
  }

  for (let i = 0; i < n; i++) {
    const f = fragments[i]!;
    orbit2D[i] = {
      x: orbPts[i]!.x,
      y: orbPts[i]!.y,
      z: 0,
      scale: f.type === 'img' ? 0.54 + f.level * 0.38 : f.scale * 0.78,
      opacity: f.opacity,
    };
  }

  // Pin our hero peripheral fragment ("결정이 녹을 때 수억 년 전의 바람이 분다", sim = 0.14) cleanly at x = 4960, y = 226
  // and place all 5 semantic neighbors strictly LEFT/ABOVE/BELOW (x <= 5120) so ZERO red threads cross the focus panel at x = 5350!
  if (targetIndex >= 0) {
    orbit2D[targetIndex] = {
      x: 4960,
      y: 226,
      z: 0,
      scale: 0.72,
      opacity: 0.14,
    };
    const nbSpots: [number, number][] = [
      [4060, 118],
      [4320, 342],
      [5010, 108],
      [5120, 346],
      [3860, 226],
    ];
    neighborIndices.forEach((nIdx, k) => {
      const spot = nbSpots[k];
      if (spot && orbit2D[nIdx]) {
        orbit2D[nIdx] = {
          ...orbit2D[nIdx]!,
          x: spot[0],
          y: spot[1],
        };
      }
    });
  }

  return {
    page,
    cuts,
    reading2D,
    helixBase,
    meaning2D,
    cloud3D,
    orbit2D,
  };
}
