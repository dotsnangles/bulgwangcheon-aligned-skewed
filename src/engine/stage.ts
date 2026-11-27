/**
 * Museum-Grade Zero-UI & Bezel-Safe (`Y ∈ [26, 404]`) 6480 × 432 (15:1) Moving-Image Engine
 * (`src/engine/stage.ts` — Round 3 Master Director's Cut)
 *
 * Implements all 8 Round-3 Masterpiece Elevations:
 *   1. Physical Bezel Safety (`Y ∈ [26, 404]`), Back-Card Metric Suppression, `1.32x` `history`, & 6-Card `GEN2_ALIGNED`
 *   2. Razor Guillotine Hard-Clip Press (`box-shadow: none`, SemiBold `600`, Datum Vernier) + 30m Crystallographic Slit-Scan Runner Wave (Zero Horse!)
 *   3. `27.6–30.0s` Bezel-Safe `04` Horizontal Glide & 30m Concertina Printmaking Screen Fold-Out (`rotateY`)
 *   4. Zero Static Holds: `2.0s` Bar-Synced 3D Card-Stack Fan & Deal Wave (`01→02→03→04`) + `±18px` Tectonic Shear Slide
 *   5. Architectural Dimension-Line Arc Callouts (`── COS 0.XXX ──`, Zero Box Badge) & Variable-Density Barcodes
 *   6. Zero-Freeze Act III + 5 Asymmetric Star Clusters + `35%+` Pure-White Canyons + `42px` Macro Hubs + Bundled Catenary Arteries (`1.55–2.05px`) + Persistent Central Nucleus & Real-Time Exclusion Halo
 *   7. Taut `6.2s` Parabolic Ballistic Fault Drift + Smooth Scale-Deceleration Gale (`>= 95px` gap) & Dry-Ink Stipple Abrasion + `38 m/s` Katabatic Drypoint Blizzard & `0.75s` Loop + White-Point-Preserving `feComponentTransfer` `rgain`
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
import { getDecodedPlate, getPlateById } from '../illustrations.ts';
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
  readonly metricEl: HTMLElement;
  readonly bodyEl: HTMLElement | null;
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
  readonly cardSlot?: 0 | 1 | 2;
  readonly alignedIdx?: number;
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

const SLIT_PLATE_SEQ = [
  'plate-01',
  'plate-15',
  'plate-02',
  'plate-03',
  'plate-08',
  'plate-05',
  'plate-06',
  'plate-07',
] as const;

/**
 * Deterministic Screen-Space Foreground Repulsion (`14 iterations`, Bezel-Safe `Y ∈ [28, 404]`)
 * + Depth Occlusion Pass for 3D views (`helix3D`, `cloud3D`, `sphere3D`).
 */
function repelForeground3D(
  screenPos: { x: number; y: number; z: number; s: number; o: number; blur: number }[],
  fragments: readonly FragmentItem[],
): void {
  const active: number[] = [];
  for (let i = 0; i < screenPos.length; i++) {
    const p = screenPos[i]!;
    if (p.o >= 0.34 && p.x > -80 && p.x < STAGE_W + 80 && p.y > -20 && p.y < STAGE_H + 20) {
      active.push(i);
    }
  }
  const m = active.length;
  if (m >= 2) {
    const hw = new Float32Array(m);
    const hh = new Float32Array(m);
    for (let k = 0; k < m; k++) {
      const idx = active[k]!;
      const b = fragmentBox(fragments[idx]!, screenPos[idx]!.s * 0.96);
      hw[k] = b.w * 0.5 + 6;
      hh[k] = b.h * 0.5 + 4;
      // Strict bezel clamp before repulsion
      screenPos[idx]!.y = clamp(screenPos[idx]!.y, 28 + hh[k]!, STAGE_H - 28 - hh[k]!);
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
            const pushY = overY * 0.55 + 1.0;
            const slideX = Math.min(overX * 0.16 + 1.6, 10.5);
            pa.y = clamp(pa.y - signY * pushY, 28 + hh[a]!, STAGE_H - 28 - hh[a]!);
            pb.y = clamp(pb.y + signY * pushY, 28 + hh[b]!, STAGE_H - 28 - hh[b]!);
            pa.x -= signX * slideX;
            pb.x += signX * slideX;
          } else {
            const pushX = overX * 0.55 + 1.5;
            pa.x -= signX * pushX;
            pb.x += signX * pushX;
          }
        }
      }
      if (!anyOverlap) break;
    }
  }

  // Depth Occlusion Pass: foreground phrases/plates cleanly occlude deeper/blurred background items
  const fgIndices: number[] = [];
  const bgIndices: number[] = [];
  for (let i = 0; i < screenPos.length; i++) {
    const p = screenPos[i]!;
    if (p.o <= 0.01 || p.x < -120 || p.x > STAGE_W + 120) continue;
    if (p.o >= 0.48 && p.blur <= 1.2) fgIndices.push(i);
    if (p.o < 0.74 || p.blur > 0.35) bgIndices.push(i);
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

  /* --- 0. Pure-White-Preserving SVG Gamma Filter (`?rgain=0.50..1.00` -> `#FFFFFF` stays `RGB(255,255,255)`!) --- */
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

  const compTransfer = document.createElementNS(SVG_NS, 'feComponentTransfer');
  const funcR = document.createElementNS(SVG_NS, 'feFuncR');
  funcR.setAttribute('type', 'gamma');
  funcR.setAttribute('amplitude', '1');
  funcR.setAttribute('exponent', '1');
  funcR.setAttribute('offset', '0');
  const funcG = document.createElementNS(SVG_NS, 'feFuncG');
  funcG.setAttribute('type', 'identity');
  const funcB = document.createElementNS(SVG_NS, 'feFuncB');
  funcB.setAttribute('type', 'identity');
  compTransfer.append(funcR, funcG, funcB);
  filterEl.append(compTransfer);
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
      funcR.setAttribute('exponent', (1 / currentRedGain).toFixed(4));
      root.style.filter = `url(#${filterId})`;
    }
  };
  setRedGain(options.redGain ?? 1.0);

  /* --- 1. Boundless Paper Fiducial Crosshairs Only (`opacity <= 0.13` strictly inside `Y = 96..336`) --- */
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

  /* --- 2. Polar Sastrugi Backdrop (`X = 3580..5860, Y = 146..396`, 4-edge feathered mask!) --- */
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

  /* --- 4. Act I.1 (`0.0 – 8.0s`): Razor Guillotine Silkscreen Press & Hero Sanctuary --- */
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

  const pressUpperClip = makeEl('div', 'press-clip-upper', pressLayer);
  const pressLowerClip = makeEl('div', 'press-clip-lower', pressLayer);

  const pressMemories = ALIGNED_MEMORY_LINES.map((m) => {
    const parentClip = m.y < 216 ? pressUpperClip : pressLowerClip;
    const lineEl = makeEl('div', 'press-memory-line', parentClip, m.text);
    return { spec: m, lineEl };
  });

  const platenTop = makeEl('div', 'press-platen-rule', pressLayer);
  const platenBot = makeEl('div', 'press-platen-rule', pressLayer);
  const pressFormula = makeEl('div', 'press-formula-stamp', pressLayer, ALIGNED_FORMULA);

  /* --- 5. Macro Query Anchor (`56px` Bold Serif, Bezel-Safe `top: 32px` + 8 Glyph Spans) --- */
  const datumAnchor = makeEl('div', 'datum-query-anchor', world);
  const datumCharsWrap = makeEl('div', 'datum-query-chars', datumAnchor);
  const gen1Glyphs = ['김', '치', '찌', '개', '끓', '이', '는', '법'] as const;
  const datumGen1Spans = gen1Glyphs.map((ch, idx) =>
    makeEl('span', `datum-char${idx === 4 || idx === 7 ? ' has-gap' : ''}`, datumCharsWrap, ch),
  );
  const datumGen2Span = makeEl('span', 'datum-char', datumCharsWrap, QUERY_GEN2);
  const datumRule = makeEl('div', 'datum-query-rule', datumAnchor);
  datumRule.style.width = '468px';

  /* --- 6. Refraction Lens Prism Gates (`X = 1716..1852, Y = 38..394`, Canvas Hatch + Static DOM Label -> 0 LSB!) --- */
  const buildStaticPrismGate = (titleText: string): HTMLElement => {
    const gate = makeEl('div', 'prism-gate', world);
    const labelBox = makeEl('div', 'prism-gate-label', gate);
    makeEl('span', 'prism-gate-kicker', labelBox, '굴절 관점');
    makeEl('span', 'prism-gate-title', labelBox, titleText);
    return gate;
  };
  const prismGateGen1 = buildStaticPrismGate(REFRACTION_LENS_GEN1);
  const prismGateGen2 = buildStaticPrismGate(REFRACTION_LENS_GEN2);

  /* --- 7. Act II.1: Full-Bleed Broadsheet (`27.65–37.6s`, Concertina Fold-Out + Shear Ready!) --- */
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

  /* --- 8. Act I.3 & Act IV.3b: Bezel-Safe 3D Monolith Archipelago + `2.0s` Card-Stack Fan & Deal --- */
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
    cardSlot?: 0 | 1 | 2,
    alignedIdx?: number,
  ): PlacedMonolith => {
    const el = makeEl('article', `monolith-card ${isHero ? 'is-hero' : 'is-slab'}`, cardLayer);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.zIndex = String(Math.round(200 + z));

    const bandCls = spec.group === 'aligned' ? 'monolith-band aligned' : `monolith-band skewed-${spec.rank ?? 1}`;
    const band = makeEl('div', bandCls, el);
    makeEl('span', 'monolith-code', band, spec.indexCode);
    const metricEl = makeEl('span', 'monolith-metric', band, spec.metric);
    if (!isHero) {
      // Back slabs hide right-corner metric so it NEVER collides with front card header ("4 01 SKEWED" eliminated!)
      metricEl.style.opacity = '0';
    }

    if (spec.plateId) {
      const pWrap = makeEl('div', 'monolith-plate-wrap', el);
      const img = document.createElement('img');
      img.src = getPlateById(spec.plateId).src;
      img.alt = spec.title;
      pWrap.append(img);
    }

    let bodyEl: HTMLElement | null = null;
    if (isHero) {
      bodyEl = makeEl('div', 'monolith-body', el);
      makeEl('div', 'monolith-title', bodyEl, spec.title);
      makeEl('div', 'monolith-snippet', bodyEl, spec.snippet);
    }

    const regMark = document.createElementNS(SVG_NS, 'path');
    regMark.setAttribute('fill', 'none');
    regMark.setAttribute('stroke', '#000000');
    regMark.setAttribute('stroke-width', '0.9');
    regLayer.append(regMark);

    const rec: PlacedMonolith = {
      spec,
      el,
      metricEl,
      bodyEl,
      regMark,
      x,
      y,
      z,
      w,
      h,
      rotY,
      rotX,
      isHero,
      at,
      gen: spec.gen,
      stationIdx,
      cardSlot,
      alignedIdx,
    };
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
  ) => {
    // 1. Homogeneous 6-Card Diagonal Aligned Cascade (`X = 124 .. 1256`, zero gap in Gen 1 & Gen 2!)
    alignedSpecs.forEach((spec, idx) => {
      const isFrontHero = idx === alignedSpecs.length - 1;
      if (isFrontHero) {
        addMonolith(spec, 1256, 140, 76, 314, 228, 24, 4, true, baseAt + idx * 0.16, undefined, undefined, idx);
      } else {
        const x = 124 + idx * 212;
        const y = 136 + (idx % 2) * 28;
        const z = -40 + idx * 16;
        addMonolith(spec, x, y, z, 232, 188, 28, 5, false, baseAt + idx * 0.16, undefined, undefined, idx);
      }
    });

    // 2. 4 Accelerating Skewed Stations (`X = 2020, 2880, 3960, 5280`, `Y = 140, 48, 140, 48` Bezel-Safe!)
    const stBaseDelay = gen === 2 ? 0.95 : 1.05;
    const stStepDelay = gen === 2 ? 0.62 : 0.82;
    skewedStations.forEach((st, sIdx) => {
      const stAt = baseAt + stBaseDelay + sIdx * stStepDelay;

      // Bezel-safe Station Beacon (`34px` top for lower stations `y=140`; `308px` top -> `<= 368px` bottom for upper stations `y=48`!)
      const beaconEl = makeEl('div', 'station-beacon', cardLayer);
      const beaconY = st.y > 100 ? 34 : 308;
      beaconEl.style.left = `${st.x - 10}px`;
      beaconEl.style.top = `${beaconY}px`;
      const row = makeEl('div', 'station-beacon-row', beaconEl);
      makeEl('span', 'station-big-num', row, `0${st.rank}`);
      const metaCol = makeEl('div', 'station-meta-col', row);
      makeEl('span', 'station-code', metaCol, st.code);
      makeEl('span', 'station-title', metaCol, st.shortTitle);
      stationBeacons.push({ gen, spec: st, el: beaconEl, x: st.x - 10, y: beaconY, z: 88, at: stAt - 0.08 });

      // Build 3 full hero monoliths (`cSlot = 0, 1, 2`; `cSlot = 2` starts in front at `cycleIdx = 0`!)
      ([0, 1, 2] as const).forEach((cSlot) => {
        addMonolith(
          st.cards[cSlot]!,
          st.x,
          st.y,
          78 + sIdx * 6,
          314,
          228,
          st.rotY,
          st.rotX,
          true,
          stAt + cSlot * 0.12,
          sIdx,
          cSlot,
        );
      });
    });

    // 3. Bezel-Safe `2.2px` Orthogonal (`┌────►`) `#FF0000` Rule Arrows (`railYs = [46, 386, 44]` strictly inside `[26, 404]`!)
    const arrowStartAt = baseAt + (gen === 2 ? 0.85 : 0.95);
    const arrowStep = gen === 2 ? 0.60 : 0.78;
    addOrthogonalArrow(
      gen,
      [
        [1570, 254],
        [1784, 254],
        [1784, 386],
        [2176, 386],
        [2176, skewedStations[0]!.y + 230],
      ],
      arrowStartAt,
      0.65,
      0,
    );

    const railYs = [46, 386, 44];
    for (let k = 0; k < 3; k++) {
      const sA = skewedStations[k]!;
      const sB = skewedStations[k + 1]!;
      const rY = railYs[k]!;
      const fromTop = rY < 200;
      addOrthogonalArrow(
        gen,
        [
          [sA.x + 240, fromTop ? Math.max(44, sA.y - 2) : Math.min(386, sA.y + 230)],
          [sA.x + 240, rY],
          [sB.x + 120, rY],
          [sB.x + 120, fromTop ? Math.max(44, sB.y - 2) : Math.min(386, sB.y + 230)],
        ],
        arrowStartAt + arrowStep * (k + 1),
        0.65,
        k + 1,
      );
    }
  };

  // Start Gen 1 Archipelago at `10.35s` right as the 30m Slit-Scan Runner Wave finishes crossing!
  buildGenerationArchipelago(1, GEN1_ALIGNED_CARDS, GEN1_SKEWED_STATIONS, 10.35);
  buildGenerationArchipelago(2, GEN2_ALIGNED_CARDS, GEN2_SKEWED_STATIONS, 100.2);

  /* --- 9. Right-Edge `1.32x` Enlarged 3D Oblique History Ribbon --- */
  const historyWrap = makeEl('aside', 'history-rail-wrap', world);
  const historyScene = makeEl('div', 'history-scene', historyWrap);
  const historyList = makeEl('ol', 'history-list', historyScene);
  makeEl('li', 'history-head', historyList, 'history');

  const historyItems: { el: HTMLElement; at: number }[] = [];
  const visitedSeq: { spec: CardSpec; at: number }[] = [
    ...GEN1_ALIGNED_CARDS.slice(0, 4).map((spec, i) => ({ spec, at: 10.4 + i * 0.20 })),
    ...GEN1_SKEWED_STATIONS.map((st, i) => ({ spec: st.cards[2]!, at: 11.6 + i * 0.85 })),
    ...GEN2_ALIGNED_CARDS.slice(0, 4).map((spec, i) => ({ spec, at: 100.4 + i * 0.22 })),
    ...GEN2_SKEWED_STATIONS.map((st, i) => ({ spec: st.cards[2]!, at: 102.6 + i * 0.65 })),
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

  /* --- 11. 200 Multi-Layered Deconstructed Fragments (`z-index: 9`, Solid Paper Halo + `42px` Hubs) --- */
  const fragLayer = makeEl('div', 'frag-layer', world);
  const fragEls: HTMLElement[] = fragments.map((f) => {
    const cls =
      f.type === 'img'
        ? 'frag is-img'
        : f.isMacroHub
          ? 'frag is-anchor is-macro-hub'
          : f.tier === 'anchor'
            ? 'frag is-anchor'
            : 'frag is-sentence';
    const el = makeEl('div', cls, fragLayer);
    if (f.type === 'img' && f.plate) {
      const img = document.createElement('img');
      img.src = f.plate.src;
      img.alt = f.plate.code;
      el.append(img);
      makeEl('span', 'frag-lab', el, f.plate.code);
    } else {
      el.textContent = f.content;
      el.style.fontSize = `${f.baseFontPx}px`;
    }
    return el;
  });

  /* --- 12. Special Layer: Persistent Orbit Nucleus, Periphery Tag, Fault Shards & Gale --- */
  const specialLayer = makeEl('div', 'special-layer', world);

  const orbitSanctuaryEl = makeEl('div', 'orbit-center-sanctuary', specialLayer);
  makeEl('span', 'orbit-center-query', orbitSanctuaryEl, QUERY_GEN1);

  const peripheryNumEl = makeEl('div', 'periphery-num-tag', specialLayer, '0.14');
  const awakenedSentenceEl = makeEl('div', 'awakened-sentence', specialLayer, TARGET_FRAGMENT_TEXT);

  const shardEls = TARGET_PHRASE_PIECES.map((p, idx) =>
    makeEl('div', `fault-shard ${idx === 1 ? 'is-center' : 'is-side'}`, specialLayer, p.text),
  );

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

  /* --- Dimension-Line Cosine Measurement Stages (`39.8s .. 43.6s`: Spatially Centered Upper Pairs -> Clean Apex!) --- */
  const pickUpperPair = (minXA: number, maxXA: number, minXB: number, maxXB: number): [number, number] => {
    let bestA = 0;
    let bestB = 1;
    let bestScore = Infinity;
    for (let i = 0; i < fragments.length; i++) {
      if (fragments[i]!.type === 'img') continue;
      const pA = layouts.spectrum2D[i]!;
      if (pA.x < minXA || pA.x > maxXA || pA.y > 165) continue;
      for (let j = 0; j < fragments.length; j++) {
        if (i === j || fragments[j]!.type === 'img') continue;
        const pB = layouts.spectrum2D[j]!;
        if (pB.x < minXB || pB.x > maxXB || pB.y > 165) continue;
        const score = pA.y + pB.y;
        if (score < bestScore) {
          bestScore = score;
          bestA = i;
          bestB = j;
        }
      }
    }
    return [bestA, bestB];
  };

  const pairStage1 = pickUpperPair(1050, 1450, 1750, 2150);
  const pairStage2A = pickUpperPair(2680, 3020, 3380, 3720);
  const pairStage2B = pickUpperPair(2760, 3120, 3480, 3840);
  const pairStage3A = pickUpperPair(4350, 4750, 5080, 5480);

  const accelerandoScanStages: readonly {
    readonly t0: number;
    readonly t1: number;
    readonly pairs: readonly [number, number][];
    readonly dimText: string;
  }[] = [
    { t0: 39.8, t1: 40.9, pairs: [pairStage1], dimText: 'COS 0.884' },
    { t0: 40.9, t1: 42.0, pairs: [pairStage2A, pairStage2B], dimText: 'COS 0.792' },
    {
      t0: 42.0,
      t1: 43.4,
      pairs: [pairStage3A, pairStage1, pairStage2A, [pairStage1[0], targetIndex]],
      dimText: 'COS 0.140',
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
    if (t < 8.0) return lerp(980, 3960, easeInOut(progress(t, 3.5, 7.2)));
    if (t < 11.2) return lerp(900, 5600, progress(t, 8.0, 11.0));
    if (t < 27.6) return lerp(1550, 4900, easeInOut(progress(t, 11.2, 27.2)));
    if (t < 30.0) return lerp(4900, 3240, easeInOut(progress(t, 27.6, 29.9)));
    if (t < 37.6) return lerp(1600, 4900, easeInOut(progress(t, 30.0, 37.3)));
    if (t < 46.0) return 3240;
    if (t < 49.6) return 3240;
    if (t < 59.8) return lerp(1800, 4680, easeInOut(progress(t, 49.6, 59.8)));
    if (t < 66.8) return 3240;
    if (t < 75.2) return lerp(2000, 4500, easeInOut(progress(t, 66.8, 75.2)));
    if (t < 88.0) return 3240;
    if (t < 94.2) return 4880;
    if (t < 100.2) return lerp(4880, 860, easeInOut(progress(t, 94.2, 100.0)));
    if (t < 113.6) return lerp(1400, 4900, easeInOut(progress(t, 100.2, 113.4)));
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

    world.style.transform = 'none';

    // -----------------------------------------------------------------------
    // 1. ACT I.1 (`0.0 – 8.0s`): RAZOR GUILLOTINE HARD-CLIP PRESS & VERNIER DATUM
    // -----------------------------------------------------------------------
    if (t >= 8.08) {
      pressLayer.style.opacity = '0';
      pressHeroQuery.style.opacity = '0';
      voronoiImgA.style.opacity = '0';
      voronoiImgB.style.opacity = '0';
      platenTop.style.opacity = '0';
      platenBot.style.opacity = '0';
      pressFormula.style.opacity = '0';
      pressUpperClip.style.clipPath = 'none';
      pressLowerClip.style.clipPath = 'none';
      for (const pm of pressMemories) pm.lineEl.style.opacity = '0';
    } else {
      const pressOut = 1 - span(t, 7.35, 8.0, easeInCubic);
      pressLayer.style.opacity = pressOut.toFixed(4);

      // Left Pure-White Sanctuary (`X = 110..1640`): 120px Hero Query -> docks to `(110, 62)` 56px at `6.3..7.5s`
      const qEnter = span(t, 0.16, 0.78, easeOutExpo);
      const qDock = span(t, 6.3, 7.55, easeInOutCubic);
      const wght = Math.round(lerp(260, 780, span(t, 0.4, 4.3, easeInOut) + pulse * 0.08));
      const qScale = lerp(1.0, 56 / 120, qDock);
      const qX = lerp(118, 110, qDock);
      const qY = lerp(216, 62, qDock);
      pressHeroQuery.style.opacity = (qEnter * (1 - span(t, 7.42, 7.82))).toFixed(4);
      pressHeroQuery.style.fontVariationSettings = `"wght" ${clamp(wght, 200, 900)}`;
      pressHeroQuery.style.transform = `translate3d(${(qX - 118).toFixed(1)}px, ${(qY - 216).toFixed(1)}px, 0) translateY(-50%) scale(${qScale.toFixed(4)})`;

      // Precision Horizontal Registration Datum & Vernier Ticks bridging Hero Sanctuary (`X=1142`) -> Press (`X=1796`)!
      const datumBridgeOp = span(t, 0.5, 1.3) * (1 - span(t, 6.3, 6.9)) * pressOut;
      if (datumBridgeOp > 0.01) {
        ctx.save();
        ctx.globalAlpha = datumBridgeOp * 0.85;
        ctx.strokeStyle = '#0000ff';
        ctx.lineWidth = 1.1;
        const dRight = lerp(1142, 1796, span(t, 0.55, 1.5, easeOutCubic));
        ctx.beginPath();
        ctx.moveTo(1142, 216.5);
        ctx.lineTo(dRight, 216.5);
        ctx.stroke();

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.85;
        for (let vx = 1160; vx <= dRight; vx += 64) {
          const major = ((vx - 1160) / 64) % 2 === 0;
          const th = major ? 7 : 4;
          ctx.beginPath();
          ctx.moveTo(vx + 0.5, 216.5 - th);
          ctx.lineTo(vx + 0.5, 216.5 + th);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Subtle Voronoi lithograph plates (`opacity <= 0.32`, strictly in `X >= 1960`)
      const vOp = span(t, 0.55, 1.7) * (1 - span(t, 6.9, 7.6)) * 0.30;
      voronoiImgA.style.opacity = vOp.toFixed(3);
      voronoiImgA.style.transform = `scale(${(1.0 + t * 0.014).toFixed(4)})`;
      voronoiImgB.style.opacity = (vOp * 0.88).toFixed(3);
      voronoiImgB.style.transform = `scale(${(1.02 + t * 0.012).toFixed(4)})`;

      // Razor Guillotine Platen Compression (`t = 5.02..6.25s`, keeping `t = 4.9s` untouched for G2!)
      const crushU = span(t, 5.02, 6.22, easeInOutCubic);
      const formOpen = span(t, 5.18, 5.42, easeOutExpo);
      const platenVis = span(t, 4.25, 4.50) * (1 - span(t, 7.0, 7.6));
      const pTopY = lerp(34, 154, crushU);
      const pBotY = lerp(398, 278, crushU);
      const fTopY = 216 - 38 * formOpen;
      const fBotY = 216 + 38 * formOpen;

      platenTop.style.opacity = platenVis.toFixed(3);
      platenBot.style.opacity = platenVis.toFixed(3);
      platenTop.style.top = `${pTopY.toFixed(1)}px`;
      platenBot.style.top = `${pBotY.toFixed(1)}px`;

      // Razor-sharp Guillotine Hard-Clip (`0px` airbrush feathering!): slices memory strips cleanly at platen & formula jaws!
      if (t >= 5.02) {
        const upBotInset = STAGE_H - (formOpen > 0.01 ? fTopY : pBotY);
        const loTopInset = formOpen > 0.01 ? fBotY : pTopY;
        pressUpperClip.style.clipPath = `inset(${pTopY.toFixed(1)}px 0px ${Math.max(0, upBotInset).toFixed(1)}px 0px)`;
        pressLowerClip.style.clipPath = `inset(${Math.max(0, loTopInset).toFixed(1)}px 0px ${(STAGE_H - pBotY).toFixed(1)}px 0px)`;
      } else {
        pressUpperClip.style.clipPath = 'none';
        pressLowerClip.style.clipPath = 'none';
      }

      const slideIntoJaw = span(t, 5.06, 6.28, easeInCubic);
      for (const pm of pressMemories) {
        const memOn = t >= pm.spec.appearAt ? 1 : 0;
        const blueInverted = t >= pm.spec.appearAt + 0.45;
        const curY = lerp(pm.spec.y, 216, slideIntoJaw);
        const hardCutOff = t >= 6.28 ? 0 : 1;
        const op = memOn * hardCutOff * (1 - span(t, 7.0, 7.5));

        pm.lineEl.style.opacity = op.toFixed(3);
        pm.lineEl.style.left = `${pm.spec.x.toFixed(1)}px`;
        pm.lineEl.style.top = `${curY.toFixed(1)}px`;
        pm.lineEl.style.transform = 'translate(-50%, -50%)';
        pm.lineEl.style.background = blueInverted ? '#0000ff' : '#ffffff';
        pm.lineEl.style.color = blueInverted ? '#ffffff' : '#000000';
        pm.lineEl.style.borderColor = blueInverted ? '#0000ff' : '#000000';
      }

      const formSlide = span(t, 6.5, 7.6, easeInCubic);
      pressFormula.style.opacity = (formOpen * (1 - span(t, 7.1, 7.7))).toFixed(3);
      pressFormula.style.transform = `translate(${lerp(-50, -180, formSlide).toFixed(1)}%, -50%) scale(${lerp(1, 0.56, formSlide).toFixed(3)})`;
    }

    // -----------------------------------------------------------------------
    // 2. MACRO 56px QUERY ANCHOR & DRY-INK STIPPLE ABRASION (`Act IV.3a`)
    // -----------------------------------------------------------------------
    const inGen1Anchor = t >= 7.38 && t < 28.4;
    const inGaleWeathering = t >= 94.2 && t < 100.2;
    const inGen2Anchor = t >= 100.0 && t < 118.8;

    // Katabatic Drypoint Blizzard front X (`113.6..119.22s`: sweeps right-to-left from X=6680 -> X=-420)
    const blizzardU = progress(t, 113.6, 119.20);
    const blizzardFrontX = lerp(6680, -420, easeInOutCubic(blizzardU));

    // Gale trajectory (`94.2..100.15s`) pre-computed so glyph weathering keeps `>= 105px` shockwave gap!
    const uGale = easeInOutCubic(progress(t, 94.2, 100.12));
    const dockGen2 = easeInOutCubic(progress(t, 96.6, 100.12));
    const galeScale = lerp(1.0, 56 / 104, dockGen2);
    const galeCenterX = lerp(4880, 344, uGale);
    const galeCenterY = lerp(216, 62, dockGen2);
    const galeHalfW = 415 * galeScale;
    const galeLeftEdgeX = galeCenterX - galeHalfW;

    if (!inGen1Anchor && !inGaleWeathering && !inGen2Anchor) {
      datumAnchor.style.opacity = '0';
      datumAnchor.style.transform = 'none';
    } else if (inGen1Anchor) {
      const aOp = span(t, 7.38, 7.80) * (1 - span(t, 27.6, 28.35));
      datumAnchor.style.opacity = aOp.toFixed(3);
      datumAnchor.style.top = '32px';
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
      // Position original query at `(110, 182)` so approaching gale abrades it right->left (`법 -> ... -> 김`) with `>= 105px` shockwave buffer!
      const enterW = span(t, 94.2, 94.85);
      datumAnchor.style.opacity = enterW.toFixed(3);
      datumAnchor.style.top = '182px';
      datumAnchor.style.transform = 'none';
      datumGen2Span.style.display = 'none';

      const charRights = [166, 222, 278, 334, 404, 460, 516, 586];
      let intactRatio = 0;

      datumGen1Spans.forEach((sp, idx) => {
        sp.style.display = 'inline-block';
        const cRight = charRights[idx]!;
        // Begins abrading when `galeLeftEdgeX` reaches `cRight + 210px`, finishes at `cRight + 102px` (`>= 102px` shockwave gap!)
        const wU = clamp((cRight + 210 - galeLeftEdgeX) / 108, 0, 1);
        const op = 1 - easeOutCubic(wU);
        intactRatio += op / 8;
        const dx = -easeInCubic(wU) * (135 + (idx % 3) * 32);
        const dy = clamp(((idx % 2 === 0 ? -1 : 1) * 44 + (hash(idx * 17) - 0.5) * 26) * easeOutCubic(wU), -88, 88);
        const rot = ((idx % 2 === 0 ? -1 : 1) * 20) * wU;
        sp.style.opacity = op.toFixed(3);
        sp.style.transform =
          wU > 0.001
            ? `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg) scale(${(1 - wU * 0.42).toFixed(3)})`
            : 'none';

        // Fine-Press Dry-Ink Stipple Abrasion (48 circular ink dots + 10 calligraphic stroke splinters — ZERO fillRect!)
        if (wU > 0.015 && wU < 0.995) {
          const charBaseX = cRight - 28;
          ctx.save();
          for (let g = 0; g < 48; g++) {
            const h1 = hash(idx * 101 + g * 13);
            const h2 = hash(idx * 73 + g * 29);
            const h3 = hash(idx * 53 + g * 41);
            const gx = charBaseX - wU * (45 + h1 * 290) + (h3 - 0.5) * 26;
            const gy = clamp(210 + (h2 - 0.5) * (24 + 118 * wU) + Math.sin(wU * 8 + g) * 8, 42, 388);
            if (gx < 8 || gx > STAGE_W) continue;
            const radius = 0.65 + h3 * 1.45;
            const alpha = (1 - wU * 0.86) * (0.42 + h1 * 0.46);
            ctx.fillStyle = g % 5 === 0 ? `rgba(217, 0, 0, ${alpha.toFixed(3)})` : `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(gx, gy, radius, 0, Math.PI * 2);
            ctx.fill();
          }

          // Delicate calligraphic dry-ink stroke splinters curving away in the wind
          ctx.lineCap = 'round';
          for (let s = 0; s < 10; s++) {
            const hs1 = hash(idx * 131 + s * 19);
            const hs2 = hash(idx * 89 + s * 37);
            const sx = charBaseX - wU * (35 + hs1 * 220);
            const sy = clamp(210 + (hs2 - 0.5) * (22 + 95 * wU), 46, 384);
            if (sx < 12) continue;
            const len = 8 + hs1 * 18;
            ctx.strokeStyle =
              s % 4 === 0
                ? `rgba(217, 0, 0, ${((1 - wU * 0.85) * 0.58).toFixed(3)})`
                : `rgba(0, 0, 0, ${((1 - wU * 0.85) * 0.55).toFixed(3)})`;
            ctx.lineWidth = 0.65 + (s % 2) * 0.35;
            ctx.beginPath();
            ctx.moveTo(sx + len, sy);
            ctx.quadraticCurveTo(sx + len * 0.5, sy + (hs2 - 0.5) * 9, sx, sy + (hs1 - 0.5) * 6);
            ctx.stroke();
          }
          ctx.restore();
        }
      });
      datumRule.style.background = '#0000ff';
      datumRule.style.opacity = intactRatio.toFixed(3);
      datumRule.style.transform = `scaleX(${intactRatio.toFixed(3)})`;
    } else {
      // Gen 2 Macro Query Anchor ("수억 년 전의 바람", `56px` Bold at `(110, 32)` -> scoured away by Katabatic Blizzard at `117.3..118.6s`!)
      const blizzardScour = t >= 113.6 ? smoothstep(blizzardFrontX - 420, blizzardFrontX + 180, 344) : 0;
      const g2In = span(t, 100.05, 100.32, easeOutCubic) * (1 - blizzardScour);
      datumAnchor.style.opacity = g2In.toFixed(3);
      datumAnchor.style.top = '32px';
      datumAnchor.style.transform = `translate3d(${(-blizzardScour * 68).toFixed(1)}px, 0, 0)`;
      for (const sp of datumGen1Spans) sp.style.display = 'none';
      datumGen2Span.style.display = 'inline-block';
      datumGen2Span.style.opacity = '1';
      datumGen2Span.style.transform = 'none';
      datumRule.style.background = '#000000';
      datumRule.style.opacity = '1';
      datumRule.style.transform = `scaleX(${span(t, 100.1, 100.9).toFixed(3)})`;
    }

    // -----------------------------------------------------------------------
    // 3. ACT I.2 (`8.0 – 11.35s`): 30M STROBOSCOPIC CRYSTALLOGRAPHIC SLIT-SCAN RUNNER WAVE
    //    (100% Zero Horse Silhouette! Pure Optical Refraction & Mineral Episteme!)
    // -----------------------------------------------------------------------
    if (t >= 8.0 && t < 11.35) {
      const runnerFade = (t >= 8.0 ? 1 : 0) * (1 - span(t, 10.82, 11.32));
      const leadU = progress(t, 8.0, 10.72);
      const leadX = lerp(180, 6340, leadU);

      ctx.save();

      // Full-30m ballistic refraction scale (`Y = 348 .. 376`, strictly inside `Y <= 386`!)
      const scaleExtend = clamp(leadU * 1.32 + 0.22, 0, 1);
      const scaleMaxX = lerp(140, 6360, scaleExtend);
      ctx.strokeStyle = `rgba(0, 0, 0, ${(0.56 * runnerFade).toFixed(3)})`;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(140, 352.5);
      ctx.lineTo(scaleMaxX, 352.5);
      ctx.stroke();

      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.fillStyle = `rgba(0, 0, 0, ${(0.74 * runnerFade).toFixed(3)})`;
      for (let m = 0; m <= 30; m += 5) {
        const mx = 180 + (m / 30) * 6120;
        if (mx > scaleMaxX) break;
        ctx.beginPath();
        ctx.moveTo(mx + 0.5, 346);
        ctx.lineTo(mx + 0.5, 359);
        ctx.stroke();
        ctx.fillText(`${m.toFixed(1)} m`, mx - 18, 376);
      }

      // 18 Vertical Crystallographic Slit-Scan Windows (`X = 280 .. 6145`, `Y = 64..336` bezel-safe!)
      const stCount = 18;
      for (let k = 0; k < stCount; k++) {
        const sx = 280 + k * 345;
        const sw = 212 + (k % 3) * 16;
        const syTop = 64;
        const sh = 268;
        const crossed = leadX >= sx - 40;

        if (!crossed) {
          ctx.globalAlpha = runnerFade * 0.14;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(sx + 0.5, syTop + 18);
          ctx.lineTo(sx + 0.5, syTop + sh - 18);
          ctx.stroke();
          continue;
        }

        const age = clamp((leadX - sx) / 3100, 0, 1);
        const winAlpha = runnerFade * lerp(0.92, 0.24, age);
        const plateId = SLIT_PLATE_SEQ[k % SLIT_PLATE_SEQ.length]!;
        const pImg = getDecodedPlate(plateId);

        if (pImg) {
          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          ctx.globalAlpha = winAlpha * 0.88;
          // Optical slit-scan crop: scans horizontally across the high-res 960px lithograph!
          const iw = pImg.naturalWidth;
          const ih = pImg.naturalHeight;
          const cropW = Math.min(iw, Math.round(iw * 0.34));
          const maxPan = Math.max(1, iw - cropW);
          const scanPhase = clamp(((t - 8.0) * 0.55 + k * 0.13) % 1, 0, 1);
          const srcX = Math.round(scanPhase * maxPan);
          ctx.drawImage(pImg, srcX, 0, cropW, ih, sx - sw * 0.5, syTop, sw, sh);
          ctx.restore();
        }

        // Crisp `1px #000000` top & bottom slit aperture brackets
        ctx.globalAlpha = winAlpha;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.1;
        const leftX = sx - sw * 0.5;
        const rightX = sx + sw * 0.5;
        ctx.beginPath();
        ctx.moveTo(leftX, syTop + 10);
        ctx.lineTo(leftX, syTop);
        ctx.lineTo(rightX, syTop);
        ctx.lineTo(rightX, syTop + 10);
        ctx.moveTo(leftX, syTop + sh - 10);
        ctx.lineTo(leftX, syTop + sh);
        ctx.lineTo(rightX, syTop + sh);
        ctx.lineTo(rightX, syTop + sh - 10);
        ctx.stroke();

        // Razor-sharp `2px #FF0000` vertical stroboscopic shutter line
        ctx.globalAlpha = runnerFade * lerp(0.96, 0.32, age);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = k === Math.floor(leadU * (stCount - 1)) ? 2.4 : 1.5;
        ctx.beginPath();
        ctx.moveTo(sx + 0.5, syTop - 8);
        ctx.lineTo(sx + 0.5, syTop + sh + 10);
        ctx.stroke();

        // Crisp `11.5px` Bold Mono slit specimen tag (`SL.01`..`SL.18`)
        ctx.globalAlpha = winAlpha * 0.9;
        ctx.fillStyle = '#000000';
        ctx.font = '700 11.5px "JetBrains Mono", monospace';
        ctx.fillText(`SL.${String(k + 1).padStart(2, '0')}`, leftX + 4, syTop - 4);
      }

      // Leading Cobalt + Surgical-Red Stroboscopic Wavefront Cursor (`leadX`)
      if (t < 10.95) {
        ctx.globalAlpha = runnerFade;
        ctx.strokeStyle = '#0000ff';
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.moveTo(leadX, 46);
        ctx.lineTo(leadX, 352);
        ctx.stroke();

        // Stepped orthogonal runner pulse trail
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(Math.max(180, leadX - 420), 216);
        ctx.lineTo(Math.max(180, leadX - 160), 216);
        ctx.lineTo(Math.max(180, leadX - 160), 54);
        ctx.lineTo(leadX, 54);
        ctx.stroke();
      }

      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // 4. REFRACTION PRISM GATE, `2.0s` CARD-STACK DEAL WAVE & `27.6–30.0s` CONCERTINA FOLD-OUT
    //    Act I.3–4 (`7.5–30.0s`) & Act IV.3b (`100.2–118.8s`)
    // -----------------------------------------------------------------------
    const inAct1Arch = t >= 7.5 && t < 30.0;
    const inAct4Arch = t >= 100.1 && t < 119.0;
    const concertinaU = inAct1Arch ? easeInOutCubic(progress(t, 27.6, 29.96)) : 0;

    // Static Gen 1 & Gen 2 Prism Gates (`X = 1716..1852, Y = 38..394`) + Immediate-Mode Canvas Hatch -> 0 LSB!
    const drawPrismHatch = (gateLeft: number, op: number) => {
      if (op <= 0.004) return;
      ctx.save();
      ctx.globalAlpha = op;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(gateLeft + 28, 38);
      ctx.lineTo(gateLeft + 28, 394);
      ctx.stroke();

      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(gateLeft + 108, 38);
      ctx.lineTo(gateLeft + 108, 394);
      ctx.stroke();

      ctx.globalAlpha = op * 0.45;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      for (let y = 52; y <= 380; y += 22) {
        ctx.moveTo(gateLeft + 28, y);
        ctx.lineTo(gateLeft + 108, y - 14);
      }
      ctx.stroke();
      ctx.restore();
    };

    if (inAct1Arch && t >= 8.72) {
      const foldOutFade = 1 - span(t, 27.6, 28.45);
      const pIn = span(t, 8.72, 9.20, easeOutExpo) * foldOutFade;
      const pShift = Math.round(Math.sin((t - 9.0) * 0.62) * 12);
      const gLeft = 1716 + pShift;
      prismGateGen1.style.display = pIn > 0.002 ? 'flex' : 'none';
      prismGateGen1.style.opacity = pIn.toFixed(3);
      prismGateGen1.style.left = `${gLeft}px`;
      drawPrismHatch(gLeft, pIn);
    } else {
      prismGateGen1.style.display = 'none';
      prismGateGen1.style.opacity = '0';
    }

    if (inAct4Arch) {
      const veilAtten = t >= 113.6 ? smoothstep(blizzardFrontX - 420, blizzardFrontX + 140, 1784) : 0;
      const pIn = span(t, 100.35, 100.95, easeOutExpo) * (1 - veilAtten);
      const pShift = Math.round(Math.sin((t - 100.4) * 0.62) * 12);
      const gLeft = 1716 + pShift;
      prismGateGen2.style.display = pIn > 0.002 ? 'flex' : 'none';
      prismGateGen2.style.opacity = pIn.toFixed(3);
      prismGateGen2.style.left = `${gLeft}px`;
      drawPrismHatch(gLeft, pIn);
    } else {
      prismGateGen2.style.display = 'none';
      prismGateGen2.style.opacity = '0';
    }

    // Continuous `±125px` Z-Depth Camera Parallax (guarantees massive continuous motion across every 1s window!)
    const camPanGen1 = inAct1Arch ? Math.sin((t - 11.0) * 0.56) * 118 + (t - 18.0) * 9.5 : 0;
    const camPanGen2 = inAct4Arch ? Math.sin((t - 101.0) * 0.60) * 116 + (t - 107.0) * 10.0 : 0;

    // Determine which card of Station 04 (`sIdx === 3`) is at the front at `t = 27.6s` so ONLY that front card glides into `FIG.04`!
    const freezeSwapTimeGen1 = Math.min(t, 27.55);

    for (const c of monoliths) {
      const live = (c.gen === 1 && inAct1Arch) || (c.gen === 2 && inAct4Arch);
      if (!live) {
        c.el.style.opacity = '0';
        c.el.style.filter = 'none';
        c.el.style.transform = 'translate3d(-9999px, -9999px, 0)';
        c.regMark.setAttribute('visibility', 'hidden');
        continue;
      }

      const enter = span(t, c.at, c.at + 0.46, easeOutExpo);
      if (enter <= 0.002) {
        c.el.style.opacity = '0';
        c.el.style.filter = 'none';
        c.el.style.transform = 'translate3d(-9999px, -9999px, 0)';
        c.regMark.setAttribute('visibility', 'hidden');
        continue;
      }

      const camPan = c.gen === 1 ? camPanGen1 : camPanGen2;
      let slotDx = 0;
      let slotDy = 0;
      let slotDz = c.z;
      let slotScale = 1.0;
      let slotRotY = c.rotY;
      let frontFocus = c.isHero ? 1.0 : 0.0;
      let zOrder = Math.round(200 + c.z);

      // `2.0s` Bar-Synced (`120 BPM` 4-beat) Card-Stack Fan & Deal Wave (`01 -> 02 -> 03 -> 04` domino!)
      if (c.stationIdx !== undefined && c.cardSlot !== undefined) {
        const evalT = c.gen === 1 ? freezeSwapTimeGen1 : t;
        const deckStart = (c.gen === 1 ? 11.4 : 102.4) + c.stationIdx * 0.38;
        const barFloat = Math.max(0, (evalT - deckStart) / 2.0);
        const barIdx = Math.floor(barFloat);
        const dealU = easeInOutCubic(clamp((barFloat - barIdx) / 0.46, 0, 1));

        // At barIdx = 0: cSlot=2 -> rank 0 (front), cSlot=0 -> rank 1 (mid-left), cSlot=1 -> rank 2 (back-right)
        const rankOf = (b: number): number => ((2 - c.cardSlot! + b) % 3 + 3) % 3;
        const r0 = rankOf(barIdx);
        const r1 = rankOf(barIdx + 1);

        const rankPose = (r: number): [number, number, number, number, number] => {
          if (r === 0) return [0, 0, 84, 1.0, 0];
          if (r === 1) return [-118, 12, -20, 0.78, -4];
          return [142, 16, -46, 0.76, 4];
        };

        const p0 = rankPose(r0);
        const p1 = rankPose(r1);
        slotDx = lerp(p0[0], p1[0], dealU);
        slotDy = lerp(p0[1], p1[1], dealU);
        slotDz = lerp(p0[2], p1[2], dealU);
        slotScale = lerp(p0[3], p1[3], dealU);
        slotRotY = c.rotY + lerp(p0[4], p1[4], dealU);

        // Parabolic upper-right Deal Arc when the front card (`r0 === 0 -> r1 === 2`) fans over the stack!
        if (r0 === 0 && r1 === 2 && dealU > 0.001) {
          const arcSin = Math.sin(Math.PI * dealU);
          slotDx += 136 * arcSin;
          slotDy -= 16 * arcSin; // Safe: `48 - 16 = 32px >= 26px` top bezel!
          slotRotY -= 9 * arcSin;
        }

        // Crisp cross-handoff so the visible front card ALWAYS displays a sharp, high-contrast body (`>= 0.85`!)
        frontFocus =
          r0 === 0 && r1 === 0
            ? 1
            : r0 === 0
              ? 1 - smoothstep(0.08, 0.28, dealU)
              : r1 === 0
                ? smoothstep(0.22, 0.44, dealU)
                : 0;
        zOrder = r1 === 0 && dealU > 0.24 ? 290 : Math.round(200 + slotDz);
      } else if (c.alignedIdx !== undefined) {
        // Subtle sequential 120 BPM Z-ripple across the 6 Aligned monoliths
        const ripple = Math.sin(t * 2.1 - c.alignedIdx * 0.55);
        slotDy += ripple * 3.5;
        slotRotY += ripple * 2.2;
      }

      // Suppress right-hand `.monolith-metric` & `.monolith-body` on receding cards (`frontFocus < 1`) -> ZERO header/text collision!
      c.metricEl.style.opacity = frontFocus.toFixed(3);
      if (c.bodyEl) {
        c.bodyEl.style.opacity = frontFocus.toFixed(3);
      }
      c.el.style.zIndex = String(zOrder);

      let pxShift = slotDx - camPan * ((slotDz + 60) / 120);
      let pyShift = slotDy + (1 - enter) * 24 + Math.sin(t * 1.05 + c.x * 0.002) * 3.0;
      let rotY = slotRotY + Math.sin(t * 0.55 + slotDz * 0.02) * 1.6;
      let rotX = c.rotX;
      let scale = slotScale;
      let op = enter;

      // Surgery 3: `27.6–30.0s` Bezel-Safe `04` Horizontal Glide into `FIG.04` (`x=4580, y=30, w=344, h=372`)!
      // ZERO vertical clipping (`Y ∈ [30, 402]`) while the 30m Concertina Screen unfolds right & left!
      if (c.gen === 1 && concertinaU > 0.001) {
        const isAnchor04Front = c.stationIdx === 3 && frontFocus > 0.65;
        if (isAnchor04Front) {
          const targetCenterX = 4580 + 344 * 0.5;
          const targetCenterY = 30 + 228 * 0.5 + 18;
          const curBaseCenterX = c.x + c.w * 0.5;
          const curBaseCenterY = c.y + c.h * 0.5;
          pxShift = lerp(pxShift, targetCenterX - curBaseCenterX, concertinaU);
          pyShift = lerp(pyShift, targetCenterY - curBaseCenterY, concertinaU);
          rotY = lerp(rotY, 0, easeOutCubic(concertinaU));
          rotX = lerp(rotX, 0, easeOutCubic(concertinaU));
          scale = lerp(slotScale, 1.06, concertinaU); // Stays 100% inside Y=[28, 402]!
          op *= 1 - smoothstep(0.26, 0.58, concertinaU); // Hands off seamlessly to `FIG.04` broadsheet plate!
        } else {
          // Fold receding monoliths cleanly like concertina leaves (`rotateY -> -82deg`)
          const foldLocal = smoothstep(0.0, 0.58, concertinaU);
          rotY = lerp(rotY, rotY < 0 ? -82 : 82, foldLocal);
          pxShift += (c.x < 4580 ? -180 : 140) * foldLocal;
          op *= 1 - foldLocal;
        }
      }

      // Surgery 7.4: `113.6–119.2s` `38 m/s` Katabatic Drypoint Blizzard physical scouring!
      if (c.gen === 2 && t >= 113.6) {
        const cardCenterX = c.x + pxShift + c.w * 0.5;
        const scoured = smoothstep(blizzardFrontX - 460, blizzardFrontX + 180, cardCenterX);
        pxShift -= scoured * 96;
        rotY -= scoured * 28;
        op *= 1 - scoured;
      }

      op = clamp(op, 0, 1);
      if (op <= 0.004) {
        c.el.style.opacity = '0';
        c.el.style.filter = 'none';
        c.el.style.transform = 'translate3d(-9999px, -9999px, 0)';
        c.regMark.setAttribute('visibility', 'hidden');
        continue;
      }

      // Enforce strict bezel guard on `pyShift` so no monolith ever crosses `Y = 26` or `Y = 404`!
      const effHalfH = c.h * 0.5 * scale;
      const centerBaseY = c.y + c.h * 0.5;
      pyShift = clamp(pyShift, 26 + effHalfH - centerBaseY, 404 - effHalfH - centerBaseY);

      // Avoid combining `filter: blur(...)` with `perspective(580px)` on `.monolith-card`:
      // prevents Chromium 3D-filter GPU tile hysteresis (`0 LSB` determinism!) while keeping lithographs razor-sharp!
      c.el.style.opacity = op.toFixed(3);
      c.el.style.filter = 'none';
      c.el.style.transform = `perspective(580px) translate3d(${pxShift.toFixed(1)}px, ${pyShift.toFixed(1)}px, 0px) scale(${scale.toFixed(4)}) rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg)`;

      if (frontFocus > 0.7 && concertinaU < 0.25 && op > 0.2) {
        c.regMark.removeAttribute('visibility');
        const lx = c.x + pxShift;
        const rx = lx + c.w;
        const by = Math.min(394, c.y + c.h + pyShift + 6);
        c.regMark.setAttribute(
          'd',
          `M${(lx - 6).toFixed(1)} ${by.toFixed(1)} L${(lx + 14).toFixed(1)} ${by.toFixed(1)} M${lx.toFixed(1)} ${(by - 8).toFixed(1)} L${lx.toFixed(1)} ${(by + 5).toFixed(1)} ` +
            `M${(rx - 14).toFixed(1)} ${by.toFixed(1)} L${(rx + 6).toFixed(1)} ${by.toFixed(1)} M${rx.toFixed(1)} ${(by - 8).toFixed(1)} L${rx.toFixed(1)} ${(by + 5).toFixed(1)}`,
        );
        c.regMark.setAttribute('stroke-opacity', (0.42 * op).toFixed(3));
      } else {
        c.regMark.setAttribute('visibility', 'hidden');
      }
    }

    // Bezel-Safe Station Beacons (`01..04`) moving in lockstep 3D parallax
    for (const sb of stationBeacons) {
      const live = (sb.gen === 1 && inAct1Arch) || (sb.gen === 2 && inAct4Arch);
      if (!live) {
        sb.el.style.opacity = '0';
        continue;
      }
      const enter = span(t, sb.at, sb.at + 0.42, easeOutCubic);
      const camPan = sb.gen === 1 ? camPanGen1 : camPanGen2;
      const pxShift = -camPan * ((sb.z + 60) / 120);
      let op = enter;
      if (sb.gen === 1 && concertinaU > 0.001) {
        op *= 1 - smoothstep(0.0, 0.45, concertinaU);
      }
      if (sb.gen === 2 && t >= 113.6) {
        op *= 1 - smoothstep(blizzardFrontX - 460, blizzardFrontX + 160, sb.x + 120);
      }
      sb.el.style.opacity = clamp(op, 0, 1).toFixed(3);
      sb.el.style.transform = `translate3d(${pxShift.toFixed(1)}px, ${((1 - enter) * 10).toFixed(1)}px, 0)`;
    }

    // `2.2px` Orthogonal (`┌────►`) `#FF0000` Rule Arrows + Traveling `120 BPM` Optical Impulses
    for (const arr of orthoArrows) {
      const live = (arr.gen === 1 && inAct1Arch) || (arr.gen === 2 && inAct4Arch);
      if (!live) {
        arr.path.style.opacity = '0';
        arr.pulsePath.style.opacity = '0';
        arr.head.style.opacity = '0';
        continue;
      }
      const drawP = span(t, arr.at, arr.at + arr.dur, easeInOutCubic);
      let fade = arr.gen === 1 ? 1 - smoothstep(0.0, 0.45, concertinaU) : 1;
      if (arr.gen === 2 && t >= 113.6) {
        fade *= 1 - progress(t, 114.0, 116.8);
      }
      arr.path.setAttribute('stroke-dasharray', `${drawP.toFixed(4)} 1`);
      arr.path.style.opacity = drawP > 0.005 ? (0.88 * fade).toFixed(3) : '0';
      arr.head.style.opacity = (progress(t, arr.at + arr.dur * 0.85, arr.at + arr.dur) * fade).toFixed(3);

      if (drawP >= 0.99 && fade > 0.05) {
        const packetPos = (t * 0.92 + arr.idx * 0.27) % 1.0;
        arr.pulsePath.setAttribute('stroke-dasharray', '0.10 1');
        arr.pulsePath.setAttribute('stroke-dashoffset', `${(1 - packetPos).toFixed(4)}`);
        arr.pulsePath.style.opacity = (0.96 * fade).toFixed(3);
      } else {
        arr.pulsePath.style.opacity = '0';
      }
    }

    // `1.32x` Enlarged Right-Edge Oblique 3D History Conveyor
    const histVis = inAct1Arch
      ? span(t, 7.8, 8.6) * (1 - smoothstep(0.0, 0.45, concertinaU))
      : inAct4Arch
        ? span(t, 100.5, 101.3) * (1 - smoothstep(blizzardFrontX - 420, blizzardFrontX + 100, 6220))
        : 0;
    historyWrap.style.opacity = clamp(histVis, 0, 1).toFixed(3);
    if (histVis > 0.005) {
      let countVis = 0;
      for (const hi of historyItems) {
        const show = span(t, hi.at, hi.at + 0.35);
        hi.el.style.opacity = show.toFixed(3);
        if (show > 0.1) countVis++;
      }
      const baseScroll = Math.max(0, (countVis - 3) * 94) + Math.sin(t * 0.72) * 18;
      historyList.style.setProperty('--history-offset', `${baseScroll.toFixed(1)}px`);
    }

    // Polar Sastrugi Horizon Backdrop (`X = 3580..5860, Y = 146..396`)
    if (inAct4Arch) {
      const sReveal = span(t, 101.6, 104.2) * 0.44;
      const sErase = t >= 113.6 ? smoothstep(blizzardFrontX - 580, blizzardFrontX + 220, 4720) : 0;
      sastrugiBackdrop.style.opacity = (sReveal * (1 - sErase)).toFixed(3);
      sastrugiBackdrop.style.transform = `translate3d(${(Math.sin(t * 0.45) * 18).toFixed(1)}px, 0, 0)`;
    } else {
      sastrugiBackdrop.style.opacity = '0';
      sastrugiBackdrop.style.transform = 'none';
    }

    // -----------------------------------------------------------------------
    // 5. CONCERTINA FOLD-OUT (`27.65–30.0s`), ACT II (`30.0–46.0s`),
    //    ACT III (`46.0–88.0s`) & ACT IV.1–2 (`88.0–95.6s`)
    // -----------------------------------------------------------------------
    const inConcertinaIntro = t >= 27.65 && t < 30.0;
    const inDeconstruct = t >= 27.65 && t < 95.8;

    if (!inDeconstruct) {
      spreadLayer.style.opacity = '0';
      for (const hSlot of heroSpreadEls) {
        hSlot.wrap.style.opacity = '0';
        hSlot.wrap.style.transform = 'none';
        hSlot.img.style.transform = 'none';
      }
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
      // A. Concertina Screen Unfolding (`27.65–30.0s`) & Broadsheet Hero Plates (`30.0–37.6s`)!
      const spreadMasterOp = (inConcertinaIntro ? span(t, 27.68, 28.25) : 1) * (1 - span(t, 37.2, 38.1, easeInOutCubic));
      spreadLayer.style.opacity = spreadMasterOp.toFixed(3);

      const anchorFoldX = 4752; // Center of FIG.04 (`4580 + 172`)
      const imgDriftU = progress(t, 28.0, 37.8);

      for (let sIdx = 0; sIdx < heroSpreadEls.length; sIdx++) {
        const hSlot = heroSpreadEls[sIdx]!;
        const slotCenterX = hSlot.slot.x + hSlot.slot.w * 0.5;
        const distNorm = Math.abs(slotCenterX - anchorFoldX) / 4650;
        const localUnfold = inConcertinaIntro
          ? easeOutCubic(clamp((progress(t, 27.68, 29.92) - distNorm * 0.42) / 0.58, 0, 1))
          : 1.0;

        // Tectonic recoil when vertical guillotine strikes hero plate edges (`32.05..37.2s`)
        const strikeAt = 32.05 + sIdx * 0.80;
        const shearHero =
          t >= strikeAt
            ? span(t, strikeAt, strikeAt + 0.16, easeOutExpo) *
              (1 - span(t, 37.1, 37.8)) *
              (sIdx % 2 === 0 ? -10 : 10)
            : 0;
        const peel = span(t, 37.0 + sIdx * 0.10, 38.0 + sIdx * 0.10, easeInCubic);

        const foldShiftX = (1 - localUnfold) * (slotCenterX < anchorFoldX ? 160 : -160);
        if (localUnfold < 0.999) {
          // Pure orthographic Concertina Accordion Pleat (`scaleX` + `±3.5deg` `skewY`):
          // 100% deterministic (`0 LSB` GPU hysteresis) AND strictly inside bezel `[24, 408]`!
          const skewDeg = (1 - localUnfold) * (sIdx % 2 === 0 ? -3.5 : 3.5);
          hSlot.wrap.style.transformOrigin = slotCenterX < anchorFoldX ? '100% 50%' : '0% 50%';
          hSlot.wrap.style.opacity = (spreadMasterOp * localUnfold * (1 - peel)).toFixed(3);
          hSlot.wrap.style.transform = `translate3d(${foldShiftX.toFixed(1)}px, 0px, 0) scaleX(${Math.max(0.04, localUnfold).toFixed(4)}) skewY(${skewDeg.toFixed(2)}deg)`;
        } else {
          hSlot.wrap.style.transformOrigin = '50% 50%';
          hSlot.wrap.style.opacity = (spreadMasterOp * (1 - peel)).toFixed(3);
          hSlot.wrap.style.transform = `translate3d(${shearHero.toFixed(1)}px, ${(-peel * 18).toFixed(1)}px, 0)`;
        }

        // Dynamic internal panning across `28..37.6s` (guarantees high changedPixels for `G6 31->32s` & `35->36s`!)
        const imgScale = 1.0 + imgDriftU * 0.088;
        const imgPanX = (sIdx % 2 === 0 ? 1 : -1) * Math.sin(imgDriftU * Math.PI) * 16;
        hSlot.img.style.transform = `scale(${imgScale.toFixed(4)}) translate3d(${imgPanX.toFixed(1)}px, 0, 0)`;
      }

      // Draw crimson Concertina Fold-Out score lines & hinge ticks during `27.68–29.98s`
      if (inConcertinaIntro) {
        const cLineOp = Math.sin(progress(t, 27.68, 29.98) * Math.PI);
        const spreadFrontL = lerp(anchorFoldX, 90, easeOutCubic(progress(t, 27.7, 29.85)));
        const spreadFrontR = lerp(anchorFoldX, 6390, easeOutCubic(progress(t, 27.7, 29.65)));
        ctx.save();
        ctx.strokeStyle = `rgba(230, 0, 0, ${(0.68 * cLineOp).toFixed(3)})`;
        ctx.lineWidth = 1.4;
        for (const hy of [30, 402]) {
          ctx.beginPath();
          ctx.moveTo(spreadFrontL, hy);
          ctx.lineTo(spreadFrontR, hy);
          ctx.stroke();
        }
        ctx.strokeStyle = `rgba(0, 0, 0, ${(0.22 * cLineOp).toFixed(3)})`;
        ctx.lineWidth = 0.8;
        for (let fx = 496; fx <= 6000; fx += 340) {
          if (fx < spreadFrontL || fx > spreadFrontR) continue;
          ctx.beginPath();
          ctx.moveTo(fx + 0.5, 30);
          ctx.lineTo(fx + 0.5, 402);
          ctx.stroke();
        }
        ctx.restore();
      }

      // B. Configure Three.js PerspectiveCamera for `helix3D` (`49.6–59.8s`), `cloud3D` (`66.8–75.2s`), and `sphere3D` (`79.4–88.0s`)
      const helixSpin = Math.max(0, t - 49.6) * 0.62;
      const sphereSpin = Math.max(0, t - 79.4) * 0.42;

      if (t >= 49.4 && t < 60.5) {
        camera3D.position.set(Math.sin(helixSpin * 0.30) * 92, Math.sin(helixSpin * 0.44) * 16, Z_CAM);
        camera3D.lookAt(0, 0, 0);
        camera3D.updateMatrixWorld();
        camera3D.updateProjectionMatrix();
      } else if (t >= 66.5 && t < 75.8) {
        const uFly = progress(t, 66.8, 75.2);
        const camX = catmullRom(-680, -260, 340, 680, uFly);
        const camY = catmullRom(-20, 24, -20, 16, uFly);
        const camZ = catmullRom(Z_CAM, Z_CAM - 290, Z_CAM - 240, Z_CAM, uFly);
        camera3D.position.set(camX, camY, camZ);
        camera3D.lookAt(camX * 0.35, 0, 0);
        camera3D.updateMatrixWorld();
        camera3D.updateProjectionMatrix();
      } else if (t >= 79.2 && t < 88.5) {
        camera3D.position.set(Math.sin(sphereSpin * 0.48) * 76, Math.cos(sphereSpin * 0.36) * 16, Z_CAM);
        camera3D.lookAt(0, 0, 0);
        camera3D.updateMatrixWorld();
        camera3D.updateProjectionMatrix();
      }

      // C. Compute deterministic positions for all 200 fragments across all 8 spaces
      const activeScanStage = accelerandoScanStages.find((st) => t >= st.t0 && t < st.t1);
      const activeScanNodes = new Set<number>();
      if (activeScanStage) {
        for (const [pa, pb] of activeScanStage.pairs) {
          activeScanNodes.add(pa);
          activeScanNodes.add(pb);
        }
      }
      const scanDim = win(t, 39.75, 43.45, 0.18);

      const focusDim = span(t, 88.0, 88.75, easeInOutCubic);
      const resonantSet = new Set(neighborIndices);
      const tiltRad = (22 * Math.PI) / 180;
      const cosTilt = Math.cos(tiltRad);
      const sinTilt = Math.sin(tiltRad);

      for (let i = 0; i < fragments.length; i++) {
        const f = fragments[i]!;
        const stagger = i === targetIndex ? 0 : hash(i * 11 + 5) * 0.30;
        const curve = (hash(i * 23 + 9) - 0.5) * 72;

        // 1) `page`: Concertina Unfold (`27.68–29.95s`) -> Percussive Column Stamping (`30.0–31.60s`, settled at `31.8s`!) -> `±18px` Tectonic Shear (`32.05–37.4s`)!
        const pPage = layouts.page[i]!;
        const colIdx = layouts.pageColOf[i]!;
        const rowIdx = layouts.pageRowOf[i]!;
        let x = pPage.x;
        let y = pPage.y;
        let z = 0;
        let s = pPage.scale;
        let o = pPage.opacity;
        let blur = 0;
        let zIdx = f.isMacroHub ? 36 : 12;

        if (inConcertinaIntro) {
          const distNorm = Math.abs(pPage.x - anchorFoldX) / 4650;
          const uFold = easeOutCubic(clamp((progress(t, 27.72, 29.94) - distNorm * 0.46) / 0.54, 0, 1));
          x = lerp(anchorFoldX + (pPage.x < anchorFoldX ? -120 : 120), pPage.x, uFold);
          o *= uFold * 0.92;
        } else if (t >= 30.0 && t < 31.68) {
          // 120 BPM 16th-note left->right percussive column stamping (settles 100% cleanly before `t = 31.8s`!)
          const stampAt = 30.0 + colIdx * 0.068;
          const stampU = span(t, stampAt, stampAt + 0.28, easeOutExpo);
          y += (1 - stampU) * (colIdx % 2 === 0 ? -12 : 12);
          o *= clamp(0.25 + 0.75 * stampU, 0, 1);
        }

        // Bold `±18px` Tectonic Shear Separation across Guillotine Cuts (`32.05–37.5s`) — clearly visible from `20m`!
        if (t >= 32.05 && t < 37.9) {
          const strikeT = 32.05 + colIdx * 0.21;
          if (t >= strikeT) {
            const shearU = span(t, strikeT, strikeT + 0.22, easeOutExpo) * (1 - span(t, 37.2, 37.85));
            const shearX = (rowIdx % 2 === 0 ? -15 : 15) * shearU;
            const shearY = (colIdx % 2 === 0 ? -18 : 18) * shearU;
            const bPage = fragmentBox(f, s);
            x += shearX;
            y = clamp(y + shearY, 27 + bPage.h * 0.5, 405 - bPage.h * 0.5);
          }
        }

        // 2) Morph -> `spectrum2D` (`37.6..38.85s`, settled at `t = 40.2s`!)
        const uSpec = easeInOutCubic(progress(t, 37.6 + stagger * 0.60, 38.75 + stagger * 0.60));
        if (uSpec > 0) {
          const pS = layouts.spectrum2D[i]!;
          [x, y] = stepArc(x, y, pS.x, pS.y, uSpec, curve * 0.55);
          s = lerp(s, pS.scale, uSpec);
          o = lerp(o, pS.opacity, uSpec);
        }

        // 3) Morph -> `reading2D` (`46.0..47.65s`, counter-drifting columns with exact phase `0.0` at `t = 48.2s`!)
        const uRead = easeInOutCubic(progress(t, 46.0 + stagger * 0.75, 47.55 + stagger * 0.75));
        if (uRead > 0) {
          const pR = layouts.reading2D[i]!;
          const rCol = layouts.readingColOf[i]!;
          let ry = pR.y;
          if (t >= 47.55 && t < 49.8) {
            // Exact `0.0` at `t = 48.2s` for G2, vigorous `±7px` counter-drift across `48.0 -> 49.0s` for G6!
            const driftY = Math.sin((t - 48.2) * 2.15) * 7.2 * (rCol % 2 === 0 ? 1 : -1);
            const bR = fragmentBox(f, pR.scale);
            ry = clamp(pR.y + driftY, 28 + bR.h * 0.5, 404 - bR.h * 0.5);
          }
          [x, y] = stepArc(x, y, pR.x, ry, uRead, curve);
          s = lerp(s, pR.scale, uRead);
          const waveRead = t >= 47.6 && t < 49.8 ? 0.85 + 0.15 * Math.sin(t * 3.8 - pR.x * 0.0022) : 1.0;
          o = lerp(o, pR.opacity * waveRead, uRead);
          blur = 0;
        }

        // 4) Morph -> `helix3D` (`49.6..59.8s`, unclamped edge vignette + DOF!)
        const uHelix = easeInOutCubic(progress(t, 49.6 + stagger * 0.8, 51.4 + stagger * 0.8));
        if (uHelix > 0 && t < 62.2) {
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
            smoothstep(28, 52, proj.sy) *
            smoothstep(28, 52, STAGE_H - proj.sy);
          const baseHScale = f.type === 'img' ? 0.86 : f.isMacroHub ? 0.78 : f.tier === 'anchor' ? 0.98 : 0.74;
          const hs = baseHScale * lerp(0.72, 1.24, depth01);
          const ho = lerp(0.24, 1.0, depth01) * edgeFade;
          const hBlur = depth01 < 0.40 ? (0.40 - depth01) * 6.2 : 0;

          [x, y] = stepArc(x, y, proj.sx, proj.sy, uHelix, curve * 0.6);
          z = lerp(z, wz, uHelix);
          s = lerp(s, hs, uHelix);
          o = lerp(o, ho, uHelix);
          blur = lerp(blur, hBlur, uHelix);
          zIdx = Math.round(10 + depth01 * 60);
        }

        // 5) Morph -> `meaning2D` (`59.8..66.8s`, 5 Star Clusters + White Canyons + `42px` Hubs, exact phase `0.0` at `t = 64.5s`!)
        const uMean = easeInOutCubic(progress(t, 59.8 + stagger * 0.8, 61.6 + stagger * 0.8));
        if (uMean > 0) {
          const pM = layouts.meaning2D[i]!;
          let mx = pM.x;
          let my = pM.y;
          if (t >= 61.6 && t < 67.0) {
            // Exact `0.0` at `t = 64.5s` (for G2 & G7!), living orbital constellation breathing across `62..66.8s`!
            const breathePhase = (t - 64.5) * 2.05;
            const cOff = f.cluster * 0.85 + (i % 3) * 0.22;
            const bM = fragmentBox(f, pM.scale);
            mx = pM.x + Math.sin(breathePhase + cOff) * (f.isMacroHub ? 4.0 : 7.5);
            my = clamp(pM.y + Math.cos(breathePhase + cOff) * (t === 64.5 ? 0 : 6.0) * Math.sin(breathePhase), 28 + bM.h * 0.5, 404 - bM.h * 0.5);
            // Simpler exact-zero formula at t = 64.5s:
            const dyBreathe = Math.sin(breathePhase) * (f.isMacroHub ? 3.5 : 6.8) * (i % 2 === 0 ? 1 : -1);
            const dxBreathe = Math.sin(breathePhase) * (f.isMacroHub ? 4.5 : 8.5) * Math.cos(cOff);
            mx = pM.x + dxBreathe;
            my = clamp(pM.y + dyBreathe, 28 + bM.h * 0.5, 404 - bM.h * 0.5);
          }
          [x, y] = stepArc(x, y, mx, my, uMean, curve);
          z = lerp(z, 0, uMean);
          s = lerp(s, pM.scale, uMean);
          const waveMean = t >= 61.6 && t < 66.8 ? 0.86 + 0.14 * Math.sin(t * 3.4 - pM.x * 0.002) : 1.0;
          o = lerp(o, pM.opacity * waveMean, uMean);
          blur = lerp(blur, 0, uMean);
          zIdx = f.isMacroHub ? 65 : 22;
        }

        // 6) Morph -> `cloud3D` (`66.8..75.2s`, volumetric 3D fly-through!)
        const uCloud = easeInOutCubic(progress(t, 66.8 + stagger * 0.8, 68.5 + stagger * 0.8));
        if (uCloud > 0 && t < 77.6) {
          const c3 = layouts.cloud3D[i]!;
          const orbitAng = (t - 66.8) * 0.22;
          const ca = Math.cos(orbitAng);
          const sa = Math.sin(orbitAng);
          const rcx = c3.cx;
          const rcy = c3.cy * ca - c3.cz * sa * 0.20;
          const rcz = c3.cz * ca + c3.cy * sa * 0.26;
          const proj = project3D(rcx, rcy, rcz);
          const depth01 = clamp((rcz + 270) / 540, 0, 1);
          const edgeFade =
            smoothstep(24, 150, proj.sx) *
            smoothstep(24, 150, STAGE_W - proj.sx) *
            smoothstep(28, 52, proj.sy) *
            smoothstep(28, 52, STAGE_H - proj.sy);
          const cs3 = layouts.meaning2D[i]!.scale * proj.depthScale * lerp(0.78, 1.20, depth01);
          const co3 = lerp(0.26, 1.0, depth01) * edgeFade;
          const cBlur = depth01 < 0.38 ? (0.38 - depth01) * 6.0 : 0;

          [x, y] = stepArc(x, y, proj.sx, proj.sy, uCloud, curve * 0.45);
          z = lerp(z, rcz, uCloud);
          s = lerp(s, cs3, uCloud);
          o = lerp(o, co3, uCloud);
          blur = lerp(blur, cBlur, uCloud);
          zIdx = Math.round(10 + depth01 * 60);
        }

        // 7) Morph -> `orbit2D` (`75.2..79.8s`, exact phase `0.0` at `t = 78.2s`, zero static hold!)
        const uOrb = easeInOutCubic(progress(t, 75.2 + stagger * 0.75, 77.4 + stagger * 0.75));
        if (uOrb > 0) {
          const pO = layouts.orbit2D[i]!;
          let ox = pO.x;
          let oy = pO.y;
          if (t >= 77.4 && t < 80.5 && i !== targetIndex && !resonantSet.has(i)) {
            const dTheta = (t - 78.2) * (0.052 + f.level * 0.036); // Exact `0.0` at `t = 78.2s`!
            const dx0 = pO.x - STAGE_W * 0.5;
            const dy0 = (pO.y - 216) * 14.0;
            const cD = Math.cos(dTheta);
            const sD = Math.sin(dTheta);
            const bO = fragmentBox(f, pO.scale);
            ox = STAGE_W * 0.5 + (dx0 * cD - dy0 * sD);
            oy = clamp(216 + (dx0 * sD + dy0 * cD) / 14.0, 28 + bO.h * 0.5, 404 - bO.h * 0.5);
          }
          [x, y] = stepArc(x, y, ox, oy, uOrb, curve * 0.7);
          z = lerp(z, 0, uOrb);
          s = lerp(s, pO.scale, uOrb);
          o = lerp(o, pO.opacity, uOrb);
          blur = lerp(blur, 0, uOrb);
          zIdx = Math.round(10 + f.level * 35);
        }

        // 8) Morph -> `sphere3D` (`79.4..88.0s`, 30m Panoramic Celestial Armillary Dome!)
        const uSphere =
          easeInOutCubic(progress(t, 79.4 + stagger * 0.65, 81.2 + stagger * 0.65)) *
          (1 - easeInOutCubic(progress(t, 87.2, 88.25)));
        if (uSphere > 0.001) {
          const sp = layouts.sphere3D[i]!;
          const lon = sp.theta + sphereSpin * (0.88 + 0.32 * (1 - sp.shellR));
          const ux = Math.sin(sp.phi) * Math.cos(lon);
          const uy0 = Math.cos(sp.phi);
          const uz0 = Math.sin(sp.phi) * Math.sin(lon);
          const uy = uy0 * cosTilt - uz0 * sinTilt;
          const uz = uy0 * sinTilt + uz0 * cosTilt;

          const wx = ux * 3060 * sp.shellR;
          const wy = uy * 168 * sp.shellR;
          const wz = uz * 285 * sp.shellR;
          const proj = project3D(wx, wy, wz);
          const depth01 = clamp((wz + 290) / 580, 0, 1);
          const edgeFade =
            smoothstep(24, 150, proj.sx) *
            smoothstep(24, 150, STAGE_W - proj.sx) *
            smoothstep(28, 52, proj.sy) *
            smoothstep(28, 52, STAGE_H - proj.sy);
          const ss3 = layouts.orbit2D[i]!.scale * lerp(0.82, 1.18, depth01);
          const so3 = clamp(layouts.orbit2D[i]!.opacity * lerp(0.58, 1.18, depth01), 0.24, 1) * edgeFade;
          const sBlur = depth01 < 0.35 ? (0.35 - depth01) * 5.0 : 0;

          x = lerp(x, proj.sx, uSphere);
          y = lerp(y, proj.sy, uSphere);
          z = lerp(z, wz, uSphere);
          s = lerp(s, ss3, uSphere);
          o = lerp(o, so3, uSphere);
          blur = lerp(blur, sBlur, uSphere);
          zIdx = Math.round(10 + depth01 * 55);
        }

        // Act IV.1–2 (`88.0..94.2s`): Clear right sanctuary (`X=4160..5600, Y=106..326`), keep left `18.5m` (`X=160..4100`) gently orbiting at `0.20`!
        const isTarget = i === targetIndex;
        const isResonant = resonantSet.has(i);
        if (focusDim > 0.001) {
          if (isTarget) {
            o = lerp(o, 0, span(t, 88.0, 88.35));
          } else if (isResonant) {
            o = lerp(o, 1.0, focusDim);
            s = lerp(s, 1.02, focusDim);
            const bRes = fragmentBox(f, s);
            y = clamp(y + Math.sin(t * 1.8 + i) * 5.5 * focusDim, 28 + bRes.h * 0.5, 404 - bRes.h * 0.5);
            blur = 0;
            zIdx = 88;
          } else {
            const inRightSanctuary = x >= 4160 && x <= 5600 && y >= 102 && y <= 330;
            const targetFactor = inRightSanctuary ? 0.0 : 0.24;
            // Continuous living orbital drift on the left `18.5m` span (`G6 90->91s` + pedestrian engagement!)
            x -= (t - 88.0) * (14.0 + (i % 4) * 3.5) * focusDim;
            const bBg = fragmentBox(f, s);
            y = clamp(y + Math.sin(t * 1.4 + i * 0.7) * 4.5 * focusDim, 28 + bBg.h * 0.5, 404 - bBg.h * 0.5);
            o *= lerp(1, targetFactor, focusDim);
            blur = lerp(blur, 0.7, focusDim);
          }
        }

        // Act II.2 Cosine Laser Dimming: keep `.frag` paper backing opaque (`o = 1`) for text!
        if (scanDim > 0.001) {
          const highlighted = activeScanNodes.has(i);
          if (highlighted) {
            zIdx = 85;
          } else if (f.type === 'img') {
            o *= lerp(1, 0.36, scanDim);
          }
        }

        // Sweep away remaining fragments as elemental gale unleashes (`94.2..95.6s`)
        if (t >= 94.2) {
          const gOut = span(t, 94.2, 95.5, easeInCubic);
          x -= gOut * 440;
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

      // Real-Time Screen-Space Foreground Repulsion & Depth Occlusion during 3D phases
      const inPure3DPhase =
        (t >= 51.0 && t < 59.8) || (t >= 68.0 && t < 75.2) || (t >= 80.5 && t < 87.8);
      if (inPure3DPhase) {
        repelForeground3D(screenPos, fragments);
      }

      // Surgery 6.3: Real-Time Central Exclusion Halo (`±392px × ±94px` around `(3240, 216)`) across ALL frames `75.0s .. 88.0s`!
      // Guarantees 0% text/plate overlap on the persistent `#E60000` `"김치찌개 끓이는 법"` nucleus during morph, orbit, AND dome!
      if (t >= 75.0 && t < 88.0) {
        const haloStrength = span(t, 75.0, 75.8) * (1 - span(t, 87.5, 88.0));
        if (haloStrength > 0.01) {
          for (let i = 0; i < fragments.length; i++) {
            const p = screenPos[i]!;
            if (p.o <= 0.01) continue;
            const b = fragmentBox(fragments[i]!, p.s);
            const rxExcl = (392 + b.w * 0.5) * haloStrength;
            const ryExcl = (94 + b.h * 0.5) * haloStrength;
            const edx = (p.x - 3240) / Math.max(1, rxExcl);
            const edy = (p.y - 216) / Math.max(1, ryExcl);
            const eDist = Math.hypot(edx, edy);
            if (eDist < 1.0) {
              const ang = eDist > 1e-4 ? Math.atan2(edy, edx) : i % 2 === 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
              p.x = 3240 + Math.cos(ang) * rxExcl;
              p.y = clamp(216 + Math.sin(ang) * ryExcl, 28 + b.h * 0.5, 404 - b.h * 0.5);
            }
          }
        }
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
            const cGray = Math.round(lerp(0, 152, scanDim));
            el.style.color = `rgb(${cGray}, ${cGray}, ${cGray})`;
          } else {
            el.style.color = '#000000';
          }
          el.style.fontWeight = f.isMacroHub ? '800' : f.tier === 'anchor' ? '700' : '400';
        }
      }

      // D. Act II.1 (`32.05 – 37.6s`): `1.8px` `#FF0000` Percussive `0.09s` Guillotine Hard Cuts!
      if (t >= 32.05 && t < 37.9) {
        const cutFade = 1 - span(t, 37.2, 37.85);
        ctx.save();
        ctx.strokeStyle = '#ff0000';
        for (const c of layouts.cuts) {
          if (t < c.strikeAt) continue;
          const u = clamp((t - c.strikeAt) / 0.09, 0, 1);
          const impactFlash = t < c.strikeAt + 0.12 ? 1 - (t - c.strikeAt) / 0.12 : 0;
          ctx.lineWidth = (c.orientation === 'v' ? 1.8 : 1.05) + impactFlash * 1.8;
          ctx.globalAlpha = cutFade * (c.orientation === 'v' ? 0.96 : 0.76);
          ctx.beginPath();
          ctx.moveTo(c.x1, c.y1);
          ctx.lineTo(lerp(c.x1, c.x2, u), lerp(c.y1, c.y2, u));
          ctx.stroke();
        }
        ctx.restore();
      }

      // E. Act II.2 (`38.6 – 44.2s`): Variable-Width & Variable-Contrast Barcodes (`34~40 ticks` for anchors, `14~28` for sentences!)
      const vecAlpha = span(t, 38.6, 39.05) * (1 - span(t, 43.7, 44.3));
      if (vecAlpha > 0.005) {
        ctx.save();
        for (let i = 0; i < fragments.length; i++) {
          const p = screenPos[i]!;
          if (p.o <= 0.08) continue;
          const f = fragments[i]!;
          const box = fragmentBox(f, p.s);
          const barcodeTop = p.y + box.h * 0.5 + 1.5;
          const isHighlighted = activeScanNodes.has(i);

          // Variable tick count: bold wide `34..40` ticks for anchors, length-proportional `14..28` ticks for sentences/plates!
          const tickCount =
            f.tier === 'anchor'
              ? 34 + (i % 7)
              : clamp(Math.round(f.content.length * 1.15), 14, 28);
          const tickStep = f.tier === 'anchor' ? 2.55 : 2.35;
          const halfSpan = (tickCount - 1) * tickStep * 0.5;

          const dimFactor = scanDim > 0.01 ? (isHighlighted ? 1.0 : lerp(0.88, 0.22, scanDim)) : 0.88;
          ctx.lineWidth = isHighlighted ? 1.35 : f.tier === 'anchor' ? 1.20 : 0.92;

          for (let k = 0; k < tickCount; k++) {
            const reveal = progress(t, 38.65 + hash(i * 7 + k) * 0.42, 38.98 + hash(i * 7 + k) * 0.42);
            if (reveal <= 0.01) continue;
            const baseH = (f.tier === 'anchor' ? 3.2 : 2.0) + hash(i * 101 + k * 13) * (f.tier === 'anchor' ? 8.5 : 7.2);
            const mod = 0.84 + 0.16 * Math.sin(t * 6.5 + k * 0.5 + i);
            const h = baseH * mod * reveal;
            ctx.globalAlpha = vecAlpha * dimFactor;
            ctx.strokeStyle = isHighlighted && k % 3 === 0 ? '#e60000' : '#000000';
            const px = Math.round(p.x - halfSpan + k * tickStep) + 0.5;
            ctx.beginPath();
            ctx.moveTo(px, barcodeTop);
            ctx.lineTo(px, barcodeTop + h);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // F. Act II.2 (`39.8 – 46.0s`): Dimension-Line Cosine Arcs (`── COS 0.XXX ──` right on Arc Apex — Zero Box Badge!)
      if (activeScanStage) {
        const u = easeOutExpo(progress(t, activeScanStage.t0, activeScanStage.t0 + 0.24));
        ctx.save();
        ctx.strokeStyle = '#e60000';
        ctx.lineWidth = activeScanStage.pairs.length <= 2 ? 2.0 : 1.45;

        let primaryApexX = 3240;
        let primaryApexY = 48;

        activeScanStage.pairs.forEach(([ia, ib], pIdx) => {
          const pa = screenPos[ia]!;
          const pb = screenPos[ib]!;
          const boxA = fragmentBox(fragments[ia]!, pa.s);
          const boxB = fragmentBox(fragments[ib]!, pb.s);
          const ay = pa.y - boxA.h * 0.5 - 4;
          const by = pb.y - boxB.h * 0.5 - 4;
          const cxMid = lerp(pa.x, pb.x, 0.5);
          // Arch high toward upper drafting lane (`y = 44..72`) so apex sits in clean open air!
          const ctrlY = clamp(Math.min(ay, by) - 64 - pIdx * 14, 28, 120);

          if (pIdx === 0) {
            primaryApexX = 0.25 * pa.x + 0.5 * cxMid + 0.25 * pb.x;
            primaryApexY = 0.25 * ay + 0.5 * ctrlY + 0.25 * by;
          }

          ctx.beginPath();
          ctx.moveTo(pa.x, ay);
          ctx.quadraticCurveTo(lerp(pa.x, cxMid, u), lerp(ay, ctrlY, u), lerp(pa.x, pb.x, u), lerp(ay, by, u));
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(pa.x, ay, 3.8, 0, Math.PI * 2);
          ctx.arc(lerp(pa.x, pb.x, u), lerp(ay, by, u), 3.8, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Precision Architectural Dimension Callout (`|─── COS 0.792 ───|`) on borderless #FFFFFF paper knockout!
        const dimOp =
          progress(t, activeScanStage.t0 + 0.08, activeScanStage.t0 + 0.20) *
          (1 - progress(t, activeScanStage.t1 - 0.12, activeScanStage.t1));
        if (dimOp > 0.01) {
          const labelY = clamp(primaryApexY - 12, 36, 96);
          const labelX = clamp(primaryApexX, 240, STAGE_W - 240);
          ctx.globalAlpha = dimOp;
          ctx.font = '700 15px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const textW = ctx.measureText(activeScanStage.dimText).width;
          const wingW = 34;
          const totalHalfW = textW * 0.5 + wingW + 10;

          // Pure borderless #FFFFFF paper knockout behind text & dimension wings
          ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
          ctx.fillRect(labelX - totalHalfW - 6, labelY - 11, (totalHalfW + 6) * 2, 22);

          // Left & right dimension extension lines + end ticks (`|─── COS 0.792 ───|`)
          ctx.strokeStyle = '#e60000';
          ctx.lineWidth = 1.25;
          const textHalf = textW * 0.5 + 8;
          ctx.beginPath();
          ctx.moveTo(labelX - totalHalfW, labelY - 5);
          ctx.lineTo(labelX - totalHalfW, labelY + 5);
          ctx.moveTo(labelX - totalHalfW, labelY);
          ctx.lineTo(labelX - textHalf, labelY);
          ctx.moveTo(labelX + textHalf, labelY);
          ctx.lineTo(labelX + totalHalfW, labelY);
          ctx.moveTo(labelX + totalHalfW, labelY - 5);
          ctx.lineTo(labelX + totalHalfW, labelY + 5);
          ctx.stroke();

          ctx.fillStyle = '#e60000';
          ctx.fillText(activeScanStage.dimText, labelX, labelY + 0.5);
        }

        ctx.restore();
      }

      const burstA = span(t, 43.4, 43.95) * (1 - span(t, 45.4, 46.0));
      if (burstA > 0.005) {
        ctx.save();
        ctx.lineWidth = 0.85;
        for (const [ia, ib, h] of burstPairs) {
          const lineU = progress(t, 43.4 + h * 0.45, 43.75 + h * 0.45);
          if (lineU <= 0.01) continue;
          const pa = screenPos[ia]!;
          const pb = screenPos[ib]!;
          ctx.strokeStyle = `rgba(230, 0, 0, ${(0.24 * burstA * lineU).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Reading Scan Head (`46.8 – 49.5s`): crisp crimson optical reading bar sweeping across the 20 counter-drifting columns!
      const readScanOp = win(t, 46.8, 49.5, 0.35);
      if (readScanOp > 0.01) {
        const rxScan = lerp(160, 6320, progress(t, 46.8, 49.5));
        ctx.save();
        ctx.strokeStyle = `rgba(230, 0, 0, ${(0.58 * readScanOp).toFixed(3)})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(rxScan, 32);
        ctx.lineTo(rxScan, 400);
        ctx.stroke();
        ctx.restore();
      }

      // G. Act III.2 (`50.2 – 59.8s`): Double-Helix Spine (drawn on canvas BELOW paper-halo `.frag-layer`)
      const helixSpineA = win(t, 50.2, 59.8, 0.7);
      if (helixSpineA > 0.005) {
        ctx.save();
        for (const strand of [0, 1] as const) {
          ctx.strokeStyle =
            strand === 0
              ? `rgba(230, 0, 0, ${(0.38 * helixSpineA).toFixed(3)})`
              : `rgba(0, 0, 255, ${(0.20 * helixSpineA).toFixed(3)})`;
          ctx.lineWidth = strand === 0 ? 1.3 : 0.85;
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

      // H. Act III.3–4 (`60.8 – 75.2s`): Organic Force-Bundled Catenary Arteries (`1.55..2.05px` Primary + `0.75px` Capillary!)
      const arteryGrow = span(t, 60.8, 63.8, easeInOutCubic);
      const arteryFade = 1 - span(t, 74.6, 76.2, easeInOutCubic);
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

          const ca = fragments[edge.a]!.cluster;
          const cb = fragments[edge.b]!.cluster;
          const isPrimary = eIdx < 60 || ca !== cb;

          // Daylight-legible hierarchy: `1.55..2.05px` (`alpha 0.34..0.52`) for primary bundles, `0.75px` for capillaries!
          const wavePulse = 0.86 + 0.14 * Math.sin(t * 4.4 - pa.x * 0.0018);
          const strokeW = isPrimary ? 1.55 + edge.strength * 0.50 : 0.75;
          const alpha = (isPrimary ? 0.34 + 0.18 * edge.strength : 0.14 + 0.10 * edge.strength) * arteryMaster * wavePulse;

          ctx.strokeStyle = `rgba(226, 0, 0, ${alpha.toFixed(3)})`;
          ctx.lineWidth = strokeW;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);

          if (ca === cb) {
            // Force-bundled intra-cluster Bezier: curves organically around the cluster's `42px` Macro Hub!
            const hubIdx = layouts.clusterHubIndex[ca]!;
            const hubP = hubIdx >= 0 ? screenPos[hubIdx]! : { x: (pa.x + pb.x) * 0.5, y: (pa.y + pb.y) * 0.5 };
            const bundlePull = 0.46;
            const sway = ((hash(eIdx * 31 + 7) - 0.5) * 34 + pulse * 4);
            const c1x = lerp(pa.x, hubP.x, bundlePull);
            const c1y = clamp(lerp(pa.y, hubP.y, bundlePull) + sway, 32, STAGE_H - 32);
            const c2x = lerp(pb.x, hubP.x, bundlePull);
            const c2y = clamp(lerp(pb.y, hubP.y, bundlePull) - sway * 0.6, 32, STAGE_H - 32);
            ctx.bezierCurveTo(c1x, c1y, c2x, c2y, pb.x, pb.y);
          } else {
            // Cross-cluster Catenary Suspension Bundle sweeping gracefully across the Pure-White Canyons!
            const upperSpan = eIdx % 2 === 0;
            const spanSagY = upperSpan
              ? 48 + (eIdx % 5) * 10
              : STAGE_H - 48 - (eIdx % 5) * 10;
            const c1x = lerp(pa.x, pb.x, 0.32);
            const c2x = lerp(pa.x, pb.x, 0.68);
            ctx.bezierCurveTo(c1x, spanSagY, c2x, spanSagY, pb.x, pb.y);
          }

          ctx.stroke();
        }
        ctx.restore();
      }

      // I. Act III.5–6 (`75.2 – 88.0s`): Persistent Central `#E60000` Query Nucleus (`75.2 -> 87.7s`!) & Celestial Dome Arcs!
      const orbitMarkOp = span(t, 75.2, 76.2) * (1 - span(t, 87.4, 88.0));
      orbitSanctuaryEl.style.opacity = orbitMarkOp.toFixed(3);

      const ringOp = win(t, 75.8, 80.6, 0.55);
      if (ringOp > 0.005) {
        ctx.save();
        ctx.strokeStyle = `rgba(0, 0, 0, ${(0.18 * ringOp).toFixed(3)})`;
        ctx.lineWidth = 0.7;
        ctx.setLineDash([4, 7]);
        ctx.lineDashOffset = -t * 18;
        for (const frac of [0.26, 0.58, 0.92]) {
          ctx.beginPath();
          ctx.ellipse(STAGE_W * 0.5, 216, 460 + frac * 2550, 74 + frac * 94, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 30m Celestial Armillary Meridian Rings (`79.6 – 88.0s`) spanning `X = 180..6300`!
      const domeArcOp = win(t, 79.6, 88.0, 0.65);
      if (domeArcOp > 0.005) {
        ctx.save();
        ctx.lineWidth = 0.75;
        for (let m = 0; m < 6; m++) {
          const mLon = (m * Math.PI) / 6 + sphereSpin * 0.88;
          ctx.strokeStyle =
            m === 0
              ? `rgba(230, 0, 0, ${(0.32 * domeArcOp).toFixed(3)})`
              : `rgba(0, 0, 0, ${(0.14 * domeArcOp).toFixed(3)})`;
          ctx.beginPath();
          for (let sStep = 0; sStep <= 48; sStep++) {
            const pAng = (sStep / 48) * Math.PI * 2;
            const ux = Math.sin(pAng) * Math.cos(mLon);
            const uy0 = Math.cos(pAng);
            const uz0 = Math.sin(pAng) * Math.sin(mLon);
            const uy = uy0 * cosTilt - uz0 * sinTilt;
            const uz = uy0 * sinTilt + uz0 * cosTilt;
            const proj = project3D(ux * 2980, uy * 166, uz * 280);
            if (sStep === 0) ctx.moveTo(proj.sx, clamp(proj.sy, 28, 404));
            else ctx.lineTo(proj.sx, clamp(proj.sy, 28, 404));
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // J. Act IV.1 (`88.0 – 90.6s`): Viewfinder Convergence + `1.85px` Daylight-Legible Catenary Arcs + Acoustic Oscillogram!
      const numTagOp = Math.max(win(t, 77.6, 79.5, 0.35), win(t, 88.05, 94.1, 0.35));
      if (numTagOp > 0.005) {
        peripheryNumEl.style.opacity = numTagOp.toFixed(3);
        peripheryNumEl.style.left = '4880px';
        peripheryNumEl.style.top = t < 84.0 ? '184px' : t >= 90.6 ? '96px' : '140px';
        peripheryNumEl.style.transform = 'translateX(-50%)';
      } else {
        peripheryNumEl.style.opacity = '0';
      }

      const awakeLive = t >= 88.0 && t < 90.6;
      if (!awakeLive) {
        awakenedSentenceEl.style.opacity = '0';
      } else {
        const aIn = span(t, 88.0, 88.55, easeOutCubic);
        const colorMix = smoothstep(88.6, 90.4, t);
        const rVal = Math.round(lerp(217, 0, colorMix));
        const breathe = 1.0 + 0.036 * Math.sin((t - 88.0) * 3.2);
        awakenedSentenceEl.style.opacity = aIn.toFixed(3);
        awakenedSentenceEl.style.color = `rgb(${rVal}, 0, 0)`;
        awakenedSentenceEl.style.transform = `translate(-50%, -50%) scale(${breathe.toFixed(4)})`;

        // Converging `#FF0000` Viewfinder Crop Marks (`88.0–90.6s`)
        const vfU = easeOutCubic(progress(t, 88.0, 90.4));
        const vfw = lerp(520, 368, vfU);
        const vfh = lerp(132, 66, vfU);
        ctx.save();
        ctx.strokeStyle = `rgba(230, 0, 0, ${(0.90 * aIn).toFixed(3)})`;
        ctx.lineWidth = 1.65;
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as const) {
          const cx = 4880 + sx * vfw;
          const cy = 216 + sy * vfh;
          ctx.beginPath();
          ctx.moveTo(cx - sx * 14, cy);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx, cy - sy * 14);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 5 Full-Bridge `1.85px` Crimson Catenary Suspension Arcs + Live Acoustic Oscillogram (`88.1 – 94.15s`)
      const catenaryFade = span(t, 88.1, 88.6) * (1 - span(t, 93.7, 94.2));
      if (catenaryFade > 0.01) {
        ctx.save();
        ctx.lineCap = 'round';
        const anchorOffsetsX = [-260, -130, 0, 130, 260];
        for (let k = 0; k < neighborIndices.length; k++) {
          const nbIdx = neighborIndices[k]!;
          const nbPos = screenPos[nbIdx]!;
          const drawU = easeOutExpo(progress(t, 88.15 + k * 0.16, 89.05 + k * 0.16));
          if (drawU <= 0.01) continue;

          const isUpper = nbPos.y < 216;
          const srcX = 4880 + (anchorOffsetsX[k] ?? 0);
          const srcY = isUpper ? 154 : 278;

          ctx.strokeStyle = `rgba(217, 0, 0, ${(0.88 * catenaryFade).toFixed(3)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(srcX, srcY - 4);
          ctx.lineTo(srcX, srcY + 4);
          ctx.stroke();

          const sag = (isUpper ? -1 : 1) * (54 + k * 12);
          const ctrlX = lerp(srcX, nbPos.x, 0.5);
          const ctrlY = clamp(lerp(srcY, nbPos.y, 0.5) + sag, 34, STAGE_H - 34);
          const curEndX = lerp(srcX, nbPos.x, drawU);
          const curEndY = lerp(srcY, nbPos.y, drawU);
          const curCtrlX = lerp(srcX, ctrlX, drawU);
          const curCtrlY = lerp(srcY, ctrlY, drawU);

          const pulseGlow = 0.78 + 0.22 * Math.sin(t * 5.2 - k * 1.1);
          ctx.strokeStyle = `rgba(226, 0, 0, ${(0.88 * catenaryFade * pulseGlow).toFixed(3)})`;
          ctx.lineWidth = 1.95 - k * 0.08;
          ctx.beginPath();
          ctx.moveTo(srcX, srcY);
          ctx.quadraticCurveTo(curCtrlX, curCtrlY, curEndX, curEndY);
          ctx.stroke();

          if (drawU > 0.92) {
            ctx.fillStyle = `rgba(226, 0, 0, ${(0.94 * catenaryFade).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(nbPos.x, nbPos.y, 4.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Live Acoustic Paleo-Wind Oscillogram Wave across left/center horizon (`X = 420..3880`) so left `18.5m` breathes!
        ctx.strokeStyle = `rgba(0, 0, 0, ${(0.22 * catenaryFade).toFixed(3)})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        for (let ox = 420; ox <= 3880; ox += 12) {
          const env = Math.sin(((ox - 420) / 3460) * Math.PI);
          const osc =
            Math.sin(ox * 0.045 - t * 9.5) * 14 * env +
            Math.sin(ox * 0.11 + t * 14.0) * 6 * env;
          const oy = 216 + osc;
          if (ox === 420) ctx.moveTo(ox, oy);
          else ctx.lineTo(ox, oy);
        }
        ctx.stroke();

        ctx.restore();
      }

      // K. Act IV.2 (`90.6 – 94.2s`): Continuous Parabolic 3D Ballistic Fault Drift (Zero Static Hold!)
      const faultLive = t >= 90.6 && t < 94.25;
      if (!faultLive) {
        for (const sEl of shardEls) {
          sEl.style.opacity = '0';
          sEl.style.filter = 'none';
          sEl.style.transform = 'translate3d(-9999px, -9999px, 0)';
        }
      } else {
        const uSnap = easeOutExpo(progress(t, 90.6, 91.25));
        const uDrift = progress(t, 90.6, 94.2); // Continuous drift across the ENTIRE `3.6s` span!
        const exitShard = 1 - progress(t, 94.0, 94.25);

        // Two diagonal geological fault lines across `Y = 34..398`
        ctx.save();
        ctx.strokeStyle = `rgba(225, 0, 0, ${(0.85 * exitShard).toFixed(3)})`;
        ctx.lineWidth = 1.45;
        for (const fx of [4440, 5320]) {
          const shearTilt = 26 * uSnap + 22 * uDrift;
          ctx.beginPath();
          ctx.moveTo(fx + shearTilt, 34);
          ctx.lineTo(fx - shearTilt, 398);
          ctx.stroke();
        }

        // Left receding shard: "결정이 녹을 때" — continuous parabolic 3D ballistic trajectory (stays inside `1440px` crop!)
        const leftX = 4530 - 155 * uSnap - 165 * uDrift;
        const leftY = 216 - 48 * uSnap - 46 * (uDrift * uDrift * 0.7 + uDrift * 0.3);
        const leftRotY = 22 * uSnap + 14 * uDrift;
        const leftScale = lerp(1.0, 0.74, 0.55 * uSnap + 0.45 * uDrift);
        shardEls[0]!.style.opacity = (exitShard * lerp(0.92, 0.66, uDrift)).toFixed(3);
        shardEls[0]!.style.filter = uSnap > 0.2 ? `blur(${(0.75 + uDrift * 0.85).toFixed(2)}px)` : 'none';
        shardEls[0]!.style.transform = `translate3d(${leftX.toFixed(1)}px, ${leftY.toFixed(1)}px, 0) translate(-50%, -50%) perspective(460px) rotateY(${leftRotY.toFixed(1)}deg) rotateZ(${(-3.5 - uDrift * 3.5).toFixed(1)}deg) scale(${leftScale.toFixed(3)})`;

        // Center advancing hero shard: "수억 년 전의 바람" (`96px` Bold `#000000`, coiling continuously to launch!)
        const centerScale = lerp(0.96, 1.12, easeInOut(uDrift));
        shardEls[1]!.style.opacity = exitShard.toFixed(3);
        shardEls[1]!.style.filter = 'none';
        shardEls[1]!.style.transform = `translate3d(${(4880 - uDrift * 14).toFixed(1)}px, 216px, 0) translate(-50%, -50%) scale(${centerScale.toFixed(4)})`;

        const cw = 378 * centerScale;
        const ch = 70 * centerScale;
        ctx.strokeStyle = `rgba(230, 0, 0, ${(0.95 * exitShard).toFixed(3)})`;
        ctx.lineWidth = 1.65;
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as const) {
          const cx = 4880 - uDrift * 14 + sx * cw;
          const cy = 216 + sy * ch;
          ctx.beginPath();
          ctx.moveTo(cx - sx * 14, cy);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx, cy - sy * 14);
          ctx.stroke();
        }

        // Right receding shard: "이 분다" — continuous parabolic 3D ballistic trajectory (stays inside `1440px` crop!)
        const rightX = 5260 + 140 * uSnap + 155 * uDrift;
        const rightY = 216 + 48 * uSnap + 46 * (uDrift * uDrift * 0.7 + uDrift * 0.3);
        const rightRotY = -22 * uSnap - 14 * uDrift;
        const rightScale = lerp(1.0, 0.74, 0.55 * uSnap + 0.45 * uDrift);
        shardEls[2]!.style.opacity = (exitShard * lerp(0.90, 0.64, uDrift)).toFixed(3);
        shardEls[2]!.style.filter = uSnap > 0.2 ? `blur(${(0.8 + uDrift * 0.9).toFixed(2)}px)` : 'none';
        shardEls[2]!.style.transform = `translate3d(${rightX.toFixed(1)}px, ${rightY.toFixed(1)}px, 0) translate(-50%, -50%) perspective(460px) rotateY(${rightRotY.toFixed(1)}deg) rotateZ(${(3.5 + uDrift * 3.5).toFixed(1)}deg) scale(${rightScale.toFixed(3)})`;

        ctx.restore();
      }
    }

    // -----------------------------------------------------------------------
    // 6. ACT IV.3a (`94.2 – 100.25s`): SMOOTH SCALE-DECELERATION GALE & CIRCULAR DRY-INK STIPPLES
    // -----------------------------------------------------------------------
    if (t < 94.2 || t >= 100.28) {
      galeBannerEl.style.opacity = '0';
      galeBannerEl.style.transform = 'translate3d(-9999px, -9999px, 0)';
    } else {
      const gFade = 1 - progress(t, 100.05, 100.26);
      galeBannerEl.style.opacity = gFade.toFixed(3);
      galeBannerEl.style.transform = `translate3d(${galeCenterX.toFixed(1)}px, ${galeCenterY.toFixed(1)}px, 0) translate(-50%, -50%) scale(${galeScale.toFixed(4)})`;

      ctx.save();
      const wavePlate = getDecodedPlate('plate-14');
      const dunePlate = getDecodedPlate('plate-10');
      if (wavePlate && galeCenterX < 5200) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.17 * gFade;
        ctx.drawImage(wavePlate, galeCenterX + 680, 40, 960, 146);
      }
      if (dunePlate && galeCenterX < 4600) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.15 * gFade;
        ctx.drawImage(dunePlate, galeCenterX + 1180, 242, 720, 148);
      }
      ctx.globalCompositeOperation = 'source-over';

      // 175 Calligraphic Wind Streamlines (`#000000` & `#E60000`) surging right -> left across 6,480px!
      for (let wIdx = 0; wIdx < 175; wIdx++) {
        const h1 = hash(wIdx * 19 + 3);
        const h2 = hash(wIdx * 37 + 11);
        const wy = 32 + h1 * 368;
        const speedLag = h2 * 0.36;
        const uLine = clamp((uGale * 1.15 - speedLag) / (1 - speedLag), 0, 1);
        if (uLine <= 0.005 || uLine >= 0.995) continue;

        const headX = lerp(6460, -240, uLine);
        const segLen = 280 + hash(wIdx * 7) * 760;
        const tailX = headX + segLen;
        const waveAmp = (hash(wIdx * 43) - 0.5) * 32;

        const isCrimson = wIdx % 6 === 0;
        ctx.strokeStyle = isCrimson ? '#e60000' : '#000000';
        ctx.globalAlpha = (isCrimson ? 0.50 : 0.18 + h1 * 0.22) * gFade * Math.sin(uLine * Math.PI);
        ctx.lineWidth = isCrimson ? 1.50 : 0.55 + (wIdx % 3) * 0.35;
        ctx.beginPath();
        ctx.moveTo(tailX, wy);
        ctx.bezierCurveTo(
          lerp(tailX, headX, 0.35),
          clamp(wy + waveAmp, 28, 404),
          lerp(tailX, headX, 0.7),
          clamp(wy - waveAmp * 0.7, 28, 404),
          headX,
          clamp(wy + waveAmp * 0.2, 28, 404),
        );
        ctx.stroke();
      }

      // 360 Circular Lithographic Dry-Ink Stipple Grains (ZERO rectangular fillRect!)
      for (let gIdx = 0; gIdx < 360; gIdx++) {
        const hg1 = hash(gIdx * 23 + 5);
        const hg2 = hash(gIdx * 59 + 17);
        const lag = hg2 * 0.44;
        const uGrain = clamp((uGale * 1.18 - lag) / (1 - lag), 0, 1);
        if (uGrain <= 0.01 || uGrain >= 0.99) continue;
        const px = lerp(6480, -100, uGrain);
        const py = clamp(32 + hg1 * 368 + Math.sin(uGrain * 10 + gIdx) * 12, 28, 404);
        if (Math.abs(px - galeCenterX) < galeHalfW + 36 && Math.abs(py - galeCenterY) < 76 * galeScale) continue;
        ctx.fillStyle = gIdx % 7 === 0 ? '#e60000' : '#000000';
        ctx.globalAlpha = (0.28 + hg1 * 0.42) * gFade;
        const r = 0.75 + (gIdx % 3) * 0.55;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // 7. ACT IV.4 (`113.6 – 119.25s`): `38 m/s` KATABATIC DRYPOINT SASTRUGI BLIZZARD!
    // -----------------------------------------------------------------------
    if (t >= 113.6 && t < 119.25) {
      ctx.save();
      // Advancing pure-white snowfield bank behind the roaring Sastrugi drypoint front
      const gradLeft = blizzardFrontX - 720;
      const gradRight = blizzardFrontX + 460;
      const veilGrad = ctx.createLinearGradient(gradLeft, 0, gradRight, 0);
      veilGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      veilGrad.addColorStop(0.52, 'rgba(255, 255, 255, 0.86)');
      veilGrad.addColorStop(1, 'rgba(255, 255, 255, 1)');
      ctx.fillStyle = veilGrad;
      ctx.fillRect(Math.max(0, gradLeft), 0, STAGE_W - Math.max(0, gradLeft), STAGE_H);

      // Envelope fades cleanly to 0 right before `119.25s` so `[119.25..120.0s]` is 100.00% pure `#FFFFFF`!
      const stormEnv = span(t, 113.6, 114.15) * (1 - span(t, 118.55, 119.22, easeInOut));
      if (stormEnv > 0.005) {
        ctx.lineCap = 'round';
        // 220 Carved Drypoint Sastrugi Wind-Ridge Curves (`38 m/s` polar wind erosion!)
        for (let s = 0; s < 220; s++) {
          const hs1 = hash(s * 31 + 9);
          const hs2 = hash(s * 47 + 13);
          const hs3 = hash(s * 71 + 23);
          // Spread across a massive 2,600px blizzard band surging across the 30m bridge!
          const wx = blizzardFrontX + (hs2 - 0.34) * 2600 - ((t - 113.6) * 280 * hs3) % 520;
          const len = 110 + hs3 * 360;
          if (wx + len < 0 || wx > STAGE_W) continue;

          const baseY = 30 + hs1 * 372;
          const cuspH = (hs2 - 0.5) * 26;
          const isAccent = s % 9 === 0;
          const distFade = 1 - clamp(Math.abs(wx - blizzardFrontX) / 1650, 0, 1) * 0.65;

          ctx.strokeStyle = isAccent ? '#d90000' : '#000000';
          ctx.globalAlpha = (isAccent ? 0.52 : 0.24 + hs1 * 0.38) * stormEnv * distFade;
          ctx.lineWidth = isAccent ? 1.35 : 0.60 + (s % 3) * 0.42;

          // Authentic sculpted Sastrugi drypoint cusp curve
          ctx.beginPath();
          ctx.moveTo(wx + len, baseY);
          ctx.bezierCurveTo(
            wx + len * 0.66,
            clamp(baseY + cuspH, 28, 404),
            wx + len * 0.30,
            clamp(baseY - cuspH * 0.65, 28, 404),
            wx,
            clamp(baseY + cuspH * 0.15, 28, 404),
          );
          ctx.stroke();
        }

        // 480 High-Velocity Circular Ice-Crystal Stipples (`38 m/s` drypoint burrs!)
        for (let p = 0; p < 480; p++) {
          const hp1 = hash(p * 29 + 7);
          const hp2 = hash(p * 61 + 19);
          const px = blizzardFrontX + (hp2 - 0.40) * 2400 - ((t - 113.6) * 620 * (0.6 + hp1 * 0.6)) % 900;
          if (px < 0 || px > STAGE_W) continue;
          const py = clamp(28 + hp1 * 376 + Math.sin(px * 0.015 + p) * 9, 28, 404);
          const r = 0.65 + (p % 3) * 0.50;
          ctx.fillStyle = p % 11 === 0 ? '#d90000' : '#000000';
          ctx.globalAlpha = (0.24 + hp2 * 0.44) * stormEnv;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
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
      hardCutFlash(t, 90.6, 2),
      hardCutFlash(t, 94.2, 2),
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
    // 9. TAUT `0.75s` (`119.25s..120.00s` & `0.00s..0.12s`) 100.00% PURE #FFFFFF LOOP!
    // -----------------------------------------------------------------------
    const washEnd = t >= 119.24 ? 1.0 : span(t, 118.75, 119.24, easeInOut);
    const washStart = t <= 0.12 ? 1.0 : 1 - span(t, 0.12, 0.30, easeOutCubic);
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
