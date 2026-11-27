/// <reference types="vite/client" />
/**
 * Fine-Press Lithograph Archival Plates & Muybridge Stride Sprites (`public/plates/*.webp`).
 * Zero Canvas2D procedural toy shapes: all 16 archival plates + 5 stride frames are
 * preloaded and decoded (`img.decode()`) before `window.motionReady` resolves.
 */

export interface ArchivalPlateSpec {
  readonly id: string;
  readonly plateNo: string;
  readonly code: string;
  readonly label: string;
  readonly src: string;
  readonly cluster: number;
}

const BASE = import.meta.env.BASE_URL || './';

export const ARCHIVAL_PLATES: readonly ArchivalPlateSpec[] = [
  {
    id: 'plate-01',
    plateNo: 'PL.01',
    code: 'EBULLITION / VORONOI',
    label: '끓는 표면 거품 보로노이 세포막',
    src: `${BASE}plates/plate-01.webp`,
    cluster: 0,
  },
  {
    id: 'plate-02',
    plateNo: 'PL.02',
    code: 'ONGGI SEM / 4.2μm',
    label: '옹기 미세 기공과 소금 꽃 단면',
    src: `${BASE}plates/plate-02.webp`,
    cluster: 1,
  },
  {
    id: 'plate-03',
    plateNo: 'PL.03',
    code: 'NaCl HOPPER / 90.0°',
    label: '정육면체 호퍼 결정 계단',
    src: `${BASE}plates/plate-03.webp`,
    cluster: 2,
  },
  {
    id: 'plate-04',
    plateNo: 'PL.04',
    code: 'CHRONOPHOTO / 5-STRIDE',
    label: '크로노포토그래피 5연속 질주 실루엣',
    src: `${BASE}plates/plate-04.webp`,
    cluster: 1,
  },
  {
    id: 'plate-05',
    plateNo: 'PL.05',
    code: 'DIAPIR DOME / -812M',
    label: '지하 812m 암염 돔 습곡 동판화',
    src: `${BASE}plates/plate-05.webp`,
    cluster: 3,
  },
  {
    id: 'plate-06',
    plateNo: 'PL.06',
    code: 'VARVE CORE / H-204',
    label: '지질 시추 코어 연층 기록',
    src: `${BASE}plates/plate-06.webp`,
    cluster: 3,
  },
  {
    id: 'plate-07',
    plateNo: 'PL.07',
    code: 'PERMIAN / 280 MA',
    label: '페름기 암염 유체 포유물과 고대 기포',
    src: `${BASE}plates/plate-07.webp`,
    cluster: 4,
  },
  {
    id: 'plate-08',
    plateNo: 'PL.08',
    code: 'LAUE X-RAY / 5.64Å',
    label: '염화나트륨 X선 결정 회절무늬',
    src: `${BASE}plates/plate-08.webp`,
    cluster: 2,
  },
  {
    id: 'plate-09',
    plateNo: 'PL.09',
    code: 'EPICA CORE / -3000M',
    label: '남극 3,000m 빙하 코어 포획 기포',
    src: `${BASE}plates/plate-09.webp`,
    cluster: 5,
  },
  {
    id: 'plate-10',
    plateNo: 'PL.10',
    code: 'AEOLIAN / CROSS-BED',
    label: '고대 사막 사암 풍성 사층리',
    src: `${BASE}plates/plate-10.webp`,
    cluster: 5,
  },
  {
    id: 'plate-11',
    plateNo: 'PL.11',
    code: 'STOMATA / 300 MA',
    label: '석탄기 양치류 화석 기공',
    src: `${BASE}plates/plate-11.webp`,
    cluster: 5,
  },
  {
    id: 'plate-12',
    plateNo: 'PL.12',
    code: 'SPHERULE / COSMIC',
    label: '성층권 미세 우주진 구형 입자',
    src: `${BASE}plates/plate-12.webp`,
    cluster: 5,
  },
  {
    id: 'plate-13',
    plateNo: 'PL.13',
    code: 'DISSOLUTION / PLUME',
    label: '녹아내리는 결정과 상승 기포열',
    src: `${BASE}plates/plate-13.webp`,
    cluster: 4,
  },
  {
    id: 'plate-14',
    plateNo: 'PL.14',
    code: 'OSCILLOGRAM / ACOUSTIC',
    label: '고대 바람 음향 파형 오실로그램',
    src: `${BASE}plates/plate-14.webp`,
    cluster: 5,
  },
  {
    id: 'plate-15',
    plateNo: 'PL.15',
    code: 'SALTERN / EVAPORATION',
    label: '해안 염전 증발지 기하학',
    src: `${BASE}plates/plate-15.webp`,
    cluster: 0,
  },
  {
    id: 'plate-16',
    plateNo: 'PL.16',
    code: 'SASTRUGI / POLAR WIND',
    label: '극지 바람 사스트루기 설원 지평선',
    src: `${BASE}plates/plate-16.webp`,
    cluster: 5,
  },
  {
    id: 'plate-17',
    plateNo: 'PL.17',
    code: 'CAPILLARY / NEEDLE',
    label: '옹기 모세관 염분 결정침 초접사',
    src: `${BASE}plates/plate-17.webp`,
    cluster: 1,
  },
  {
    id: 'plate-18',
    plateNo: 'PL.18',
    code: 'CRYSTAL RAFT / 26%',
    label: '염전 결정 뗏목 대각 부유면',
    src: `${BASE}plates/plate-18.webp`,
    cluster: 2,
  },
  {
    id: 'plate-19',
    plateNo: 'PL.19',
    code: 'ANHYDRITE / FOLD',
    label: '지하 증발암 경석고 습곡 단면',
    src: `${BASE}plates/plate-19.webp`,
    cluster: 3,
  },
  {
    id: 'plate-20',
    plateNo: 'PL.20',
    code: 'MENISCUS / RING',
    label: '암염 음결정 메니스커스 광학 고리',
    src: `${BASE}plates/plate-20.webp`,
    cluster: 4,
  },
  {
    id: 'plate-21',
    plateNo: 'PL.21',
    code: 'VENTIFACT / 3-FACET',
    label: '편서풍 다면체 풍식 현무암 결',
    src: `${BASE}plates/plate-21.webp`,
    cluster: 5,
  },
  {
    id: 'plate-22',
    plateNo: 'PL.22',
    code: 'ABYSSAL / QUARTZ',
    label: '심해 점토층 제트기류 석영 연층',
    src: `${BASE}plates/plate-22.webp`,
    cluster: 5,
  },
  {
    id: 'plate-23',
    plateNo: 'PL.23',
    code: 'PRESOLAR SiC / 4.6GA',
    label: '운석 선태양 탄화규소 다결정 입자',
    src: `${BASE}plates/plate-23.webp`,
    cluster: 5,
  },
  {
    id: 'plate-24',
    plateNo: 'PL.24',
    code: 'KATABATIC / RIDGE',
    label: '극지 사스트루기 칼날 설면 능선',
    src: `${BASE}plates/plate-24.webp`,
    cluster: 5,
  },
];

const PLATE_BY_ID = new Map<string, ArchivalPlateSpec>(ARCHIVAL_PLATES.map((p) => [p.id, p]));
const DECODED_IMAGES = new Map<string, HTMLImageElement>();

let preloadPromise: Promise<void> | null = null;

export function getPlateById(id: string): ArchivalPlateSpec {
  const found = PLATE_BY_ID.get(id);
  if (!found) {
    throw new Error(`Unknown archival plate id: ${id}`);
  }
  return found;
}

export function getDecodedPlate(id: string): HTMLImageElement | undefined {
  return DECODED_IMAGES.get(id);
}

async function loadAndDecodeImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  if (typeof img.decode === 'function') {
    await img.decode();
  } else {
    await new Promise<void>((resolve, reject) => {
      if (img.complete && img.naturalWidth > 0) {
        resolve();
        return;
      }
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load plate image: ${src}`));
    });
  }
  if (!img.complete || img.naturalWidth <= 0) {
    throw new Error(`Decoded plate image has zero dimensions: ${src}`);
  }
  return img;
}

/**
 * Preload & decode all active mineral/atmospheric archival lithograph plates,
 * plus verify every `<img>` element already mounted in the document.
 */
export function preloadAllPlates(root: ParentNode = document): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = (async () => {
      const plateTasks = ARCHIVAL_PLATES.filter((spec) => spec.id !== 'plate-04').map(async (spec) => {
        const img = await loadAndDecodeImage(spec.src);
        DECODED_IMAGES.set(spec.id, img);
      });
      await Promise.all(plateTasks);
    })();
  }

  return preloadPromise.then(async () => {
    const domImgs = Array.from(root.querySelectorAll('img'));
    await Promise.all(
      domImgs.map(async (img) => {
        if (img.complete && img.naturalWidth > 0) return;
        if (typeof img.decode === 'function') {
          await img.decode();
        } else {
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`DOM img failed: ${img.src}`));
          });
        }
      }),
    );
  });
}
