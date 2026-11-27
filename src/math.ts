/** Deterministic math, 120 BPM rhythm helpers & team-original motion easing curves. */

import { BPM, DURATION, STAGE_H, STAGE_W } from './data/timeline.ts';

export { BPM, DURATION, STAGE_H, STAGE_W };
export const BEAT = 60 / BPM; // 0.50s

export const RED_GAIN_MIN = 0.5;
export const RED_GAIN_MAX = 1.0;

export const ORANGE: Record<1 | 2 | 3 | 4, string> = {
  1: '#ff9e4d',
  2: '#ffaf66',
  3: '#ffc080',
  4: '#ffd09a',
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

/** Exact art-hackathon motion_concept.html easing curves */
export const easeOut = (x: number): number => 1 - Math.pow(1 - clamp(x), 3.2);
export const easeOutExpo = (x: number): number => {
  const c = clamp(x);
  return c >= 1 ? 1 : 1 - Math.pow(2, -10 * c);
};
export const easeOutCubic = (x: number): number => 1 - Math.pow(1 - clamp(x), 3);
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

/** Deterministic hash in [0, 1) matching art-hackathon motion_deconstruct.html */
export function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/** 120 BPM beat pulse envelope in [0, 1]: sharp attack on each 0.50s downbeat, crisp decay */
export function beatPulse(t: number, subdiv = 1): number {
  const phase = (t * (BPM / 60) * subdiv) % 1;
  return Math.exp(-phase * 5.2);
}

/** Smooth curved bow interpolation directly inheriting motion_deconstruct.html */
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
