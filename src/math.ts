/** Deterministic math, 120 BPM musical score helpers, Catmull-Rom splines & easing curves. */

import { BPM, DURATION, STAGE_H, STAGE_W } from './data/timeline.ts';

export { BPM, DURATION, STAGE_H, STAGE_W };
export const BEAT = 60 / BPM; // 0.50s exact downbeat

export const RED_GAIN_MIN = 0.5;
export const RED_GAIN_MAX = 1.0;

/** Golden-amber 4-step silkscreen palette calibrated for high separation from #FF0000 under outdoor LED */
export const ORANGE: Record<1 | 2 | 3 | 4, string> = {
  1: '#ff9626',
  2: '#ffa947',
  3: '#ffbc6b',
  4: '#ffcf8e',
};

export const COLOR_BLUE = '#0000ff';
export const COLOR_RED = '#ff0000';
export const COLOR_BLACK = '#000000';
export const COLOR_WHITE = '#ffffff';

export const clamp = (v: number, a = 0, b = 1): number => (v < a ? a : v > b ? b : v);

/** Clamp LED red-tint rehearsal calibration gain strictly within [0.50, 1.00]. */
export function clampRedGain(v: number): number {
  return Number.isFinite(v) ? clamp(v, RED_GAIN_MIN, RED_GAIN_MAX) : 1.0;
}

/** Parse `?rgain=<0.50..1.00>` query parameter (defaults to 1.0). */
export function parseRedGain(params: URLSearchParams): number {
  const raw = params.get('rgain');
  if (raw === null || raw.trim() === '') return 1.0;
  return clampRedGain(Number(raw));
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const progress = (t: number, a: number, b: number): number =>
  b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a), 0, 1);

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const u = progress(x, edge0, edge1);
  return u * u * (3 - 2 * u);
};

export const easeOut = (x: number): number => 1 - Math.pow(1 - clamp(x), 3.2);
export const easeOutExpo = (x: number): number => {
  const c = clamp(x);
  return c >= 1 ? 1 : 1 - Math.pow(2, -10 * c);
};
export const easeOutCubic = (x: number): number => 1 - Math.pow(1 - clamp(x), 3);
export const easeInCubic = (x: number): number => {
  const c = clamp(x);
  return c * c * c;
};
export const easeInOut = (x: number): number => {
  const c = clamp(x);
  return c < 0.5 ? 8 * c * c * c * c : 1 - Math.pow(-2 * c + 2, 4) / 2;
};
export const easeInOutCubic = (x: number): number => {
  const c = clamp(x);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

export const span = (t: number, a: number, b: number, easeFn: (u: number) => number = easeOut): number =>
  easeFn(progress(t, a, b));

export const win = (t: number, a: number, b: number, fade = 0.25): number =>
  Math.min(progress(t, a, a + fade), 1 - progress(t, b - fade, b));

/** Deterministic hash in [0, 1) */
export function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/** 120 BPM beat pulse envelope in [0, 1]: razor-sharp attack on each 0.50s downbeat, crisp decay */
export function beatPulse(t: number, subdiv = 1): number {
  const phase = (t * (BPM / 60) * subdiv) % 1;
  return Math.exp(-phase * 5.6);
}

/** Percussive 1~3 frame hard-cut flash window (`[tBeat, tBeat + frames/30]`) */
export function hardCutFlash(t: number, beatTime: number, frames = 2): number {
  const dur = frames / 30;
  return t >= beatTime && t < beatTime + dur ? 1 - (t - beatTime) / dur : 0;
}

/** Smooth curved bow interpolation */
export function stepArc(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  u: number,
  curve: number,
): [number, number] {
  const nx = -(y1 - y0);
  const ny = x1 - x0;
  const len = Math.hypot(nx, ny) || 1;
  const bow = Math.sin(Math.PI * u) * curve;
  return [lerp(x0, x1, u) + (nx / len) * bow, lerp(y0, y1, u) + (ny / len) * bow];
}

/** 1D Catmull-Rom spline interpolation (`u in [0, 1]`) with overshoot clamping when endpoints are flat */
export function catmullRom(p0: number, p1: number, p2: number, p3: number, u: number): number {
  const t = clamp(u, 0, 1);
  if (Math.abs(p2 - p1) < 1e-6 && Math.abs(p1 - p0) < 1e-6 && Math.abs(p3 - p2) < 1e-6) {
    return p1;
  }
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

export interface CameraKeyframe {
  readonly t: number;
  readonly cx: number;
  readonly cy: number;
  readonly zoom: number;
  readonly hold?: boolean;
}

/**
 * Evaluate a deterministic Catmull-Rom 2D/3D viewport camera spline.
 */
export function evalCameraRig(keyframes: readonly CameraKeyframe[], t: number): { cx: number; cy: number; zoom: number } {
  const n = keyframes.length;
  if (n === 0) return { cx: STAGE_W * 0.5, cy: STAGE_H * 0.5, zoom: 1 };
  if (t <= keyframes[0]!.t) {
    const k = keyframes[0]!;
    return { cx: k.cx, cy: k.cy, zoom: k.zoom };
  }
  if (t >= keyframes[n - 1]!.t) {
    const k = keyframes[n - 1]!.t === t ? keyframes[n - 1]! : keyframes[n - 1]!;
    return { cx: k.cx, cy: k.cy, zoom: k.zoom };
  }

  let seg = 0;
  for (let i = 0; i < n - 1; i++) {
    if (t >= keyframes[i]!.t && t < keyframes[i + 1]!.t) {
      seg = i;
      break;
    }
  }

  const k1 = keyframes[seg]!;
  const k2 = keyframes[seg + 1]!;
  if (k1.hold) {
    return { cx: k1.cx, cy: k1.cy, zoom: k1.zoom };
  }

  const k0 = keyframes[Math.max(0, seg - 1)]!;
  const k3 = keyframes[Math.min(n - 1, seg + 2)]!;
  const rawU = progress(t, k1.t, k2.t);
  const u = easeInOutCubic(rawU);

  return {
    cx: clamp(catmullRom(k0.cx, k1.cx, k2.cx, k3.cx, u), 200, STAGE_W - 200),
    cy: clamp(catmullRom(k0.cy, k1.cy, k2.cy, k3.cy, u), 40, STAGE_H - 40),
    zoom: clamp(catmullRom(k0.zoom, k1.zoom, k2.zoom, k3.zoom, u), 1.0, 3.6),
  };
}
