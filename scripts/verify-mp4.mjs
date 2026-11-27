#!/usr/bin/env node
/**
 * 은평문화재단 불광천 미디어브릿지 공식 납품 규격 자동 검수기
 * - 해상도: 정확히 6480 × 432 (15:1)
 * - 비디오 코덱: H.264 (`h264`), 픽셀 포맷: `yuv420p`
 * - 오디오 스트림: 0개 (무음 규격)
 * - 파일 크기: <= 900.0 MB
 * - 프레임 수 및 길이 정합성
 * - 200초 마스터(duration >= 199.5s) 시 첫 프레임/마지막 프레임 순백 루프 이음매 오차 (max_abs_diff <= 4 LSB) 자동 검증
 *
 * Usage:
 *   node scripts/verify-mp4.mjs [path/to/video.mp4]
 */

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ensureBinaryInstalled, parseCliArgs, ROOT_DIR, STAGE_H, STAGE_W } from './lib/render-common.mjs';

const DEFAULT_MP4 = path.join(ROOT_DIR, 'renders', 'bulgwangcheon-aligned-skewed-6480x432-master.mp4');
const MAX_SIZE_MB = 900.0;
const LOOP_MAX_ABS_DIFF_LSB = 4;

const FFMPEG_INSTALL_GUIDE = [
  'FFmpeg / FFprobe 설치 방법:',
  '  - macOS (Homebrew): brew install ffmpeg',
  '  - Ubuntu / Debian : sudo apt update && sudo apt install -y ffmpeg',
  '  - Windows (winget): winget install Gyan.FFmpeg',
].join('\n');

function parseRate(rateStr) {
  if (!rateStr || rateStr === '0/0') return 0;
  const parts = String(rateStr).split('/');
  if (parts.length === 2) {
    const num = Number(parts[0]);
    const den = Number(parts[1]);
    return den > 0 ? num / den : 0;
  }
  const n = Number(rateStr);
  return Number.isFinite(n) ? n : 0;
}

function runRawFrameExtract(ffmpegArgs, expectedBytes, keepLastOnly = false) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    const chunks = [];
    let total = 0;

    // For tail-only mode, maintain a compact sliding buffer <= 2 * expectedBytes
    let tailBuf = Buffer.alloc(0);

    proc.stdout.on('data', (chunk) => {
      if (keepLastOnly) {
        tailBuf = Buffer.concat([tailBuf, chunk]);
        if (tailBuf.length > expectedBytes * 2) {
          tailBuf = tailBuf.subarray(tailBuf.length - expectedBytes);
        }
      } else {
        chunks.push(chunk);
        total += chunk.length;
      }
    });

    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr.trim()}`));
        return;
      }
      if (keepLastOnly) {
        if (tailBuf.length < expectedBytes) {
          reject(new Error(`마지막 프레임 추출 바이트 부족: ${tailBuf.length} < ${expectedBytes}`));
          return;
        }
        resolve(tailBuf.subarray(tailBuf.length - expectedBytes));
      } else {
        const full = Buffer.concat(chunks, total);
        if (full.length < expectedBytes) {
          reject(new Error(`첫 프레임 추출 바이트 부족: ${full.length} < ${expectedBytes}`));
          return;
        }
        resolve(full.subarray(0, expectedBytes));
      }
    });
  });
}

async function checkLoopSeam(absPath, width, height) {
  const frameBytes = width * height * 3;
  const firstFrame = await runRawFrameExtract(
    ['-v', 'error', '-i', absPath, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'],
    frameBytes,
    false,
  );
  const lastFrame = await runRawFrameExtract(
    ['-v', 'error', '-sseof', '-0.5', '-i', absPath, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'],
    frameBytes,
    true,
  );

  let maxAbsDiff = 0;
  let sumAbsDiff = 0;
  let minFirst = 255;
  let minLast = 255;

  for (let i = 0; i < frameBytes; i++) {
    const a = firstFrame[i];
    const b = lastFrame[i];
    const d = a >= b ? a - b : b - a;
    if (d > maxAbsDiff) maxAbsDiff = d;
    sumAbsDiff += d;
    if (a < minFirst) minFirst = a;
    if (b < minLast) minLast = b;
  }

  const meanAbsDiff = sumAbsDiff / frameBytes;
  return {
    maxAbsDiff,
    meanAbsDiff,
    minFirst,
    minLast,
    passed: maxAbsDiff <= LOOP_MAX_ABS_DIFF_LSB,
  };
}

export async function verifyMp4(targetPath = DEFAULT_MP4, options = {}) {
  ensureBinaryInstalled('ffprobe', FFMPEG_INSTALL_GUIDE);
  ensureBinaryInstalled('ffmpeg', FFMPEG_INSTALL_GUIDE);

  const absPath = path.resolve(ROOT_DIR, targetPath);
  const relLabel = path.relative(ROOT_DIR, absPath) || absPath;

  if (!fs.existsSync(absPath)) {
    const report = {
      ok: false,
      filePath: absPath,
      checks: [{ name: '파일 존재', passed: false, detail: `파일을 찾을 수 없습니다: ${relLabel}` }],
      metadata: null,
    };
    if (!options.silent) printReport(report, relLabel);
    return report;
  }

  const stat = fs.statSync(absPath);
  const sizeBytes = stat.size;
  const sizeMB = sizeBytes / (1024 * 1024);

  const probe = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', absPath],
    { encoding: 'utf-8' },
  );

  if (probe.status !== 0) {
    const report = {
      ok: false,
      filePath: absPath,
      checks: [{ name: 'ffprobe 분석', passed: false, detail: probe.stderr?.trim() || 'ffprobe 실패' }],
      metadata: null,
    };
    if (!options.silent) printReport(report, relLabel);
    return report;
  }

  const data = JSON.parse(probe.stdout);
  const streams = Array.isArray(data.streams) ? data.streams : [];
  const videoStreams = streams.filter((s) => s.codec_type === 'video');
  const audioStreams = streams.filter((s) => s.codec_type === 'audio');
  const v = videoStreams[0];

  if (!v) {
    const report = {
      ok: false,
      filePath: absPath,
      checks: [{ name: '비디오 스트림', passed: false, detail: '비디오 스트림이 없습니다.' }],
      metadata: null,
    };
    if (!options.silent) printReport(report, relLabel);
    return report;
  }

  const width = Number(v.width ?? 0);
  const height = Number(v.height ?? 0);
  const codec = String(v.codec_name ?? '');
  const pixFmt = String(v.pix_fmt ?? '');
  const fps = parseRate(v.avg_frame_rate) || parseRate(v.r_frame_rate);
  const duration = Number(v.duration ?? data.format?.duration ?? 0);
  let nbFrames = Number(v.nb_frames ?? 0);

  if (!Number.isFinite(nbFrames) || nbFrames <= 0) {
    const pktRes = spawnSync(
      'ffprobe',
      [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-count_packets',
        '-show_entries', 'stream=nb_read_packets',
        '-of', 'csv=p=0',
        absPath,
      ],
      { encoding: 'utf-8' },
    );
    nbFrames = Number(String(pktRes.stdout ?? '').trim());
  }

  const expectedDurFromFrames = fps > 0 ? nbFrames / fps : 0;
  const durTol = fps > 0 ? Math.max(0.15, 2 / fps) : 0.2;
  const durConsistent =
    Number.isFinite(duration) &&
    duration > 0 &&
    Number.isFinite(nbFrames) &&
    nbFrames > 0 &&
    Math.abs(expectedDurFromFrames - duration) <= durTol &&
    (options.expectedFps ? Math.abs(fps - options.expectedFps) <= 0.05 : true) &&
    (options.expectedDuration ? Math.abs(duration - options.expectedDuration) <= durTol : true);

  const checks = [
    {
      name: `해상도 (${STAGE_W}×${STAGE_H} / 15:1)`,
      passed: width === STAGE_W && height === STAGE_H,
      detail: `${width} × ${height} (${height > 0 ? (width / height).toFixed(2) : '?'}:1)`,
    },
    {
      name: '비디오 코덱 (H.264)',
      passed: codec === 'h264',
      detail: `${codec}${v.profile ? ` (${v.profile}${v.level ? ` L${(v.level / 10).toFixed(1)}` : ''})` : ''}`,
    },
    {
      name: '픽셀 포맷 (yuv420p)',
      passed: pixFmt === 'yuv420p',
      detail: pixFmt || '(none)',
    },
    {
      name: '오디오 스트림 (0개 · 무음)',
      passed: audioStreams.length === 0,
      detail: `${audioStreams.length}개`,
    },
    {
      name: `파일 크기 (<= ${MAX_SIZE_MB.toFixed(1)} MB)`,
      passed: sizeBytes > 0 && sizeMB <= MAX_SIZE_MB,
      detail: `${sizeMB.toFixed(2)} MB (${sizeBytes.toLocaleString('en-US')} bytes)`,
    },
    {
      name: '프레임 수 · 길이 정합성',
      passed: durConsistent,
      detail: `${nbFrames} frames @ ${fps.toFixed(2)} fps = ${expectedDurFromFrames.toFixed(2)}s (컨테이너 ${duration.toFixed(2)}s)`,
    },
  ];

  let loopInfo = null;
  const shouldCheckLoop = options.checkLoop === true || duration >= 199.5;
  if (shouldCheckLoop && width === STAGE_W && height === STAGE_H) {
    loopInfo = await checkLoopSeam(absPath, width, height);
    checks.push({
      name: `루프 이음매 오차 (<= ${LOOP_MAX_ABS_DIFF_LSB} LSB)`,
      passed: loopInfo.passed,
      detail: `max_abs_diff = ${loopInfo.maxAbsDiff} LSB · mean = ${loopInfo.meanAbsDiff.toFixed(3)} LSB (min RGB: 첫=${loopInfo.minFirst}, 끝=${loopInfo.minLast})`,
    });
  }

  const ok = checks.every((c) => c.passed);
  const metadata = {
    width,
    height,
    codec,
    pixFmt,
    fps,
    nbFrames,
    duration,
    audioStreams: audioStreams.length,
    sizeBytes,
    sizeMB,
    loopInfo,
  };

  const report = { ok, filePath: absPath, checks, metadata };
  if (!options.silent) printReport(report, relLabel);
  return report;
}

function printReport(report, relLabel) {
  console.log('\n========================================================================');
  console.log(` 불광천 미디어브릿지 납품 규격 검수 리포트`);
  console.log(` 대상: ${relLabel}`);
  console.log('------------------------------------------------------------------------');
  for (const c of report.checks) {
    const tag = c.passed ? 'PASS' : 'FAIL';
    console.log(` [${tag}] ${c.name.padEnd(28)} : ${c.detail}`);
  }
  console.log('------------------------------------------------------------------------');
  console.log(` 최종 판정: ${report.ok ? 'PASS (공식 송출 규격 적합)' : 'FAIL (규격 미달 항목 확인 필요)'}`);
  console.log('========================================================================\n');
}

// CLI entry point
const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const { flags, positionals } = parseCliArgs(process.argv.slice(2));
  if (flags.help) {
    console.log(`
Usage:
  node scripts/verify-mp4.mjs [path/to/video.mp4] [--check-loop]

Defaults:
  path/to/video.mp4  renders/bulgwangcheon-aligned-skewed-6480x432-master.mp4
`);
    process.exit(0);
  }

  const target = flags.file ?? positionals[0] ?? DEFAULT_MP4;
  const checkLoop = flags['check-loop'] === true || flags['check-loop'] === '1';

  verifyMp4(target, { checkLoop })
    .then((res) => {
      process.exit(res.ok ? 0 : 1);
    })
    .catch((err) => {
      console.error('\n[ERROR] 검수 중 오류가 발생했습니다:', err);
      process.exit(1);
    });
}
