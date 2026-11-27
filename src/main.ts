/**
 * Entry point:
 * 1) Pure 6480x432 headless/broadcast Zero-UI moving-image mode: `?raw=1&t=<seconds>&rgain=<0.50..1.00>`
 * 2) Live interactive Studio Preview UI: default (`http://127.0.0.1:4320/`)
 *
 * Guarantees both self-hosted variable web fonts AND all 21 fine-press lithograph `.webp` plates
 * are 100% loaded & decoded before `window.motionReady` resolves.
 */

import './style.css';
import { DURATION } from './data/timeline.ts';
import { createMotionStage } from './engine/stage.ts';
import { preloadAllPlates } from './illustrations.ts';
import { parseRedGain } from './math.ts';
import { mountStudio } from './studio.ts';

declare global {
  interface Window {
    renderAt: (seconds: number) => void;
    getFocusX?: (seconds: number) => number;
    MOTION_DURATION: number;
    motionReady: Promise<boolean>;
  }
}

const params = new URLSearchParams(window.location.search);
const isRawMode = params.get('raw') === '1' || params.get('raw') === 'true';
const app = document.getElementById('app')!;

if (isRawMode) {
  document.body.classList.add('raw-mode');
  const redGain = parseRedGain(params);
  const stage = createMotionStage(app, { canvasScale: 1.0, redGain });
  window.MOTION_DURATION = DURATION;
  window.renderAt = (seconds: number) => {
    stage.renderAt(seconds);
  };
  window.getFocusX = (seconds: number) => stage.getFocusX(seconds);
  const initialT = params.has('t') ? Number(params.get('t')) : 0;
  window.motionReady = Promise.all([document.fonts.ready, preloadAllPlates(app)]).then(() => {
    stage.renderAt(Number.isFinite(initialT) ? initialT : 0);
    return true;
  });
} else {
  mountStudio(app);
  window.motionReady = Promise.all([document.fonts.ready, preloadAllPlates(app)]).then(() => true);
}
