#!/usr/bin/env node
/**
 * Quantitative Museum-Grade Artwork Integrity Verifier (`scripts/verify-artwork.mjs`)
 *
 * Evaluates 5 strict gates in Headless Chromium (`6480 × 432`, `/?raw=1`):
 *   - G1 (Deterministic Purity): Forward vs reverse/random-jump `renderAt(t)` pixel diff === `0 LSB` + all `<img>` decoded.
 *   - G2 (2D Settled Zero Text Collision): `reading2D` (50.0s), `meaning2D` (66.5s), `orbit2D` (80.5s) visible (`opacity >= 0.30`) text AABB overlaps === `0`.
 *   - G3 (Pure-White Editorial Ground): Mean pure-white (`RGB >= 245`) ratio across 12 key timestamps `>= 78%`.
 *   - G4 (Zero App UI Chrome): `<button>`, `<input>`, browser nav glyphs (`←`, `↻`), tutorial formula (`0.14 + 0.86`) count === `0`.
 *   - G5 (30m Full-Span Active & Non-Duplicated + Seamless Loop): Left/Center/Right zones all active with `corr < 0.85`, and loop seam (`0.0s` vs `119.967s`) `<= 2 LSB`.
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
  const zoneW = STAGE_W / 3; // 2160
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

    console.log('\n================================================================================');
    console.log(' 〈정렬과 사선 (Aligned / Skewed)〉 — 프로페셔널 아트 그레이드 5대 정량 무결성 검증');
    console.log('================================================================================');

    // -------------------------------------------------------------------------
    // G1: Deterministic Purity (`max_abs_diff === 0 LSB` + all `<img>` decoded)
    // -------------------------------------------------------------------------
    const g1Times = [6.0, 18.0, 36.0, 65.0, 80.0, 96.0, 110.0];
    const forwardBufs = new Map();
    for (const t of g1Times) {
      forwardBufs.set(t, await captureRgbAt(page, t));
    }

    const scrambledTimes = [96.0, 18.0, 110.0, 6.0, 80.0, 36.0, 65.0];
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
    // G2: 2D Settled Views Zero Text-Text Collision (`reading2D`, `meaning2D`, `orbit2D`)
    // -------------------------------------------------------------------------
    const g2Specs = [
      { name: 'reading2D', t: 50.0 },
      { name: 'meaning2D', t: 66.5 },
      { name: 'orbit2D', t: 80.5 },
    ];
    let g2TotalCollisions = 0;
    const g2Details = [];

    for (const sp of g2Specs) {
      await page.evaluate((sec) => window.renderAt(sec), sp.t);
      const res = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('.frag:not(.is-img), .orbit-center-sanctuary'));
        const boxes = [];
        for (const el of nodes) {
          const cs = window.getComputedStyle(el);
          const op = parseFloat(cs.opacity || '0');
          if (op < 0.3) continue;
          const r = el.getBoundingClientRect();
          if (r.width <= 0.5 || r.height <= 0.5) continue;
          boxes.push({
            text: (el.textContent || '').trim().slice(0, 24),
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
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
      });
      g2TotalCollisions += res.collisionCount;
      g2Details.push(`${sp.name}@${sp.t}s: ${res.collisionCount}건 (가시 ${res.visibleCount}개)`);
      if (res.collisionCount > 0) {
        console.error(`  [G2 충돌 상세 - ${sp.name}]:`, res.samples);
      }
    }

    gates.push({
      id: 'G2 (2D 텍스트 무충돌)',
      passed: g2TotalCollisions === 0,
      detail: g2Details.join(' · '),
    });

    // -------------------------------------------------------------------------
    // G3: Pure-White Editorial Ground Preservation (`mean >= 78%`)
    // -------------------------------------------------------------------------
    const g3Times = [4, 14, 24, 33, 42, 50, 58, 66, 73, 80, 94, 110];
    const whitePcts = [];
    for (const t of g3Times) {
      const rgb = forwardBufs.get(t) ?? (await captureRgbAt(page, t));
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
    // G4: Zero App UI Chrome (`<button>`, `<input>`, `←`, `↻`, `0.14 + 0.86` === 0)
    // -------------------------------------------------------------------------
    let g4Violations = 0;
    const g4SampleTimes = [5.0, 24.0, 33.0, 50.0, 80.5, 96.0, 110.0];
    const g4Notes = [];
    for (const t of g4SampleTimes) {
      await page.evaluate((sec) => window.renderAt(sec), t);
      const uiRes = await page.evaluate(() => {
        const stage = document.querySelector('.motion-stage') || document.body;
        const controls = stage.querySelectorAll('button, input, select, textarea').length;
        const txt = stage.textContent || '';
        const hasNav = (txt.includes('←') ? 1 : 0) + (txt.includes('↻') ? 1 : 0);
        const hasFormula = txt.includes('0.14 + 0.86') ? 1 : 0;
        return { controls, hasNav, hasFormula };
      });
      const v = uiRes.controls + uiRes.hasNav + uiRes.hasFormula;
      if (v > 0) {
        g4Violations += v;
        g4Notes.push(`t=${t}s: ctrl=${uiRes.controls}, nav=${uiRes.hasNav}, formula=${uiRes.hasFormula}`);
      }
    }
    gates.push({
      id: 'G4 (무크롬 Zero-UI)',
      passed: g4Violations === 0,
      detail: g4Violations === 0 ? 'button/input/toolbar(←,↻)/수식(0.14+0.86) = 0건' : g4Notes.join('; '),
    });

    // -------------------------------------------------------------------------
    // G5: 30m Full-Span Active & Non-Duplicated (`corr < 0.85`) + Loop Seam (`<= 2 LSB`)
    // -------------------------------------------------------------------------
    const g5Times = [23, 33, 58, 66, 80, 112];
    let g5AllActive = true;
    let g5MaxCorr = 0;
    const g5FailNotes = [];

    for (const t of g5Times) {
      const rgb = forwardBufs.get(t) ?? (await captureRgbAt(page, t));
      const z = analyzeThreeZones(rgb);
      const activeHere = z.ink[0] >= 500 && z.ink[1] >= 500 && z.ink[2] >= 500;
      const maxC = Math.max(Math.abs(z.corr01), Math.abs(z.corr12));
      if (maxC > g5MaxCorr) g5MaxCorr = maxC;
      if (!activeHere || maxC >= 0.85) {
        g5AllActive = false;
        g5FailNotes.push(`t=${t}s ink=[${z.ink.join(',')}] corr=(${z.corr01.toFixed(3)}, ${z.corr12.toFixed(3)})`);
      }
    }

    const loopStartBuf = await captureRgbAt(page, 0.0);
    const loopEndBuf = await captureRgbAt(page, 119.967);
    const loopMaxDiff = maxAbsDiffBuffers(loopStartBuf, loopEndBuf);

    const g5Pass = g5AllActive && g5MaxCorr < 0.85 && loopMaxDiff <= 2;
    gates.push({
      id: 'G5 (30m 전폭 & 무이음 루프)',
      passed: g5Pass,
      detail:
        g5FailNotes.length > 0
          ? g5FailNotes.join(' | ')
          : `3권역 전수 활성 · 최대 상관계수 |corr| = ${g5MaxCorr.toFixed(3)} (< 0.85) · 루프 오차 = ${loopMaxDiff} LSB (<= 2 LSB)`,
    });

    for (const g of gates) {
      console.log(` [${g.passed ? 'PASS' : 'FAIL'}] ${g.id.padEnd(24)} : ${g.detail}`);
    }
    console.log('--------------------------------------------------------------------------------');

    const allPassed = gates.every((g) => g.passed);
    console.log(` 최종 판정: ${allPassed ? '100% PASS (미술관급 무결성 검증 통과)' : 'FAIL (미통과 게이트 교정 필요)'}`);
    console.log('================================================================================\n');

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
