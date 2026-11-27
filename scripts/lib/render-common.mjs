/**
 * Shared helpers for deterministic 6480x432 headless rendering & static dist serving.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '../..');
export const DIST_DIR = path.join(ROOT_DIR, 'dist');

export const STAGE_W = 6480;
export const STAGE_H = 432;
export const DURATION = 200.0;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

/** Parse `--key=value`, `--key value`, `--flag`, and positional args. */
export function parseCliArgs(argv) {
  const flags = {};
  const positionals = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      flags.help = true;
      continue;
    }
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq !== -1) {
        const key = arg.slice(2, eq);
        const val = arg.slice(eq + 1);
        flags[key] = val;
      } else {
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else {
      positionals.push(arg);
    }
  }
  return { flags, positionals };
}

export function clampRedGain(raw) {
  if (raw === undefined || raw === null || raw === '') return 1.0;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`잘못된 --r-gain 값입니다: ${raw} (허용 범위: 0.50 .. 1.00)`);
  }
  return Math.min(1.0, Math.max(0.5, n));
}

export function ensureBinaryInstalled(cmd, installGuide) {
  const res = spawnSync(cmd, ['-version'], { stdio: 'ignore' });
  if (res.error || res.status !== 0) {
    console.error(`\n[ERROR] '${cmd}' 실행 파일을 찾을 수 없습니다.`);
    console.error(installGuide);
    process.exit(1);
  }
}

export function ensureChromiumInstalled(chromium) {
  let execPath = '';
  try {
    execPath = chromium.executablePath();
  } catch {
    execPath = '';
  }
  if (!execPath || !fs.existsSync(execPath)) {
    console.error('\n[ERROR] Playwright Chromium 브라우저가 아직 설치되지 않았습니다.');
    console.error('다음 명령으로 먼저 설치한 뒤 다시 실행해 주세요:\n');
    console.error('  pnpm setup:render');
    console.error('  # 또는: pnpm exec playwright install chromium\n');
    process.exit(1);
  }
}

export function ensureDistBuilt({ skipBuild = false } = {}) {
  const indexHtml = path.join(DIST_DIR, 'index.html');
  if (skipBuild) {
    if (!fs.existsSync(indexHtml)) {
      console.error('\n[ERROR] --skip-build 옵션을 사용했지만 dist/index.html 이 없습니다.');
      console.error('먼저 `pnpm build` 를 실행하거나 `--skip-build` 옵션을 제거해 주세요.\n');
      process.exit(1);
    }
    return;
  }

  console.log('[build] 최신 프로덕션 번들 빌드 중 (vite build)...');
  const viteBin = path.join(ROOT_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!fs.existsSync(viteBin)) {
    console.error('\n[ERROR] node_modules/vite 를 찾을 수 없습니다. `pnpm install` 을 먼저 실행해 주세요.\n');
    process.exit(1);
  }
  const res = spawnSync(process.execPath, [viteBin, 'build'], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });
  if (res.status !== 0) {
    console.error('\n[ERROR] vite build 에 실패했습니다.');
    process.exit(res.status ?? 1);
  }
  if (!fs.existsSync(indexHtml)) {
    console.error('\n[ERROR] 빌드 후에도 dist/index.html 을 찾을 수 없습니다.');
    process.exit(1);
  }
}

/**
 * Serve `dist/` over an ephemeral local port (127.0.0.1:0) using built-in node:http
 * so rendering never collides with the :4320 dev/preview server.
 */
export async function startDistServer(distDir = DIST_DIR) {
  const resolvedRoot = path.resolve(distDir);

  const server = http.createServer((req, res) => {
    try {
      const reqUrl = new URL(req.url ?? '/', 'http://127.0.0.1');
      let relPath = decodeURIComponent(reqUrl.pathname);
      if (relPath === '/' || relPath === '') relPath = '/index.html';

      const targetPath = path.resolve(resolvedRoot, `.${relPath}`);
      if (!targetPath.startsWith(resolvedRoot + path.sep) && targetPath !== resolvedRoot) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }

      let filePath = targetPath;
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] ?? 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(String(err));
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  const origin = `http://127.0.0.1:${port}`;

  return {
    server,
    port,
    origin,
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
      }),
  };
}

export function formatSeconds(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0.0s';
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}m ${s.toFixed(1).padStart(4, '0')}s`;
}
