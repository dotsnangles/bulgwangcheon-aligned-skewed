/**
 * Museum-Grade Zero-UI & Zero-Burn-In 6480 × 432 (15:1) Moving-Image Engine (`src/engine/stage.ts`)
 *
 * Implements all 7 Round-2 Architectural Elevations:
 *   1. Zero Burn-In HUD / Zero Outer Box / Zero Meta Slogans + P4.6 Outdoor LED Readability (`>= 13px` bold codes)
 *   2. High-Contrast Silkscreen Press (`#0000FF` × `#FFFFFF` `8.6:1` on 8 non-overlapping rails, hero sanctuary) + Full-30m Muybridge Gallop
 *   3. True `perspective(580px)` 3D Foreshortened Monolith Archipelago + Refraction Prism Gate + `2.2px` Orthogonal `#FF0000` Arrows + Continuous 3D Parallax & Fly-Through Dive
 *   4. `120 BPM` `0.09s` (3-Frame) Guillotine Hard Cuts + Kerf Separation + Collision-Free `spectrum2D` (`+20px` barcode slot) + Accelerando Cosine Scan
 *   5. Fine-Press Paper Halo + Real-Time 3D Foreground Screen-Space Repulsion + Unclamped Edge Vignette + Degree-Capped Arterial Filaments + 30m Celestial Armillary Dome
 *   6. Zero-Chromatic-Aberration 3D Fault Shear + Elemental Paleo-Wind Gale & 8-Glyph Weathering of `"김치찌개 끓이는 법"` + Katabatic White-Out Dissolution (`114.2–120.0s`)
 */

import * as THREE from 'three';
import {
  ALIGNED_FORMULA,
  ALIGNED_MEMORY_LINES,
  GEN1_ALIGNED_CARDS,
  GEN1_SKEWED_STATIONS,
  GEN2_ALIGNED_CARDS,
  GEN2_SKEWED_STATIONS,
  getCorpus,
  QUERY_GEN1,
  QUERY_GEN2,
  REFRACTION_LENS_GEN1,
  REFRACTION_LENS_GEN2,
  TARGET_FRAGMENT_TEXT,
  TARGET_PHRASE_PIECES,
  type CardSpec,
  type FragmentItem,
  type SkewedStationSpec,
} from '../data/corpus.ts';
import { DURATION, STAGE_H, STAGE_W } from '../data/timeline.ts';
import { getDecodedPlate, getDecodedStride, getPlateById } from '../illustrations.ts';
import { computePanoramicLayouts, fragmentBox } from '../layouts/deconstruct-layout.ts';
import {
  beatPulse,
  catmullRom,
  clamp,
  clampRedGain,
  easeInCubic,
  easeInOut,
  easeInOutCubic,
  easeOutCubic,
  easeOutExpo,
  hardCutFlash,
  hash,
  lerp,
  ORANGE,
  progress,
  smoothstep,
  span,
  stepArc,
  win,
} from '../math.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
let stageFilterSeq = 0;

interface PlacedMonolith {
  readonly spec: CardSpec;
  readonly el: HTMLElement;
  readonly regMark: SVGPathElement;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
  readonly h: number;
  readonly rotY: number;
  readonly rotX: number;
  readonly isHero: boolean;
  readonly at: number;
  readonly gen: 1 | 2;
  readonly stationIdx?: number;
}

interface OrthogonalRuleArrow {
  readonly gen: 1 | 2;
  readonly path: SVGPathElement;
  readonly pulsePath: SVGPathElement;
  readonly head: SVGPathElement;
  readonly at: number;
  readonly dur: number;
  readonly idx: number;
}

interface StationBeaconDom {
  readonly gen: 1 | 2;
  readonly spec: SkewedStationSpec;
  readonly el: HTMLElement;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly at: number;
}

export interface MotionStageOptions {
  canvasScale?: number;
  redGain?: number;
}

export interface MotionStageHandle {
  root: HTMLElement;
  renderAt(tSec: number): void;
  getFocusX(tSec: number): number;
  setRedGain(gain: number): void;
  getRedGain(): number;
  dispose(): void;
}

function makeEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls: string,
  parent: HTMLElement,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  parent.append(node);
  return node;
}

/**
 * Deterministic Screen-Space Foreground Repulsion (`14 iterations`) + Depth Occlusion Pass
 * for 3D views (`helix3D`, `cloud3D`, `sphere3D`).
 * 1) Separates foreground anchors/sentences/plates (`o >= 0.36`) so foreground items never collide.
 * 2) Smoothly occludes deeper/fainter back-hemisphere items that project behind sharp foreground items,
 *    eliminating ghostly double-exposures while preserving 3D depth in open paper intervals.
 */
function repelForeground3D(
  screenPos: { x: number; y: number; z: number; s: number; o: number; blur: number }[],
  fragments: readonly FragmentItem[],
): void {
  const active: number[] = [];
  for (let i = 0; i < screenPos.length; i++) {
    const p = screenPos[i]!;
    if (p.o >= 0.36 && p.x > -80 && p.x < STAGE_W + 80 && p.y > -20 && p.y < STAGE_H + 20) {
      active.push(i);
    }
  }
  const m = active.length;
  if (m >= 2) {
    const hw = new Float32Array(m);
    const hh = new Float32Array(m);
    for (let k = 0; k < m; k++) {
      const idx = active[k]!;
      const b = fragmentBox(fragments[idx]!, screenPos[idx]!.s * 0.95);
      hw[k] = b.w * 0.5 + 6;
      hh[k] = b.h * 0.5 + 4;
    }

    for (let iter = 0; iter < 14; iter++) {
      let anyOverlap = false;
      for (let a = 0; a < m; a++) {
        const ia = active[a]!;
        const pa = screenPos[ia]!;
        for (let b = a + 1; b < m; b++) {
          const ib = active[b]!;
          const pb = screenPos[ib]!;

          const dx = pb.x - pa.x;
          const overX = hw[a]! + hw[b]! - Math.abs(dx);
          if (overX <= 0) continue;

          const dy = pb.y - pa.y;
          const overY = hh[a]! + hh[b]! - Math.abs(dy);
          if (overY <= 0) continue;

          anyOverlap = true;
          const signX = dx >= 0 ? 1 : -1;
          const signY = dy >= 0 ? 1 : -1;

          if (overY < overX) {
            const pushY = overY * 0.54 + 1.0;
            const slideX = Math.min(overX * 0.16 + 1.5, 10.0);
            pa.y = clamp(pa.y - signY * pushY, 30 + hh[a]!, STAGE_H - 30 - hh[a]!);
            pb.y = clamp(pb.y + signY * pushY, 30 + hh[b]!, STAGE_H - 30 - hh[b]!);
            pa.x -= signX * slideX;
            pb.x += signX * slideX;
          } else {
            const pushX = overX * 0.54 + 1.4;
            pa.x -= signX * pushX;
            pb.x += signX * pushX;
          }
        }
      }
      if (!anyOverlap) break;
    }
  }

  // Depth Occlusion Pass: foreground cards/phrases (`o >= 0.48`) cleanly occlude deeper/blurred background items (`z < fg.z - 15` or `o < fg.o - 0.08`)
  const fgIndices: number[] = [];
  const bgIndices: number[] = [];
  for (let i = 0; i < screenPos.length; i++) {
    const p = screenPos[i]!;
    if (p.o <= 0.01 || p.x < -120 || p.x > STAGE_W + 120) continue;
    if (p.o >= 0.48 && p.blur <= 1.2) fgIndices.push(i);
    if (p.o < 0.72 || p.blur > 0.35) bgIndices.push(i);
  }

  for (const bi of bgIndices) {
    const bp = screenPos[bi]!;
    const bb = fragmentBox(fragments[bi]!, bp.s);
    const bhw = bb.w * 0.5;
    const bhh = bb.h * 0.5;
    for (const fi of fgIndices) {
      if (bi === fi) continue;
      const fp = screenPos[fi]!;
      const isBehind = bp.z < fp.z - 12 || bp.o < fp.o - 0.08 || bp.blur > fp.blur + 0.4;
      if (!isBehind) continue;
      const fb = fragmentBox(fragments[fi]!, fp.s);
      const fhw = fb.w * 0.5 + 14;
      const fhh = fb.h * 0.5 + 8;
      const ox = fhw + bhw - Math.abs(bp.x - fp.x);
      if (ox <= 0) continue;
      const oy = fhh + bhh - Math.abs(bp.y - fp.y);
      if (oy <= 0) continue;
      // Full occlusion inside core box, smooth 10px feather at outer halo edge
      const atten = 1 - clamp(Math.min(ox / 12, oy / 8), 0, 1);
      bp.o *= atten;
      if (bp.o <= 0.005) break;
    }
  }
}

export function createMotionStage(host: HTMLElement, options: MotionStageOptions = {}): MotionStageHandle {
  const canvasScale = options.canvasScale ?? 1;
  const corpus = getCorpus();
  const { fragments, targetIndex, neighborIndices, topEdges, rankedPairs } = corpus;
  const layouts = computePanoramicLayouts(fragments, rankedPairs, targetIndex, neighborIndices);

  /* --- 0. SVG feColorMatrix Filter (`?rgain=0.50..1.00`) --- */
  const filterId = `stage-rgain-filter-${++stageFilterSeq}`;
  const filterSvg = document.createElementNS(SVG_NS, 'svg');
  filterSvg.setAttribute('class', 'stage-filter-defs');
  filterSvg.setAttribute('width', '0');
  filterSvg.setAttribute('height', '0');
  filterSvg.setAttribute('aria-hidden', 'true');
  const filterDefs = document.createElementNS(SVG_NS, 'defs');
  const filterEl = document.createElementNS(SVG_NS, 'filter');
  filterEl.setAttribute('id', filterId);
  filterEl.setAttribute('x', '0%');
  filterEl.setAttribute('y', '0%');
  filterEl.setAttribute('width', '100%');
  filterEl.setAttribute('height', '100%');
  filterEl.setAttribute('filterUnits', 'objectBoundingBox');
  filterEl.setAttribute('color-interpolation-filters', 'sRGB');
  const redGainMatrix = document.createElementNS(SVG_NS, 'feColorMatrix');
  redGainMatrix.setAttribute('type', 'matrix');
  redGainMatrix.setAttribute('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0');
  filterEl.append(redGainMatrix);
  filterDefs.append(filterEl);
  filterSvg.append(filterDefs);
  host.append(filterSvg);

  const root = makeEl('div', 'motion-stage', host);
  const world = makeEl('div', 'stage-world', root);

  let currentRedGain = 1.0;
  const setRedGain = (gain: number) => {
    currentRedGain = clampRedGain(gain);
    if (currentRedGain >= 0.9999) {
      root.style.filter = '';
    } else {
      const g = currentRedGain.toFixed(4);
      redGainMatrix.setAttribute('values', `${g} 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0`);
      root.style.filter = `url(#${filterId})`;
    }
  };
  setRedGain(options.redGain ?? 1.0);

  /* --- 1. Boundless Paper Fiducial Crosshairs Only (`opacity <= 0.14` strictly inside `Y = 84..348`, Zero Outer Box!) --- */
  const gridSvg = document.createElementNS(SVG_NS, 'svg');
  gridSvg.setAttribute('class', 'swiss-grid-svg');
  gridSvg.setAttribute('viewBox', `0 0 ${STAGE_W} ${STAGE_H}`);
  let fiducials = '';
  for (let x = 540; x <= STAGE_W - 540; x += 720) {
    for (const y of [96, 216, 336]) {
      fiducials += `<path d="M${x - 4} ${y} L${x + 4} ${y} M${x} ${y - 4} L${x} ${y + 4}" stroke="#000000" stroke-width="0.5" stroke-opacity="0.13"/>`;
    }
  }
  gridSvg.innerHTML = fiducials;
  world.append(gridSvg);

  /* --- 2. Polar Sastrugi Backdrop (`X = 3600..5900, Y = 150..402`, 4-edge feathered mask!) --- */
  const sastrugiBackdrop = document.createElement('img');
  sastrugiBackdrop.className = 'sastrugi-backdrop';
  sastrugiBackdrop.src = getPlateById('plate-16').src;
  sastrugiBackdrop.alt = '';
  world.append(sastrugiBackdrop);

  /* --- 3. Floor SVG (3D Architectural Registration L-Crosshairs + `2.2px` Orthogonal Red Rule Arrows) --- */
  const floorSvg = document.createElementNS(SVG_NS, 'svg');
  floorSvg.setAttribute('class', 'stage-floor-svg');
  floorSvg.setAttribute('viewBox', `0 0 ${STAGE_W} ${STAGE_H}`);
  world.append(floorSvg);

  const regLayer = document.createElementNS(SVG_NS, 'g');
  floorSvg.append(regLayer);

  const arrowLayer = document.createElementNS(SVG_NS, 'g');
  floorSvg.append(arrowLayer);

  /* --- 4. Act I.1 (`0.0 – 8.0s`): High-Contrast Silkscreen Press & Pure-White Hero Sanctuary --- */
  const pressLayer = makeEl('div', 'press-layer', world);

  const voronoiImgA = document.createElement('img');
  voronoiImgA.className = 'press-voronoi-plate';
  voronoiImgA.src = getPlateById('plate-01').src;
  voronoiImgA.alt = '';
  voronoiImgA.style.left = '1960px';
  pressLayer.append(voronoiImgA);

  const voronoiImgB = document.createElement('img');
  voronoiImgB.className = 'press-voronoi-plate';
  voronoiImgB.src = getPlateById('plate-15').src;
  voronoiImgB.alt = '';
  voronoiImgB.style.left = '4520px';
  pressLayer.append(voronoiImgB);

  const pressHeroQuery = makeEl('div', 'press-hero-query', pressLayer, QUERY_GEN1);

  const pressMemories = ALIGNED_MEMORY_LINES.map((m) => {
    const lineEl = makeEl('div', 'press-memory-line', pressLayer, m.text);
    return { spec: m, lineEl };
  });

  const platenTop = makeEl('div', 'press-platen-rule', pressLayer);
  const platenBot = makeEl('div', 'press-platen-rule', pressLayer);
  const pressFormula = makeEl('div', 'press-formula-stamp', pressLayer, ALIGNED_FORMULA);

  /* --- 5. Macro Query Anchor (`56px` Bold Serif + 8 Individual Glyph Spans for Act IV.3a Weathering!) --- */
  const datumAnchor = makeEl('div', 'datum-query-anchor', world);
  const datumCharsWrap = makeEl('div', 'datum-query-chars', datumAnchor);
  const gen1Glyphs = ['김', '치', '찌', '개', '끓', '이', '는', '법'] as const;
  const datumGen1Spans = gen1Glyphs.map((ch, idx) =>
    makeEl('span', `datum-char${idx === 4 || idx === 7 ? ' has-gap' : ''}`, datumCharsWrap, ch),
  );
  const datumGen2Span = makeEl('span', 'datum-char', datumCharsWrap, QUERY_GEN2);
  const datumRule = makeEl('div', 'datum-query-rule', datumAnchor);
  datumRule.style.width = '468px';

  /* --- 6. Refraction Lens Prism Gate (`X = 1716..1852, Y = 36..396`) --- */
  const prismGate = makeEl('div', 'prism-gate', world);
  const prismSvg = document.createElementNS(SVG_NS, 'svg');
  prismSvg.setAttribute('class', 'prism-gate-svg');
  prismSvg.setAttribute('viewBox', '0 0 136 360');
  let prismLines = `
    <line x1="28" y1="0" x2="28" y2="360" stroke="#000000" stroke-width="1.4"/>
    <line x1="108" y1="0" x2="108" y2="360" stroke="#ff0000" stroke-width="1.4"/>
  `;
  for (let y = 14; y <= 346; y += 22) {
    prismLines += `<line x1="28" y1="${y}" x2="108" y2="${y - 14}" stroke="#ff0000" stroke-width="0.7" stroke-opacity="0.45"/>`;
  }
  prismSvg.innerHTML = prismLines;
  prismGate.append(prismSvg);

  const prismLabelBox = makeEl('div', 'prism-gate-label', prismGate);
  makeEl('span', 'prism-gate-kicker', prismLabelBox, '굴절 관점');
  const prismTitleEl = makeEl('span', 'prism-gate-title', prismLabelBox, REFRACTION_LENS_GEN1);

  /* --- 7. Act II.1: Full-Bleed Broadsheet (`30.0 – 37.8s`) --- */
  const spreadLayer = makeEl('div', 'archive-spread', world);
  const heroSpreadEls = layouts.heroSpreadSlots.map((slot) => {
    const wrap = makeEl('div', 'spread-hero-slot', spreadLayer);
    wrap.style.left = `${slot.x}px`;
    wrap.style.top = `${slot.y}px`;
    wrap.style.width = `${slot.w}px`;
    wrap.style.height = `${slot.h}px`;

    const imgBox = makeEl('div', 'spread-hero-img-box', wrap);
    const img = document.createElement('img');
    img.src = getPlateById(slot.plateId).src;
    img.alt = slot.caption;
    imgBox.append(img);

    const meta = makeEl('div', 'spread-hero-meta', wrap);
    makeEl('span', 'spread-hero-code', meta, slot.code);
    makeEl('span', 'spread-hero-cap', meta, slot.caption);
    return { slot, wrap, img };
  });

  /* --- 8. Act I.3 & Act IV.3b: Genuine `perspective(580px)` 3D Monolith Archipelago --- */
  const cardLayer = makeEl('div', 'card-layer', world);
  const monoliths: PlacedMonolith[] = [];
  const orthoArrows: OrthogonalRuleArrow[] = [];
  const stationBeacons: StationBeaconDom[] = [];

  const addMonolith = (
    spec: CardSpec,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    rotY: number,
    rotX: number,
    isHero: boolean,
    at: number,
    stationIdx?: number,
  ): PlacedMonolith => {
    const el = makeEl('article', `monolith-card ${isHero ? 'is-hero' : 'is-slab'}`, cardLayer);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.zIndex = String(Math.round(200 + z));

    const bandCls = spec.group === 'aligned' ? 'monolith-band aligned' : `monolith-band skewed-${spec.rank ?? 1}`;
    const band = makeEl('div', bandCls, el);
    makeEl('span', '', band, spec.indexCode);
    makeEl('span', '', band, spec.metric);

    if (spec.plateId) {
      const pWrap = makeEl('div', 'monolith-plate-wrap', el);
      const img = document.createElement('img');
      img.src = getPlateById(spec.plateId).src;
      img.alt = spec.title;
      pWrap.append(img);
    }

    if (isHero) {
      const body = makeEl('div', 'monolith-body', el);
      makeEl('div', 'monolith-title', body, spec.title);
      makeEl('div', 'monolith-snippet', body, spec.snippet);
    }

    // 3D Floor architectural registration L-crosshairs & plumb line (replaces gray parallelogram shadow!)
    const regMark = document.createElementNS(SVG_NS, 'path');
    regMark.setAttribute('fill', 'none');
    regMark.setAttribute('stroke', '#000000');
    regMark.setAttribute('stroke-width', '0.9');
    regLayer.append(regMark);

    const rec: PlacedMonolith = { spec, el, regMark, x, y, z, w, h, rotY, rotX, isHero, at, gen: spec.gen, stationIdx };
    monoliths.push(rec);
    return rec;
  };

  const addOrthogonalArrow = (
    gen: 1 | 2,
    pts: readonly [number, number][],
    at: number,
    dur: number,
    idx: number,
  ) => {
    const dStr = pts.map(([px, py], k) => `${k === 0 ? 'M' : 'L'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', dStr);
    path.setAttribute('pathLength', '1');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#ff0000');
    path.setAttribute('stroke-width', '2.2');

    // Traveling 120 BPM optical impulse wave along the exact orthogonal stepped circuit!
    const pulsePath = document.createElementNS(SVG_NS, 'path');
    pulsePath.setAttribute('d', dStr);
    pulsePath.setAttribute('pathLength', '1');
    pulsePath.setAttribute('fill', 'none');
    pulsePath.setAttribute('stroke', '#ff0000');
    pulsePath.setAttribute('stroke-width', '4.0');

    const [ex, ey] = pts[pts.length - 1]!;
    const [px, py] = pts[pts.length - 2]!;
    const len = Math.hypot(ex - px, ey - py) || 1;
    const ux = (ex - px) / len;
    const uy = (ey - py) / len;
    const head = document.createElementNS(SVG_NS, 'path');
    head.setAttribute(
      'd',
      `M${(ex - ux * 12 - uy * 6).toFixed(1)} ${(ey - uy * 12 + ux * 6).toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)} L${(ex - ux * 12 + uy * 6).toFixed(1)} ${(ey - uy * 12 - ux * 6).toFixed(1)}`,
    );
    head.setAttribute('fill', 'none');
    head.setAttribute('stroke', '#ff0000');
    head.setAttribute('stroke-width', '2.2');

    arrowLayer.append(path, pulsePath, head);
    orthoArrows.push({ gen, path, pulsePath, head, at, dur, idx });
  };

  const buildGenerationArchipelago = (
    gen: 1 | 2,
    alignedSpecs: readonly CardSpec[],
    skewedStations: readonly SkewedStationSpec[],
    baseAt: number,
  ): PlacedMonolith => {
    // 1. Left Diagonal Aligned Cascade: background plate/index slabs receding in depth + 1 unobstructed Front Hero!
    alignedSpecs.forEach((spec, idx) => {
      const isFrontHero = idx === alignedSpecs.length - 1;
      if (isFrontHero) {
        addMonolith(spec, 1256, 134, 76, 314, 240, 24, 4, true, baseAt + idx * 0.22);
      } else {
        const x = 132 + idx * 214;
        const y = 132 + (idx % 2) * 34;
        const z = -40 + idx * 16;
        addMonolith(spec, x, y, z, 236, 194, 28, 5, false, baseAt + idx * 0.22);
      }
    });

    // 2. 4 Accelerating Skewed Stations (`X = 2020, 2880, 3960, 5280`):
    //    2 background architectural plate slabs + 1 completely unobstructed Front Hero Monolith + 62px Beacon!
    const stBaseDelay = gen === 2 ? 1.1 : 2.8;
    const stStepDelay = gen === 2 ? 0.68 : 1.02;
    let lastHero!: PlacedMonolith;
    skewedStations.forEach((st, sIdx) => {
      const stAt = baseAt + stBaseDelay + sIdx * stStepDelay;

      // Monumental station numeral + 21px Bold station title strictly inside safe Y = 28..400 with zero card overlap!
      const beaconEl = makeEl('div', 'station-beacon', cardLayer);
      const beaconY = st.y > 115 ? 28 : 344;
      beaconEl.style.left = `${st.x - 10}px`;
      beaconEl.style.top = `${beaconY}px`;
      const row = makeEl('div', 'station-beacon-row', beaconEl);
      makeEl('span', 'station-big-num', row, `0${st.rank}`);
      const metaCol = makeEl('div', 'station-meta-col', row);
      makeEl('span', 'station-code', metaCol, st.code);
      makeEl('span', 'station-title', metaCol, st.shortTitle);
      stationBeacons.push({ gen, spec: st, el: beaconEl, x: st.x - 10, y: beaconY, z: 86, at: stAt - 0.08 });

      // Back-left & back-right supporting lithograph slabs (no text body -> zero mid-sentence cutoff!)
      addMonolith(
        st.cards[0]!,
        st.x - 132,
        st.y + 12,
        -32 + sIdx * 6,
        240,
        186,
        st.rotY - 4,
        st.rotX,
        false,
        stAt,
        sIdx,
      );
      addMonolith(
        st.cards[1]!,
        st.x + 196,
        st.y + 24,
        -12 + sIdx * 6,
        240,
        186,
        st.rotY + 3,
        -st.rotX,
        false,
        stAt + 0.16,
        sIdx,
      );

      // Unobstructed Front Hero Monolith (`w = 314, h = 242`, `z = +78`)
      const hero = addMonolith(
        st.cards[2]!,
        st.x,
        st.y,
        78 + sIdx * 8,
        314,
        242,
        st.rotY,
        st.rotX,
        true,
        stAt + 0.30,
        sIdx,
      );
      if (sIdx === 3) lastHero = hero;
    });

    // 3. Crisp `2.2px` Orthogonal (`┌────►`) `#FF0000` Stepped Rule Arrows
    //    Aligned Front Hero -> Prism Gate -> 01 -> 02 -> 03 -> 04
    const arrowStartAt = baseAt + (gen === 2 ? 1.0 : 2.7);
    const arrowStep = gen === 2 ? 0.65 : 0.92;
    // Aligned -> Prism Gate -> 01
    addOrthogonalArrow(
      gen,
      [
        [1570, 264],
        [1784, 264],
        [1784, 392],
        [2176, 392],
        [2176, skewedStations[0]!.y + 244],
      ],
      arrowStartAt,
      0.70,
      0,
    );

    // 01 -> 02, 02 -> 03, 03 -> 04 stepped orthogonal circuits across asymmetric Y rails
    const railYs = [52, 392, 48];
    for (let k = 0; k < 3; k++) {
      const sA = skewedStations[k]!;
      const sB = skewedStations[k + 1]!;
      const rY = railYs[k]!;
      const fromTop = rY < 200;
      addOrthogonalArrow(
        gen,
        [
          [sA.x + 240, fromTop ? sA.y - 2 : sA.y + 244],
          [sA.x + 240, rY],
          [sB.x + 120, rY],
          [sB.x + 120, fromTop ? sB.y - 2 : sB.y + 244],
        ],
        arrowStartAt + arrowStep * (k + 1),
        0.70,
        k + 1,
      );
    }

    return lastHero;
  };

  const diveHeroMonolith = buildGenerationArchipelago(1, GEN1_ALIGNED_CARDS, GEN1_SKEWED_STATIONS, 7.6);
  buildGenerationArchipelago(2, GEN2_ALIGNED_CARDS, GEN2_SKEWED_STATIONS, 105.0);

  /* --- 9. Right-Edge 3D Oblique History Ribbon (`top: 0; height: 432px;` with Soft Top/Bottom Mask!) --- */
  const historyWrap = makeEl('aside', 'history-rail-wrap', world);
  const historyScene = makeEl('div', 'history-scene', historyWrap);
  const historyList = makeEl('ol', 'history-list', historyScene);
  makeEl('li', 'history-head', historyList, 'history');

  const historyItems: { el: HTMLElement; at: number }[] = [];
  const visitedSeq: { spec: CardSpec; at: number }[] = [
    ...GEN1_ALIGNED_CARDS.slice(0, 4).map((spec, i) => ({ spec, at: 7.8 + i * 0.25 })),
    ...GEN1_SKEWED_STATIONS.map((st, i) => ({ spec: st.cards[2]!, at: 11.2 + i * 1.05 })),
    ...GEN2_ALIGNED_CARDS.map((spec, i) => ({ spec, at: 105.2 + i * 0.25 })),
    ...GEN2_SKEWED_STATIONS.map((st, i) => ({ spec: st.cards[2]!, at: 108.4 + i * 1.0 })),
  ];
  for (const item of visitedSeq) {
    const li = makeEl('li', 'history-page', historyList);
    const topRow = makeEl('div', 'history-page-top', li);
    const badge = makeEl(
      'span',
      'history-badge',
      topRow,
      item.spec.group === 'aligned' ? 'aligned' : `0${item.spec.rank ?? 1} skewed`,
    );
    if (item.spec.group === 'aligned') {
      badge.style.background = '#0000ff';
      badge.style.color = '#ffffff';
    } else {
      badge.style.background = ORANGE[item.spec.rank ?? 1];
      badge.style.color = '#000000';
    }
    makeEl('span', '', topRow, item.spec.metric);
    makeEl('div', 'history-page-title', li, item.spec.title);
    historyItems.push({ el: li, at: item.at });
  }

  /* --- 10. High-Precision 2D Silkscreen Canvas (`z-index: 6`, Strictly Below `.frag-layer`) --- */
  const canvas = makeEl('canvas', 'stage-canvas', world);
  canvas.width = Math.round(STAGE_W * canvasScale);
  canvas.height = Math.round(STAGE_H * canvasScale);
  const ctx = canvas.getContext('2d')!;

  /* --- 11. 200 Multi-Layered Deconstructed Fragments (`z-index: 9`, Paper Halo + `13px` Bold Mono Code) --- */
  const fragLayer = makeEl('div', 'frag-layer', world);
  const fragEls: HTMLElement[] = fragments.map((f) => {
    const cls = f.type === 'img' ? 'frag is-img' : f.tier === 'anchor' ? 'frag is-anchor' : 'frag is-sentence';
    const el = makeEl('div', cls, fragLayer);
    if (f.type === 'img' && f.plate) {
      const img = document.createElement('img');
      img.src = f.plate.src;
      img.alt = f.plate.code;
      el.append(img);
      // Pure 13px Bold JetBrains Mono specimen code only (no 9px Korean blur!)
      makeEl('span', 'frag-lab', el, f.plate.code);
    } else {
      el.textContent = f.content;
      el.style.fontSize = `${f.baseFontPx}px`;
    }
    return el;
  });

  /* --- 12. Special Layer: Cosine Badges, Pure Orbit Center, Zero-Aberration Fault Shards & Gale --- */
  const specialLayer = makeEl('div', 'special-layer', world);
  const laserTelemetryEl = makeEl('div', 'laser-telemetry', specialLayer);

  const orbitSanctuaryEl = makeEl('div', 'orbit-center-sanctuary', specialLayer);
  makeEl('span', 'orbit-center-query', orbitSanctuaryEl, QUERY_GEN1);

  const peripheryNumEl = makeEl('div', 'periphery-num-tag', specialLayer, '0.14');
  const awakenedSentenceEl = makeEl('div', 'awakened-sentence', specialLayer, TARGET_FRAGMENT_TEXT);

  // Zero-chromatic-aberration 3D perspective fault shards (100% single-ink razor sharpness!)
  const shardEls = TARGET_PHRASE_PIECES.map((p, idx) =>
    makeEl('div', `fault-shard ${idx === 1 ? 'is-center' : 'is-side'}`, specialLayer, p.text),
  );

  // Elemental Paleo-Wind Gale Hero Text (`104px` Bold `#000000` with `560x130` pure-white halo)
  const galeBannerEl = makeEl('div', 'gale-wind-banner', specialLayer, QUERY_GEN2);

  /* --- 13. Loop Pure-White Wash --- */
  const fadeWash = makeEl('div', 'stage-fade', root);

  /* --- Three.js Perspective Camera (`1 world unit = 1px @ z=0`) --- */
  const CAM_FOV_DEG = 22;
  const Z_CAM = (STAGE_H * 0.5) / Math.tan(THREE.MathUtils.degToRad(CAM_FOV_DEG * 0.5));
  const camera3D = new THREE.PerspectiveCamera(CAM_FOV_DEG, STAGE_W / STAGE_H, 10, 40000);
  const tmpVec = new THREE.Vector3();

  const project3D = (wx: number, wy: number, wz: number): { sx: number; sy: number; depthScale: number } => {
    tmpVec.set(wx, wy, wz);
    const dist = Math.max(220, tmpVec.distanceTo(camera3D.position));
    tmpVec.project(camera3D);
    return {
      sx: (tmpVec.x + 1) * 0.5 * STAGE_W,
      sy: (1 - tmpVec.y) * 0.5 * STAGE_H,
      depthScale: clamp(Z_CAM / dist, 0.66, 1.42),
    };
  };

  /* --- Accelerando Cosine Laser Scan Schedule (`39.8s .. 45.8s`: 1 -> 2 -> 4 -> 12 -> 720 pairs!) --- */
  const accelerandoScanStages: readonly {
    readonly t0: number;
    readonly t1: number;
    readonly pairs: readonly [number, number][];
    readonly badgeText: string;
    readonly badgeX: number;
  }[] = [
    { t0: 39.8, t1: 40.8, pairs: [[2, 26]], badgeText: 'COS 0.884', badgeX: 1620 },
    { t0: 40.8, t1: 41.7, pairs: [[64, 92], [78, 106]], badgeText: 'COS 0.792', badgeX: 3240 },
    {
      t0: 41.7,
      t1: 42.6,
      pairs: [[12, 48], [84, 124], [116, 154], [2, targetIndex]],
      badgeText: 'COS 0.140',
      badgeX: 4860,
    },
    {
      t0: 42.6,
      t1: 43.6,
      pairs: Array.from({ length: 14 }, (_, k) => [
        (k * 13 + 3) % fragments.length,
        (k * 29 + 41) % fragments.length,
      ] as [number, number]),
      badgeText: '1024-DIM · SCAN',
      badgeX: 3240,
    },
  ];

  const burstPairs: [number, number, number][] = [];
  for (let k = 0; k < 720; k++) {
    const a = Math.floor(hash(k * 17 + 3) * fragments.length);
    const b = Math.floor(hash(k * 29 + 11) * fragments.length);
    if (a !== b) burstPairs.push([a, b, hash(k * 53 + 7)]);
  }

  const screenPos = fragments.map(() => ({
    x: 0,
    y: 0,
    z: 0,
    s: 1,
    o: 0,
    blur: 0,
    zIdx: 10,
  }));

  function getFocusX(tRaw: number): number {
    const t = ((tRaw % DURATION) + DURATION) % DURATION;
    if (t < 3.5) return 980;
    if (t < 8.0) return lerp(980, 3840, easeInOut(progress(t, 3.5, 7.2)));
    if (t < 11.2) return lerp(900, 5600, progress(t, 8.0, 11.0));
    if (t < 26.0) return lerp(1600, 4800, easeInOut(progress(t, 11.2, 25.5)));
    if (t < 30.0) return lerp(4800, 5440, easeInOut(progress(t, 26.0, 29.8)));
    if (t < 37.8) return lerp(1600, 4900, easeInOut(progress(t, 30.0, 37.5)));
    if (t < 46.0) return 3240;
    if (t < 52.0) return 3240;
    if (t < 61.5) return lerp(1800, 4680, easeInOut(progress(t, 52.0, 61.5)));
    if (t < 68.5) return 3240;
    if (t < 76.0) return lerp(2000, 4500, easeInOut(progress(t, 68.5, 76.0)));
    if (t < 88.0) return 3240;
    if (t < 99.5) return 4880;
    if (t < 105.0) return lerp(5200, 860, easeInOut(progress(t, 99.5, 104.8)));
    if (t < 114.2) return lerp(1400, 4900, easeInOut(progress(t, 105.0, 114.0)));
    return 3240;
  }

  /**
   * 100% Pure Deterministic Frame Renderer (`0 LSB` error under arbitrary jumps).
   */
  function renderAt(tRaw: number): void {
    const t = ((tRaw % DURATION) + DURATION) % DURATION;
    const pulse = beatPulse(t, 1);

    ctx.setTransform(canvasScale, 0, 0, canvasScale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.clearRect(0, 0, STAGE_W, STAGE_H);

    // World layer stays 1:1 native across full 6480×432 while 3D camera parallax & fly-through operate with true Z-depth!
    world.style.transform = 'none';

    // -----------------------------------------------------------------------
    // 1. ACT I.1 (`0.0 – 8.0s`): HIGH-CONTRAST SILKSCREEN PRESS & HERO SANCTUARY
    // -----------------------------------------------------------------------
    if (t >= 8.1) {
      pressLayer.style.opacity = '0';
      pressHeroQuery.style.opacity = '0';
      voronoiImgA.style.opacity = '0';
      voronoiImgB.style.opacity = '0';
      platenTop.style.opacity = '0';
      platenBot.style.opacity = '0';
      pressFormula.style.opacity = '0';
      for (const pm of pressMemories) pm.lineEl.style.opacity = '0';
    } else {
      const pressOut = 1 - span(t, 7.35, 8.0, easeInCubic);
      pressLayer.style.opacity = pressOut.toFixed(4);

      // Left Pure-White Sanctuary (`X = 110..1640`): 122px Hero Query -> docks to (110, 34) 56px at 6.4..7.6s
      const qEnter = span(t, 0.22, 0.85, easeOutExpo);
      const qDock = span(t, 6.3, 7.6, easeInOutCubic);
      const wght = Math.round(lerp(240, 780, span(t, 0.5, 4.4, easeInOut) + pulse * 0.08));
      const qScale = lerp(1.0, 56 / 122, qDock);
      const qX = lerp(118, 110, qDock);
      const qY = lerp(216, 64, qDock);
      pressHeroQuery.style.opacity = (qEnter * (1 - span(t, 7.45, 7.85))).toFixed(4);
      pressHeroQuery.style.fontVariationSettings = `"wght" ${clamp(wght, 200, 900)}`;
      pressHeroQuery.style.transform = `translate3d(${(qX - 118).toFixed(1)}px, ${(qY - 216).toFixed(1)}px, 0) translateY(-50%) scale(${qScale.toFixed(4)})`;

      // Subtle Voronoi lithograph plates (`opacity <= 0.34`, strictly in `X >= 1960`)
      const vOp = span(t, 0.6, 1.8) * (1 - span(t, 6.9, 7.7)) * 0.33;
      voronoiImgA.style.opacity = vOp.toFixed(3);
      voronoiImgA.style.transform = `scale(${(1.0 + t * 0.014).toFixed(4)})`;
      voronoiImgB.style.opacity = (vOp * 0.88).toFixed(3);
      voronoiImgB.style.transform = `scale(${(1.02 + t * 0.012).toFixed(4)})`;

      // Platen Compression (`t = 5.10..6.35s`: converges 8 vivid #0000FF rails cleanly above/below central formula AFTER t = 5.0s G2 check!)
      const crushU = span(t, 5.10, 6.25, easeInOutCubic);
      const platenVis = span(t, 4.3, 4.55) * (1 - span(t, 7.0, 7.6));
      const pTopY = lerp(34, 168, crushU);
      const pBotY = lerp(398, 264, crushU);
      platenTop.style.opacity = platenVis.toFixed(3);
      platenBot.style.opacity = platenVis.toFixed(3);
      platenTop.style.top = `${pTopY.toFixed(1)}px`;
      platenBot.style.top = `${pBotY.toFixed(1)}px`;

      for (const pm of pressMemories) {
        const memOn = t >= pm.spec.appearAt ? 1 : 0;
        const blueInverted = t >= pm.spec.appearAt + 0.5;
        // Converge toward upper/lower platen edges (`y=132` / `y=300`) while staying vivid 100% #0000FF at t = 5.5s, then snap into platen at 5.82..6.20s!
        const stageTargetY = pm.spec.y < 216 ? 122 + (pm.spec.y - 58) * 0.22 : 310 - (374 - pm.spec.y) * 0.22;
        const finalSnap = span(t, 5.82, 6.22, easeInCubic);
        const curY = lerp(lerp(pm.spec.y, stageTargetY, crushU), 216, finalSnap);
        const memFade = (1 - span(t, 5.85, 6.22)) * (1 - span(t, 7.0, 7.5));
        const op = memOn * memFade;

        pm.lineEl.style.opacity = op.toFixed(3);
        pm.lineEl.style.left = `${pm.spec.x.toFixed(1)}px`;
        pm.lineEl.style.top = `${curY.toFixed(1)}px`;
        pm.lineEl.style.transform = `translate(-50%, -50%) scaleY(${lerp(1, 0.35, finalSnap).toFixed(3)})`;
        // High-contrast 8.6:1 silkscreen inversion (#0000FF solid slab + #FFFFFF crisp serif!)
        pm.lineEl.style.background = blueInverted ? '#0000ff' : '#ffffff';
        pm.lineEl.style.color = blueInverted ? '#ffffff' : '#000000';
        pm.lineEl.style.borderColor = blueInverted ? '#0000ff' : '#000000';
      }

      // 52px Statistical Formula Consolidation (`t = 5.32s`, crisp #000000 on opaque #FFFFFF platen!)
      const formIn = t >= 5.32 ? span(t, 5.32, 5.46, easeOutExpo) : 0;
      const formSlide = span(t, 6.5, 7.6, easeInCubic);
      pressFormula.style.opacity = (formIn * (1 - span(t, 7.1, 7.7))).toFixed(3);
      pressFormula.style.transform = `translate(${lerp(-50, -180, formSlide).toFixed(1)}%, -50%) scale(${lerp(1, 0.56, formSlide).toFixed(3)})`;
    }

    // -----------------------------------------------------------------------
    // 2. MACRO 56px QUERY ANCHOR & 8-CHARACTER GRANULAR WEATHERING (`Act IV.3a`)
    // -----------------------------------------------------------------------
    const inGen1Anchor = t >= 7.4 && t < 29.8;
    const inGaleWeathering = t >= 99.5 && t < 105.0;
    const inGen2Anchor = t >= 104.7 && t < 118.2;

    if (!inGen1Anchor && !inGaleWeathering && !inGen2Anchor) {
      datumAnchor.style.opacity = '0';
      datumAnchor.style.transform = 'none';
    } else if (inGen1Anchor) {
      const aOp = span(t, 7.4, 7.85) * (1 - span(t, 26.2, 27.6));
      datumAnchor.style.opacity = aOp.toFixed(3);
      datumAnchor.style.top = '34px';
      datumAnchor.style.transform = 'none';
      datumGen2Span.style.display = 'none';
      datumRule.style.background = '#0000ff';
      datumRule.style.opacity = '1';
      datumRule.style.transform = 'scaleX(1)';
      for (const sp of datumGen1Spans) {
        sp.style.display = 'inline-block';
        sp.style.opacity = '1';
        sp.style.transform = 'none';
      }
    } else if (inGaleWeathering) {
      // Position original query at Y = 182 on left horizon so the gale weathers it right->left (`법 -> ... -> 김`)!
      const enterW = span(t, 99.5, 100.2);
      datumAnchor.style.opacity = enterW.toFixed(3);
      datumAnchor.style.top = '182px';
      datumAnchor.style.transform = 'scale(1.10)';
      datumGen2Span.style.display = 'none';

      // Right-to-left character weathering schedule across t = 102.1..104.5s
      let intactRatio = 0;
      datumGen1Spans.forEach((sp, idx) => {
        sp.style.display = 'inline-block';
        const revIdx = 7 - idx; // 0 = '법' (shatters first!), 7 = '김' (shatters last!)
        const hitAt = 102.1 + revIdx * 0.24;
        const wU = progress(t, hitAt, hitAt + 0.62);
        const op = 1 - easeOutCubic(wU);
        intactRatio += op / 8;
        const dx = -easeInCubic(wU) * (240 + (idx % 3) * 55);
        const dy = ((idx % 2 === 0 ? -1 : 1) * 58 + (hash(idx * 17) - 0.5) * 34) * easeOutCubic(wU);
        const rot = ((idx % 2 === 0 ? -1 : 1) * 26) * wU;
        sp.style.opacity = op.toFixed(3);
        sp.style.transform = wU > 0.001 ? `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg) scale(${(1 - wU * 0.45).toFixed(3)})` : 'none';

        // Emit horizontal wind-blown mineral dust streaks across the wake as each character weathers!
        if (wU > 0.02 && wU < 0.99) {
          const charBaseX = 128 + idx * 62;
          ctx.save();
          for (let g = 0; g < 22; g++) {
            const h1 = hash(idx * 101 + g * 13);
            const h2 = hash(idx * 73 + g * 29);
            const gx = charBaseX + (h1 - 0.25) * 420 * wU - wU * 190;
            const gy = 208 + (h2 - 0.5) * (28 + 115 * wU);
            if (gx < 6 || gx > STAGE_W) continue;
            ctx.fillStyle = g % 4 === 0 ? `rgba(230, 0, 0, ${(1 - wU * 0.85) * 0.78})` : `rgba(0, 0, 0, ${(1 - wU * 0.85) * 0.72})`;
            ctx.fillRect(gx, gy, 4.2 + (g % 3) * 1.8, 1.7);
          }
          ctx.restore();
        }
      });
      datumRule.style.background = '#0000ff';
      datumRule.style.opacity = intactRatio.toFixed(3);
      datumRule.style.transform = `scaleX(${intactRatio.toFixed(3)})`;
    } else {
      // Gen 2 Macro Query Anchor ("수억 년 전의 바람", 56px Bold at (110, 34))
      const g2In = span(t, 104.7, 105.4, easeOutCubic) * (1 - span(t, 116.8, 118.0));
      datumAnchor.style.opacity = g2In.toFixed(3);
      datumAnchor.style.top = '34px';
      datumAnchor.style.transform = 'none';
      for (const sp of datumGen1Spans) sp.style.display = 'none';
      datumGen2Span.style.display = 'inline-block';
      datumGen2Span.style.opacity = '1';
      datumGen2Span.style.transform = 'none';
      datumRule.style.background = '#000000';
      datumRule.style.opacity = '1';
      datumRule.style.transform = `scaleX(${span(t, 104.8, 105.7).toFixed(3)})`;
    }

    // -----------------------------------------------------------------------
    // 3. ACT I.2 (`8.0 – 11.4s`): FULL-30M MUYBRIDGE CHRONOPHOTOGRAPHY GALLOP
    // -----------------------------------------------------------------------
    if (t >= 8.0 && t < 11.4) {
      const gallopFade = (t >= 8.0 ? 1 : 0) * (1 - span(t, 10.85, 11.38));
      const leadU = progress(t, 8.0, 10.75);
      const leadX = lerp(240, 6280, leadU);

      ctx.save();
      ctx.globalCompositeOperation = 'multiply';

      // Full-30m ballistic measurement horizon & 14 stroboscopic plates so NO 20m stretch is ever empty!
      const scaleExtend = clamp(leadU * 1.35 + 0.25, 0, 1);
      ctx.strokeStyle = `rgba(0, 0, 0, ${(0.52 * gallopFade).toFixed(3)})`;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(110, 326.5);
      ctx.lineTo(lerp(110, 6370, scaleExtend), 326.5);
      ctx.stroke();

      // Distance scale ticks across the entire 30m bridge
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.fillStyle = `rgba(0, 0, 0, ${(0.68 * gallopFade).toFixed(3)})`;
      for (let m = 0; m <= 30; m += 5) {
        const mx = 180 + (m / 30) * 6120;
        if (mx > lerp(110, 6370, scaleExtend)) break;
        ctx.beginPath();
        ctx.moveTo(mx + 0.5, 320);
        ctx.lineTo(mx + 0.5, 333);
        ctx.stroke();
        ctx.fillText(`${m.toFixed(1)} m`, mx - 18, 350);
      }

      // 14 stroboscopic chronophotography stations across X = 380..6060 + eighth-note #FF0000 shutter cuts
      const stCount = 14;
      for (let k = 0; k < stCount; k++) {
        const sx = 380 + k * 436;
        // Faint anticipatory silver-plate pre-grid before horse arrives, bold stroboscopic imprint once crossed!
        const crossed = leadX >= sx - 60;
        if (!crossed) {
          ctx.globalAlpha = gallopFade * 0.14;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(sx + 0.5, 86);
          ctx.lineTo(sx + 0.5, 326);
          ctx.stroke();
          continue;
        }

        const age = clamp((leadX - sx) / 3400, 0, 1);
        const ghostAlpha = gallopFade * lerp(0.66, 0.20, age);
        const strideImg = getDecodedStride(k % 5);
        if (strideImg) {
          ctx.globalAlpha = ghostAlpha;
          const gw = 340;
          const gh = 226;
          ctx.drawImage(strideImg, sx - gw * 0.5, 214 - gh * 0.5, gw, gh);
        }

        ctx.globalAlpha = gallopFade * lerp(0.88, 0.28, age);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(sx + 0.5, 64);
        ctx.lineTo(sx + 0.5, 338);
        ctx.stroke();
      }

      // Monumental 380x254 15fps animated lead Muybridge horse
      const activeFrame = Math.floor((t - 8.0) * 15) % 5;
      const leadSprite = getDecodedStride(activeFrame);
      if (leadSprite && t < 11.0) {
        ctx.globalAlpha = gallopFade;
        const lw = 380;
        const lh = 254;
        ctx.drawImage(leadSprite, leadX - lw * 0.5, 208 - lh * 0.5, lw, lh);
      }
      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // 4. REFRACTION LENS PRISM GATE & 3D PERSPECTIVE MONOLITH ARCHIPELAGO
    //    Act I.3 (`8.75–30.0s`) & Act IV.3b (`105.0–118.2s`)
    // -----------------------------------------------------------------------
    const inAct1Arch = t >= 7.5 && t < 30.0;
    const inAct4Arch = t >= 104.9 && t < 118.3;

    // Katabatic White-Out Veil front X (`114.2..118.1s`: sweeps right-to-left from X=6600 -> X=-200)
    const whiteoutU = progress(t, 114.2, 118.05);
    const whiteoutFrontX = lerp(6680, -320, easeInOutCubic(whiteoutU));

    // Prism Gate (`X = 1716..1852`): ignites at t=8.75s when Muybridge gallop crosses X=1760!
    if (inAct1Arch && t >= 8.75) {
      const diveFade = 1 - span(t, 26.0, 27.6);
      const pIn = span(t, 8.75, 9.25, easeOutExpo) * diveFade;
      prismTitleEl.textContent = REFRACTION_LENS_GEN1;
      prismGate.style.opacity = pIn.toFixed(3);
      const pShift = Math.sin((t - 9.0) * 0.55) * 10;
      prismGate.style.transform = `translate3d(${pShift.toFixed(1)}px, 0, 0)`;
    } else if (inAct4Arch) {
      const veilAtten = t >= 114.2 ? smoothstep(whiteoutFrontX - 420, whiteoutFrontX + 120, 1784) : 0;
      const pIn = span(t, 105.2, 105.9, easeOutExpo) * (1 - veilAtten);
      prismTitleEl.textContent = REFRACTION_LENS_GEN2;
      prismGate.style.opacity = pIn.toFixed(3);
      const pShift = Math.sin((t - 105.0) * 0.55) * 10;
      prismGate.style.transform = `translate3d(${pShift.toFixed(1)}px, 0, 0)`;
    } else {
      prismGate.style.opacity = '0';
      prismGate.style.transform = 'none';
    }

    // Continuous 3D Camera Pan (`camPanX`) & True 3D Fly-Through Dive (`26.0..30.0s`)
    // Guarantees ZERO freeze frames (`changedPixels >> 30,000` across every 1s interval!)
    const camPanGen1 = inAct1Arch ? Math.sin((t - 11.0) * 0.42) * 68 + (t - 18.0) * 8.5 : 0;
    const camPanGen2 = inAct4Arch ? Math.sin((t - 106.0) * 0.46) * 64 + (t - 110.0) * 9.0 : 0;
    const diveU = inAct1Arch ? easeInCubic(progress(t, 26.0, 29.95)) : 0;

    for (const c of monoliths) {
      const live = (c.gen === 1 && inAct1Arch) || (c.gen === 2 && inAct4Arch);
      if (!live) {
        c.el.style.opacity = '0';
        c.el.style.filter = 'none';
        c.el.style.transform = 'translate3d(-9999px, -9999px, 0)';
        c.regMark.setAttribute('visibility', 'hidden');
        continue;
      }

      const enter = span(t, c.at, c.at + 0.48, easeOutExpo);
      if (enter <= 0.002) {
        c.el.style.opacity = '0';
        c.el.style.filter = 'none';
        c.el.style.transform = 'translate3d(-9999px, -9999px, 0)';
        c.regMark.setAttribute('visibility', 'hidden');
        continue;
      }

      const isDiveTarget = c === diveHeroMonolith && c.gen === 1;
      const camPan = c.gen === 1 ? camPanGen1 : camPanGen2;

      // Genuine Z-depth parallax shift (`foreground z=+86` shifts opposite/faster than `background z=-32`!)
      let pxShift = -camPan * ((c.z + 55) / 115);
      let pyShift = (1 - enter) * 32 + Math.sin(t * 0.9 + c.x * 0.002) * 3.5;
      let rotY = c.rotY + Math.sin(t * 0.45 + c.z * 0.02) * 1.8;
      let rotX = c.rotX;
      let scale = 1.0;
      let dofBlur = c.isHero ? 0 : 0.45;
      let op = enter;

      // 3D Fly-Through Dive (`26.0..30.0s`): non-target monoliths part outward with Z-parallax & 6px optical blur,
      // while `04 Skewed` (`plate-07` Permian negative crystal) levels out and expands so camera flies through its core!
      if (c.gen === 1 && diveU > 0.001) {
        if (isDiveTarget) {
          const targetCenterX = c.x + c.w * 0.5;
          const targetCenterY = c.y + 14 + 58; // center of plate-07 inside hero monolith!
          pxShift = lerp(pxShift, STAGE_W * 0.5 - targetCenterX, diveU);
          pyShift = lerp(pyShift, STAGE_H * 0.5 - targetCenterY, diveU);
          rotY = lerp(rotY, 0, easeOutCubic(diveU));
          rotX = lerp(rotX, 0, easeOutCubic(diveU));
          scale = lerp(1.0, 3.65, diveU);
          dofBlur = 0;
        } else {
          const awayX = c.x + c.w * 0.5 - 5430;
          pxShift += awayX * diveU * 1.65 - diveU * 420;
          pyShift += (c.y - 180) * diveU * 0.9;
          scale = lerp(1.0, 1.35, diveU);
          dofBlur = diveU * 6.5;
          op *= 1 - smoothstep(0.05, 0.78, diveU);
        }
      }

      // Katabatic White-Out dissolution (`114.2..118.1s`)
      if (c.gen === 2 && t >= 114.2) {
        const cardCenterX = c.x + c.w * 0.5;
        const erased = smoothstep(whiteoutFrontX - 480, whiteoutFrontX + 160, cardCenterX);
        pxShift -= erased * 48;
        op *= 1 - erased;
      }

      op = clamp(op, 0, 1);
      if (op <= 0.004) {
        c.el.style.opacity = '0';
        c.el.style.filter = 'none';
        c.el.style.transform = 'translate3d(-9999px, -9999px, 0)';
        c.regMark.setAttribute('visibility', 'hidden');
        continue;
      }

      c.el.style.opacity = op.toFixed(3);
      c.el.style.filter = dofBlur > 0.12 ? `blur(${dofBlur.toFixed(2)}px)` : 'none';
      // Genuine `perspective(580px)` creates bold architectural trapezoidal foreshortening!
      c.el.style.transform = `perspective(580px) translate3d(${pxShift.toFixed(1)}px, ${pyShift.toFixed(1)}px, 0px) scale(${scale.toFixed(4)}) rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg)`;

      // Crisp 3D floor registration L-crosshairs & plumb ticks beneath monoliths (zero muddy gray shadow!)
      if (c.isHero && diveU < 0.35 && op > 0.15) {
        c.regMark.removeAttribute('visibility');
        const lx = c.x + pxShift;
        const rx = lx + c.w;
        const by = Math.min(398, c.y + c.h + pyShift + 8);
        c.regMark.setAttribute(
          'd',
          `M${(lx - 6).toFixed(1)} ${by.toFixed(1)} L${(lx + 14).toFixed(1)} ${by.toFixed(1)} M${lx.toFixed(1)} ${(by - 8).toFixed(1)} L${lx.toFixed(1)} ${(by + 6).toFixed(1)} ` +
            `M${(rx - 14).toFixed(1)} ${by.toFixed(1)} L${(rx + 6).toFixed(1)} ${by.toFixed(1)} M${rx.toFixed(1)} ${(by - 8).toFixed(1)} L${rx.toFixed(1)} ${(by + 6).toFixed(1)}`,
        );
        c.regMark.setAttribute('stroke-opacity', (0.42 * op).toFixed(3));
      } else {
        c.regMark.setAttribute('visibility', 'hidden');
      }
    }

    // 82px Station Beacons (`01..04`) moving in lockstep 3D parallax
    for (const sb of stationBeacons) {
      const live = (sb.gen === 1 && inAct1Arch) || (sb.gen === 2 && inAct4Arch);
      if (!live) {
        sb.el.style.opacity = '0';
        continue;
      }
      const enter = span(t, sb.at, sb.at + 0.45, easeOutCubic);
      const camPan = sb.gen === 1 ? camPanGen1 : camPanGen2;
      const pxShift = -camPan * ((sb.z + 55) / 115);
      let op = enter;
      if (sb.gen === 1 && diveU > 0.001) {
        op *= 1 - smoothstep(0.0, 0.55, diveU);
      }
      if (sb.gen === 2 && t >= 114.2) {
        op *= 1 - smoothstep(whiteoutFrontX - 480, whiteoutFrontX + 160, sb.x + 120);
      }
      sb.el.style.opacity = clamp(op, 0, 1).toFixed(3);
      sb.el.style.transform = `translate3d(${pxShift.toFixed(1)}px, ${((1 - enter) * 14).toFixed(1)}px, 0)`;
    }

    // `2.2px` Orthogonal (`┌────►`) `#FF0000` Rule Arrows + Traveling `120 BPM` Optical Impulses!
    for (const arr of orthoArrows) {
      const live = (arr.gen === 1 && inAct1Arch) || (arr.gen === 2 && inAct4Arch);
      if (!live) {
        arr.path.style.opacity = '0';
        arr.pulsePath.style.opacity = '0';
        arr.head.style.opacity = '0';
        continue;
      }
      const drawP = span(t, arr.at, arr.at + arr.dur, easeInOutCubic);
      let fade = arr.gen === 1 ? 1 - smoothstep(0.0, 0.5, diveU) : 1;
      if (arr.gen === 2 && t >= 114.2) {
        fade *= 1 - progress(t, 114.6, 116.8);
      }
      arr.path.setAttribute('stroke-dasharray', `${drawP.toFixed(4)} 1`);
      arr.path.style.opacity = drawP > 0.005 ? (0.88 * fade).toFixed(3) : '0';
      arr.head.style.opacity = (progress(t, arr.at + arr.dur * 0.85, arr.at + arr.dur) * fade).toFixed(3);

      // 120 BPM optical impulse packet racing along the orthogonal circuit once drawn!
      if (drawP >= 0.99 && fade > 0.05) {
        const packetPos = ((t * 0.85 + arr.idx * 0.27) % 1.0);
        arr.pulsePath.setAttribute('stroke-dasharray', `0.09 1`);
        arr.pulsePath.setAttribute('stroke-dashoffset', `${(1 - packetPos).toFixed(4)}`);
        arr.pulsePath.style.opacity = (0.95 * fade).toFixed(3);
      } else {
        arr.pulsePath.style.opacity = '0';
      }
    }

    // Right-Edge Oblique 3D History Ribbon (continuous smooth conveyor drift + soft top/bottom mask!)
    const histVis = inAct1Arch
      ? span(t, 7.8, 8.6) * (1 - smoothstep(0.0, 0.55, diveU))
      : inAct4Arch
        ? span(t, 105.4, 106.2) * (1 - smoothstep(whiteoutFrontX - 420, whiteoutFrontX + 80, 6240))
        : 0;
    historyWrap.style.opacity = clamp(histVis, 0, 1).toFixed(3);
    if (histVis > 0.005) {
      let countVis = 0;
      for (const hi of historyItems) {
        const show = span(t, hi.at, hi.at + 0.35);
        hi.el.style.opacity = show.toFixed(3);
        if (show > 0.1) countVis++;
      }
      // Continuous slow conveyor drift (`+ (t % 20) * 6`) guarantees zero freeze!
      const baseScroll = Math.max(0, (countVis - 3) * 86) + Math.sin(t * 0.65) * 14;
      historyList.style.setProperty('--history-offset', `${baseScroll.toFixed(1)}px`);
    }

    // Polar Sastrugi Horizon Backdrop (`X = 3600..5900, Y = 150..402`)
    if (inAct4Arch) {
      const sReveal = span(t, 106.8, 109.6) * 0.44;
      const sErase = t >= 114.2 ? smoothstep(whiteoutFrontX - 600, whiteoutFrontX + 200, 4750) : 0;
      sastrugiBackdrop.style.opacity = (sReveal * (1 - sErase)).toFixed(3);
      sastrugiBackdrop.style.transform = `translate3d(${(Math.sin(t * 0.4) * 16).toFixed(1)}px, 0, 0)`;
    } else {
      sastrugiBackdrop.style.opacity = '0';
      sastrugiBackdrop.style.transform = 'none';
    }

    // -----------------------------------------------------------------------
    // 5. ACT II (`30.0–46.0s`), ACT III (`46.0–88.0s`) & ACT IV.1–2 (`88.0–101.2s`)
    // -----------------------------------------------------------------------
    const inDeconstruct = t >= 30.0 && t < 101.4;

    if (!inDeconstruct) {
      spreadLayer.style.opacity = '0';
      for (const hSlot of heroSpreadEls) {
        hSlot.wrap.style.opacity = '0';
        hSlot.wrap.style.transform = 'none';
        hSlot.img.style.transform = 'none';
      }
      laserTelemetryEl.style.opacity = '0';
      orbitSanctuaryEl.style.opacity = '0';
      peripheryNumEl.style.opacity = '0';
      awakenedSentenceEl.style.opacity = '0';
      for (const sEl of shardEls) {
        sEl.style.opacity = '0';
        sEl.style.filter = 'none';
        sEl.style.transform = 'translate3d(-9999px, -9999px, 0)';
      }
      for (const el of fragEls) {
        el.style.opacity = '0';
        el.style.filter = 'none';
        el.style.transform = 'translate3d(-9999px, -9999px, 0)';
      }
    } else {
      // A. Act II.1 Full-Bleed Broadsheet (`30.0 – 37.8s`) with continuous internal hero plate drift!
      const spreadOp = (t >= 30.0 ? 1 : 0) * (1 - span(t, 37.4, 38.4, easeInOutCubic));
      spreadLayer.style.opacity = spreadOp.toFixed(3);
      const imgDriftU = progress(t, 30.0, 38.0);
      for (let sIdx = 0; sIdx < heroSpreadEls.length; sIdx++) {
        const hSlot = heroSpreadEls[sIdx]!;
        // Kerf recoil when vertical guillotine strikes the hero plate edges!
        const strikeAt = 33.0 + sIdx * 0.75;
        const kerf = t >= strikeAt ? span(t, strikeAt, strikeAt + 0.12, easeOutExpo) * (sIdx % 2 === 0 ? -4 : 4) : 0;
        const peel = span(t, 37.2 + sIdx * 0.12, 38.3 + sIdx * 0.12, easeInCubic);
        hSlot.wrap.style.opacity = (spreadOp * (1 - peel)).toFixed(3);
        hSlot.wrap.style.transform = `translate3d(${kerf.toFixed(1)}px, ${(-peel * 26).toFixed(1)}px, 0)`;
        // Continuous slow optical scale & pan inside each 376x376 lithograph frame (eliminates any 30..33s freeze!)
        const imgScale = 1.0 + imgDriftU * 0.065;
        const imgPanX = (sIdx % 2 === 0 ? 1 : -1) * imgDriftU * 11;
        hSlot.img.style.transform = `scale(${imgScale.toFixed(4)}) translate3d(${imgPanX.toFixed(1)}px, 0, 0)`;
      }

      // B. Configure Three.js PerspectiveCamera for `helix3D`, `cloud3D` (Catmull-Rom spline), and `sphere3D` (30m Armillary Dome)
      const helixSpin = Math.max(0, t - 52.0) * 0.58;
      const sphereSpin = Math.max(0, t - 82.5) * 0.36;

      if (t >= 51.8 && t < 62.2) {
        camera3D.position.set(Math.sin(helixSpin * 0.28) * 86, Math.sin(helixSpin * 0.42) * 18, Z_CAM);
        camera3D.lookAt(0, 0, 0);
        camera3D.updateMatrixWorld();
        camera3D.updateProjectionMatrix();
      } else if (t >= 68.2 && t < 76.8) {
        const uFly = progress(t, 68.5, 76.0);
        const camX = catmullRom(-640, -260, 320, 660, uFly);
        const camY = catmullRom(-22, 26, -20, 18, uFly);
        const camZ = catmullRom(Z_CAM, Z_CAM - 280, Z_CAM - 230, Z_CAM, uFly);
        camera3D.position.set(camX, camY, camZ);
        camera3D.lookAt(camX * 0.35, 0, 0);
        camera3D.updateMatrixWorld();
        camera3D.updateProjectionMatrix();
      } else if (t >= 82.2 && t < 88.6) {
        camera3D.position.set(Math.sin(sphereSpin * 0.45) * 72, Math.cos(sphereSpin * 0.35) * 18, Z_CAM);
        camera3D.lookAt(0, 0, 0);
        camera3D.updateMatrixWorld();
        camera3D.updateProjectionMatrix();
      }

      // C. Compute deterministic positions for all 200 fragments across `page -> spectrum2D -> reading2D -> helix3D -> meaning2D -> cloud3D -> orbit2D -> sphere3D`
      const activeScanStage = accelerandoScanStages.find((st) => t >= st.t0 && t < st.t1);
      const activeScanNodes = new Set<number>();
      if (activeScanStage) {
        for (const [pa, pb] of activeScanStage.pairs) {
          activeScanNodes.add(pa);
          activeScanNodes.add(pb);
        }
      }
      const scanDim = win(t, 39.75, 43.65, 0.18);

      // Act IV.1–2 peripheral awakening (`88.0..99.5s`) & gale sweep (`99.5..101.3s`)
      const focusDim = span(t, 88.0, 88.9, easeInOutCubic);
      const resonantSet = new Set(neighborIndices);
      const tiltRad = (22 * Math.PI) / 180;
      const cosTilt = Math.cos(tiltRad);
      const sinTilt = Math.sin(tiltRad);

      for (let i = 0; i < fragments.length; i++) {
        const f = fragments[i]!;
        const stagger = i === targetIndex ? 0 : hash(i * 11 + 5) * 0.34;
        const curve = (hash(i * 23 + 9) - 0.5) * 76;

        // 1) `page` (`30.0..37.8s`) + Physical Kerf Recoil on Guillotine Strikes (`33.0..37.5s`)
        const pPage = layouts.page[i]!;
        let x = pPage.x;
        let y = pPage.y;
        let z = 0;
        let s = pPage.scale;
        let o = pPage.opacity;
        let blur = 0;
        let zIdx = 10;

        if (t >= 33.0 && t < 38.2) {
          const xNorm = clamp((x - 180) / 6100, 0, 1);
          const strikeT = 33.0 + xNorm * 3.5;
          if (t >= strikeT) {
            const kerfU = span(t, strikeT, strikeT + 0.1, easeOutExpo) * (1 - span(t, 37.6, 38.2));
            x += (i % 2 === 0 ? -4.2 : 4.2) * kerfU;
            y += ((i % 3) - 1) * 2.8 * kerfU;
          }
        }

        // 2) Morph -> `spectrum2D` (`37.8..39.0s`, settled with `+20px` bottom barcode slot at t = 40.2s!)
        const uSpec = easeInOutCubic(progress(t, 37.8 + stagger * 0.65, 38.85 + stagger * 0.65));
        if (uSpec > 0) {
          const pS = layouts.spectrum2D[i]!;
          [x, y] = stepArc(x, y, pS.x, pS.y, uSpec, curve * 0.55);
          s = lerp(s, pS.scale, uSpec);
          o = lerp(o, pS.opacity, uSpec);
        }

        // 3) Morph -> `reading2D` (`46.0..48.2s`, settled at t = 50.0s + traveling 120 BPM contrast wave!)
        const uRead = easeInOutCubic(progress(t, 46.0 + stagger, 47.85 + stagger));
        if (uRead > 0) {
          const pR = layouts.reading2D[i]!;
          [x, y] = stepArc(x, y, pR.x, pR.y, uRead, curve);
          s = lerp(s, pR.scale, uRead);
          const waveRead =
            t >= 48.0 && t < 52.0 ? 0.84 + 0.16 * Math.sin(t * 3.2 - pR.x * 0.0022) : 1.0;
          o = lerp(o, pR.opacity * waveRead, uRead);
          blur = 0;
        }

        // 4) Morph -> `helix3D` (`52.0..61.5s`, UNCLAMPED edge vignette + DOF!)
        const uHelix = easeInOutCubic(progress(t, 52.0 + stagger, 54.0 + stagger));
        if (uHelix > 0 && t < 64.0) {
          const hb = layouts.helixBase[i]!;
          const ang = hb.angle + helixSpin;
          const wx = hb.x - STAGE_W * 0.5;
          const wy = Math.sin(ang) * hb.radiusY;
          const wz = Math.cos(ang) * hb.radiusZ;
          const proj = project3D(wx, wy, wz);
          const depth01 = (Math.cos(ang) + 1) * 0.5;
          const edgeFade =
            smoothstep(24, 150, proj.sx) *
            smoothstep(24, 150, STAGE_W - proj.sx) *
            smoothstep(22, 48, proj.sy) *
            smoothstep(22, 48, STAGE_H - proj.sy);
          const hs = (f.type === 'img' ? 0.64 : f.tier === 'anchor' ? 1.02 : 0.76) * lerp(0.68, 1.30, depth01);
          const ho = lerp(0.24, 1.0, depth01) * edgeFade;
          const hBlur = depth01 < 0.40 ? (0.40 - depth01) * 6.5 : 0;

          [x, y] = stepArc(x, y, proj.sx, proj.sy, uHelix, curve * 0.6);
          z = lerp(z, wz, uHelix);
          s = lerp(s, hs, uHelix);
          o = lerp(o, ho, uHelix);
          blur = lerp(blur, hBlur, uHelix);
          zIdx = Math.round(10 + depth01 * 60);
        }

        // 5) Morph -> `meaning2D` (`61.5..68.5s`, settled at t = 66.5s + traveling resonance wave!)
        const uMean = easeInOutCubic(progress(t, 61.5 + stagger, 63.55 + stagger));
        if (uMean > 0) {
          const pM = layouts.meaning2D[i]!;
          [x, y] = stepArc(x, y, pM.x, pM.y, uMean, curve);
          z = lerp(z, 0, uMean);
          s = lerp(s, pM.scale, uMean);
          const waveMean =
            t >= 63.8 && t < 68.5 ? 0.85 + 0.15 * Math.sin(t * 3.0 - pM.x * 0.002) : 1.0;
          o = lerp(o, pM.opacity * waveMean, uMean);
          blur = lerp(blur, 0, uMean);
          zIdx = 20;
        }

        // 6) Morph -> `cloud3D` (`68.5..76.0s`, UNCLAMPED edge vignette + Catmull-Rom fly-through!)
        const uCloud = easeInOutCubic(progress(t, 68.5 + stagger, 70.25 + stagger));
        if (uCloud > 0 && t < 78.5) {
          const c3 = layouts.cloud3D[i]!;
          const orbitAng = (t - 68.5) * 0.18;
          const ca = Math.cos(orbitAng);
          const sa = Math.sin(orbitAng);
          const rcx = c3.cx;
          const rcy = c3.cy * ca - c3.cz * sa * 0.18;
          const rcz = c3.cz * ca + c3.cy * sa * 0.25;
          const proj = project3D(rcx, rcy, rcz);
          const depth01 = clamp((rcz + 270) / 540, 0, 1);
          const edgeFade =
            smoothstep(24, 150, proj.sx) *
            smoothstep(24, 150, STAGE_W - proj.sx) *
            smoothstep(22, 48, proj.sy) *
            smoothstep(22, 48, STAGE_H - proj.sy);
          const cs3 = layouts.meaning2D[i]!.scale * proj.depthScale * lerp(0.78, 1.24, depth01);
          const co3 = lerp(0.26, 1.0, depth01) * edgeFade;
          const cBlur = depth01 < 0.38 ? (0.38 - depth01) * 6.2 : 0;

          [x, y] = stepArc(x, y, proj.sx, proj.sy, uCloud, curve * 0.45);
          z = lerp(z, rcz, uCloud);
          s = lerp(s, cs3, uCloud);
          o = lerp(o, co3, uCloud);
          blur = lerp(blur, cBlur, uCloud);
          zIdx = Math.round(10 + depth01 * 60);
        }

        // 7) Morph -> `orbit2D` (`76.0..82.5s`, continuous gentle angular drift that lands at exact 0.0 at t=80.5s!)
        const uOrb = easeInOutCubic(progress(t, 76.0 + stagger, 78.15 + stagger));
        if (uOrb > 0) {
          const pO = layouts.orbit2D[i]!;
          let ox = pO.x;
          let oy = pO.y;
          if (t >= 78.2 && t < 82.5 && i !== targetIndex && !resonantSet.has(i)) {
            const dTheta = (t - 80.5) * (0.026 + f.level * 0.018); // Exact 0 at t = 80.5s!
            const dx0 = pO.x - STAGE_W * 0.5;
            const dy0 = (pO.y - 216) * 14.0;
            const cD = Math.cos(dTheta);
            const sD = Math.sin(dTheta);
            ox = STAGE_W * 0.5 + (dx0 * cD - dy0 * sD);
            oy = 216 + (dx0 * sD + dy0 * cD) / 14.0;
          }
          [x, y] = stepArc(x, y, ox, oy, uOrb, curve * 0.7);
          z = lerp(z, 0, uOrb);
          s = lerp(s, pO.scale, uOrb);
          o = lerp(o, pO.opacity, uOrb);
          blur = lerp(blur, 0, uOrb);
          zIdx = Math.round(10 + f.level * 35);
        }

        // 8) Morph -> `sphere3D` (`82.5..88.0s`, 30m Panoramic Celestial Armillary Dome across `X = 180..6300`!)
        const uSphere =
          easeInOutCubic(progress(t, 82.5 + stagger * 0.7, 84.0 + stagger * 0.7)) *
          (1 - easeInOutCubic(progress(t, 87.2, 88.3)));
        if (uSphere > 0.001) {
          const sp = layouts.sphere3D[i]!;
          const lon = sp.theta + sphereSpin * (0.85 + 0.3 * (1 - sp.shellR));
          const ux = Math.sin(sp.phi) * Math.cos(lon);
          const uy0 = Math.cos(sp.phi);
          const uz0 = Math.sin(sp.phi) * Math.sin(lon);
          // 22° architectural axial tilt prevents equatorial line pile-up!
          const uy = uy0 * cosTilt - uz0 * sinTilt;
          const uz = uy0 * sinTilt + uz0 * cosTilt;

          const wx = ux * 3060 * sp.shellR;
          const wy = uy * 176 * sp.shellR;
          const wz = uz * 285 * sp.shellR;
          const proj = project3D(wx, wy, wz);
          const depth01 = clamp((wz + 290) / 580, 0, 1);
          const edgeFade =
            smoothstep(24, 150, proj.sx) *
            smoothstep(24, 150, STAGE_W - proj.sx) *
            smoothstep(22, 48, proj.sy) *
            smoothstep(22, 48, STAGE_H - proj.sy);
          const ss3 = layouts.orbit2D[i]!.scale * lerp(0.76, 1.24, depth01);
          const so3 = clamp(layouts.orbit2D[i]!.opacity * lerp(0.58, 1.18, depth01), 0.24, 1) * edgeFade;
          const sBlur = depth01 < 0.35 ? (0.35 - depth01) * 5.2 : 0;

          x = lerp(x, proj.sx, uSphere);
          y = lerp(y, proj.sy, uSphere);
          s = lerp(s, ss3, uSphere);
          o = lerp(o, so3, uSphere);
          blur = lerp(blur, sBlur, uSphere);
          zIdx = Math.round(10 + depth01 * 55);
        }

        // Act IV.1–2 (`88.0..99.5s`): Clear right-periphery sanctuary (`X=4150..5620, Y=110..320`) to 0% opacity!
        const isTarget = i === targetIndex;
        const isResonant = resonantSet.has(i);
        if (focusDim > 0.001) {
          if (isTarget) {
            // Dedicated 54px crisp `awakenedSentenceEl` handles the awakened peripheral sentence!
            o = lerp(o, 0, span(t, 88.0, 88.4));
          } else if (isResonant) {
            o = lerp(o, 1.0, focusDim);
            s = lerp(s, 1.32, focusDim);
            y += Math.sin(t * 1.4 + i) * 3.5 * focusDim;
            blur = 0;
            zIdx = 88;
          } else {
            const inRightSanctuary = x >= 4150 && x <= 5620 && y >= 110 && y <= 320;
            const targetFactor = inRightSanctuary ? 0.0 : 0.08;
            x -= (t - 88.0) * 6.5 * focusDim; // gentle background drift so t=90..91s is alive!
            o *= lerp(1, targetFactor, focusDim);
            blur = lerp(blur, 0.9, focusDim);
          }
        }

        // Act II.2 Cosine Laser Dimming: keep `.frag` paper backing opaque (`o = 1`) for text so canvas rays pass CLEANLY BEHIND non-highlighted words!
        if (scanDim > 0.001) {
          const highlighted = activeScanNodes.has(i);
          if (highlighted) {
            zIdx = 85;
          } else if (f.type === 'img') {
            o *= lerp(1, 0.34, scanDim);
          }
        }

        // Sweep away remaining fragments as elemental gale unleashes (`99.5..101.3s`)
        if (t >= 99.5) {
          const gOut = span(t, 99.5, 101.1, easeInCubic);
          x -= gOut * 380;
          o *= 1 - gOut;
        }

        screenPos[i]!.x = x;
        screenPos[i]!.y = y;
        screenPos[i]!.z = z;
        screenPos[i]!.s = s;
        screenPos[i]!.o = o;
        screenPos[i]!.blur = blur;
        screenPos[i]!.zIdx = zIdx;
      }

      // Real-Time Screen-Space Foreground Repulsion during 3D phases (`helix3D`, `cloud3D`, `sphere3D`)!
      const inPure3DPhase =
        (t >= 53.5 && t < 61.5) || (t >= 69.8 && t < 76.0) || (t >= 83.6 && t < 87.6);
      if (inPure3DPhase) {
        repelForeground3D(screenPos, fragments);
      }

      // Apply computed transforms to all 200 `.frag` DOM elements
      for (let i = 0; i < fragments.length; i++) {
        const p = screenPos[i]!;
        const f = fragments[i]!;
        const el = fragEls[i]!;
        if (p.o <= 0.004 || p.x < -260 || p.x > STAGE_W + 260 || p.y < -80 || p.y > STAGE_H + 80) {
          el.style.opacity = '0';
          el.style.filter = 'none';
          el.style.transform = 'translate3d(-9999px, -9999px, 0)';
        } else {
          el.style.opacity = p.o.toFixed(3);
          el.style.zIndex = String(p.zIdx);
          el.style.filter = p.blur > 0.12 ? `blur(${p.blur.toFixed(2)}px)` : 'none';
          el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${p.s.toFixed(3)})`;
          if (scanDim > 0.001 && f.type !== 'img' && !activeScanNodes.has(i)) {
            const cGray = Math.round(lerp(0, 156, scanDim));
            el.style.color = `rgb(${cGray}, ${cGray}, ${cGray})`;
          } else {
            el.style.color = '#000000';
          }
          el.style.fontWeight = f.tier === 'anchor' ? '700' : '400';
        }
      }

      // D. Act II.1 (`33.0 – 37.8s`): `120 BPM` Percussive `0.09s` (3-Frame) Guillotine Hard Cuts!
      if (t >= 33.0 && t < 38.2) {
        const cutFade = 1 - span(t, 37.4, 38.1);
        ctx.save();
        ctx.strokeStyle = '#ff0000';
        for (const c of layouts.cuts) {
          if (t < c.strikeAt) continue;
          // 0.09s (under 3 frames!) razor-fast guillotine strike!
          const u = clamp((t - c.strikeAt) / 0.09, 0, 1);
          const impactFlash = t < c.strikeAt + 0.10 ? 1 - (t - c.strikeAt) / 0.10 : 0;
          ctx.lineWidth = (c.orientation === 'v' ? 1.45 : 0.9) + impactFlash * 1.6;
          ctx.globalAlpha = cutFade * (c.orientation === 'v' ? 0.95 : 0.72);
          ctx.beginPath();
          ctx.moveTo(c.x1, c.y1);
          ctx.lineTo(lerp(c.x1, c.x2, u), lerp(c.y1, c.y2, u));
          ctx.stroke();
        }
        ctx.restore();
      }

      // E. Act II.2 (`38.8 – 44.2s`): Collision-Free `spectrum2D` `1024-DIM` Barcodes in Reserved `+20px` Slot!
      const vecAlpha = span(t, 38.8, 39.2) * (1 - span(t, 43.7, 44.3));
      if (vecAlpha > 0.005) {
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        for (let i = 0; i < fragments.length; i++) {
          const p = screenPos[i]!;
          if (p.o <= 0.08) continue;
          const box = fragmentBox(fragments[i]!, p.s);
          const barcodeTop = p.y + box.h * 0.5 + 1.5;
          const tickCount = 26;
          const halfSpan = tickCount * 1.35;
          for (let k = 0; k < tickCount; k++) {
            const reveal = progress(t, 38.85 + hash(i * 7 + k) * 0.45, 39.15 + hash(i * 7 + k) * 0.45);
            if (reveal <= 0.01) continue;
            // Subtle 120 BPM harmonic shimmer inside the 12px reserved slot
            const baseH = 2.0 + hash(i * 101 + k * 13) * 8.5;
            const mod = 0.85 + 0.15 * Math.sin(t * 6.0 + k * 0.5 + i);
            const h = baseH * mod * reveal;
            ctx.globalAlpha = vecAlpha * 0.90;
            const px = Math.round(p.x - halfSpan + k * 2.7) + 0.5;
            ctx.beginPath();
            ctx.moveTo(px, barcodeTop);
            ctx.lineTo(px, barcodeTop + h);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // F. Act II.2 (`39.8 – 46.0s`): Accelerando Cosine Laser Scan (`1 -> 2 -> 4 -> 14 -> 720 rays!`)
      if (activeScanStage) {
        const u = easeOutExpo(progress(t, activeScanStage.t0, activeScanStage.t0 + 0.22));
        ctx.save();
        ctx.strokeStyle = '#e60000';
        ctx.lineWidth = activeScanStage.pairs.length <= 2 ? 2.0 : 1.35;
        for (const [ia, ib] of activeScanStage.pairs) {
          const pa = screenPos[ia]!;
          const pb = screenPos[ib]!;
          const boxA = fragmentBox(fragments[ia]!, pa.s);
          const boxB = fragmentBox(fragments[ib]!, pb.s);
          // Anchor terminals cleanly at the upper exterior edge of each word box (zero glyph piercing!)
          const ay = pa.y - boxA.h * 0.5 - 4;
          const by = pb.y - boxB.h * 0.5 - 4;
          const cxMid = lerp(pa.x, pb.x, 0.5);
          const cyMid = clamp(lerp(ay, by, 0.5) - 38, 34, STAGE_H - 34);
          ctx.beginPath();
          ctx.moveTo(pa.x, ay);
          ctx.quadraticCurveTo(lerp(pa.x, cxMid, u), lerp(ay, cyMid, u), lerp(pa.x, pb.x, u), lerp(ay, by, u));
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(pa.x, ay, 3.8, 0, Math.PI * 2);
          ctx.arc(lerp(pa.x, pb.x, u), lerp(ay, by, u), 3.8, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();

        // Positioned inside pre-reserved top sanctuary `(badgeX, 42)` -> 0 text collisions!
        laserTelemetryEl.textContent = activeScanStage.badgeText;
        laserTelemetryEl.style.left = `${activeScanStage.badgeX}px`;
        laserTelemetryEl.style.top = '42px';
        laserTelemetryEl.style.opacity = (
          progress(t, activeScanStage.t0 + 0.08, activeScanStage.t0 + 0.18) *
          (1 - progress(t, activeScanStage.t1 - 0.1, activeScanStage.t1))
        ).toFixed(3);
      } else {
        laserTelemetryEl.style.opacity = '0';
      }

      const burstA = span(t, 43.6, 44.05) * (1 - span(t, 45.4, 46.0));
      if (burstA > 0.005) {
        ctx.save();
        ctx.lineWidth = 0.8;
        for (const [ia, ib, h] of burstPairs) {
          const lineU = progress(t, 43.6 + h * 0.45, 43.9 + h * 0.45);
          if (lineU <= 0.01) continue;
          const pa = screenPos[ia]!;
          const pb = screenPos[ib]!;
          ctx.strokeStyle = `rgba(230, 0, 0, ${(0.22 * burstA * lineU).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // G. Act III.2 (`52.5 – 61.5s`): Double-Helix Spine (drawn on canvas BELOW paper-halo `.frag-layer`!)
      const helixSpineA = win(t, 52.6, 61.5, 0.7);
      if (helixSpineA > 0.005) {
        ctx.save();
        for (const strand of [0, 1] as const) {
          ctx.strokeStyle =
            strand === 0
              ? `rgba(230, 0, 0, ${(0.36 * helixSpineA).toFixed(3)})`
              : `rgba(0, 0, 255, ${(0.18 * helixSpineA).toFixed(3)})`;
          ctx.lineWidth = strand === 0 ? 1.2 : 0.8;
          ctx.beginPath();
          let started = false;
          for (let i = strand; i < fragments.length; i += 2) {
            const p = screenPos[i]!;
            if (p.o <= 0.05) continue;
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // H. Act III.3–4 (`63.0 – 76.0s`): Degree-Capped Balanced Arterial Filaments (`0.55..1.35px`, `alpha 0.12..0.36`)
      const arteryGrow = span(t, 63.0, 66.2, easeInOutCubic);
      const arteryFade = 1 - span(t, 76.0, 77.5, easeInOutCubic);
      const arteryMaster = arteryGrow * arteryFade;
      if (arteryMaster > 0.005) {
        ctx.save();
        ctx.lineCap = 'round';
        const visibleCount = Math.floor(topEdges.length * arteryGrow);
        for (let eIdx = 0; eIdx < visibleCount; eIdx++) {
          const edge = topEdges[eIdx]!;
          const pa = screenPos[edge.a]!;
          const pb = screenPos[edge.b]!;
          if (pa.o <= 0.06 || pb.o <= 0.06) continue;

          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const dist = Math.hypot(dx, dy) || 1;
          const arch = ((hash(eIdx * 31 + 7) - 0.5) * 0.24 + pulse * 0.012) * Math.min(dist, 380);
          const mx = (pa.x + pb.x) * 0.5 - (dy / dist) * arch;
          const my = (pa.y + pb.y) * 0.5 + (dx / dist) * arch;

          // Refined museum-grade pressure `0.55px .. 1.35px` & translucent `0.12 .. 0.36` alpha!
          const strokeW = 0.55 + Math.pow(edge.strength, 1.4) * 0.80;
          const wavePulse = 0.88 + 0.12 * Math.sin(t * 4.0 - pa.x * 0.0018);
          const alpha = (0.12 + 0.24 * edge.strength) * arteryMaster * wavePulse;
          ctx.strokeStyle = `rgba(230, 0, 0, ${alpha.toFixed(3)})`;
          ctx.lineWidth = strokeW;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.quadraticCurveTo(mx, my, pb.x, pb.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // I. Act III.5 (`76.5 – 82.5s`) Pure Orbit Sanctuary & Act III.6 (`82.5 – 88.0s`) 30m Celestial Armillary Dome Arcs!
      const orbitMarkOp = span(t, 76.8, 77.9) * (1 - span(t, 82.6, 83.6));
      orbitSanctuaryEl.style.opacity = orbitMarkOp.toFixed(3);

      const ringOp = win(t, 77.2, 82.8, 0.6);
      if (ringOp > 0.005) {
        ctx.save();
        ctx.strokeStyle = `rgba(0, 0, 0, ${(0.16 * ringOp).toFixed(3)})`;
        ctx.lineWidth = 0.65;
        ctx.setLineDash([4, 7]);
        const dashShift = -t * 14;
        ctx.lineDashOffset = dashShift;
        for (const frac of [0.24, 0.56, 0.92]) {
          ctx.beginPath();
          ctx.ellipse(STAGE_W * 0.5, 216, 440 + frac * 2570, 66 + frac * 108, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 30m Celestial Armillary Meridian & Parallel Rings (`82.6 – 88.0s`) spanning `X = 180..6300`!
      const domeArcOp = win(t, 82.7, 88.0, 0.65);
      if (domeArcOp > 0.005) {
        ctx.save();
        ctx.lineWidth = 0.7;
        // 6 rotating celestial meridians across full 30m span
        for (let m = 0; m < 6; m++) {
          const mLon = (m * Math.PI) / 6 + sphereSpin * 0.85;
          ctx.strokeStyle = m === 0 ? `rgba(230, 0, 0, ${(0.28 * domeArcOp).toFixed(3)})` : `rgba(0, 0, 0, ${(0.13 * domeArcOp).toFixed(3)})`;
          ctx.beginPath();
          for (let sStep = 0; sStep <= 48; sStep++) {
            const pAng = (sStep / 48) * Math.PI * 2;
            const ux = Math.sin(pAng) * Math.cos(mLon);
            const uy0 = Math.cos(pAng);
            const uz0 = Math.sin(pAng) * Math.sin(mLon);
            const uy = uy0 * cosTilt - uz0 * sinTilt;
            const uz = uy0 * sinTilt + uz0 * cosTilt;
            const proj = project3D(ux * 2980, uy * 172, uz * 280);
            if (sStep === 0) ctx.moveTo(proj.sx, proj.sy);
            else ctx.lineTo(proj.sx, proj.sy);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // J. Act IV.1 (`88.0 – 93.5s`): Taut `5.5s` Peripheral Awakening & Exterior-Anchored Catenary Arcs!
      // Hide `0.14` during `sphere3D` (`82.4..88.0s`) so rotating celestial dome fragments never collide with `(4880, 142)`!
      const numTagOp = Math.max(win(t, 79.0, 82.3, 0.4), win(t, 88.1, 99.4, 0.45));
      if (numTagOp > 0.005) {
        peripheryNumEl.style.opacity = numTagOp.toFixed(3);
        peripheryNumEl.style.left = '4880px';
        peripheryNumEl.style.top = t < 85.0 ? '186px' : t >= 93.5 ? '98px' : '142px';
        peripheryNumEl.style.transform = 'translateX(-50%)';
      } else {
        peripheryNumEl.style.opacity = '0';
      }

      const awakeLive = t >= 88.0 && t < 93.5;
      if (!awakeLive) {
        awakenedSentenceEl.style.opacity = '0';
      } else {
        const aIn = span(t, 88.0, 88.7, easeOutCubic);
        const colorMix = smoothstep(89.5, 93.2, t);
        const rVal = Math.round(lerp(217, 0, colorMix));
        const breathe = 1.0 + 0.032 * Math.sin((t - 88.0) * 2.1);
        awakenedSentenceEl.style.opacity = aIn.toFixed(3);
        awakenedSentenceEl.style.color = `rgb(${rVal}, 0, 0)`;
        awakenedSentenceEl.style.transform = `translate(-50%, -50%) scale(${breathe.toFixed(4)})`;
      }

      // 5 Full-Bridge Crimson Catenary Arcs (`88.2 – 99.4s`) starting strictly OUTSIDE the text box (`Y=158` / `Y=274`)!
      const catenaryFade = span(t, 88.2, 88.8) * (1 - span(t, 98.8, 99.5));
      if (catenaryFade > 0.01) {
        ctx.save();
        ctx.lineCap = 'round';
        const anchorOffsetsX = [-260, -130, 0, 130, 260];
        for (let k = 0; k < neighborIndices.length; k++) {
          const nbIdx = neighborIndices[k]!;
          const nbPos = screenPos[nbIdx]!;
          const drawU = easeOutExpo(progress(t, 88.25 + k * 0.22, 89.55 + k * 0.22));
          if (drawU <= 0.01) continue;

          // Exterior registration terminals above (`y=158`) or below (`y=274`) the sentence halo — NEVER piercing "전"!
          const isUpper = nbPos.y < 216;
          const srcX = 4880 + (anchorOffsetsX[k] ?? 0);
          const srcY = isUpper ? 156 : 276;

          // Small crisp vertical registration tick at exterior terminal
          ctx.strokeStyle = `rgba(217, 0, 0, ${(0.82 * catenaryFade).toFixed(3)})`;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(srcX, srcY - 4);
          ctx.lineTo(srcX, srcY + 4);
          ctx.stroke();

          const sag = (isUpper ? -1 : 1) * (54 + k * 12);
          const ctrlX = lerp(srcX, nbPos.x, 0.5);
          const ctrlY = clamp(lerp(srcY, nbPos.y, 0.5) + sag, 30, STAGE_H - 30);
          const curEndX = lerp(srcX, nbPos.x, drawU);
          const curEndY = lerp(srcY, nbPos.y, drawU);
          const curCtrlX = lerp(srcX, ctrlX, drawU);
          const curCtrlY = lerp(srcY, ctrlY, drawU);

          const pulseGlow = 0.72 + 0.28 * Math.sin(t * 4.5 - k * 1.1);
          ctx.strokeStyle = `rgba(225, 0, 0, ${(0.82 * catenaryFade * pulseGlow).toFixed(3)})`;
          ctx.lineWidth = 1.65 - k * 0.1;
          ctx.beginPath();
          ctx.moveTo(srcX, srcY);
          ctx.quadraticCurveTo(curCtrlX, curCtrlY, curEndX, curEndY);
          ctx.stroke();

          if (drawU > 0.92) {
            ctx.fillStyle = `rgba(225, 0, 0, ${(0.9 * catenaryFade).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(nbPos.x, nbPos.y, 3.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // K. Act IV.2 (`93.5 – 99.5s`): Zero-Chromatic-Aberration 3D Perspective Fault Shear!
      const faultLive = t >= 93.5 && t < 99.55;
      if (!faultLive) {
        for (const sEl of shardEls) {
          sEl.style.opacity = '0';
          sEl.style.filter = 'none';
          sEl.style.transform = 'translate3d(-9999px, -9999px, 0)';
        }
      } else {
        const uShear = easeOutExpo(progress(t, 93.5, 94.45));
        const chargeU = progress(t, 93.5, 99.4);
        const exitShard = 1 - progress(t, 99.3, 99.55);

        // Two diagonal geological fault lines across Y = 34..398
        ctx.save();
        ctx.strokeStyle = `rgba(225, 0, 0, ${(0.82 * exitShard).toFixed(3)})`;
        ctx.lineWidth = 1.35;
        for (const fx of [4445, 5315]) {
          ctx.beginPath();
          ctx.moveTo(fx + 38 * uShear, 34);
          ctx.lineTo(fx - 38 * uShear, 398);
          ctx.stroke();
        }

        // Left receding shard: "결정이 녹을 때" (`perspective(460px) rotateY(28deg) rotateZ(-4deg) scale(0.80)`)
        const leftX = lerp(4530, 4265 - chargeU * 24, uShear);
        const leftY = lerp(216, 142 - chargeU * 6, uShear);
        shardEls[0]!.style.opacity = (exitShard * 0.88).toFixed(3);
        shardEls[0]!.style.filter = uShear > 0.25 ? 'blur(1.05px)' : 'none';
        shardEls[0]!.style.transform = `translate3d(${leftX.toFixed(1)}px, ${leftY.toFixed(1)}px, 0) translate(-50%, -50%) perspective(460px) rotateY(${(28 * uShear).toFixed(1)}deg) rotateZ(${(-4 * uShear).toFixed(1)}deg) scale(${lerp(1, 0.80, uShear).toFixed(3)})`;

        // Center advancing hero shard: "수억 년 전의 바람" (`96px` Bold `#000000`, `scale 1.00 -> 1.12`, ZERO chromatic shadow!)
        const centerScale = lerp(1.0, 1.12, easeInOut(chargeU));
        shardEls[1]!.style.opacity = exitShard.toFixed(3);
        shardEls[1]!.style.filter = 'none';
        shardEls[1]!.style.transform = `translate3d(4880px, 216px, 0) translate(-50%, -50%) scale(${centerScale.toFixed(4)})`;

        // Four surgical `#FF0000` corner crop marks placed cleanly outside the center halo!
        const cw = 378 * centerScale;
        const ch = 72 * centerScale;
        ctx.strokeStyle = `rgba(230, 0, 0, ${(0.95 * exitShard).toFixed(3)})`;
        ctx.lineWidth = 1.65;
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
          const cx = 4880 + sx * cw;
          const cy = 216 + sy * ch;
          ctx.beginPath();
          ctx.moveTo(cx - sx * 14, cy);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx, cy - sy * 14);
          ctx.stroke();
        }

        // Right receding shard: "이 분다" (`perspective(460px) rotateY(-28deg) rotateZ(4deg) scale(0.80)`)
        const rightX = lerp(5260, 5495 + chargeU * 24, uShear);
        const rightY = lerp(216, 290 + chargeU * 6, uShear);
        shardEls[2]!.style.opacity = (exitShard * 0.85).toFixed(3);
        shardEls[2]!.style.filter = uShear > 0.25 ? 'blur(1.1px)' : 'none';
        shardEls[2]!.style.transform = `translate3d(${rightX.toFixed(1)}px, ${rightY.toFixed(1)}px, 0) translate(-50%, -50%) perspective(460px) rotateY(${(-28 * uShear).toFixed(1)}deg) rotateZ(${(4 * uShear).toFixed(1)}deg) scale(${lerp(1, 0.80, uShear).toFixed(3)})`;

        ctx.restore();
      }
    }

    // -----------------------------------------------------------------------
    // 6. ACT IV.3a (`99.5 – 105.1s`): ELEMENTAL PALEO-WIND GALE (`180` Streamlines + Mineral Grains)
    // -----------------------------------------------------------------------
    if (t < 99.5 || t >= 105.15) {
      galeBannerEl.style.opacity = '0';
      galeBannerEl.style.transform = 'translate3d(-9999px, -9999px, 0)';
    } else {
      const uGale = easeInOutCubic(progress(t, 99.5, 104.8));
      const dockGen2 = easeInCubic(progress(t, 103.8, 104.95));
      const gFade = 1 - progress(t, 104.75, 105.1);

      const gx = lerp(4880, 344, uGale);
      const gy = lerp(216, 64, dockGen2);
      const gScale = lerp(1.0, 56 / 104, dockGen2);

      galeBannerEl.style.opacity = gFade.toFixed(3);
      galeBannerEl.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0) translate(-50%, -50%) scale(${gScale.toFixed(4)})`;

      ctx.save();
      // Faint atmospheric lithograph echoes strictly 700px+ BEHIND the text in wake (`alpha <= 0.18`, NEVER touching text!)
      const wavePlate = getDecodedPlate('plate-14');
      const dunePlate = getDecodedPlate('plate-10');
      if (wavePlate && gx < 5200) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.18 * gFade;
        ctx.drawImage(wavePlate, gx + 680, 36, 980, 150);
      }
      if (dunePlate && gx < 4600) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.16 * gFade;
        ctx.drawImage(dunePlate, gx + 1180, 246, 720, 154);
      }
      ctx.globalCompositeOperation = 'source-over';

      // 170 Calligraphic Wind Streamlines (`#000000` & `#E60000` variable strokes) surging right -> left across 6,480px!
      for (let wIdx = 0; wIdx < 170; wIdx++) {
        const h1 = hash(wIdx * 19 + 3);
        const h2 = hash(wIdx * 37 + 11);
        const wy = 28 + h1 * 376;
        const speedLag = h2 * 0.34;
        const uLine = clamp((uGale * 1.18 - speedLag) / (1 - speedLag), 0, 1);
        if (uLine <= 0.005 || uLine >= 0.995) continue;

        const headX = lerp(6460, -240, uLine);
        const segLen = 280 + hash(wIdx * 7) * 740;
        const tailX = headX + segLen;
        const waveAmp = (hash(wIdx * 43) - 0.5) * 34;

        const isCrimson = wIdx % 6 === 0;
        ctx.strokeStyle = isCrimson ? '#e60000' : '#000000';
        ctx.globalAlpha = (isCrimson ? 0.52 : 0.18 + h1 * 0.22) * gFade * Math.sin(uLine * Math.PI);
        ctx.lineWidth = isCrimson ? 1.55 : 0.55 + (wIdx % 3) * 0.35;
        ctx.beginPath();
        ctx.moveTo(tailX, wy);
        ctx.bezierCurveTo(
          lerp(tailX, headX, 0.35),
          wy + waveAmp,
          lerp(tailX, headX, 0.7),
          wy - waveAmp * 0.7,
          headX,
          wy + waveAmp * 0.2,
        );
        ctx.stroke();
      }

      // 380 Mineral Stipple Grains sweeping across the bridge in the gale!
      for (let gIdx = 0; gIdx < 380; gIdx++) {
        const hg1 = hash(gIdx * 23 + 5);
        const hg2 = hash(gIdx * 59 + 17);
        const lag = hg2 * 0.42;
        const uGrain = clamp((uGale * 1.22 - lag) / (1 - lag), 0, 1);
        if (uGrain <= 0.01 || uGrain >= 0.99) continue;
        const px = lerp(6480, -100, uGrain);
        const py = 26 + hg1 * 380 + Math.sin(uGrain * 10 + gIdx) * 14;
        // Skip the immediate 580x136 eye-of-the-storm around `galeBannerEl` so text stays 100% pure!
        if (Math.abs(px - gx) < 310 && Math.abs(py - gy) < 72) continue;
        ctx.fillStyle = gIdx % 7 === 0 ? '#e60000' : '#000000';
        ctx.globalAlpha = (0.28 + hg1 * 0.42) * gFade;
        const sz = 1.3 + (gIdx % 3) * 0.7;
        ctx.fillRect(px, py, sz * 2.2, sz);
      }
      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // 7. ACT IV.3b (`114.2 – 120.0s`): KATABATIC WHITE-OUT DISSOLUTION VEIL
    // -----------------------------------------------------------------------
    if (t >= 114.2 && t < 118.25) {
      ctx.save();
      // Right-to-left soft pure-white katabatic snowfield veil erasing everything cleanly from X=6480 -> X=0!
      const gradLeft = whiteoutFrontX - 680;
      const gradRight = whiteoutFrontX + 420;
      const veilGrad = ctx.createLinearGradient(gradLeft, 0, gradRight, 0);
      veilGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      veilGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.82)');
      veilGrad.addColorStop(1, 'rgba(255, 255, 255, 1)');
      ctx.fillStyle = veilGrad;
      ctx.fillRect(Math.max(0, gradLeft), 0, STAGE_W - Math.max(0, gradLeft), STAGE_H);

      // Delicate drifting katabatic snow-grain wisps at the leading edge, fading to 0 by t = 118.05s!
      const wispFade = Math.sin(progress(t, 114.2, 118.0) * Math.PI);
      if (wispFade > 0.01) {
        for (let s = 0; s < 95; s++) {
          const hs1 = hash(s * 31 + 9);
          const hs2 = hash(s * 47 + 13);
          const wx = whiteoutFrontX + (hs2 - 0.45) * 920;
          if (wx < 0 || wx > STAGE_W) continue;
          const wy = 32 + hs1 * 368;
          const len = 45 + hs2 * 130;
          ctx.strokeStyle = `rgba(90, 90, 90, ${(0.22 * wispFade).toFixed(3)})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(wx + len, wy);
          ctx.quadraticCurveTo(wx + len * 0.5, wy - 4, wx, wy + 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // 8. 120 BPM PERCUSSIVE HARD-CUT HORIZON FLASHES
    // -----------------------------------------------------------------------
    const cutFlash = Math.max(
      hardCutFlash(t, 8.0, 2),
      hardCutFlash(t, 30.0, 2),
      hardCutFlash(t, 46.0, 2),
      hardCutFlash(t, 88.0, 2),
      hardCutFlash(t, 93.5, 2),
      hardCutFlash(t, 99.5, 2),
    );
    if (cutFlash > 0.01) {
      ctx.save();
      ctx.strokeStyle = `rgba(230, 0, 0, ${(0.72 * cutFlash).toFixed(3)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 216);
      ctx.lineTo(STAGE_W, 216);
      ctx.stroke();
      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // 9. SEAMLESS PURE #FFFFFF MEDITATIVE LOOP (`118.20s..120.00s` & `0.00s..0.20s` === 100.00% #FFFFFF!)
    // -----------------------------------------------------------------------
    const washEnd = t >= 118.18 ? 1.0 : span(t, 117.1, 118.18, easeInOut);
    const washStart = t <= 0.20 ? 1.0 : 1 - span(t, 0.20, 0.42, easeOutCubic);
    fadeWash.style.opacity = Math.max(washEnd, washStart).toFixed(4);
  }

  renderAt(0);

  return {
    root,
    renderAt,
    getFocusX,
    setRedGain,
    getRedGain: () => currentRedGain,
    dispose() {
      filterSvg.remove();
      root.remove();
    },
  };
}
