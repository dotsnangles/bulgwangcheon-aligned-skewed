/**
 * Interactive Live Studio Preview UI (`http://127.0.0.1:4320/` & GitHub Pages)
 * External to `?raw=1` stage: keeps stage 100% Zero-UI while giving curators & directors
 * 15:1 full-span overview + 1:1 native-pixel viewport + Act I..IV jump + `?rgain=` + deep-link sharing.
 */

import { DURATION, SCENES, STAGE_CAPTIONS, STAGE_H, STAGE_W } from './data/timeline.ts';
import { createMotionStage } from './engine/stage.ts';
import { beatPulse, clamp, parseRedGain } from './math.ts';

function fmtTime(sec: number): string {
  const s = ((sec % DURATION) + DURATION) % DURATION;
  const mm = Math.floor(s / 60);
  const rem = s - mm * 60;
  return `${String(mm).padStart(2, '0')}:${rem.toFixed(1).padStart(4, '0')}`;
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fallback below
    }
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  document.body.append(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } finally {
    ta.remove();
  }
}

export function mountStudio(app: HTMLElement): void {
  const urlParams = new URLSearchParams(window.location.search);
  const redGain = parseRedGain(urlParams);
  const hasRedGain = redGain < 0.9999;

  const shell = document.createElement('div');
  shell.className = 'studio-shell';
  shell.innerHTML = `
    <header class="studio-topbar">
      <div class="studio-brand">
        <h1>정렬과 사선 (Aligned / Skewed)</h1>
        <span>6480 × 432 px (15:1) Moving Image · 120 BPM · 200.0s (03:20.0) · Zero-UI Exhibition Master</span>
      </div>
      <div class="studio-meta-links">
        ${hasRedGain ? `<span class="rgain-badge" title="현장 리허설 적색기 보정 활성">R-Gain ${redGain.toFixed(2)}</span>` : ''}
        <button type="button" class="ctrl-btn" id="btn-copy-link">현재 장면 링크 복사</button>
        <a id="link-raw-mode" href="?raw=1&t=0.0" target="_blank" rel="noreferrer">Raw 6480×432 Stage (?raw=1)</a>
      </div>
    </header>

    <section class="studio-overview-section">
      <div class="studio-section-head">
        <span><strong>FULL 6480 × 432 PANORAMA OVERVIEW (15:1)</strong> — 클릭·드래그하여 디테일 뷰포트 즉시 이동</span>
        <span id="ov-coords">x = 0 .. 1920 px</span>
      </div>
      <div class="overview-frame" id="overview-frame">
        <div class="overview-scaler" id="overview-scaler"></div>
        <div class="overview-lens" id="overview-lens"></div>
      </div>
    </section>

    <section class="studio-detail-section">
      <div class="studio-section-head">
        <span><strong>NATIVE PIXEL DETAIL VIEWPORT</strong> — 좌클릭 드래그로 0..6480px 패닝 <span class="studio-caption-readout" id="studio-caption-readout"></span></span>
        <div class="detail-controls-inline">
          <button type="button" class="ctrl-btn is-active" id="btn-autofollow">Auto-Follow: ON</button>
          <button type="button" class="ctrl-btn is-active" id="btn-zoom-1x">1:1 (100%)</button>
          <button type="button" class="ctrl-btn" id="btn-zoom-065x">0.65x</button>
        </div>
      </div>
      <div class="detail-viewport" id="detail-viewport">
        <div class="detail-pan-layer" id="detail-pan-layer"></div>
      </div>
    </section>

    <footer class="studio-controls">
      <div class="controls-row">
        <button type="button" class="ctrl-btn is-primary" id="btn-play">Pause (Space)</button>
        <span class="time-readout" id="time-readout">00:00.0 / 03:20.0</span>
        <div class="scrubber-wrap">
          <input type="range" id="scrubber" min="0" max="${DURATION}" step="0.05" value="0" aria-label="타임라인 스크러버" />
        </div>
        <div class="bpm-indicator">
          <span class="bpm-dot" id="bpm-dot"></span>
          <span id="bpm-text">120 BPM · B001</span>
        </div>
      </div>
      <div class="controls-row" id="scene-speed-row"></div>
    </footer>
  `;
  app.append(shell);

  const btnCopyLink = shell.querySelector<HTMLButtonElement>('#btn-copy-link')!;
  const linkRawMode = shell.querySelector<HTMLAnchorElement>('#link-raw-mode')!;

  const overviewFrame = shell.querySelector<HTMLElement>('#overview-frame')!;
  const overviewScaler = shell.querySelector<HTMLElement>('#overview-scaler')!;
  const overviewLens = shell.querySelector<HTMLElement>('#overview-lens')!;
  const ovCoords = shell.querySelector<HTMLElement>('#ov-coords')!;
  const captionReadout = shell.querySelector<HTMLElement>('#studio-caption-readout')!;

  const detailViewport = shell.querySelector<HTMLElement>('#detail-viewport')!;
  const detailPanLayer = shell.querySelector<HTMLElement>('#detail-pan-layer')!;
  const btnAutofollow = shell.querySelector<HTMLButtonElement>('#btn-autofollow')!;
  const btnZoom1x = shell.querySelector<HTMLButtonElement>('#btn-zoom-1x')!;
  const btnZoom065x = shell.querySelector<HTMLButtonElement>('#btn-zoom-065x')!;

  const btnPlay = shell.querySelector<HTMLButtonElement>('#btn-play')!;
  const timeReadout = shell.querySelector<HTMLElement>('#time-readout')!;
  const scrubber = shell.querySelector<HTMLInputElement>('#scrubber')!;
  const bpmDot = shell.querySelector<HTMLElement>('#bpm-dot')!;
  const bpmText = shell.querySelector<HTMLElement>('#bpm-text')!;
  const sceneSpeedRow = shell.querySelector<HTMLElement>('#scene-speed-row')!;

  const sceneBtns: HTMLButtonElement[] = SCENES.map((sc) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ctrl-btn scene-btn';
    btn.textContent = sc.label;
    btn.addEventListener('click', () => {
      curTime = sc.t;
      renderBoth(curTime, true);
    });
    sceneSpeedRow.append(btn);
    return btn;
  });

  const speeds = [0.5, 1, 2] as const;
  let playSpeed = 1;
  const speedBtns: HTMLButtonElement[] = speeds.map((sp) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `ctrl-btn${sp === 1 ? ' is-active' : ''}`;
    btn.textContent = `${sp}x`;
    btn.style.marginLeft = sp === 0.5 ? 'auto' : '0';
    btn.addEventListener('click', () => {
      playSpeed = sp;
      speedBtns.forEach((b, i) => b.classList.toggle('is-active', speeds[i] === sp));
    });
    sceneSpeedRow.append(btn);
    return btn;
  });

  const overviewStage = createMotionStage(overviewScaler, { canvasScale: 0.25, redGain });
  const detailStage = createMotionStage(detailPanLayer, { canvasScale: 1.0, redGain });

  const rawT = urlParams.get('t');
  const parsedT = rawT !== null && rawT.trim() !== '' ? Number(rawT) : NaN;
  let curTime = Number.isFinite(parsedT) ? ((parsedT % DURATION) + DURATION) % DURATION : 0;

  const rawX = urlParams.get('x');
  const parsedX = rawX !== null && rawX.trim() !== '' ? Number(rawX) : NaN;
  const hasExplicitX = Number.isFinite(parsedX);

  const rawZoom = urlParams.get('zoom');
  const parsedZoom = rawZoom !== null && rawZoom.trim() !== '' ? Number(rawZoom) : NaN;
  let detailZoom = Number.isFinite(parsedZoom) && parsedZoom <= 0.8 ? 0.65 : 1.0;

  let playing = urlParams.get('pause') !== '1' && urlParams.get('pause') !== 'true';
  let autoFollow = !hasExplicitX;
  let panCenterX = hasExplicitX ? clamp(parsedX, 0, STAGE_W) : detailStage.getFocusX(curTime);

  const syncControlButtonStates = () => {
    btnPlay.textContent = playing ? 'Pause (Space)' : 'Play (Space)';
    btnPlay.classList.toggle('is-primary', playing);
    btnAutofollow.textContent = `Auto-Follow: ${autoFollow ? 'ON' : 'OFF'}`;
    btnAutofollow.classList.toggle('is-active', autoFollow);
    btnZoom1x.classList.toggle('is-active', detailZoom === 1.0);
    btnZoom065x.classList.toggle('is-active', detailZoom === 0.65);
  };
  syncControlButtonStates();

  let lastRawHref = '';
  const buildRawHref = (t: number): string => {
    const q = new URLSearchParams();
    q.set('raw', '1');
    q.set('t', t.toFixed(1));
    if (hasRedGain) q.set('rgain', redGain.toFixed(2));
    return `?${q.toString()}`;
  };

  const syncRawLink = (t: number) => {
    const nextHref = buildRawHref(t);
    if (nextHref !== lastRawHref) {
      lastRawHref = nextHref;
      linkRawMode.setAttribute('href', nextHref);
    }
  };

  linkRawMode.addEventListener('pointerdown', () => syncRawLink(curTime));
  linkRawMode.addEventListener('click', () => syncRawLink(curTime));

  let copyFeedbackTimer: number | null = null;
  btnCopyLink.addEventListener('click', async () => {
    const shareUrl = new URL(window.location.href);
    const q = new URLSearchParams();
    q.set('t', curTime.toFixed(1));
    q.set('x', String(Math.round(panCenterX)));
    q.set('zoom', detailZoom === 0.65 ? '0.65' : '1');
    q.set('pause', '1');
    if (hasRedGain) q.set('rgain', redGain.toFixed(2));
    shareUrl.search = `?${q.toString()}`;

    await copyTextToClipboard(shareUrl.toString());
    window.history.replaceState(null, '', `${shareUrl.pathname}${shareUrl.search}${shareUrl.hash}`);

    btnCopyLink.textContent = '링크 복사 완료!';
    btnCopyLink.classList.add('is-active');
    if (copyFeedbackTimer !== null) window.clearTimeout(copyFeedbackTimer);
    copyFeedbackTimer = window.setTimeout(() => {
      btnCopyLink.textContent = '현재 장면 링크 복사';
      btnCopyLink.classList.remove('is-active');
      copyFeedbackTimer = null;
    }, 1800);
  });

  let ovScale = 0.2;
  let detailViewW = 1280;

  function syncLayoutSizes() {
    const ovW = Math.max(320, overviewFrame.clientWidth);
    ovScale = ovW / STAGE_W;
    overviewFrame.style.height = `${Math.round(STAGE_H * ovScale)}px`;
    overviewScaler.style.transform = `scale(${ovScale})`;

    detailViewW = Math.max(320, detailViewport.clientWidth);
    detailViewport.style.height = `${Math.round(STAGE_H * detailZoom)}px`;
    updatePanVisual();
  }

  function updatePanVisual() {
    const visibleStageW = Math.min(STAGE_W, detailViewW / detailZoom);
    const halfVis = visibleStageW * 0.5;
    panCenterX = clamp(panCenterX, halfVis, STAGE_W - halfVis);
    const leftStageX = panCenterX - halfVis;
    detailPanLayer.style.transform = `scale(${detailZoom}) translateX(${(-leftStageX).toFixed(1)}px)`;

    overviewLens.style.left = `${(leftStageX * ovScale).toFixed(1)}px`;
    overviewLens.style.width = `${(visibleStageW * ovScale).toFixed(1)}px`;
    ovCoords.textContent = `x = ${Math.round(leftStageX)} .. ${Math.round(leftStageX + visibleStageW)} px (${Math.round(detailZoom * 100)}%)`;
  }

  const ro = new ResizeObserver(syncLayoutSizes);
  ro.observe(overviewFrame);
  ro.observe(detailViewport);
  syncLayoutSizes();

  function renderBoth(t: number, snapCamera = false, dtSec = 1 / 60) {
    overviewStage.renderAt(t);
    detailStage.renderAt(t);

    if (autoFollow) {
      const targetX = detailStage.getFocusX(t);
      const smoothAlpha = 1 - Math.exp(-Math.max(0.001, dtSec) * 4.2);
      panCenterX = snapCamera ? targetX : panCenterX + (targetX - panCenterX) * smoothAlpha;
    }
    updatePanVisual();
    syncRawLink(t);

    timeReadout.textContent = `${fmtTime(t)} / 03:20.0`;
    scrubber.value = t.toFixed(2);

    const activeCap = STAGE_CAPTIONS.find((c) => t >= c.a && t < c.b);
    captionReadout.textContent = activeCap ? `· ${activeCap.text}` : '';

    const p = beatPulse(t, 1);
    bpmDot.style.transform = `scale(${(0.85 + p * 0.55).toFixed(3)})`;
    const beatNum = Math.floor(t * 2) + 1;
    bpmText.textContent = `120 BPM · B${String(beatNum).padStart(3, '0')}`;

    sceneBtns.forEach((btn, idx) => {
      const sc = SCENES[idx]!;
      btn.classList.toggle('is-current', t >= sc.start && t < sc.end);
    });
  }

  const togglePlay = () => {
    playing = !playing;
    syncControlButtonStates();
  };
  btnPlay.addEventListener('click', togglePlay);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) {
      e.preventDefault();
      togglePlay();
    } else if (e.code === 'ArrowRight') {
      curTime = (curTime + 2.0) % DURATION;
      renderBoth(curTime, true);
    } else if (e.code === 'ArrowLeft') {
      curTime = (curTime - 2.0 + DURATION) % DURATION;
      renderBoth(curTime, true);
    }
  });

  scrubber.addEventListener('input', () => {
    curTime = Number(scrubber.value);
    renderBoth(curTime, true);
  });

  btnAutofollow.addEventListener('click', () => {
    autoFollow = !autoFollow;
    syncControlButtonStates();
  });

  btnZoom1x.addEventListener('click', () => {
    detailZoom = 1.0;
    syncControlButtonStates();
    syncLayoutSizes();
  });

  btnZoom065x.addEventListener('click', () => {
    detailZoom = 0.65;
    syncControlButtonStates();
    syncLayoutSizes();
  });

  let ovDragging = false;
  const panFromOverview = (clientX: number) => {
    const rect = overviewFrame.getBoundingClientRect();
    const frac = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    autoFollow = false;
    syncControlButtonStates();
    panCenterX = frac * STAGE_W;
    updatePanVisual();
  };
  overviewFrame.addEventListener('pointerdown', (e) => {
    ovDragging = true;
    overviewFrame.setPointerCapture(e.pointerId);
    panFromOverview(e.clientX);
  });
  overviewFrame.addEventListener('pointermove', (e) => {
    if (ovDragging) panFromOverview(e.clientX);
  });
  overviewFrame.addEventListener('pointerup', () => {
    ovDragging = false;
  });

  let detailDragX: number | null = null;
  detailViewport.addEventListener('pointerdown', (e) => {
    detailDragX = e.clientX;
    detailViewport.classList.add('is-dragging');
    detailViewport.setPointerCapture(e.pointerId);
    autoFollow = false;
    syncControlButtonStates();
  });
  detailViewport.addEventListener('pointermove', (e) => {
    if (detailDragX === null) return;
    const dx = e.clientX - detailDragX;
    detailDragX = e.clientX;
    panCenterX -= dx / detailZoom;
    updatePanVisual();
  });
  const stopDetailDrag = () => {
    detailDragX = null;
    detailViewport.classList.remove('is-dragging');
  };
  detailViewport.addEventListener('pointerup', stopDetailDrag);
  detailViewport.addEventListener('pointercancel', stopDetailDrag);

  window.MOTION_DURATION = DURATION;
  window.renderAt = (t: number) => {
    playing = false;
    syncControlButtonStates();
    curTime = ((t % DURATION) + DURATION) % DURATION;
    renderBoth(curTime, true);
  };
  window.getFocusX = (t: number) => detailStage.getFocusX(t);

  let lastTs = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.08, (now - lastTs) / 1000);
    lastTs = now;
    if (playing) {
      curTime = (curTime + dt * playSpeed) % DURATION;
      renderBoth(curTime, false, dt);
    }
    requestAnimationFrame(tick);
  };

  renderBoth(curTime, true);
  requestAnimationFrame(tick);
}
