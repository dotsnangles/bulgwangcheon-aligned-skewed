#!/usr/bin/env node
/**
 * Quantitative Museum-Grade Artwork Integrity Verifier — Round 4 Final Convergence
 * (`scripts/verify-artwork.mjs`)
 *
 * Evaluates 7 strict gates in Headless Chromium (`6480 × 432`, `/?raw=1`):
 *   - G1 (Deterministic Purity): Forward vs scrambled `renderAt(t)` pixel diff === `0 LSB` + all `<img>` decoded.
 *   - G2 (7-View 2D & 3D Zero Collision + Zero Half-Clip):
 *       `press@4.9s`, `page@31.8s`, `spectrum2D@40.2s (+16px barcode)`, `reading2D@48.2s`,
 *       `meaning2D@64.5s`, `orbit2D@78.2s`, AND **`sphere3D@84.5s` (`opacity >= 0.20` all `.frag` + `.orbit-center-sanctuary`)** === `0` overlaps
 *       + `press@5.5s` zero `clip-path` slicing & `>= 12px` formula clearance!
 *   - G3 (Pure-White Ground & `rgain=0.90` White-Point): Mean pure-white (`>= 245`) `>= 78%` AND `/?raw=1&rgain=0.90` preserves exact `RGB(255, 255, 255)` paper ground (`0 LSB` cyan cast!).
 *   - G4 (Zero UI/HUD + Skewed 24-Plate Uniqueness): Zero app controls/HUD/PL.04 + `0` reuse of Gen 1 Aligned plates (`plate-01/15`) in Gen 1 Skewed + `0` intra-station or cross-station plate duplicates across all 24 Skewed cards (`plate-12` <= 1)!
 *   - G5 (30m Full-Span Active & `0.70s` Loop): `[0.45, 21.2, 28.5, 31.8, 41.3, 55, 64.5, 69.0, 84.5, 98.5, 107.6]` 3-zone active & `|corr| < 0.85` + `t=119.60s` pure white `100.00%` + loop (`0.0s` vs `119.967s`) `0 LSB`.
 *   - G6 (Zero-Freeze Full + Left/Right Partial-Freeze Guard):
 *       13 full-canvas intervals `changedPixels >= 5,000 px` AND at `[16, 21, 103, 109]` Left Zone (`X < 1650`) `>= 2,000 px` & Right Zone (`X > 5900`) `>= 1,500 px`!
 *   - G7 (Physical Bezel Safe Envelope): 13 timestamps all visible stage elements stay strictly within `rect.top >= 20` and `rect.bottom <= 410`!
 */

import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import {
  ensureBinaryInstalled,
  ensureChromiumInstalled,
  ensureDistBuilt,
  parseCliArgs,
  STAGE_H,
  STAGE_W,
  startDistServer,
} from './lib/render-common.mjs';

const FRAME_PIXELS = STAGE_W * STAGE_H;
const FRAME_BYTES = FRAME_PIXELS * 3;

function decodePngToRgb24(pngBuffer) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'ffmpeg',
      ['-v', 'error', '-f', 'image2pipe', '-vcodec', 'png', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const chunks = [];
    let total = 0;
    let stderr = '';
    proc.stdout.on('data', (c) => {
      chunks.push(c);
      total += c.length;
    });
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg PNG decode failed (${code}): ${stderr.trim()}`));
        return;
      }
      const out = Buffer.concat(chunks, total);
      if (out.length !== FRAME_BYTES) {
        reject(new Error(`Unexpected RGB24 byte length: ${out.length} !== ${FRAME_BYTES}`));
      }
      resolve(out);
    });
    proc.stdin.end(pngBuffer);
  });
}

function maxAbsDiffBuffers(bufA, bufB) {
  let maxDiff = 0;
  for (let i = 0; i < bufA.length; i++) {
    const d = Math.abs(bufA[i] - bufB[i]);
    if (d > maxDiff) maxDiff = d;
  }
  return maxDiff;
}

function countChangedPixels(bufA, bufB, threshold = 6, minX = 0, maxX = STAGE_W) {
  let changed = 0;
  for (let y = 0; y < STAGE_H; y++) {
    const rowOff = y * STAGE_W;
    for (let x = minX; x < maxX; x++) {
      const i = (rowOff + x) * 3;
      const dR = Math.abs(bufA[i] - bufB[i]);
      const dG = Math.abs(bufA[i + 1] - bufB[i + 1]);
      const dB = Math.abs(bufA[i + 2] - bufB[i + 2]);
      if (dR >= threshold || dG >= threshold || dB >= threshold) {
        changed++;
      }
    }
  }
  return changed;
}

function computeWhiteRatioPct(rgb, minVal = 245) {
  let whiteCount = 0;
  for (let i = 0; i < FRAME_BYTES; i += 3) {
    if (rgb[i] >= minVal && rgb[i + 1] >= minVal && rgb[i + 2] >= minVal) {
      whiteCount++;
    }
  }
  return (whiteCount / FRAME_PIXELS) * 100;
}

function analyzeThreeZones(rgb) {
  const zoneW = STAGE_W / 3;
  const zoneLen = zoneW * STAGE_H;
  const z0 = new Float64Array(zoneLen);
  const z1 = new Float64Array(zoneLen);
  const z2 = new Float64Array(zoneLen);
  let ink0 = 0;
  let ink1 = 0;
  let ink2 = 0;

  for (let y = 0; y < STAGE_H; y++) {
    const rowOff = y * STAGE_W;
    const zRow = y * zoneW;
    for (let x = 0; x < zoneW; x++) {
      const i0 = (rowOff + x) * 3;
      const i1 = (rowOff + zoneW + x) * 3;
      const i2 = (rowOff + zoneW * 2 + x) * 3;

      const g0 = 0.299 * rgb[i0] + 0.587 * rgb[i0 + 1] + 0.114 * rgb[i0 + 2];
      const g1 = 0.299 * rgb[i1] + 0.587 * rgb[i1 + 1] + 0.114 * rgb[i1 + 2];
      const g2 = 0.299 * rgb[i2] + 0.587 * rgb[i2 + 1] + 0.114 * rgb[i2 + 2];

      z0[zRow + x] = g0;
      z1[zRow + x] = g1;
      z2[zRow + x] = g2;

      if (g0 < 240) ink0++;
      if (g1 < 240) ink1++;
      if (g2 < 240) ink2++;
    }
  }

  const pearson = (a, b) => {
    let sumA = 0;
    let sumB = 0;
    for (let i = 0; i < a.length; i++) {
      sumA += a[i];
      sumB += b[i];
    }
    const meanA = sumA / a.length;
    const meanB = sumB / b.length;
    let num = 0;
    let denA = 0;
    let denB = 0;
    for (let i = 0; i < a.length; i++) {
      const da = a[i] - meanA;
      const db = b[i] - meanB;
      num += da * db;
      denA += da * da;
      denB += db * db;
    }
    const den = Math.sqrt(denA * denB);
    return den < 1e-9 ? 0 : num / den;
  };

  return {
    ink: [ink0, ink1, ink2],
    corr01: pearson(z0, z1),
    corr12: pearson(z1, z2),
  };
}

async function captureRgbAt(page, t) {
  await page.evaluate((sec) => window.renderAt(sec), t);
  const png = await page.screenshot({ type: 'png', timeout: 0 });
  return decodePngToRgb24(png);
}

async function main() {
  const { flags } = parseCliArgs(process.argv.slice(2));
  const skipBuild = flags['skip-build'] === true || flags['skip-build'] === '1';

  ensureBinaryInstalled('ffmpeg', 'brew install ffmpeg');
  ensureChromiumInstalled(chromium);
  ensureDistBuilt({ skipBuild });

  const server = await startDistServer();
  let browser = null;

  const gates = [];

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    });
    const context = await browser.newContext({
      viewport: { width: STAGE_W, height: STAGE_H },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const url = `${server.origin}/?raw=1`;
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => window.motionReady);

    console.log('\n========================================================================================');
    console.log(' 〈정렬과 사선 (Aligned / Skewed)〉 — 프로페셔널 아트 그레이드 7대 정량 무결성 검증 (R4)');
    console.log('========================================================================================');

    // -------------------------------------------------------------------------
    // G1: Deterministic Purity (`max_abs_diff === 0 LSB` + all `<img>` decoded)
    // -------------------------------------------------------------------------
    const g1Times = [4.9, 18.0, 28.5, 35.0, 64.5, 78.2, 84.5, 92.2, 107.6, 116.0];
    const forwardBufs = new Map();
    for (const t of g1Times) {
      forwardBufs.set(t, await captureRgbAt(page, t));
    }

    const scrambledTimes = [92.2, 18.0, 116.0, 4.9, 84.5, 28.5, 107.6, 35.0, 78.2, 64.5];
    let g1MaxDiff = 0;
    const g1DiffNotes = [];
    for (const t of scrambledTimes) {
      const scrBuf = await captureRgbAt(page, t);
      const diff = maxAbsDiffBuffers(forwardBufs.get(t), scrBuf);
      if (diff > 0) g1DiffNotes.push(`t=${t}s:${diff}LSB`);
      if (diff > g1MaxDiff) g1MaxDiff = diff;
    }
    if (g1DiffNotes.length > 0) {
      console.error('  [G1 시점별 오차]:', g1DiffNotes.join(', '));
    }

    const imgCheck = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const broken = imgs.filter((im) => !im.complete || im.naturalWidth <= 0).map((im) => im.src);
      return { total: imgs.length, brokenCount: broken.length, broken };
    });

    const g1Pass = g1MaxDiff === 0 && imgCheck.total > 0 && imgCheck.brokenCount === 0;
    gates.push({
      id: 'G1 (결정론적 순수성)',
      passed: g1Pass,
      detail: `max_abs_diff = ${g1MaxDiff} LSB · decoded <img> = ${imgCheck.total - imgCheck.brokenCount}/${imgCheck.total}`,
    });

    // -------------------------------------------------------------------------
    // G2: 7-Timestamp 2D & 3D Zero Collision (`press@4.9s`, `page@31.8s`, `spectrum2D@40.2s`, `reading2D@48.2s`, `meaning2D@64.5s`, `orbit2D@78.2s`, `sphere3D@84.5s`)
    //     + `press@5.5s` Zero Half-Clip & `>= 12px` Formula Gap!
    // -------------------------------------------------------------------------
    const g2Specs = [
      {
        name: 'press',
        t: 4.9,
        selector: '.press-hero-query, .press-memory-line, .press-formula-stamp',
        minOp: 0.25,
        barcodePad: 0,
      },
      {
        name: 'page',
        t: 31.8,
        selector: '.frag, .spread-hero-slot',
        minOp: 0.25,
        barcodePad: 0,
      },
      {
        name: 'spectrum2D',
        t: 40.2,
        selector: '.frag',
        minOp: 0.25,
        barcodePad: 16,
      },
      {
        name: 'reading2D',
        t: 48.2,
        selector: '.frag',
        minOp: 0.25,
        barcodePad: 0,
      },
      {
        name: 'meaning2D',
        t: 64.5,
        selector: '.frag',
        minOp: 0.25,
        barcodePad: 0,
      },
      {
        name: 'orbit2D',
        t: 78.2,
        selector: '.frag, .orbit-center-sanctuary',
        minOp: 0.25,
        barcodePad: 0,
      },
      {
        name: 'sphere3D',
        t: 84.5,
        selector: '.frag, .orbit-center-sanctuary',
        minOp: 0.20,
        barcodePad: 0,
      },
    ];

    let g2TotalCollisions = 0;
    const g2Details = [];

    for (const sp of g2Specs) {
      await page.evaluate((sec) => window.renderAt(sec), sp.t);
      const res = await page.evaluate(
        ({ selector, minOp, barcodePad }) => {
          const nodes = Array.from(document.querySelectorAll(selector));
          const boxes = [];
          for (const el of nodes) {
            let effOp = 1.0;
            let cur = el;
            while (cur && cur instanceof HTMLElement) {
              const cs = window.getComputedStyle(cur);
              effOp *= parseFloat(cs.opacity || '1');
              if (cs.display === 'none' || cs.visibility === 'hidden') {
                effOp = 0;
                break;
              }
              cur = cur.parentElement;
            }
            if (effOp < minOp) continue;
            const r = el.getBoundingClientRect();
            if (r.width <= 0.5 || r.height <= 0.5) continue;
            if (r.right < 0 || r.left > 6480) continue;
            const extraBottom = barcodePad > 0 && el.classList.contains('frag') ? barcodePad : 0;
            boxes.push({
              text: (el.textContent || el.className || '').trim().slice(0, 22),
              left: r.left,
              top: r.top,
              right: r.right,
              bottom: r.bottom + extraBottom,
            });
          }

          const collisions = [];
          for (let i = 0; i < boxes.length; i++) {
            const a = boxes[i];
            for (let j = i + 1; j < boxes.length; j++) {
              const b = boxes[j];
              const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (ox > 0.5 && oy > 0.5) {
                collisions.push(`"${a.text}" <-> "${b.text}" (${ox.toFixed(1)}x${oy.toFixed(1)}px)`);
              }
            }
          }
          return { visibleCount: boxes.length, collisionCount: collisions.length, samples: collisions.slice(0, 5) };
        },
        { selector: sp.selector, minOp: sp.minOp, barcodePad: sp.barcodePad },
      );

      g2TotalCollisions += res.collisionCount;
      g2Details.push(`${sp.name}@${sp.t}s:${res.collisionCount}`);
      if (res.collisionCount > 0) {
        console.error(`  [G2 충돌 상세 - ${sp.name}@${sp.t}s]:`, res.samples);
      }
    }

    // Verify Patch 1.1 at `t = 5.5s`: zero `clip-path` slicing & `>= 12px` clearance around `.press-formula-stamp`!
    await page.evaluate(() => window.renderAt(5.5));
    const press55Check = await page.evaluate(() => {
      const upCp = window.getComputedStyle(document.querySelector('.press-clip-upper')).clipPath;
      const loCp = window.getComputedStyle(document.querySelector('.press-clip-lower')).clipPath;
      const fRect = document.querySelector('.press-formula-stamp').getBoundingClientRect();
      let minFormulaGap = Infinity;
      for (const el of document.querySelectorAll('.press-memory-line')) {
        const cs = window.getComputedStyle(el);
        if (parseFloat(cs.opacity || '0') < 0.1) continue;
        // Check horizontal overlap with formula box (`X = fRect.left .. fRect.right`)
        const r = el.getBoundingClientRect();
        if (r.right < fRect.left || r.left > fRect.right) continue;
        const gap = r.bottom <= fRect.top ? fRect.top - r.bottom : r.top - fRect.bottom;
        if (gap < minFormulaGap) minFormulaGap = gap;
      }
      return {
        clipUsed: upCp !== 'none' || loCp !== 'none',
        minFormulaGap,
      };
    });

    const g2Press55Ok = !press55Check.clipUsed && press55Check.minFormulaGap >= 12.0;
    if (!g2Press55Ok) {
      console.error('  [G2 press@5.5s 결함]:', press55Check);
    }

    gates.push({
      id: 'G2 (7-시점 2D/3D 무충돌)',
      passed: g2TotalCollisions === 0 && g2Press55Ok,
      detail: `${g2Details.join(' · ')} · press@5.5s 여백=${press55Check.minFormulaGap.toFixed(1)}px`,
    });

    // -------------------------------------------------------------------------
    // G3: Pure-White Ground (`>= 78%`) + `rgain=0.90` Exact `RGB(255,255,255)` White-Point Preservation!
    // -------------------------------------------------------------------------
    const g3Times = [4, 14, 21.2, 31.8, 41.3, 48.2, 55, 64.5, 71, 78.2, 92.2, 107.6];
    const whitePcts = [];
    const cachedRgb = new Map(forwardBufs);
    const getOrCapture = async (t) => {
      if (!cachedRgb.has(t)) {
        cachedRgb.set(t, await captureRgbAt(page, t));
      }
      return cachedRgb.get(t);
    };

    for (const t of g3Times) {
      const rgb = await getOrCapture(t);
      whitePcts.push(computeWhiteRatioPct(rgb));
    }
    const meanWhitePct = whitePcts.reduce((a, b) => a + b, 0) / whitePcts.length;
    const minWhitePct = Math.min(...whitePcts);

    const rgainPage = await context.newPage();
    await rgainPage.goto(`${server.origin}/?raw=1&rgain=0.90`, { waitUntil: 'load', timeout: 60000 });
    await rgainPage.evaluate(() => window.motionReady);
    const rgainMeanBuf = await captureRgbAt(rgainPage, 64.5);
    const rgainPure255Pct = computeWhiteRatioPct(rgainMeanBuf, 255);
    const canyonOff = (216 * STAGE_W + 1004) * 3;
    const canyonRgb = [rgainMeanBuf[canyonOff], rgainMeanBuf[canyonOff + 1], rgainMeanBuf[canyonOff + 2]];
    await rgainPage.close();

    const rgainWhiteOk =
      canyonRgb[0] === 255 && canyonRgb[1] === 255 && canyonRgb[2] === 255 && rgainPure255Pct >= 75.0;

    gates.push({
      id: 'G3 (순백 지면·화이트포인트)',
      passed: meanWhitePct >= 78.0 && rgainWhiteOk,
      detail: `평균 순백 = ${meanWhitePct.toFixed(2)}% (최소 ${minWhitePct.toFixed(2)}%) · rgain=0.90 지면 RGB(${canyonRgb.join(',')}) 순백=${rgainPure255Pct.toFixed(1)}%`,
    });

    // -------------------------------------------------------------------------
    // G4: Zero App UI / HUD + Patch 4.3 `Skewed` 24-Plate `1:1` Uniqueness Check!
    // -------------------------------------------------------------------------
    const forbiddenStrings = [
      '←',
      '↻',
      '0.14 + 0.86',
      '6480×432',
      '6480x432',
      'ACT I',
      'BEAT ',
      'ORIGIN NUCLEUS',
      'RE-ASK',
      '1024-DIM · SCAN',
      'PL.04',
      '0.0 s',
      '30.0 s',
    ];
    let g4Violations = 0;
    const g4SampleTimes = [4.9, 9.5, 18.0, 28.5, 33.0, 41.3, 48.2, 64.5, 78.2, 84.5, 92.2, 98.5, 107.6, 116.0];
    const g4Notes = [];

    for (const t of g4SampleTimes) {
      await page.evaluate((sec) => window.renderAt(sec), t);
      const uiRes = await page.evaluate((forbidden) => {
        const stage = document.querySelector('.motion-stage') || document.body;
        const controls = stage.querySelectorAll('button, input, select, textarea').length;
        const txt = stage.textContent || '';
        const hits = forbidden.filter((f) => txt.includes(f));
        return { controls, hits };
      }, forbiddenStrings);
      const v = uiRes.controls + uiRes.hits.length;
      if (v > 0) {
        g4Violations += v;
        g4Notes.push(`t=${t}s: ctrl=${uiRes.controls}, hits=[${uiRes.hits.join(',')}]`);
      }
    }

    // Patch 4.3: Verify Gen 1 Skewed reuses `0` Gen 1 Aligned plates AND 0 intra/inter-station duplicates across Gen 1 & Gen 2 Skewed!
    const plateAudit = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.monolith-card'));
      const g1Aligned = new Set();
      const g1SkewedAll = [];
      const g2SkewedAll = [];
      const stationMap = new Map();

      for (const c of cards) {
        const gen = c.dataset.gen;
        const group = c.dataset.group;
        const st = c.dataset.station || '0';
        const plate = c.dataset.plate || '';
        if (gen === '1' && group === 'aligned') g1Aligned.add(plate);
        if (group === 'skewed') {
          if (gen === '1') g1SkewedAll.push(plate);
          if (gen === '2') g2SkewedAll.push(plate);
          const key = `G${gen}-S${st}`;
          if (!stationMap.has(key)) stationMap.set(key, []);
          stationMap.get(key).push(plate);
        }
      }

      const g1AlignedReuse = g1SkewedAll.filter((p) => g1Aligned.has(p));
      let intraStationDups = 0;
      for (const [, list] of stationMap.entries()) {
        intraStationDups += list.length - new Set(list).size;
      }
      const g1UniqueCount = new Set(g1SkewedAll).size;
      const g2UniqueCount = new Set(g2SkewedAll).size;
      const g2Plate12Count = g2SkewedAll.filter((p) => p === 'plate-12').length;

      return {
        g1AlignedReuseCount: g1AlignedReuse.length,
        intraStationDups,
        g1Total: g1SkewedAll.length,
        g1UniqueCount,
        g2Total: g2SkewedAll.length,
        g2UniqueCount,
        g2Plate12Count,
      };
    });

    const plateAuditOk =
      plateAudit.g1AlignedReuseCount === 0 &&
      plateAudit.intraStationDups === 0 &&
      plateAudit.g1UniqueCount === 12 &&
      plateAudit.g2UniqueCount === 12 &&
      plateAudit.g2Plate12Count <= 1;

    if (!plateAuditOk) {
      g4Violations += 1;
      g4Notes.push(`plateAudit=${JSON.stringify(plateAudit)}`);
    }

    gates.push({
      id: 'G4 (무크롬·도판 비중복)',
      passed: g4Violations === 0 && plateAuditOk,
      detail:
        g4Violations === 0
          ? `HUD/크롬 0건 · G1 Aligned재사용=${plateAudit.g1AlignedReuseCount} · 역내중복=${plateAudit.intraStationDups} · Skewed고유=${plateAudit.g1UniqueCount}+${plateAudit.g2UniqueCount}/24`
          : g4Notes.join('; '),
    });

    // -------------------------------------------------------------------------
    // G5: 30m Full-Span Active (`0.45s`..`107.6s`) + `0.70s` Loop (`t=119.60s === 100.00%`, `0 LSB`)
    // -------------------------------------------------------------------------
    const g5Times = [0.45, 21.2, 28.5, 31.8, 41.3, 55, 64.5, 69.0, 84.5, 98.5, 107.6];
    let g5AllActive = true;
    let g5MaxCorr = 0;
    const g5FailNotes = [];

    for (const t of g5Times) {
      const rgb = await getOrCapture(t);
      const z = analyzeThreeZones(rgb);
      const activeHere = z.ink[0] >= 500 && z.ink[1] >= 500 && z.ink[2] >= 500;
      const maxC = Math.max(Math.abs(z.corr01), Math.abs(z.corr12));
      if (maxC > g5MaxCorr) g5MaxCorr = maxC;
      if (!activeHere || maxC >= 0.85) {
        g5AllActive = false;
        g5FailNotes.push(`t=${t}s ink=[${z.ink.join(',')}] corr=(${z.corr01.toFixed(3)}, ${z.corr12.toFixed(3)})`);
      }
    }

    const whiteoutBuf = await getOrCapture(119.60);
    const whiteoutPct = computeWhiteRatioPct(whiteoutBuf, 255);
    const loopStartBuf = await getOrCapture(0.0);
    const loopEndBuf = await getOrCapture(119.967);
    const loopMaxDiff = maxAbsDiffBuffers(loopStartBuf, loopEndBuf);

    const g5Pass = g5AllActive && g5MaxCorr < 0.85 && whiteoutPct >= 99.99 && loopMaxDiff === 0;
    gates.push({
      id: 'G5 (30m 전폭 & 0.70s 루프)',
      passed: g5Pass,
      detail:
        g5FailNotes.length > 0
          ? g5FailNotes.join(' | ')
          : `11시점 3권역 활성 · |corr| = ${g5MaxCorr.toFixed(3)} · t=119.6s 순백(255) = ${whiteoutPct.toFixed(2)}% · 루프 오차 = ${loopMaxDiff} LSB`,
    });

    // -------------------------------------------------------------------------
    // G6: Zero-Freeze Motion Continuity + Patch 7.1 Left (`X<1650`) & Right (`X>5900`) Partial-Freeze Guard!
    // -------------------------------------------------------------------------
    const g6Times = [13, 16, 21, 27, 31, 35, 48, 63, 80, 90, 103, 109, 115];
    const partialGuardTimes = new Set([16, 21, 103, 109]);
    let g6MinChanged = Infinity;
    let g6MinLeft = Infinity;
    let g6MinRight = Infinity;
    const g6FailNotes = [];

    for (const t of g6Times) {
      const bufA = await getOrCapture(t);
      const bufB = await getOrCapture(t + 1.0);
      const changed = countChangedPixels(bufA, bufB, 6, 0, STAGE_W);
      if (changed < g6MinChanged) g6MinChanged = changed;
      if (changed < 5000) {
        g6FailNotes.push(`${t}->${t + 1}s 전체:${changed}px`);
      }

      if (partialGuardTimes.has(t)) {
        const leftChanged = countChangedPixels(bufA, bufB, 6, 0, 1650);
        const rightChanged = countChangedPixels(bufA, bufB, 6, 5900, STAGE_W);
        if (leftChanged < g6MinLeft) g6MinLeft = leftChanged;
        if (rightChanged < g6MinRight) g6MinRight = rightChanged;
        if (leftChanged < 2000) {
          g6FailNotes.push(`${t}->${t + 1}s 좌권역:${leftChanged}px(<2000)`);
        }
        if (rightChanged < 1500) {
          g6FailNotes.push(`${t}->${t + 1}s 우권역:${rightChanged}px(<1500)`);
        }
      }
    }

    gates.push({
      id: 'G6 (전폭·좌우 Zero-Freeze)',
      passed: g6FailNotes.length === 0,
      detail:
        g6FailNotes.length === 0
          ? `최소 전체=${g6MinChanged.toLocaleString('en-US')}px · 좌권역(X<1650)=${g6MinLeft.toLocaleString('en-US')}px · 우권역(X>5900)=${g6MinRight.toLocaleString('en-US')}px`
          : `정지 감지: ${g6FailNotes.join(', ')}`,
    });

    // -------------------------------------------------------------------------
    // G7: Physical Bezel Vertical Safety Envelope (`rect.top >= 20`, `rect.bottom <= 410`!)
    // -------------------------------------------------------------------------
    const g7Times = [5.5, 18, 21.2, 28.5, 31.8, 34.8, 41.3, 48.2, 64.5, 78.2, 84.5, 92.2, 107.6];
    const g7Selector =
      '.press-hero-query, .press-memory-line, .press-formula-stamp, .datum-query-anchor, .prism-gate-label, .monolith-card, .station-beacon, .spread-hero-slot, .frag, .orbit-center-sanctuary, .periphery-num-tag, .awakened-sentence, .fault-shard, .gale-wind-banner';
    let g7TotalViolations = 0;
    let g7MinTop = Infinity;
    let g7MaxBottom = -Infinity;
    const g7FailSamples = [];

    for (const t of g7Times) {
      await page.evaluate((sec) => window.renderAt(sec), t);
      const bRes = await page.evaluate((selector) => {
        const nodes = Array.from(document.querySelectorAll(selector));
        const violations = [];
        let minT = Infinity;
        let maxB = -Infinity;

        for (const el of nodes) {
          let effOp = 1.0;
          let cur = el;
          while (cur && cur instanceof HTMLElement) {
            const cs = window.getComputedStyle(cur);
            effOp *= parseFloat(cs.opacity || '1');
            if (cs.display === 'none' || cs.visibility === 'hidden') {
              effOp = 0;
              break;
            }
            cur = cur.parentElement;
          }
          if (effOp < 0.20) continue;
          const r = el.getBoundingClientRect();
          if (r.width <= 0.5 || r.height <= 0.5) continue;
          if (r.right < 0 || r.left > 6480) continue;

          if (r.top < minT) minT = r.top;
          if (r.bottom > maxB) maxB = r.bottom;
          if (r.top < 20.0 || r.bottom > 410.0) {
            violations.push(
              `"${(el.textContent || el.className || '').trim().slice(0, 20)}" [${r.top.toFixed(1)}..${r.bottom.toFixed(1)}]`,
            );
          }
        }
        return { violations, minT, maxB };
      }, g7Selector);

      if (bRes.minT < g7MinTop) g7MinTop = bRes.minT;
      if (bRes.maxB > g7MaxBottom) g7MaxBottom = bRes.maxB;
      if (bRes.violations.length > 0) {
        g7TotalViolations += bRes.violations.length;
        g7FailSamples.push(`t=${t}s: ${bRes.violations.slice(0, 3).join(', ')}`);
      }
    }

    gates.push({
      id: 'G7 (물리 베젤 안전여백)',
      passed: g7TotalViolations === 0,
      detail:
        g7TotalViolations === 0
          ? `13-시점 전 요소 Y ∈ [${g7MinTop.toFixed(1)}px, ${g7MaxBottom.toFixed(1)}px] (기준 [20, 410], 침범 0건)`
          : g7FailSamples.join(' | '),
    });

    for (const g of gates) {
      console.log(` [${g.passed ? 'PASS' : 'FAIL'}] ${g.id.padEnd(25)} : ${g.detail}`);
    }
    console.log('----------------------------------------------------------------------------------------');

    const allPassed = gates.every((g) => g.passed);
    console.log(` 최종 판정: ${allPassed ? '100% PASS (G1~G7 최종 마스터 수렴 무결성 전수 통과)' : 'FAIL (미통과 게이트 교정 필요)'}`);
    console.log('========================================================================================\n');

    if (!allPassed) {
      process.exit(1);
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error('\n[ERROR] verify-artwork 실행 실패:', err?.message ?? err);
  process.exit(1);
});
