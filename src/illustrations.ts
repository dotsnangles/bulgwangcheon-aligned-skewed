/** Procedural editorial archival plate illustrations (pure #FFF/#000/#0000FF/#FF9E4D/#FF0000 print grammar). */

export interface ArchivalPlateSpec {
  id: string;
  label: string;
  cluster: number;
  kind:
    | 'recipe-grid'
    | 'salinity-curve'
    | 'onggi-pores'
    | 'salt-bloom'
    | 'hopper-crystal'
    | 'cubic-lattice'
    | 'diapir-strata'
    | 'drill-core'
    | 'fluid-bubble'
    | 'polarizer-cross'
    | 'ice-core-bubbles'
    | 'sandstone-wind';
}

export const ARCHIVAL_PLATES: ArchivalPlateSpec[] = [
  { id: 'img_00', label: '표준 염도 계량 도표', cluster: 0, kind: 'recipe-grid' },
  { id: 'img_01', label: '가열 시간·수분 증발 곡선', cluster: 0, kind: 'salinity-curve' },
  { id: 'img_02', label: '옹기 미세 기공 단면도', cluster: 1, kind: 'onggi-pores' },
  { id: 'img_03', label: '항아리 유약 위 소금 꽃', cluster: 1, kind: 'salt-bloom' },
  { id: 'img_04', label: '정육면체 호퍼 결정 계단', cluster: 2, kind: 'hopper-crystal' },
  { id: 'img_05', label: '염화나트륨 입방 격자', cluster: 2, kind: 'cubic-lattice' },
  { id: 'img_06', label: '페름기 암염 돔 단층도', cluster: 3, kind: 'diapir-strata' },
  { id: 'img_07', label: '지하 812m 시추 코어 기록', cluster: 3, kind: 'drill-core' },
  { id: 'img_08', label: '암염 음결정 유체 기포', cluster: 4, kind: 'fluid-bubble' },
  { id: 'img_09', label: '편광 현미경 간섭 소광 십자', cluster: 4, kind: 'polarizer-cross' },
  { id: 'img_10', label: '남극 빙하 3000m 고대 기포', cluster: 5, kind: 'ice-core-bubbles' },
  { id: 'img_11', label: '사막 사암 풍성 사층리', cluster: 5, kind: 'sandstone-wind' },
];

const cache = new Map<string, string>();

/** Renders a razor-sharp 240x160 editorial print-plate data URL matching team original flat color blocks + ink lines. */
export function renderEditorialPlate(spec: ArchivalPlateSpec): string {
  const existing = cache.get(spec.id);
  if (existing) return existing;

  const w = 240;
  const h = 160;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.25;

  switch (spec.kind) {
    case 'recipe-grid': {
      ctx.fillStyle = '#0000ff';
      ctx.fillRect(14, 14, 72, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px "Noto Serif KR", Georgia, serif';
      ctx.fillText('ALIGNED 0.8', 20, 29);
      ctx.strokeStyle = '#000000';
      for (let r = 0; r < 5; r++) {
        ctx.beginPath();
        ctx.moveTo(14, 48 + r * 22);
        ctx.lineTo(w - 14, 48 + r * 22);
        ctx.stroke();
      }
      for (let c = 0; c < 4; c++) {
        ctx.beginPath();
        ctx.moveTo(14 + c * 70, 48);
        ctx.lineTo(14 + c * 70, 136);
        ctx.stroke();
      }
      ctx.fillStyle = '#0000ff';
      ctx.fillRect(84, 70, 70, 22);
      break;
    }
    case 'salinity-curve': {
      ctx.strokeStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(24, 18);
      ctx.lineTo(24, 138);
      ctx.lineTo(220, 138);
      ctx.stroke();
      for (let i = 1; i <= 4; i++) {
        ctx.strokeStyle = 'rgba(0,0,0,0.16)';
        ctx.beginPath();
        ctx.moveTo(24, 138 - i * 26);
        ctx.lineTo(220, 138 - i * 26);
        ctx.stroke();
      }
      ctx.strokeStyle = '#0000ff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let x = 0; x <= 190; x += 4) {
        const u = x / 190;
        const y = 132 - Math.pow(u, 1.65) * 96;
        if (x === 0) ctx.moveTo(26 + x, y);
        else ctx.lineTo(26 + x, y);
      }
      ctx.stroke();
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(154, 74, 4.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'onggi-pores': {
      ctx.fillStyle = '#ffd09a';
      ctx.fillRect(14, 14, w - 28, h - 28);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 18; i++) {
        const cx = 32 + ((i * 53) % 176);
        const cy = 28 + ((i * 37) % 104);
        const rx = 8 + (i % 5) * 3.5;
        const ry = 6 + ((i + 2) % 4) * 3;
        ctx.fillStyle = i % 3 === 0 ? '#ffffff' : '#ff9e4d';
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, (i * 0.7) % Math.PI, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.strokeStyle = '#ff0000';
      ctx.beginPath();
      ctx.moveTo(24, 132);
      ctx.bezierCurveTo(80, 108, 132, 46, 214, 30);
      ctx.stroke();
      break;
    }
    case 'salt-bloom': {
      ctx.fillStyle = '#ff9e4d';
      ctx.fillRect(14, 14, w - 28, h - 28);
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#ffffff';
      const drawCluster = (cx: number, cy: number, r: number) => {
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          ctx.stroke();
          ctx.fillRect(cx + Math.cos(a) * r * 0.65 - 3, cy + Math.sin(a) * r * 0.65 - 3, 6, 6);
          ctx.strokeRect(cx + Math.cos(a) * r * 0.65 - 3, cy + Math.sin(a) * r * 0.65 - 3, 6, 6);
        }
      };
      drawCluster(76, 82, 34);
      drawCluster(164, 70, 28);
      drawCluster(130, 114, 20);
      break;
    }
    case 'hopper-crystal': {
      ctx.fillStyle = '#ffaf66';
      ctx.fillRect(14, 14, w - 28, h - 28);
      const cx = w / 2;
      const cy = h / 2;
      for (let k = 7; k >= 1; k--) {
        const s = k * 15;
        ctx.fillStyle = k % 2 === 0 ? '#ffffff' : '#ffd09a';
        ctx.fillRect(cx - s * 1.18, cy - s * 0.82, s * 2.36, s * 1.64);
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(cx - s * 1.18, cy - s * 0.82, s * 2.36, s * 1.64);
      }
      ctx.strokeStyle = '#ff0000';
      ctx.beginPath();
      ctx.moveTo(cx - 105, cy - 66);
      ctx.lineTo(cx + 105, cy + 66);
      ctx.moveTo(cx + 105, cy - 66);
      ctx.lineTo(cx - 105, cy + 66);
      ctx.stroke();
      break;
    }
    case 'cubic-lattice': {
      for (let y = 20; y <= 140; y += 24) {
        for (let x = 24; x <= 216; x += 24) {
          ctx.strokeStyle = 'rgba(0,0,0,0.45)';
          ctx.strokeRect(x - 12, y - 12, 24, 24);
          ctx.fillStyle = ((x + y) / 24) % 2 === 0 ? '#0000ff' : '#ff9e4d';
          ctx.beginPath();
          ctx.arc(x, y, 3.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'diapir-strata': {
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        const baseY = 26 + i * 14;
        for (let x = 14; x <= w - 14; x += 6) {
          const dx = (x - w / 2) / 58;
          const dome = Math.exp(-dx * dx) * 34 * (1 - i * 0.06);
          const y = baseY + 18 - dome;
          if (x === 14) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = i === 4 ? '#ff0000' : '#000000';
        ctx.lineWidth = i === 4 ? 1.8 : 1.1;
        ctx.stroke();
      }
      break;
    }
    case 'drill-core': {
      const bands = ['#ffffff', '#ffd09a', '#ffffff', '#ffaf66', '#ffffff', '#ff9e4d', '#ffffff', '#0000ff', '#ffffff', '#ffc080'];
      for (let i = 0; i < bands.length; i++) {
        const y0 = 16 + i * 12.8;
        ctx.fillStyle = bands[i]!;
        ctx.fillRect(54, y0, 132, 12.8);
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(54, y0, 132, 12.8);
        ctx.beginPath();
        ctx.moveTo(34, y0 + 6);
        ctx.lineTo(50, y0 + 6);
        ctx.stroke();
      }
      ctx.strokeStyle = '#ff0000';
      ctx.beginPath();
      ctx.moveTo(192, 16);
      ctx.lineTo(192, 144);
      ctx.stroke();
      break;
    }
    case 'fluid-bubble': {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(14, 14, w - 28, h - 28);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(42, 26, 156, 108);
      ctx.fillStyle = '#ffd09a';
      ctx.fillRect(54, 38, 132, 84);
      ctx.strokeRect(54, 38, 132, 84);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(114, 80, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(154, 64, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      break;
    }
    case 'polarizer-cross': {
      const cx = w / 2;
      const cy = h / 2;
      for (let r = 64; r >= 12; r -= 12) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = r % 24 === 0 ? '#0000ff' : '#ff9e4d';
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(22, cy);
      ctx.lineTo(w - 22, cy);
      ctx.moveTo(cx, 16);
      ctx.lineTo(cx, h - 16);
      ctx.stroke();
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(cx + 16, cy - 12, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'ice-core-bubbles': {
      ctx.fillStyle = '#0000ff';
      ctx.fillRect(14, 14, w - 28, h - 28);
      for (let i = 0; i < 24; i++) {
        const cx = 30 + ((i * 47) % 180);
        const cy = 28 + ((i * 29) % 104);
        const r = 3.5 + (i % 5) * 2.4;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        if (i % 6 === 0) {
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
      break;
    }
    case 'sandstone-wind': {
      ctx.fillStyle = '#ffd09a';
      ctx.fillRect(14, 14, w - 28, h - 28);
      for (let row = 0; row < 4; row++) {
        const y0 = 24 + row * 31;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(14, y0);
        ctx.lineTo(w - 14, y0);
        ctx.stroke();
        for (let k = 0; k < 8; k++) {
          const sx = 24 + k * 27 + (row % 2) * 10;
          ctx.beginPath();
          ctx.moveTo(sx, y0);
          ctx.quadraticCurveTo(sx - 10, y0 + 22, sx - 24, y0 + 31);
          ctx.strokeStyle = k === 4 ? '#ff0000' : '#000000';
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
      }
      break;
    }
  }

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0.75, 0.75, w - 1.5, h - 1.5);

  const url = canvas.toDataURL('image/png');
  cache.set(spec.id, url);
  return url;
}
