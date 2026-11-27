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
  { a: 0.0, b: 8.0, text: 'Act I.1 — 평균의 프레스: 0.20초 전 폭 점등 후 8개 손맛 기억이 잉크 막대로 압착되어 단일 공식에 수렴합니다', seg: 0 },
  { a: 8.0, b: 11.0, text: 'Act I.2 — 30m 스트로보스코픽 결정학 슬릿스캔 질주(0.0 m ~ 30.0 m)와 굴절 관점 프리즘 게이트 점화', seg: 1 },
  { a: 11.0, b: 26.0, text: 'Act I.3 — 좌측 정렬 6장 리플 파동 · 3D 사선 군도 딜링 · 우측 44 px/s 무한 컨베이어', seg: 2 },
  { a: 26.0, b: 30.0, text: 'Act I.4 — 04 모놀리스 수평 정박과 30m 아코디언 판화 병풍(Concertina Fold-Out) 전개', seg: 2 },
  { a: 30.0, b: 37.6, text: 'Act II.1 — 26px 거터 브로드시트 스탬핑과 FIG 침범 0% 실시간 스냅 기요틴 전단 분리', seg: 3 },
  { a: 37.6, b: 46.0, text: 'Act II.2 — 가변 밀도 바코드 스펙트럼과 좌·중·우 3권역 동시 진홍 코사인 치수선 캘리퍼', seg: 4 },
  { a: 46.0, b: 59.8, text: 'Act III.1–2 — 연속 인장 진홍 공명선과 2.0px 전면 등뼈 30m 수평 이중나선(3D Helix)', seg: 5 },
  { a: 59.8, b: 75.0, text: 'Act III.3–4 — 5대 비대칭 성단·순백 침묵 협곡·42px 허브·포스번들 현수선 동맥망과 3D 성운', seg: 6 },
  { a: 75.0, b: 88.0, text: 'Act III.5–6 — 0.30 주간 대비 타원 공전(Orbit)과 후면 반구 심도 천구 아밀러리 돔(0 충돌)', seg: 6 },
  { a: 88.0, b: 94.0, text: 'Act IV.1–2 — 0.14 주변부 조준 각성 · 5가닥 현수선 우회 공명 · 92.8s 기원 표적 사전 점등', seg: 7 },
  { a: 94.0, b: 98.4, text: 'Act IV.3a — 감속 도킹 태고 폭풍과 건침 먹 입자 풍화에서 제2세대 궤적으로의 즉시 전이', seg: 7 },
  { a: 98.4, b: 113.8, text: 'Act IV.3b — 고유 도판 제2 사선 군도와 좌측 정렬 리플 · 우측 무한 컨베이어 상시 유영', seg: 7 },
  { a: 113.8, b: 120.0, text: 'Act IV.4 — 38 m/s 사스트루기 드라이포인트 설원 폭풍 소거와 0.70초 순백 호흡 루프', seg: 7 },
];
