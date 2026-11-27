# AGENTS.md — 정렬과 사선 (Aligned / Skewed) 협업 하네스

이 문서는 2026 아트코리아랩 오픈 프롬프트 해커톤 2조(`안국AI기동타격대`)의 **은평문화재단 불광천 미디어브릿지 후속 전시**(`dotsnangles/bulgwangcheon-aligned-skewed`) 공동 작업 레포지토리에서 모든 팀원과 AI 코딩 에이전트(Claude Code, Codex, Cursor, Antigravity 등)가 반드시 지켜야 할 설계 불변식과 검증 기준을 정의합니다.

---

## 1. 조형 · 모션 DNA (2조 원작 `art-hackathon` 계승)

원작 인터랙티브 웹아트 `정렬과 사선 (Aligned / Skewed)`의 에디토리얼 문법을 절대 훼손하지 않습니다.

- **배경 & 선**: 순백 바탕 `#FFFFFF`, `1px solid #000000` 잉크 선·테두리. 다크 모드·네온 글로우·그라디언트 남용 금지.
- **타이포그래피**: 한국어 명조(`"Noto Serif KR", "AppleMyungjo", Georgia, serif`).
- **색상 체계 (엄격 고정)**:
  - `#0000FF` : `aligned` (정렬·상위 표준 검색 결과 및 재검색 강조)
  - `#FF9E4D`, `#FFAF66`, `#FFC080`, `#FFD09A` : `01~04 skewed` (가까이에서 멀리로 갈라지는 사선 단계)
  - `#FF0000` : 점선 궤적, 문장 수직 절단선(CUTS), 코사인 유사도 실선망, 변방 `0.14` 하한 강조
- **공간 언어**: 3D 원근 카드 스택 + 바닥 그림자, 우측 3D 사선 `history` 컨베이어 레일, 30m 수평 3D 나선(Helix), 3D 의미 구름(Cloud), 검색어 유사도 타원 궤도(Orbit, `scale = 0.72 + t`, `opacity = 0.14 + 0.86t`, 비소거 하한 `0.14`), `1px #000` 포커스 패널 및 구절 분해·재검색 도약.

---

## 2. 단일 전 폭 `6480 × 432` 캔버스 원칙

- 불광천 미디어브릿지 스크린은 **`6480 × 432 px` (`15:1`, 약 30m 폭)** 단일 파노라마 캔버스입니다.
- **3분할 복제(동일 영상 3개 나란히 배치) 절대 금지.** 모든 카드·문장·200개 조각·3D 나선·구름·궤도·비행 궤적은 `0 .. 6480px` 전체 가로축을 하나의 연속된 공간으로 사용합니다.
- 모든 카드와 200개 분해 조각(`src/data/corpus.ts`)은 중복 없이 고유해야 합니다.

---

## 3. 결정론적 `window.renderAt(t)` 불변식 (최우선)

Headless Chromium 병렬 워커가 임의의 프레임 순서로 `window.renderAt(t)`를 호출하여 전시용 MP4를 합성합니다. 따라서 **동일한 시각 `t`는 어떤 순서로 몇 번 호출되든 픽셀 단위로 100% 동일한 화면을 출력해야 합니다.**

- **금지**: 렌더링 로직(`src/engine/stage.ts`, `src/layouts/`, `src/data/`, `src/illustrations.ts`) 내부에서 `Math.random()`, `Date.now()`, `performance.now()`, `setTimeout`, `setInterval`, 비제어 `requestAnimationFrame`, CSS `@keyframes` / `transition`에 의존하는 시각 상태.
- **필수**: 모든 의사난수는 `src/math.ts`의 결정론적 `hash(i)`만 사용하며, 모든 위치·투명도·색상·카메라 변환은 순수하게 입력 시각 `t`에서 계산합니다.
- **무이음매 루프**: `t = 0.0s`와 `t = 120.0s` 직전 마지막 프레임(`t = 119.967s`)은 순백(`#FFFFFF`) 루프 워시로 완전히 일치해야 합니다(`verify-mp4.mjs`에서 `max_abs_diff <= 4 LSB` 자동 검증).
- **Red-Tint 보정 일관성**: 현장 리허설 적색기 보정(`?rgain=0.50..1.00`)은 스테이지 루트의 SVG `feColorMatrix` 필터로 일원화되어 라이브 스튜디오 프리뷰와 Headless MP4/스틸 렌더러가 완전히 동일한 발색을 출력해야 합니다.

---

## 4. 공공 하천 산책로 전시 심의 유의사항

- 은평구 불광천 산책로는 어린이·가족·어르신 등 전 연령 시민이 지나가는 **야외 공공 공간**입니다.
- `src/data/corpus.ts`, `src/data/timeline.ts`, `src/illustrations.ts` 수정 시 선정적·폭력적·정치적·혐오적 표현이나 오인 소지가 있는 문구·도상을 철저히 배제합니다.
- 모든 텍스트는 실제 교량 관람 거리에서도 품격 있고 자연스럽게 읽히는 한국어 문장을 유지합니다.

---

## 5. 역할별 디렉터리 구조 & 호환성 규칙

| 담당 영역 | 주요 파일 | 수정 범위 |
| --- | --- | --- |
| 카피 · 검색어 · 200개 조각 문구 | `src/data/corpus.ts` | 카드/조각 텍스트 및 의미 군집 |
| 타임라인 · 씬 라벨 · 하단 자막 | `src/data/timeline.ts` | `SCENES`, `STAGE_CAPTIONS`, 기본 시간 상수 |
| 타이포그래피 · 여백 · 카드 스타일 | `src/style.css` | 명조 크기, 테두리, 레이아웃 스타일 |
| 아카이브 도판 일러스트 (12종) | `src/illustrations.ts` | 절차적 240×160 에디토리얼 판화 |
| 6-모드 2D/3D 레이아웃 알고리즘 | `src/layouts/deconstruct-layout.ts` | 문서/읽기/나선/스프링/구름/궤도 좌표 |
| 모션 엔진 & 카메라 포커스 | `src/engine/stage.ts` | `renderAt(t)`, `getFocusX(t)`, `feColorMatrix` |
| 스튜디오 UI & 딥링크 공유 | `src/studio.ts` | 프리뷰 컨트롤, `?t&x&zoom&pause&rgain` |
| 공식 MP4 · 스틸 · 검수 CLI | `scripts/` | `render-mp4.mjs`, `render-stills.mjs`, `verify-mp4.mjs` |

- **GitHub Pages 호환**: `vite.config.ts`의 `base: './'`를 유지하고, 모든 내부 링크/쿼리(`?raw=1&t=...`)는 루트 절대경로(`/`) 대신 상대 경로·쿼리를 사용합니다.
- **대용량 바이너리 커밋 금지**: `renders/`, `captures/`, `dist/`, `*.mp4`, `*.mov`는 `.gitignore`에 의해 제외되며 절대로 git에 강제 추가(`git add -f`)하지 않습니다.

---

## 6. 필수 검증 게이트 (커밋 전 확인)

코드나 데이터를 수정한 뒤에는 최소한 아래 게이트를 순서대로 통과해야 합니다.

```bash
pnpm build
pnpm render:clip
node scripts/verify-mp4.mjs renders/clip-preview.mp4
```

대표 이미지 또는 전체 마스터 납품 직전에는 아래까지 검증합니다.

```bash
pnpm render:stills
pnpm render:master
pnpm render:verify
```
