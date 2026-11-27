/**
 * Single Unbroken 6480x432 (15:1) Deterministic Live Web-Art Motion Engine.
 * Inherits 100% of Team 2 (art-hackathon) visual grammar & Three.js 3D mechanics:
 * - Scene 1 (0–28s): Query typing -> top-left dock -> 10 blue aligned cards + 3D floor shadows ->
 *                    3,860px Near-to-Far axis + 01~04 skewed orange 3D stacks + red rule arrows +
 *                    runner wave bump + right 3D oblique history conveyor + card selection & [분해] click!
 * - Scene 2 (28–46s): Panoramic 5,640px #chrome preview -> #FF0000 sentence CUTS ->
 *                     44-tick 1px black 1024-dim vector barcodes -> pairwise #FF0000 cosine laser scan & burst!
 * - Scene 3 (46–88s): Full-span 200-fragment 6-mode 2D/3D morphing:
 *                     Reading 2D -> [3D] Horizontal 30m Helix (Three.js perspective + billboarding) ->
 *                     Meaning 2D Springs -> [3D] Volumetric Cloud + 440+ taut #FF0000 threads ->
 *                     Query Similarity Elliptical Orbit (scale=0.72+t, opacity=0.14+0.86t, 0.14 floor)!
 * - Scene 4 (88–120s): Peripheral 0.14 focus ("결정이 녹을 때 수억 년 전의 바람이 분다") + 0.16 dim +
 *                      5 red neighbor threads + 1px solid #000 focus panel -> [더 잘게 분해] arc split ->
 *                      [이 조각으로 다시 검색] -> 5,000px continental flight -> Gen 2 full-span card finale ->
 *                      pure #FFFFFF seamless 0 LSB loop wash!
 */

import * as THREE from 'three';
import {
  GEN1_ALIGNED_CARDS,
  GEN1_SKEWED_STATIONS,
  GEN2_ALIGNED_CARDS,
  GEN2_SKEWED_STATIONS,
  getCorpus,
  QUERY_GEN1,
  QUERY_GEN2,
  TARGET_FRAGMENT_TEXT,
  TARGET_PHRASE_PIECES,
  type CardSpec,
  type SkewedStationSpec,
} from '../data/corpus.ts';
import { DURATION, STAGE_CAPTIONS, STAGE_H, STAGE_W } from '../data/timeline.ts';
import { renderEditorialPlate } from '../illustrations.ts';
import { computePanoramicLayouts } from '../layouts/deconstruct-layout.ts';
import {
  beatPulse,
  clamp,
  clampRedGain,
  easeInOut,
  easeInOutCubic,
  easeOutCubic,
  easeOutExpo,
  hash,
  lerp,
  ORANGE,
  progress,
  span,
  stepArc,
  win,
} from '../math.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
let stageFilterSeq = 0;

interface PlacedCard {
  spec: CardSpec;
  el: HTMLElement;
  shadow: SVGPolygonElement;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  at: number;
  gen: 1 | 2;
  stationIdx?: number;
}

interface RuleArrow {
  gen: 1 | 2;
  line: SVGPathElement;
  head: SVGPathElement;
  at: number;
  dur: number;
}

interface AxisStationDom {
  gen: 1 | 2;
  spec: SkewedStationSpec;
  labelEl: HTMLElement;
  dotEl: HTMLElement;
  at: number;
}

export interface MotionStageOptions {
  /** Use half-resolution 2D canvas for the small top overview strip so dual-viewport runs at 60fps. */
  canvasScale?: number;
  /** Red-channel RGB gain in [0.50, 1.00] for LED red-tint rehearsal calibration (default 1.0). */
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

export function createMotionStage(host: HTMLElement, options: MotionStageOptions = {}): MotionStageHandle {
  const canvasScale = options.canvasScale ?? 1;
  const corpus = getCorpus();
  const { fragments, targetIndex, neighborIndices, topEdges, neighbors } = corpus;
  const layouts = computePanoramicLayouts(fragments, corpus.rankedPairs, targetIndex, neighborIndices);

  /* --- 0. Hidden SVG feColorMatrix Filter for LED Red-Tint Calibration (?rgain=0.50..1.00) --- */
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

  /* --- 1. Floor SVG (Shadow Layer + Red Rule Arrows) --- */
  const floorSvg = document.createElementNS(SVG_NS, 'svg');
  floorSvg.setAttribute('class', 'stage-floor-svg');
  floorSvg.setAttribute('viewBox', `0 0 ${STAGE_W} ${STAGE_H}`);
  world.append(floorSvg);

  const shadowLayer = document.createElementNS(SVG_NS, 'g');
  shadowLayer.setAttribute('fill', '#000000');
  shadowLayer.setAttribute('opacity', '0.10');
  shadowLayer.style.filter = 'blur(4px)';
  floorSvg.append(shadowLayer);

  const arrowLayer = document.createElementNS(SVG_NS, 'g');
  floorSvg.append(arrowLayer);

  /* --- 2. High-Precision 2D Canvas (CUTS, 44-tick Vector Barcodes, Pairwise Lasers, Red Threads, Flight Trail) --- */
  const canvas = makeEl('canvas', 'stage-canvas', world);
  canvas.width = Math.round(STAGE_W * canvasScale);
  canvas.height = Math.round(STAGE_H * canvasScale);
  const ctx = canvas.getContext('2d')!;

  /* --- 3. Scene 2 #chrome Panoramic Document Window --- */
  const chrome = makeEl('div', 'page-chrome', world);
  const chromeBar = makeEl('div', 'page-chrome-bar', chrome);
  makeEl('span', 'page-chrome-nav', chromeBar, '← → ↻');
  makeEl('span', 'page-chrome-url', chromeBar, 'https://archive.geology.kr/halite-fluid-inclusion-280ma');
  makeEl('span', 'page-chrome-meta', chromeBar, '자연사 아카이브 · 페름기 암염 유체 포유물 원문 (200 fragments · 1024-dim)');

  /* --- 4. Card Space Layer (Gen 1 & Gen 2 Aligned + Skewed 3D Cards) --- */
  const cardLayer = makeEl('div', 'card-layer', world);
  const placedCards: PlacedCard[] = [];
  const ruleArrows: RuleArrow[] = [];

  const addPlacedCard = (
    spec: CardSpec,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    at: number,
    stationIdx?: number,
  ): PlacedCard => {
    const el = makeEl('article', 'art-card', cardLayer);
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.zIndex = String(Math.round(100 + z));

    const tabCls = spec.group === 'aligned' ? 'art-card-tab aligned' : `art-card-tab skewed-${spec.rank ?? 1}`;
    const tabTxt = spec.group === 'aligned' ? 'aligned' : `0${spec.rank ?? 1} skewed`;
    makeEl('div', tabCls, el, tabTxt);
    makeEl('div', 'art-card-title', el, spec.title);
    makeEl('div', 'art-card-url', el, spec.url);
    makeEl('div', 'art-card-rule', el);
    makeEl('div', 'art-card-snippet', el, spec.snippet);

    const shadow = document.createElementNS(SVG_NS, 'polygon');
    shadowLayer.append(shadow);

    const rec: PlacedCard = { spec, el, shadow, x, y, z, w, h, at, gen: spec.gen, stationIdx };
    placedCards.push(rec);
    return rec;
  };

  const addSvgArrow = (gen: 1 | 2, pts: [number, number][], at: number, dur = 0.72, color = '#ff0000', width = 1.5) => {
    const line = document.createElementNS(SVG_NS, 'path');
    line.setAttribute('d', pts.map(([px, py], idx) => `${idx ? 'L' : 'M'}${px} ${py}`).join(''));
    line.setAttribute('pathLength', '1');
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', String(width));
    line.setAttribute('vector-effect', 'non-scaling-stroke');

    const [ex, ey] = pts[pts.length - 1]!;
    const [px, py] = pts[pts.length - 2]!;
    const len = Math.hypot(ex - px, ey - py) || 1;
    const ux = (ex - px) / len;
    const uy = (ey - py) / len;
    const head = document.createElementNS(SVG_NS, 'path');
    head.setAttribute(
      'd',
      `M${ex - ux * 10 - uy * 5.5} ${ey - uy * 10 + ux * 5.5}L${ex} ${ey}L${ex - ux * 10 + uy * 5.5} ${ey - uy * 10 - ux * 5.5}`,
    );
    head.setAttribute('fill', 'none');
    head.setAttribute('stroke', color);
    head.setAttribute('stroke-width', String(width));
    head.setAttribute('vector-effect', 'non-scaling-stroke');
    arrowLayer.append(line, head);
    ruleArrows.push({ gen, line, head, at, dur });
  };

  // --- GEN 1 Cards (Scene 1: 4.0s .. 17.5s) ---
  // Left diagonal 3D trunk (10 unique aligned cards cascading cleanly across x = 110 .. 1640!)
  const g1Trunk: PlacedCard[] = GEN1_ALIGNED_CARDS.map((spec, i) => {
    const row = i % 2;
    const x = 116 + i * 144 + (row === 1 ? 18 : 0);
    const y = 92 + (i % 5) * 32 + row * 12;
    const w = 236 + (i % 3) * 14;
    const h = 136;
    return addPlacedCard(spec, x, y, i * 12, w, h, 4.0 + i * 0.34);
  });

  // 4 Skewed stations across x = 1860 .. 5860 (3 staggered 3D cards per station = 12 unique cards!)
  const g1Stacks: PlacedCard[][] = GEN1_SKEWED_STATIONS.map((st, sIdx) =>
    st.cards.map((spec, cIdx) => {
      const x = st.x - 120 + cIdx * 116;
      const y = 118 + cIdx * 34;
      const w = 248 + cIdx * 10;
      const h = 132;
      return addPlacedCard(spec, x, y, 40 + sIdx * 20 + cIdx * 18, w, h, 11.2 + sIdx * 1.15 + cIdx * 0.28, sIdx);
    }),
  );
  const chosenCard = g1Stacks[3]![2]!; // Terminal 04 skewed card at x ≈ 5252

  // Red orthogonal rule arrows from blue aligned trunk to each 01~04 skewed stack (Scene 1: 15.5s .. 18.0s)
  g1Stacks.forEach((stack, sIdx) => {
    const src = g1Trunk[Math.min(g1Trunk.length - 1, 5 + sIdx)]!;
    const dst = stack[2]!;
    const railY = 344 + sIdx * 10;
    const startX = src.x + src.w;
    const targetX = dst.x + dst.w * 0.5;
    addSvgArrow(
      1,
      [
        [startX, Math.min(railY, src.y + src.h - 8)],
        [startX + 42, railY],
        [targetX, railY],
        [targetX, dst.y + dst.h + 4],
      ],
      15.5 + sIdx * 0.35,
      0.85,
    );
  });

  // --- GEN 2 Cards (Scene 4 Finale: 107.0s .. 118.2s) ---
  const g2Trunk: PlacedCard[] = GEN2_ALIGNED_CARDS.map((spec, i) => {
    const x = 116 + i * 176;
    const y = 94 + (i % 4) * 34;
    const w = 242 + (i % 2) * 16;
    const h = 136;
    return addPlacedCard(spec, x, y, i * 14, w, h, 107.0 + i * 0.25);
  });

  const g2Stacks: PlacedCard[][] = GEN2_SKEWED_STATIONS.map((st, sIdx) =>
    st.cards.map((spec, cIdx) => {
      const x = st.x - 120 + cIdx * 116;
      const y = 118 + cIdx * 34;
      const w = 248 + cIdx * 10;
      const h = 132;
      return addPlacedCard(spec, x, y, 40 + sIdx * 20 + cIdx * 18, w, h, 109.2 + sIdx * 0.85 + cIdx * 0.22, sIdx);
    }),
  );

  g2Stacks.forEach((stack, sIdx) => {
    const src = g2Trunk[Math.min(g2Trunk.length - 1, 4 + sIdx)]!;
    const dst = stack[2]!;
    const railY = 344 + sIdx * 10;
    const startX = src.x + src.w;
    const targetX = dst.x + dst.w * 0.5;
    addSvgArrow(
      2,
      [
        [startX, Math.min(railY, src.y + src.h - 8)],
        [startX + 42, railY],
        [targetX, railY],
        [targetX, dst.y + dst.h + 4],
      ],
      112.6 + sIdx * 0.25,
      0.75,
    );
  });

  /* --- 5. Horizontal Near-to-Far Axis + 4 Orange Station Labels + Runner Dot (Gen 1 & Gen 2) --- */
  const axisLayer = makeEl('div', 'axis-layer', world);
  const AXIS_X0 = 1780;
  const AXIS_X1 = 5640;
  const AXIS_Y = 82;

  const axisBar = makeEl('div', 'axis-bar', axisLayer);
  axisBar.style.left = `${AXIS_X0}px`;
  axisBar.style.top = `${AXIS_Y}px`;
  axisBar.style.width = `${AXIS_X1 - AXIS_X0}px`;

  const nearEnd = makeEl('div', 'axis-end', axisLayer, '가까이');
  nearEnd.style.left = `${AXIS_X0 - 58}px`;
  nearEnd.style.top = `${AXIS_Y - 10}px`;

  const farEnd = makeEl('div', 'axis-end', axisLayer, '멀리');
  farEnd.style.left = `${AXIS_X1 + 12}px`;
  farEnd.style.top = `${AXIS_Y - 10}px`;

  const runnerEl = makeEl('div', 'axis-runner', axisLayer);
  runnerEl.style.top = `${AXIS_Y - 5}px`;

  const axisStations: AxisStationDom[] = [];
  const registerStations = (list: SkewedStationSpec[], gen: 1 | 2, baseAt: number, step: number) => {
    list.forEach((st, idx) => {
      const labelEl = makeEl('div', 'axis-term', axisLayer);
      labelEl.style.left = `${st.x - 16}px`;
      labelEl.style.top = '34px';
      makeEl('div', 'axis-term-main', labelEl, st.label);
      makeEl('div', 'axis-term-sub', labelEl, st.sublabel);

      const dotEl = makeEl('div', 'axis-dot', axisLayer);
      dotEl.style.left = `${st.x - 6}px`;
      dotEl.style.top = `${AXIS_Y - 5.5}px`;
      dotEl.style.background = ORANGE[st.rank];
      axisStations.push({ gen, spec: st, labelEl, dotEl, at: baseAt + idx * step });
    });
  };
  registerStations(GEN1_SKEWED_STATIONS, 1, 10.6, 1.15);
  registerStations(GEN2_SKEWED_STATIONS, 2, 108.8, 0.85);

  /* --- 6. Card Selection Detail Bar (되돌아가기 · 분해 · 검색 이어가기) --- */
  const detailBar = makeEl('div', 'detail-bar', world);
  detailBar.style.left = `${chosenCard.x + chosenCard.w * 0.5}px`;
  detailBar.style.top = '352px';
  makeEl('span', '', detailBar, '되돌아가기');
  const detailDeconstructBtn = makeEl('span', '', detailBar, '분해');
  makeEl('span', '', detailBar, '검색 이어가기');

  /* --- 7. Right-Edge 3D Oblique History Conveyor Rail (exact art-hackathon history-rail.ts!) --- */
  const historyWrap = makeEl('aside', 'history-rail-wrap', world);
  const historyScene = makeEl('div', 'history-scene', historyWrap);
  const historyList = makeEl('ol', 'history-list', historyScene);
  makeEl('li', 'history-title', historyList, 'history');

  const historyItems: { el: HTMLElement; card: CardSpec; at: number }[] = [];
  const allVisitedSeq: { card: CardSpec; at: number }[] = [
    ...g1Trunk.slice(0, 6).map((c) => ({ card: c.spec, at: c.at + 0.3 })),
    ...g1Stacks.map((st) => ({ card: st[2]!.spec, at: st[2]!.at + 0.3 })),
    ...g2Trunk.slice(0, 5).map((c) => ({ card: c.spec, at: c.at + 0.25 })),
    ...g2Stacks.map((st) => ({ card: st[2]!.spec, at: st[2]!.at + 0.25 })),
  ];
  for (const item of allVisitedSeq) {
    const li = makeEl('li', 'history-page', historyList);
    const badge = makeEl(
      'span',
      'history-page-badge',
      li,
      item.card.group === 'aligned' ? 'aligned' : `0${item.card.rank ?? 1} skewed`,
    );
    if (item.card.group === 'aligned') {
      badge.style.background = '#0000ff';
      badge.style.color = '#ffffff';
    } else {
      badge.style.background = ORANGE[item.card.rank ?? 1];
      badge.style.color = '#000000';
    }
    makeEl('div', 'history-page-link', li, item.card.title);
    makeEl('p', '', li, item.card.snippet);
    historyItems.push({ el: li, card: item.card, at: item.at });
  }

  /* --- 8. Top-Left Query Line & Flying Chained Query ("김치찌개 끓이는 법 → 수억 년 전의 바람") --- */
  const queryLine = makeEl('div', 'query-line', root);
  const queryBox = makeEl('div', 'query-box', root);
  makeEl('span', 'q-label', queryBox, '검색어:');
  const queryValue = makeEl('span', '', queryBox, QUERY_GEN1);
  const queryCaret = makeEl('span', 'query-caret', queryBox);
  const querySep = makeEl('div', 'query-sep', root, '→');
  const queryNext = makeEl('div', 'query-next', root, QUERY_GEN2);

  // Measure query widths deterministically (matching Noto Serif KR 26px metrics)
  const q1Width = 304; // "검색어: 김치찌개 끓이는 법"
  const q2Width = 204; // "수억 년 전의 바람"
  const SEP_X = 80 + q1Width + 14;
  const NEXT_X = SEP_X + 36;
  querySep.style.left = `${SEP_X}px`;

  /* --- 9. Scene 3 Top-Center Deconstruct Header + Mode Bar --- */
  const deconHead = makeEl('header', 'deconstruct-head', root);
  const deconTitleRow = makeEl('div', 'deconstruct-title-row', deconHead);
  makeEl('div', 'deconstruct-title', deconTitleRow, '분해: 암염 유체 기포에 봉인된 고생대 대기');
  const deconSummary = makeEl(
    'div',
    'deconstruct-summary',
    deconTitleRow,
    `조각 ${fragments.length}개 · 글 ${fragments.filter((f) => f.type === 'text').length} · 이미지 ${fragments.filter((f) => f.type === 'img').length} · 연결 ${topEdges.length}개`,
  );
  const deconModes = makeEl('div', 'deconstruct-modes', deconHead);
  const modeReadEl = makeEl('span', 'deconstruct-mode-item', deconModes, '읽는 순서');
  const modeMeaningEl = makeEl('span', 'deconstruct-mode-item', deconModes, '상호 유사도');
  const modeQueryEl = makeEl('span', 'deconstruct-mode-item', deconModes, '검색어 유사도');
  const depthBadgeEl = makeEl('span', 'deconstruct-depth-badge', deconModes, '3D');

  /* --- 10. 200 Unique Deconstructed Fragments + 3 Split Phrase Pieces --- */
  const fragLayer = makeEl('div', 'frag-layer', world);
  const fragEls: HTMLElement[] = fragments.map((f) => {
    const el = makeEl('div', `frag${f.isHeading ? ' is-heading' : ''}${f.type === 'img' ? ' is-img' : ''}`, fragLayer);
    if (f.type === 'img' && f.plate) {
      const img = document.createElement('img');
      img.src = renderEditorialPlate(f.plate);
      img.alt = f.plate.label;
      el.append(img);
      makeEl('span', 'frag-lab', el, f.plate.label);
    } else {
      el.textContent = f.content;
      const baseFs = f.isHeading ? 21 : f.content.length <= 15 ? 19 : 15.5;
      el.style.fontSize = `${baseFs}px`;
    }
    return el;
  });

  const pieceEls: HTMLElement[] = TARGET_PHRASE_PIECES.map((p) => makeEl('div', 'piece-frag', world, p.text));

  /* --- 11. Editorial Notes & Scene 4 Focus Panel --- */
  const noteLayer = makeEl('div', 'note-layer', root);

  const formulaEl = makeEl('div', 'editorial-formula', noteLayer);
  formulaEl.innerHTML =
    `<span><i>w</i><sub><i>ij</i></sub></span><span>=</span>` +
    `<span class="frac"><span>1 + cos(<i>e</i><sub><i>i</i></sub>, <i>e</i><sub><i>j</i></sub>)</span><span>2</span></span>` +
    `<span class="pair-count"><i>n</i>(<i>n</i>−1)/2 = 19,900쌍</span>`;

  const pairCalloutEl = makeEl('div', 'pair-callout', noteLayer);
  const orbitQueryEl = makeEl('div', 'orbit-query-mark', noteLayer, QUERY_GEN1);
  const orbitLawEl = makeEl(
    'div',
    'orbit-law-box',
    noteLayer,
    '불투명도 = 0.14 + 0.86t\n크기 = 0.72 + t\nt : 정규화한 검색어 유사도',
  );
  const floorCalloutEl = makeEl('div', 'floor-callout', noteLayer, '0.14');

  // Authentic art-hackathon 1px solid #000 focus panel (Scene 4: 88.8–101.2s)
  // Positioned at x = 5350..5790 so both the peripheral fragment (x ≈ 4940..5260) and full panel fit inside a 1280px 1:1 viewport!
  const focusPanel = makeEl('section', 'focus-panel', root);
  focusPanel.style.left = '5350px';
  focusPanel.style.top = '94px';
  const focusContentEl = makeEl('p', 'focus-panel-content', focusPanel, TARGET_FRAGMENT_TEXT);
  makeEl('p', 'focus-panel-sim', focusPanel, `검색어 "${QUERY_GEN1}"와의 유사도 0.14`);
  const focusActions = makeEl('div', 'focus-panel-actions', focusPanel);
  const btnResearchEl = makeEl('div', 'focus-btn research', focusActions, '이 조각으로 다시 검색');
  const btnBreakEl = makeEl('div', 'focus-btn break', focusActions, '더 잘게 분해');
  makeEl('p', 'focus-panel-label', focusPanel, '가까운 조각 (Top 5)');
  const focusNbOl = makeEl('ol', 'focus-neighbors', focusPanel);
  for (const nb of neighbors[targetIndex] ?? []) {
    const fNb = fragments[nb.index]!;
    makeEl('li', '', focusNbOl, `${nb.weight.toFixed(2)}  ${fNb.content}`);
  }

  /* --- 12. Bottom Editorial Rule, Concise Rhythm Caption & 8-Segment Progress --- */
  const bottomRule = makeEl('div', 'bottom-rule', root);
  const bottomCaption = makeEl('div', 'bottom-caption', root);
  const bottomSegsWrap = makeEl('div', 'bottom-segs', root);
  const segEls = Array.from({ length: 8 }, () => makeEl('div', 'bottom-seg', bottomSegsWrap));

  /* --- 13. Loop Pure-White Wash --- */
  const fadeWash = makeEl('div', 'stage-fade', root);

  /* --- Three.js Perspective Camera calibrated to 1 world unit = 1px @ z=0 across 6480x432! --- */
  const CAM_FOV_DEG = 22;
  const Z_CAM = (STAGE_H * 0.5) / Math.tan(THREE.MathUtils.degToRad(CAM_FOV_DEG * 0.5)); // ≈ 1111.21
  const camera3D = new THREE.PerspectiveCamera(CAM_FOV_DEG, STAGE_W / STAGE_H, 10, 40000);
  const tmpVec = new THREE.Vector3();

  /** Project a 3D world point (centered at 0,0,0 -> screen 6480x432) through Three.js PerspectiveCamera */
  const project3D = (wx: number, wy: number, wz: number): { sx: number; sy: number; depthScale: number; zNdc: number } => {
    tmpVec.set(wx, wy, wz);
    const dist = Math.max(250, tmpVec.distanceTo(camera3D.position));
    tmpVec.project(camera3D);
    return {
      sx: (tmpVec.x + 1) * 0.5 * STAGE_W,
      sy: (1 - tmpVec.y) * 0.5 * STAGE_H,
      depthScale: clamp(Z_CAM / dist, 0.72, 1.32),
      zNdc: tmpVec.z,
    };
  };

  /* --- Pre-defined Scene 2 Pairwise Laser Measurements (41.0s .. 44.2s) --- */
  const pairLasers = [
    { a: 1, b: 29, score: '0.88', t0: 41.0, t1: 41.8 },
    { a: 45, b: 84, score: '0.79', t0: 41.8, t1: 42.6 },
    { a: 112, b: 148, score: '0.64', t0: 42.6, t1: 43.4 },
    { a: 1, b: targetIndex, score: '0.14', t0: 43.4, t1: 44.2 },
  ];

  /* --- Deterministic All-Pairs Burst Subset (650 long-range pairs for crisp 44–46s burst) --- */
  const burstPairs: [number, number, number][] = [];
  for (let k = 0; k < 650; k++) {
    const a = Math.floor(hash(k * 17 + 3) * fragments.length);
    const b = Math.floor(hash(k * 29 + 11) * fragments.length);
    if (a !== b) burstPairs.push([a, b, hash(k * 53 + 7)]);
  }

  // Reusable per-frame fragment screen coordinate buffer
  const screenPos: { x: number; y: number; s: number; o: number; zIdx: number }[] = fragments.map(() => ({
    x: 0,
    y: 0,
    s: 1,
    o: 0,
    zIdx: 10,
  }));

  /** Smooth Action Focal X for Live Studio Preview Auto-Follow Camera */
  function getFocusX(tRaw: number): number {
    const t = ((tRaw % DURATION) + DURATION) % DURATION;
    if (t < 2.2) return 1020;
    if (t < 4.0) return lerp(1020, 740, easeInOut(progress(t, 2.2, 4.0)));
    if (t < 10.0) return lerp(740, 1340, easeInOut(progress(t, 4.0, 10.0)));
    if (t < 18.5) return lerp(1340, 4800, easeInOut(progress(t, 10.0, 18.5)));
    if (t < 23.0) return lerp(1900, 5400, easeInOut(progress(t, 18.5, 23.0)));
    if (t < 28.0) return 5260;
    if (t < 33.0) return lerp(5260, 1600, easeInOut(progress(t, 28.0, 33.0)));
    if (t < 37.0) return lerp(1600, 5100, easeInOut(progress(t, 33.0, 37.0)));
    if (t < 41.0) return lerp(5100, 3240, easeInOut(progress(t, 37.0, 41.0)));
    if (t < 46.0) return 3240;
    if (t < 54.0) return lerp(2400, 4100, easeInOut(progress(t, 46.0, 54.0)));
    if (t < 64.0) return lerp(1500, 4980, easeInOut(progress(t, 54.0, 64.0)));
    if (t < 76.0) return lerp(4980, 3240, easeInOut(progress(t, 64.0, 76.0)));
    if (t < 86.0) return 3240;
    if (t < 88.8) return lerp(3240, 5210, easeInOut(progress(t, 86.0, 88.8)));
    if (t < 101.2) return 5210;
    if (t < 107.0) return lerp(5210, 960, easeInOut(progress(t, 101.2, 106.5)));
    if (t < 118.2) return lerp(960, 4900, easeInOut(progress(t, 107.0, 117.0)));
    return 3240;
  }

  /**
   * Core deterministic frame renderer: identical timestamp t ALWAYS produces identical pixels!
   */
  function renderAt(tRaw: number): void {
    const t = ((tRaw % DURATION) + DURATION) % DURATION;
    const pulse = beatPulse(t, 1);

    ctx.setTransform(canvasScale, 0, 0, canvasScale, 0, 0);
    ctx.clearRect(0, 0, STAGE_W, STAGE_H);

    // Master scene visibility windows
    const inScene1 = t < 28.5;
    const inDeconstruct = t >= 27.6 && t < 103.5;
    const inScene4Cards = t >= 106.5;

    // ---------------------------------------------------------------------
    // A. TOP-LEFT QUERY LINE & 5,000px CONTINENTAL FLIGHT (motion_concept.html)
    // ---------------------------------------------------------------------
    const queryHideForDecon = win(t, 28.2, 102.4, 0.45);
    const qBaseVis = span(t, 0.15, 0.5) * (1 - queryHideForDecon);

    const typedCount = Math.floor(progress(t, 0.25, 2.15) * (QUERY_GEN1.length + 0.999));
    queryValue.textContent = t < 2.25 ? QUERY_GEN1.slice(0, typedCount) : QUERY_GEN1;

    const dockU = span(t, 2.25, 3.75, easeInOut);
    const heroScale = 2.05;
    const heroX = 860;
    const heroY = 172;
    const curQScale = lerp(heroScale, 1, dockU);
    const curQX = lerp(heroX, 80, dockU);
    const curQY = lerp(heroY, 14, dockU);
    queryBox.style.transform = `translate(${curQX - 80}px, ${curQY - 14}px) scale(${curQScale})`;
    queryBox.style.opacity = String(qBaseVis);

    const blink = Math.floor(t * 2.0) % 2 === 0;
    queryCaret.style.opacity = t < 2.25 && (blink || t < 2.15) ? '1' : '0';

    // 5,000px Continental Flight of "수억 년 전의 바람" (101.0s .. 106.5s) -> docks right after '→'
    const flyU = span(t, 101.2, 106.2, easeInOut);
    const flyVis = t >= 101.0 ? span(t, 101.0, 101.3) : 0;
    const [flyX, flyY] = stepArc(4960, 226, NEXT_X, 14, flyU, -108);
    const flyScale = lerp(1.55, 1.0, flyU);
    queryNext.style.opacity = String(flyVis);
    queryNext.style.transform = `translate(${flyX}px, ${flyY}px) scale(${flyScale})`;
    queryNext.style.color = flyU < 0.85 ? '#ff0000' : '#000000';
    queryNext.style.background = flyU < 0.95 ? 'rgba(255,255,255,0.92)' : 'none';
    queryNext.style.padding = flyU < 0.95 ? '0 8px' : '0';

    // Draw delicate sweeping #FF0000 dashed flight arc across the 5,000px white span during 101.2..106.6s!
    if (t >= 101.2 && t < 107.4) {
      const trailAlpha = (1 - progress(t, 106.2, 107.4)) * 0.82;
      if (trailAlpha > 0.01) {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 0, 0, ${trailAlpha})`;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([7, 6]);
        ctx.beginPath();
        const steps = 64;
        const maxU = Math.min(1, flyU);
        for (let k = 0; k <= steps; k++) {
          const u = (k / steps) * maxU;
          const [ax, ay] = stepArc(4960, 226, NEXT_X + 60, 32, u, -108);
          if (k === 0) ctx.moveTo(ax, ay);
          else ctx.lineTo(ax, ay);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    const sepOn = span(t, 105.6, 106.3);
    querySep.style.opacity = String(sepOn);

    // 1px black query underline growing in lockstep with typed text, then extending on Gen 2 dock!
    const qLineGrow = span(t, 0.25, 2.15, easeOutCubic);
    const lineX = lerp(heroX, 80, dockU);
    const lineY = lerp(heroY + 34 * heroScale + 8, 52, dockU);
    const fullDockW = lerp(q1Width, NEXT_X + q2Width - 80, sepOn);
    const lineW = lerp(q1Width * heroScale, fullDockW, dockU) * qLineGrow;
    queryLine.style.left = `${lineX}px`;
    queryLine.style.top = `${lineY}px`;
    queryLine.style.width = `${lineW}px`;
    queryLine.style.opacity = String(qBaseVis);

    // ---------------------------------------------------------------------
    // B. SCENE 1 (0–28s) & SCENE 4 FINALE (107–118.2s): 3D CARDS, AXIS, ARROWS, HISTORY RAIL
    // ---------------------------------------------------------------------
    const s1Exit = 1 - span(t, 27.2, 28.4, easeInOut);
    const s1Dim = span(t, 23.0, 23.8) * (1 - span(t, 27.0, 28.2));
    const chosenFocus = span(t, 23.0, 23.9) * s1Exit;

    // Scene 1 card zoom transition into #chrome preview (26.0..28.2s)
    const s1Zoom = span(t, 26.2, 28.2, easeInOut);

    // Runner positions for Gen 1 (18.5..22.8s) and Gen 2 (113.8..117.5s)
    const run1U = span(t, 18.5, 22.8, easeInOut);
    const run1Vis = span(t, 18.2, 18.6) * (1 - span(t, 22.6, 23.1));
    const run2U = span(t, 113.8, 117.6, easeInOut);
    const run2Vis = span(t, 113.5, 113.9) * (1 - span(t, 117.4, 118.0));

    // Render all Gen 1 & Gen 2 placed cards + dynamic blurred 3D floor shadows!
    for (const c of placedCards) {
      const activeGen = (c.gen === 1 && inScene1) || (c.gen === 2 && inScene4Cards);
      if (!activeGen) {
        c.el.style.opacity = '0';
        c.shadow.setAttribute('visibility', 'hidden');
        continue;
      }

      const enter = span(t, c.at, c.at + 0.52, easeOutExpo);
      if (enter <= 0.002) {
        c.el.style.opacity = '0';
        c.shadow.setAttribute('visibility', 'hidden');
        continue;
      }

      const isChosen = c === chosenCard && c.gen === 1;
      let bump = 0;
      if (c.spec.group === 'skewed' && c.stationIdx !== undefined) {
        const stList = c.gen === 1 ? GEN1_SKEWED_STATIONS : GEN2_SKEWED_STATIONS;
        const stX = stList[c.stationIdx]!.x;
        const frac = (stX - AXIS_X0) / (AXIS_X1 - AXIS_X0);
        const rStart = c.gen === 1 ? 18.5 : 113.8;
        const rEnd = c.gen === 1 ? 22.8 : 117.6;
        const when = lerp(rStart, rEnd, frac);
        const pBump = progress(t, when - 0.16, when + 0.44);
        bump = Math.sin(pBump * Math.PI) * 26;
      }

      const lift = isChosen ? chosenFocus * 22 : 0;
      const beatMicro = c.spec.group === 'skewed' ? pulse * 1.4 : 0;
      const dy = (1 - enter) * 38 - bump - lift - beatMicro;
      // Subtle 3D perspective tilt matching CSS3DRenderer card plane feel
      const tiltY = c.spec.group === 'aligned' ? 5 : -3.5;

      const masterFade = c.gen === 1 ? s1Exit : 1;
      const op = enter * masterFade * (isChosen ? 1 : 1 - (c.gen === 1 ? s1Dim * 0.76 : 0));

      c.el.style.opacity = String(op);
      c.el.style.transform =
        `perspective(1600px) translate3d(0px, ${dy.toFixed(1)}px, 0px) rotateY(${tiltY}deg)` +
        (isChosen && s1Zoom > 0.01 ? ` scale(${(1 + s1Zoom * 0.25).toFixed(3)})` : '');
      c.el.style.outline = isChosen && chosenFocus > 0.05 ? '2.5px solid #000000' : 'none';
      c.el.style.outlineOffset = '-1px';

      // Soft projected floor shadow polygon (directly echoing card-space.ts shadowLayer!)
      if (op > 0.04) {
        c.shadow.removeAttribute('visibility');
        const liftTotal = bump + lift;
        const sx0 = c.x + 10 + liftTotal * 0.35;
        const sx1 = c.x + c.w + 18 + liftTotal * 0.45;
        const syTop = c.y + c.h + 2 + liftTotal * 0.22;
        const syBot = syTop + 18 + liftTotal * 0.18;
        c.shadow.setAttribute(
          'points',
          `${sx0},${syTop} ${sx1},${syTop} ${sx1 + 14},${syBot} ${sx0 + 10},${syBot}`,
        );
        c.shadow.setAttribute('opacity', String(clamp(op * (1 - liftTotal / 180), 0, 1)));
      } else {
        c.shadow.setAttribute('visibility', 'hidden');
      }
    }

    // Axis, station labels, orange dots & runner dot (shared cleanly between Gen 1 & Gen 2!)
    const axisGen1 = span(t, 10.0, 12.2, easeInOut) * s1Exit;
    const axisGen2 = span(t, 108.2, 110.2, easeInOut);
    const axisScaleX = inScene1 ? axisGen1 : inScene4Cards ? axisGen2 : 0;
    const axisOp = inScene1 ? s1Exit * (1 - s1Dim * 0.76) : inScene4Cards ? 1 : 0;

    axisBar.style.transform = `scaleX(${axisScaleX})`;
    axisBar.style.opacity = String(axisScaleX > 0.005 ? axisOp : 0);
    nearEnd.style.opacity = String(
      inScene1
        ? span(t, 10.0, 10.6) * axisOp
        : inScene4Cards
          ? span(t, 108.2, 108.8)
          : 0,
    );
    farEnd.style.opacity = String(
      inScene1
        ? span(t, 11.8, 12.4) * axisOp
        : inScene4Cards
          ? span(t, 109.8, 110.4)
          : 0,
    );

    for (const st of axisStations) {
      const live = (st.gen === 1 && inScene1) || (st.gen === 2 && inScene4Cards);
      if (!live) {
        st.labelEl.style.opacity = '0';
        st.dotEl.style.opacity = '0';
        continue;
      }
      const e = span(t, st.at, st.at + 0.55);
      const dimMul = st.gen === 1 ? (st.spec.rank === 4 ? 1 - s1Dim * 0.25 : 1 - s1Dim * 0.76) : 1;
      const mFade = st.gen === 1 ? s1Exit : 1;
      st.labelEl.style.opacity = String(e * dimMul * mFade);
      st.labelEl.style.transform = `translateY(${((1 - e) * 10).toFixed(1)}px)`;
      st.dotEl.style.opacity = String(span(t, st.at, st.at + 0.25) * dimMul * mFade);
      st.dotEl.style.transform = `scale(${e.toFixed(3)})`;
    }

    if (run1Vis > 0.01 && inScene1) {
      runnerEl.style.opacity = String(run1Vis * s1Exit);
      runnerEl.style.left = `${lerp(AXIS_X0, AXIS_X1, run1U) - 5.5}px`;
    } else if (run2Vis > 0.01 && inScene4Cards) {
      runnerEl.style.opacity = String(run2Vis);
      runnerEl.style.left = `${lerp(AXIS_X0, AXIS_X1, run2U) - 5.5}px`;
    } else {
      runnerEl.style.opacity = '0';
    }

    // Red orthogonal rule arrows (stroke-dasharray drawing)
    for (const arr of ruleArrows) {
      const live = (arr.gen === 1 && inScene1) || (arr.gen === 2 && inScene4Cards);
      if (!live) {
        arr.line.style.opacity = '0';
        arr.head.style.opacity = '0';
        continue;
      }
      const p = span(t, arr.at, arr.at + arr.dur, easeInOut);
      const mFade = arr.gen === 1 ? s1Exit * (1 - s1Dim * 0.76) : 1;
      arr.line.setAttribute('stroke-dasharray', `${p} 1`);
      arr.line.style.opacity = p > 0.005 ? String(mFade) : '0';
      arr.head.style.opacity = String(progress(t, arr.at + arr.dur * 0.84, arr.at + arr.dur) * mFade);
    }

    // Chosen card action bar (23.3..27.4s -> [분해] clicks at 25.5s!)
    const barOp = win(t, 23.3, 27.4, 0.35);
    detailBar.style.opacity = String(barOp);
    const deconstructClicked = t >= 25.5 && t < 28.0;
    detailDeconstructBtn.style.color = deconstructClicked ? '#0000ff' : '#000000';
    detailDeconstructBtn.style.textDecoration = deconstructClicked ? 'underline' : 'none';
    detailDeconstructBtn.style.fontWeight = deconstructClicked ? '700' : '400';

    // Right-Edge 3D Oblique History Conveyor Rail (visible in Scene 1 & Scene 4!)
    const histVis = inScene1
      ? span(t, 4.4, 5.2) * s1Exit * (1 - s1Dim * 0.65)
      : inScene4Cards
        ? span(t, 107.0, 107.8)
        : 0;
    historyWrap.style.opacity = String(histVis);
    if (histVis > 0.01) {
      let visibleCards = 0;
      for (const hi of historyItems) {
        const show = span(t, hi.at, hi.at + 0.35);
        hi.el.style.opacity = String(show);
        if (show > 0.1) visibleCards++;
      }
      // Smooth conveyor scroll so newest visited cards stay framed in the 3D oblique window!
      const scrollPx = Math.max(0, (visibleCards - 3) * 112);
      historyList.style.setProperty('--history-offset', `${scrollPx.toFixed(1)}px`);
    }

    // ---------------------------------------------------------------------
    // C. SCENE 2 (28–46s), SCENE 3 (46–88s) & SCENE 4 DECONSTRUCT (88–103s)
    // ---------------------------------------------------------------------
    if (!inDeconstruct) {
      chrome.style.opacity = '0';
      deconHead.style.opacity = '0';
      formulaEl.style.opacity = '0';
      pairCalloutEl.style.opacity = '0';
      orbitQueryEl.style.opacity = '0';
      orbitLawEl.style.opacity = '0';
      floorCalloutEl.style.opacity = '0';
      focusPanel.style.opacity = '0';
      for (const el of fragEls) el.style.opacity = '0';
      for (const el of pieceEls) el.style.opacity = '0';
    } else {
      // 1. Panoramic #chrome preview border (opens 28.0..29.2s, dissolves cleanly 37.0..38.0s!)
      const chromeOp = span(t, 28.0, 29.1, easeOutCubic) * (1 - span(t, 37.0, 38.0, easeInOut));
      chrome.style.opacity = String(chromeOp);
      chrome.style.transform = `scale(${lerp(0.94, 1, span(t, 28.0, 29.2, easeOutCubic)).toFixed(4)})`;

      // 2. Top-Center Deconstruct Header & Active Mode Indicators (45.8s .. 101.8s)
      const headOp = win(t, 45.8, 102.0, 0.55);
      deconHead.style.opacity = String(headOp);
      const isModeReading = t < 64.0;
      const isModeMeaning = t >= 64.0 && t < 76.0;
      const isModeQuery = t >= 76.0;
      const isDepthOn = (t >= 54.0 && t < 64.0) || (t >= 68.5 && t < 76.0);

      modeReadEl.classList.toggle('is-active', isModeReading);
      modeMeaningEl.classList.toggle('is-active', isModeMeaning);
      modeQueryEl.classList.toggle('is-active', isModeQuery);
      depthBadgeEl.classList.toggle('is-on', isDepthOn);
      deconSummary.textContent = isModeMeaning
        ? `조각 200개 · 글 188 · 이미지 12 · 연결 ${topEdges.length}개 · 기준 "${QUERY_GEN1}"`
        : isModeQuery
          ? `조각 200개 · 기준 검색어 "${QUERY_GEN1}" · 비소거 하한 0.14`
          : `조각 200개 · 글 188 · 이미지 12 · 1024차원 의미 분해`;

      // 3. Configure Three.js PerspectiveCamera for Scene 3-① Horizontal 3D Helix & Scene 3-② 3D Cloud
      const helixSpin = Math.max(0, t - 54.0) * 0.58;
      const cloudOrbit = Math.max(0, t - 68.5) * 0.24;

      if (t >= 53.5 && t < 65.5) {
        // Horizontal panoramic camera calibrated 1:1 to 6480x432 so 30m 3D Helix spans full width & height!
        camera3D.position.set(Math.sin(helixSpin * 0.22) * 84, 22 * Math.sin(helixSpin * 0.35), Z_CAM);
        camera3D.lookAt(0, 0, 0);
        camera3D.updateMatrixWorld();
        camera3D.updateProjectionMatrix();
      } else if (t >= 68.0 && t < 77.5) {
        // Volumetric 3D Cloud gentle orbital glide filling full 6480x432 span!
        camera3D.position.set(Math.sin(cloudOrbit) * 140, Math.sin(cloudOrbit * 1.25) * 34, Z_CAM + Math.cos(cloudOrbit) * 58);
        camera3D.lookAt(0, 0, 0);
        camera3D.updateMatrixWorld();
        camera3D.updateProjectionMatrix();
      }

      // 4. Compute deterministic position, scale, and opacity for ALL 200 fragments!
      const fragMasterIn = span(t, 28.4, 29.6, easeOutCubic);
      const assembleU = span(t, 101.0, 102.6, easeInOutCubic);

      const pairNow = pairLasers.find((p) => t >= p.t0 && t < p.t1);
      const pairDim = win(t, 40.9, 44.3, 0.22);

      // Scene 4 peripheral focus & phrase split windows
      const focusDim = span(t, 88.0, 89.0, easeInOut) * (1 - span(t, 101.0, 102.0));
      const piecesLive = t >= 95.35 && t < 101.6;
      const neighborSet = new Set(neighborIndices);

      for (let i = 0; i < fragments.length; i++) {
        const f = fragments[i]!;
        const stagger = i === targetIndex ? 0 : hash(i * 11 + 5) * 0.55;
        const curve = (hash(i * 23 + 9) - 0.5) * 90;

        // Start in Scene 2 #chrome page coordinates
        const pPage = layouts.page[i]!;
        let x = pPage.x;
        let y = pPage.y;
        let s = pPage.scale;
        let o = pPage.opacity * fragMasterIn;
        let zIdx = 10;

        // Slight float once #chrome dissolves (37.5..46.0s)
        const floatU = span(t, 37.3, 38.4, easeOutCubic) * (1 - span(t, 45.8, 46.8));
        if (floatU > 0.001) {
          y += Math.sin(t * 2.1 + i * 0.7) * 3.5 * floatU;
        }

        // Morph -> Scene 3-① Reading 2D (46.0..48.2s)
        const uRead = easeInOutCubic(progress(t, 46.0 + stagger * 0.8, 47.9 + stagger * 0.8));
        if (uRead > 0) {
          const pR = layouts.reading2D[i]!;
          [x, y] = stepArc(x, y, pR.x, pR.y, uRead, curve);
          s = lerp(s, pR.scale, uRead);
          o = lerp(o, pR.opacity, uRead);
        }

        // Morph -> Scene 3-① [3D] Monumental 30m Horizontal Helix (54.0..64.0s)
        const uHelix = easeInOutCubic(progress(t, 54.0 + stagger * 0.9, 56.2 + stagger * 0.9));
        if (uHelix > 0 && t < 66.2) {
          const hb = layouts.helixBase[i]!;
          const ang = hb.angle + helixSpin;
          const wx = hb.x - STAGE_W * 0.5;
          const wy = Math.sin(ang) * hb.radiusY;
          const wz = Math.cos(ang) * hb.radiusZ;
          const proj = project3D(wx, wy, wz);
          const depthFactor = (Math.cos(ang) + 1) * 0.5; // 1 = front, 0 = back
          const hx = clamp(proj.sx, 140, STAGE_W - 140);
          const hy = clamp(proj.sy + 14, 74, 382);
          const hs = (f.type === 'img' ? 0.62 : 0.72) * lerp(0.74, 1.16, depthFactor);
          const ho = lerp(0.32, 1.0, depthFactor);

          [x, y] = stepArc(x, y, hx, hy, uHelix, curve * 0.7);
          s = lerp(s, hs, uHelix);
          o = lerp(o, ho, uHelix);
          zIdx = Math.round(10 + depthFactor * 50);
        }

        // Morph -> Scene 3-② Meaning 2D Cosine-Similarity Clusters (64.0..68.5s)
        const uMean = easeInOutCubic(progress(t, 64.0 + stagger * 0.85, 66.0 + stagger * 0.85));
        if (uMean > 0) {
          const pM = layouts.meaning2D[i]!;
          [x, y] = stepArc(x, y, pM.x, pM.y, uMean, curve);
          s = lerp(s, pM.scale, uMean);
          o = lerp(o, pM.opacity, uMean);
          zIdx = 20;
        }

        // Morph -> Scene 3-② [3D] Volumetric Semantic Cloud (68.5..76.0s)
        const uCloud = easeInOutCubic(progress(t, 68.5 + stagger * 0.8, 70.4 + stagger * 0.8));
        if (uCloud > 0 && t < 78.2) {
          const c3 = layouts.cloud3D[i]!;
          // Gentle per-cluster 3D breathing + orbital rotation across full 30m span
          const ca = Math.cos(cloudOrbit * 0.42);
          const sa = Math.sin(cloudOrbit * 0.42);
          const rcx = c3.cx;
          const rcy = c3.cy * ca - c3.cz * sa * 0.16;
          const rcz = c3.cz * ca + c3.cy * sa * 0.28;
          const proj = project3D(rcx, rcy, rcz);
          const depth01 = clamp((rcz + 280) / 560, 0, 1);
          const cx3 = clamp(proj.sx, 140, STAGE_W - 140);
          const cy3 = clamp(proj.sy + 10, 76, 382);
          const cs3 = layouts.meaning2D[i]!.scale * lerp(0.76, 1.15, depth01);
          const co3 = lerp(0.42, 1.0, depth01);

          [x, y] = stepArc(x, y, cx3, cy3, uCloud, curve * 0.5);
          s = lerp(s, cs3, uCloud);
          o = lerp(o, co3, uCloud);
          zIdx = Math.round(10 + depth01 * 50);
        }

        // Morph -> Scene 3-③ Query Similarity Elliptical Orbit (76.0..88.0s+)
        const uOrb = easeInOutCubic(progress(t, 76.0 + stagger * 0.9, 78.4 + stagger * 0.9));
        if (uOrb > 0) {
          const pO = layouts.orbit2D[i]!;
          [x, y] = stepArc(x, y, pO.x, pO.y, uOrb, curve * 0.85);
          s = lerp(s, pO.scale, uOrb);
          o = lerp(o, pO.opacity, uOrb);
          zIdx = Math.round(10 + f.level * 30);
        }

        // Scene 4 Peripheral Focus Highlight (88.0..101.0s)
        const isTarget = i === targetIndex;
        const isNeighbor = neighborSet.has(i);
        if (focusDim > 0.001) {
          if (isTarget) {
            o = lerp(o, 1.0, focusDim);
            s = lerp(s, 1.52, focusDim);
            zIdx = 90;
          } else if (isNeighbor) {
            o = lerp(o, 1.0, focusDim);
            s = lerp(s, 1.08, focusDim);
            zIdx = 80;
          } else {
            o *= lerp(1, 0.16, focusDim);
          }
        }

        // Scene 2 Pairwise Laser Dimming (41.0..44.2s)
        if (pairDim > 0.001) {
          const inPair = pairNow && (i === pairNow.a || i === pairNow.b);
          o *= inPair ? 1 : lerp(1, 0.2, pairDim);
          if (inPair) zIdx = 85;
        }

        // Hide original target fragment seamlessly when its 3 split phrase pieces are live!
        if (isTarget && piecesLive) {
          o = 0;
        }

        // Assemble back toward center on [이 조각으로 다시 검색] click (101.0..102.6s)
        if (assembleU > 0.001) {
          x = lerp(x, 3240, assembleU);
          y = lerp(y, 216, assembleU);
          s = lerp(s, 0.3, assembleU);
          o *= 1 - assembleU;
        }

        screenPos[i]!.x = x;
        screenPos[i]!.y = y;
        screenPos[i]!.s = s;
        screenPos[i]!.o = o;
        screenPos[i]!.zIdx = zIdx;

        const el = fragEls[i]!;
        el.style.opacity = o <= 0.003 ? '0' : o.toFixed(3);
        el.style.zIndex = String(zIdx);
        if (o > 0.003) {
          el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${s.toFixed(3)})`;
          if (isTarget && focusDim > 0.01) {
            const redAmt = Math.round(255 * focusDim);
            el.style.color = `rgb(${redAmt}, 0, 0)`;
            el.style.fontWeight = '700';
          } else {
            el.style.color = '#000000';
            el.style.fontWeight = f.isHeading ? '700' : '400';
          }
        }
      }

      // 5. Scene 2: Surgical #FF0000 Vertical Sentence CUTS (33.0..37.2s)
      const cutMaster = span(t, 33.0, 33.4) * (1 - span(t, 36.8, 37.3));
      if (cutMaster > 0.005) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1.4;
        for (const c of layouts.cuts) {
          const xNorm = (c.x - 450) / 5600;
          const u = easeOutCubic(progress(t, 33.0 + xNorm * 2.4, 33.45 + xNorm * 2.4));
          if (u <= 0.01) continue;
          ctx.globalAlpha = cutMaster;
          const px = Math.round(c.x) + 0.5;
          ctx.beginPath();
          ctx.moveTo(px, c.y - 11 * u);
          ctx.lineTo(px, c.y + 11 * u);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // 6. Scene 2: Compact Crisp 1px Black 1024-dim Vector Barcodes under Fragments (37.6..41.2s)
      const vecAlpha = span(t, 37.6, 38.2) * (1 - span(t, 40.6, 41.2));
      if (vecAlpha > 0.005) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        for (let i = 0; i < fragments.length; i++) {
          const p = screenPos[i]!;
          if (p.o <= 0.05) continue;
          const under = fragments[i]!.type === 'img' ? 36 : 9;
          const tickCount = 26;
          const halfSpan = tickCount * 1.5;
          for (let k = 0; k < tickCount; k++) {
            const reveal = progress(t, 37.6 + hash(i * 7 + k) * 0.85, 38.1 + hash(i * 7 + k) * 0.85);
            if (reveal <= 0.01) continue;
            const h = (1.2 + hash(i * 101 + k * 13) * 5.2) * reveal;
            ctx.globalAlpha = vecAlpha * 0.88;
            const px = Math.round(p.x - halfSpan + k * 3) + 0.5;
            ctx.beginPath();
            ctx.moveTo(px, p.y + under);
            ctx.lineTo(px, p.y + under + h);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }

      // 7. Scene 2: Pairwise #FF0000 Cosine Similarity Laser Beams (41.0..44.2s) & All-Pairs Burst (44.0..46.4s)
      formulaEl.style.opacity = String(win(t, 40.8, 46.2, 0.35));

      if (pairNow) {
        const pa = screenPos[pairNow.a]!;
        const pb = screenPos[pairNow.b]!;
        const u = easeOutExpo(progress(t, pairNow.t0, pairNow.t0 + 0.38));
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(lerp(pa.x, pb.x, u), lerp(pa.y, pb.y, u));
        ctx.stroke();

        // Crisp dot markers at endpoints
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(pa.x, pa.y, 4, 0, Math.PI * 2);
        ctx.arc(lerp(pa.x, pb.x, u), lerp(pa.y, pb.y, u), 4, 0, Math.PI * 2);
        ctx.fill();

        pairCalloutEl.textContent = `cos = ${pairNow.score}`;
        pairCalloutEl.style.left = `${lerp(pa.x, pb.x, 0.5)}px`;
        pairCalloutEl.style.top = `${lerp(pa.y, pb.y, 0.5)}px`;
        pairCalloutEl.style.opacity = String(
          progress(t, pairNow.t0 + 0.2, pairNow.t0 + 0.35) * (1 - progress(t, pairNow.t1 - 0.12, pairNow.t1)),
        );
      } else {
        pairCalloutEl.style.opacity = '0';
      }

      const burstA = span(t, 44.0, 44.5) * (1 - span(t, 45.6, 46.5));
      if (burstA > 0.005) {
        ctx.lineWidth = 1;
        for (const [ia, ib, h] of burstPairs) {
          const lineU = progress(t, 44.0 + h * 0.45, 44.3 + h * 0.45);
          if (lineU <= 0.01) continue;
          const pa = screenPos[ia]!;
          const pb = screenPos[ib]!;
          ctx.strokeStyle = `rgba(255, 0, 0, ${(0.22 * burstA * lineU).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }
      }

      // 8. Scene 3-① Helix Spine Thread (54.5..64.0s)
      const helixSpineA = win(t, 54.5, 64.2, 0.8);
      if (helixSpineA > 0.005) {
        ctx.strokeStyle = `rgba(255, 0, 0, ${(0.34 * helixSpineA).toFixed(3)})`;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        for (let i = 0; i < fragments.length; i++) {
          const p = screenPos[i]!;
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // 9. Scene 3-② & 3-③ Taut #FF0000 Cosine-Similarity Thread Network (64.6..88.2s)
      const meaningThreadA =
        span(t, 64.8, 66.2) * (1 - 0.82 * span(t, 76.2, 78.2)) * (1 - span(t, 88.0, 88.9));
      if (meaningThreadA > 0.005) {
        for (const edge of topEdges) {
          const pa = screenPos[edge.a]!;
          const pb = screenPos[edge.b]!;
          const alpha = (0.18 + 0.52 * edge.strength) * meaningThreadA;
          ctx.strokeStyle = `rgba(255, 0, 0, ${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.95 + 0.55 * edge.strength;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }
      }

      // 10. Scene 3-③ Orbit Center Query Mark, Elliptical Guide Ring, Law Box & 0.14 Callout (76.2..101.2s)
      const orbitMarkOp = span(t, 76.6, 77.8) * (1 - span(t, 101.0, 101.8)) * (1 - focusDim * 0.72);
      orbitQueryEl.style.opacity = String(orbitMarkOp);
      orbitLawEl.style.opacity = String(win(t, 79.0, 88.2, 0.5));

      // Subtle hairline elliptical orbit guide rings in Orbit phase (77.0..88.5s)
      const ringOp = win(t, 77.0, 89.2, 0.8) * (1 - focusDim * 0.7);
      if (ringOp > 0.005) {
        ctx.save();
        ctx.strokeStyle = `rgba(0, 0, 0, ${(0.12 * ringOp).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        for (const frac of [0.33, 0.66, 1.0]) {
          ctx.beginPath();
          ctx.ellipse(STAGE_W * 0.5, 224, 290 + frac * 2670, 54 + frac * 94, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 0.14 Non-Erasure Floor Callout pointing cleanly to peripheral fragment
      const floorOp = win(t, 81.5, 88.2, 0.45);
      floorCalloutEl.style.opacity = String(floorOp);
      const tPos = screenPos[targetIndex]!;
      floorCalloutEl.style.left = `${tPos.x + 178}px`;
      floorCalloutEl.style.top = `${tPos.y - 16}px`;

      // 11. Scene 4: 5 Bold #FF0000 Neighbor Threads from Peripheral Focus Fragment (88.2..101.2s)
      if (focusDim > 0.01) {
        const srcX = 4960;
        const srcY = 226;
        for (let k = 0; k < neighborIndices.length; k++) {
          const nbIdx = neighborIndices[k]!;
          const nbPos = screenPos[nbIdx]!;
          const drawU = easeOutExpo(progress(t, 88.2 + k * 0.16, 89.0 + k * 0.16));
          if (drawU <= 0.01) continue;
          ctx.strokeStyle = `rgba(255, 0, 0, ${(0.92 * focusDim).toFixed(3)})`;
          ctx.lineWidth = 1.85;
          ctx.beginPath();
          ctx.moveTo(srcX, srcY);
          ctx.lineTo(lerp(srcX, nbPos.x, drawU), lerp(srcY, nbPos.y, drawU));
          ctx.stroke();
        }
      }

      // 12. Scene 4: 1px solid #000 Focus Panel + Button Press Feedback (88.8..101.2s)
      const panelOp = win(t, 88.8, 101.3, 0.35);
      focusPanel.style.opacity = String(panelOp);
      focusPanel.style.transform = `translateY(${((1 - span(t, 88.8, 89.3)) * 14).toFixed(1)}px)`;
      const breakPressed = t >= 95.0 && t < 96.4;
      const researchPressed = t >= 99.8 && t < 101.4;
      btnBreakEl.classList.toggle('is-pressed', breakPressed);
      btnBreakEl.style.background = breakPressed ? '#000000' : '#ffffff';
      btnBreakEl.style.color = breakPressed ? '#ffffff' : '#000000';
      btnResearchEl.classList.toggle('is-pressed', researchPressed);
      focusContentEl.textContent = t >= 95.8 ? QUERY_GEN2 : TARGET_FRAGMENT_TEXT;

      // 13. Scene 4: [더 잘게 분해] 3-Piece Parabolic Arc Split (95.35..101.4s)
      const pieceTargetsX = [4675, 4955, 5235];
      const pieceStartsX = [4780, 4960, 5130];
      TARGET_PHRASE_PIECES.forEach((_p, idx) => {
        const el = pieceEls[idx]!;
        if (!piecesLive) {
          el.style.opacity = '0';
          return;
        }
        const uSplit = easeOutCubic(progress(t, 95.35 + idx * 0.08, 96.15 + idx * 0.08));
        const px = lerp(pieceStartsX[idx]!, pieceTargetsX[idx]!, uSplit);
        const py = 226 - Math.sin(Math.PI * uSplit) * 26;
        const isCenterWind = idx === 1;
        const pScale = isCenterWind ? lerp(1.22, 1.66, uSplit) : lerp(1.15, 0.96, uSplit);
        const exitFade = isCenterWind
          ? 1 - progress(t, 101.0, 101.25) // hands off cleanly to flying queryNext!
          : 1 - progress(t, 100.8, 101.4);

        el.style.opacity = String(clamp(exitFade * (isCenterWind ? 1 : 0.72), 0, 1));
        el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -50%) scale(${pScale.toFixed(3)})`;
        el.style.color = isCenterWind ? '#ff0000' : '#000000';
      });
    }

    // ---------------------------------------------------------------------
    // D. BOTTOM EDITORIAL RHYTHM RULE, CAPTION & 8-SEGMENT INDICATOR
    // ---------------------------------------------------------------------
    bottomRule.style.transform = `scaleX(${span(t, 0.3, 1.8, easeInOut)})`;
    const activeCap = STAGE_CAPTIONS.find((c) => t >= c.a && t < c.b);
    if (activeCap) {
      bottomCaption.textContent = activeCap.text;
      bottomCaption.style.opacity = String(win(t, activeCap.a, activeCap.b, 0.25));
      segEls.forEach((sEl, idx) => sEl.classList.toggle('is-on', idx === activeCap.seg));
    } else {
      bottomCaption.style.opacity = '0';
      segEls.forEach((sEl) => sEl.classList.remove('is-on'));
    }

    // ---------------------------------------------------------------------
    // E. SEAMLESS PURE #FFFFFF LOOP WASH (t=118.2..120.0s === t=0.0s)
    // ---------------------------------------------------------------------
    const washEnd = span(t, 118.2, 119.92, easeInOut);
    const washStart = 1 - span(t, 0.0, 0.22, easeInOut);
    fadeWash.style.opacity = String(Math.max(washEnd, washStart));
  }

  // Initial draw at t = 0
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
