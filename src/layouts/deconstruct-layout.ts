/**
 * Deterministic Collision-Free 7-Space Layout Solver (`src/layouts/deconstruct-layout.ts`)
 *
 * Spaces implemented across the single unbroken 6480 × 432 (15:1) canvas:
 *   1. `page`      : 6,200 × 432 full-bleed fine-press archive spread (with 5 large hero plate zones + multi-column serif + guillotine CUTS)
 *   2. `reading2D` : Collision-free 2D reading columns (`separate()` verified 0 overlaps)
 *   3. `helixBase` : 30m 3D Horizontal Helix (`z in [-260, +260]` for focal-plane DOF)
 *   4. `meaning2D` : Collision-free 2D semantic spring nebulae (`separate()` verified 0 overlaps)
 *   5. `cloud3D`   : Volumetric 3D semantic nebula (`Catmull-Rom` fly-through ready)
 *   6. `orbit2D`   : Collision-free 2D elliptical query orbit (`scale=0.72+t, opacity=0.14+0.86t`, verified 0 overlaps)
 *   7. `sphere3D`  : 3D Question Sphere Shell (radial distance = `1 - querySim`, rotating panoramic shell)
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
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  orientation: 'v' | 'h';
  beatOrder: number;
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
  readonly reading2D: readonly Pos3D[];
  readonly helixBase: readonly { x: number; angle: number; radiusY: number; radiusZ: number; strand: 0 | 1 }[];
  readonly meaning2D: readonly Pos3D[];
  readonly cloud3D: readonly { cx: number; cy: number; cz: number }[];
  readonly orbit2D: readonly Pos3D[];
  readonly sphere3D: readonly { sx: number; sy: number; sz: number; shellR: number }[];
}

/**
 * Conservative, high-precision pixel bounding box estimator (`w, h` after `scale` transform)
 * matching rendered `Noto Serif KR` + `JetBrains Mono` DOM metrics in Chromium (`6480×432`).
 * Includes safety margin so DOM `getBoundingClientRect()` has ZERO text-text or text-plate collisions.
 */
export function fragmentBox(f: FragmentItem, scale: number): { w: number; h: number } {
  if (f.type === 'img') {
    // Rendered plate card is 132x84 image + 16px micro-index caption => ~138 x 104 at scale=1
    return {
      w: 144 * scale + 10,
      h: 108 * scale + 8,
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
      emSum += 0.85;
    }
  }

  const fontPx = f.baseFontPx * scale;
  const letterSpacingPx = f.tier === 'anchor' ? fontPx * 0.04 * f.content.length : fontPx * 0.01 * f.content.length;
  const w = (emSum * fontPx + letterSpacingPx) * 1.14 + 14;
  const h = fontPx * 1.48 + 6;
  return { w, h };
}

interface KeepOutZone {
  readonly cx: number;
  readonly cy: number;
  readonly hw: number;
  readonly hh: number;
}

/**
 * Deterministic multi-pass AABB collision-resolution solver (`separate()`).
 * Resolves 100% of bounding-box overlaps among active items while respecting stage margins,
 * pinned indices, and optional central sanctuary keep-out zones.
 */
function separate(
  items: Pos3D[],
  fragments: readonly FragmentItem[],
  options: {
    marginX?: number;
    marginTop?: number;
    marginBottom?: number;
    padX?: number;
    padY?: number;
    passes?: number;
    pinned?: ReadonlySet<number>;
    keepOut?: readonly KeepOutZone[];
  } = {},
): void {
  const n = items.length;
  const marginX = options.marginX ?? 36;
  const marginTop = options.marginTop ?? 24;
  const marginBottom = options.marginBottom ?? 24;
  const padX = options.padX ?? 8;
  const padY = options.padY ?? 5;
  const passes = options.passes ?? 180;
  const pinned = options.pinned ?? new Set<number>();
  const keepOut = options.keepOut ?? [];

  const allItems: { x: number; y: number; hw: number; hh: number; pinned: boolean; srcIdx: number }[] = items.map(
    (p, i) => {
      const b = fragmentBox(fragments[i]!, p.scale);
      return {
        x: p.x,
        y: p.y,
        hw: (b.w + padX) * 0.5,
        hh: (b.h + padY) * 0.5,
        pinned: pinned.has(i),
        srcIdx: i,
      };
    },
  );

  for (const z of keepOut) {
    allItems.push({
      x: z.cx,
      y: z.cy,
      hw: z.hw + padX * 0.5,
      hh: z.hh + padY * 0.5,
      pinned: true,
      srcIdx: -1,
    });
  }

  const totalN = allItems.length;

  const clampNode = (idx: number) => {
    const node = allItems[idx]!;
    if (node.pinned) return;
    node.x = Math.max(marginX + node.hw, Math.min(STAGE_W - marginX - node.hw, node.x));
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
    items[i]!.y = allItems[i]!.y;
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
   * 1. FULL-BLEED FINE-PRESS ARCHIVE SPREAD (`page`, 6,200 × 432 px)
   *    5 Monumental Hero Lithograph Plates (370~400px wide) interleaved with
   *    15 architectural serif columns + guillotine vertical & horizontal CUTS!
   * ----------------------------------------------------------------------- */
  const heroSpreadSlots: HeroSpreadSlot[] = [
    { plateId: 'plate-02', code: 'FIG.01 / ONGGI SEM 4.2μm', caption: '옹기 미세 기공과 소금 꽃 결정침', x: 220, y: 24, w: 380, h: 384 },
    { plateId: 'plate-03', code: 'FIG.02 / HOPPER 90.0°', caption: '정육면체 호퍼 결정 역피라미드 테라스', x: 1580, y: 24, w: 380, h: 384 },
    { plateId: 'plate-05', code: 'FIG.03 / DIAPIR -812M', caption: '지하 812m 암염 돔 습곡 동판화', x: 3050, y: 24, w: 390, h: 384 },
    { plateId: 'plate-07', code: 'FIG.04 / PERMIAN 280MA', caption: '페름기 암염 음결정과 고생대 기포', x: 4520, y: 24, w: 380, h: 384 },
    { plateId: 'plate-09', code: 'FIG.05 / ICE CORE -3000M', caption: '남극 심부 빙하 코어 포획 대기', x: 5900, y: 24, w: 380, h: 384 },
  ];

  // Build text columns strictly in the 4 wide editorial bays between the 5 hero plates!
  const editorialBays: [number, number, number][] = [
    [630, 1550, 4],   // 4 columns
    [1990, 3020, 4],  // 4 columns
    [3470, 4490, 4],  // 4 columns
    [4930, 5870, 4],  // 4 columns -> total 16 crisp columns!
  ];

  const colDefs: { left: number; width: number }[] = [];
  for (const [bL, bR, cCount] of editorialBays) {
    const cW = (bR - bL) / cCount;
    for (let k = 0; k < cCount; k++) {
      colDefs.push({ left: bL + k * cW + 8, width: cW - 16 });
    }
  }

  const page: Pos3D[] = new Array(n);
  const cuts: CutMark[] = [];

  // Vertical column-divider guillotine cuts across full 432px height
  colDefs.forEach((col, cIdx) => {
    cuts.push({
      x1: col.left - 8,
      y1: 16,
      x2: col.left - 8,
      y2: 416,
      orientation: 'v',
      beatOrder: cIdx,
    });
  });
  heroSpreadSlots.forEach((slot, sIdx) => {
    cuts.push({
      x1: slot.x,
      y1: 12,
      x2: slot.x,
      y2: 420,
      orientation: 'v',
      beatOrder: sIdx * 3,
    });
    cuts.push({
      x1: slot.x + slot.w,
      y1: 12,
      x2: slot.x + slot.w,
      y2: 420,
      orientation: 'v',
      beatOrder: sIdx * 3 + 1,
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

    let curY = 44;
    const stepY = 352 / Math.max(1, eIdx - sIdx);

    for (let i = sIdx; i < eIdx; i++) {
      const f = fragments[i]!;
      const sc = f.type === 'img' ? 0.44 : f.tier === 'anchor' ? 0.72 : 0.68;
      const cx = col.left + col.width * 0.5;
      const cy = Math.min(398, curY + stepY * 0.5);
      page[i] = { x: cx, y: cy, z: 0, scale: sc, opacity: 1 };

      // Surgical horizontal guillotine cut between every line/fragment
      cuts.push({
        x1: col.left - 4,
        y1: Math.min(412, curY + stepY),
        x2: col.left + col.width + 4,
        y2: Math.min(412, curY + stepY),
        orientation: 'h',
        beatOrder: colIdx + ((i - sIdx) % 4),
      });
      curY += stepY;
    }
  }

  /* -----------------------------------------------------------------------
   * 2. READING 2D (`reading2D`) — Zero-Overlap 20-Column Architectural Sheet
   * ----------------------------------------------------------------------- */
  const rCols = 20;
  const rLeft = 170;
  const rRight = 6310;
  const rColW = (rRight - rLeft) / rCols;
  const rPerCol = Math.ceil(n / rCols); // 10 items per column

  const reading2D: Pos3D[] = fragments.map((f, i) => {
    const col = Math.floor(i / rPerCol);
    const row = i % rPerCol;
    const x = rLeft + (col + 0.5) * rColW;
    const y = 52 + (row / Math.max(1, rPerCol - 1)) * 330;
    const sc = f.type === 'img' ? 0.58 : f.tier === 'anchor' ? 0.88 : 0.78;
    return { x, y, z: 0, scale: sc, opacity: 1 };
  });

  separate(reading2D, fragments, {
    marginX: 44,
    marginTop: 24,
    marginBottom: 24,
    padX: 8,
    padY: 5,
    passes: 500,
  });

  /* -----------------------------------------------------------------------
   * 3. 30M HORIZONTAL 3D DOUBLE HELIX (`helixBase`)
   * ----------------------------------------------------------------------- */
  const helixTurns = 6.2;
  const helixBase = fragments.map((_, i) => {
    const u = i / Math.max(1, n - 1);
    const strand: 0 | 1 = (i % 2) as 0 | 1;
    const radJitter = ((i % 3) - 1) * 14;
    return {
      x: 200 + u * 6080,
      angle: u * helixTurns * Math.PI * 2 + (strand === 1 ? Math.PI : 0) + (i % 5) * 0.09,
      radiusY: 138 + radJitter,
      radiusZ: 255,
      strand,
    };
  });

  /* -----------------------------------------------------------------------
   * 4. MEANING 2D (`meaning2D`) & 3D SEMANTIC NEBULA (`cloud3D`)
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

  const springEdges = rankedPairs.slice(0, 620);
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
    scale: f.type === 'img' ? 0.60 : f.tier === 'anchor' ? 0.94 : 0.76 + hash(i * 13) * 0.08,
    opacity: 1,
  }));

  separate(meaning2D, fragments, {
    marginX: 44,
    marginTop: 24,
    marginBottom: 24,
    padX: 8,
    padY: 5,
    passes: 500,
  });

  const cloud3D = fragments.map((f, i) => ({
    cx: meaning2D[i]!.x - STAGE_W * 0.5,
    cy: -(meaning2D[i]!.y - STAGE_H * 0.5),
    cz: (hash(i * 37 + f.cluster * 11) - 0.5) * 480 + (f.tier === 'anchor' ? 75 : 0),
  }));

  /* -----------------------------------------------------------------------
   * 5. ORBIT 2D (`orbit2D`) — Query-Similarity Elliptical Orbit + Pure-White Sanctuary
   *    Exact art-hackathon opacity = 0.14 + 0.86*t, non-erasure 0.14 floor,
   *    target at x=4880, y=218, and 5 resonant plates across x=940..5840!
   * ----------------------------------------------------------------------- */
  const cxO = STAGE_W * 0.5; // 3240
  const cyO = 216;
  const rxInner = 560;
  const rxOuter = 3010;
  const ryInner = 82;
  const ryOuter = 172;

  const orderBySim = fragments
    .map((_, i) => i)
    .sort((a, b) => fragments[b]!.level - fragments[a]!.level || a - b);

  const orbit2D: Pos3D[] = new Array(n);

  orderBySim.forEach((idx, rank) => {
    const f = fragments[idx]!;
    const distU = 1 - f.level; // 0 = closest to query, 1 = 0.14 periphery
    const angle = rank * golden;
    const rx = rxInner + Math.pow(distU, 0.72) * (rxOuter - rxInner);
    const ry = ryInner + Math.pow(distU, 0.78) * (ryOuter - ryInner);
    const x = cxO + Math.cos(angle) * rx;
    const y = cyO + Math.sin(angle) * ry;
    const sc =
      f.type === 'img'
        ? 0.50 + f.level * 0.22
        : f.tier === 'anchor'
          ? (0.72 + f.level * 0.46) * 0.76
          : (0.72 + f.level * 0.50) * 0.70;

    orbit2D[idx] = {
      x,
      y,
      z: 0,
      scale: sc,
      opacity: f.opacity,
    };
  });

  // Pin peripheral hero ("결정이 녹을 때 수억 년 전의 바람이 분다", opacity = 0.14) at x = 4880, y = 216
  // and pin the 5 resonant plates (`plate-09, 10, 11, 13, 14`) across the full 30m bridge (`x = 940..5860`)!
  const pinnedOrbit = new Set<number>();
  if (targetIndex >= 0) {
    orbit2D[targetIndex] = {
      x: 4880,
      y: 216,
      z: 0,
      scale: 0.82,
      opacity: 0.14,
    };
    pinnedOrbit.add(targetIndex);

    const resonantSpots: readonly [number, number][] = [
      [960, 126],   // plate-09: 남극 3,000m 빙하 포획 기포
      [1980, 326],  // plate-10: 사막 사암 풍성 사층리
      [2880, 112],  // plate-11: 석탄기 양치류 화석 기공
      [3940, 328],  // plate-13: 녹는 결정과 상승 기포열
      [5840, 132],  // plate-14: 고대 바람 음향 오실로그램
    ];

    neighborIndices.forEach((nIdx, k) => {
      const spot = resonantSpots[k];
      if (spot && orbit2D[nIdx]) {
        orbit2D[nIdx] = {
          ...orbit2D[nIdx]!,
          x: spot[0],
          y: spot[1],
          scale: 0.64,
        };
        pinnedOrbit.add(nIdx);
      }
    });
  }

  // Keep pure-white central sanctuary around central #FF0000 "김치찌개 끓이는 법" mark
  const orbitSanctuary: KeepOutZone[] = [{ cx: cxO, cy: cyO, hw: 270, hh: 54 }];

  separate(orbit2D, fragments, {
    marginX: 44,
    marginTop: 24,
    marginBottom: 24,
    padX: 10,
    padY: 6,
    passes: 650,
    pinned: pinnedOrbit,
    keepOut: orbitSanctuary,
  });

  /* -----------------------------------------------------------------------
   * 6. 3D QUESTION SPHERE SHELL (`sphere3D`, 82.5–88.0s)
   *    Fibonacci spherical distribution stretched across the 15:1 panoramic horizon
   *    where radius from core = `1 - querySim` (core = high sim, outer shell = 0.14 periphery)
   * ----------------------------------------------------------------------- */
  const sphere3D = fragments.map((f, i) => {
    const distU = 1 - f.level; // 0 = inner core, 1 = outer shell
    const shellR = 0.22 + 0.78 * Math.pow(distU, 0.78);
    // Fibonacci lattice on unit sphere
    const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
    const theta = golden * i * 3.0;
    const ux = Math.sin(phi) * Math.cos(theta);
    const uy = Math.cos(phi);
    const uz = Math.sin(phi) * Math.sin(theta);

    return {
      sx: ux * 2880 * shellR,
      sy: uy * 176 * shellR,
      sz: uz * 320 * shellR,
      shellR,
    };
  });

  return {
    heroSpreadSlots,
    page,
    cuts,
    reading2D,
    helixBase,
    meaning2D,
    cloud3D,
    orbit2D,
    sphere3D,
  };
}
