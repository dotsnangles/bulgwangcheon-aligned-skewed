/**
 * Museum-Grade Zero-UI 6480 × 432 (15:1) Deterministic Four-Act Moving-Image Engine (`src/engine/stage.ts`)
 *
 * Strictly adheres to:
 *   - 100% Pure `renderAt(t)` determinism (`0 LSB` difference under arbitrary timestamp jumps)
 *   - Zero App UI Chrome (`0` buttons, `0` inputs, `0` browser nav glyphs, `0` popup panels, `0` tutorial formulas)
 *   - Silkscreen overprint materiality (`mix-blend-mode: multiply` across `#0000FF`, `#FF9E4D..#FFD09A`, `#FF0000`, and 16 lithographs)
 *   - Catmull-Rom camera rig + Three.js 3D perspective + optical Focal-Plane DOF (`blur()` + contrast attenuation)
 *   - 120 BPM percussive hard cuts contrasted against weightless slow drifts & vast pure-white negative space (`>= 85%`)
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
  TARGET_PHRASE_PIECES,
  type CardSpec,
  type SkewedStationSpec,
} from '../data/corpus.ts';
import { DURATION, STAGE_H, STAGE_W } from '../data/timeline.ts';
import { getDecodedPlate, getDecodedStride, getPlateById } from '../illustrations.ts';
import { computePanoramicLayouts } from '../layouts/deconstruct-layout.ts';
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
  evalCameraRig,
  hardCutFlash,
  hash,
  lerp,
  ORANGE,
  progress,
  span,
  stepArc,
  win,
  type CameraKeyframe,
} from '../math.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
let stageFilterSeq = 0;

interface PlacedMonolith {
  readonly spec: CardSpec;
  readonly el: HTMLElement;
  readonly shadow: SVGPolygonElement;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
  readonly h: number;
  readonly at: number;
  readonly gen: 1 | 2;
  readonly stationIdx?: number;
}

interface FloorTrajectory {
  readonly gen: 1 | 2;
  readonly curve: SVGPathElement;
  readonly head: SVGPathElement;
  readonly at: number;
  readonly dur: number;
}

interface AxisStationNode {
  readonly gen: 1 | 2;
  readonly spec: SkewedStationSpec;
  readonly stationEl: HTMLElement;
  readonly dotEl: HTMLElement;
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

/** Deterministic Catmull-Rom 2D/3D viewport camera score across 120.0s */
const CAMERA_SCORE: readonly CameraKeyframe[] = [
  { t: 0.0, cx: 3240, cy: 216, zoom: 1.0, hold: true },
  { t: 11.0, cx: 3240, cy: 216, zoom: 1.0 },
  { t: 12.4, cx: 1420, cy: 210, zoom: 1.28 },
  { t: 15.2, cx: 3180, cy: 214, zoom: 1.24 },
  { t: 17.8, cx: 4720, cy: 214, zoom: 1.22 },
  { t: 19.8, cx: 3240, cy: 216, zoom: 1.0, hold: true }, // Full 30m Overview (20.0s..25.6s)
  { t: 25.6, cx: 3240, cy: 216, zoom: 1.0 },
  { t: 27.6, cx: 5160, cy: 204, zoom: 1.62 },
  { t: 29.96, cx: 5485, cy: 184, zoom: 2.75, hold: true }, // Vertical dive into 04 Skewed plate-07!
  { t: 30.0, cx: 3240, cy: 216, zoom: 1.0, hold: true },   // Hard cut -> Full-bleed Archive Spread & Acts II-IV
  { t: 120.0, cx: 3240, cy: 216, zoom: 1.0, hold: true },
];

export function createMotionStage(host: HTMLElement, options: MotionStageOptions = {}): MotionStageHandle {
  const canvasScale = options.canvasScale ?? 1;
  const corpus = getCorpus();
  const { fragments, targetIndex, neighborIndices, topEdges } = corpus;
  const layouts = computePanoramicLayouts(fragments, corpus.rankedPairs, targetIndex, neighborIndices);

  /* --- 0. SVG feColorMatrix Filter for Rehearsal Red-Tint Calibration (`?rgain=0.50..1.00`) --- */
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

  /* --- 1. Swiss Precision Hairline Registration Grid (`0.5px` Vernier ticks & fiducials) --- */
  const gridSvg = document.createElementNS(SVG_NS, 'svg');
  gridSvg.setAttribute('class', 'swiss-grid-svg');
  gridSvg.setAttribute('viewBox', `0 0 ${STAGE_W} ${STAGE_H}`);
  let gridMarkup = `<line x1="40" y1="18" x2="${STAGE_W - 40}" y2="18" stroke="#000000" stroke-width="0.45" stroke-opacity="0.35"/>`;
  gridMarkup += `<line x1="40" y1="${STAGE_H - 18}" x2="${STAGE_W - 40}" y2="${STAGE_H - 18}" stroke="#000000" stroke-width="0.45" stroke-opacity="0.35"/>`;
  for (let x = 180; x <= STAGE_W - 180; x += 360) {
    const major = x % 720 === 0;
    const h = major ? 7 : 4;
    gridMarkup += `<line x1="${x}" y1="18" x2="${x}" y2="${18 - h}" stroke="#000000" stroke-width="0.5" stroke-opacity="0.55"/>`;
    gridMarkup += `<line x1="${x}" y1="${STAGE_H - 18}" x2="${x}" y2="${STAGE_H - 18 + h}" stroke="#000000" stroke-width="0.5" stroke-opacity="0.55"/>`;
    if (major) {
      // Delicate crosshair fiducial at horizon y=216
      gridMarkup += `<path d="M${x - 4} 216 L${x + 4} 216 M${x} 212 L${x} 220" stroke="#000000" stroke-width="0.45" stroke-opacity="0.28"/>`;
    }
  }
  gridSvg.innerHTML = gridMarkup;
  world.append(gridSvg);

  /* --- 1B. Micro-Monospace Telemetry Band (y = 4px, Ryoji Ikeda precision) --- */
  const telemetryBar = makeEl('div', 'swiss-telemetry-bar', root);
  const telLeft = makeEl('span', 'telemetry-tag', telemetryBar);
  telLeft.style.left = '44px';
  const telCenter = makeEl('span', 'telemetry-tag', telemetryBar);
  telCenter.style.left = '3240px';
  telCenter.style.transform = 'translateX(-50%)';
  const telRight = makeEl('span', 'telemetry-tag', telemetryBar);
  telRight.style.right = '520px';

  /* --- 2. Floor SVG (Compact Architectural Cast Shadows + 3D Floor Bezier Trajectories) --- */
  const floorSvg = document.createElementNS(SVG_NS, 'svg');
  floorSvg.setAttribute('class', 'stage-floor-svg');
  floorSvg.setAttribute('viewBox', `0 0 ${STAGE_W} ${STAGE_H}`);
  world.append(floorSvg);

  const shadowLayer = document.createElementNS(SVG_NS, 'g');
  shadowLayer.setAttribute('fill', '#000000');
  floorSvg.append(shadowLayer);

  const trajLayer = document.createElementNS(SVG_NS, 'g');
  floorSvg.append(trajLayer);

  /* --- 3. Act I.1: Opening Press of Alignment (`00:00 – 00:08`) --- */
  const pressLayer = makeEl('div', 'press-layer', world);

  const voronoiImgA = document.createElement('img');
  voronoiImgA.className = 'press-voronoi-plate';
  voronoiImgA.src = getPlateById('plate-01').src;
  voronoiImgA.alt = '';
  voronoiImgA.style.left = '2520px';
  voronoiImgA.style.top = '0px';
  pressLayer.append(voronoiImgA);

  const voronoiImgB = document.createElement('img');
  voronoiImgB.className = 'press-voronoi-plate';
  voronoiImgB.src = getPlateById('plate-15').src;
  voronoiImgB.alt = '';
  voronoiImgB.style.left = '5160px';
  voronoiImgB.style.top = '0px';
  pressLayer.append(voronoiImgB);

  const pressHeroQuery = makeEl('div', 'press-hero-query', pressLayer, QUERY_GEN1);

  const pressMemories = ALIGNED_MEMORY_LINES.map((m) => {
    const lineEl = makeEl('div', 'press-memory-line', pressLayer, m.text);
    const slabEl = makeEl('div', 'press-blue-slab', pressLayer);
    return { spec: m, lineEl, slabEl };
  });

  const pressFormula = makeEl('div', 'press-formula-stamp', pressLayer, ALIGNED_FORMULA);
  const pressMasterBlueBar = makeEl('div', 'press-blue-slab', pressLayer);
  pressMasterBlueBar.style.left = '140px';
  pressMasterBlueBar.style.top = '192px';
  pressMasterBlueBar.style.width = '6200px';
  pressMasterBlueBar.style.height = '48px';

  /* --- 4. Architectural Query Datum Header (Top-Left, Zero Input Chrome) --- */
  const datumAnchor = makeEl('div', 'datum-query-anchor', world);
  const datumKicker = makeEl('span', 'datum-query-kicker', datumAnchor, 'QUERY.01 / ALIGNED AXIS');
  const datumText = makeEl('span', 'datum-query-text', datumAnchor, QUERY_GEN1);
  const datumRule = makeEl('div', 'datum-query-rule', datumAnchor);
  datumRule.style.width = '320px';

  /* --- 5. Act II: 6,200 × 432 Full-Bleed Fine-Press Archive Spread (`30.0 – 39.0s`) --- */
  const spreadLayer = makeEl('div', 'archive-spread', world);
  const heroSpreadEls = layouts.heroSpreadSlots.map((slot) => {
    const wrap = makeEl('div', 'spread-hero-slot', spreadLayer);
    wrap.style.left = `${slot.x}px`;
    wrap.style.top = `${slot.y}px`;
    wrap.style.width = `${slot.w}px`;
    wrap.style.height = `${slot.h}px`;

    const img = document.createElement('img');
    img.src = getPlateById(slot.plateId).src;
    img.alt = slot.caption;
    wrap.append(img);

    const meta = makeEl('div', 'spread-hero-meta', wrap);
    makeEl('span', 'spread-hero-code', meta, slot.code);
    makeEl('span', 'spread-hero-cap', meta, slot.caption);
    return { slot, wrap };
  });

  /* --- 5B. Horizon Lithograph Backdrop (Polar Sastrugi `plate-16` behind Gen 2 Monoliths) --- */
  const sastrugiBackdrop = document.createElement('img');
  sastrugiBackdrop.src = getPlateById('plate-16').src;
  sastrugiBackdrop.alt = '';
  sastrugiBackdrop.style.position = 'absolute';
  sastrugiBackdrop.style.left = '4320px';
  sastrugiBackdrop.style.top = '156px';
  sastrugiBackdrop.style.width = '1840px';
  sastrugiBackdrop.style.height = '276px';
  sastrugiBackdrop.style.objectFit = 'cover';
  sastrugiBackdrop.style.mixBlendMode = 'multiply';
  sastrugiBackdrop.style.pointerEvents = 'none';
  sastrugiBackdrop.style.zIndex = '3';
  sastrugiBackdrop.style.opacity = '0';
  world.append(sastrugiBackdrop);

  /* --- 6. Act I & Act IV: 3D Architectural Silkscreen & Lithograph Monoliths --- */
  const cardLayer = makeEl('div', 'card-layer', world);
  const monoliths: PlacedMonolith[] = [];
  const trajectories: FloorTrajectory[] = [];

  const addMonolith = (
    spec: CardSpec,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    at: number,
    stationIdx?: number,
  ): PlacedMonolith => {
    const el = makeEl('article', 'monolith-card', cardLayer);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.zIndex = String(Math.round(100 + z));

    const bandCls = spec.group === 'aligned' ? 'monolith-band aligned' : `monolith-band skewed-${spec.rank ?? 1}`;
    const band = makeEl('div', bandCls, el);
    makeEl('span', '', band, spec.indexCode);
    makeEl('span', '', band, spec.metric);

    if (spec.plateId) {
      const pWrap = makeEl('div', 'monolith-plate-wrap', el);
      pWrap.style.height = spec.group === 'skewed' ? '114px' : '74px';
      const img = document.createElement('img');
      img.src = getPlateById(spec.plateId).src;
      img.alt = spec.title;
      pWrap.append(img);

      if (spec.group === 'skewed' && spec.rank) {
        const slab = makeEl('div', 'monolith-tint-slab', pWrap);
        slab.style.background = ORANGE[spec.rank];
        makeEl('span', 'monolith-rank-num', pWrap, `0${spec.rank}`);
      }
    }

    const body = makeEl('div', 'monolith-body', el);
    makeEl('div', 'monolith-title', body, spec.title);
    makeEl('div', 'monolith-snippet', body, spec.snippet);

    const shadow = document.createElementNS(SVG_NS, 'polygon');
    shadowLayer.append(shadow);

    const rec: PlacedMonolith = { spec, el, shadow, x, y, z, w, h, at, gen: spec.gen, stationIdx };
    monoliths.push(rec);
    return rec;
  };

  const addBezierTrajectory = (
    gen: 1 | 2,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    dipY: number,
    at: number,
    dur = 0.85,
  ) => {
    const cx1 = lerp(x0, x1, 0.28);
    const cx2 = lerp(x0, x1, 0.76);
    const curve = document.createElementNS(SVG_NS, 'path');
    curve.setAttribute('d', `M${x0.toFixed(1)} ${y0.toFixed(1)} C${cx1.toFixed(1)} ${dipY.toFixed(1)}, ${cx2.toFixed(1)} ${dipY.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`);
    curve.setAttribute('pathLength', '1');
    curve.setAttribute('fill', 'none');
    curve.setAttribute('stroke', '#ff0000');
    curve.setAttribute('stroke-width', '1.45');
    curve.style.mixBlendMode = 'multiply';

    // Tangent direction at endpoint from (cx2, dipY) -> (x1, y1)
    const dx = x1 - cx2;
    const dy = y1 - dipY;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const head = document.createElementNS(SVG_NS, 'path');
    head.setAttribute(
      'd',
      `M${(x1 - ux * 10 - uy * 5).toFixed(1)} ${(y1 - uy * 10 + ux * 5).toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)} L${(x1 - ux * 10 + uy * 5).toFixed(1)} ${(y1 - uy * 10 - ux * 5).toFixed(1)}`,
    );
    head.setAttribute('fill', 'none');
    head.setAttribute('stroke', '#ff0000');
    head.setAttribute('stroke-width', '1.45');

    trajLayer.append(curve, head);
    trajectories.push({ gen, curve, head, at, dur });
  };

  // --- GEN 1 Monoliths (Act I: 6.2s .. 30.0s) ---
  const g1Trunk: PlacedMonolith[] = GEN1_ALIGNED_CARDS.map((spec, i) => {
    const x = 112 + i * 154;
    const y = 96 + (i % 4) * 38;
    const w = 248;
    const h = spec.plateId ? 192 : 124;
    return addMonolith(spec, x, y, i * 10, w, h, 6.2 + i * 0.22);
  });

  const g1Stacks: PlacedMonolith[][] = GEN1_SKEWED_STATIONS.map((st, sIdx) =>
    st.cards.map((spec, cIdx) => {
      const x = st.x - 168 + cIdx * 124;
      const y = 104 + cIdx * 32;
      const w = 282;
      const h = 224;
      return addMonolith(spec, x, y, 40 + sIdx * 24 + cIdx * 20, w, h, 11.2 + sIdx * 1.15 + cIdx * 0.28, sIdx);
    }),
  );
  const diveTargetCard = g1Stacks[3]![2]!; // 04 Skewed Permian fluid inclusion monolith at x ≈ 5420

  g1Stacks.forEach((stack, sIdx) => {
    const src = g1Trunk[Math.min(g1Trunk.length - 1, 5 + sIdx)]!;
    const dst = stack[1]!;
    addBezierTrajectory(
      1,
      src.x + src.w * 0.75,
      src.y + src.h,
      dst.x + dst.w * 0.42,
      dst.y + dst.h + 2,
      392 + sIdx * 6,
      15.2 + sIdx * 0.4,
      0.95,
    );
  });

  // --- GEN 2 Monoliths (Act IV: 106.4s .. 119.5s — 16 unique monoliths: 4 Aligned + 12 Skewed) ---
  const g2Trunk: PlacedMonolith[] = GEN2_ALIGNED_CARDS.map((spec, i) => {
    const x = 118 + i * 336;
    const y = 106 + (i % 2) * 46;
    const w = 296;
    const h = 216;
    return addMonolith(spec, x, y, 20 + i * 16, w, h, 106.5 + i * 0.28);
  });

  const g2Stacks: PlacedMonolith[][] = GEN2_SKEWED_STATIONS.map((st, sIdx) =>
    st.cards.map((spec, cIdx) => {
      const x = st.x - 166 + cIdx * 122;
      const y = 102 + cIdx * 32;
      const w = 282;
      const h = 224;
      return addMonolith(spec, x, y, 42 + sIdx * 24 + cIdx * 20, w, h, 108.0 + sIdx * 0.72 + cIdx * 0.22, sIdx);
    }),
  );

  g2Stacks.forEach((stack, sIdx) => {
    const src = g2Trunk[Math.min(g2Trunk.length - 1, sIdx)]!;
    const dst = stack[1]!;
    addBezierTrajectory(
      2,
      src.x + src.w * 0.72,
      src.y + src.h,
      dst.x + dst.w * 0.42,
      dst.y + dst.h + 2,
      392 + sIdx * 6,
      110.2 + sIdx * 0.3,
      0.85,
    );
  });

  /* --- 7. Skewed Distance Datum Axis (`01 -> 04`) --- */
  const axisLayer = makeEl('div', 'axis-layer', world);
  const AXIS_X0 = 1840;
  const AXIS_X1 = 5780;
  const AXIS_Y = 74;

  const axisBar = makeEl('div', 'axis-bar', axisLayer);
  axisBar.style.left = `${AXIS_X0}px`;
  axisBar.style.top = `${AXIS_Y}px`;
  axisBar.style.width = `${AXIS_X1 - AXIS_X0}px`;

  const axisNodes: AxisStationNode[] = [];
  const registerAxis = (list: readonly SkewedStationSpec[], gen: 1 | 2, baseAt: number, step: number) => {
    list.forEach((st, idx) => {
      const stationEl = makeEl('div', 'axis-station', axisLayer);
      stationEl.style.left = `${st.x - 160}px`;
      stationEl.style.top = '28px';
      makeEl('div', 'axis-station-code', stationEl, st.code);
      makeEl('div', 'axis-station-title', stationEl, st.label);

      const dotEl = makeEl('div', 'axis-dot', axisLayer);
      dotEl.style.left = `${st.x - 5}px`;
      dotEl.style.top = `${AXIS_Y - 5}px`;
      dotEl.style.background = ORANGE[st.rank];

      axisNodes.push({ gen, spec: st, stationEl, dotEl, at: baseAt + idx * step });
    });
  };
  registerAxis(GEN1_SKEWED_STATIONS, 1, 11.0, 1.15);
  registerAxis(GEN2_SKEWED_STATIONS, 2, 107.8, 0.72);

  /* --- 8. Right-Edge 3D Oblique History Ribbon (Pierces Top & Bottom Frame) --- */
  const historyWrap = makeEl('aside', 'history-rail-wrap', world);
  const historyScene = makeEl('div', 'history-scene', historyWrap);
  const historyList = makeEl('ol', 'history-list', historyScene);
  makeEl('li', 'history-head', historyList, 'HISTORY / TRACE');

  const historyItems: { el: HTMLElement; at: number }[] = [];
  const visitedCards: { spec: CardSpec; at: number }[] = [
    ...g1Trunk.slice(0, 5).map((c) => ({ spec: c.spec, at: c.at + 0.3 })),
    ...g1Stacks.map((st) => ({ spec: st[2]!.spec, at: st[2]!.at + 0.25 })),
    ...g2Trunk.map((c) => ({ spec: c.spec, at: c.at + 0.25 })),
    ...g2Stacks.map((st) => ({ spec: st[2]!.spec, at: st[2]!.at + 0.25 })),
  ];
  for (const item of visitedCards) {
    const li = makeEl('li', 'history-page', historyList);
    const topRow = makeEl('div', 'history-page-top', li);
    const badge = makeEl(
      'span',
      'history-badge',
      topRow,
      item.spec.group === 'aligned' ? 'ALIGNED' : `0${item.spec.rank ?? 1} SKEWED`,
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
    makeEl('p', 'history-page-snip', li, item.spec.snippet);
    historyItems.push({ el: li, at: item.at });
  }

  /* --- 9. High-Precision 2D Silkscreen Canvas --- */
  const canvas = makeEl('canvas', 'stage-canvas', world);
  canvas.width = Math.round(STAGE_W * canvasScale);
  canvas.height = Math.round(STAGE_H * canvasScale);
  const ctx = canvas.getContext('2d')!;

  /* --- 10. 200 Multi-Layered Deconstructed Fragments (`70 Anchors + 110 Sentences + 20 Plates`) --- */
  const fragLayer = makeEl('div', 'frag-layer', world);
  const fragEls: HTMLElement[] = fragments.map((f) => {
    const cls =
      f.type === 'img' ? 'frag is-img' : f.tier === 'anchor' ? 'frag is-anchor' : 'frag is-sentence';
    const el = makeEl('div', cls, fragLayer);
    if (f.type === 'img' && f.plate) {
      const img = document.createElement('img');
      img.src = f.plate.src;
      img.alt = f.plate.label;
      el.append(img);
      makeEl('span', 'frag-lab', el, `${f.plate.code} · ${f.plate.label}`);
    } else {
      el.textContent = f.content;
      el.style.fontSize = `${f.baseFontPx}px`;
    }
    return el;
  });

  /* --- 11. Special Telemetry Callouts, Central Orbit Sanctuary & Act IV Fault-Line / Gale --- */
  const specialLayer = makeEl('div', 'special-layer', world);
  const laserTelemetryEl = makeEl('div', 'laser-telemetry', specialLayer);

  const orbitSanctuaryEl = makeEl('div', 'orbit-center-sanctuary', specialLayer);
  makeEl('span', 'orbit-center-kicker', orbitSanctuaryEl, 'ORIGIN NUCLEUS · COS 1.000');
  makeEl('span', 'orbit-center-query', orbitSanctuaryEl, QUERY_GEN1);

  const peripheryBeaconEl = makeEl('div', 'periphery-beacon', specialLayer);

  // Act IV 3D Fault-Line Shards (`z: -70, +90, -50` + `#FF0000 × #0000FF` silkscreen overprint on center shard!)
  const shardEls = TARGET_PHRASE_PIECES.map((p, idx) => {
    const base = makeEl('div', 'fault-shard', specialLayer, p.text);
    base.style.fontSize = idx === 1 ? '82px' : '38px';
    base.style.fontWeight = idx === 1 ? '700' : '400';
    return base;
  });
  const centerShardOverprint = makeEl('div', 'fault-shard-overprint', specialLayer, QUERY_GEN2);
  centerShardOverprint.style.fontSize = '82px';

  // Act IV Horizontal Gale Hero Text ("수억 년 전의 바람" sweeping 6,480px)
  const galeOverprintEl = makeEl('div', 'gale-wind-overprint', specialLayer, QUERY_GEN2);
  const galeBannerEl = makeEl('div', 'gale-wind-banner', specialLayer, QUERY_GEN2);

  /* --- 12. Loop Pure-White Wash --- */
  const fadeWash = makeEl('div', 'stage-fade', root);

  /* --- Three.js Perspective Camera (`1 world unit = 1px @ z=0`) --- */
  const CAM_FOV_DEG = 22;
  const Z_CAM = (STAGE_H * 0.5) / Math.tan(THREE.MathUtils.degToRad(CAM_FOV_DEG * 0.5)); // ≈ 1111.21
  const camera3D = new THREE.PerspectiveCamera(CAM_FOV_DEG, STAGE_W / STAGE_H, 10, 40000);
  const tmpVec = new THREE.Vector3();

  const project3D = (
    wx: number,
    wy: number,
    wz: number,
  ): { sx: number; sy: number; depthScale: number; distFromFocal: number } => {
    tmpVec.set(wx, wy, wz);
    const dist = Math.max(220, tmpVec.distanceTo(camera3D.position));
    // Focal plane sits slightly forward of origin (z = +55) so foreground anchors pop razor-sharp!
    const distFromFocal = wz - 55;
    tmpVec.project(camera3D);
    return {
      sx: (tmpVec.x + 1) * 0.5 * STAGE_W,
      sy: (1 - tmpVec.y) * 0.5 * STAGE_H,
      depthScale: clamp(Z_CAM / dist, 0.66, 1.42),
      distFromFocal,
    };
  };

  /* --- Pre-defined Act II Pairwise Cosine Laser Scans (`40.6s .. 43.8s`) --- */
  const pairLasers = [
    { a: 2, b: 26, score: 'COS 0.884', t0: 40.5, t1: 41.35 },
    { a: 42, b: 82, score: 'COS 0.792', t0: 41.35, t1: 42.2 },
    { a: 108, b: 146, score: 'COS 0.641', t0: 42.2, t1: 43.05 },
    { a: 2, b: targetIndex, score: 'COS 0.140 · ε', t0: 43.05, t1: 43.9 },
  ];

  /* --- Deterministic Crimson Radial All-Pairs Scan (`43.9s .. 46.0s`) --- */
  const burstPairs: [number, number, number][] = [];
  for (let k = 0; k < 720; k++) {
    const a = Math.floor(hash(k * 17 + 3) * fragments.length);
    const b = Math.floor(hash(k * 29 + 11) * fragments.length);
    if (a !== b) burstPairs.push([a, b, hash(k * 53 + 7)]);
  }

  // Reusable per-frame fragment screen buffer
  const screenPos: { x: number; y: number; z: number; s: number; o: number; blur: number; zIdx: number }[] =
    fragments.map(() => ({
      x: 0,
      y: 0,
      z: 0,
      s: 1,
      o: 0,
      blur: 0,
      zIdx: 10,
    }));

  /** Studio Preview Auto-Follow X coordinate */
  function getFocusX(tRaw: number): number {
    const t = ((tRaw % DURATION) + DURATION) % DURATION;
    if (t < 3.0) return 1180;
    if (t < 8.0) return lerp(1180, 3420, easeInOut(progress(t, 3.0, 7.0)));
    if (t < 11.0) return lerp(900, 5600, progress(t, 8.0, 10.9));
    if (t < 18.2) return lerp(1420, 4800, easeInOut(progress(t, 11.0, 18.0)));
    if (t < 25.6) return lerp(4800, 3240, easeInOut(progress(t, 18.2, 21.0)));
    if (t < 30.0) return lerp(3240, 5480, easeInOut(progress(t, 25.6, 29.5)));
    if (t < 34.5) return lerp(1600, 4800, easeInOut(progress(t, 30.0, 34.5)));
    if (t < 39.0) return lerp(1200, 5200, progress(t, 34.5, 38.8));
    if (t < 46.0) return 3240;
    if (t < 52.0) return 3240;
    if (t < 61.5) return lerp(1800, 4680, easeInOut(progress(t, 52.0, 61.5)));
    if (t < 68.5) return 3240;
    if (t < 76.0) return lerp(2000, 4500, easeInOut(progress(t, 68.5, 76.0)));
    if (t < 88.0) return 3240;
    if (t < 101.5) return 4880;
    if (t < 106.5) return lerp(5600, 960, easeInOut(progress(t, 101.5, 106.2)));
    if (t < 118.0) return lerp(1400, 4900, easeInOut(progress(t, 106.5, 117.5)));
    return 3240;
  }

  /**
   * Pure deterministic renderer: `renderAt(t)` depends EXCLUSIVELY on `tRaw`.
   */
  function renderAt(tRaw: number): void {
    const t = ((tRaw % DURATION) + DURATION) % DURATION;
    const pulse = beatPulse(t, 1);
    const beatIdx = Math.floor(t * 2);

    // Reset 2D canvas cleanly
    ctx.setTransform(canvasScale, 0, 0, canvasScale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.clearRect(0, 0, STAGE_W, STAGE_H);

    // -----------------------------------------------------------------------
    // 0. CATMULL-ROM WORLD CAMERA RIG (`world.style.transform`)
    // -----------------------------------------------------------------------
    const cam = evalCameraRig(CAMERA_SCORE, t);
    if (cam.zoom <= 1.0005) {
      world.style.transform = 'none';
    } else {
      const visW = STAGE_W / cam.zoom;
      const visH = STAGE_H / cam.zoom;
      const clampedCx = clamp(cam.cx, visW * 0.5, STAGE_W - visW * 0.5);
      const clampedCy = clamp(cam.cy, visH * 0.5, STAGE_H - visH * 0.5);
      const leftX = clampedCx - visW * 0.5;
      const topY = clampedCy - visH * 0.5;
      world.style.transform = `scale(${cam.zoom.toFixed(5)}) translate3d(${(-leftX).toFixed(2)}px, ${(-topY).toFixed(2)}px, 0px)`;
    }

    // Update top micro-monospace Swiss telemetry bar
    const phaseLabel =
      t < 8.0
        ? 'ACT I.1 / PRESS OF ALIGNMENT'
        : t < 11.0
          ? 'ACT I.2 / CHRONOPHOTOGRAPHY STRIDE'
          : t < 30.0
            ? 'ACT I.3 / SKEWED 3D ARCHIPELAGO [01→04]'
            : t < 39.0
              ? 'ACT II.1 / ARCHIVE SPREAD & GUILLOTINE CUTS'
              : t < 46.0
                ? 'ACT II.2 / 1024-DIM SPECTRUM & COSINE SCAN'
                : t < 52.0
                  ? 'ACT III.1 / LINEAR COLUMNS [2D]'
                  : t < 61.5
                    ? 'ACT III.2 / MONUMENTAL HELIX [3D · DOF]'
                    : t < 68.5
                      ? 'ACT III.3 / SEMANTIC AFFINITY ARTERIES [2D]'
                      : t < 76.0
                        ? 'ACT III.4 / VOLUMETRIC NEBULA [3D · SPLINE]'
                        : t < 82.5
                          ? 'ACT III.5 / QUERY ORBIT [2D · ε 0.14]'
                          : t < 88.0
                            ? 'ACT III.6 / SPHERE SHELL [3D · RADIAL]'
                            : t < 95.0
                              ? 'ACT IV.1 / PERIPHERAL AWAKENING [ε 0.14]'
                              : t < 101.5
                                ? 'ACT IV.2 / 3D TYPOGRAPHIC FAULT FRACTURE'
                                : 'ACT IV.3 / PALEO-WIND GALE & GEN-2 HORIZON';

    telLeft.textContent = `${phaseLabel} · 6480×432`;
    telCenter.textContent = `120 BPM · BEAT ${String(beatIdx + 1).padStart(3, '0')} · T ${t.toFixed(2).padStart(6, '0')}S`;
    telRight.textContent = t >= 105.6 ? `AXIS: ${QUERY_GEN2} · ε 0.14` : `AXIS: ${QUERY_GEN1} · 1024-DIM`;

    // -----------------------------------------------------------------------
    // 1. ACT I.1 (`00:00 – 00:08.2`): PRESS OF ALIGNMENT & VORONOI EBULLITION
    // -----------------------------------------------------------------------
    const inPress = t < 8.3;
    if (!inPress) {
      pressLayer.style.opacity = '0';
      pressHeroQuery.style.opacity = '0';
      voronoiImgA.style.opacity = '0';
      voronoiImgB.style.opacity = '0';
      pressFormula.style.opacity = '0';
      pressMasterBlueBar.style.opacity = '0';
      for (const pm of pressMemories) {
        pm.lineEl.style.opacity = '0';
        pm.slabEl.style.opacity = '0';
      }
    } else {
      const pressOut = 1 - span(t, 7.3, 8.0, easeInCubic);
      pressLayer.style.opacity = String(pressOut);

      // Monumental architectural serif "김치찌개 끓이는 법" (136px, variable wght 200 -> 750)
      const qEnter = span(t, 0.18, 0.9, easeOutExpo);
      const qCompress = span(t, 5.8, 7.2, easeInOutCubic);
      const wght = Math.round(lerp(210, 760, span(t, 0.6, 4.5, easeInOut) + pulse * 0.12));
      const qScale = lerp(1.0, 0.24, qCompress);
      const qX = lerp(160, 118, qCompress);
      const qY = lerp(138, 30, qCompress);
      pressHeroQuery.style.opacity = String(qEnter * (1 - span(t, 6.9, 7.4)));
      pressHeroQuery.style.fontVariationSettings = `"wght" ${clamp(wght, 200, 900)}`;
      pressHeroQuery.style.transform = `translate3d(${(qX - 160).toFixed(1)}px, ${(qY - 138).toFixed(1)}px, 0) scale(${qScale.toFixed(4)})`;

      // Voronoi boiling foam lithograph plates (`multiply`)
      const vOp = span(t, 0.8, 2.0) * (1 - span(t, 6.8, 7.6)) * 0.88;
      voronoiImgA.style.opacity = String(vOp);
      voronoiImgA.style.transform = `scale(${(1.02 + t * 0.012).toFixed(4)})`;
      voronoiImgB.style.opacity = String(vOp * 0.76);
      voronoiImgB.style.transform = `scale(${(1.04 + t * 0.01).toFixed(4)})`;

      // Living kitchen memory sentences slammed & overprinted on 120 BPM beats (`t = 1.5..6.5s`)
      const crushToAxis = span(t, 4.6, 6.4, easeInOutCubic);
      for (const pm of pressMemories) {
        const tAppear = pm.spec.beat * 0.5; // exact 0.5s beat!
        const tStamp = tAppear + 0.5;       // blue silkscreen bar stamps 1 beat later!
        const memOn = t >= tAppear ? 1 : 0; // crisp 120 BPM hard-on entry
        const stampOn = span(t, tStamp, tStamp + 0.18, easeOutExpo);
        const curY = lerp(pm.spec.y, 216, crushToAxis);
        const curX = lerp(pm.spec.x, 920, span(t, 6.2, 7.5, easeInCubic));
        const fadeOut = 1 - span(t, 6.3, 7.2);

        pm.lineEl.style.opacity = String(memOn * fadeOut * lerp(1, 0.32, crushToAxis));
        pm.lineEl.style.left = `${curX.toFixed(1)}px`;
        pm.lineEl.style.top = `${curY.toFixed(1)}px`;
        pm.lineEl.style.transform = `translate(-50%, -50%) scaleY(${lerp(1, 0.55, crushToAxis).toFixed(3)})`;

        const slabW = pm.spec.text.length * 29 + 34;
        pm.slabEl.style.left = `${(curX - slabW * 0.5).toFixed(1)}px`;
        pm.slabEl.style.top = `${(curY - 17).toFixed(1)}px`;
        pm.slabEl.style.width = `${slabW.toFixed(0)}px`;
        pm.slabEl.style.height = '34px';
        pm.slabEl.style.opacity = String(stampOn * fadeOut * 0.72);
        pm.slabEl.style.transform = `scaleX(${stampOn.toFixed(4)})`;
      }

      // Cold statistical average formula stamp (`450 ml · 1.75 tbsp · 12.5 min · 1.15 %`) peaking at t = 5.5s!
      const formIn = t >= 4.0 ? span(t, 4.0, 4.12, easeOutExpo) : 0; // percussive 3-frame slam at beat 8!
      const formCollapse = span(t, 6.4, 7.5, easeInOutCubic);
      pressFormula.style.opacity = String(formIn * (1 - span(t, 7.1, 7.7)));
      pressFormula.style.transform = `translate(${lerp(-50, -210, formCollapse).toFixed(1)}%, -50%) scale(${lerp(1.0, 0.52, formCollapse).toFixed(3)})`;

      pressMasterBlueBar.style.opacity = String(span(t, 4.5, 4.65, easeOutExpo) * (1 - span(t, 6.8, 7.5)) * 0.42);
      pressMasterBlueBar.style.transform = `scaleX(${span(t, 4.5, 5.2, easeOutExpo).toFixed(4)})`;
    }

    // -----------------------------------------------------------------------
    // 2. ARCHITECTURAL QUERY DATUM HEADER & TOTAL ORIGIN ERASURE
    // -----------------------------------------------------------------------
    const datumVisible =
      (t >= 6.8 && t < 30.0 ? span(t, 6.8, 7.3) * (1 - span(t, 29.2, 29.95)) : 0) +
      (t >= 103.5 ? span(t, 103.5, 104.2) : 0);

    if (datumVisible <= 0.002) {
      datumAnchor.style.opacity = '0';
      datumAnchor.style.transform = 'none';
    } else {
      const originErased = t >= 105.5;
      const shatter = win(t, 104.8, 105.6, 0.18);
      datumKicker.textContent = originErased
        ? 'RE-ASK.02 / ORIGIN ERASED · PALEO-WIND HORIZON'
        : 'QUERY.01 / ALIGNED STATISTICAL AXIS';
      datumKicker.style.color = originErased ? '#ff0000' : '#0000ff';
      datumText.textContent = originErased ? QUERY_GEN2 : QUERY_GEN1;
      datumAnchor.style.opacity = String(clamp(datumVisible * (1 - shatter * 0.85), 0, 1));
      datumAnchor.style.transform = shatter > 0.01 ? `translateX(${(-shatter * 48).toFixed(1)}px) skewX(-14deg)` : 'none';
      datumRule.style.transform = `scaleX(${originErased ? span(t, 105.5, 106.4).toFixed(3) : '1'})`;
    }

    // -----------------------------------------------------------------------
    // 3. ACT I.2 (`08.0 – 11.4s`): MUYBRIDGE 5-FRAME CHRONOPHOTOGRAPHY GALLOP
    // -----------------------------------------------------------------------
    if (t >= 8.0 && t < 11.6) {
      const gallopFade = (t >= 8.0 ? 1 : 0) * (1 - span(t, 10.95, 11.55));
      const leadU = progress(t, 8.0, 10.85);
      const leadX = lerp(260, 6220, leadU);

      ctx.save();
      ctx.globalCompositeOperation = 'multiply';

      // Horizon baseline hairline
      ctx.strokeStyle = `rgba(0, 0, 0, ${(0.45 * gallopFade).toFixed(3)})`;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(120, 306.5);
      ctx.lineTo(leadX + 120, 306.5);
      ctx.stroke();

      // 11 stroboscopic chronophotography afterimages + #FF0000 vertical time-slice hairlines
      const stationsCount = 11;
      for (let k = 0; k < stationsCount; k++) {
        const sx = 480 + k * 510;
        if (leadX < sx) continue;
        const age = clamp((leadX - sx) / 2600, 0, 1);
        const ghostAlpha = gallopFade * lerp(0.58, 0.15, age);
        const strideImg = getDecodedStride(k % 5);
        if (strideImg && ghostAlpha > 0.01) {
          ctx.globalAlpha = ghostAlpha;
          const w = 246;
          const h = 164;
          ctx.drawImage(strideImg, sx - w * 0.5, 224 - h * 0.5, w, h);
        }

        // Red stroboscopic shutter line
        ctx.globalAlpha = gallopFade * lerp(0.75, 0.22, age);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(sx + 0.5, 92);
        ctx.lineTo(sx + 0.5, 336);
        ctx.stroke();
      }

      // Crisp 15fps animated lead Muybridge horse tearing open the skewed space
      const activeFrame = Math.floor((t - 8.0) * 15) % 5;
      const leadSprite = getDecodedStride(activeFrame);
      if (leadSprite && t < 11.05) {
        ctx.globalAlpha = gallopFade;
        const lw = 288;
        const lh = 192;
        ctx.drawImage(leadSprite, leadX - lw * 0.5, 218 - lh * 0.5, lw, lh);
      }
      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // 4. ACT I.3 (`06.2–30.0s`) & ACT IV.3 (`106.4–119.5s`): 3D MONOLITHS & RIBBON
    // -----------------------------------------------------------------------
    const inAct1Cards = t >= 6.1 && t < 30.0;
    const inAct4Cards = t >= 106.3;

    // Dive DOF intensity during 25.8..30.0s as camera plunges into 04 Skewed plate-07
    const diveProgress = span(t, 25.8, 29.9, easeInOutCubic);

    for (const c of monoliths) {
      const live = (c.gen === 1 && inAct1Cards) || (c.gen === 2 && inAct4Cards);
      if (!live) {
        c.el.style.opacity = '0';
        c.el.style.filter = 'none';
        c.el.style.outline = 'none';
        c.shadow.setAttribute('visibility', 'hidden');
        continue;
      }

      const enter = span(t, c.at, c.at + 0.42, easeOutExpo);
      if (enter <= 0.002) {
        c.el.style.opacity = '0';
        c.el.style.filter = 'none';
        c.el.style.outline = 'none';
        c.shadow.setAttribute('visibility', 'hidden');
        continue;
      }

      const isDiveHero = c === diveTargetCard && c.gen === 1;

      // Subtle architectural wave pulse across stations during overview (`20.2..24.5s` & `112.0..116.8s`)
      let waveLift = 0;
      if (c.spec.group === 'skewed' && c.stationIdx !== undefined) {
        const wStart = c.gen === 1 ? 20.2 : 112.0;
        const wEnd = c.gen === 1 ? 24.4 : 116.5;
        const when = lerp(wStart, wEnd, c.stationIdx / 3);
        const pWave = progress(t, when - 0.25, when + 0.55);
        waveLift = Math.sin(pWave * Math.PI) * 18;
      }

      const dy = (1 - enter) * 34 - waveLift;
      const rotY = c.spec.group === 'aligned' ? 9.5 : -7.5;
      const rotX = c.spec.group === 'aligned' ? 2.5 : 2.0;

      // Focal-plane DOF: during dive, non-target monoliths blur & fade gently while target stays tack-sharp
      const dofBlur = c.gen === 1 && !isDiveHero && diveProgress > 0.02 ? diveProgress * 3.8 : 0;
      const dofAtten = c.gen === 1 && !isDiveHero ? 1 - diveProgress * 0.68 : 1;
      const op = clamp(enter * dofAtten, 0, 1);

      c.el.style.opacity = op.toFixed(3);
      c.el.style.filter = dofBlur > 0.08 ? `blur(${dofBlur.toFixed(2)}px)` : 'none';
      c.el.style.transform = `perspective(1500px) translate3d(0px, ${dy.toFixed(1)}px, 0px) rotateY(${rotY}deg) rotateX(${rotX}deg)`;
      c.el.style.outline = isDiveHero && diveProgress > 0.05 ? '1.5px solid #ff0000' : 'none';

      // Compact crisp projected floor footprint (`<= 12px` deep so white ground stays >= 86%)
      if (op > 0.08 && dofBlur < 1.8) {
        c.shadow.removeAttribute('visibility');
        const sx0 = c.x + 8 + waveLift * 0.25;
        const sx1 = c.x + c.w + 10 + waveLift * 0.3;
        const syTop = c.y + c.h + 2;
        const syBot = syTop + 10;
        c.shadow.setAttribute('points', `${sx0.toFixed(1)},${syTop.toFixed(1)} ${sx1.toFixed(1)},${syTop.toFixed(1)} ${(sx1 + 9).toFixed(1)},${syBot.toFixed(1)} ${(sx0 + 6).toFixed(1)},${syBot.toFixed(1)}`);
        c.shadow.setAttribute('opacity', (0.14 * op).toFixed(3));
      } else {
        c.shadow.setAttribute('visibility', 'hidden');
      }
    }

    // Floor Bezier trajectories (`#FF0000` curved vectors)
    for (const tr of trajectories) {
      const live = (tr.gen === 1 && inAct1Cards) || (tr.gen === 2 && inAct4Cards);
      if (!live) {
        tr.curve.style.opacity = '0';
        tr.head.style.opacity = '0';
        continue;
      }
      const p = span(t, tr.at, tr.at + tr.dur, easeInOutCubic);
      const fade = tr.gen === 1 ? 1 - diveProgress * 0.8 : 1;
      tr.curve.setAttribute('stroke-dasharray', `${p.toFixed(4)} 1`);
      tr.curve.style.opacity = p > 0.005 ? fade.toFixed(3) : '0';
      tr.head.style.opacity = (progress(t, tr.at + tr.dur * 0.84, tr.at + tr.dur) * fade).toFixed(3);
    }

    // Skewed Distance Datum Axis (`01 -> 04`)
    const axisGen1 = inAct1Cards ? span(t, 10.8, 12.6, easeInOut) * (1 - diveProgress * 0.85) : 0;
    const axisGen2 = inAct4Cards ? span(t, 107.4, 109.2, easeInOut) : 0;
    const axisScale = Math.max(axisGen1, axisGen2);
    axisBar.style.transform = `scaleX(${axisScale.toFixed(4)})`;
    axisBar.style.opacity = axisScale > 0.005 ? '1' : '0';

    for (const node of axisNodes) {
      const live = (node.gen === 1 && inAct1Cards) || (node.gen === 2 && inAct4Cards);
      if (!live) {
        node.stationEl.style.opacity = '0';
        node.dotEl.style.opacity = '0';
        continue;
      }
      const e = span(t, node.at, node.at + 0.45);
      const fade = node.gen === 1 ? 1 - diveProgress * (node.spec.rank === 4 ? 0.35 : 0.85) : 1;
      node.stationEl.style.opacity = (e * fade).toFixed(3);
      node.stationEl.style.transform = `translateY(${((1 - e) * 8).toFixed(1)}px)`;
      node.dotEl.style.opacity = (e * fade).toFixed(3);
      node.dotEl.style.transform = `scale(${e.toFixed(3)})`;
    }

    // Right-Edge Oblique 3D History Ribbon (pierces top & bottom frame cleanly!)
    const histVis = inAct1Cards
      ? span(t, 6.8, 7.6) * (1 - diveProgress * 0.85)
      : inAct4Cards
        ? span(t, 106.8, 107.6)
        : 0;
    historyWrap.style.opacity = histVis.toFixed(3);
    if (histVis > 0.005) {
      let countVis = 0;
      for (const hi of historyItems) {
        const show = span(t, hi.at, hi.at + 0.32);
        hi.el.style.opacity = show.toFixed(3);
        if (show > 0.1) countVis++;
      }
      const scrollPx = Math.max(0, (countVis - 4) * 94);
      historyList.style.setProperty('--history-offset', `${scrollPx.toFixed(1)}px`);
    }

    // Act IV Gen 2 Polar Sastrugi Snowfield Horizon Plate (`plate-16` behind monoliths at z-index 3)
    const sOp = inAct4Cards ? span(t, 108.2, 111.0) * 0.48 : 0;
    sastrugiBackdrop.style.opacity = sOp.toFixed(3);

    // -----------------------------------------------------------------------
    // 5. ACT II (`30.0–46.0s`), ACT III (`46.0–88.0s`) & ACT IV.1–2 (`88.0–103.2s`)
    // -----------------------------------------------------------------------
    const inDeconstruct = t >= 30.0 && t < 103.4;

    if (!inDeconstruct) {
      spreadLayer.style.opacity = '0';
      for (const hSlot of heroSpreadEls) {
        hSlot.wrap.style.opacity = '0';
        hSlot.wrap.style.transform = 'none';
      }
      laserTelemetryEl.style.opacity = '0';
      orbitSanctuaryEl.style.opacity = '0';
      peripheryBeaconEl.style.opacity = '0';
      for (const sEl of shardEls) {
        sEl.style.opacity = '0';
        sEl.style.filter = 'none';
      }
      centerShardOverprint.style.opacity = '0';
      for (const el of fragEls) {
        el.style.opacity = '0';
        el.style.filter = 'none';
        el.style.transform = 'translate3d(-9999px, -9999px, 0)';
      }
    } else {
      // A. Full-Bleed Fine-Press Archive Spread (`30.0 – 39.0s`)
      const spreadOp = (t >= 30.0 ? 1 : 0) * (1 - span(t, 37.8, 39.0, easeInOutCubic));
      spreadLayer.style.opacity = spreadOp.toFixed(3);
      for (let sIdx = 0; sIdx < heroSpreadEls.length; sIdx++) {
        const hSlot = heroSpreadEls[sIdx]!;
        const peel = span(t, 37.4 + sIdx * 0.16, 38.9 + sIdx * 0.16, easeInCubic);
        hSlot.wrap.style.opacity = (spreadOp * (1 - peel)).toFixed(3);
        hSlot.wrap.style.transform = peel > 0.002 ? `translateY(${(-peel * 28).toFixed(1)}px) scale(${(1 - peel * 0.05).toFixed(3)})` : 'none';
      }

      // B. Configure Three.js PerspectiveCamera for 3D Helix, 3D Cloud (Catmull-Rom fly-through), and 3D Sphere
      const helixSpin = Math.max(0, t - 52.0) * 0.56;
      const sphereSpin = Math.max(0, t - 82.5) * 0.42;

      if (t >= 51.8 && t < 62.2) {
        camera3D.position.set(Math.sin(helixSpin * 0.25) * 90, Math.sin(helixSpin * 0.4) * 20, Z_CAM);
        camera3D.lookAt(0, 0, 0);
        camera3D.updateMatrixWorld();
        camera3D.updateProjectionMatrix();
      } else if (t >= 68.2 && t < 76.8) {
        // Catmull-Rom 3D fly-through spline penetrating the volumetric semantic cloud!
        const uFly = progress(t, 68.5, 76.0);
        const camX = catmullRom(-620, -280, 340, 680, uFly);
        const camY = catmullRom(-24, 28, -22, 16, uFly);
        const camZ = catmullRom(Z_CAM, Z_CAM - 290, Z_CAM - 240, Z_CAM, uFly);
        camera3D.position.set(camX, camY, camZ);
        camera3D.lookAt(camX * 0.35, 0, 0);
        camera3D.updateMatrixWorld();
        camera3D.updateProjectionMatrix();
      } else if (t >= 82.2 && t < 88.6) {
        camera3D.position.set(Math.sin(sphereSpin * 0.5) * 110, Math.cos(sphereSpin * 0.4) * 24, Z_CAM);
        camera3D.lookAt(0, 0, 0);
        camera3D.updateMatrixWorld();
        camera3D.updateProjectionMatrix();
      }

      // C. Compute deterministic position, scale, opacity & optical DOF blur for ALL 200 fragments
      const pairNow = pairLasers.find((p) => t >= p.t0 && t < p.t1);
      const pairDim = win(t, 40.45, 43.95, 0.2);

      // Act IV peripheral awakening (`88.0..101.5s`): 88% of universe dims to `×0.10` whisper!
      const focusDim = span(t, 88.0, 89.1, easeInOutCubic) * (1 - span(t, 101.4, 102.3));
      const faultLive = t >= 95.0 && t < 101.55;
      const galeSweepU = progress(t, 101.5, 106.2);
      const galeFrontX = lerp(6360, 80, easeInOutCubic(galeSweepU));
      const resonantSet = new Set(neighborIndices);

      for (let i = 0; i < fragments.length; i++) {
        const f = fragments[i]!;
        // Keep stagger compact (<= 0.38s) so settled windows (t=50.0s, 66.5s, 80.5s) are 100.00% settled!
        const stagger = i === targetIndex ? 0 : hash(i * 11 + 5) * 0.38;
        const curve = (hash(i * 23 + 9) - 0.5) * 84;

        // 1) Act II Full-bleed spread position (`30.0..46.0s`)
        const pPage = layouts.page[i]!;
        let x = pPage.x;
        let y = pPage.y;
        let z = 0;
        let s = pPage.scale;
        let o = pPage.opacity;
        let blur = 0;
        let zIdx = 10;

        // Subtle weightless levitation once guillotine cuts liberate fragments (`38.2..46.0s`)
        const liberateU = span(t, 38.0, 39.2, easeOutCubic) * (1 - span(t, 45.6, 46.2));
        if (liberateU > 0.001) {
          x += Math.sin(i * 1.7 + t * 0.9) * 14 * liberateU;
          y += Math.cos(i * 1.3 + t * 1.4) * 5 * liberateU;
        }

        // 2) Morph -> Act III.1 `reading2D` (`46.0..48.2s`, 100% settled at t = 50.0s!)
        const uRead = easeInOutCubic(progress(t, 46.0 + stagger, 47.9 + stagger));
        if (uRead > 0) {
          const pR = layouts.reading2D[i]!;
          [x, y] = stepArc(x, y, pR.x, pR.y, uRead, curve);
          s = lerp(s, pR.scale, uRead);
          o = lerp(o, pR.opacity, uRead);
          blur = 0;
        }

        // 3) Morph -> Act III.2 `helix3D` (`52.0..61.5s`, focal-plane DOF!)
        const uHelix = easeInOutCubic(progress(t, 52.0 + stagger, 54.1 + stagger));
        if (uHelix > 0 && t < 64.2) {
          const hb = layouts.helixBase[i]!;
          const ang = hb.angle + helixSpin;
          const wx = hb.x - STAGE_W * 0.5;
          const wy = Math.sin(ang) * hb.radiusY;
          const wz = Math.cos(ang) * hb.radiusZ;
          const proj = project3D(wx, wy, wz);
          const depth01 = (Math.cos(ang) + 1) * 0.5; // 1 = closest foreground, 0 = far background
          const hx = clamp(proj.sx, 110, STAGE_W - 110);
          const hy = clamp(proj.sy, 34, STAGE_H - 34);
          const hs =
            (f.type === 'img' ? 0.68 : f.tier === 'anchor' ? 1.06 : 0.78) * lerp(0.68, 1.34, depth01);
          const ho = lerp(0.24, 1.0, depth01);
          const hBlur = depth01 < 0.42 ? (0.42 - depth01) * 6.8 : 0;

          [x, y] = stepArc(x, y, hx, hy, uHelix, curve * 0.65);
          z = lerp(z, wz, uHelix);
          s = lerp(s, hs, uHelix);
          o = lerp(o, ho, uHelix);
          blur = lerp(blur, hBlur, uHelix);
          zIdx = Math.round(10 + depth01 * 60);
        }

        // 4) Morph -> Act III.3 `meaning2D` (`61.5..68.5s`, 100% settled & blur=0 at t = 66.5s!)
        const uMean = easeInOutCubic(progress(t, 61.5 + stagger, 63.6 + stagger));
        if (uMean > 0) {
          const pM = layouts.meaning2D[i]!;
          [x, y] = stepArc(x, y, pM.x, pM.y, uMean, curve);
          z = lerp(z, 0, uMean);
          s = lerp(s, pM.scale, uMean);
          o = lerp(o, pM.opacity, uMean);
          blur = lerp(blur, 0, uMean);
          zIdx = 20;
        }

        // 5) Morph -> Act III.4 `cloud3D` (`68.5..76.0s`, Catmull-Rom fly-through + DOF!)
        const uCloud = easeInOutCubic(progress(t, 68.5 + stagger, 70.3 + stagger));
        if (uCloud > 0 && t < 78.6) {
          const c3 = layouts.cloud3D[i]!;
          const orbitAng = (t - 68.5) * 0.16;
          const ca = Math.cos(orbitAng);
          const sa = Math.sin(orbitAng);
          const rcx = c3.cx;
          const rcy = c3.cy * ca - c3.cz * sa * 0.18;
          const rcz = c3.cz * ca + c3.cy * sa * 0.25;
          const proj = project3D(rcx, rcy, rcz);
          const depth01 = clamp((rcz + 270) / 540, 0, 1);
          const cx3 = clamp(proj.sx, 90, STAGE_W - 90);
          const cy3 = clamp(proj.sy, 32, STAGE_H - 32);
          const cs3 = layouts.meaning2D[i]!.scale * proj.depthScale * lerp(0.78, 1.26, depth01);
          const co3 = lerp(0.28, 1.0, depth01);
          const cBlur = depth01 < 0.38 ? (0.38 - depth01) * 6.5 : 0;

          [x, y] = stepArc(x, y, cx3, cy3, uCloud, curve * 0.45);
          z = lerp(z, rcz, uCloud);
          s = lerp(s, cs3, uCloud);
          o = lerp(o, co3, uCloud);
          blur = lerp(blur, cBlur, uCloud);
          zIdx = Math.round(10 + depth01 * 60);
        }

        // 6) Morph -> Act III.5 `orbit2D` (`76.0..82.5s`, 100% settled & blur=0 at t = 80.5s!)
        const uOrb = easeInOutCubic(progress(t, 76.0 + stagger, 78.2 + stagger));
        if (uOrb > 0) {
          const pO = layouts.orbit2D[i]!;
          [x, y] = stepArc(x, y, pO.x, pO.y, uOrb, curve * 0.75);
          z = lerp(z, 0, uOrb);
          s = lerp(s, pO.scale, uOrb);
          o = lerp(o, pO.opacity, uOrb);
          blur = lerp(blur, 0, uOrb);
          zIdx = Math.round(10 + f.level * 35);
        }

        // 7) Morph -> Act III.6 `sphere3D` (`82.5..88.0s`, 3D Question Sphere Shell) & return for Act IV
        const uSphere =
          easeInOutCubic(progress(t, 82.5 + stagger * 0.7, 84.1 + stagger * 0.7)) *
          (1 - easeInOutCubic(progress(t, 87.2, 88.4)));
        if (uSphere > 0.001) {
          const sp = layouts.sphere3D[i]!;
          const ca = Math.cos(sphereSpin);
          const sa = Math.sin(sphereSpin);
          const rx = sp.sx * ca + sp.sz * sa * 2.2;
          const ry = sp.sy;
          const rz = sp.sz * ca - (sp.sx / 9.0) * sa;
          const proj = project3D(rx, ry, rz);
          const depth01 = clamp((rz + 320) / 640, 0, 1);
          const sx3 = clamp(proj.sx, 110, STAGE_W - 110);
          const sy3 = clamp(proj.sy, 32, STAGE_H - 32);
          const ss3 = layouts.orbit2D[i]!.scale * lerp(0.76, 1.24, depth01);
          const so3 = Math.max(0.14, layouts.orbit2D[i]!.opacity * lerp(0.55, 1.15, depth01));
          const sBlur = depth01 < 0.34 ? (0.34 - depth01) * 5.2 : 0;

          x = lerp(x, sx3, uSphere);
          y = lerp(y, sy3, uSphere);
          s = lerp(s, ss3, uSphere);
          o = lerp(o, clamp(so3, 0.14, 1), uSphere);
          blur = lerp(blur, sBlur, uSphere);
          zIdx = Math.round(10 + depth01 * 55);
        }

        // Act IV.1 Peripheral `0.14` Awakening (`88.0..101.5s`, Zero Popup Box!)
        const isTarget = i === targetIndex;
        const isResonant = resonantSet.has(i);
        if (focusDim > 0.001) {
          if (isTarget) {
            // 14.2px * 3.66 ≈ 52px monumental crimson serif!
            o = lerp(o, 1.0, focusDim);
            s = lerp(s, 3.66, focusDim);
            blur = 0;
            zIdx = 95;
          } else if (isResonant) {
            o = lerp(o, 1.0, focusDim);
            s = lerp(s, 1.28, focusDim);
            blur = 0;
            zIdx = 88;
          } else {
            o *= lerp(1, 0.10, focusDim);
            blur = lerp(blur, 0.8, focusDim);
          }
        }

        // Act II Pairwise Cosine Laser Dimming (`40.5..43.9s`)
        if (pairDim > 0.001) {
          const inPair = pairNow && (i === pairNow.a || i === pairNow.b);
          o *= inPair ? 1 : lerp(1, 0.22, pairDim);
          if (inPair) zIdx = 85;
        }

        // Hide intact target sentence seamlessly while 3D fractured shards are active (`95.0..101.55s`) or swept
        if (isTarget && t >= 95.0) {
          o = 0;
        }

        // Act IV.3 Horizontal Gale sweeps away remaining old-universe fragments from right to left (`101.5..103.3s`)
        if (t >= 101.5) {
          const swept = clamp((x - galeFrontX + 260) / 420, 0, 1);
          x -= swept * 240;
          o *= (1 - swept) * (1 - span(t, 102.6, 103.3));
        }

        screenPos[i]!.x = x;
        screenPos[i]!.y = y;
        screenPos[i]!.z = z;
        screenPos[i]!.s = s;
        screenPos[i]!.o = o;
        screenPos[i]!.blur = blur;
        screenPos[i]!.zIdx = zIdx;

        const el = fragEls[i]!;
        if (o <= 0.003) {
          el.style.opacity = '0';
          el.style.filter = 'none';
          el.style.transform = 'translate3d(-9999px, -9999px, 0)';
        } else {
          el.style.opacity = o.toFixed(3);
          el.style.zIndex = String(zIdx);
          el.style.filter = blur > 0.12 ? `blur(${blur.toFixed(2)}px)` : 'none';
          el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${s.toFixed(3)})`;
          if (isTarget && focusDim > 0.01) {
            const rCh = Math.round(255 * focusDim);
            el.style.color = `rgb(${rCh}, 0, 0)`;
            el.style.fontWeight = '700';
          } else {
            el.style.color = '#000000';
            el.style.fontWeight = f.tier === 'anchor' ? '700' : '400';
          }
        }
      }

      // D. Act II.1: 120 BPM Surgical `#FF0000` Guillotine CUTS (`34.5 – 39.0s`)
      const cutMaster = (t >= 34.5 ? 1 : 0) * (1 - span(t, 38.4, 39.1));
      if (cutMaster > 0.005) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.strokeStyle = '#ff0000';
        for (const c of layouts.cuts) {
          const xNorm = clamp((c.x1 - 140) / 6200, 0, 1);
          const startAt = 34.5 + xNorm * 2.8 + (c.orientation === 'h' ? 0.35 : 0);
          const u = easeOutExpo(progress(t, startAt, startAt + 0.32));
          if (u <= 0.01) continue;
          ctx.lineWidth = c.orientation === 'v' ? 1.35 : 0.85;
          ctx.globalAlpha = cutMaster * (c.orientation === 'v' ? 0.92 : 0.68);
          ctx.beginPath();
          ctx.moveTo(c.x1, c.y1);
          ctx.lineTo(lerp(c.x1, c.x2, u), lerp(c.y1, c.y2, u));
          ctx.stroke();
        }
        ctx.restore();
      }

      // E. Act II.2: 1024-DIM 1px Carbon Barcode Spectrums (`39.0 – 44.2s`)
      const vecAlpha = span(t, 39.0, 39.4) * (1 - span(t, 43.6, 44.3));
      if (vecAlpha > 0.005) {
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        for (let i = 0; i < fragments.length; i++) {
          const p = screenPos[i]!;
          if (p.o <= 0.08) continue;
          const under = fragments[i]!.type === 'img' ? 32 : 10;
          const tickCount = 28;
          const halfSpan = tickCount * 1.35;
          for (let k = 0; k < tickCount; k++) {
            const reveal = progress(t, 39.0 + hash(i * 7 + k) * 0.65, 39.35 + hash(i * 7 + k) * 0.65);
            if (reveal <= 0.01) continue;
            const h = (1.5 + hash(i * 101 + k * 13) * 6.5) * reveal;
            ctx.globalAlpha = vecAlpha * 0.86;
            const px = Math.round(p.x - halfSpan + k * 2.7) + 0.5;
            ctx.beginPath();
            ctx.moveTo(px, p.y + under);
            ctx.lineTo(px, p.y + under + h);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // F. Act II.2: Pairwise `#FF0000` Cosine Measurement Lasers (`40.5 – 43.9s`) & Radial Burst (`43.9 – 46.0s`)
      if (pairNow) {
        const pa = screenPos[pairNow.a]!;
        const pb = screenPos[pairNow.b]!;
        const u = easeOutExpo(progress(t, pairNow.t0, pairNow.t0 + 0.28));
        const cxMid = lerp(pa.x, pb.x, 0.5);
        const cyMid = lerp(pa.y, pb.y, 0.5) - 24;

        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.quadraticCurveTo(lerp(pa.x, cxMid, u), lerp(pa.y, cyMid, u), lerp(pa.x, pb.x, u), lerp(pa.y, pb.y, u));
        ctx.stroke();

        // Precision crosshair reticles at endpoints
        for (const pt of [pa, { x: lerp(pa.x, pb.x, u), y: lerp(pa.y, pb.y, u) }]) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();

        laserTelemetryEl.textContent = `${pairNow.score} · 1024-DIM`;
        laserTelemetryEl.style.left = `${cxMid.toFixed(1)}px`;
        laserTelemetryEl.style.top = `${cyMid.toFixed(1)}px`;
        laserTelemetryEl.style.opacity = (
          progress(t, pairNow.t0 + 0.14, pairNow.t0 + 0.24) *
          (1 - progress(t, pairNow.t1 - 0.1, pairNow.t1))
        ).toFixed(3);
      } else {
        laserTelemetryEl.style.opacity = '0';
      }

      const burstA = span(t, 43.9, 44.3) * (1 - span(t, 45.4, 46.05));
      if (burstA > 0.005) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.lineWidth = 0.85;
        for (const [ia, ib, h] of burstPairs) {
          const lineU = progress(t, 43.9 + h * 0.4, 44.2 + h * 0.4);
          if (lineU <= 0.01) continue;
          const pa = screenPos[ia]!;
          const pb = screenPos[ib]!;
          ctx.strokeStyle = `rgba(255, 0, 0, ${(0.24 * burstA * lineU).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // G. Act III.2: Double-Helix Crimson Spine (`52.5 – 61.5s`)
      const helixSpineA = win(t, 52.6, 61.6, 0.7);
      if (helixSpineA > 0.005) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        for (const strand of [0, 1] as const) {
          ctx.strokeStyle = strand === 0 ? `rgba(255, 0, 0, ${(0.46 * helixSpineA).toFixed(3)})` : `rgba(0, 0, 255, ${(0.22 * helixSpineA).toFixed(3)})`;
          ctx.lineWidth = strand === 0 ? 1.5 : 0.9;
          ctx.beginPath();
          let started = false;
          for (let i = strand; i < fragments.length; i += 2) {
            const p = screenPos[i]!;
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

      // H. Act III.3–4: Variable-Pressure `#FF0000` Bezier Arterial Filaments (`0.4px .. 3.4px`, `multiply`)
      //    Rises organically from 0% silence (`63.0s`) into dense crimson arterial webs (`66.5s..76.0s`), then clears for pure-white Orbit sanctuary!
      const arteryGrow = span(t, 63.0, 66.2, easeInOutCubic);
      const arteryFade = 1 - span(t, 76.0, 77.6, easeInOutCubic);
      const arteryMaster = arteryGrow * arteryFade;
      if (arteryMaster > 0.005) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.lineCap = 'round';
        const visibleCount = Math.floor(topEdges.length * arteryGrow);
        for (let eIdx = 0; eIdx < visibleCount; eIdx++) {
          const edge = topEdges[eIdx]!;
          const pa = screenPos[edge.a]!;
          const pb = screenPos[edge.b]!;
          if (pa.o <= 0.05 || pb.o <= 0.05) continue;

          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const dist = Math.hypot(dx, dy) || 1;
          // Organic catenary/arterial curvature modulated by deterministic edge hash + subtle 120 BPM pulse
          const arch = ((hash(eIdx * 31 + 7) - 0.5) * 0.28 + pulse * 0.015) * Math.min(dist, 420);
          const mx = (pa.x + pb.x) * 0.5 - (dy / dist) * arch;
          const my = (pa.y + pb.y) * 0.5 + (dx / dist) * arch;

          const pressure = 0.4 + Math.pow(edge.strength, 1.65) * 3.0; // exact 0.4px .. 3.4px range!
          const alpha = (0.14 + 0.62 * edge.strength) * arteryMaster;
          ctx.strokeStyle = `rgba(255, 0, 0, ${alpha.toFixed(3)})`;
          ctx.lineWidth = pressure;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.quadraticCurveTo(mx, my, pb.x, pb.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // I. Act III.5–6: Central Pure-White Orbit Sanctuary & Hairline Ellipses (`76.5 – 88.0s`)
      const orbitMarkOp = span(t, 76.8, 78.0) * (1 - span(t, 88.0, 89.2));
      orbitSanctuaryEl.style.opacity = orbitMarkOp.toFixed(3);

      const ringOp = win(t, 77.2, 88.0, 0.7);
      if (ringOp > 0.005) {
        ctx.save();
        ctx.strokeStyle = `rgba(0, 0, 0, ${(0.16 * ringOp).toFixed(3)})`;
        ctx.lineWidth = 0.65;
        ctx.setLineDash([3, 6]);
        for (const frac of [0.22, 0.55, 0.92]) {
          ctx.beginPath();
          ctx.ellipse(STAGE_W * 0.5, 216, 410 + frac * 2600, 62 + frac * 112, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // J. Act IV.1: `0.14` Peripheral Beacon & 5 Full-Bridge Crimson Catenary Arcs (`88.0 – 101.5s`)
      const beaconOp = win(t, 80.0, 101.4, 0.5);
      if (beaconOp > 0.005) {
        peripheryBeaconEl.style.opacity = beaconOp.toFixed(3);
        peripheryBeaconEl.textContent =
          t >= 88.0 ? 'ε 0.14 / PERIPHERAL AWAKENING · X:4880' : 'ε 0.14 / NON-ERASURE PERIPHERY';
        peripheryBeaconEl.style.left = '4880px';
        peripheryBeaconEl.style.top = t >= 95.0 ? '118px' : '168px';
        peripheryBeaconEl.style.transform = 'translateX(-50%)';
      } else {
        peripheryBeaconEl.style.opacity = '0';
      }

      if (focusDim > 0.01) {
        const srcX = 4880;
        const srcY = 216;
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.lineCap = 'round';

        // Surgical red crosshair at (4880, 216)
        ctx.strokeStyle = `rgba(255, 0, 0, ${(0.65 * focusDim).toFixed(3)})`;
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(srcX - 28, srcY);
        ctx.lineTo(srcX + 28, srcY);
        ctx.moveTo(srcX, srcY - 28);
        ctx.lineTo(srcX, srcY + 28);
        ctx.stroke();

        // 5 sweeping crimson catenary curves spanning x = 960 .. 5840!
        for (let k = 0; k < neighborIndices.length; k++) {
          const nbIdx = neighborIndices[k]!;
          const nbPos = screenPos[nbIdx]!;
          const drawU = easeOutExpo(progress(t, 88.3 + k * 0.24, 89.8 + k * 0.24));
          if (drawU <= 0.01) continue;

          const sag = (k % 2 === 0 ? -1 : 1) * (58 + k * 14);
          const ctrlX = lerp(srcX, nbPos.x, 0.5);
          const ctrlY = clamp(lerp(srcY, nbPos.y, 0.5) + sag, 26, STAGE_H - 26);
          const curEndX = lerp(srcX, nbPos.x, drawU);
          const curEndY = lerp(srcY, nbPos.y, drawU);
          const curCtrlX = lerp(srcX, ctrlX, drawU);
          const curCtrlY = lerp(srcY, ctrlY, drawU);

          ctx.strokeStyle = `rgba(255, 0, 0, ${(0.86 * focusDim).toFixed(3)})`;
          ctx.lineWidth = 1.9 - k * 0.14;
          ctx.beginPath();
          ctx.moveTo(srcX, srcY);
          ctx.quadraticCurveTo(curCtrlX, curCtrlY, curEndX, curEndY);
          ctx.stroke();

          if (drawU > 0.92) {
            ctx.fillStyle = `rgba(255, 0, 0, ${(0.9 * focusDim).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(nbPos.x, nbPos.y, 3.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // K. Act IV.2: 3D Typographic Fault-Line Fracture (`95.0 – 101.5s`)
      //    z = -70 ("결정이 녹을 때"), z = +90 ("수억 년 전의 바람" 82px #FF0000 × #0000FF overprint!), z = -50 ("이 분다")
      if (!faultLive) {
        for (const sEl of shardEls) {
          sEl.style.opacity = '0';
          sEl.style.filter = 'none';
        }
        centerShardOverprint.style.opacity = '0';
      } else {
        const uSplit = easeOutExpo(progress(t, 95.0, 96.1));
        const exitShard = 1 - progress(t, 101.25, 101.55);

        // Draw inclined red fault-plane shear slashes on canvas
        ctx.save();
        ctx.strokeStyle = `rgba(255, 0, 0, ${(0.72 * exitShard).toFixed(3)})`;
        ctx.lineWidth = 1.1;
        for (const fx of [4560, 5210]) {
          ctx.beginPath();
          ctx.moveTo(fx + 22 * uSplit, 134);
          ctx.lineTo(fx - 22 * uSplit, 302);
          ctx.stroke();
        }
        ctx.restore();

        const shardTargets: readonly { x: number; y: number; z: number }[] = [
          { x: 4330, y: 174, z: -70 },
          { x: 4880, y: 218, z: 90 },
          { x: 5410, y: 266, z: -50 },
        ];
        const shardStarts = [4610, 4880, 5170];

        TARGET_PHRASE_PIECES.forEach((piece, idx) => {
          const el = shardEls[idx]!;
          const tgt = shardTargets[idx]!;
          const px = lerp(shardStarts[idx]!, tgt.x, uSplit);
          const py = lerp(216, tgt.y, uSplit);
          const pz = lerp(0, piece.z, uSplit);
          const perspScale = Z_CAM / (Z_CAM - pz);
          const isCenter = idx === 1;

          el.style.opacity = (exitShard * (isCenter ? 1.0 : 0.68)).toFixed(3);
          el.style.color = isCenter ? '#ff0000' : '#000000';
          el.style.filter = !isCenter && uSplit > 0.3 ? 'blur(0.75px)' : 'none';
          el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -50%) scale(${perspScale.toFixed(4)})`;

          if (isCenter) {
            // Silkscreen #0000FF × #FF0000 registration overprint offset tightening as it charges!
            const regOffset = lerp(5.5, 1.6, progress(t, 95.0, 100.8)) + pulse * 1.2;
            centerShardOverprint.style.opacity = (exitShard * 0.88).toFixed(3);
            centerShardOverprint.style.transform = `translate3d(${(px + regOffset).toFixed(1)}px, ${(py - regOffset * 0.45).toFixed(1)}px, 0) translate(-50%, -50%) scale(${perspScale.toFixed(4)})`;
          }
        });
      }
    }

    // -----------------------------------------------------------------------
    // 6. ACT IV.3 (`101.5 – 106.8s`): 6,480px HORIZONTAL PALEO-WIND GALE
    // -----------------------------------------------------------------------
    if (t < 101.5 || t >= 106.9) {
      galeBannerEl.style.opacity = '0';
      galeOverprintEl.style.opacity = '0';
    } else {
      const uGale = easeInOutCubic(progress(t, 101.5, 106.1));
      const gFade = (t >= 101.5 ? 1 : 0) * (1 - span(t, 105.9, 106.8));
      const gx = lerp(4880, 290, uGale);
      const gy = lerp(218, 56, easeInCubic(progress(t, 104.6, 106.2)));
      const gScale = lerp(1.04, 0.34, easeInCubic(progress(t, 104.5, 106.2)));

      galeBannerEl.style.opacity = gFade.toFixed(3);
      galeBannerEl.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0) translate(-50%, -50%) scale(${gScale.toFixed(4)})`;

      galeOverprintEl.style.opacity = (gFade * 0.85).toFixed(3);
      galeOverprintEl.style.transform = `translate3d(${(gx + 6).toFixed(1)}px, ${(gy - 2).toFixed(1)}px, 0) translate(-50%, -50%) scale(${gScale.toFixed(4)})`;

      // Draw sweeping `plate-14` acoustic waveform + `plate-13` dissolution plume + wind streamlines!
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      const wavePlate = getDecodedPlate('plate-14');
      const plumePlate = getDecodedPlate('plate-13');
      if (wavePlate) {
        ctx.globalAlpha = 0.62 * gFade;
        ctx.drawImage(wavePlate, gx - 220, 74, 1280, 284);
      }
      if (plumePlate) {
        ctx.globalAlpha = 0.54 * gFade;
        ctx.drawImage(plumePlate, gx + 420, 24, 720, 384);
      }

      // Calligraphic horizontal wind streamlines sweeping right -> left across all 6,480px
      for (let wIdx = 0; wIdx < 26; wIdx++) {
        const wy = 42 + wIdx * 13.8;
        const speedLag = hash(wIdx * 19 + 3) * 0.24;
        const uLine = clamp((uGale - speedLag) / (1 - speedLag), 0, 1);
        if (uLine <= 0.01) continue;
        const headX = lerp(6380, 80, uLine);
        const tailX = Math.min(6420, headX + 680 + hash(wIdx * 7) * 920);
        ctx.strokeStyle = wIdx % 4 === 0 ? '#ff0000' : wIdx % 7 === 0 ? '#0000ff' : '#000000';
        ctx.globalAlpha = (wIdx % 4 === 0 ? 0.55 : 0.22) * gFade;
        ctx.lineWidth = wIdx % 4 === 0 ? 1.4 : 0.65;
        ctx.beginPath();
        ctx.moveTo(tailX, wy);
        ctx.quadraticCurveTo((tailX + headX) * 0.5, wy + Math.sin(wIdx + uLine * 6) * 12, headX, wy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // 7. 120 BPM PERCUSSIVE HARD-CUT ACCENT LINES (t = 8.0, 30.0, 46.0, 88.0, 95.0, 101.5s)
    // -----------------------------------------------------------------------
    const cutFlash =
      Math.max(
        hardCutFlash(t, 8.0, 2),
        hardCutFlash(t, 30.0, 2),
        hardCutFlash(t, 46.0, 2),
        hardCutFlash(t, 88.0, 2),
        hardCutFlash(t, 95.0, 2),
        hardCutFlash(t, 101.5, 2),
      );
    if (cutFlash > 0.01) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 0, 0, ${(0.75 * cutFlash).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 216);
      ctx.lineTo(STAGE_W, 216);
      ctx.stroke();
      ctx.restore();
    }

    // -----------------------------------------------------------------------
    // 8. SEAMLESS PURE #FFFFFF LOOP DISSOLUTION (`t=0.0s` === `t=119.967s`, `0 LSB`)
    // -----------------------------------------------------------------------
    const washEnd = t >= 119.86 ? 1.0 : span(t, 118.0, 119.86, easeInOut);
    const washStart = t <= 0.14 ? 1.0 : 1 - span(t, 0.14, 0.36, easeOutCubic);
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
