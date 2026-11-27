# AGENTS.md — 정렬과 사선 (Aligned / Skewed) 협업 하네스

이 문서는 2026 아트코리아랩 오픈 프롬프트 해커톤 2조(`안국AI기동타격대`)의 **은평문화재단 불광천 미디어브릿지 후속 전시**(`dotsnangles/bulgwangcheon-aligned-skewed`) 공동 작업 레포지토리에서 모든 팀원과 AI 코딩 에이전트(Claude Code, Codex, Cursor, Antigravity 등)가 반드시 지켜야 할 설계 불변식과 검증 기준을 정의합니다.

---

## 1. 조형 · 모션 DNA (프로페셔널 아트 그레이드 정본)

원작 인터랙티브 웹아트 `정렬과 사선 (Aligned / Skewed)`의 에디토리얼·판화 문법을 미술관·비엔날레 수준으로 계승하며 절대 훼손하지 않습니다.

- **배경 & 선**: 순백 바탕 `#FFFFFF` (`mean >= 78%`), `1px solid #000000` 카본 잉크 선·테두리. 다크 모드·네온 글로우·에어브러시 그라디언트 남용 금지.
- **타이포그래피 (100% 자체 호스팅 가변 웹폰트)**:
  - 한국어 본문·시어 명조: `public/fonts/NotoSerifKR-Variable.woff2` (`"Noto Serif KR"`, 200~900 가변 웨이트)
  - 계측 수치·도판 코드 고정폭: `public/fonts/JetBrainsMono-Variable.woff2` (`"JetBrains Mono"`, `tabular-nums`)
- **색상 체계 (엄격 고정)**:
  - `#0000FF` : `aligned` (정렬·상위 표준 검색 결과, 실크스크린 프레스 레일 및 기원 기준선)
  - `#FF9626`, `#FFA947`, `#FFBC6B`, `#FFCF8E` : `01~04 skewed` (가까이에서 멀리로 갈라지는 4단계 골든 앰버 사선 위계)
  - `#FF0000` (`#E60000` / `#D90000`) : 직교 굴절 궤적, 브로드시트 기요틴 절단선(CUTS), 코사인 치수선 캘리퍼·현수선 동맥망, 변방 `0.14` 비소거 각성
- **무크롬(Zero-UI) · 무번인(Zero-HUD) 원칙**:
  - 송출 무대(`?raw=1`) 안에는 웹앱 버튼(`←`, `↻`), 해상도/타임코드 슬레이트(`6480×432`, `ACT I`, `BEAT`), 설명조 영문 메타 배너, 하단 자막을 **단 1건도 노출하지 않습니다** (`SCENES`, `STAGE_CAPTIONS`는 외부 프리뷰 컨트롤러 `src/studio.ts` 전용).
- **물리 베젤 수직 안전 엔벨로프**:
  - 수변 산책로 앙각 시선에서 상·하단 물리 베젤 립에 글자나 도판이 잘리지 않도록 모든 가시 요소(마스크 처리된 우측 `.history-rail-wrap` 제외)를 **`Y ∈ [26px, 404px]`** (검증 게이트 `[20px, 410px]`) 내부에 엄격히 배치합니다.
- **38종 파인프레스 석판화·동판화 도판 (`public/plates/plate-01..38.webp`) & 무스티커 투명 조판**:
  - Canvas2D 장난감 절차 도형을 배제하고, `scripts/bake-plates.mjs`(`pnpm bake:plates`)로 정제한 무경계(`border = 255`) 고해상도 석판화·동판화 도판 38종을 사용합니다 (`plate-04` 경주마 도판은 본편 미노출하여 활성 `37종` 운용; 1·2세대 `Aligned` 12장 및 `Skewed` 24장 전 카드는 도판 `1:1` 비중복 배정하며 `400`개 전수 시점 동시 노출 중복 `0건`을 유지합니다).
  - 부유 텍스트 조각(`.frag:not(.is-img)`, `.fault-shard`, `.reask-flyer`)에는 불투명 흰 사각 배경 스티커 박스를 절대 씌우지 않으며, 투명 바탕과 정밀 순백 스트로크 헤일로(`3.4px` / `1.8px`)만으로 가독성을 확보합니다.

---

## 2. 단일 전 폭 `6480 × 432` 캔버스 원칙

- 불광천 미디어브릿지 스크린은 **`6480 × 432 px` (`15:1`, 약 30m 폭)** 단일 파노라마 캔버스입니다.
- **3분할 복제(동일 영상 3개 나란히 배치) 절대 금지.** 모든 카드·문장·200개 조각·23단 브로드시트 병풍·30m 수평 6위상 3D 이중나선(Helix)·**6대 독립 성단과 5개 등간격(`304px`) 순백 침묵 협곡**·6위도 30m 천구 아밀러리 돔(Sphere)·태고의 바람 유선·3벌 인과 적층 `history` 벨트는 `0 .. 6480px` 전체 가로축을 하나의 연속된 조형 공간으로 사용합니다.
- 모든 카드와 200개 분해 조각(`src/data/corpus.ts`)은 중복 없이 고유해야 하며, 좌권역(`ALIGNED`)·중권역·우권역(`history` 벨트) 어느 구간도 정지(Partial Freeze)하지 않고 상시 유영해야 합니다.

---

## 3. 결정론적 무진동 $C^2$ `window.renderAt(t)` 불변식 (최우선)

Headless Chromium 병렬 워커가 임의의 프레임 순서로 `window.renderAt(t)`(`0.0s .. 200.0s`, `120 BPM 100마디`, `6,000프레임 @ 30fps`)를 호출하여 전시용 MP4를 합성합니다. 따라서 **동일한 시각 `t`는 어떤 순서로 몇 번 호출되든 픽셀 단위로 `0 LSB` 오차의 100% 동일한 화면을 출력해야 합니다.**

- **금지**: 렌더링 로직(`src/engine/stage.ts`, `src/layouts/`, `src/data/`, `src/illustrations.ts`) 내부에서 `Math.random()`, `Date.now()`, `performance.now()`, `setTimeout`, `setInterval`, 비제어 `requestAnimationFrame`, CSS `@keyframes` / `transition`에 의존하는 시각 상태. 또한 프레임 간 고주파 진동(`chatter`)이나 시각 단절을 유발하는 사후 반발기(`repelForeground3D`) 및 전체 화면 섬광(`hardCutFlash`)은 영구 금지합니다.
- **필수**: 모든 의사난수는 `src/math.ts`의 결정론적 `hash(i)`만 사용하며, 모든 위치·투명도·색상·카메라 변환은 순수하게 입력 시각 `t`의 해석적 $C^2$ 연속 궤적으로 계산하여 `6,000프레임` 전 구간 진동 `0건`(`chatter === 0`)을 보장합니다. `window.motionReady`는 모든 웹폰트(`document.fonts.ready`)와 석판화 도판(`preloadAllPlates`의 `img.decode()`) 완료 후에만 resolve됩니다.
- **양단 대칭 무이음매 루프**: `198.95s ~ 200.00s` (`1.05초`) 및 `0.00s ~ 0.45s` (`0.45초`)는 양단 대칭 순백(`100.00% #FFFFFF`) 호흡 구간으로 `t = 0.0s`와 `t = 199.967s`가 완전히 일치해야 합니다(`verify-artwork.mjs` `0 LSB`, `verify-mp4.mjs` `max_abs_diff <= 4 LSB` 자동 검증).
- **화이트포인트 보존 Red-Tint 역보정 (`?rgain=0.50..1.00`)**: 현장 LED 적색기 보정은 선형 채널 감산이 아닌 스테이지 루트의 SVG `feComponentTransfer` 감마 역보정(`exponent = 1 / rgain` on `feFuncR`)으로 일원화하여, `?rgain=0.90` 적용 시에도 **`#FFFFFF` 순백 지면이 시안(Cyan) 변색 없이 정확히 `RGB(255, 255, 255)`를 유지**해야 합니다.

---

## 4. 공공 하천 산책로 전시 심의 및 현장 송출 유의사항

- 은평구 불광천 산책로는 어린이·가족·어르신 등 전 연령 시민이 지나가는 **야외 공공 공간**입니다.
- `src/data/corpus.ts`, `src/data/timeline.ts`, `src/illustrations.ts` 수정 시 선정적·폭력적·정치적·혐오적 표현이나 오인 소지가 있는 문구·도상을 철저히 배제하며 품격 있는 한국어 문장을 유지합니다.
- **현장 LED 프로세서 권장 세팅**:
  - 적색기 편향 시 `--r-gain=0.90~0.93` (또는 컨트롤러 `R-Gain 90~93%`) 권장
  - 일몰 후 야간 상영(`17:30–21:00`) 시 하천 수면 반사 눈부심 및 백색 바탕 내 텍스트 획 블루밍 방지를 위해 **야간 휘도 `22~28%` (`900–1,200 nits`) 디밍** 권장

---

## 5. 역할별 디렉터리 구조 & 호환성 규칙

| 담당 영역 | 주요 파일 | 수정 범위 |
| --- | --- | --- |
| 다층 시학 코퍼스 · 1·2세대 카드 · 200개 조각 | `src/data/corpus.ts` | 검색어, 카드/조각 텍스트, `1:1` 고유 도판 배정, 동맥망 그래프 |
| 4막 타임라인(`200.0s`) · 스튜디오 전용 메타 | `src/data/timeline.ts` | `SCENES`, `STAGE_CAPTIONS`(스튜디오 UI 전용), `200.0s @ 120 BPM` 상수 |
| 자체 호스팅 웹폰트 · 파인프레스 스타일 · 헤일로 | `src/style.css` | 명조/모노 타이포, 무스티커 `3.4px`/`1.8px` 순백 스트로크 헤일로, 카드/스튜디오 스타일 |
| 파인프레스 석판화 도판 레지스트리 (38종) | `src/illustrations.ts`, `scripts/bake-plates.mjs` | `public/plates/plate-01..38.webp` 정제(`border=255`) 및 사전 디코딩(`img.decode()`) |
| 8-시공간 무충돌 2D/3D 레이아웃 솔버 | `src/layouts/deconstruct-layout.ts` | 23단 브로드시트(`28px` 거터)/스펙트럼/16베이 세로단/6위상 이중나선/6대 독립 성단·5개 순백 협곡/3D 성운/궤도/6위도 천구 돔 |
| 결정론적 무진동 $C^2$ 모션 엔진 | `src/engine/stage.ts` | `renderAt(t)`, 해석적 $C^2$ 연속 궤적(`repelForeground3D` 배제), 3벌 인과 `history` 벨트, `getFocusX(t)`, 감마 `rgain` |
| 외부 라이브 스튜디오 UI & 딥링크 공유 | `src/studio.ts` | 프리뷰 컨트롤, `?t&x&zoom&pause&rgain` (송출 원본 `?raw=1`과 완전 분리) |
| 8대 정량·운동학 감리 · 공식 MP4 · 스틸 · 규격 검수 CLI | `scripts/` | `verify-artwork.mjs`(`G1~G8`), `render-mp4.mjs`, `render-stills.mjs`, `verify-mp4.mjs` |

- **GitHub Pages 호환**: `vite.config.ts`의 `base: './'`를 유지하고, 모든 내부 링크/자산 경로는 루트 절대경로(`/`) 대신 상대 경로를 사용합니다.
- **대용량/임시 바이너리 커밋 금지**: `.cache/`, `renders/`, `captures/`, `dist/`, `*.mp4`, `*.mov`는 `.gitignore`에 의해 제외되며 절대로 git에 강제 추가(`git add -f`)하지 않습니다 (`public/plates/*.webp`와 서브셋 `public/fonts/*.woff2`만 정적 자산으로 추적).

---

## 6. 필수 검증 게이트 (커밋 및 납품 전 확인)

코드나 데이터를 수정한 뒤에는 반드시 아래 정량·운동학 무결성 게이트(`G1~G8`)와 클립 검수를 통과해야 합니다.

```bash
pnpm build
pnpm verify:artwork
pnpm render:clip
node scripts/verify-mp4.mjs renders/clip-preview.mp4
```

대표 이미지(6대 골든 프레임: `28.0, 56.0, 94.5, 108.5, 144.0, 182.0s`) 및 전체 `6,000프레임`(`200.0s`) 공식 마스터 납품 직전에는 아래까지 완주합니다.

```bash
pnpm render:stills
pnpm render:master
pnpm render:verify
```
