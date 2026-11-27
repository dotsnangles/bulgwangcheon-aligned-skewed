#!/usr/bin/env node
/**
 * Quantitative Museum-Grade Artwork Integrity & 6,000-Frame Kinematic Verifier
 * (`scripts/verify-artwork.mjs` — 200.0s / 100-Bar / G1~G8 Master Gate Suite)
 *
 * Evaluates 8 strict gates in Headless Chromium (`6480 × 432`, `/?raw=1` + Studio `1440 × 960`):
 *   - G1 (Deterministic Purity): 12 forward vs scrambled timestamps across `0..200s` (`max_abs_diff === 0 LSB`) + all `<img>` decoded.
 *   - G2 (2D/3D Zero Collision & Sanctuary):
 *       `press@7.5s`, `press@8.8s` (`>= 12px` formula clearance & `clip-path: none`),
 *       `page@50.5s`, `spectrum2D@65.0s (+16px barcode)`, `reading2D@82.5s`, `meaning2D@108.5s`, `orbit2D@133.0s` (`0` AABB overlaps)
 *       + `sphere3D@144.0s` (`0` central `.orbit-center-sanctuary` intrusions).
 *   - G3 (Pure-White Ground, `rgain=0.90` White-Point & Zero-Sticker Typography):
 *       Mean pure-white (`>= 245`) `>= 78%` + `/?raw=1&rgain=0.90` `RGB(255,255,255)` ground
 *       + floating typography (`backgroundColor === rgba(0,0,0,0)` & `boxShadow === none`).
 *   - G4 (Zero Chrome/HUD, 400-Timestamp Simultaneous Plate Disjointness & 3-Band Cosine Scan):
 *       Zero UI/HUD/PL.04 + `0.0s..199.5s` (`0.5s` step, `400` timestamps) DOM `<img>` + `<canvas>` simultaneous duplicate plates `=== 0`
 *       + `24/24` unique `Gen1+Gen2 Skewed` plates + `Act II.2` cosine arcs rendered across Upper (`Y<150`), Mid (`150..280`), Lower (`Y>280`).
 *   - G5 (30m Full-Span Active & `0.70s` Loop): 13 timestamps 3-zone active & `|corr| < 0.85` + `t=199.60s` pure white `100.00%` + loop (`0.0s` vs `199.967s`) `0 LSB`.
 *   - G6 (Zero-Freeze Full + Left/Right Archipelago Guard): 16 intervals across `200s` `>= 5,000 px` + archipelago Left (`X<1650`) `>= 2,000 px` & Right (`X>5900`) `>= 1,500 px`.
 *   - G7 (Physical Bezel Safe Envelope): 16 timestamps all visible elements strictly within `Y ∈ [20px, 410px]`.
 *   - G8 (6,000-Frame Kinematic Smoothness, Cold Webfont Race & 60fps Studio):
 *       1) `f = 0..5999` (`dt = 1/30s`): `.frag` chatter reversals `=== 0`, `.frag` `|Δop| > 0.20` `=== 0`,
 *          `.monolith-card` overlapping `z-index` flips `=== 0`, `getFocusX(t)` step `<= 12.0 px/frame`.
 *       2) Cold network (`.woff2` delayed `150ms`) on `/?pause=1`: `history` 1-cycle rewind Y step `<= 2.5 px` (discontinuity `<= 1.0 px`)
 *          + Studio (`1440×960`) 30-frame avg render time in `Helix3D` & `Sphere3D` `<= 18.5 ms` (`>= 54 fps`).
 */

import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import {
  DURATION,
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

function countCrimsonByVerticalBands(rgb) {
  let upper = 0;
  let mid = 0;
  let lower = 0;
  for (let y = 0; y < STAGE_H; y++) {
    const rowOff = y * STAGE_W;
    for (let x = 0; x < STAGE_W; x++) {
      const i = (rowOff + x) * 3;
      if (rgb[i] >= 195 && rgb[i + 1] <= 60 && rgb[i + 2] <= 60) {
        if (y < 150) upper++;
        else if (y <= 280) mid++;
        else lower++;
      }
    }
  }
  return { upper, mid, lower };
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

    console.log('\n================================================================================================');
    console.log(` 〈정렬과 사선 (Aligned / Skewed)〉 — 200.0s (${Math.round(DURATION * 30)}f) 8대 정량 & 운동학 무결성 검증 (G1~G8)`);
    console.log('================================================================================================');

    // -------------------------------------------------------------------------
    // G1: Deterministic Purity (`max_abs_diff === 0 LSB` across 12 timestamps + all `<img>` decoded)
    // -------------------------------------------------------------------------
    const g1Times = [7.5, 15.6, 28.0, 45.2, 50.5, 68.5, 82.5, 94.5, 108.5, 133.0, 144.0, 182.0];
    const forwardBufs = new Map();
    for (const t of g1Times) {
      forwardBufs.set(t, await captureRgbAt(page, t));
    }

    const scrambledTimes = [144.0, 28.0, 182.0, 7.5, 108.5, 45.2, 133.0, 68.5, 15.6, 94.5, 50.5, 82.5];
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
      detail: `12시점 max_abs_diff = ${g1MaxDiff} LSB · decoded <img> = ${imgCheck.total - imgCheck.brokenCount}/${imgCheck.total}`,
    });

    // -------------------------------------------------------------------------
    // G2: 2D Settled Views Zero Collision + `press@8.8s` Formula Clearance + `sphere3D@144.0s` Sanctuary
    // -------------------------------------------------------------------------
    const g2Specs = [
      {
        name: 'press',
        t: 7.5,
        selector: '.press-hero-query, .press-memory-line, .press-formula-stamp',
        minOp: 0.25,
        barcodePad: 0,
      },
      {
        name: 'page',
        t: 50.5,
        selector: '.frag, .spread-hero-slot',
        minOp: 0.25,
        barcodePad: 0,
      },
      {
        name: 'spectrum2D',
        t: 65.0,
        selector: '.frag',
        minOp: 0.25,
        barcodePad: 16,
      },
      {
        name: 'reading2D',
        t: 82.5,
        selector: '.frag',
        minOp: 0.25,
        barcodePad: 0,
      },
      {
        name: 'meaning2D',
        t: 108.5,
        selector: '.frag',
        minOp: 0.25,
        barcodePad: 0,
      },
      {
        name: 'orbit2D',
        t: 133.0,
        selector: '.frag, .orbit-center-sanctuary',
        minOp: 0.25,
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

    // Check `press@8.8s` formula clearance (`>= 12px`) & `clip-path: none`
    await page.evaluate(() => window.renderAt(8.8));
    const press88Check = await page.evaluate(() => {
      const upCp = window.getComputedStyle(document.querySelector('.press-clip-upper')).clipPath;
      const loCp = window.getComputedStyle(document.querySelector('.press-clip-lower')).clipPath;
      const fEl = document.querySelector('.press-formula-stamp');
      const fOp = parseFloat(window.getComputedStyle(fEl).opacity || '0');
      const fRect = fEl.getBoundingClientRect();
      let minFormulaGap = Infinity;
      for (const el of document.querySelectorAll('.press-memory-line')) {
        const cs = window.getComputedStyle(el);
        if (parseFloat(cs.opacity || '0') < 0.1) continue;
        const r = el.getBoundingClientRect();
        if (r.right < fRect.left || r.left > fRect.right) continue;
        const gap = r.bottom <= fRect.top ? fRect.top - r.bottom : r.top - fRect.bottom;
        if (gap < minFormulaGap) minFormulaGap = gap;
      }
      return {
        clipUsed: upCp !== 'none' || loCp !== 'none',
        formulaOp: fOp,
        minFormulaGap,
      };
    });

    // Check `sphere3D` & `orbit2D ↔ sphere3D` transitions across 9 timestamps for central `.orbit-center-sanctuary` intrusion (`=== 0`)
    const sanctTimes = [129.5, 133.0, 138.8, 139.2, 140.0, 144.0, 147.8, 148.4, 149.0];
    let totalSanctIntrusions = 0;
    const sanctIntrusionSamples = [];
    for (const st of sanctTimes) {
      await page.evaluate((sec) => window.renderAt(sec), st);
      const sRes = await page.evaluate(() => {
        const sanct = document.querySelector('.orbit-center-sanctuary');
        const sanctOp = parseFloat(window.getComputedStyle(sanct).opacity || '0');
        if (sanctOp < 0.1) return { sanctOp, intrusionCount: 0, samples: [] };
        const sRect = sanct.getBoundingClientRect();
        const pad = 3;
        const intrusions = [];
        for (const el of document.querySelectorAll('.frag')) {
          const op = parseFloat(window.getComputedStyle(el).opacity || '0');
          if (op < 0.12) continue;
          const r = el.getBoundingClientRect();
          const ox = Math.min(r.right, sRect.right + pad) - Math.max(r.left, sRect.left - pad);
          const oy = Math.min(r.bottom, sRect.bottom + pad) - Math.max(r.top, sRect.top - pad);
          if (ox > 0.5 && oy > 0.5) {
            intrusions.push(`"${(el.textContent || '').trim().slice(0, 18)}" (${ox.toFixed(1)}x${oy.toFixed(1)})`);
          }
        }
        return { sanctOp, intrusionCount: intrusions.length, samples: intrusions.slice(0, 4) };
      });
      totalSanctIntrusions += sRes.intrusionCount;
      if (sRes.intrusionCount > 0) {
        sanctIntrusionSamples.push(`t=${st}s:${sRes.samples.join(',')}`);
      }
    }

    // Check 3D Foreground Lattice Zero-Collision (`effOp >= 0.45`) across `helix3D`, `cloud3D`, and `sphere3D`
    const fg3DSpecs = [
      { name: 'helix3D', t: 90.5 },
      { name: 'helix3D', t: 94.5 },
      { name: 'helix3D', t: 98.5 },
      { name: 'cloud3D', t: 122.5 },
      { name: 'sphere3D', t: 141.5 },
      { name: 'sphere3D', t: 144.0 },
      { name: 'sphere3D', t: 146.5 },
    ];
    let total3DFgCollisions = 0;
    const fg3DNotes = [];
    for (const fsp of fg3DSpecs) {
      await page.evaluate((sec) => window.renderAt(sec), fsp.t);
      const cRes = await page.evaluate(() => {
        const boxes = [];
        for (const el of document.querySelectorAll('.frag')) {
          const op = parseFloat(window.getComputedStyle(el).opacity || '0');
          if (op < 0.45) continue;
          const r = el.getBoundingClientRect();
          if (r.width <= 0.5 || r.height <= 0.5 || r.right < 0 || r.left > 6480) continue;
          boxes.push({
            text: (el.textContent || '').trim().slice(0, 18),
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
          });
        }
        const cols = [];
        for (let i = 0; i < boxes.length; i++) {
          const a = boxes[i];
          for (let j = i + 1; j < boxes.length; j++) {
            const b = boxes[j];
            const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (ox > 0.5 && oy > 0.5) {
              cols.push(`"${a.text}"<->"${b.text}"(${ox.toFixed(1)}x${oy.toFixed(1)})`);
            }
          }
        }
        return { count: cols.length, samples: cols.slice(0, 5) };
      });
      total3DFgCollisions += cRes.count;
      if (cRes.count > 0) {
        fg3DNotes.push(`${fsp.name}@${fsp.t}s:${cRes.count}[${cRes.samples.join(',')}]`);
      }
    }

    // Check Active `COS` Badge Sanctuary Zero-Collision (`65.8, 68.5, 71.2, 74.0s`)
    const cosWaveTimes = [65.8, 68.5, 71.2, 74.0];
    let totalCosBadgeCollisions = 0;
    const cosBadgeNotes = [];
    for (const ct of cosWaveTimes) {
      await page.evaluate((sec) => window.renderAt(sec), ct);
      const bRes = await page.evaluate(() => {
        const stage = document.querySelector('.motion-stage');
        const raw = stage?.dataset.activeCosineBoxes || '';
        const cosBoxes = raw
          .split(';')
          .filter(Boolean)
          .map((s) => {
            const [l, t, r, b] = s.split(',').map(Number);
            return { left: l, top: t, right: r, bottom: b };
          });
        const hits = [];
        for (const el of document.querySelectorAll('.frag')) {
          const op = parseFloat(window.getComputedStyle(el).opacity || '0');
          if (op < 0.20) continue;
          const r = el.getBoundingClientRect();
          for (const cb of cosBoxes) {
            const ox = Math.min(r.right, cb.right) - Math.max(r.left, cb.left);
            const oy = Math.min(r.bottom, cb.bottom) - Math.max(r.top, cb.top);
            if (ox > 0.5 && oy > 0.5) {
              hits.push(`"${(el.textContent || '').trim().slice(0, 16)}"(${ox.toFixed(1)}x${oy.toFixed(1)})`);
            }
          }
        }
        return { badgeCount: cosBoxes.length, collisionCount: hits.length, samples: hits.slice(0, 4) };
      });
      if (bRes.badgeCount === 0) {
        totalCosBadgeCollisions += 1;
        cosBadgeNotes.push(`t=${ct}s:no_badges`);
      } else if (bRes.collisionCount > 0) {
        totalCosBadgeCollisions += bRes.collisionCount;
        cosBadgeNotes.push(`t=${ct}s:${bRes.samples.join(',')}`);
      }
    }

    const g2PressOk = !press88Check.clipUsed && press88Check.formulaOp >= 0.85 && press88Check.minFormulaGap >= 12.0;
    const g2SphereOk = totalSanctIntrusions === 0 && total3DFgCollisions === 0 && totalCosBadgeCollisions === 0;
    if (!g2PressOk) console.error('  [G2 press@8.8s 결함]:', press88Check);
    if (totalSanctIntrusions > 0) console.error('  [G2 중앙 성소 침범]:', sanctIntrusionSamples);
    if (total3DFgCollisions > 0) console.error('  [G2 3D 전면 충돌]:', fg3DNotes);
    if (totalCosBadgeCollisions > 0) console.error('  [G2 COS 배지 충돌]:', cosBadgeNotes);

    gates.push({
      id: 'G2 (2D/3D무충돌·성소·COS)',
      passed: g2TotalCollisions === 0 && g2PressOk && g2SphereOk,
      detail: `${g2Details.join(' · ')} · 3D전면충돌=${total3DFgCollisions} · 9시점성소침범=${totalSanctIntrusions} · COS배지충돌=${totalCosBadgeCollisions} · press@8.8s=${press88Check.minFormulaGap.toFixed(1)}px`,
    });

    // -------------------------------------------------------------------------
    // G3: Pure-White Ground (`>= 78%`), `rgain=0.90` White-Point & Zero-Sticker Floating Text
    // -------------------------------------------------------------------------
    const g3Times = [6.0, 15.6, 28.0, 50.5, 68.5, 82.5, 94.5, 108.5, 121.0, 133.0, 144.0, 154.0, 182.0];
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
    const rgainMeanBuf = await captureRgbAt(rgainPage, 108.5);
    const rgainPure255Pct = computeWhiteRatioPct(rgainMeanBuf, 255);
    const canyonOff = (216 * STAGE_W + 1004) * 3;
    const canyonRgb = [rgainMeanBuf[canyonOff], rgainMeanBuf[canyonOff + 1], rgainMeanBuf[canyonOff + 2]];
    await rgainPage.close();

    // Verify zero opaque rectangular white stickers on floating text across active moments
    const stickerCheck = await page.evaluate(() => {
      const checkTimes = [28.0, 108.5, 133.0, 154.0, 160.5, 167.5];
      const selectors =
        '.orbit-center-sanctuary, .awakened-sentence, .fault-shard, .gale-wind-banner, .periphery-num-tag, .station-meta-col, .frag:not(.is-img)';
      const bad = [];
      for (const t of checkTimes) {
        window.renderAt(t);
        for (const el of document.querySelectorAll(selectors)) {
          const cs = window.getComputedStyle(el);
          if (parseFloat(cs.opacity || '0') < 0.05) continue;
          const bg = cs.backgroundColor.replace(/\s+/g, '');
          const bs = cs.boxShadow;
          if (bg !== 'rgba(0,0,0,0)' && bg !== 'transparent') {
            bad.push(`${el.className}@${t}s bg=${cs.backgroundColor}`);
            if (bad.length >= 6) return { count: bad.length, samples: bad };
          }
          if (bs !== 'none') {
            bad.push(`${el.className}@${t}s shadow=${bs}`);
            if (bad.length >= 6) return { count: bad.length, samples: bad };
          }
        }
      }
      return { count: bad.length, samples: bad };
    });

    const rgainWhiteOk =
      canyonRgb[0] === 255 && canyonRgb[1] === 255 && canyonRgb[2] === 255 && rgainPure255Pct >= 75.0;
    if (stickerCheck.count > 0) console.error('  [G3 흰 스티커 잔존]:', stickerCheck.samples);

    gates.push({
      id: 'G3 (순백·화이트·무스티커)',
      passed: meanWhitePct >= 78.0 && rgainWhiteOk && stickerCheck.count === 0,
      detail: `평균 순백=${meanWhitePct.toFixed(2)}% (최소 ${minWhitePct.toFixed(2)}%) · rgain=0.90 RGB(${canyonRgb.join(',')}) · 부유텍스트 스티커=${stickerCheck.count}건`,
    });

    // -------------------------------------------------------------------------
    // G4: Zero Chrome/HUD + `0.0s..199.5s` (`400` Timestamps) Simultaneous Plate Disjointness
    //     + `24/24` Unique Skewed Plates + `Act II.2` 3-Band Cosine Caliper Verification!
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

    const g4Sweep = await page.evaluate((forbidden) => {
      const stage = document.querySelector('.motion-stage') || document.body;
      let uiViolations = 0;
      const uiSamples = [];
      let dupFrames = 0;
      const dupSamples = [];
      let pl04Hits = 0;

      const allImgs = Array.from(stage.querySelectorAll('img'));

      for (let step = 0; step < 400; step++) {
        const t = step * 0.5;
        window.renderAt(t);

        if (step % 25 === 0) {
          const controls = stage.querySelectorAll('button, input, select, textarea').length;
          const txt = stage.textContent || '';
          const hits = forbidden.filter((f) => txt.includes(f));
          if (controls + hits.length > 0) {
            uiViolations += controls + hits.length;
            if (uiSamples.length < 4) uiSamples.push(`t=${t}s:[${hits.join(',')}]`);
          }
        }

        const fadeEl = stage.querySelector('.stage-fade');
        const washOp = fadeEl ? parseFloat(fadeEl.style.opacity || '0') : 0;
        if (washOp >= 0.995) continue;

        const visiblePlates = [];

        for (const img of allImgs) {
          let effOp = 1.0 - washOp;
          let cur = img;
          while (cur && cur !== stage && cur instanceof HTMLElement) {
            if (cur.style.display === 'none' || cur.style.visibility === 'hidden') {
              effOp = 0;
              break;
            }
            const inlineOp = cur.style.opacity;
            if (inlineOp !== '') {
              effOp *= parseFloat(inlineOp);
            }
            if (effOp < 0.05) break;
            cur = cur.parentElement;
          }
          if (effOp < 0.05) continue;
          const r = img.getBoundingClientRect();
          if (r.width <= 1 || r.height <= 1 || r.right <= 0 || r.left >= 6480 || r.bottom <= 0 || r.top >= 432) {
            continue;
          }
          const pid = img.dataset.plate || ((img.getAttribute('src') || '').match(/plate-\d+/)?.[0] ?? '');
          if (pid) visiblePlates.push(pid);
        }

        const canvasStr = stage.dataset.activeCanvasPlates || '';
        if (canvasStr) {
          for (const pid of canvasStr.split(',')) {
            if (pid) visiblePlates.push(pid);
          }
        }

        if (visiblePlates.includes('plate-04')) pl04Hits++;
        const seen = new Set();
        const dupsHere = [];
        for (const p of visiblePlates) {
          if (seen.has(p)) dupsHere.push(p);
          seen.add(p);
        }
        if (dupsHere.length > 0) {
          dupFrames++;
          if (dupSamples.length < 6) {
            dupSamples.push(`t=${t.toFixed(1)}s:[${Array.from(new Set(dupsHere)).join(',')}]`);
          }
        }
      }

      // Audit 24 Skewed cards (`Gen1` 12 + `Gen2` 12 = `24/24` unique) + `0` Aligned reuse
      const cards = Array.from(stage.querySelectorAll('.monolith-card'));
      const g1Aligned = [];
      const g2Aligned = [];
      const g1Skewed = [];
      const g2Skewed = [];
      for (const c of cards) {
        const gen = c.dataset.gen;
        const grp = c.dataset.group;
        const pid = c.dataset.plate || '';
        if (gen === '1' && grp === 'aligned') g1Aligned.push(pid);
        if (gen === '2' && grp === 'aligned') g2Aligned.push(pid);
        if (gen === '1' && grp === 'skewed') g1Skewed.push(pid);
        if (gen === '2' && grp === 'skewed') g2Skewed.push(pid);
      }
      const all24SkewedUnique = new Set([...g1Skewed, ...g2Skewed]).size;
      const g1AlignedUnique = new Set(g1Aligned).size;
      const g2AlignedUnique = new Set(g2Aligned).size;

      // Check cosine caliper bands across all 4 waves
      const waveTestTimes = [65.8, 68.5, 71.2, 74.0];
      const waveBands = waveTestTimes.map((wt) => {
        window.renderAt(wt);
        return stage.dataset.activeCosineBands || '';
      });

      return {
        uiViolations,
        uiSamples,
        dupFrames,
        dupSamples,
        pl04Hits,
        all24SkewedUnique,
        g1AlignedUnique,
        g2AlignedUnique,
        waveBands,
      };
    }, forbiddenStrings);

    const cosRgb68 = await getOrCapture(68.5);
    const cosRgb65 = await getOrCapture(65.8);
    const bands68 = countCrimsonByVerticalBands(cosRgb68);
    const bands65 = countCrimsonByVerticalBands(cosRgb65);
    const cosineThreeBandPixelsOk =
      Math.max(bands65.upper, bands68.upper) >= 400 &&
      Math.max(bands65.mid, bands68.mid) >= 400 &&
      Math.max(bands65.lower, bands68.lower) >= 400 &&
      g4Sweep.waveBands.every((b) => b === 'lower,mid,upper');

    const g4Pass =
      g4Sweep.uiViolations === 0 &&
      g4Sweep.dupFrames === 0 &&
      g4Sweep.pl04Hits === 0 &&
      g4Sweep.all24SkewedUnique === 24 &&
      g4Sweep.g1AlignedUnique === 6 &&
      g4Sweep.g2AlignedUnique === 6 &&
      cosineThreeBandPixelsOk;

    if (!g4Pass) {
      console.error('  [G4 상세]:', { g4Sweep, bands65, bands68 });
    }

    gates.push({
      id: 'G4 (400시점 무중복·3대역스캔)',
      passed: g4Pass,
      detail: `HUD=0 · 400시점 동시중복=${g4Sweep.dupFrames}건 · Skewed고유=${g4Sweep.all24SkewedUnique}/24 · 코사인3대역 픽셀(상${bands68.upper}/중${bands68.mid}/하${bands68.lower})`,
    });

    // -------------------------------------------------------------------------
    // G5: `200.0s` 13-Timestamp 3-Zone Active (`|corr| < 0.85`) + `t=199.60s` `100.00%` White + Loop `0 LSB`
    // -------------------------------------------------------------------------
    const g5Times = [0.55, 7.5, 15.6, 28.0, 45.8, 50.5, 68.5, 82.5, 94.5, 108.5, 121.0, 144.0, 182.0];
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

    const whiteoutBuf = await getOrCapture(199.60);
    const whiteoutPct = computeWhiteRatioPct(whiteoutBuf, 255);
    const loopStartBuf = await getOrCapture(0.0);
    const loopEndBuf = await getOrCapture(199.967);
    const loopMaxDiff = maxAbsDiffBuffers(loopStartBuf, loopEndBuf);

    const g5Pass = g5AllActive && g5MaxCorr < 0.85 && whiteoutPct >= 99.99 && loopMaxDiff === 0;
    gates.push({
      id: 'G5 (30m 전폭 & 0.70s 루프)',
      passed: g5Pass,
      detail:
        g5FailNotes.length > 0
          ? g5FailNotes.join(' | ')
          : `13시점 3권역 활성 · |corr|=${g5MaxCorr.toFixed(3)} · t=199.6s 순백=${whiteoutPct.toFixed(2)}% · 루프(0s vs 199.967s)=${loopMaxDiff} LSB`,
    });

    // -------------------------------------------------------------------------
    // G6: `200.0s` 16-Interval Zero-Freeze + Left (`X<1650`) & Right (`X>5900`) Archipelago Guard
    // -------------------------------------------------------------------------
    const g6Times = [6, 14, 24, 34, 44, 54, 67, 81, 93, 107, 120, 143, 154, 166, 177, 187];
    const partialGuardTimes = new Set([24, 34, 177, 187]);
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
      id: 'G6 (16구간 전폭·좌우 유영)',
      passed: g6FailNotes.length === 0,
      detail:
        g6FailNotes.length === 0
          ? `16구간 최소 전체=${g6MinChanged.toLocaleString('en-US')}px · 좌권역(X<1650)=${g6MinLeft.toLocaleString('en-US')}px · 우권역(X>5900)=${g6MinRight.toLocaleString('en-US')}px`
          : `정지 감지: ${g6FailNotes.join(', ')}`,
    });

    // -------------------------------------------------------------------------
    // G7: Physical Bezel Vertical Safety Envelope (`rect.top >= 20`, `rect.bottom <= 410`)
    // -------------------------------------------------------------------------
    const g7Times = [7.5, 8.8, 15.6, 24.0, 34.0, 45.5, 50.5, 56.5, 68.5, 82.5, 94.5, 108.5, 133.0, 144.0, 160.5, 182.0];
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
          ? `16시점 전 요소 Y ∈ [${g7MinTop.toFixed(1)}px, ${g7MaxBottom.toFixed(1)}px] (기준 [20, 410], 침범 0건)`
          : g7FailSamples.join(' | '),
    });

    // -------------------------------------------------------------------------
    // G8: 6,000-Frame Kinematic Continuity + Cold `.woff2` (`150ms`) History Race + Studio `60fps`
    // -------------------------------------------------------------------------
    console.log(' [G8] 6,000프레임(0..5999) 전수 운동학 연속성 스캔 및 콜드 웹폰트·60fps 계측 중...');

    const kinematicScan = await page.evaluate(() => {
      const totalFrames = 6000;
      const dt = 1 / 30;
      const fragEls = Array.from(document.querySelectorAll('.frag'));
      const cardEls = Array.from(document.querySelectorAll('.monolith-card'));
      const nF = fragEls.length;
      const nC = cardEls.length;

      const prev2X = new Float64Array(nF);
      const prev2Y = new Float64Array(nF);
      const prev2Op = new Float64Array(nF);
      const prev1X = new Float64Array(nF);
      const prev1Y = new Float64Array(nF);
      const prev1Op = new Float64Array(nF);

      const prevCardOp = new Float64Array(nC);
      const prevCardZ = new Int32Array(nC);
      const prevCardL = new Float64Array(nC);
      const prevCardR = new Float64Array(nC);
      const prevCardT = new Float64Array(nC);
      const prevCardB = new Float64Array(nC);

      const curCardOp = new Float64Array(nC);
      const curCardZ = new Int32Array(nC);
      const curCardL = new Float64Array(nC);
      const curCardR = new Float64Array(nC);
      const curCardT = new Float64Array(nC);
      const curCardB = new Float64Array(nC);

      let chatterReversals = 0;
      let opacityJumps = 0;
      let maxFragDeltaOp = 0;
      let cardZFlips = 0;
      let maxFocusStep = 0;
      const sampleErrors = [];

      const focusFn = window.getFocusX || (() => 3240);
      let prevFocus = focusFn(0);

      const parseTranslate = (tr) => {
        // Matches `translate3d(Xpx, Ypx, 0...)`
        if (!tr || tr.startsWith('translate3d(-9999')) return null;
        const p0 = tr.indexOf('(');
        if (p0 < 0) return null;
        const c1 = tr.indexOf(',', p0);
        const c2 = tr.indexOf(',', c1 + 1);
        if (c1 < 0 || c2 < 0) return null;
        const x = parseFloat(tr.slice(p0 + 1, c1));
        const y = parseFloat(tr.slice(c1 + 1, c2));
        return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
      };

      for (let f = 0; f < totalFrames; f++) {
        const t = f * dt;
        window.renderAt(t);

        const curFocus = focusFn(t);
        if (f > 0) {
          const df = Math.abs(curFocus - prevFocus);
          if (df > maxFocusStep) maxFocusStep = df;
        }
        prevFocus = curFocus;

        // 1) `.frag` kinematic continuity
        for (let i = 0; i < nF; i++) {
          const el = fragEls[i];
          const op = parseFloat(el.style.opacity || '0');
          let x = prev1X[i];
          let y = prev1Y[i];
          if (op > 0.004) {
            const xy = parseTranslate(el.style.transform);
            if (xy) {
              x = xy[0];
              y = xy[1];
            }
          }

          if (f >= 1 && (op >= 0.15 || prev1Op[i] >= 0.15)) {
            const dOp = Math.abs(op - prev1Op[i]);
            if (dOp > maxFragDeltaOp) maxFragDeltaOp = dOp;
            if (dOp > 0.20) {
              opacityJumps++;
              if (sampleErrors.length < 6) {
                sampleErrors.push(`frag#${i}@${t.toFixed(2)}s Δop=${dOp.toFixed(3)}`);
              }
            }
          }

          if (f >= 2 && prev2Op[i] >= 0.15 && prev1Op[i] >= 0.15 && op >= 0.15) {
            const vx1 = prev1X[i] - prev2X[i];
            const vx2 = x - prev1X[i];
            const vy1 = prev1Y[i] - prev2Y[i];
            const vy2 = y - prev1Y[i];
            if ((vx1 * vx2 < -4.0 && Math.abs(vx2 - vx1) > 5.0) || (vy1 * vy2 < -4.0 && Math.abs(vy2 - vy1) > 5.0)) {
              chatterReversals++;
              if (sampleErrors.length < 6) {
                sampleErrors.push(
                  `frag#${i}@${t.toFixed(2)}s chatter vx(${vx1.toFixed(1)}->${vx2.toFixed(1)}) vy(${vy1.toFixed(1)}->${vy2.toFixed(1)})`,
                );
              }
            }
          }

          prev2X[i] = prev1X[i];
          prev2Y[i] = prev1Y[i];
          prev2Op[i] = prev1Op[i];
          prev1X[i] = x;
          prev1Y[i] = y;
          prev1Op[i] = op;
        }

        // 2) `.monolith-card` overlapping z-index pop check
        const cardsActive = (t >= 18.4 && t <= 44.1) || (t >= 171.4 && t <= 199.5);
        if (cardsActive) {
          const visIdx = [];
          for (let c = 0; c < nC; c++) {
            const el = cardEls[c];
            const op = parseFloat(el.style.opacity || '0');
            curCardOp[c] = op;
            if (op >= 0.25) {
              const r = el.getBoundingClientRect();
              curCardZ[c] = parseInt(el.style.zIndex || '0', 10);
              curCardL[c] = r.left;
              curCardR[c] = r.right;
              curCardT[c] = r.top;
              curCardB[c] = r.bottom;
              visIdx.push(c);
            }
          }

          if (f >= 1) {
            for (let a = 0; a < visIdx.length; a++) {
              const ia = visIdx[a];
              if (prevCardOp[ia] < 0.25) continue;
              for (let b = a + 1; b < visIdx.length; b++) {
                const ib = visIdx[b];
                if (prevCardOp[ib] < 0.25) continue;

                const dzPrev = prevCardZ[ia] - prevCardZ[ib];
                const dzCur = curCardZ[ia] - curCardZ[ib];
                if (dzPrev * dzCur < 0) {
                  const oxCur = Math.min(curCardR[ia], curCardR[ib]) - Math.max(curCardL[ia], curCardL[ib]);
                  const oyCur = Math.min(curCardB[ia], curCardB[ib]) - Math.max(curCardT[ia], curCardT[ib]);
                  const oxPrev = Math.min(prevCardR[ia], prevCardR[ib]) - Math.max(prevCardL[ia], prevCardL[ib]);
                  const oyPrev = Math.min(prevCardB[ia], prevCardB[ib]) - Math.max(prevCardT[ia], prevCardT[ib]);
                  if ((oxCur > 4 && oyCur > 4) || (oxPrev > 4 && oyPrev > 4)) {
                    cardZFlips++;
                    if (sampleErrors.length < 6) {
                      sampleErrors.push(`card(${ia},${ib})@${t.toFixed(2)}s zFlip overlap=${oxCur.toFixed(1)}x${oyCur.toFixed(1)}`);
                    }
                  }
                }
              }
            }
          }

          for (let c = 0; c < nC; c++) {
            prevCardOp[c] = curCardOp[c];
            prevCardZ[c] = curCardZ[c];
            prevCardL[c] = curCardL[c];
            prevCardR[c] = curCardR[c];
            prevCardT[c] = curCardT[c];
            prevCardB[c] = curCardB[c];
          }
        } else {
          prevCardOp.fill(0);
        }
      }

      // Check loop wrap step `f = 5999 -> f = 0`
      const wrapStep = Math.abs(focusFn(0) - prevFocus);
      if (wrapStep > maxFocusStep) maxFocusStep = wrapStep;

      return {
        chatterReversals,
        opacityJumps,
        maxFragDeltaOp,
        cardZFlips,
        maxFocusStep,
        sampleErrors,
      };
    });

    // G8.2: Cold Network (`.woff2` delayed `150ms`) Studio History Rewind & `60fps` Benchmark
    const studioCtx = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      deviceScaleFactor: 1,
    });
    let delayedFontCount = 0;
    await studioCtx.route('**/*.woff2', async (route) => {
      delayedFontCount++;
      await new Promise((r) => setTimeout(r, 150));
      await route.continue();
    });

    const studioPage = await studioCtx.newPage();
    await studioPage.goto(`${server.origin}/?pause=1`, { waitUntil: 'load', timeout: 60000 });
    await studioPage.evaluate(() => window.motionReady);

    const studioBench = await studioPage.evaluate(async () => {
      // 1) Measure 1-cycle rewind continuity on `.detail-pan-layer` `history` belt after `150ms` cold webfont load
      window.renderAt(20.0);
      const belt = document.querySelector('#detail-pan-layer ol.history-list[data-belt="gen1"]');
      const h0 = belt.querySelector('li.history-head[data-copy="0"]');
      const h1 = belt.querySelector('li.history-head[data-copy="1"]');
      const h2 = belt.querySelector('li.history-head[data-copy="2"]');
      const cyclePx = h1.offsetTop - h0.offsetTop;

      // Exact wrap timestamp in `[22s, 40s]` where `(t * 44.0) % cyclePx` wraps `cyclePx -> 0`
      const kWrap = Math.ceil((22.0 * 44.0) / cyclePx);
      const tWrap = (kWrap * cyclePx) / 44.0;
      const dt = 1 / 30;

      window.renderAt(tWrap - 0.5 * dt);
      const yBefore = h2.getBoundingClientRect().top;

      window.renderAt(tWrap + 0.5 * dt);
      const yAfter = h1.getBoundingClientRect().top;

      window.renderAt(tWrap + 1.5 * dt);
      const yNext = h1.getBoundingClientRect().top;

      const wrapStepPx = Math.abs(yAfter - yBefore);
      const normalStepPx = Math.abs(yNext - yAfter);
      const seamErrorPx = Math.abs((yAfter - yBefore) - (yNext - yAfter));

      // 2) Studio `1440×960` 30-frame render benchmark in `Act III.2 Helix3D` & `Act III.6 Sphere3D`
      const measureSpanMs = async (startSec) => {
        for (let w = 0; w < 3; w++) {
          window.renderAt(startSec + w * dt);
          document.body.getBoundingClientRect();
        }
        await new Promise((r) => requestAnimationFrame(() => r()));

        let totalMs = 0;
        for (let f = 0; f < 30; f++) {
          const t0 = performance.now();
          window.renderAt(startSec + f * dt);
          // Force synchronous style + layout commit across both overview & detail stages
          document.getElementById('overview-frame').getBoundingClientRect();
          document.getElementById('detail-viewport').getBoundingClientRect();
          totalMs += performance.now() - t0;
        }
        return totalMs / 30;
      };

      const helixAvgMs = await measureSpanMs(92.0);
      const sphereAvgMs = await measureSpanMs(142.0);

      return {
        cyclePx,
        tWrap,
        wrapStepPx,
        normalStepPx,
        seamErrorPx,
        helixAvgMs,
        sphereAvgMs,
      };
    });

    await studioCtx.close();

    const g8KinematicOk =
      kinematicScan.chatterReversals === 0 &&
      kinematicScan.opacityJumps === 0 &&
      kinematicScan.cardZFlips === 0 &&
      kinematicScan.maxFocusStep <= 12.0;

    const g8StudioOk =
      delayedFontCount >= 2 &&
      studioBench.wrapStepPx <= 2.5 &&
      studioBench.seamErrorPx <= 1.0 &&
      studioBench.helixAvgMs <= 18.5 &&
      studioBench.sphereAvgMs <= 18.5;

    if (!g8KinematicOk) console.error('  [G8 운동학 결함]:', kinematicScan);
    if (!g8StudioOk) console.error('  [G8 스튜디오/폰트 결함]:', { delayedFontCount, studioBench });

    gates.push({
      id: 'G8 (6000f 운동학·콜드폰트·60fps)',
      passed: g8KinematicOk && g8StudioOk,
      detail: `진동=${kinematicScan.chatterReversals} · max|Δop|=${kinematicScan.maxFragDeltaOp.toFixed(3)} · 카드팝업=${kinematicScan.cardZFlips} · focusStep=${kinematicScan.maxFocusStep.toFixed(2)}px/f · 콜드폰트되감기=${studioBench.wrapStepPx.toFixed(2)}px(오차 ${studioBench.seamErrorPx.toFixed(3)}px) · 스튜디오=${studioBench.helixAvgMs.toFixed(2)}/${studioBench.sphereAvgMs.toFixed(2)}ms`,
    });

    for (const g of gates) {
      console.log(` [${g.passed ? 'PASS' : 'FAIL'}] ${g.id.padEnd(28)} : ${g.detail}`);
    }
    console.log('------------------------------------------------------------------------------------------------');

    const allPassed = gates.every((g) => g.passed);
    console.log(
      ` 최종 판정: ${
        allPassed
          ? '100% PASS (G1~G8 200.0s 6,000프레임 마스터 정량·운동학 무결성 전수 통과)'
          : 'FAIL (미통과 게이트 교정 필요)'
      }`,
    );
    console.log('================================================================================================\n');

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
