/**
 * Four-Act Musical & Spatial Timeline (`120.0s @ 120 BPM = 240 beats`).
 * Note: Raw moving-image stage (`?raw=1`) is 100% Zero-UI (no bottom caption bar or app chrome).
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
  { id: 'act-1', label: 'Act I · 정렬의 프레스와 사선 건축 (00:00)', t: 0.0, start: 0, end: 30 },
  { id: 'act-2', label: 'Act II · 판면 해부와 벡터 스펙트럼 (00:30)', t: 30.0, start: 30, end: 46 },
  { id: 'act-3', label: 'Act III · 6종 해체 시공간 유영 (00:46)', t: 46.0, start: 46, end: 88 },
  { id: 'act-4', label: 'Act IV · 0.14 각성과 기원의 소거 (01:28)', t: 88.0, start: 88, end: 120 },
];

export interface StageCaption {
  readonly a: number;
  readonly b: number;
  readonly text: string;
  readonly seg: number;
}

export const STAGE_CAPTIONS: readonly StageCaption[] = [
  { a: 0.0, b: 8.0, text: 'Act I.1 — 평균의 프레스: 손맛의 기억들이 단일 통계 공식으로 압착됩니다', seg: 0 },
  { a: 8.0, b: 11.0, text: 'Act I.2 — 크로노포토그래피 질주: 정지된 규격을 가르고 사선의 지평을 엽니다', seg: 1 },
  { a: 11.0, b: 30.0, text: 'Act I.3 — 01→04 Skewed 모놀리스 군도와 사선 History 리본, 04 도판 다이빙', seg: 2 },
  { a: 30.0, b: 39.0, text: 'Act II.1 — 풀블리드 파인프레스 스프레드 개방 및 120 BPM 단두대 절단 (CUTS)', seg: 3 },
  { a: 39.0, b: 46.0, text: 'Act II.2 — 1024-DIM 바코드 스펙트럼 각인 · 코사인 계측 레이저 스캔', seg: 4 },
  { a: 46.0, b: 61.5, text: 'Act III.1 — 선형 세로단(2D)에서 30m 수평 나선(3D Helix · DOF)으로 전이', seg: 5 },
  { a: 61.5, b: 76.0, text: 'Act III.2 — 의미 인력 스프링(2D) 베지어 동맥망과 3D 의미 성운(Cloud) 관통', seg: 6 },
  { a: 76.0, b: 88.0, text: 'Act III.3 — 질문 타원 궤도(2D Orbit · ε 0.14)와 3D 질문 구체(Sphere Shell)', seg: 6 },
  { a: 88.0, b: 101.5, text: 'Act IV.1 — 0.14 주변부 문장 각성 · 5가닥 현수선 공명 · 3D 활자 단층 분열', seg: 7 },
  { a: 101.5, b: 120.0, text: 'Act IV.2 — "수억 년 전의 바람" 수평 돌풍 · 기원 소거 · 제2 사선 지평 · 순백 순환', seg: 7 },
];
