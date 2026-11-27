#!/usr/bin/env node
/**
 * Quantitative Museum-Grade Artwork Integrity Verifier — Round 2 (`scripts/verify-artwork.mjs`)
 *
 * Evaluates 6 strict gates in Headless Chromium (`6480 × 432`, `/?raw=1`):
 *   - G1 (Deterministic Purity): Forward vs scrambled `renderAt(t)` pixel diff === `0 LSB` + all `<img>` decoded.
 *   - G2 (6-View 2D Zero Text Collision): `press(5.0s)`, `page(32.5s)`, `spectrum2D(40.2s + 16px barcode)`, `reading2D(50.0s)`, `meaning2D(66.5s)`, `orbit2D(80.5s)` visible (`opacity >= 0.25`) AABB overlaps === `0`.
 *   - G3 (Pure-White Editorial Ground): Mean pure-white (`RGB >= 245`) ratio across 12 key timestamps `>= 78%`.
 *   - G4 (Zero UI & Zero Burn-In HUD): `<button>`, `<input>`, `←`, `↻`, `0.14 + 0.86`, `6480×432`, `6480x432`, `ACT I`, `BEAT `, `ORIGIN NUCLEUS`, `RE-ASK` === `0`.
 *   - G5 (30m Full-Span Active & White-Out Loop): `[22, 32, 58, 66, 80, 111]` 3-zone active & `|corr| < 0.85` + `t=118.6s` white `>= 99.9%` + loop (`0.0s` vs `119.967s`) `0 LSB`.
 *   - G6 (Zero-Freeze Motion Continuity): `[14, 21, 31, 49, 65, 79, 90, 109]` each `t -> t+1.0s` interval has `changedPixels >= 800`.
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
        return;
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

function countChangedPixels(bufA, bufB, threshold = 6) {
  let changed = 0;
  for (let i = 0; i < FRAME_BYTES; i += 3) {
    const dR = Math.abs(bufA[i] - bufB[i]);
    const dG = Math.abs(bufA[i + 1] - bufB[i + 1]);
    const dB = Math.abs(bufA[i + 2] - bufB[i + 2]);
    if (dR >= threshold || dG >= threshold || dB >= threshold) {
      changed++;
    }
  }
  return changed;
}

function computeWhiteRatioPct(rgb) {
  let whiteCount = 0;
  for (let i = 0; i < FRAME_BYTES; i += 3) {
    if (rgb[i] >= 245 && rgb[i + 1] >= 245 && rgb[i + 2] >= 245) {
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
  const png = await page.screenshot({ type: 'png' });
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
      args: ['--enable-webgl', '--ignore-gpu-blocklist'],
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
    console.log(' 〈정렬과 사선 (Aligned / Skewed)〉 — 프로페셔널 아트 그레이드 6대 정량 무결성 검증 (R2)');
    console.log('========================================================================================');

    // -------------------------------------------------------------------------
    // G1: Deterministic Purity (`max_abs_diff === 0 LSB` + all `<img>` decoded)
    // -------------------------------------------------------------------------
    const g1Times = [5.0, 18.0, 35.0, 65.0, 80.5, 95.0, 110.0];
    const forwardBufs = new Map();
    for (const t of g1Times) {
      forwardBufs.set(t, await captureRgbAt(page, t));
    }

    const scrambledTimes = [95.0, 18.0, 110.0, 5.0, 80.5, 35.0, 65.0];
    let g1MaxDiff = 0;
    for (const t of scrambledTimes) {
      const scrBuf = await captureRgbAt(page, t);
      const diff = maxAbsDiffBuffers(forwardBufs.get(t), scrBuf);
      if (diff > g1MaxDiff) g1MaxDiff = diff;
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
    // G2: 6-Timestamp 2D Zero Text Collision (`press`, `page`, `spectrum2D`, `reading2D`, `meaning2D`, `orbit2D`)
    // -------------------------------------------------------------------------
    const g2Specs = [
      {
        name: 'press',
        t: 5.0,
        selector: '.press-hero-query, .press-memory-line, .press-formula-stamp',
        barcodePad: 0,
      },
      {
        name: 'page',
        t: 32.5,
        selector: '.frag:not(.is-img), .spread-hero-slot',
        barcodePad: 0,
      },
      {
        name: 'spectrum2D',
        t: 40.2,
        selector: '.frag, .laser-telemetry',
        barcodePad: 16,
      },
      {
        name: 'reading2D',
        t: 50.0,
        selector: '.frag:not(.is-img)',
        barcodePad: 0,
      },
      {
        name: 'meaning2D',
        t: 66.5,
        selector: '.frag:not(.is-img)',
        barcodePad: 0,
      },
      {
        name: 'orbit2D',
        t: 80.5,
        selector: '.frag:not(.is-img), .orbit-center-sanctuary',
        barcodePad: 0,
      },
    ];

    let g2TotalCollisions = 0;
    const g2Details = [];

    for (const sp of g2Specs) {
      await page.evaluate((sec) => window.renderAt(sec), sp.t);
      const res = await page.evaluate(
        ({ selector, barcodePad }) => {
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
            if (effOp < 0.25) continue;
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
        { selector: sp.selector, barcodePad: sp.barcodePad },
      );

      g2TotalCollisions += res.collisionCount;
      g2Details.push(`${sp.name}@${sp.t}s:${res.collisionCount}`);
      if (res.collisionCount > 0) {
        console.error(`  [G2 충돌 상세 - ${sp.name}@${sp.t}s]:`, res.samples);
      }
    }

    gates.push({
      id: 'G2 (6-시점 무충돌)',
      passed: g2TotalCollisions === 0,
      detail: `${g2Details.join(' · ')} (총 ${g2TotalCollisions}건)`,
    });

    // -------------------------------------------------------------------------
    // G3: Pure-White Editorial Ground Preservation (`mean >= 78%`)
    // -------------------------------------------------------------------------
    const g3Times = [4, 14, 22, 32, 41, 50, 58, 66, 73, 80, 94, 111];
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
    gates.push({
      id: 'G3 (순백 지면 보존)',
      passed: meanWhitePct >= 78.0,
      detail: `12-시점 평균 순백(>=245) = ${meanWhitePct.toFixed(2)}% (최소 ${minWhitePct.toFixed(2)}%, 기준 >= 78.0%)`,
    });

    // -------------------------------------------------------------------------
    // G4: Zero App UI Chrome & Zero Burn-In HUD Strings
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
    ];
    let g4Violations = 0;
    const g4SampleTimes = [5.0, 16.0, 24.0, 33.0, 41.0, 50.0, 66.0, 80.5, 95.0, 103.0, 111.0];
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

    gates.push({
      id: 'G4 (무크롬·무번인 HUD)',
      passed: g4Violations === 0,
      detail: g4Violations === 0 ? '앱 컨트롤·번인 타임코드·메타 슬로건 노출 = 0건' : g4Notes.join('; '),
    });

    // -------------------------------------------------------------------------
    // G5: 30m Full-Span Active (`[22, 32, 58, 66, 80, 111]`) + White-Out (`118.6s >= 99.9%`) + `0 LSB` Loop
    // -------------------------------------------------------------------------
    const g5Times = [22, 32, 58, 66, 80, 111];
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

    const whiteoutBuf = await getOrCapture(118.6);
    const whiteoutPct = computeWhiteRatioPct(whiteoutBuf);
    const loopStartBuf = await getOrCapture(0.0);
    const loopEndBuf = await getOrCapture(119.967);
    const loopMaxDiff = maxAbsDiffBuffers(loopStartBuf, loopEndBuf);

    const g5Pass = g5AllActive && g5MaxCorr < 0.85 && whiteoutPct >= 99.9 && loopMaxDiff === 0;
    gates.push({
      id: 'G5 (30m 전폭 & 설원 루프)',
      passed: g5Pass,
      detail:
        g5FailNotes.length > 0
          ? g5FailNotes.join(' | ')
          : `3권역 활성 · |corr| = ${g5MaxCorr.toFixed(3)} · t=118.6s 순백 = ${whiteoutPct.toFixed(2)}% · 루프 오차 = ${loopMaxDiff} LSB`,
    });

    // -------------------------------------------------------------------------
    // G6: Zero-Freeze Motion Continuity (`[14, 21, 31, 49, 65, 79, 90, 109]`, `changedPixels >= 800`)
    // -------------------------------------------------------------------------
    const g6Times = [14, 21, 31, 49, 65, 79, 90, 109];
    let g6MinChanged = Infinity;
    const g6FailNotes = [];

    for (const t of g6Times) {
      const bufA = await getOrCapture(t);
      const bufB = await getOrCapture(t + 1.0);
      const changed = countChangedPixels(bufA, bufB, 6);
      if (changed < g6MinChanged) g6MinChanged = changed;
      if (changed < 800) {
        g6FailNotes.push(`${t}->${t + 1}s: ${changed}px`);
      }
    }

    gates.push({
      id: 'G6 (정지 고원 Zero-Freeze)',
      passed: g6FailNotes.length === 0,
      detail:
        g6FailNotes.length === 0
          ? `8개 구간 전수 유영 활성 · 최소 변화 픽셀 = ${g6MinChanged.toLocaleString('en-US')} px (>= 800 px)`
          : `정지 감지: ${g6FailNotes.join(', ')}`,
    });

    for (const g of gates) {
      console.log(` [${g.passed ? 'PASS' : 'FAIL'}] ${g.id.padEnd(25)} : ${g.detail}`);
    }
    console.log('----------------------------------------------------------------------------------------');

    const allPassed = gates.every((g) => g.passed);
    console.log(` 최종 판정: ${allPassed ? '100% PASS (G1~G6 박물관급 무결성 전수 통과)' : 'FAIL (미통과 게이트 교정 필요)'}`);
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
