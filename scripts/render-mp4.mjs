#!/usr/bin/env node
/**
 * 불광천 미디어브릿지 공식 규격 (6480 × 432, H.264 MP4, 무음, <= 900 MB)
 * 병렬 결정론적 무임시파일(Zero-Temp-File) MP4 렌더링 파이프라인
 *
 * Usage:
 *   node scripts/render-mp4.mjs [options]
 *
 * Options:
 *   --fps=30              출력 프레임레이트 (기본 30; 60 등 지정 가능)
 *   --start=0             렌더링 시작 초 (기본 0)
 *   --duration=<초>       렌더링 길이 초 (기본 DURATION - start)
 *   --out=<경로>          출력 MP4 경로 (기본 renders/bulgwangcheon-aligned-skewed-6480x432-master.mp4)
 *   --workers=<N>         병렬 Headless Chromium 페이지 수 (기본 Math.min(4, Math.max(2, cpus - 2)))
 *   --crf=15              x264 CRF 화질 (기본 15)
 *   --maxrate=50M         VBV 최대 비트레이트 (기본 50M -> 2분 최대 <= 750 MB)
 *   --bufsize=100M        VBV 버퍼 크기 (기본 100M)
 *   --r-gain=1.0          LED 적색기 보정 R 채널 배율 0.50..1.00 (기본 1.0)
 *   --skip-build          dist/가 이미 최신일 때 vite build 생략
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  clampRedGain,
  DURATION,
  ensureBinaryInstalled,
  ensureChromiumInstalled,
  ensureDistBuilt,
  formatSeconds,
  parseCliArgs,
  ROOT_DIR,
  STAGE_H,
  STAGE_W,
  startDistServer,
} from './lib/render-common.mjs';
import { verifyMp4 } from './verify-mp4.mjs';

const DEFAULT_OUT = 'renders/bulgwangcheon-aligned-skewed-6480x432-master.mp4';

const FFMPEG_INSTALL_GUIDE = [
  'FFmpeg / FFprobe 설치 방법:',
  '  - macOS (Homebrew): brew install ffmpeg',
  '  - Ubuntu / Debian : sudo apt update && sudo apt install -y ffmpeg',
  '  - Windows (winget): winget install Gyan.FFmpeg',
].join('\n');

function printHelp() {
  console.log(`
불광천 미디어브릿지 6480×432 결정론적 MP4 렌더러

Usage:
  node scripts/render-mp4.mjs [options]

Options:
  --fps=30              프레임레이트 (기본 30, 예: --fps=60)
  --start=0             시작 초 (기본 0)
  --duration=<초>       렌더 길이 초 (기본 120 - start)
  --out=<파일>          출력 MP4 경로 (기본 ${DEFAULT_OUT})
  --workers=<N>         병렬 Chromium 워커 수 (기본 min(4, max(2, cpus - 2)))
  --crf=15              libx264 CRF (기본 15)
  --maxrate=50M         VBV maxrate (기본 50M)
  --bufsize=100M        VBV bufsize (기본 100M)
  --r-gain=1.0          현장 적색기 보정 R 채널 배율 0.50..1.00 (기본 1.0)
  --skip-build          vite build 생략
  -h, --help            도움말 출력
`);
}

function waitForDrain(stream) {
  return new Promise((resolve, reject) => {
    const onDrain = () => {
      cleanup();
      resolve();
    };
    const onError = (err) => {
      cleanup();
      reject(err);
    };
    const onClose = () => {
      cleanup();
      reject(new Error('ffmpeg stdin 스트림이 예기치 않게 종료되었습니다.'));
    };
    const cleanup = () => {
      stream.off('drain', onDrain);
      stream.off('error', onError);
      stream.off('close', onClose);
    };
    stream.once('drain', onDrain);
    stream.once('error', onError);
    stream.once('close', onClose);
  });
}

async function main() {
  const { flags } = parseCliArgs(process.argv.slice(2));
  if (flags.help) {
    printHelp();
    return;
  }

  const fps = flags.fps !== undefined ? Number(flags.fps) : 30;
  const start = flags.start !== undefined ? Number(flags.start) : 0;
  const duration = flags.duration !== undefined ? Number(flags.duration) : Math.max(0, DURATION - start);
  const outArg = String(flags.out ?? DEFAULT_OUT);
  const outPath = path.resolve(ROOT_DIR, outArg);
  const defaultWorkers = Math.min(4, Math.max(2, os.cpus().length - 2));
  const workers = flags.workers !== undefined ? Math.max(1, Math.floor(Number(flags.workers))) : defaultWorkers;
  const crf = flags.crf !== undefined ? Number(flags.crf) : 15;
  const maxrate = String(flags.maxrate ?? '50M');
  const bufsize = String(flags.bufsize ?? '100M');
  const rGain = clampRedGain(flags['r-gain'] ?? flags.rgain ?? 1.0);
  const skipBuild = flags['skip-build'] === true || flags['skip-build'] === '1';

  if (!Number.isFinite(fps) || fps <= 0) throw new Error(`잘못된 --fps 값: ${flags.fps}`);
  if (!Number.isFinite(start) || start < 0) throw new Error(`잘못된 --start 값: ${flags.start}`);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`잘못된 --duration 값: ${flags.duration}`);
  if (!Number.isFinite(crf) || crf < 0 || crf > 51) throw new Error(`잘못된 --crf 값: ${flags.crf}`);

  const totalFrames = Math.round(duration * fps);
  if (totalFrames < 1) throw new Error(`렌더 프레임 수가 1 미만입니다 (duration=${duration}, fps=${fps}).`);
  const effectiveWorkers = Math.min(workers, totalFrames);
  const maxInFlight = effectiveWorkers * 2;

  // 1. Pre-flight environment checks
  ensureBinaryInstalled('ffmpeg', FFMPEG_INSTALL_GUIDE);
  ensureBinaryInstalled('ffprobe', FFMPEG_INSTALL_GUIDE);
  ensureChromiumInstalled(chromium);

  // 2. Build latest dist/ (unless --skip-build)
  ensureDistBuilt({ skipBuild });

  // 3. Ensure parent output directory exists
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  console.log('\n[render] 파이프라인 설정');
  console.log(`  - 해상도 / FPS : ${STAGE_W} × ${STAGE_H} (15:1) @ ${fps} fps`);
  console.log(`  - 구간 / 총장수: ${start.toFixed(2)}s .. ${(start + duration).toFixed(2)}s (${duration.toFixed(2)}s · ${totalFrames} frames)`);
  console.log(`  - 인코더       : libx264 · preset=medium · crf=${crf} · maxrate=${maxrate} · bufsize=${bufsize} · yuv420p · bt709 · -an`);
  console.log(`  - 병렬 워커    : ${effectiveWorkers} pages (슬라이딩 윈도우 maxInFlight=${maxInFlight})`);
  console.log(`  - Red-Gain     : ${rGain.toFixed(2)}${rGain < 0.9999 ? ' (현장 적색기 보정 적용)' : ' (원본 sRGB)'}`);
  console.log(`  - 출력 파일    : ${path.relative(ROOT_DIR, outPath) || outPath}\n`);

  const serverHandle = await startDistServer();
  let browser = null;
  let ffmpeg = null;

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

    const pageUrl = `${serverHandle.origin}/?raw=1&rgain=${rGain.toFixed(4)}`;
    console.log(`[render] Headless Chromium ${effectiveWorkers}개 워커 초기화 중 (${pageUrl})...`);

    const pages = await Promise.all(
      Array.from({ length: effectiveWorkers }, async () => {
        const context = await browser.newContext({
          viewport: { width: STAGE_W, height: STAGE_H },
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();
        await page.goto(pageUrl, { waitUntil: 'load', timeout: 60000 });
        await page.evaluate(() => window.motionReady);
        return page;
      }),
    );

    const ffmpegArgs = [
      '-y',
      '-f', 'image2pipe',
      '-vcodec', 'png',
      '-framerate', String(fps),
      '-i', '-',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', String(crf),
      '-maxrate', maxrate,
      '-bufsize', bufsize,
      '-profile:v', 'high',
      '-level:v', '5.1',
      '-pix_fmt', 'yuv420p',
      '-colorspace', 'bt709',
      '-color_primaries', 'bt709',
      '-color_trc', 'bt709',
      '-movflags', '+faststart',
      '-an',
      outPath,
    ];

    ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
    const stderrTail = [];
    ffmpeg.stderr.on('data', (chunk) => {
      stderrTail.push(chunk.toString());
      if (stderrTail.length > 40) stderrTail.shift();
    });

    let aborted = false;
    let fatalError = null;
    const windowWaiters = [];
    const wakeWindowWaiters = () => {
      while (windowWaiters.length > 0) {
        const fn = windowWaiters.shift();
        fn();
      }
    };
    const waitForWindowSlot = () =>
      new Promise((resolve) => {
        windowWaiters.push(resolve);
      });

    const abortWith = (err) => {
      if (!fatalError) fatalError = err;
      aborted = true;
      wakeWindowWaiters();
    };

    const ffmpegExitPromise = new Promise((resolve, reject) => {
      ffmpeg.once('error', (err) => {
        abortWith(err);
        reject(err);
      });
      ffmpeg.once('close', (code, signal) => {
        if (code === 0) {
          resolve();
        } else {
          const msg = `ffmpeg 종료 오류 (code=${code}, signal=${signal}):\n${stderrTail.join('')}`;
          const err = new Error(msg);
          abortWith(err);
          reject(err);
        }
      });
    });

    ffmpeg.stdin.on('error', (err) => {
      if (!aborted) abortWith(err);
    });

    // Sliding-window parallel render -> ordered image2pipe writer
    const completed = new Map();
    let nextToSchedule = 0;
    let framesWritten = 0;
    let flushing = false;
    let flushPending = false;
    let flushDoneResolve = null;
    let flushDonePromise = Promise.resolve();

    const renderStartMs = Date.now();
    let lastLogMs = 0;
    const isTTY = Boolean(process.stdout.isTTY);

    const logProgress = (force = false) => {
      const now = Date.now();
      if (!force && now - lastLogMs < (isTTY ? 200 : 1200) && framesWritten < totalFrames) return;
      lastLogMs = now;
      const elapsedSec = Math.max(0.001, (now - renderStartMs) / 1000);
      const avgFps = framesWritten / elapsedSec;
      const remainingFrames = totalFrames - framesWritten;
      const etaSec = avgFps > 0 ? remainingFrames / avgFps : 0;
      const pct = ((framesWritten / totalFrames) * 100).toFixed(1);
      const line = `[render] ${framesWritten}/${totalFrames} (${pct}%) · 경과 ${formatSeconds(elapsedSec)} · 평균 ${avgFps.toFixed(2)} fps · 남은 시간 ~${formatSeconds(etaSec)}`;
      if (isTTY) {
        process.stdout.write(`\r${line}   `);
        if (framesWritten === totalFrames) process.stdout.write('\n');
      } else {
        console.log(line);
      }
    };

    const scheduleFlush = () => {
      if (flushing) {
        flushPending = true;
        return;
      }
      flushing = true;
      flushDonePromise = (async () => {
        try {
          do {
            flushPending = false;
            while (!aborted && completed.has(framesWritten)) {
              const buf = completed.get(framesWritten);
              completed.delete(framesWritten);
              const ok = ffmpeg.stdin.write(buf);
              if (!ok) {
                await waitForDrain(ffmpeg.stdin);
              }
              framesWritten++;
              wakeWindowWaiters();
              logProgress(framesWritten === totalFrames);
            }
          } while (!aborted && flushPending);
        } catch (err) {
          abortWith(err);
        } finally {
          flushing = false;
          if (flushDoneResolve) {
            const r = flushDoneResolve;
            flushDoneResolve = null;
            r();
          }
        }
      })();
    };

    const runWorker = async (page) => {
      while (!aborted) {
        while (!aborted && nextToSchedule < totalFrames && nextToSchedule - framesWritten >= maxInFlight) {
          await waitForWindowSlot();
        }
        if (aborted || nextToSchedule >= totalFrames) break;

        const frameIdx = nextToSchedule++;
        const sec = start + frameIdx / fps;
        await page.evaluate((s) => window.renderAt(s), sec);
        const pngBuf = await page.screenshot({ type: 'png', timeout: 0 });
        if (aborted) break;

        completed.set(frameIdx, pngBuf);
        scheduleFlush();
      }
    };

    console.log('[render] 프레임 렌더링 및 H.264 실시간 파이핑 시작...');
    await Promise.all(pages.map((p) => runWorker(p).catch((err) => abortWith(err))));
    await flushDonePromise;

    if (fatalError) {
      throw fatalError;
    }

    ffmpeg.stdin.end();
    await ffmpegExitPromise;

    const totalElapsed = (Date.now() - renderStartMs) / 1000;
    console.log(
      `[render] 인코딩 완료! 총 ${totalFrames} frames · 소요 ${formatSeconds(totalElapsed)} (평균 ${(totalFrames / Math.max(0.001, totalElapsed)).toFixed(2)} fps)`,
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    await serverHandle.close().catch(() => {});
    if (ffmpeg && ffmpeg.exitCode === null) {
      try {
        ffmpeg.kill('SIGTERM');
      } catch {
        // ignore
      }
    }
  }

  // 4. Automatic delivery spec verification
  const report = await verifyMp4(outPath, {
    expectedFps: fps,
    expectedDuration: duration,
  });
  if (!report.ok) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n[ERROR] 렌더링 실패:', err?.message ?? err);
  process.exit(1);
});
