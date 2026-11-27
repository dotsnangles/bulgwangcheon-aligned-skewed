/**
 * Four-Act Musical & Spatial Timeline (`120.0s @ 120 BPM = 240 beats`).
 * Raw moving-image stage (`?raw=1`) is 100% Zero-UI & Zero-Burn-In.
 * `SCENES` and `STAGE_CAPTIONS` are used exclusively by the external Studio Preview controller (`src/studio.ts`).
 */

export const STAGE_W = 6480;
export const STAGE_H = 432;
export const DURATION = 120.0;
export const BPM = 120;

export interface SceneMarker {
  readonly id: string;
  readonly label: string;
  readonly t: number;
  readonly start: number;
  readonly end: number;
}

export const SCENES: readonly SceneMarker[] = [
  { id: 'act-1', label: 'Act I · 정렬 프레스와 3D 사선 군도 (00:00)', t: 0.0, start: 0, end: 30 },
  { id: 'act-2', label: 'Act II · 브로드시트 단두대 절단과 스펙트럼 (00:30)', t: 30.0, start: 30, end: 46 },
  { id: 'act-3', label: 'Act III · 6종 해체 시공간과 천구 돔 (00:46)', t: 46.0, start: 46, end: 88 },
  { id: 'act-4', label: 'Act IV · 0.14 단층 분열·태고 돌풍·설원 용해 (01:28)', t: 88.0, start: 88, end: 120 },
];

export interface StageCaption {
  readonly a: number;
  readonly b: number;
  readonly text: string;
  readonly seg: number;
}

export const STAGE_CAPTIONS: readonly StageCaption[] = [
  { a: 0.0, b: 8.0, text: 'Act I.1 — 평균의 프레스: 8개 독립 레일의 손맛 기억이 청백 반전·정반 압축으로 단일 공식에 응고됩니다', seg: 0 },
  { a: 8.0, b: 11.2, text: 'Act I.2 — 30m 크로노포토그래피 질주와 굴절 관점 프리즘 게이트 점화', seg: 1 },
  { a: 11.2, b: 30.0, text: 'Act I.3 — 비등간격 3D 원근 모놀리스 군도 · 직교 적색 규칙 화살표 · 04 도판 플라이스루', seg: 2 },
  { a: 30.0, b: 37.8, text: 'Act II.1 — 풀블리드 브로드시트와 120 BPM 3프레임 단두대 하드 컷 (CUTS)', seg: 3 },
  { a: 37.8, b: 46.0, text: 'Act II.2 — 무충돌 spectrum2D 1024-dim 바코드 각인과 아첼레란도 코사인 스캔', seg: 4 },
  { a: 46.0, b: 61.5, text: 'Act III.1–2 — 선형 세로단(2D)에서 종이 헤일로·전경 반발 30m 수평 나선(3D Helix)으로 전이', seg: 5 },
  { a: 61.5, b: 76.0, text: 'Act III.3–4 — 차수 제한 균등 동맥망(2D)과 3D 의미 성운(Cloud) 스플라인 관통', seg: 6 },
  { a: 76.0, b: 88.0, text: 'Act III.5–6 — 질문 타원 궤도(2D Orbit)와 30m 파노라마 3D 천구 아밀러리 돔(Sphere Dome)', seg: 6 },
  { a: 88.0, b: 99.5, text: 'Act IV.1–2 — 0.14 주변부 각성 · 5가닥 외곽 현수선 공명 · 무색수차 3D 원근 단층 전단', seg: 7 },
  { a: 99.5, b: 120.0, text: 'Act IV.3 — 원소적 태고 돌풍과 기원 자소 풍화 소멸 · 제2 사선 지평 · 순백 설원 용해 루프', seg: 7 },
];
