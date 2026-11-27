/**
 * Museum-Grade Zero-UI & Bezel-Safe (`Y ∈ [26, 404]`) 6480 × 432 (15:1) Moving-Image Engine
 * (`src/engine/stage.ts` — 200.0s / 100-Bar / 6,000-Frame Round 2 Biennial Master)
 *
 * Round 2 Convergence Architecture:
 *   1. Collision-Free 3D Analytic Lattices (`Helix3D` 6-phase interleaved + smooth analytical ribbon spine,
 *      `Cloud3D` perspective-unprojected dolly, `Sphere3D` 6-latitude co-rotating hemisphere-preserving lattice)
 *      + Post-Interpolation Central Sanctuary Arch (`0` `"김치찌개 끓이는 법"` intrusions across `128..150s`)
 *   2. Permanent 3-Tier Flex `.monolith-card.is-hero`, Unidirectional `r=2→1→0` Stepped Card Stack,
 *      Station-Fixed Registration Marks & Parallax-Locked Beacon-Clear Orthogonal Arrows
 *   3. Causal 3-Copy `history` Conveyor (`0%` future spoilers + 8-slot in-place Gen1 Echo → Gen2 Crossfade + `>=28px` right margin)
 *   4. 15 Dedicated `COS 0.xxx` Sanctuary Slots (exact Bezier apex inversion, `0.65s` wave overlap)
 *      + 56-Strand Polyphonic Catenary Crescendo (`73.8 → 81.6s`) + Living `Reading 2D` & `Meaning 2D`
 *   5. Exterior-Bracket Routed Act IV.1 Catenary Arcs (`0px` intrusion into `"결정이 녹을 때 수억 년 전의 바람이 분다"`)
 *   6. Full-6380px Act I.1 Press, Clear Act I.2 Slit-Scan (`1.25s` panorama dwell), & `0.0px` Seamless Act IV Handoffs
 */

import * as THREE from 'three';
import {
  ALIGNED_FORMULA,
  ALIGNED_MEMORY_LINES,
  GEN1_ALIGNED_CARDS,
  GEN1_ALIGNED_HERO_SLIDES,
  GEN1_SKEWED_STATIONS,
  GEN2_ALIGNED_CARDS,
  GEN2_ALIGNED_HERO_SLIDES,
  GEN2_SKEWED_STATIONS,
  getCorpus,
  QUERY_GEN1,
  QUERY_GEN2,
  REFRACTION_LENS_GEN1,
  REFRACTION_LENS_GEN2,
  TARGET_FRAGMENT_TEXT,
  TARGET_PHRASE_PIECES,
  type AlignedHeroSlide,
  type CardSpec,
  type SkewedStationSpec,
} from '../data/corpus.ts';
import { DURATION, STAGE_H, STAGE_W } from '../data/timeline.ts';
import { getDecodedPlate, getPlateById } from '../illustrations.ts';
import {
  computePanoramicLayouts,
  COSINE_LABEL_SANCTUARIES,
  fragmentBox,
} from '../layouts/deconstruct-layout.ts';
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

interface HeroSlideDom {
  readonly el: HTMLElement;
  readonly metric: string;
}

interface PlacedMonolith {
  readonly spec: CardSpec;
  readonly el: HTMLElement;
  readonly metricEl: HTMLElement;
  readonly bodyEl: HTMLElement | null;
  readonly slideDoms?: readonly HeroSlideDom[];
  readonly regMark: SVGPathElement | null;
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
  'plate-25',
  'plate-26',
  'plate-27',
  'plate-28',
  'plate-29',
  'plate-17',
  'plate-02',
  'plate-08',
  'plate-18',
  'plate-03',
  'plate-06',
  'plate-19',
  'plate-05',
  'plate-20',
  'plate-32',
  'plate-07',
] as const;

/** C²-continuous quintic smootherstep (`s'(0)=s'(1)=0` AND `s''(0)=s''(1)=0`) */
function smootherstep(edge0: number, edge1: number, x: number): number {
  const u = edge1 === edge0 ? (x >= edge1 ? 1 : 0) : clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return u * u * u * (u * (u * 6 - 15) + 10);
}

/** C∞ smooth minimum (`< limit` everywhere, approaches `a` for `a << limit`) */
function softMin(a: number, limit: number, k: number): number {
  const d = limit - a;
  return 0.5 * (a + limit - Math.sqrt(d * d + k * k));
}

/** C∞ smooth maximum (`> limit` everywhere, approaches `a` for `a >> limit`) */
function softMax(a: number, limit: number, k: number): number {
  const d = a - limit;
  return 0.5 * (a + limit + Math.sqrt(d * d + k * k));
}

function taperCanvasEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  strength: number,
): void {
  if (strength <= 0.01 || rx <= 2 || ry <= 2) return;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const grad = ctx.createRadialGradient(0, 0, 0.08, 0, 0, 1.0);
  const s = clamp(strength, 0, 1);
  grad.addColorStop(0.0, `rgba(0, 0, 0, ${(0.96 * s).toFixed(3)})`);
  grad.addColorStop(0.48, `rgba(0, 0, 0, ${(0.72 * s).toFixed(3)})`);
  grad.addColorStop(0.78, `rgba(0, 0, 0, ${(0.28 * s).toFixed(3)})`);
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 1.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const FOCUS_KEYFRAMES: readonly { readonly t: number; readonly x: number }[] = [
  { t: 0.0, x: 1220 },
  { t: 1.5, x: 1220 },
  { t: 13.0, x: 3480 },
  { t: 18.5, x: 2480 },
  { t: 41.5, x: 5080 },
  { t: 48.0, x: 3880 },
  { t: 63.0, x: 2480 },
  { t: 78.0, x: 3480 },
  { t: 87.0, x: 2680 },
  { t: 102.0, x: 4480 },
  { t: 115.0, x: 2880 },
  { t: 128.0, x: 3240 },
  { t: 148.5, x: 3240 },
  { t: 157.5, x: 4880 },
  { t: 161.5, x: 4880 },
  { t: 172.5, x: 2580 },
  { t: 183.5, x: 4680 },
  { t: 200.0, x: 1220 },
];

export function createMotionStage(host: HTMLElement, options: MotionStageOptions = {}): MotionStageHandle {
  const canvasScale = options.canvasScale ?? 1;
  const corpus = getCorpus();
  const { fragments, targetIndex, neighborIndices, topEdges, rankedPairs } = corpus;
  const layouts = computePanoramicLayouts(fragments, rankedPairs, targetIndex, neighborIndices);

  const boxW0 = new Float32Array(fragments.length);
  const boxDW = new Float32Array(fragments.length);
  const boxH0 = new Float32Array(fragments.length);
  const boxDH = new Float32Array(fragments.length);
  for (let i = 0; i < fragments.length; i++) {
    const b0 = fragmentBox(fragments[i]!, 0);
    const b1 = fragmentBox(fragments[i]!, 1);
    boxW0[i] = b0.w;
    boxDW[i] = b1.w - b0.w;
    boxH0[i] = b0.h;
    boxDH[i] = b1.h - b0.h;
  }
  const fastBoxW = (i: number, s: number): number => boxW0[i]! + boxDW[i]! * s;
  const fastBoxH = (i: number, s: number): number => boxH0[i]! + boxDH[i]! * s;

  /* --- 0. Pure-White-Preserving SVG Gamma Filter --- */
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
  root.dataset.activeCanvasPlates = '';
  root.dataset.activeCosineBands = '';
  root.dataset.activeCosineBoxes = '';
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

  /* --- 1. Boundless Paper Fiducial Crosshairs --- */
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

  /* --- 2. Polar Spindrift Horizon Backdrop (`plate-38`) --- */
  const sastrugiBackdrop = document.createElement('img');
  sastrugiBackdrop.className = 'sastrugi-backdrop';
  sastrugiBackdrop.dataset.plate = 'plate-38';
  sastrugiBackdrop.src = getPlateById('plate-38').src;
  sastrugiBackdrop.alt = '';
  world.append(sastrugiBackdrop);

  /* --- 3. Floor SVG (Station-Fixed Registration Marks + Parallax-Locked Gen1/Gen2 Arrow Groups) --- */
  const floorSvg = document.createElementNS(SVG_NS, 'svg');
  floorSvg.setAttribute('class', 'stage-floor-svg');
  floorSvg.setAttribute('viewBox', `0 0 ${STAGE_W} ${STAGE_H}`);
  world.append(floorSvg);

  const regLayer = document.createElementNS(SVG_NS, 'g');
  const arrowLayerGen1 = document.createElementNS(SVG_NS, 'g');
  const arrowLayerGen2 = document.createElementNS(SVG_NS, 'g');
  floorSvg.append(regLayer, arrowLayerGen1, arrowLayerGen2);

  /* --- 4. Act I.1 (`0.0 – 13.0s`): Full-6380px Silkscreen Press & Hero Sanctuary --- */
  const pressLayer = makeEl('div', 'press-layer', world);

  const voronoiImgA = document.createElement('img');
  voronoiImgA.className = 'press-voronoi-plate';
  voronoiImgA.dataset.plate = 'plate-01';
  voronoiImgA.src = getPlateById('plate-01').src;
  voronoiImgA.alt = '';
  voronoiImgA.style.left = '1960px';
  pressLayer.append(voronoiImgA);

  const voronoiImgB = document.createElement('img');
  voronoiImgB.className = 'press-voronoi-plate';
  voronoiImgB.dataset.plate = 'plate-15';
  voronoiImgB.src = getPlateById('plate-15').src;
  voronoiImgB.alt = '';
  voronoiImgB.style.left = '4780px';
  pressLayer.append(voronoiImgB);

  const pressHeroQuery = makeEl('div', 'press-hero-query', pressLayer, QUERY_GEN1);

  const pressUpperClip = makeEl('div', 'press-clip-upper', pressLayer);
  const pressLowerClip = makeEl('div', 'press-clip-lower', pressLayer);

  const pressMemories = ALIGNED_MEMORY_LINES.map((m, idx) => {
    const parentClip = m.y < 216 ? pressUpperClip : pressLowerClip;
    const lineEl = makeEl('div', 'press-memory-line', parentClip, m.text);
    return { spec: m, idx, lineEl };
  });

  const platenTop = makeEl('div', 'press-platen-rule', pressLayer);
  const platenBot = makeEl('div', 'press-platen-rule', pressLayer);
  const pressFormula = makeEl('div', 'press-formula-stamp', pressLayer, ALIGNED_FORMULA);

  /* --- 5. Macro Query Anchor (`56px` Bold Serif, `left: 110px, top: 32px`, `centerY = 62.24px`) --- */
  const datumAnchor = makeEl('div', 'datum-query-anchor', world);
  const datumCharsWrap = makeEl('div', 'datum-query-chars', datumAnchor);
  const gen1Glyphs = ['김', '치', '찌', '개', '끓', '이', '는', '법'] as const;
  const datumGen1Spans = gen1Glyphs.map((ch, idx) =>
    makeEl('span', `datum-char${idx === 4 || idx === 7 ? ' has-gap' : ''}`, datumCharsWrap, ch),
  );
  const datumGen2Span = makeEl('span', 'datum-char', datumCharsWrap, QUERY_GEN2);
  const datumRule = makeEl('div', 'datum-query-rule', datumAnchor);
  datumRule.style.width = '468px';

  /* --- 6. Refraction Lens Prism Gates --- */
  const buildStaticPrismGate = (titleText: string): HTMLElement => {
    const gate = makeEl('div', 'prism-gate', world);
    const labelBox = makeEl('div', 'prism-gate-label', gate);
    makeEl('span', 'prism-gate-kicker', labelBox, '굴절 관점');
    makeEl('span', 'prism-gate-title', labelBox, titleText);
    return gate;
  };
  const prismGateGen1 = buildStaticPrismGate(REFRACTION_LENS_GEN1);
  const prismGateGen2 = buildStaticPrismGate(REFRACTION_LENS_GEN2);

  /* --- 7. Act II.1: Full-Bleed Broadsheet (`44.05–63.6s`, `plate-29..33` `FIG.01..05`) --- */
  const spreadLayer = makeEl('div', 'archive-spread', world);
  const heroSpreadEls = layouts.heroSpreadSlots.map((slot) => {
    const wrap = makeEl('div', 'spread-hero-slot', spreadLayer);
    wrap.dataset.plate = slot.plateId;
    wrap.style.left = `${slot.x}px`;
    wrap.style.top = `${slot.y}px`;
    wrap.style.width = `${slot.w}px`;
    wrap.style.height = `${slot.h}px`;

    const imgBox = makeEl('div', 'spread-hero-img-box', wrap);
    const img = document.createElement('img');
    img.dataset.plate = slot.plateId;
    img.src = getPlateById(slot.plateId).src;
    img.alt = slot.caption;
    imgBox.append(img);

    const meta = makeEl('div', 'spread-hero-meta', wrap);
    makeEl('span', 'spread-hero-code', meta, slot.code);
    makeEl('span', 'spread-hero-cap', meta, slot.caption);
    return { slot, wrap, img };
  });

  /* --- 8. Act I.3 (`18.6–42.5s`) & Act IV.3b (`171.5–193.0s`): Permanent 3-Tier Monolith Archipelago --- */
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
    heroSlides?: readonly AlignedHeroSlide[],
  ): PlacedMonolith => {
    const el = makeEl('article', `monolith-card ${isHero ? 'is-hero' : 'is-slab'}`, cardLayer);
    el.dataset.gen = String(spec.gen);
    el.dataset.group = spec.group;
    if (stationIdx !== undefined) el.dataset.station = String(stationIdx + 1);
    if (spec.plateId) el.dataset.plate = spec.plateId;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.zIndex = String(Math.round(200 + z));

    const bandCls = spec.group === 'aligned' ? 'monolith-band aligned' : `monolith-band skewed-${spec.rank ?? 1}`;
    const band = makeEl('div', bandCls, el);
    makeEl('span', 'monolith-code', band, spec.indexCode);
    const metricEl = makeEl('span', 'monolith-metric', band, spec.metric);
    metricEl.style.opacity = isHero ? '1' : '0';

    if (spec.plateId) {
      const pWrap = makeEl('div', 'monolith-plate-wrap', el);
      const img = document.createElement('img');
      img.dataset.plate = spec.plateId;
      img.src = getPlateById(spec.plateId).src;
      img.alt = spec.title;
      pWrap.append(img);
    }

    let bodyEl: HTMLElement | null = null;
    let slideDoms: HeroSlideDom[] | undefined;
    if (isHero) {
      bodyEl = makeEl('div', 'monolith-body', el);
      bodyEl.style.opacity = '1';
      if (heroSlides && heroSlides.length > 0) {
        slideDoms = heroSlides.map((sl) => {
          const sDiv = makeEl('div', 'monolith-body-slide', bodyEl!);
          makeEl('div', 'monolith-title', sDiv, sl.title);
          makeEl('div', 'monolith-snippet', sDiv, sl.snippet);
          return { el: sDiv, metric: sl.metric };
        });
      } else {
        makeEl('div', 'monolith-title', bodyEl, spec.title);
        makeEl('div', 'monolith-snippet', bodyEl, spec.snippet);
      }
    }

    // Create 1 station-anchored registration mark per Skewed station (`cardSlot === 0`) + front Aligned hero!
    const needsRegMark = isHero && (stationIdx === undefined || cardSlot === 0);
    let regMark: SVGPathElement | null = null;
    if (needsRegMark) {
      regMark = document.createElementNS(SVG_NS, 'path');
      regMark.setAttribute('fill', 'none');
      regMark.setAttribute('stroke', '#000000');
      regMark.setAttribute('stroke-width', '0.9');
      regMark.setAttribute('visibility', 'hidden');
      regLayer.append(regMark);
    }

    const rec: PlacedMonolith = {
      spec,
      el,
      metricEl,
      bodyEl,
      slideDoms,
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

    const parentGroup = gen === 1 ? arrowLayerGen1 : arrowLayerGen2;
    parentGroup.append(path, pulsePath, head);
    orthoArrows.push({ gen, path, pulsePath, head, at, dur, idx });
  };

  const buildGenerationArchipelago = (
    gen: 1 | 2,
    alignedSpecs: readonly CardSpec[],
    alignedHeroSlides: readonly AlignedHeroSlide[],
    skewedStations: readonly SkewedStationSpec[],
    alignedBaseAt: number,
    skewedBaseAt: number,
  ) => {
    alignedSpecs.forEach((spec, idx) => {
      const isFrontHero = idx === alignedSpecs.length - 1;
      if (isFrontHero) {
        addMonolith(
          spec,
          1246,
          112,
          76,
          324,
          244,
          24,
          4,
          true,
          alignedBaseAt + idx * 0.14,
          undefined,
          undefined,
          idx,
          alignedHeroSlides,
        );
      } else {
        const x = 118 + idx * 212;
        const y = 136 + (idx % 2) * 16;
        const z = -40 + idx * 16;
        addMonolith(spec, x, y, z, 236, 190, 28, 5, false, alignedBaseAt + idx * 0.14, undefined, undefined, idx);
      }
    });

    const stStepDelay = gen === 2 ? 0.42 : 0.72;
    skewedStations.forEach((st, sIdx) => {
      const stAt = skewedBaseAt + sIdx * stStepDelay;

      const beaconEl = makeEl('div', 'station-beacon', cardLayer);
      const beaconY = st.y > 100 ? 32 : 322;
      beaconEl.style.left = `${st.x - 10}px`;
      beaconEl.style.top = `${beaconY}px`;
      const row = makeEl('div', 'station-beacon-row', beaconEl);
      makeEl('span', 'station-big-num', row, `0${st.rank}`);
      const metaCol = makeEl('div', 'station-meta-col', row);
      makeEl('span', 'station-code', metaCol, st.code);
      makeEl('span', 'station-title', metaCol, st.shortTitle);
      stationBeacons.push({ gen, spec: st, el: beaconEl, x: st.x - 10, y: beaconY, z: 84, at: stAt - 0.06 });

      ([0, 1, 2] as const).forEach((cSlot) => {
        addMonolith(
          st.cards[cSlot]!,
          st.x,
          st.y,
          84,
          324,
          244,
          st.rotY,
          st.rotX,
          true,
          stAt + cSlot * 0.10,
          sIdx,
          cSlot,
        );
      });
    });

    // Beacon-clear orthogonal `#FF0000` trajectories routed through open inter-station corridors!
    const arrowStartAt = skewedBaseAt - 0.12;
    const arrowStep = gen === 2 ? 0.42 : 0.68;
    const beaconClearPaths: readonly (readonly [number, number][])[] = [
      [
        [1572, 276],
        [1784, 276],
        [1784, 392],
        [2182, 392],
        [2182, 372],
      ],
      [
        [2348, 248],
        [2610, 248],
        [2610, 38],
        [3042, 38],
        [3042, 52],
      ],
      [
        [3208, 176],
        [3590, 176],
        [3590, 392],
        [4122, 392],
        [4122, 372],
      ],
      [
        [4288, 248],
        [4780, 248],
        [4780, 38],
        [5442, 38],
        [5442, 54],
      ],
    ];
    beaconClearPaths.forEach((pts, k) => {
      addOrthogonalArrow(gen, pts, arrowStartAt + arrowStep * k, 0.58, k);
    });
  };

  // Gen 1 (`18.60–43.92s`, strictly after `18.56s` slit-scan dissolve!) & Gen 2 (`171.52–198.8s`)
  buildGenerationArchipelago(1, GEN1_ALIGNED_CARDS, GEN1_ALIGNED_HERO_SLIDES, GEN1_SKEWED_STATIONS, 18.60, 19.35);
  buildGenerationArchipelago(2, GEN2_ALIGNED_CARDS, GEN2_ALIGNED_HERO_SLIDES, GEN2_SKEWED_STATIONS, 171.55, 171.52);

  /* --- 9. Causal 3-Copy Seamless History Conveyor (`0%` Future Spoilers + 8-Slot In-Place Gen1→Gen2 Crossfade) --- */
  const historyWrap = makeEl('aside', 'history-rail-wrap', world);
  const historyScene = makeEl('div', 'history-scene', historyWrap);

  const gen1Pool: CardSpec[] = [
    ...GEN1_ALIGNED_CARDS.slice(0, 4),
    ...GEN1_SKEWED_STATIONS.map((st) => st.cards[2]!),
  ];
  const gen2Pool: CardSpec[] = [
    ...GEN2_ALIGNED_CARDS.slice(0, 4),
    ...GEN2_SKEWED_STATIONS.map((st) => st.cards[2]!),
  ];

  // Causal `appearAt` for Gen 1 (`8` slots): Aligned `18.60..19.08s`, Skewed right after each station ignites (`19.75, 20.47, 21.19, 21.91s`)!
  const gen1AppearTimes = [
    18.60,
    18.76,
    18.92,
    19.08,
    19.75,
    20.47,
    21.19,
    21.91,
  ];
  // Causal `crossAt` for Gen 2 (`8` slots): Gen 1 echo (`0.30`) glides initially, then crossfades in-place into Gen 2 (`1.0`) as generated!
  const gen2CrossTimes = [
    171.65,
    171.83,
    172.01,
    172.19,
    171.95,
    172.37,
    172.79,
    173.21,
  ];

  let fontsLoadedFlag = false;
  const historyObservers: ResizeObserver[] = [];

  const renderCardSlotLayer = (parent: HTMLElement, spec: CardSpec): HTMLElement => {
    const layer = makeEl('div', 'history-slot-layer', parent);
    const topRow = makeEl('div', 'history-page-top', layer);
    const badge = makeEl(
      'span',
      'history-badge',
      topRow,
      spec.group === 'aligned' ? 'aligned' : `0${spec.rank ?? 1} skewed`,
    );
    if (spec.group === 'aligned') {
      badge.style.background = '#0000ff';
      badge.style.color = '#ffffff';
    } else {
      badge.style.background = ORANGE[spec.rank ?? 1];
      badge.style.color = '#000000';
    }
    makeEl('span', '', topRow, spec.metric);
    makeEl('div', 'history-page-title', layer, spec.title);
    return layer;
  };

  const buildCausalHistoryConveyor = (mode: 'gen1' | 'gen2') => {
    const listEl = makeEl('ol', 'history-list', historyScene);
    listEl.dataset.belt = mode;
    let startEl: HTMLElement | null = null;
    let repeatEl: HTMLElement | null = null;

    const slotDoms: {
      readonly li: HTMLElement;
      readonly echoLayer: HTMLElement | null;
      readonly liveLayer: HTMLElement;
      readonly slotIdx: number;
    }[] = [];

    for (let copyIdx = 0; copyIdx < 3; copyIdx++) {
      const headLi = makeEl('li', 'history-head', listEl, 'history');
      headLi.dataset.copy = String(copyIdx);
      if (copyIdx === 0) startEl = headLi;
      if (copyIdx === 1) repeatEl = headLi;

      for (let slotIdx = 0; slotIdx < 8; slotIdx++) {
        const li = makeEl('li', 'history-page', listEl);
        if (mode === 'gen1') {
          const liveLayer = renderCardSlotLayer(li, gen1Pool[slotIdx]!);
          slotDoms.push({ li, echoLayer: null, liveLayer, slotIdx });
        } else {
          const echoLayer = renderCardSlotLayer(li, gen1Pool[slotIdx]!);
          const liveLayer = renderCardSlotLayer(li, gen2Pool[slotIdx]!);
          slotDoms.push({ li, echoLayer, liveLayer, slotIdx });
        }
      }
    }

    let cachedCyclePx = 0;
    let syncedPostFont = false;

    const measureCycle = (): number => {
      if (startEl && repeatEl) {
        const diff = repeatEl.offsetTop - startEl.offsetTop;
        if (diff > 120) {
          cachedCyclePx = diff;
          if (fontsLoadedFlag) syncedPostFont = true;
        }
      }
      return cachedCyclePx > 120 ? cachedCyclePx : 8 * 98;
    };

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        measureCycle();
      });
      ro.observe(listEl);
      historyObservers.push(ro);
    }

    const getCyclePx = (): number => {
      if (cachedCyclePx <= 120 || !fontsLoadedFlag || !syncedPostFont) {
        return measureCycle();
      }
      if (startEl && repeatEl) {
        const liveDiff = repeatEl.offsetTop - startEl.offsetTop;
        if (liveDiff > 120 && Math.abs(liveDiff - cachedCyclePx) > 0.5) {
          cachedCyclePx = liveDiff;
        }
      }
      return cachedCyclePx;
    };

    const setScrollAt = (tSec: number) => {
      const cyclePx = getCyclePx();
      const scrollPx = ((tSec * 44.0) % cyclePx + cyclePx) % cyclePx;
      const offsetY = -(cyclePx + scrollPx);
      listEl.style.transform = `rotateX(34deg) rotateY(-26deg) rotateZ(-8deg) scale(1.14) translate3d(0, ${offsetY.toFixed(3)}px, 0)`;

      if (mode === 'gen1') {
        for (const sd of slotDoms) {
          const appearAt = gen1AppearTimes[sd.slotIdx]!;
          const op = span(tSec, appearAt, appearAt + 0.55, easeOutCubic);
          sd.li.style.opacity = op.toFixed(3);
        }
      } else {
        for (const sd of slotDoms) {
          const crossAt = gen2CrossTimes[sd.slotIdx]!;
          const crossU = smootherstep(crossAt, crossAt + 0.65, tSec);
          sd.li.style.opacity = '1';
          if (sd.echoLayer) {
            sd.echoLayer.style.opacity = (0.30 * (1 - crossU)).toFixed(3);
          }
          sd.liveLayer.style.opacity = crossU.toFixed(3);
        }
      }
    };

    return { listEl, getCyclePx, measureCycle, setScrollAt };
  };

  const historyBeltGen1 = buildCausalHistoryConveyor('gen1');
  const historyBeltGen2 = buildCausalHistoryConveyor('gen2');
  historyBeltGen1.measureCycle();
  historyBeltGen2.measureCycle();

  if (typeof document !== 'undefined' && document.fonts?.ready) {
    document.fonts.ready.then(() => {
      fontsLoadedFlag = true;
      historyBeltGen1.measureCycle();
      historyBeltGen2.measureCycle();
    });
  }

  /* --- 10. High-Precision 2D Silkscreen Canvas (`z-index: 6`, Below `.frag-layer`) --- */
  const canvas = makeEl('canvas', 'stage-canvas', world);
  canvas.width = Math.round(STAGE_W * canvasScale);
  canvas.height = Math.round(STAGE_H * canvasScale);
  const ctx = canvas.getContext('2d')!;

  /* --- 11. 200 Multi-Layered Deconstructed Fragments (`z-index: 9`, `4.4px` White Stroke Halo) --- */
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
      el.dataset.plate = f.plate.id;
      const img = document.createElement('img');
      img.dataset.plate = f.plate.id;
      img.src = f.plate.src;
      img.alt = f.plate.code;
      el.append(img);
      makeEl('span', 'frag-lab', el, f.plate.code);
    } else {
      el.textContent = f.content;
      el.style.fontSize = `${f.baseFontPx}px`;
      el.style.fontWeight = f.isMacroHub ? '800' : f.tier === 'anchor' ? '700' : '400';
    }
    return el;
  });

  /* --- 12. Special Layer: Orbit Nucleus, Periphery Tag, Fault Shards & Gale --- */
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

  /* --- Act II.2 (`64.3 – 76.6s`): Overlapping 4-Wave Sanctuary-Locked Cosine Calipers --- */
  type CaliperBand = 'upper' | 'mid' | 'lower' | 'diag';
  interface CaliperSpec {
    readonly pair: readonly [number, number];
    readonly band: CaliperBand;
    readonly sanctuaryIdx: number;
    readonly dimText: string;
  }

  const pickPairAroundSanctuary = (
    sanctIdx: number,
    band: CaliperBand,
    rankOffset = 0,
    spanHalfX = 520,
  ): [number, number] => {
    const sanct = COSINE_LABEL_SANCTUARIES[sanctIdx]!;
    const minYA = band === 'upper' || band === 'diag' ? 28 : band === 'mid' ? 142 : 262;
    const maxYA = band === 'upper' || band === 'diag' ? 148 : band === 'mid' ? 278 : 396;
    const minYB = band === 'upper' ? 28 : band === 'mid' ? 142 : 262;
    const maxYB = band === 'upper' ? 148 : band === 'mid' ? 278 : 396;

    const leftCands: number[] = [];
    const rightCands: number[] = [];
    for (let i = 0; i < fragments.length; i++) {
      if (fragments[i]!.type === 'img') continue;
      const p = layouts.spectrum2D[i]!;
      if (p.x >= sanct.cx - spanHalfX && p.x <= sanct.cx - 80 && p.y >= minYA && p.y <= maxYA) {
        leftCands.push(i);
      }
      if (p.x >= sanct.cx + 80 && p.x <= sanct.cx + spanHalfX && p.y >= minYB && p.y <= maxYB) {
        rightCands.push(i);
      }
    }
    if (leftCands.length === 0) {
      for (let i = 0; i < fragments.length; i++) {
        if (fragments[i]!.type !== 'img' && layouts.spectrum2D[i]!.x < sanct.cx - 40) leftCands.push(i);
      }
    }
    if (rightCands.length === 0) {
      for (let i = 0; i < fragments.length; i++) {
        if (fragments[i]!.type !== 'img' && layouts.spectrum2D[i]!.x > sanct.cx + 40) rightCands.push(i);
      }
    }
    const a = leftCands[rankOffset % Math.max(1, leftCands.length)] ?? 0;
    let b = rightCands[(rankOffset * 2 + 1) % Math.max(1, rightCands.length)] ?? 1;
    if (b === a) b = (a + 7) % fragments.length;
    return [a, b];
  };

  // Precompute 100% static time-independent central sanctuary arch offsets (`orbArchBow`, `sphEnterArchBow`, `sphExitArchBow`)
  // so `cloud3D -> orbit2D` and `orbit2D ↔ sphere3D` clear `(3240, 216)` with ZERO single-frame chatter (`chatterReversals === 0`)!
  const orbArchBow = new Float64Array(fragments.length);
  const sphEnterArchBow = new Float64Array(fragments.length);
  const sphExitArchBow = new Float64Array(fragments.length);
  for (let i = 0; i < fragments.length; i++) {
    const c3 = layouts.cloud3D[i]!;
    const pCloud = Z_CAM / (Z_CAM - c3.cz);
    const xCloudEnd = STAGE_W * 0.5 + (c3.cx - 240) * pCloud + 240;
    const yCloudEnd = STAGE_H * 0.5 - c3.cy * pCloud;

    const pO = layouts.orbit2D[i]!;
    const hwO = fastBoxW(i, pO.scale) * 0.5;
    const hhO = fastBoxH(i, pO.scale) * 0.5;
    const curveI = (hash(i * 23 + 9) - 0.5) * 64;

    if (Math.min(xCloudEnd, pO.x) < 3540 + hwO && Math.max(xCloudEnd, pO.x) > 2940 - hwO && Math.abs(pO.x - xCloudEnd) > 25) {
      const uCross = clamp((3240 - xCloudEnd) / (pO.x - xCloudEnd), 0.18, 0.82);
      const [, yAtCross] = stepArc(xCloudEnd, yCloudEnd, pO.x, pO.y, uCross, curveI * 0.42);
      const sinCross = Math.max(0.50, Math.sin(Math.PI * uCross));
      const goNorth = (yCloudEnd + pO.y) * 0.5 < 216;
      orbArchBow[i] = goNorth
        ? clamp(Math.min(0, (160 - hhO - yAtCross) / sinCross), -150, 0)
        : clamp(Math.max(0, (272 + hhO - yAtCross) / sinCross), 0, 150);
    }

    const sp = layouts.sphere3D[i]!;
    const hhS = fastBoxH(i, Math.max(pO.scale, sp.scale * 1.15)) * 0.5;
    const hwS = fastBoxW(i, Math.max(pO.scale, sp.scale * 1.15)) * 0.5;

    const evalSphereArch = (spinMid: number): number => {
      const lon = sp.theta + spinMid;
      const wz = Math.sin(lon) * 280;
      const sxSph = STAGE_W * 0.5 + Math.cos(lon) * 2980 * (Z_CAM / (Z_CAM - wz));
      const sySph = sp.ringY + 3.0 * Math.sin(lon * 2.0);
      if (Math.min(pO.x, sxSph) < 3540 + hwS && Math.max(pO.x, sxSph) > 2940 - hwS && Math.abs(sxSph - pO.x) > 25) {
        const uCross = clamp((3240 - pO.x) / (sxSph - pO.x), 0.18, 0.82);
        const yAtCross = lerp(pO.y, sySph, uCross);
        const sinCross = Math.max(0.50, Math.sin(Math.PI * uCross));
        return sp.isNorth
          ? clamp(Math.min(0, (160 - hhS - yAtCross) / sinCross), -140, 0)
          : clamp(Math.max(0, (272 + hhS - yAtCross) / sinCross), 0, 140);
      }
      return 0;
    };

    sphEnterArchBow[i] = evalSphereArch(1.3 * 0.28);
    sphExitArchBow[i] = evalSphereArch(10.6 * 0.28);
  }

  // `0.65s` overlapped 4 waves (`64.30..67.80`, `67.15..70.65`, `70.00..73.50`, `72.85..76.60`)
  const multiWaveScans: readonly {
    readonly t0: number;
    readonly t1: number;
    readonly scanX0: number;
    readonly scanX1: number;
    readonly calipers: readonly CaliperSpec[];
  }[] = [
    {
      t0: 64.30,
      t1: 67.80,
      scanX0: 220,
      scanX1: 6260,
      calipers: [
        { pair: pickPairAroundSanctuary(0, 'upper', 0), band: 'upper', sanctuaryIdx: 0, dimText: 'COS 0.918' },
        { pair: pickPairAroundSanctuary(6, 'mid', 0), band: 'mid', sanctuaryIdx: 6, dimText: 'COS 0.814' },
        { pair: pickPairAroundSanctuary(12, 'lower', 0), band: 'lower', sanctuaryIdx: 12, dimText: 'COS 0.642' },
        { pair: pickPairAroundSanctuary(7, 'diag', 1, 920), band: 'diag', sanctuaryIdx: 7, dimText: 'COS 0.438' },
        { pair: pickPairAroundSanctuary(8, 'mid', 0), band: 'mid', sanctuaryIdx: 8, dimText: 'COS 0.276' },
        { pair: pickPairAroundSanctuary(14, 'lower', 0), band: 'lower', sanctuaryIdx: 14, dimText: 'COS 0.164' },
      ],
    },
    {
      t0: 67.15,
      t1: 70.65,
      scanX0: 6260,
      scanX1: 260,
      calipers: [
        { pair: pickPairAroundSanctuary(10, 'lower', 1), band: 'lower', sanctuaryIdx: 10, dimText: 'COS 0.896' },
        { pair: pickPairAroundSanctuary(1, 'upper', 1), band: 'upper', sanctuaryIdx: 1, dimText: 'COS 0.768' },
        { pair: pickPairAroundSanctuary(7, 'mid', 2), band: 'mid', sanctuaryIdx: 7, dimText: 'COS 0.584' },
        { pair: pickPairAroundSanctuary(8, 'diag', 2, 960), band: 'diag', sanctuaryIdx: 8, dimText: 'COS 0.372' },
        { pair: pickPairAroundSanctuary(3, 'upper', 1), band: 'upper', sanctuaryIdx: 3, dimText: 'COS 0.234' },
        { pair: pickPairAroundSanctuary(9, 'mid', 1), band: 'mid', sanctuaryIdx: 9, dimText: 'COS 0.152' },
      ],
    },
    {
      t0: 70.00,
      t1: 73.50,
      scanX0: 240,
      scanX1: 6280,
      calipers: [
        { pair: pickPairAroundSanctuary(5, 'mid', 2), band: 'mid', sanctuaryIdx: 5, dimText: 'COS 0.884' },
        { pair: pickPairAroundSanctuary(11, 'lower', 2), band: 'lower', sanctuaryIdx: 11, dimText: 'COS 0.742' },
        { pair: pickPairAroundSanctuary(2, 'upper', 2), band: 'upper', sanctuaryIdx: 2, dimText: 'COS 0.518' },
        { pair: pickPairAroundSanctuary(6, 'diag', 3, 980), band: 'diag', sanctuaryIdx: 6, dimText: 'COS 0.312' },
        { pair: pickPairAroundSanctuary(13, 'lower', 2), band: 'lower', sanctuaryIdx: 13, dimText: 'COS 0.218' },
        { pair: [pickPairAroundSanctuary(4, 'upper', 2)[0], targetIndex], band: 'upper', sanctuaryIdx: 4, dimText: 'COS 0.140' },
      ],
    },
    {
      t0: 72.85,
      t1: 76.60,
      scanX0: 6280,
      scanX1: 240,
      calipers: [
        { pair: pickPairAroundSanctuary(0, 'upper', 3), band: 'upper', sanctuaryIdx: 0, dimText: 'COS 0.904' },
        { pair: pickPairAroundSanctuary(6, 'mid', 3), band: 'mid', sanctuaryIdx: 6, dimText: 'COS 0.692' },
        { pair: pickPairAroundSanctuary(12, 'lower', 3), band: 'lower', sanctuaryIdx: 12, dimText: 'COS 0.468' },
        { pair: pickPairAroundSanctuary(8, 'diag', 4, 960), band: 'diag', sanctuaryIdx: 8, dimText: 'COS 0.264' },
        { pair: pickPairAroundSanctuary(3, 'upper', 3), band: 'upper', sanctuaryIdx: 3, dimText: 'COS 0.192' },
        { pair: [pickPairAroundSanctuary(14, 'lower', 3)[0], targetIndex], band: 'lower', sanctuaryIdx: 14, dimText: 'COS 0.140' },
      ],
    },
  ];

  // 56 Polyphonic Catenary Resonance Strings (`73.8 → 81.6s`) blooming through `spectrum2D → reading2D`!
  const polyResonanceStrings: { readonly a: number; readonly b: number; readonly stagger: number; readonly sag: number }[] = [];
  for (let k = 0; k < 56; k++) {
    const baseIdx = Math.min(fragments.length - 6, Math.floor((k / 56) * (fragments.length - 8)) + 1);
    const hop = 3 + (k % 5) * 2;
    const partnerIdx = Math.min(fragments.length - 1, baseIdx + hop);
    polyResonanceStrings.push({
      a: baseIdx,
      b: partnerIdx,
      stagger: hash(k * 31 + 7),
      sag: (k % 2 === 0 ? 1 : -1) * (24 + (k % 4) * 14),
    });
  }

  const screenPos = fragments.map(() => ({
    x: 0,
    y: 0,
    z: 0,
    s: 1,
    o: 0,
    gray: 0,
    zIdx: 10,
  }));

  const heroLiveBounds: { left: number; right: number }[] = layouts.heroSpreadSlots.map((s) => ({
    left: s.x,
    right: s.x + s.w,
  }));

  let wasPressHidden = false;
  let wasMonolithsHidden = false;
  let wasDeconstructHidden = false;
  const lastFragHidden = new Uint8Array(fragments.length);
  const lastFragColor: string[] = new Array(fragments.length).fill('#000000');
  const lastFragZIdx = new Int16Array(fragments.length).fill(-1);

  function getFocusX(tRaw: number): number {
    const t = ((tRaw % DURATION) + DURATION) % DURATION;
    for (let i = 0; i < FOCUS_KEYFRAMES.length - 1; i++) {
      const k0 = FOCUS_KEYFRAMES[i]!;
      const k1 = FOCUS_KEYFRAMES[i + 1]!;
      if (t >= k0.t && t <= k1.t) {
        if (k1.t <= k0.t) return k1.x;
        const raw = clamp((t - k0.t) / (k1.t - k0.t), 0, 1);
        const u = raw * raw * (3 - 2 * raw);
        return lerp(k0.x, k1.x, u);
      }
    }
    return FOCUS_KEYFRAMES[0]!.x;
  }

  /**
   * 100% Pure Deterministic Frame Renderer (`0 LSB` error under arbitrary jumps).
   */
  function renderAt(tRaw: number): void {
    const t = ((tRaw % DURATION) + DURATION) % DURATION;
    const pulse = beatPulse(t, 1);
    const activeCanvasPlates: string[] = [];
    let activeCosineBands = '';
    const activeCosineBoxes: string[] = [];

    ctx.setTransform(canvasScale, 0, 0, canvasScale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.clearRect(0, 0, STAGE_W, STAGE_H);

    world.style.transform = 'none';

    // -----------------------------------------------------------------------
    // 1. ACT I.1 (`0.0 – 13.0s`): FULL-6380PX SILKSCREEN PRESS & VERNIER DATUM
    // -----------------------------------------------------------------------
    pressUpperClip.style.clipPath = 'none';
    pressLowerClip.style.clipPath = 'none';

    if (t >= 12.95) {
      if (!wasPressHidden) {
        pressLayer.style.opacity = '0';
        pressHeroQuery.style.opacity = '0';
        voronoiImgA.style.opacity = '0';
        voronoiImgB.style.opacity = '0';
        platenTop.style.opacity = '0';
        platenBot.style.opacity = '0';
        pressFormula.style.opacity = '0';
        for (const pm of pressMemories) pm.lineEl.style.opacity = '0';
        wasPressHidden = true;
      }
    } else {
      wasPressHidden = false;
      const pressOut = 1 - span(t, 12.25, 12.90, easeInOutCubic);
      pressLayer.style.opacity = pressOut.toFixed(4);

      const qEnter = span(t, 0.16, 0.56, easeInOutCubic);
      const qDock = span(t, 10.80, 12.25, easeInOutCubic);
      const wght = Math.round(lerp(280, 780, span(t, 0.25, 6.2, easeInOut) + pulse * 0.06));
      const qScale = lerp(1.0, 56 / 120, qDock);
      const qX = lerp(118, 110, qDock);
      const qY = lerp(216, 62.24, qDock);
      pressHeroQuery.style.opacity = (qEnter * (1 - span(t, 12.15, 12.60, easeInOutCubic))).toFixed(4);
      pressHeroQuery.style.fontVariationSettings = `"wght" ${clamp(wght, 200, 900)}`;
      pressHeroQuery.style.transform = `translate3d(${(qX - 118).toFixed(2)}px, ${(qY - 216).toFixed(2)}px, 0) translateY(-50%) scale(${qScale.toFixed(4)})`;

      // Full-span cobalt vernier datum line extending right out to `X = 6380px`!
      const datumBridgeOp = span(t, 0.18, 0.56) * (1 - span(t, 10.8, 11.6)) * pressOut;
      if (datumBridgeOp > 0.01) {
        ctx.save();
        ctx.globalAlpha = datumBridgeOp * 0.84;
        ctx.strokeStyle = '#0000ff';
        ctx.lineWidth = 1.1;
        const dRight = lerp(1142, 6380, span(t, 0.18, 0.62, easeOutCubic));
        ctx.beginPath();
        // Leave central formula chamber `[3560..4360]` clean once formula opens
        const formGap = span(t, 8.25, 8.55, easeOutCubic);
        if (formGap > 0.02 && dRight > 3560) {
          ctx.moveTo(1142, 216.5);
          ctx.lineTo(3540, 216.5);
          if (dRight > 4380) {
            ctx.moveTo(4380, 216.5);
            ctx.lineTo(dRight, 216.5);
          }
        } else {
          ctx.moveTo(1142, 216.5);
          ctx.lineTo(dRight, 216.5);
        }
        ctx.stroke();

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.8;
        for (let vx = 1160; vx <= dRight; vx += 80) {
          if (formGap > 0.02 && vx >= 3530 && vx <= 4390) continue;
          const major = ((vx - 1160) / 80) % 2 === 0;
          const th = major ? 6.5 : 3.5;
          ctx.beginPath();
          ctx.moveTo(vx + 0.5, 216.5 - th);
          ctx.lineTo(vx + 0.5, 216.5 + th);
          ctx.stroke();
        }
        ctx.restore();
      }

      const vOp = span(t, 0.20, 0.62) * (1 - span(t, 11.75, 12.55, easeInOutCubic)) * 0.32;
      voronoiImgA.style.opacity = vOp.toFixed(3);
      voronoiImgA.style.transform = `scale(${(1.0 + t * 0.011).toFixed(4)})`;
      voronoiImgB.style.opacity = (vOp * 0.92).toFixed(3);
      voronoiImgB.style.transform = `scale(${(1.02 + t * 0.009).toFixed(4)})`;

      const crushU = span(t, 8.15, 9.85, easeInOutCubic);
      const formOpen = span(t, 8.38, 8.68, easeOutExpo);
      const platenVis = span(t, 0.16, 0.28) * (1 - span(t, 11.8, 12.55));
      const ruleDrawScaleX = span(t, 0.16, 0.52, easeOutCubic);
      const pTopY = lerp(34, 154, crushU);
      const pBotY = lerp(398, 278, crushU);

      platenTop.style.opacity = platenVis.toFixed(3);
      platenBot.style.opacity = platenVis.toFixed(3);
      platenTop.style.top = `${pTopY.toFixed(2)}px`;
      platenBot.style.top = `${pBotY.toFixed(2)}px`;
      platenTop.style.transform = `scaleX(${ruleDrawScaleX.toFixed(4)})`;
      platenBot.style.transform = `scaleX(${ruleDrawScaleX.toFixed(4)})`;

      const badgeHalfH = 20;
      for (const pm of pressMemories) {
        const memOn = span(t, pm.spec.appearAt, pm.spec.appearAt + 0.26, easeOutCubic);
        if (memOn <= 0.002 || t >= 9.95) {
          pm.lineEl.style.opacity = '0';
          continue;
        }

        const blueInverted = t >= pm.spec.appearAt + 0.52 || t >= 8.05;
        const isUpper = pm.spec.y < 216;
        let targetHoldY = pm.spec.y;
        let uSquash = 0;

        if (pm.idx === 3 || pm.idx === 4) {
          uSquash = span(t, 8.06, 8.28, easeInOut);
          targetHoldY = lerp(pm.spec.y, isUpper ? 174 : 258, uSquash);
        } else {
          if (pm.idx === 2) {
            targetHoldY = lerp(148, 132, span(t, 8.10, 8.60, easeOutCubic));
          } else if (pm.idx === 5) {
            targetHoldY = lerp(286, 300, span(t, 8.10, 8.60, easeOutCubic));
          }

          const jawDist = isUpper
            ? (targetHoldY - badgeHalfH) - (pTopY + 3)
            : (pBotY - 3) - (targetHoldY + badgeHalfH);
          uSquash = clamp((14 - jawDist) / 14, 0, 1);
        }

        const textAlpha = 1 - smoothstep(0.0, 0.62, uSquash);
        const scaleY = lerp(1.0, 0.15, smoothstep(0.28, 1.0, uSquash));
        const curHalfH = badgeHalfH * scaleY;

        let curY = targetHoldY;
        if (pm.idx !== 3 && pm.idx !== 4 && uSquash > 0.001) {
          if (isUpper) {
            curY = Math.min(154, Math.max(targetHoldY, pTopY + 3 + curHalfH + 3));
          } else {
            curY = Math.max(278, Math.min(targetHoldY, pBotY - 3 - curHalfH - 3));
          }
        }

        const innerMergeFade =
          pm.idx === 3 || pm.idx === 4 ? 1 - span(t, 8.30, 8.48) : 1 - span(t, 9.72, 9.92);
        const op = memOn * innerMergeFade * (1 - span(t, 11.8, 12.4));

        const gentleX = pm.spec.x + Math.sin(t * 0.85 + pm.idx * 0.9) * 6.0 * (1 - crushU);
        pm.lineEl.style.opacity = op.toFixed(3);
        pm.lineEl.style.left = `${gentleX.toFixed(2)}px`;
        pm.lineEl.style.top = `${curY.toFixed(2)}px`;
        pm.lineEl.style.transform = `translate(-50%, -50%) scaleY(${scaleY.toFixed(4)})`;
        pm.lineEl.style.background = blueInverted ? '#0000ff' : '#ffffff';
        pm.lineEl.style.borderColor = blueInverted ? '#0000ff' : '#000000';
        pm.lineEl.style.color = blueInverted
          ? `rgba(255, 255, 255, ${textAlpha.toFixed(3)})`
          : `rgba(0, 0, 0, ${textAlpha.toFixed(3)})`;
      }

      const formSlide = span(t, 11.15, 12.40, easeInCubic);
      pressFormula.style.opacity = (formOpen * (1 - span(t, 11.95, 12.55))).toFixed(3);
      pressFormula.style.transform = `translate(${lerp(-50, -180, formSlide).toFixed(2)}%, -50%) scale(${lerp(1, 0.56, formSlide).toFixed(4)})`;
    }

    // -----------------------------------------------------------------------
    // 2. MACRO 56px QUERY ANCHOR, `161.8s` PRE-IGNITION & `0.0px` SEAMLESS `171.45s` DOCKING
    // -----------------------------------------------------------------------
    const inGen1Anchor = t >= 12.10 && t < 43.92;
    const inGaleWeathering = t >= 161.8 && t < 171.45;
    const inGen2Anchor = t >= 171.45 && t < 199.10;

    const blizzardU = progress(t, 193.0, 199.42);
    const blizzardFrontX = lerp(6680, -420, easeInOutCubic(blizzardU));

    // Exact `0.0px` left-edge & vertical-center docking onto `datumGen2Span` (`left: 110px, centerY: 62.24px, scale: 56/104`) at `t = 171.45s`!
    const uGale = smootherstep(164.0, 171.45, t);
    const dockGen2 = smootherstep(168.3, 171.45, t);
    const galeScale = lerp(1.0, 56 / 104, dockGen2);
    const galeAnchorX = lerp(4866, 110, uGale);
    const galeAnchorY = lerp(216, 62.24, dockGen2);
    const galeAlignPct = -50 * (1 - dockGen2); // `-50%` (centered) -> `0%` (exact left edge `110px`!)
    const galeVisualWidth = 768 * galeScale;
    const galeVisualCenterX = galeAnchorX + (0.5 + galeAlignPct / 100) * galeVisualWidth;
    const galeLeftEdgeX = t >= 164.0 ? galeVisualCenterX - galeVisualWidth * 0.5 : 99999;

    if (!inGen1Anchor && !inGaleWeathering && !inGen2Anchor) {
      datumAnchor.style.opacity = '0';
      datumAnchor.style.transform = 'none';
    } else if (inGen1Anchor) {
      const aOp = span(t, 12.10, 12.55, easeInOutCubic) * (1 - span(t, 42.6, 43.75, easeInOutCubic));
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
      const enterW = span(t, 161.8, 162.55, easeOutCubic);
      datumAnchor.style.opacity = enterW.toFixed(3);
      datumAnchor.style.top = '182px';
      datumAnchor.style.transform = 'none';
      datumGen2Span.style.display = 'none';

      const charRights = [166, 222, 278, 334, 404, 460, 516, 586];
      let intactRatio = 0;

      datumGen1Spans.forEach((sp, idx) => {
        sp.style.display = 'inline-block';
        const cRight = charRights[idx]!;
        const wU = clamp((cRight + 210 - galeLeftEdgeX) / 118, 0, 1);
        const op = 1 - easeOutCubic(wU);
        intactRatio += op / 8;
        const dx = -easeInCubic(wU) * (135 + (idx % 3) * 32);
        const dy = clamp(((idx % 2 === 0 ? -1 : 1) * 44 + (hash(idx * 17) - 0.5) * 26) * easeOutCubic(wU), -88, 88);
        const rot = ((idx % 2 === 0 ? -1 : 1) * 20) * wU;
        sp.style.opacity = op.toFixed(3);
        sp.style.transform =
          wU > 0.001
            ? `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${(1 - wU * 0.42).toFixed(3)})`
            : 'none';

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

      // Crisp `15px` Bold Mono `COS 1.00` vernier tag (`y = 154`)
      const cosMarkAlpha = enterW * clamp(intactRatio * 1.25, 0, 1);
      if (cosMarkAlpha > 0.02) {
        ctx.save();
        ctx.globalAlpha = cosMarkAlpha;
        ctx.font = '700 15px "JetBrains Mono", monospace';
        ctx.fillStyle = '#0000ff';
        ctx.fillText('COS 1.00', 112, 154);
        ctx.strokeStyle = '#0000ff';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(202, 149);
        ctx.lineTo(268, 149);
        ctx.moveTo(268, 144);
        ctx.lineTo(268, 154);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // Exact instant 1:1 continuation from `galeBannerEl` at `t = 171.45s` (`opacity = 1.0`, `0.0px` position jump!)
      const blizzardScour = t >= 193.0 ? smoothstep(blizzardFrontX - 420, blizzardFrontX + 180, 344) : 0;
      const g2Op = 1 - blizzardScour;
      datumAnchor.style.opacity = g2Op.toFixed(3);
      datumAnchor.style.top = '32px';
      datumAnchor.style.transform = `translate3d(${(-blizzardScour * 68).toFixed(2)}px, 0, 0)`;
      for (const sp of datumGen1Spans) sp.style.display = 'none';
      datumGen2Span.style.display = 'inline-block';
      datumGen2Span.style.opacity = '1';
      datumGen2Span.style.transform = 'none';
      datumRule.style.background = '#000000';
      datumRule.style.opacity = '1';
      datumRule.style.transform = `scaleX(${span(t, 171.45, 172.25, easeOutCubic).toFixed(3)})`;
    }

    // -----------------------------------------------------------------------
    // 3. ACT I.2 (`13.0 – 18.56s`): CLEAR TOP-LEFT ANCHOR & `1.25s` PANORAMA DWELL
    // -----------------------------------------------------------------------
    if (t >= 13.0 && t < 18.56) {
      const runnerFade = span(t, 13.0, 13.25, easeOutCubic) * (1 - smootherstep(18.05, 18.56, t));
      const leadU = easeInOutCubic(progress(t, 13.05, 16.80));
      const leadX = lerp(600, 6360, leadU);

      if (runnerFade > 0.005) {
        ctx.save();
        const scaleExtend = clamp(leadU * 1.28 + 0.22, 0, 1);
        const scaleMaxX = lerp(560, 6380, scaleExtend);
        ctx.strokeStyle = `rgba(0, 0, 0, ${(0.58 * runnerFade).toFixed(3)})`;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(560, 356.5);
        ctx.lineTo(scaleMaxX, 356.5);
        ctx.stroke();

        ctx.font = '700 13px "JetBrains Mono", monospace';
        ctx.fillStyle = `rgba(0, 0, 0, ${(0.78 * runnerFade).toFixed(3)})`;
        for (let m = 0; m <= 30; m += 5) {
          const mx = 586 + (m / 30) * 5560;
          if (mx > scaleMaxX) break;
          ctx.beginPath();
          ctx.moveTo(mx + 0.5, 350);
          ctx.lineTo(mx + 0.5, 363);
          ctx.stroke();
          ctx.fillText(`${m.toFixed(1)} m`, mx - 18, 380);
        }

        if (scaleMaxX >= 6180) {
          ctx.fillStyle = `rgba(226, 0, 0, ${(0.92 * runnerFade).toFixed(3)})`;
          ctx.fillText('COS 1.00 → 0.14', 6200, 380);
        }

        // 18 windows at `sx = 684 + k * 326` (`586..6324`), `100%` clear of top-left `"김치찌개 끓이는 법"` (`X = 110..578`)!
        const stCount = 18;
        for (let k = 0; k < stCount; k++) {
          const sx = 684 + k * 326;
          const sw = 196;
          const syTop = 74;
          const sh = 258;
          const leftX = sx - sw * 0.5;
          const rightX = sx + sw * 0.5;
          const crossed = leadX >= sx - 36;

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

          const age = clamp((leadX - sx) / 4800, 0, 1);
          const winAlpha = runnerFade * lerp(0.94, 0.58, age);
          const plateId = SLIT_PLATE_SEQ[k]!;
          const pImg = getDecodedPlate(plateId);

          if (pImg && winAlpha * 0.88 >= 0.04) {
            activeCanvasPlates.push(plateId);
            ctx.save();
            ctx.beginPath();
            ctx.rect(leftX, syTop, sw, sh);
            ctx.clip();
            ctx.globalCompositeOperation = 'multiply';
            ctx.globalAlpha = winAlpha * 0.88;
            const drawW = sw / 0.36;
            const maxPan = Math.max(1, drawW - sw);
            const scanOsc = 0.5 - 0.5 * Math.cos(((t - 13.0) * 0.72 + k * 0.29) * Math.PI);
            const panX = leftX - scanOsc * maxPan;
            ctx.drawImage(pImg, panX, syTop, drawW, sh);
            ctx.restore();
          }

          ctx.globalAlpha = winAlpha;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.1;
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

          ctx.globalAlpha = runnerFade * lerp(0.94, 0.44, age);
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = t < 16.85 && k === Math.floor(leadU * (stCount - 1)) ? 2.4 : 1.35;
          ctx.beginPath();
          ctx.moveTo(sx + 0.5, syTop - 8);
          ctx.lineTo(sx + 0.5, syTop + sh + 10);
          ctx.stroke();

          ctx.globalAlpha = winAlpha * 0.9;
          ctx.fillStyle = '#000000';
          ctx.font = '700 11.5px "JetBrains Mono", monospace';
          ctx.fillText(`SL.${String(k + 1).padStart(2, '0')}`, leftX + 4, syTop - 4);
        }

        // Sweep lead cursor fades gracefully once it reaches `6360px` at `16.80s` so `16.80..18.05s` is serene panorama dwell!
        const cursorOp = runnerFade * (1 - smoothstep(16.75, 17.15, t));
        if (cursorOp > 0.01) {
          ctx.globalAlpha = cursorOp;
          ctx.strokeStyle = '#0000ff';
          ctx.lineWidth = 3.0;
          ctx.beginPath();
          ctx.moveTo(leadX, 56);
          ctx.lineTo(leadX, 356);
          ctx.stroke();

          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(Math.max(586, leadX - 380), 216);
          ctx.lineTo(Math.max(586, leadX - 150), 216);
          ctx.lineTo(Math.max(586, leadX - 150), 62);
          ctx.lineTo(leadX, 62);
          ctx.stroke();
        }

        ctx.restore();
      }
    }

    // -----------------------------------------------------------------------
    // 4. PRISM GATE, PERMANENT 3-TIER UNIDIRECTIONAL CARDS, PARALLAX ARROWS & CAUSAL HISTORY
    // -----------------------------------------------------------------------
    const inAct1Arch = t >= 17.85 && t < 43.96;
    const inAct4Arch = t >= 170.85 && t < 199.35;
    const foldConvergeU = inAct1Arch ? easeInOutCubic(progress(t, 42.50, 43.90)) : 0;

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

    if (inAct1Arch && t >= 18.05) {
      const foldOutFade = 1 - span(t, 42.50, 43.60, easeInOutCubic);
      const pIn = span(t, 18.05, 18.58, easeOutCubic) * foldOutFade;
      const pShift = Math.sin((t - 18.1) * 0.56) * 12.0;
      prismGateGen1.style.display = pIn > 0.002 ? 'flex' : 'none';
      prismGateGen1.style.opacity = pIn.toFixed(3);
      prismGateGen1.style.transform = `translate3d(${pShift.toFixed(3)}px, 0, 0)`;
      drawPrismHatch(1716 + pShift, pIn);
    } else {
      prismGateGen1.style.display = 'none';
      prismGateGen1.style.opacity = '0';
    }

    if (inAct4Arch) {
      const veilAtten = t >= 193.0 ? smoothstep(blizzardFrontX - 420, blizzardFrontX + 140, 1784) : 0;
      const pIn = span(t, 170.90, 171.50, easeOutCubic) * (1 - veilAtten);
      const pShift = Math.sin((t - 171.0) * 0.56) * 12.0;
      prismGateGen2.style.display = pIn > 0.002 ? 'flex' : 'none';
      prismGateGen2.style.opacity = pIn.toFixed(3);
      prismGateGen2.style.transform = `translate3d(${pShift.toFixed(3)}px, 0, 0)`;
      drawPrismHatch(1716 + pShift, pIn);
    } else {
      prismGateGen2.style.display = 'none';
      prismGateGen2.style.opacity = '0';
    }

    const anyArchLive = (t >= 18.58 && t < 43.96) || (t >= 171.40 && t < 199.35);

    if (!anyArchLive) {
      if (!wasMonolithsHidden) {
        for (const c of monoliths) {
          c.el.style.opacity = '0';
          c.el.style.transform = 'translate3d(-9999px, -9999px, 0)';
          if (c.regMark) c.regMark.setAttribute('visibility', 'hidden');
        }
        for (const sb of stationBeacons) {
          sb.el.style.opacity = '0';
        }
        for (const arr of orthoArrows) {
          arr.path.style.opacity = '0';
          arr.pulsePath.style.opacity = '0';
          arr.head.style.opacity = '0';
        }
        sastrugiBackdrop.style.opacity = '0';
        sastrugiBackdrop.style.transform = 'none';
        wasMonolithsHidden = true;
      }
    } else {
      wasMonolithsHidden = false;
      const camPanGen1 = inAct1Arch ? Math.sin((t - 19.0) * 0.48) * 96 + (t - 29.0) * 5.5 : 0;
      const camPanGen2 = inAct4Arch ? Math.sin((t - 172.0) * 0.52) * 94 + (t - 181.0) * 6.0 : 0;
      const freezeSwapTimeGen1 = Math.min(t, 42.40);

      // Lock orthogonal arrow groups to exact `z = 84` station parallax!
      const stationShiftGen1 = -camPanGen1 * ((84 + 60) / 120);
      const stationShiftGen2 = -camPanGen2 * ((84 + 60) / 120);
      arrowLayerGen1.style.transform = `translate3d(${stationShiftGen1.toFixed(2)}px, 0, 0)`;
      arrowLayerGen2.style.transform = `translate3d(${stationShiftGen2.toFixed(2)}px, 0, 0)`;

      for (const c of monoliths) {
        const live = (c.gen === 1 && t >= 18.58 && t < 43.95) || (c.gen === 2 && t >= 171.50 && t < 199.35);
        if (!live) {
          c.el.style.opacity = '0';
          c.el.style.transform = 'translate3d(-9999px, -9999px, 0)';
          if (c.regMark) c.regMark.setAttribute('visibility', 'hidden');
          continue;
        }

        const enter = span(t, c.at, c.at + 0.56, easeInOutCubic);
        if (enter <= 0.002) {
          c.el.style.opacity = '0';
          c.el.style.transform = 'translate3d(-9999px, -9999px, 0)';
          if (c.regMark) c.regMark.setAttribute('visibility', 'hidden');
          continue;
        }

        const camPan = c.gen === 1 ? camPanGen1 : camPanGen2;
        let slotDx = 0;
        let slotDy = 0;
        let slotDz = c.z;
        let slotScale = 1.0;
        let slotRotY = c.rotY;
        let cardAlpha = 1.0;
        let zOrder = Math.round(200 + c.z);

        if (c.stationIdx !== undefined && c.cardSlot !== undefined) {
          // Unidirectional `r=2 -> r=1 -> r=0` Stepped Stack + Rightward `+390px` Arc (`1.68s` move + `2.32s` dwell)
          const evalT = c.gen === 1 ? freezeSwapTimeGen1 : t;
          const deckStart = (c.gen === 1 ? 20.1 : 172.4) + c.stationIdx * 0.65;
          const cycleFloat = Math.max(0, (evalT - deckStart) / 4.0);
          const cycleIdx = Math.floor(cycleFloat);
          const dealRaw = clamp((cycleFloat - cycleIdx) / 0.42, 0, 1);
          const dealU = dealRaw * dealRaw * (3 - 2 * dealRaw);

          const rankOf = (b: number): number => (((2 - c.cardSlot! - b) % 3) + 3) % 3;
          const r0 = rankOf(cycleIdx);
          const r1 = rankOf(cycleIdx + 1);

          // [dx, dy, dz, scale, dRotY, alpha]
          const rankPose = (r: number): [number, number, number, number, number, number] => {
            if (r === 0) return [0, 0, 84, 1.00, 0, 1.00];
            if (r === 1) return [-58, -12, 24, 0.90, -2, 0.82];
            return [-112, -22, -32, 0.80, -4, 0.64];
          };

          const p0 = rankPose(r0);
          const p1 = rankPose(r1);
          slotDx = lerp(p0[0], p1[0], dealU);
          slotDy = lerp(p0[1], p1[1], dealU);
          slotDz = lerp(p0[2], p1[2], dealU);
          slotScale = lerp(p0[3], p1[3], dealU);
          slotRotY = c.rotY + lerp(p0[4], p1[4], dealU);
          cardAlpha = lerp(p0[5], p1[5], dealU);

          const stZBase = 200 + c.stationIdx * 100;
          const arcSin = Math.sin(Math.PI * dealU);
          if (r0 === 0 && r1 === 2 && dealU > 0.0005) {
            slotDx += 390 * arcSin; // `-56 + 390 = +334px` at `dealU = 0.50` -> `> 60px` clear horizontal gap!
            slotDy -= 8 * arcSin;
            slotRotY -= 8 * arcSin;
            zOrder = dealU < 0.50 ? stZBase + 90 : stZBase + 10;
          } else if (r0 === 1 && r1 === 0) {
            zOrder = stZBase + 60;
          } else if (r0 === 2 && r1 === 1) {
            zOrder = stZBase + 30;
          } else {
            zOrder = r0 === 0 ? stZBase + 90 : r0 === 1 ? stZBase + 60 : stZBase + 30;
          }
        } else if (c.alignedIdx !== undefined) {
          const waveStart = c.gen === 1 ? 18.65 : 171.6;
          const wavePhase = (t - waveStart) * Math.PI - c.alignedIdx * 0.72;
          const waveSin = Math.sin(wavePhase);
          const waveCos = Math.cos(wavePhase);

          const sweepPos = (((t - waveStart) / 2.5) * 6) % 6;
          const distSweep = Math.min(Math.abs(sweepPos - c.alignedIdx), 6 - Math.abs(sweepPos - c.alignedIdx));
          const sweepBoost = Math.max(0, 1 - distSweep * 0.85);

          slotDy += waveSin * 18.0;
          slotDx += waveCos * 10.0;
          slotRotY += waveSin * 4.8;
          slotScale = c.isHero ? 1.0 + sweepBoost * 0.025 : 0.96 + sweepBoost * 0.075;
          zOrder = c.isHero ? 195 : Math.round(110 + c.alignedIdx * 14 + sweepBoost * 4);

          if (c.slideDoms && c.slideDoms.length === 3) {
            const barFloat = Math.max(0, (t - waveStart) / 3.0);
            const sIdx = Math.floor(barFloat) % 3;
            const nextIdx = (sIdx + 1) % 3;
            const transU = easeInOutCubic(clamp((barFloat - Math.floor(barFloat) - 0.76) / 0.24, 0, 1));
            c.metricEl.textContent =
              transU > 0.5 ? c.slideDoms[nextIdx]!.metric : c.slideDoms[sIdx]!.metric;
            for (let k = 0; k < 3; k++) {
              const sd = c.slideDoms[k]!;
              if (k === sIdx && transU < 0.999) {
                sd.el.style.opacity = (1 - transU).toFixed(3);
                sd.el.style.transform = `translate3d(0, ${(-transU * 20).toFixed(2)}px, 0)`;
              } else if (k === nextIdx && transU > 0.001) {
                sd.el.style.opacity = transU.toFixed(3);
                sd.el.style.transform = `translate3d(0, ${((1 - transU) * 20).toFixed(2)}px, 0)`;
              } else {
                sd.el.style.opacity = '0';
                sd.el.style.transform = 'translate3d(0, 22px, 0)';
              }
            }
          }
        }

        c.el.style.zIndex = String(zOrder);

        // Lock Skewed station parallax to uniform station plane (`z = 84`) so cards, beacons & arrows stay tightly coherent!
        const parallaxZ = c.stationIdx !== undefined ? 84 : slotDz;
        let pxShift = slotDx - camPan * ((parallaxZ + 60) / 120);
        let pyShift = slotDy + (1 - enter) * 22 + (c.alignedIdx !== undefined ? 0 : Math.sin(t * 0.95 + c.x * 0.002) * 2.5);
        let rotY = slotRotY + Math.sin(t * 0.50 + slotDz * 0.02) * 1.4;
        let rotX = c.rotX;
        let scale = slotScale;
        let op = enter * cardAlpha;

        if (c.gen === 1 && t >= 42.50) {
          const isAnchor04Front = c.stationIdx === 3 && cardAlpha > 0.9;
          if (isAnchor04Front) {
            const targetCenterX = 4588 + 336 * 0.5;
            const targetCenterY = 30 + 244 * 0.5 + 16;
            const curBaseCenterX = c.x + c.w * 0.5;
            const curBaseCenterY = c.y + c.h * 0.5;
            pxShift = lerp(pxShift, targetCenterX - curBaseCenterX, foldConvergeU);
            pyShift = lerp(pyShift, targetCenterY - curBaseCenterY, foldConvergeU);
            rotY = lerp(rotY, 0, foldConvergeU);
            rotX = lerp(rotX, 0, foldConvergeU);
            scale = lerp(slotScale, 1.02, foldConvergeU);
            op *= 1 - smoothstep(0.35, 0.98, foldConvergeU);
          } else {
            const earlyFold = easeInOutCubic(progress(t, 42.50, 43.65));
            rotY = lerp(rotY, rotY < 0 ? -78 : 78, earlyFold);
            pxShift += (c.x < 4588 ? -165 : 135) * earlyFold;
            op *= 1 - earlyFold;
          }
        }

        if (c.gen === 2 && t >= 193.0) {
          const cardCenterX = c.x + pxShift + c.w * 0.5;
          const scoured = smoothstep(blizzardFrontX - 460, blizzardFrontX + 180, cardCenterX);
          pxShift -= scoured * 96;
          rotY -= scoured * 28;
          op *= 1 - scoured;
        }

        op = clamp(op, 0, 1);
        if (op <= 0.004) {
          c.el.style.opacity = '0';
          c.el.style.transform = 'translate3d(-9999px, -9999px, 0)';
          if (c.regMark) c.regMark.setAttribute('visibility', 'hidden');
          continue;
        }

        const perspExpand = 1 + Math.abs(Math.sin((rotY * Math.PI) / 180)) * 0.36;
        const effHalfH = c.h * 0.5 * scale * perspExpand;
        const centerBaseY = c.y + c.h * 0.5;
        pyShift = clamp(pyShift, 28 + effHalfH - centerBaseY, 402 - effHalfH - centerBaseY);

        c.el.style.opacity = op.toFixed(3);
        c.el.style.transform = `perspective(580px) translate3d(${pxShift.toFixed(2)}px, ${pyShift.toFixed(2)}px, 0px) scale(${scale.toFixed(4)}) rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg)`;

        // Station-fixed Registration Crosshairs (anchored to station base `c.x - camPan * 1.2`, ZERO 4.0s jump!)
        if (c.regMark) {
          const regOp = enter * (c.gen === 1 ? 1 - smoothstep(0.0, 0.35, foldConvergeU) : 1 - (t >= 193.0 ? smoothstep(blizzardFrontX - 460, blizzardFrontX + 180, c.x + 160) : 0));
          if (regOp > 0.15) {
            c.regMark.removeAttribute('visibility');
            const stShiftX = c.stationIdx !== undefined ? -camPan * ((84 + 60) / 120) : pxShift;
            const stShiftY = c.stationIdx !== undefined ? 0 : pyShift;
            const lx = c.x + stShiftX;
            const rx = lx + c.w;
            const by = Math.min(396, c.y + c.h + stShiftY + 6);
            c.regMark.setAttribute(
              'd',
              `M${(lx - 6).toFixed(1)} ${by.toFixed(1)} L${(lx + 14).toFixed(1)} ${by.toFixed(1)} M${lx.toFixed(1)} ${(by - 8).toFixed(1)} L${lx.toFixed(1)} ${(by + 5).toFixed(1)} ` +
                `M${(rx - 14).toFixed(1)} ${by.toFixed(1)} L${(rx + 6).toFixed(1)} ${by.toFixed(1)} M${rx.toFixed(1)} ${(by - 8).toFixed(1)} L${rx.toFixed(1)} ${(by + 5).toFixed(1)}`,
            );
            c.regMark.setAttribute('stroke-opacity', (0.42 * regOp).toFixed(3));
          } else {
            c.regMark.setAttribute('visibility', 'hidden');
          }
        }
      }

      for (const sb of stationBeacons) {
        const live = (sb.gen === 1 && t >= 18.58 && t < 43.80) || (sb.gen === 2 && t >= 171.45 && t < 199.35);
        if (!live) {
          sb.el.style.opacity = '0';
          continue;
        }
        const enter = span(t, sb.at, sb.at + 0.45, easeOutCubic);
        const camPan = sb.gen === 1 ? camPanGen1 : camPanGen2;
        const pxShift = -camPan * ((84 + 60) / 120);
        let op = enter;
        if (sb.gen === 1 && t >= 42.50) {
          op *= 1 - easeInOutCubic(progress(t, 42.50, 43.55));
        }
        if (sb.gen === 2 && t >= 193.0) {
          op *= 1 - smoothstep(blizzardFrontX - 460, blizzardFrontX + 160, sb.x + 120);
        }
        sb.el.style.opacity = clamp(op, 0, 1).toFixed(3);
        sb.el.style.transform = `translate3d(${pxShift.toFixed(2)}px, ${((1 - enter) * 10).toFixed(2)}px, 0)`;
      }

      for (const arr of orthoArrows) {
        const live = (arr.gen === 1 && t >= 18.58 && t < 43.80) || (arr.gen === 2 && t >= 171.35 && t < 199.35);
        if (!live) {
          arr.path.style.opacity = '0';
          arr.pulsePath.style.opacity = '0';
          arr.head.style.opacity = '0';
          continue;
        }
        const drawP = span(t, arr.at, arr.at + arr.dur, easeInOutCubic);
        let fade = arr.gen === 1 ? 1 - smoothstep(0.0, 0.72, foldConvergeU) : 1;
        if (arr.gen === 2 && t >= 193.0) {
          fade *= 1 - progress(t, 193.4, 196.6);
        }
        arr.path.setAttribute('stroke-dasharray', `${drawP.toFixed(4)} 1`);
        arr.path.style.opacity = drawP > 0.005 ? (0.88 * fade).toFixed(3) : '0';
        arr.head.style.opacity = (progress(t, arr.at + arr.dur * 0.85, arr.at + arr.dur) * fade).toFixed(3);

        if (drawP >= 0.99 && fade > 0.05) {
          const packetPos = (t * 0.86 + arr.idx * 0.27) % 1.0;
          arr.pulsePath.setAttribute('stroke-dasharray', '0.10 1');
          arr.pulsePath.setAttribute('stroke-dashoffset', `${(1 - packetPos).toFixed(4)}`);
          arr.pulsePath.style.opacity = (0.96 * fade).toFixed(3);
        } else {
          arr.pulsePath.style.opacity = '0';
        }
      }

      if (t >= 171.60 && t < 199.35) {
        const sReveal = span(t, 171.75, 174.20, easeInOutCubic) * 0.44;
        const sErase = t >= 193.0 ? smoothstep(blizzardFrontX - 580, blizzardFrontX + 220, 4720) : 0;
        sastrugiBackdrop.style.opacity = (sReveal * (1 - sErase)).toFixed(3);
        sastrugiBackdrop.style.transform = `translate3d(${(Math.sin(t * 0.42) * 18).toFixed(2)}px, 0, 0)`;
      } else {
        sastrugiBackdrop.style.opacity = '0';
        sastrugiBackdrop.style.transform = 'none';
      }
    }

    const histVis = inAct1Arch
      ? span(t, 18.2, 18.8, easeOutCubic) * (1 - easeInOutCubic(progress(t, 42.50, 43.75)))
      : inAct4Arch
        ? span(t, 171.1, 171.7, easeOutCubic) * (1 - smoothstep(blizzardFrontX - 420, blizzardFrontX + 100, 6220))
        : 0;
    historyWrap.style.opacity = clamp(histVis, 0, 1).toFixed(3);
    if (histVis > 0.005) {
      historyWrap.style.visibility = 'visible';
      if (inAct1Arch) {
        historyBeltGen1.listEl.style.visibility = 'visible';
        historyBeltGen2.listEl.style.visibility = 'hidden';
        historyBeltGen1.setScrollAt(t);
      } else {
        historyBeltGen1.listEl.style.visibility = 'hidden';
        historyBeltGen2.listEl.style.visibility = 'visible';
        historyBeltGen2.setScrollAt(t);
      }
    } else {
      historyWrap.style.visibility = 'hidden';
      historyBeltGen1.listEl.style.visibility = 'hidden';
      historyBeltGen2.listEl.style.visibility = 'hidden';
    }

    // -----------------------------------------------------------------------
    // 5. CONCERTINA FOLD-OUT (`42.6–48.0s`), ACT II (`48.0–78.0s`),
    //    ACT III (`78.0–150.0s`) & ACT IV.1–2 (`150.0–164.95s`)
    // -----------------------------------------------------------------------
    const inDeconstruct = t >= 42.60 && t < 165.0;

    if (!inDeconstruct) {
      if (!wasDeconstructHidden) {
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
          sEl.style.transform = 'translate3d(-9999px, -9999px, 0)';
        }
        for (let i = 0; i < fragEls.length; i++) {
          if (!lastFragHidden[i]) {
            fragEls[i]!.style.opacity = '0';
            fragEls[i]!.style.transform = 'translate3d(-9999px, -9999px, 0)';
            lastFragHidden[i] = 1;
          }
        }
        wasDeconstructHidden = true;
      }
    } else {
      wasDeconstructHidden = false;
      const anchorFoldX = 4756;

      // A. Concertina Accordion Lines (`42.65–47.95s`) + `heroSpreadSlots` (`44.05–63.65s`)
      if (t >= 42.65 && t < 48.0) {
        const cLineOp = Math.sin(progress(t, 42.65, 48.0) * Math.PI);
        const spreadFrontL = lerp(anchorFoldX, 90, easeOutCubic(progress(t, 42.70, 47.65)));
        const spreadFrontR = lerp(anchorFoldX, 6390, easeOutCubic(progress(t, 42.70, 47.45)));
        ctx.save();
        ctx.strokeStyle = `rgba(230, 0, 0, ${(0.66 * cLineOp).toFixed(3)})`;
        ctx.lineWidth = 1.4;
        for (const hy of [30, 402]) {
          ctx.beginPath();
          ctx.moveTo(spreadFrontL, hy);
          ctx.lineTo(spreadFrontR, hy);
          ctx.stroke();
        }
        ctx.strokeStyle = `rgba(0, 0, 0, ${(0.22 * cLineOp).toFixed(3)})`;
        ctx.lineWidth = 0.8;
        for (let fx = 500; fx <= 5980; fx += 340) {
          if (fx < spreadFrontL || fx > spreadFrontR) continue;
          ctx.beginPath();
          ctx.moveTo(fx + 0.5, 30);
          ctx.lineTo(fx + 0.5, 402);
          ctx.stroke();
        }
        ctx.restore();
      }

      const spreadMasterOp =
        t < 44.05
          ? 0
          : span(t, 44.05, 45.20, easeInOutCubic) * (1 - span(t, 62.60, 63.65, easeInOutCubic));
      spreadLayer.style.opacity = spreadMasterOp.toFixed(3);

      const imgDriftU = progress(t, 44.1, 63.4);
      for (let sIdx = 0; sIdx < heroSpreadEls.length; sIdx++) {
        const hSlot = heroSpreadEls[sIdx]!;
        if (spreadMasterOp <= 0.002) {
          hSlot.wrap.style.opacity = '0';
          continue;
        }
        const slotCenterX = hSlot.slot.x + hSlot.slot.w * 0.5;
        const distNorm = Math.abs(slotCenterX - anchorFoldX) / 4650;
        const localUnfold =
          t < 48.0
            ? easeInOutCubic(clamp((progress(t, 44.05, 47.92) - distNorm * 0.36) / 0.64, 0, 1))
            : 1.0;

        const strikeAt = 52.20 + sIdx * 1.40;
        const shearHero =
          t >= strikeAt
            ? smoothstep(strikeAt, strikeAt + 0.48, t) *
              (1 - smoothstep(61.6, 62.7, t)) *
              (sIdx % 2 === 0 ? -7.0 : 7.0)
            : 0;
        const peel = span(t, 62.55 + sIdx * 0.10, 63.55 + sIdx * 0.10, easeInOutCubic);

        heroLiveBounds[sIdx]!.left = hSlot.slot.x + shearHero;
        heroLiveBounds[sIdx]!.right = hSlot.slot.x + hSlot.slot.w + shearHero;

        const foldShiftX = (1 - localUnfold) * (slotCenterX < anchorFoldX ? 140 : -140);
        if (localUnfold < 0.9999) {
          hSlot.wrap.style.transformOrigin = slotCenterX < anchorFoldX ? '100% 50%' : '0% 50%';
          hSlot.wrap.style.opacity = (spreadMasterOp * localUnfold * (1 - peel)).toFixed(3);
          hSlot.wrap.style.transform = `translate3d(${foldShiftX.toFixed(2)}px, 0px, 0) scaleX(${Math.max(0.04, localUnfold).toFixed(4)})`;
        } else {
          hSlot.wrap.style.transformOrigin = '50% 50%';
          hSlot.wrap.style.opacity = (spreadMasterOp * (1 - peel)).toFixed(3);
          hSlot.wrap.style.transform = `translate3d(${shearHero.toFixed(2)}px, ${(-peel * 16).toFixed(2)}px, 0)`;
        }

        const imgScale = 1.0 + imgDriftU * 0.095;
        const imgPanX = (sIdx % 2 === 0 ? 1 : -1) * Math.sin(imgDriftU * Math.PI * 2.0) * 18;
        hSlot.img.style.transform = `scale(${imgScale.toFixed(4)}) translate3d(${imgPanX.toFixed(2)}px, 0, 0)`;
      }

      // B. Configure Three.js Parallel-Dolly PerspectiveCamera
      const helixSpin = Math.max(0, t - 87.0) * 0.46;
      const sphereSpin = Math.max(0, t - 138.0) * 0.28;

      if (t >= 86.5 && t < 105.0) {
        const hCamX = Math.sin(helixSpin * 0.32) * 56;
        camera3D.position.set(hCamX, 0, Z_CAM);
        camera3D.lookAt(hCamX, 0, 0);
        camera3D.updateMatrixWorld();
        camera3D.updateProjectionMatrix();
      } else if (t >= 114.0 && t < 132.0) {
        const uFly = smootherstep(115.0, 128.0, t);
        const camX = catmullRom(-240, -90, 110, 240, uFly);
        camera3D.position.set(camX, 0, Z_CAM);
        camera3D.lookAt(camX, 0, 0);
        camera3D.updateMatrixWorld();
        camera3D.updateProjectionMatrix();
      } else if (t >= 137.0 && t < 151.0) {
        camera3D.position.set(0, 0, Z_CAM);
        camera3D.lookAt(0, 0, 0);
        camera3D.updateMatrixWorld();
        camera3D.updateProjectionMatrix();
      }

      // C. Compute C² Positions & Carbon-Ink Depth Tones across All 8 Spaces
      const activeScanWaves = multiWaveScans.filter((st) => t >= st.t0 && t < st.t1);
      const activeScanNodes = new Set<number>();
      for (const wv of activeScanWaves) {
        for (const cal of wv.calipers) {
          activeScanNodes.add(cal.pair[0]);
          activeScanNodes.add(cal.pair[1]);
        }
      }
      const scanDim = win(t, 64.25, 76.65, 0.45);
      const orbitMarkOp = span(t, 128.2, 129.4, easeInOutCubic) * (1 - span(t, 148.8, 149.9, easeInOutCubic));

      const focusDim = span(t, 150.0, 151.2, easeInOutCubic);
      const resonantSet = new Set(neighborIndices);

      for (let i = 0; i < fragments.length; i++) {
        const f = fragments[i]!;
        const stagger = i === targetIndex ? 0 : hash(i * 11 + 5) * 0.30;
        const curve = (hash(i * 23 + 9) - 0.5) * 64;

        // 1) `page`: Concertina Unfold (`43.35..47.92s` text, `44.20..47.92s` img) + Smooth Shear (`52.05..62.7s`)
        const pPage = layouts.page[i]!;
        const colIdx = layouts.pageColOf[i]!;
        const rowIdx = layouts.pageRowOf[i]!;
        let x = pPage.x;
        let y = pPage.y;
        let z = 0;
        let s = pPage.scale;
        let o = pPage.opacity;
        let gray = 0;
        let zIdx = f.isMacroHub ? 36 : 12;

        if (t < 48.0) {
          if (f.type === 'img' && t < 44.20) {
            o = 0;
          } else {
            const distNorm = Math.abs(pPage.x - anchorFoldX) / 4650;
            const startUnfold = f.type === 'img' ? 44.20 : 43.35;
            const uFold = easeInOutCubic(clamp((progress(t, startUnfold, 47.92) - distNorm * 0.38) / 0.62, 0, 1));
            x = lerp(anchorFoldX + (pPage.x < anchorFoldX ? -110 : 110), pPage.x, uFold);
            o *= uFold;
          }
        }

        if (t >= 52.05 && t < 63.0) {
          const strikeT = 52.05 + colIdx * 0.28;
          if (t >= strikeT) {
            const shearU = smoothstep(strikeT, strikeT + 0.48, t) * (1 - smoothstep(61.6, 62.7, t));
            x += (rowIdx % 2 === 0 ? -5.5 : 5.5) * shearU;
            y += (colIdx % 2 === 0 ? -6.5 : 6.5) * shearU;
          }
        }

        // 2) Morph -> `spectrum2D` (`63.0..64.45s`, settled before `65.0s`!)
        const uSpec = smootherstep(63.0 + stagger * 0.50, 64.45 + stagger * 0.50, t);
        if (uSpec > 0) {
          const pS = layouts.spectrum2D[i]!;
          [x, y] = stepArc(x, y, pS.x, pS.y, uSpec, curve * 0.45);
          s = lerp(s, pS.scale, uSpec);
          o = lerp(o, pS.opacity, uSpec);
        }

        // 3) Morph -> `reading2D` (`78.0..87.0s`): Rigid `±24px` Y Counter-Glide + `±38px` X Panorama Breathing (`0` at `t=82.5s`!)
        const uRead = smootherstep(78.0 + stagger * 0.70, 79.95 + stagger * 0.70, t);
        const uHelix = smootherstep(87.0 + stagger * 0.80, 89.35 + stagger * 0.80, t);
        if (uRead > 0 && uHelix < 1) {
          const pR = layouts.reading2D[i]!;
          const rCol = layouts.readingColOf[i]!;
          const driftEnv = smootherstep(79.0, 80.3, t) * (1 - uHelix);
          const glideY = Math.sin((t - 82.5) * 1.25) * 24.0 * (rCol % 2 === 0 ? 1 : -1) * driftEnv;
          const glideX = Math.sin((t - 82.5) * 0.85) * 38.0 * driftEnv;
          const rx = pR.x + glideX;
          const ry = pR.y + glideY;
          [x, y] = stepArc(x, y, rx, ry, uRead, curve * 0.65);
          s = lerp(s, pR.scale, uRead);
          const waveRead = 1 - 0.12 * driftEnv * (0.5 - 0.5 * Math.cos(t * 3.2 - pR.x * 0.0022));
          o = lerp(o, pR.opacity * waveRead, uRead);
          gray = 0;
        }

        // 4) Morph -> `helix3D` (`87.0..102.0s`): 6-Phase Perspective-Compensated Lattice (`0` Foreground Collisions!)
        const uMean = smootherstep(102.0 + stagger * 0.80, 104.35 + stagger * 0.80, t);
        if (uHelix > 0 && uMean < 1) {
          const hb = layouts.helixBase[i]!;
          const ang = hb.angle + helixSpin;
          const cosA = Math.cos(ang);
          const sinA = Math.sin(ang);
          const wz = cosA * hb.radiusZ;
          const wx = (hb.x - STAGE_W * 0.5) * ((Z_CAM - wz * 0.88) / Z_CAM);
          const proj = project3D(wx, 0, wz);
          const syRaw = 216 - sinA * hb.radiusY * (1 + wz * 0.00042);
          const depth01 = (cosA + 1) * 0.5;
          const hs = hb.scale * lerp(0.84, 1.10, depth01);
          const hhH = fastBoxH(i, hs) * 0.5;
          const safeHy = softMin(softMax(syRaw, 27 + hhH, 5), 405 - hhH, 5);

          const frontVis = smoothstep(0.10, 0.56, cosA);
          const edgeFade = smoothstep(-80, 160, proj.sx) * smoothstep(-80, 160, STAGE_W - proj.sx);
          const ho = lerp(0.09, 1.0, frontVis) * edgeFade;
          const hGray = lerp(185, 0, frontVis);

          const edgeSafeBow = smoothstep(260, 720, Math.min(x, STAGE_W - x));
          [x, y] = stepArc(x, y, proj.sx, safeHy, uHelix, curve * 0.38 * edgeSafeBow);
          z = lerp(z, wz, uHelix);
          s = lerp(s, hs, uHelix);
          o = lerp(o, ho, uHelix);
          gray = lerp(gray, hGray, uHelix);
          zIdx = Math.round(10 + frontVis * 65);
        }

        // 5) Morph -> `meaning2D` (`102.0..115.0s`): Rigid Per-Cluster Buoyancy (`±22×15px`, exact `0` at `t=108.5s`!)
        const uCloud = smootherstep(115.0 + stagger * 0.80, 117.35 + stagger * 0.80, t);
        if (uMean > 0 && uCloud < 1) {
          const pM = layouts.meaning2D[i]!;
          const breatheEnv = smootherstep(103.3, 104.6, t) * (1 - uCloud);
          const bayIdx = f.cluster < 4 ? f.cluster : 4;
          const dtMean = t - 108.5;
          const dxCluster = (bayIdx % 2 === 0 ? 1 : -1) * Math.sin(dtMean * (0.95 + bayIdx * 0.12)) * 22.0 * breatheEnv;
          const dyCluster = (bayIdx === 0 || bayIdx === 1 || bayIdx === 3 ? 1 : -1) * Math.sin(dtMean * (1.20 + bayIdx * 0.14)) * 15.0 * breatheEnv;
          const mx = pM.x + dxCluster;
          const my = pM.y + dyCluster;

          const edgeSafeBow = smoothstep(260, 720, Math.min(pM.x, STAGE_W - pM.x));
          [x, y] = stepArc(x, y, mx, my, uMean, curve * 0.50 * edgeSafeBow);
          z = lerp(z, 0, uMean);
          s = lerp(s, pM.scale, uMean);
          const waveMean = 1 - 0.10 * breatheEnv * (0.5 - 0.5 * Math.cos(t * 3.0 - pM.x * 0.002));
          o = lerp(o, pM.opacity * waveMean, uMean);
          gray = lerp(gray, 0, uMean);
          zIdx = f.isMacroHub ? 65 : 22;
        }

        // 6) Morph -> `cloud3D` (`115.0..128.0s`): Y-Preserving 2-Shell Parallax Nebula (`0` Foreground Collisions!)
        const uOrb = smootherstep(128.0 + stagger * 0.75, 130.45 + stagger * 0.75, t);
        if (uCloud > 0 && uOrb < 1) {
          const c3 = layouts.cloud3D[i]!;
          const orbitAng = (t - 115.0) * 0.55;
          const rcx = c3.cx;
          const rcy = c3.cy + Math.sin(orbitAng + f.cluster * 1.1) * 3.5;
          const rcz = c3.cz + Math.cos(orbitAng * 0.8 + i * 0.3) * 8.0;
          const proj = project3D(rcx, rcy, rcz);
          const pFactor = clamp(Z_CAM / (Z_CAM - rcz), 0.82, 1.15);
          const cs3 = c3.scale * pFactor;
          const hhC = fastBoxH(i, cs3) * 0.5;
          const safeCy = softMin(softMax(proj.sy, 27 + hhC, 5), 405 - hhC, 5);

          const frontVis = smoothstep(-95, 35, rcz);
          const edgeFade = smoothstep(-120, 140, proj.sx) * smoothstep(-120, 140, STAGE_W - proj.sx);
          const co3 = lerp(0.14, 1.0, frontVis) * edgeFade;
          const cGray = lerp(175, 0, frontVis);

          const edgeSafeBow = smoothstep(260, 720, Math.min(x, STAGE_W - x));
          [x, y] = stepArc(x, y, proj.sx, safeCy, uCloud, curve * 0.32 * edgeSafeBow);
          z = lerp(z, rcz, uCloud);
          s = lerp(s, cs3, uCloud);
          o = lerp(o, co3, uCloud);
          gray = lerp(gray, cGray, uCloud);
          zIdx = Math.round(10 + frontVis * 65);
        }

        // 7) Morph -> `orbit2D` (`128.0..138.0s`, exact phase `0.0` at `t = 133.0s` + static C∞ sanctuary arch)
        const uSphere =
          smootherstep(138.0 + stagger * 0.55, 140.55 + stagger * 0.55, t) *
          (1 - smootherstep(147.30, 149.90, t));
        if (uOrb > 0) {
          const pO = layouts.orbit2D[i]!;
          let ox = pO.x;
          let oy = pO.y;
          const hhO = fastBoxH(i, pO.scale) * 0.5;
          if (i !== targetIndex && !resonantSet.has(i)) {
            const rawDt = t - 133.0;
            const effDt = softMin(softMax(rawDt, -3.2, 0.9), 4.2, 0.9) - softMin(softMax(0, -3.2, 0.9), 4.2, 0.9);
            const dTheta = effDt * (0.042 + f.level * 0.030);
            if (Math.abs(dTheta) > 1e-5) {
              const dx0 = pO.x - STAGE_W * 0.5;
              const dy0 = (pO.y - 216) * 14.0;
              const cD = Math.cos(dTheta);
              const sD = Math.sin(dTheta);
              ox = STAGE_W * 0.5 + (dx0 * cD - dy0 * sD);
              oy = softMin(softMax(216 + (dx0 * sD + dy0 * cD) / 14.0, 28 + hhO, 6), 404 - hhO, 6);
            }
          }

          const [arcOx, arcOy] = stepArc(x, y, ox, oy, uOrb, curve * 0.42);
          const archO = orbArchBow[i]!;
          x = arcOx;
          y =
            Math.abs(archO) > 0.05 && uOrb < 0.9999
              ? softMin(softMax(arcOy + archO * Math.sin(Math.PI * uOrb), 27 + hhO, 5), 405 - hhO, 5)
              : arcOy;
          z = lerp(z, 0, uOrb);
          s = lerp(s, pO.scale, uOrb);
          o = lerp(o, pO.opacity, uOrb);
          gray = lerp(gray, 0, uOrb);
          zIdx = Math.round(10 + f.level * 35);
        }

        // 8) Morph -> `sphere3D` (`138.0..150.0s`): 6-Latitude Co-Rotating Lattice + Static C∞ Sanctuary Arch (`0` Collisions, `0` Chatter!)
        if (uSphere > 0.0005) {
          const sp = layouts.sphere3D[i]!;
          const lon = sp.theta + sphereSpin; // Rigid uniform angular velocity (`0` overtaking!)
          const cosL = Math.cos(lon);
          const sinL = Math.sin(lon);
          const wz = sinL * 280;
          const proj = project3D(cosL * 2980, 0, wz);
          const sy = sp.ringY + 3.0 * Math.sin(lon * 2.0);
          const pScale = clamp(Z_CAM / (Z_CAM - wz), 0.85, 1.15);
          const ss3 = sp.scale * pScale;

          const frontVis = smoothstep(-0.10, 0.38, sinL);
          const limbFade = 1 - smoothstep(0.70, 0.96, Math.abs(cosL));
          const so3 = lerp(0.10, 1.0, frontVis) * limbFade;
          const sGray = lerp(185, 0, frontVis);

          const archS = t < 144.0 ? sphEnterArchBow[i]! : sphExitArchBow[i]!;
          const baseSy = lerp(y, sy, uSphere);
          const hhS = fastBoxH(i, Math.max(s, ss3)) * 0.5;
          x = lerp(x, proj.sx, uSphere);
          y =
            Math.abs(archS) > 0.05 && uSphere < 0.9999
              ? softMin(softMax(baseSy + archS * Math.sin(Math.PI * uSphere), 27 + hhS, 5), 405 - hhS, 5)
              : baseSy;
          z = lerp(z, wz, uSphere);
          s = lerp(s, ss3, uSphere);
          o = lerp(o, so3, uSphere);
          gray = lerp(gray, sGray, uSphere);
          zIdx = Math.round(10 + frontVis * 65);
        }

        // Act IV.1–2 (`150.0..164.0s`)
        const isTarget = i === targetIndex;
        const isResonant = resonantSet.has(i);
        if (focusDim > 0.001) {
          if (isTarget) {
            o = lerp(o, 0, span(t, 150.0, 150.55, easeInOutCubic));
          } else if (isResonant) {
            o = lerp(o, 1.0, focusDim);
            s = lerp(s, 1.02, focusDim);
            const hhRes = fastBoxH(i, s) * 0.5;
            y = softMin(softMax(y + Math.sin(t * 1.6 + i) * 5.0 * focusDim, 28 + hhRes, 5), 404 - hhRes, 5);
            gray = lerp(gray, 0, focusDim);
            zIdx = 88;
          } else {
            x -= (t - 150.0) * (11.5 + (i % 4) * 2.8) * focusDim;
            const hhBg = fastBoxH(i, s) * 0.5;
            y = softMin(softMax(y + Math.sin(t * 1.3 + i * 0.7) * 4.0 * focusDim, 28 + hhBg, 5), 404 - hhBg, 5);

            const rightMask =
              smoothstep(3940, 4220, x) *
              (1 - smoothstep(5520, 5800, x)) *
              smoothstep(50, 92, y) *
              (1 - smoothstep(320, 360, y));
            const leftPreMask =
              smoothstep(161.2, 162.4, t) *
              (1 - smoothstep(580, 780, x)) *
              smoothstep(118, 152, y) *
              (1 - smoothstep(254, 288, y));
            const clearMask = clamp(rightMask + leftPreMask, 0, 1);
            const targetBgOp = (0.18 + f.level * 0.06) * (1 - clearMask);
            o = lerp(o, targetBgOp, focusDim);
            gray = lerp(gray, 84, focusDim);
          }
        }

        // High-legibility `scanDim` ink ceiling (`rgb(52,52,52)` sentences, `rgb(16,16,16)` anchors)
        if (scanDim > 0.001) {
          const highlighted = activeScanNodes.has(i);
          if (highlighted) {
            zIdx = 85;
            gray = 0;
          } else if (f.type === 'img') {
            o *= lerp(1, 0.84, scanDim);
          } else {
            const targetGray = f.tier === 'anchor' ? 16 : 52;
            gray = lerp(gray, targetGray, scanDim);
          }
        }

        // Wide 520px C² offscreen boundary taper
        o *=
          smootherstep(-420, 100, x) *
          smootherstep(-420, 100, STAGE_W - x) *
          smootherstep(-85, 16, y) *
          smootherstep(-85, 16, STAGE_H - y);

        if (t >= 164.0) {
          const gOut = smootherstep(164.0, 164.88, t);
          x -= gOut * 340;
          o *= 1 - gOut;
        }

        screenPos[i]!.x = x;
        screenPos[i]!.y = y;
        screenPos[i]!.z = z;
        screenPos[i]!.s = s;
        screenPos[i]!.o = o;
        screenPos[i]!.gray = gray;
        screenPos[i]!.zIdx = zIdx;
      }

      for (let i = 0; i < fragments.length; i++) {
        const p = screenPos[i]!;
        const f = fragments[i]!;
        const el = fragEls[i]!;
        if (p.o <= 0.004 || p.x < -460 || p.x > STAGE_W + 460 || p.y < -100 || p.y > STAGE_H + 100) {
          if (!lastFragHidden[i]) {
            el.style.opacity = '0';
            el.style.transform = 'translate3d(-9999px, -9999px, 0)';
            lastFragHidden[i] = 1;
          }
        } else {
          lastFragHidden[i] = 0;
          el.style.opacity = p.o.toFixed(3);
          if (lastFragZIdx[i] !== p.zIdx) {
            el.style.zIndex = String(p.zIdx);
            lastFragZIdx[i] = p.zIdx;
          }
          el.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0) translate(-50%, -50%) scale(${p.s.toFixed(4)})`;
          if (f.type !== 'img') {
            const qGray = p.gray <= 2 ? 0 : Math.min(188, Math.round(p.gray / 4) * 4);
            const nextColor = qGray === 0 ? '#000000' : `rgb(${qGray}, ${qGray}, ${qGray})`;
            if (lastFragColor[i] !== nextColor) {
              el.style.color = nextColor;
              lastFragColor[i] = nextColor;
            }
          }
        }
      }

      // D. Act II.1 (`52.05 – 62.8s`) Guillotine Cuts
      if (t >= 52.05 && t < 62.85) {
        const cutFade = 1 - span(t, 61.8, 62.8, easeInOutCubic);
        ctx.save();
        ctx.strokeStyle = '#ff0000';
        for (const c of layouts.cuts) {
          if (t < c.strikeAt) continue;
          const u = clamp((t - c.strikeAt) / 0.14, 0, 1);
          const impactFlash = t < c.strikeAt + 0.16 ? 1 - (t - c.strikeAt) / 0.16 : 0;
          ctx.lineWidth = (c.orientation === 'v' ? 1.8 : 1.05) + impactFlash * 1.6;
          ctx.globalAlpha = cutFade * (c.orientation === 'v' ? 0.96 : 0.76);

          if (c.orientation === 'v') {
            let vx = c.x1;
            if (c.heroSlotIdx !== undefined) {
              const hb = heroLiveBounds[c.heroSlotIdx]!;
              vx = c.heroEdge === 'left' ? hb.left : hb.right;
            } else {
              let insideHero = false;
              for (const hb of heroLiveBounds) {
                if (vx >= hb.left - 3 && vx <= hb.right + 3) {
                  insideHero = true;
                  break;
                }
              }
              if (insideHero) continue;
            }
            ctx.beginPath();
            ctx.moveTo(vx, c.y1);
            ctx.lineTo(vx, lerp(c.y1, c.y2, u));
            ctx.stroke();
          } else {
            let segStart = c.x1;
            let segEnd = lerp(c.x1, c.x2, u);
            for (const hb of heroLiveBounds) {
              if (segStart < hb.right + 4 && segEnd > hb.left - 4) {
                if (segStart < hb.left - 4) {
                  segEnd = Math.min(segEnd, hb.left - 4);
                } else {
                  segStart = Math.max(segStart, hb.right + 4);
                }
              }
            }
            if (segEnd - segStart > 2) {
              ctx.beginPath();
              ctx.moveTo(segStart, c.y1);
              ctx.lineTo(segEnd, c.y2);
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      }

      // E. Act II.2 (`64.1 – 76.8s`): Variable-Width Barcodes
      const vecAlpha = span(t, 64.1, 64.7, easeInOutCubic) * (1 - span(t, 75.8, 76.8, easeInOutCubic));
      if (vecAlpha > 0.005) {
        ctx.save();
        for (let i = 0; i < fragments.length; i++) {
          const p = screenPos[i]!;
          if (p.o <= 0.08) continue;
          const f = fragments[i]!;
          const barcodeTop = p.y + fastBoxH(i, p.s) * 0.5 + 1.5;
          const isHighlighted = activeScanNodes.has(i);

          const tickCount =
            f.tier === 'anchor'
              ? 34 + (i % 7)
              : clamp(Math.round(f.content.length * 1.15), 14, 28);
          const tickStep = f.tier === 'anchor' ? 2.55 : 2.35;
          const halfSpan = (tickCount - 1) * tickStep * 0.5;

          const dimFactor =
            scanDim > 0.01
              ? isHighlighted
                ? 1.0
                : f.tier === 'anchor'
                  ? lerp(0.88, 0.68, scanDim)
                  : lerp(0.88, 0.42, scanDim)
              : 0.88;
          ctx.lineWidth = isHighlighted ? 1.35 : f.tier === 'anchor' ? 1.20 : 0.92;

          for (let k = 0; k < tickCount; k++) {
            const reveal = progress(t, 64.15 + hash(i * 7 + k) * 0.45, 64.55 + hash(i * 7 + k) * 0.45);
            if (reveal <= 0.01) continue;
            const baseH = (f.tier === 'anchor' ? 3.2 : 2.0) + hash(i * 101 + k * 13) * (f.tier === 'anchor' ? 8.5 : 7.2);
            const mod = 0.84 + 0.16 * Math.sin(t * 5.8 + k * 0.5 + i);
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

      // F. Act II.2 (`64.3 – 76.6s`): Overlapped 4-Wave Sanctuary-Locked Cosine Caliper Arcs (`0` `.frag` Overlap!)
      if (activeScanWaves.length > 0) {
        const bandHits = new Set<string>();
        ctx.save();

        for (const wv of activeScanWaves) {
          const uWave = progress(t, wv.t0, wv.t1);
          const waveIn = smoothstep(wv.t0, wv.t0 + 0.55, t);
          const waveOut = 1 - smoothstep(wv.t1 - 0.60, wv.t1, t);
          const waveEnv = waveIn * waveOut;
          if (waveEnv <= 0.01) continue;

          const arcDrawU = easeOutCubic(progress(t, wv.t0, wv.t0 + 0.52));
          const dimOp = smoothstep(wv.t0 + 0.14, wv.t0 + 0.50, t) * waveOut;
          const cursorX = lerp(wv.scanX0, wv.scanX1, easeInOutCubic(uWave));

          ctx.globalAlpha = 0.58 * waveEnv;
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(cursorX, 30);
          ctx.lineTo(cursorX, 402);
          ctx.moveTo(cursorX - 6, 30);
          ctx.lineTo(cursorX + 6, 30);
          ctx.moveTo(cursorX - 6, 402);
          ctx.lineTo(cursorX + 6, 402);
          ctx.stroke();

          for (const cal of wv.calipers) {
            const sanct = COSINE_LABEL_SANCTUARIES[cal.sanctuaryIdx]!;
            const labelX = sanct.cx;
            const labelY = sanct.cy;

            const [ia, ib] = cal.pair;
            const pa = screenPos[ia]!;
            const pb = screenPos[ib]!;
            const hhA = fastBoxH(ia, pa.s) * 0.5;
            const hhB = fastBoxH(ib, pb.s) * 0.5;

            const ay = pa.y < labelY ? pa.y + hhA + 4 : pa.y - hhA - 4;
            const by = pb.y < labelY ? pb.y + hhB + 4 : pb.y - hhB - 4;

            ctx.globalAlpha = 0.90 * waveEnv;
            ctx.strokeStyle = '#e60000';
            ctx.lineWidth = 2.0;

            if (cal.band === 'diag') {
              // Exact cubic S-bezier passing strictly through `(labelX, labelY)` at `u = 0.5`!
              const endX = lerp(pa.x, pb.x, arcDrawU);
              const endY = lerp(ay, by, arcDrawU);
              const targetLx = lerp(pa.x, labelX, arcDrawU);
              const targetLy = lerp(ay, labelY, arcDrawU);
              const sumCx = (8 * targetLx - pa.x - endX) / 3;
              const sumCy = (8 * targetLy - ay - endY) / 3;
              const dxSpan = (endX - pa.x) * 0.16;
              const c1x = sumCx * 0.5 - dxSpan;
              const c2x = sumCx * 0.5 + dxSpan;
              const c1y = clamp(sumCy * 0.5 - (endY - ay) * 0.24, 34, 398);
              const c2y = clamp(sumCy - c1y, 34, 398);
              ctx.beginPath();
              ctx.moveTo(pa.x, ay);
              ctx.bezierCurveTo(c1x, c1y, c2x, c2y, endX, endY);
              ctx.stroke();
              bandHits.add('upper');
              bandHits.add('mid');
              bandHits.add('lower');
            } else {
              // Exact quadratic Bezier control point inversion so `B(0.5) === (labelX, labelY)`!
              const ctrlX = 2 * labelX - 0.5 * (pa.x + pb.x);
              const ctrlY = clamp(2 * labelY - 0.5 * (ay + by), 32, 400);
              ctx.beginPath();
              ctx.moveTo(pa.x, ay);
              ctx.quadraticCurveTo(
                lerp(pa.x, ctrlX, arcDrawU),
                lerp(ay, ctrlY, arcDrawU),
                lerp(pa.x, pb.x, arcDrawU),
                lerp(ay, by, arcDrawU),
              );
              ctx.stroke();
              bandHits.add(cal.band);
            }

            ctx.beginPath();
            ctx.arc(pa.x, ay, 3.5, 0, Math.PI * 2);
            ctx.arc(lerp(pa.x, pb.x, arcDrawU), lerp(ay, by, arcDrawU), 3.5, 0, Math.PI * 2);
            ctx.stroke();

            if (dimOp > 0.05) {
              ctx.save();
              ctx.globalAlpha = dimOp;
              ctx.font = '700 14.5px "JetBrains Mono", monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const textW = ctx.measureText(cal.dimText).width;
              const wingW = 24;
              const textHalf = textW * 0.5 + 6;
              const totalHalfW = textHalf + wingW;

              if (dimOp >= 0.25) {
                activeCosineBoxes.push(
                  `${(labelX - totalHalfW).toFixed(1)},${(labelY - 10).toFixed(1)},${(labelX + totalHalfW).toFixed(1)},${(labelY + 10).toFixed(1)}`,
                );
              }

              ctx.lineJoin = 'round';
              ctx.lineCap = 'round';
              ctx.lineWidth = 4.6;
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.96)';
              ctx.strokeText(cal.dimText, labelX, labelY);

              ctx.strokeStyle = '#e60000';
              ctx.lineWidth = 1.25;
              ctx.beginPath();
              ctx.moveTo(labelX - totalHalfW, labelY - 4.5);
              ctx.lineTo(labelX - totalHalfW, labelY + 4.5);
              ctx.moveTo(labelX - totalHalfW, labelY);
              ctx.lineTo(labelX - textHalf, labelY);
              ctx.moveTo(labelX + textHalf, labelY);
              ctx.lineTo(labelX + totalHalfW, labelY);
              ctx.moveTo(labelX + totalHalfW, labelY - 4.5);
              ctx.lineTo(labelX + totalHalfW, labelY + 4.5);
              ctx.stroke();

              ctx.fillStyle = '#e60000';
              ctx.fillText(cal.dimText, labelX, labelY);
              ctx.restore();
            }
          }
        }
        ctx.restore();
        activeCosineBands = Array.from(bandHits).sort().join(',');
      }

      // 56-Strand Polyphonic Catenary Crescendo (`73.8 → 81.6s`) bridging `spectrum2D → reading2D` seamlessly!
      if (t >= 73.8 && t < 81.65) {
        const tailFade = 1 - smootherstep(79.6, 81.6, t);
        ctx.save();
        ctx.lineCap = 'round';
        for (let k = 0; k < polyResonanceStrings.length; k++) {
          const ps = polyResonanceStrings[k]!;
          const bloom = smootherstep(73.8 + ps.stagger * 2.2, 75.2 + ps.stagger * 1.4, t);
          const op = bloom * tailFade;
          if (op <= 0.01) continue;
          const pa = screenPos[ps.a]!;
          const pb = screenPos[ps.b]!;
          if (pa.o <= 0.06 || pb.o <= 0.06) continue;

          const sag = ps.sag * (1 - 0.35 * smootherstep(78.0, 80.5, t));
          const midX = (pa.x + pb.x) * 0.5;
          const midY = clamp((pa.y + pb.y) * 0.5 + sag, 34, STAGE_H - 34);
          const shimmer = 0.82 + 0.18 * Math.sin(t * 4.2 + k * 0.7);

          ctx.strokeStyle = `rgba(226, 0, 0, ${(0.36 * op * shimmer).toFixed(3)})`;
          ctx.lineWidth = k % 4 === 0 ? 1.55 : 1.05;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.quadraticCurveTo(midX, midY, pb.x, pb.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Triple Left/Center/Right Reading Scan Cursors (`79.2 – 86.6s`) so every 1:1 crop sees active editorial scanning!
      const readScanOp = win(t, 79.2, 86.6, 0.65);
      if (readScanOp > 0.01) {
        const uScan = smootherstep(79.2, 86.6, t);
        const cursors = [
          lerp(180, 2240, uScan),
          lerp(2240, 4300, uScan),
          lerp(4300, 6300, uScan),
        ];
        ctx.save();
        ctx.strokeStyle = `rgba(230, 0, 0, ${(0.58 * readScanOp).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        for (const rxScan of cursors) {
          ctx.beginPath();
          ctx.moveTo(rxScan, 32);
          ctx.lineTo(rxScan, 400);
          ctx.moveTo(rxScan - 5, 32);
          ctx.lineTo(rxScan + 5, 32);
          ctx.moveTo(rxScan - 5, 400);
          ctx.lineTo(rxScan + 5, 400);
          ctx.stroke();
        }
        ctx.restore();
      }

      // G. Act III.2 (`87.6 – 101.8s`): Continuous Analytic Sinusoidal Double-Helix Ribbon Spine (`24px` sampling!)
      const helixSpineA = win(t, 87.6, 101.8, 0.85);
      if (helixSpineA > 0.005) {
        ctx.save();
        ctx.lineCap = 'round';
        for (const strand of [0, 1] as const) {
          let prevSx = 0;
          let prevSy = 0;
          let prevCos = 0;
          let hasPrev = false;

          for (let xSample = 200; xSample <= 6280; xSample += 24) {
            const ang = ((xSample - 200) / 6080) * 3.2 * Math.PI * 2 + strand * Math.PI + helixSpin;
            const cosA = Math.cos(ang);
            const sinA = Math.sin(ang);
            const rY = strand === 0 ? 142 : 98;
            const wz = cosA * 255;
            const proj = project3D(xSample - STAGE_W * 0.5, 0, wz);
            const sy = 216 - sinA * rY * (1 + wz * 0.00042);

            if (hasPrev) {
              const frontW = smoothstep(-0.25, 0.35, (prevCos + cosA) * 0.5);
              if (strand === 0) {
                ctx.lineWidth = lerp(0.85, 2.1, frontW);
                ctx.strokeStyle = `rgba(230, 0, 0, ${(lerp(0.14, 0.58, frontW) * helixSpineA).toFixed(3)})`;
              } else {
                ctx.lineWidth = lerp(0.65, 1.5, frontW);
                ctx.strokeStyle = `rgba(0, 0, 255, ${(lerp(0.10, 0.36, frontW) * helixSpineA).toFixed(3)})`;
              }
              ctx.beginPath();
              ctx.moveTo(prevSx, prevSy);
              ctx.lineTo(proj.sx, sy);
              ctx.stroke();
            }
            prevSx = proj.sx;
            prevSy = sy;
            prevCos = cosA;
            hasPrev = true;
          }
        }
        ctx.restore();
      }

      // H. Act III.3–4 (`103.2 – 128.2s`): Force-Bundled Catenary Arteries + Flowing Synaptic Light Pulses
      const arteryGrow = span(t, 103.2, 107.6, easeInOutCubic);
      const arteryFade = 1 - span(t, 126.6, 128.4, easeInOutCubic);
      const arteryMaster = arteryGrow * arteryFade;
      if (arteryMaster > 0.005) {
        ctx.save();
        ctx.lineCap = 'round';
        const visibleCount = Math.floor(topEdges.length * arteryGrow);
        for (let eIdx = 0; eIdx < visibleCount; eIdx++) {
          const edge = topEdges[eIdx]!;
          const pa = screenPos[edge.a]!;
          const pb = screenPos[edge.b]!;
          if (pa.o <= 0.12 || pb.o <= 0.12) continue;

          const ca = fragments[edge.a]!.cluster;
          const cb = fragments[edge.b]!.cluster;
          const isPrimary = eIdx < 64 || ca !== cb;

          const wavePulse = 0.86 + 0.14 * Math.sin(t * 3.8 - pa.x * 0.0018);
          const strokeW = isPrimary ? 1.55 + edge.strength * 0.50 : 0.75;
          const alpha = (isPrimary ? 0.34 + 0.18 * edge.strength : 0.14 + 0.10 * edge.strength) * arteryMaster * wavePulse;

          let c1x: number;
          let c1y: number;
          let c2x: number;
          let c2y: number;

          if (ca === cb) {
            const hubIdx = layouts.clusterHubIndex[ca]!;
            const hubP = hubIdx >= 0 ? screenPos[hubIdx]! : { x: (pa.x + pb.x) * 0.5, y: (pa.y + pb.y) * 0.5 };
            const bundlePull = 0.46;
            const sway = (hash(eIdx * 31 + 7) - 0.5) * 34 + pulse * 3.5;
            c1x = lerp(pa.x, hubP.x, bundlePull);
            c1y = clamp(lerp(pa.y, hubP.y, bundlePull) + sway, 32, STAGE_H - 32);
            c2x = lerp(pb.x, hubP.x, bundlePull);
            c2y = clamp(lerp(pb.y, hubP.y, bundlePull) - sway * 0.6, 32, STAGE_H - 32);
          } else {
            const upperSpan = eIdx % 2 === 0;
            const spanSagY = upperSpan
              ? 48 + (eIdx % 5) * 10
              : STAGE_H - 48 - (eIdx % 5) * 10;
            c1x = lerp(pa.x, pb.x, 0.32);
            c1y = spanSagY;
            c2x = lerp(pa.x, pb.x, 0.68);
            c2y = spanSagY;
          }

          ctx.strokeStyle = `rgba(226, 0, 0, ${alpha.toFixed(3)})`;
          ctx.lineWidth = strokeW;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.bezierCurveTo(c1x, c1y, c2x, c2y, pb.x, pb.y);
          ctx.stroke();

          // Synaptic light pulse gliding smoothly along primary arterial veins (`sin(πu)` zero-pop envelope!)
          if (isPrimary && eIdx < 54 && arteryGrow > 0.6) {
            const uSyn = ((t * (0.38 + (eIdx % 5) * 0.06) + hash(eIdx * 19)) % 1.0 + 1.0) % 1.0;
            const synEnv = Math.sin(Math.PI * uSyn);
            if (synEnv > 0.08) {
              const om = 1 - uSyn;
              const sx =
                om * om * om * pa.x +
                3 * om * om * uSyn * c1x +
                3 * om * uSyn * uSyn * c2x +
                uSyn * uSyn * uSyn * pb.x;
              const sy =
                om * om * om * pa.y +
                3 * om * om * uSyn * c1y +
                3 * om * uSyn * uSyn * c2y +
                uSyn * uSyn * uSyn * pb.y;
              ctx.fillStyle = `rgba(255, 0, 0, ${(0.82 * arteryMaster * synEnv).toFixed(3)})`;
              ctx.beginPath();
              ctx.arc(sx, sy, 2.3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        ctx.restore();
      }

      // I. Act III.5–6 (`128.0 – 150.0s`): Central `#E60000` Query Nucleus & Tapered Orbit/Dome Meridians
      orbitSanctuaryEl.style.opacity = orbitMarkOp.toFixed(3);

      const ringOp = win(t, 128.8, 138.8, 0.75);
      if (ringOp > 0.005) {
        ctx.save();
        ctx.strokeStyle = `rgba(0, 0, 0, ${(0.18 * ringOp).toFixed(3)})`;
        ctx.lineWidth = 0.7;
        ctx.setLineDash([4, 7]);
        ctx.lineDashOffset = -t * 16;
        for (const frac of [0.26, 0.58, 0.92]) {
          ctx.beginPath();
          ctx.ellipse(STAGE_W * 0.5, 216, 460 + frac * 2550, 74 + frac * 94, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      const domeArcOp = win(t, 138.2, 149.8, 0.85);
      if (domeArcOp > 0.005) {
        ctx.save();
        ctx.lineWidth = 0.75;
        // 6 rotating meridians + subtle 6-latitude parallel hairlines
        for (let m = 0; m < 6; m++) {
          const mLon = (m * Math.PI) / 6 + sphereSpin;
          ctx.strokeStyle =
            m === 0
              ? `rgba(230, 0, 0, ${(0.28 * domeArcOp).toFixed(3)})`
              : `rgba(0, 0, 0, ${(0.12 * domeArcOp).toFixed(3)})`;
          ctx.beginPath();
          for (let sStep = 0; sStep <= 48; sStep++) {
            const pAng = (sStep / 48) * Math.PI * 2;
            const ux = Math.sin(pAng) * Math.cos(mLon);
            const uy = Math.cos(pAng);
            const uz = Math.sin(pAng) * Math.sin(mLon);
            const proj = project3D(ux * 2980, uy * 166, uz * 280);
            if (sStep === 0) ctx.moveTo(proj.sx, clamp(proj.sy, 28, 404));
            else ctx.lineTo(proj.sx, clamp(proj.sy, 28, 404));
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      if (orbitMarkOp > 0.02 && (ringOp > 0.005 || domeArcOp > 0.005)) {
        taperCanvasEllipse(ctx, 3240, 216, 335, 76, orbitMarkOp);
      }

      // J. Act IV.1 (`150.0 – 157.45s`): Exterior-Bracket Catenaries (`0px` Hero Sentence Line Intrusion!)
      const numTagOp = Math.max(win(t, 131.5, 137.2, 0.55), win(t, 150.05, 163.85, 0.45));
      if (numTagOp > 0.005) {
        const numY =
          202 -
          62 * easeInOutCubic(progress(t, 148.5, 150.5)) -
          44 * easeInOutCubic(progress(t, 157.2, 158.1));
        peripheryNumEl.style.opacity = numTagOp.toFixed(3);
        peripheryNumEl.style.transform = `translate3d(4880px, ${numY.toFixed(2)}px, 0) translateX(-50%)`;
      } else {
        peripheryNumEl.style.opacity = '0';
      }

      // Single-point crisp handoff at `t = 157.45s` (`awakenedSentenceEl` `< 157.45s`, `shardEls` `>= 157.45s` -> zero double overlap!)
      const vfU = easeOutCubic(progress(t, 150.0, 156.8));
      const vfw = lerp(540, 488, vfU);
      const vfh = lerp(94, 62, vfU);

      if (t >= 150.0 && t < 157.45) {
        const awakeIn = span(t, 150.0, 150.75, easeOutCubic);
        const colorMix = smoothstep(151.2, 156.8, t);
        const rVal = Math.round(lerp(217, 0, colorMix));
        const breathe = 1.0 + 0.018 * Math.sin((t - 150.0) * 2.6) * (1 - smoothstep(156.6, 157.42, t));
        awakenedSentenceEl.style.opacity = awakeIn.toFixed(3);
        awakenedSentenceEl.style.color = `rgb(${rVal}, 0, 0)`;
        awakenedSentenceEl.style.transform = `translate(-50%, -50%) scale(${breathe.toFixed(4)})`;

        ctx.save();
        ctx.strokeStyle = `rgba(230, 0, 0, ${(0.90 * awakeIn).toFixed(3)})`;
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
      } else {
        awakenedSentenceEl.style.opacity = '0';
      }

      // 5 Long-Range Catenary Arcs routed STRICTLY OUTSIDE Viewfinder Brackets (`Y <= 142` or `Y >= 290`, `ox <= 4312`)!
      const catenaryFade = span(t, 150.25, 150.9, easeOutCubic) * (1 - span(t, 163.3, 163.95, easeInOutCubic));
      if (catenaryFade > 0.01) {
        ctx.save();
        ctx.lineCap = 'round';
        const anchorOffsetsX = [-260, -130, 0, 130, 260];
        for (let k = 0; k < neighborIndices.length; k++) {
          const nbIdx = neighborIndices[k]!;
          const nbPos = screenPos[nbIdx]!;
          const drawU = easeOutCubic(progress(t, 150.35 + k * 0.24, 151.65 + k * 0.24));
          if (drawU <= 0.01) continue;

          const isUpperTarget = nbPos.y < 216;
          const srcX = 4880 + (anchorOffsetsX[k] ?? 0);
          // Depart strictly OUTSIDE `[146, 286]` sanctuary!
          const srcY = isUpperTarget
            ? Math.min(140, 216 - vfh - 10)
            : Math.max(292, 216 + vfh + 10);

          ctx.strokeStyle = `rgba(217, 0, 0, ${(0.88 * catenaryFade).toFixed(3)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(srcX - 4, srcY);
          ctx.lineTo(srcX + 4, srcY);
          ctx.stroke();

          const ctrlX = lerp(srcX, nbPos.x, 0.5);
          const ctrlY = isUpperTarget
            ? clamp(Math.min(srcY, nbPos.y) - (32 + k * 8), 36, 134)
            : clamp(Math.max(srcY, nbPos.y) + (32 + k * 8), 298, 394);

          const curEndX = lerp(srcX, nbPos.x, drawU);
          const curEndY = lerp(srcY, nbPos.y, drawU);
          const curCtrlX = lerp(srcX, ctrlX, drawU);
          const curCtrlY = lerp(srcY, ctrlY, drawU);

          const pulseGlow = 0.78 + 0.22 * Math.sin(t * 4.4 - k * 1.1);
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

        // Paleo-Wind Oscillogram stops strictly at `ox <= 4312` (`< 4880 - vfw - 48`)!
        ctx.strokeStyle = `rgba(0, 0, 0, ${(0.22 * catenaryFade).toFixed(3)})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        for (let ox = 720; ox <= 4308; ox += 12) {
          const env = Math.sin(((ox - 720) / 3588) * Math.PI);
          const osc =
            Math.sin(ox * 0.045 - t * 8.2) * 14 * env +
            Math.sin(ox * 0.11 + t * 12.0) * 6 * env;
          const oy = 216 + osc;
          if (ox === 720) ctx.moveTo(ox, oy);
          else ctx.lineTo(ox, oy);
        }
        ctx.stroke();
        ctx.restore();
      }

      // K. Act IV.2 (`157.45 – 164.00s`): Single-Point In-Place Split (`awakenedSentenceEl` -> `shardEls` -> `galeBannerEl`)
      if (t >= 157.45 && t < 164.00) {
        const uSnap = smootherstep(157.45, 158.65, t);
        const uDrift = progress(t, 157.45, 163.95);
        const sideFade = 1 - smootherstep(163.45, 163.98, t);
        const centerExit = 1 - smootherstep(163.88, 164.00, t);

        ctx.save();
        ctx.strokeStyle = `rgba(225, 0, 0, ${(0.85 * sideFade * uSnap).toFixed(3)})`;
        ctx.lineWidth = 1.45;
        for (const fx of [4440, 5320]) {
          const shearTilt = 26 * uSnap + 22 * uDrift;
          ctx.beginPath();
          ctx.moveTo(fx + shearTilt, 34);
          ctx.lineTo(fx - shearTilt, 398);
          ctx.stroke();
        }
        ctx.restore();

        const leftX = lerp(4550, 4240, 0.55 * uSnap + 0.45 * uDrift);
        const leftY = lerp(216, 98, clamp(0.86 * uSnap + 0.14 * uDrift, 0, 1));
        const leftRotY = 20 * uSnap + 12 * uDrift;
        const leftScale = lerp(1.0, 0.78, 0.55 * uSnap + 0.45 * uDrift);
        const sideGray = Math.round(lerp(24, 92, uDrift));
        shardEls[0]!.style.opacity = sideFade.toFixed(3);
        shardEls[0]!.style.color = `rgb(${sideGray}, ${sideGray}, ${sideGray})`;
        shardEls[0]!.style.transform = `translate3d(${leftX.toFixed(2)}px, ${leftY.toFixed(2)}px, 0) translate(-50%, -50%) perspective(460px) rotateY(${leftRotY.toFixed(2)}deg) rotateZ(${(-3.0 * uSnap - uDrift * 2.5).toFixed(2)}deg) scale(${leftScale.toFixed(4)})`;

        const centerX = 4880 - uDrift * 14;
        const centerScale = lerp(0.56, 1.0, smootherstep(157.45, 158.35, t)) * lerp(1.0, 1.04, uDrift);
        shardEls[1]!.style.opacity = Math.max(centerExit, t < 163.98 ? 1 : 0).toFixed(3);
        shardEls[1]!.style.transform = `translate3d(${centerX.toFixed(2)}px, 216px, 0) translate(-50%, -50%) scale(${centerScale.toFixed(4)})`;

        const rightX = lerp(5220, 5540, 0.55 * uSnap + 0.45 * uDrift);
        const rightY = lerp(216, 332, clamp(0.84 * uSnap + 0.16 * uDrift, 0, 1));
        const rightRotY = -20 * uSnap - 12 * uDrift;
        const rightScale = lerp(1.0, 0.78, 0.55 * uSnap + 0.45 * uDrift);
        shardEls[2]!.style.opacity = sideFade.toFixed(3);
        shardEls[2]!.style.color = `rgb(${sideGray}, ${sideGray}, ${sideGray})`;
        shardEls[2]!.style.transform = `translate3d(${rightX.toFixed(2)}px, ${rightY.toFixed(2)}px, 0) translate(-50%, -50%) perspective(460px) rotateY(${rightRotY.toFixed(2)}deg) rotateZ(${(3.0 * uSnap + uDrift * 2.5).toFixed(2)}deg) scale(${rightScale.toFixed(4)})`;

        taperCanvasEllipse(ctx, leftX, leftY, 175 * leftScale, 36 * leftScale, sideFade);
        taperCanvasEllipse(ctx, centerX, 216, 365 * centerScale, 66 * centerScale, 1.0);
        taperCanvasEllipse(ctx, rightX, rightY, 105 * rightScale, 34 * rightScale, sideFade);

        const cw = 378 * centerScale;
        const ch = 70 * centerScale;
        ctx.save();
        ctx.strokeStyle = `rgba(230, 0, 0, ${(0.95 * sideFade).toFixed(3)})`;
        ctx.lineWidth = 1.65;
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as const) {
          const cx = centerX + sx * cw;
          const cy = 216 + sy * ch;
          ctx.beginPath();
          ctx.moveTo(cx - sx * 14, cy);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx, cy - sy * 14);
          ctx.stroke();
        }
        ctx.restore();
      } else {
        for (const sEl of shardEls) {
          sEl.style.opacity = '0';
          sEl.style.transform = 'translate3d(-9999px, -9999px, 0)';
        }
      }
    }

    // -----------------------------------------------------------------------
    // 6. ACT IV.3a (`164.0 – 171.45s`): PALEO-WIND GALE (`0.0px` SEAMLESS DOCKING AT `171.45s`!)
    // -----------------------------------------------------------------------
    if (t < 164.0 || t >= 171.45) {
      galeBannerEl.style.opacity = '0';
      galeBannerEl.style.transform = 'translate3d(-9999px, -9999px, 0)';
    } else {
      galeBannerEl.style.opacity = '1';
      galeBannerEl.style.transform = `translate3d(${galeAnchorX.toFixed(2)}px, ${galeAnchorY.toFixed(2)}px, 0) scale(${galeScale.toFixed(4)}) translate(${galeAlignPct.toFixed(3)}%, -50%)`;

      const streamEnv = 1 - smootherstep(170.85, 171.45, t);
      ctx.save();
      if (t >= 165.20 && t <= 170.60) {
        const gPlateWindow = span(t, 165.20, 165.70, easeInOutCubic) * (1 - span(t, 170.00, 170.60, easeInOutCubic));
        const loessPlate = getDecodedPlate('plate-35');
        const ringPlate = getDecodedPlate('plate-37');
        if (loessPlate && gPlateWindow * 0.19 >= 0.01 && galeVisualCenterX + 640 < STAGE_W) {
          activeCanvasPlates.push('plate-35');
          ctx.globalCompositeOperation = 'multiply';
          ctx.globalAlpha = 0.19 * gPlateWindow;
          ctx.drawImage(loessPlate, galeVisualCenterX + 640, 40, 960, 152);
        }
        if (ringPlate && gPlateWindow * 0.17 >= 0.01 && galeVisualCenterX + 1140 < STAGE_W) {
          activeCanvasPlates.push('plate-37');
          ctx.globalCompositeOperation = 'multiply';
          ctx.globalAlpha = 0.17 * gPlateWindow;
          ctx.drawImage(ringPlate, galeVisualCenterX + 1140, 238, 760, 152);
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      for (let wIdx = 0; wIdx < 190; wIdx++) {
        const h1 = hash(wIdx * 19 + 3);
        const h2 = hash(wIdx * 37 + 11);
        const wy = 32 + h1 * 368;
        const speedLag = h2 * 0.48;
        const uLine = clamp((uGale * 1.18 - speedLag) / (1 - speedLag), 0, 1);
        if (uLine <= 0.005 || uLine >= 0.995) continue;

        const headX = lerp(6460, -240, uLine);
        const segLen = 320 + hash(wIdx * 7) * 820;
        const tailX = headX + segLen;
        const waveAmp = (hash(wIdx * 43) - 0.5) * 32;

        const isCrimson = wIdx % 5 === 0;
        ctx.strokeStyle = isCrimson ? '#e60000' : '#000000';
        ctx.globalAlpha = (isCrimson ? 0.52 : 0.18 + h1 * 0.22) * streamEnv * Math.sin(uLine * Math.PI);
        ctx.lineWidth = isCrimson ? 1.55 : 0.55 + (wIdx % 3) * 0.35;
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

      for (let gIdx = 0; gIdx < 360; gIdx++) {
        const hg1 = hash(gIdx * 23 + 5);
        const hg2 = hash(gIdx * 59 + 17);
        const lag = hg2 * 0.48;
        const uGrain = clamp((uGale * 1.20 - lag) / (1 - lag), 0, 1);
        if (uGrain <= 0.01 || uGrain >= 0.99) continue;
        const px = lerp(6480, -100, uGrain);
        const py = clamp(32 + hg1 * 368 + Math.sin(uGrain * 10 + gIdx) * 12, 28, 404);
        if (Math.abs(px - galeVisualCenterX) < galeVisualWidth * 0.5 + 36 && Math.abs(py - galeAnchorY) < 72 * galeScale) {
          continue;
        }
        ctx.fillStyle = gIdx % 7 === 0 ? '#e60000' : '#000000';
        ctx.globalAlpha = (0.28 + hg1 * 0.42) * streamEnv * Math.sin(uGrain * Math.PI);
        const r = 0.75 + (gIdx % 3) * 0.55;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      taperCanvasEllipse(ctx, galeVisualCenterX, galeAnchorY, galeVisualWidth * 0.5 + 76, 76 * galeScale, streamEnv);
    }

    // -----------------------------------------------------------------------
    // 7. ACT IV.4 (`193.0 – 199.45s`): ZERO-WARP ENVELOPE SASTRUGI BLIZZARD
    // -----------------------------------------------------------------------
    if (t >= 193.0 && t < 199.45) {
      ctx.save();
      const gradLeft = blizzardFrontX - 720;
      const gradRight = blizzardFrontX + 460;
      const veilGrad = ctx.createLinearGradient(gradLeft, 0, gradRight, 0);
      veilGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      veilGrad.addColorStop(0.52, 'rgba(255, 255, 255, 0.86)');
      veilGrad.addColorStop(1, 'rgba(255, 255, 255, 1)');
      ctx.fillStyle = veilGrad;
      ctx.fillRect(Math.max(0, gradLeft), 0, STAGE_W - Math.max(0, gradLeft), STAGE_H);

      const stormEnv = span(t, 193.0, 193.60, easeOutCubic) * (1 - span(t, 198.90, 199.43, easeInOut));
      if (stormEnv > 0.005) {
        ctx.lineCap = 'round';
        for (let s = 0; s < 230; s++) {
          const hs1 = hash(s * 31 + 9);
          const hs2 = hash(s * 47 + 13);
          const hs3 = hash(s * 71 + 23);
          const uPhase = (((t - 193.0) * (0.42 + hs3 * 0.45) + hs1) % 1.0 + 1.0) % 1.0;
          const phaseEnv = Math.sin(Math.PI * uPhase);
          if (phaseEnv <= 0.01) continue;

          const wx = blizzardFrontX + (hs2 - 0.34) * 2800 - uPhase * 560;
          const len = 110 + hs3 * 360;
          if (wx + len < 0 || wx > STAGE_W) continue;

          const baseY = 30 + hs1 * 372;
          const cuspH = (hs2 - 0.5) * 26;
          const isAccent = s % 9 === 0;
          const distFade = 1 - clamp(Math.abs(wx - blizzardFrontX) / 1750, 0, 1) * 0.62;

          ctx.strokeStyle = isAccent ? '#d90000' : '#000000';
          ctx.globalAlpha = (isAccent ? 0.54 : 0.26 + hs1 * 0.38) * stormEnv * distFade * phaseEnv;
          ctx.lineWidth = isAccent ? 1.35 : 0.60 + (s % 3) * 0.42;

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

        for (let p = 0; p < 480; p++) {
          const hp1 = hash(p * 29 + 7);
          const hp2 = hash(p * 61 + 19);
          const uPhase = (((t - 193.0) * (0.52 + hp1 * 0.55) + hp2) % 1.0 + 1.0) % 1.0;
          const phaseEnv = Math.sin(Math.PI * uPhase);
          if (phaseEnv <= 0.01) continue;

          const px = blizzardFrontX + (hp2 - 0.38) * 2600 - uPhase * 920;
          if (px < 0 || px > STAGE_W) continue;
          const py = clamp(28 + hp1 * 376 + Math.sin(px * 0.015 + p) * 9, 28, 404);
          const r = 0.65 + (p % 3) * 0.50;
          ctx.fillStyle = p % 11 === 0 ? '#d90000' : '#000000';
          ctx.globalAlpha = (0.26 + hp2 * 0.44) * stormEnv * phaseEnv;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // 8. TAUT `0.70s` (`199.45s..200.00s` + `0.00s..0.15s`) 100.00% PURE #FFFFFF LOOP
    // -----------------------------------------------------------------------
    const washEnd = t >= 199.45 ? 1.0 : span(t, 199.00, 199.45, easeInOut);
    const washStart = t <= 0.15 ? 1.0 : 1 - span(t, 0.15, 0.28, easeOutCubic);
    const washAlpha = Math.max(washEnd, washStart);
    fadeWash.style.opacity = washAlpha.toFixed(4);

    if (washAlpha >= 0.999) {
      root.dataset.activeCanvasPlates = '';
      root.dataset.activeCosineBands = '';
      root.dataset.activeCosineBoxes = '';
    } else {
      root.dataset.activeCanvasPlates = activeCanvasPlates.join(',');
      root.dataset.activeCosineBands = activeCosineBands;
      root.dataset.activeCosineBoxes = activeCosineBoxes.join(';');
    }
  }

  renderAt(0);

  return {
    root,
    renderAt,
    getFocusX,
    setRedGain,
    getRedGain: () => currentRedGain,
    dispose() {
      for (const ro of historyObservers) ro.disconnect();
      filterSvg.remove();
      root.remove();
    },
  };
}
