/**
 * Timeline constants, scene markers, and bottom editorial narrative captions.
 * 기획·카피·연출 담당 팀원은 엔진 코드(`src/engine/stage.ts`)를 건드리지 않고
 * 이 파일에서 씬 라벨과 하단 내러티브 캡션을 안전하게 수정할 수 있습니다.
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
  { id: 'scene-1', label: 'Scene 1 (카드스택)', t: 0.0, start: 0, end: 28 },
  { id: 'scene-2', label: 'Scene 2 (원문분해·벡터)', t: 28.0, start: 28, end: 46 },
  { id: 'scene-3', label: 'Scene 3 (3D나선·구름·궤도)', t: 46.0, start: 46, end: 88 },
  { id: 'scene-4', label: 'Scene 4 (구절분해·재검색)', t: 88.0, start: 88, end: 120 },
];

export interface StageCaption {
  readonly a: number;
  readonly b: number;
  readonly text: string;
  readonly seg: number;
}

export const STAGE_CAPTIONS: readonly StageCaption[] = [
  { a: 0.3, b: 4.0, text: '검색어 하나 — 김치찌개 끓이는 법', seg: 0 },
  { a: 4.0, b: 10.0, text: 'aligned — 상위 결과가 하나의 표준 레시피로 정렬됩니다', seg: 0 },
  { a: 10.0, b: 23.0, text: '01~04 skewed — 가까이에서 멀리로, 사선 검색이 30m 전 폭으로 갈라집니다', seg: 1 },
  { a: 23.0, b: 28.0, text: '04 skewed 끝단 카드 선택 — 원문 페이지 분해 진입', seg: 1 },
  { a: 28.0, b: 37.0, text: '원문 페이지 개방 · 의미 단위 수직 절단 (CUTS)', seg: 2 },
  { a: 37.0, b: 46.0, text: '조각 200개 · 1024차원 벡터 바코드 · 쌍별 코사인 유사도 스캔', seg: 3 },
  { a: 46.0, b: 64.0, text: '읽는 순서 [2D → 3D 수평 나선 Helix] — 교량 전 폭을 감는 3차원 활자 나선', seg: 4 },
  { a: 64.0, b: 76.0, text: '상호 유사도 [2D 스프링 → 3D 구름 Cloud] — 의미 성운과 붉은 유사도 실선망', seg: 5 },
  { a: 76.0, b: 88.0, text: '검색어 유사도 [타원 궤도 Orbit] — 가장 먼 변방도 0.14 하한으로 남습니다', seg: 6 },
  { a: 88.0, b: 101.0, text: '변방(0.14) 조각 포커스 · 더 잘게 구절 분해 · 이 조각으로 다시 검색', seg: 6 },
  { a: 101.0, b: 107.0, text: '"수억 년 전의 바람" — 5,000px 대륙 횡단 재검색 도약', seg: 7 },
  { a: 107.0, b: 118.4, text: '2차 aligned · 01~04 skewed 전개 — 지나온 길은 history 레일에 그대로 남습니다', seg: 7 },
];
