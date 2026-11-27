/**
 * Four-Act Musical & Spatial Timeline (`200.0s @ 120 BPM = 100 bars = 400 beats = 6,000 frames @ 30fps`).
 * Raw moving-image stage (`?raw=1`) is 100% Zero-UI & Zero-Burn-In.
 * `SCENES` and `STAGE_CAPTIONS` are used exclusively by the external Studio Preview controller (`src/studio.ts`).
 */

export const STAGE_W = 6480;
export const STAGE_H = 432;
export const DURATION = 200.0;
export const BPM = 120;

export interface SceneMarker {
  readonly id: string;
  readonly label: string;
  readonly t: number;
  readonly start: number;
  readonly end: number;
}

export const SCENES: readonly SceneMarker[] = [
  { id: 'act-1', label: 'Act I · 정렬 프레스와 3D 사선 군도 (0:00)', t: 0.0, start: 0, end: 48 },
  { id: 'act-2', label: 'Act II · 브로드시트 절단과 전 높이 스캔 (0:48)', t: 48.0, start: 48, end: 78 },
  { id: 'act-3', label: 'Act III · 6종 해체 시공간과 천구 돔 (1:18)', t: 78.0, start: 78, end: 150 },
  { id: 'act-4', label: 'Act IV · 0.14 단층 분열·태고 돌풍·설원 용해 (2:30)', t: 150.0, start: 150, end: 200 },
];

export interface StageCaption {
  readonly a: number;
  readonly b: number;
  readonly text: string;
  readonly seg: number;
}

export const STAGE_CAPTIONS: readonly StageCaption[] = [
  { a: 0.0, b: 13.0, text: 'Act I.1 — 평균의 프레스: 8개 부엌의 기억이 넉넉한 호흡으로 찍힌 뒤 코발트 프레스에 압착되어 단일 공식에 수렴합니다', seg: 0 },
  { a: 13.0, b: 18.5, text: 'Act I.2 — 30m 결정학 슬릿스캔 도약: 18개 고유 석판화 창이 서브픽셀 유영으로 0.0 m → 30.0 m 지평을 개방합니다', seg: 1 },
  { a: 18.5, b: 42.5, text: 'Act I.3 — 1세대 3D 사선 군도: 고유 도판 6장 정렬 리플 · 4.0초 무팝업 사선 모놀리스 딜링 · 3벌 무이음 컨베이어', seg: 2 },
  { a: 42.5, b: 48.0, text: 'Act I.4 — 30m 병풍 전개: 1세대 군도가 수렴한 뒤 25종 고유 도판 풀블리드 아코디언 판화 병풍이 펼쳐집니다', seg: 2 },
  { a: 48.0, b: 63.0, text: 'Act II.1 — 석판화 브로드시트 관조 후 28px 거터 정밀 기요틴 절단(CUTS)과 무충돌 전단 분리', seg: 3 },
  { a: 63.0, b: 78.0, text: 'Act II.2 — 가변 바코드 각인과 432px 전 높이를 가로지르는 4파동 다층 진홍 코사인 캘리퍼 아크·레이저 스캔', seg: 4 },
  { a: 78.0, b: 87.0, text: 'Act III.1 — 선형 세로단(reading2D): 20개 세로단의 대위법적 교차 드리프트와 수평 리딩 스캔', seg: 5 },
  { a: 87.0, b: 102.0, text: 'Act III.2 — 30m 3D 이중나선(helix3D): 연속 smoothstep 심도 등뼈와 함께 무진동 유영하는 수평 이중나선', seg: 5 },
  { a: 102.0, b: 115.0, text: 'Act III.3 — 5대 비대칭 성단과 320px+ 순백 침묵 협곡(meaning2D) · 진홍 현수선 동맥망의 맥동', seg: 6 },
  { a: 115.0, b: 128.0, text: 'Act III.4 — 3차원 의미 성운(cloud3D): 연속 Catmull-Rom 스플라인 카메라가 성운 심부를 유영합니다', seg: 6 },
  { a: 128.0, b: 138.0, text: 'Act III.5 — 질문 타원 궤도(orbit2D): 투명 순백 지면 위 붉은 질문핵과 가장자리 0.14 비소거 파편의 침묵 관조', seg: 6 },
  { a: 138.0, b: 150.0, text: 'Act III.6 — 30m 천구 아밀러리 돔(sphere3D): 해석적 타원 배제 필드와 연속 잉크 농담 심도의 무진동 구면 회전', seg: 6 },
  { a: 150.0, b: 157.5, text: 'Act IV.1 — 0.14 변방 각성: 투명 지면 위 깨어난 문장과 5가닥 30m 현수선 공명 아크', seg: 7 },
  { a: 157.5, b: 164.0, text: 'Act IV.2 — 3구절 활자 단층 분열: 순수 투명 조판 공간에서 세 구절로 갈라져 태고의 바람을 응축합니다', seg: 7 },
  { a: 164.0, b: 171.5, text: 'Act IV.3a — 태고의 돌풍과 기원 풍화: 30m를 휩쓰는 돌풍이 좌측 일상 질문 8음절을 먹 입자로 완전 소거합니다', seg: 7 },
  { a: 171.5, b: 193.0, text: 'Act IV.3b — 2세대 태고의 바람 3D 군도: 19종 고유 도판(만년설·사구·화석·설원)과 1·2세대 중첩 기억 벨트', seg: 7 },
  { a: 193.0, b: 200.0, text: 'Act IV.4 — 사스트루기 백색 소거와 0.70초 순백 호흡 무봉제 루프(0 LSB)', seg: 7 },
];
