#!/usr/bin/env node
/**
 * 12/12 전시 제출용 6480 × 432 무손실 대표 이미지(PNG) 추출기
 *
 * Usage:
 *   node scripts/render-stills.mjs [--times=18.0,39.2,58.0,70.5,83.0,96.5] [--out-dir=renders/stills] [--r-gain=1.0] [--skip-build]
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  clampRedGain,
  ensureChromiumInstalled,
  ensureDistBuilt,
  parseCliArgs,
  ROOT_DIR,
  STAGE_H,
  STAGE_W,
  startDistServer,
} from './lib/render-common.mjs';

const DEFAULT_TIMES = [18.0, 39.2, 58.0, 70.5, 83.0, 96.5];
const DEFAULT_OUT_DIR = 'renders/stills';

function readPngDimensions(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const header = Buffer.alloc(24);
    fs.readSync(fd, header, 0, 24, 0);
    // PNG signature check (89 50 4E 47)
    if (header[0] !== 0x89 || header[1] !== 0x50 || header[2] !== 0x4e || header[3] !== 0x47) {
      return { width: 0, height: 0 };
    }
    return {
      width: header.readUInt32BE(16),
      height: header.readUInt32BE(20),
    };
  } finally {
    fs.closeSync(fd);
  }
}

function parseTimes(raw) {
  if (!raw || raw === true) return DEFAULT_TIMES;
  const parts = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s));
  if (parts.length === 0 || parts.some((n) => !Number.isFinite(n) || n < 0)) {
    throw new Error(`잘못된 --times 값입니다: ${raw} (예: --times=18,58,83)`);
  }
  return parts;
}

async function main() {
  const { flags } = parseCliArgs(process.argv.slice(2));
  if (flags.help) {
    console.log(`
불광천 미디어브릿지 6480×432 대표 이미지(PNG) 추출기

Usage:
  node scripts/render-stills.mjs [options]

Options:
  --times=18.0,39.2,58.0,70.5,83.0,96.5   추출할 타임스탬프 목록(초, 쉼표 구분)
  --out-dir=renders/stills                출력 디렉터리 (기본 renders/stills)
  --r-gain=1.0                            현장 적색기 보정 R 채널 배율 0.50..1.00
  --skip-build                            vite build 생략
  -h, --help                              도움말 출력
`);
    return;
  }

  const times = parseTimes(flags.times);
  const outDir = path.resolve(ROOT_DIR, String(flags['out-dir'] ?? DEFAULT_OUT_DIR));
  const rGain = clampRedGain(flags['r-gain'] ?? flags.rgain ?? 1.0);
  const skipBuild = flags['skip-build'] === true || flags['skip-build'] === '1';

  ensureChromiumInstalled(chromium);
  ensureDistBuilt({ skipBuild });
  fs.mkdirSync(outDir, { recursive: true });

  const serverHandle = await startDistServer();
  let browser = null;

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
    const pageUrl = `${serverHandle.origin}/?raw=1&rgain=${rGain.toFixed(4)}`;

    console.log(`\n[stills] 대표 이미지 ${times.length}장 추출 시작 (${STAGE_W}×${STAGE_H} PNG · R-Gain=${rGain.toFixed(2)})`);
    await page.goto(pageUrl, { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => window.motionReady);

    const results = [];
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      await page.evaluate((sec) => window.renderAt(sec), t);
      const rgSuffix = rGain < 0.9999 ? `-rgain${rGain.toFixed(2)}` : '';
      const filename = `still-${String(i + 1).padStart(2, '0')}-t${t.toFixed(1).padStart(5, '0')}s${rgSuffix}.png`;
      const outPath = path.join(outDir, filename);
      await page.screenshot({ path: outPath, type: 'png' });

      const dim = readPngDimensions(outPath);
      const sizeKB = fs.statSync(outPath).size / 1024;
      if (dim.width !== STAGE_W || dim.height !== STAGE_H) {
        throw new Error(`스틸 해상도 불일치 (${filename}): ${dim.width}×${dim.height}`);
      }
      results.push({ filename, outPath, t, dim, sizeKB });
      console.log(`  [${i + 1}/${times.length}] t=${t.toFixed(1).padStart(5)}s -> ${path.relative(ROOT_DIR, outPath)} (${dim.width}×${dim.height}, ${sizeKB.toFixed(1)} KB)`);
    }

    console.log(`\n[stills] 완료! 총 ${results.length}장 생성 -> ${path.relative(ROOT_DIR, outDir)}/\n`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    await serverHandle.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error('\n[ERROR] 대표 이미지 추출 실패:', err?.message ?? err);
  process.exit(1);
});
