# 정렬과 사선 (Aligned / Skewed) — 불광천 미디어브릿지 6480×432

**2026 아트코리아랩 오픈 프롬프트 해커톤 2조 (`안국AI기동타격대`)** 원작 웹아트를 **은평문화재단 불광천 미디어브릿지** 초광폭(`6480 × 432 px`, `15:1`, 약 30m 폭) 야외 파노라마 스크린을 위한 **프로페셔널 아트 그레이드(Professional Art Grade) 무빙 이미지**로 재창조한 실시간 모션 스튜디오 및 결정론적 마스터 렌더링 레포지토리입니다.

- **단일 전 폭 30m 파노라마 캔버스**: `6480 × 432 px` 전체를 3분할 복제 없이 하나의 연속된 조형·시학적 공간으로 구성합니다.
- **파인프레스 석판화 & 실크스크린 문법**: 순백 지면(`#FFFFFF`), 카본 잉크(`#000000`), 자체 호스팅 가변 명조·고정폭 웹폰트(`Noto Serif KR` × `JetBrains Mono`), 24종 고해상도 파인프레스 석판화 도판(`public/plates/plate-01..24.webp`), 정렬 코발트(`#0000FF`), 4단계 골든 앰버 사선(`#FF9626 ~ #FFCF8E`), 진홍 절단·동맥선(`#FF0000`).
- **무크롬(Zero-UI) · 무번인(Zero-HUD) · 물리 베젤 안전(`Y ∈ [26, 404]`)**: 송출 화면(`?raw=1`) 내부에 웹앱 컨트롤·타임코드·해상도 슬레이트·자막 크롬을 일절 배제하고 수변 산책로 관람 시선에 최적화된 광학 여백과 가독 스케일을 준수합니다.
- **100% 결정론적 렌더링 (`0 LSB`)**: 라이브 스튜디오와 병렬 Headless Chromium MP4 렌더러가 동일한 순수 함수 `window.renderAt(t)`를 실행하여 임의 탐색 시 픽셀 오차 `0 LSB` 및 `0.70초` 순백 무이음매 2분(`3,600프레임`) 루프를 보장합니다.

> **작품 철학 · 미학 언어 정본 & 전시 소개문**
>
> **[`docs/CONCEPT.md` — 작품 철학·미학 언어 정본 & 전시 소개문(Exhibition Statement)](./docs/CONCEPT.md)**
>
> 네 개의 철학적 명제(`Aligned` · `Skewed` · `Deconstruct` · `Human in the Loop`), `6480×432` 수변 건축 매체 미학, [`src/data/corpus.ts`](./src/data/corpus.ts) 다층 코퍼스 큐레이션 원칙, 그리고 **은평문화재단 공식 캡션 및 작품 소개문 정본**이 수록되어 있습니다.

---

## 1. 실시간 웹 스튜디오 & 단톡방 피드백 공유법

코드 설치 없이 브라우저만으로 30m 전 폭 조감도와 `1:1` 실제 픽셀 디테일을 즉시 확인할 수 있습니다 (스튜디오 컨트롤 UI는 작품 캔버스 외부에만 위치하며 실제 송출 화면 `?raw=1`에는 포함되지 않습니다).

- **라이브 스튜디오 (GitHub Pages)**: [`https://dotsnangles.github.io/bulgwangcheon-aligned-skewed/`](https://dotsnangles.github.io/bulgwangcheon-aligned-skewed/)

### 단톡방에서 정확한 장면으로 피드백 주고받기
1. 스튜디오에서 논의하고 싶은 시각(`Scrubber` 또는 `Act I~IV` 버튼)으로 이동하고, 돋보기(`1:1` 또는 `0.65x`)를 드래그해 원하는 가로 위치(`x`)에 맞춥니다.
2. 우측 상단의 **`[현재 장면 링크 복사]`** 버튼을 클릭합니다.
3. 클립보드에 복사된 딥링크 URL을 공유하면 팀원이 클릭 즉시 **동일한 시각·동일한 X 좌표·일시정지 상태**로 같은 장면을 확인할 수 있습니다.

```text
예시 딥링크:
https://dotsnangles.github.io/bulgwangcheon-aligned-skewed/?t=64.5&x=4840&zoom=1&pause=1
```

### 지원 URL 쿼리 파라미터

| 파라미터 | 범위 / 예시 | 설명 |
| --- | --- | --- |
| `t` | `0` ~ `120` (`?t=64.5`) | 시작 타임스탬프(초) |
| `x` | `0` ~ `6480` (`?x=3240`) | 돋보기 중심 X 좌표(px). 지정 시 `Auto-Follow Action: OFF`로 자동 고정 |
| `zoom` | `1` 또는 `0.65` (`?zoom=0.65`) | 하단 디테일 뷰포트 배율 (`1:1` / `0.65x`) |
| `pause` | `1` (`?pause=1`) | 일시정지 상태로 즉시 열기 |
| `rgain` | `0.50` ~ `1.00` (`?rgain=0.90`) | 현장 LED 적색기 감마 역보정 (`#FFFFFF` 지면 화이트포인트 `RGB(255,255,255)` 100% 보존) |
| `raw` | `1` (`?raw=1&t=19.6`) | 스튜디오 크롬 없는 순수 `6480 × 432` 송출 원본 모드 |

---

## 2. 로컬 개발 환경 세팅

### 사전 준비물
- **Node.js 22+** (`node -v` 확인)
- **pnpm** (`corepack enable && corepack prepare pnpm@latest --activate` 또는 `npm i -g pnpm`)
- **FFmpeg / FFprobe** (동영상 렌더링 및 정량 무결성/규격 검수용)
  - **macOS**: `brew install ffmpeg`
  - **Ubuntu / Debian**: `sudo apt update && sudo apt install -y ffmpeg`
  - **Windows**: `winget install Gyan.FFmpeg`

### 설치 및 실행

```bash
# 1. 레포지토리 클론 및 패키지 설치
git clone https://github.com/dotsnangles/bulgwangcheon-aligned-skewed.git
cd bulgwangcheon-aligned-skewed
pnpm install

# 2. 라이브 스튜디오 실행 -> http://127.0.0.1:4320/
pnpm dev

# 3. (무결성 검증 및 동영상·스틸 렌더링 시 1회 실행) Headless Chromium 설치
pnpm setup:render
```

---

## 3. 아키텍처 & 역할별 파일 가이드

| 담당 역할 | 주요 파일 | 설명 |
| --- | --- | --- |
| **다층 코퍼스 · 카드 · 동맥망** | `src/data/corpus.ts` | 1·2세대 검색어, `aligned` 6장 / `01~04 skewed` 24장(`1:1` 고유 도판), 200개 다층 분해 조각(`anchor`·`sentence`·`plate`) 및 균형 동맥 그래프 |
| **4막 악보 타임라인 메타** | `src/data/timeline.ts` | `120.0s @ 120 BPM` 4막 구조(`SCENES`, `STAGE_CAPTIONS` — 외부 스튜디오 전용) |
| **파인프레스 타이포 · 스타일** | `src/style.css`, `public/fonts/` | 자체 호스팅 가변 웹폰트, `3.5px` 순백 스트로크 녹아웃 헤일로, 3D 모놀리스·스튜디오 스타일 |
| **24종 파인프레스 석판화 도판** | `src/illustrations.ts`, `scripts/bake-plates.mjs` | `public/plates/plate-01..24.webp` 정제(`border=255` 무경계) 및 `window.motionReady` 전 `img.decode()` 보장 |
| **8-시공간 무충돌 레이아웃 솔버** | `src/layouts/deconstruct-layout.ts` | 브로드시트(`28px` 거터)/스펙트럼/세로단/30m 3D 이중나선/5대 성단·순백 협곡/3D 성운/타원 궤도/30m 천구 아밀러리 돔 |
| **결정론적 모션 엔진** | `src/engine/stage.ts` | 순수 함수 `renderAt(t)`, 3D 전·후면 심도 및 실시간 무충돌 반발기(`repelForeground3D`), 화이트포인트 보존 감마 `rgain` |
| **7대 작품 무결성 자동 검증기** | `scripts/verify-artwork.mjs` | `G1`(결정론 `0 LSB`) ~ `G7`(물리 베젤 안전여백) 자동 검증 CLI (`pnpm verify:artwork`) |

> **작업 전·후 확인**: 변경 후 반드시 `pnpm build && pnpm verify:artwork`로 빌드 오류 `0`건과 `G1~G7` 무결성 통과를 확인하세요. 상세 불변식은 [`AGENTS.md`](./AGENTS.md)를 참고하세요.

---

## 4. 작품 무결성 검증 · 공식 마스터 MP4 · 대표 스틸 렌더링 레시피

모든 렌더링 산출물은 `renders/` 디렉터리에 생성되며(`.gitignore` 처리), 임시 PNG 파일을 디스크에 쌓지 않고 병렬 Playwright 워커에서 FFmpeg `stdin`으로 직접 파이프합니다.

### ① 7대 프로페셔널 아트 그레이드 무결성 검증 (`G1 ~ G7`)
```bash
pnpm verify:artwork
# G1 결정론(0 LSB) · G2 7-시점 2D/3D 무충돌 · G3 순백 지면/화이트포인트 · G4 무크롬/도판 비중복
# G5 30m 3권역 활성 & 0.70s 루프 · G6 전폭/좌우 Zero-Freeze · G7 물리 베젤 안전여백 전수 검증
```

### ② 빠른 검수 클립 렌더링 (8초, `t = 12..20s`)
```bash
pnpm render:clip
# 출력: renders/clip-preview.mp4 (완료 시 자동 규격 검수 포함)
```

### ③ 2분(`3,600프레임`) 공식 마스터 MP4 렌더링 (30fps · `6480×432` · 무음 · `<= 900 MB`)
```bash
pnpm render:master
# 출력: renders/bulgwangcheon-aligned-skewed-6480x432-master.mp4
```

### ④ 6대 상징적 골든 프레임 대표 이미지 추출 (`6480 × 432` 무손실 PNG)
```bash
# 기본 골든 프레임 6종 (t = 19.6, 34.8, 55.0, 64.5, 84.5, 107.6s) -> renders/stills/
pnpm render:stills

# 원하는 시각만 커스텀 지정
node scripts/render-stills.mjs --times=19.6,64.5,107.6
```
- `19.6s`: 1세대 3D 사선 모놀리스 군도 & 굴절 관점 프리즘 게이트
- `34.8s`: 5대 석판화 브로드시트 & 진홍 기요틴 전단 분리
- `55.0s`: 30m 수평 3D 이중나선(`2.0px` 전면 등뼈) & 광학 피사계 심도
- `64.5s`: 5대 비대칭 성단 · 순백 침묵 협곡 · 현수선 동맥망
- `84.5s`: 중앙 질문핵 보존 30m 천구 아밀러리 돔 궤도
- `107.6s`: 기원 소거 후 2세대 태고의 바람 지평 & 사스트루기 설원

### ⑤ 납품 규격 자동 검수 (`verify-mp4.mjs`)
```bash
# 기본 마스터 파일 검수 (해상도·H.264·yuv420p·무음·900MB 이하·3600프레임 정합성 + 순백 루프 이음매 <= 4 LSB 검증)
pnpm render:verify
```

### ⑥ 현장 리허설 적색기(`Red-Tint`) 역보정 & 야간 LED 프로세서 권장 세팅

불광천 미디어브릿지 야외 P4.6 LED의 적색 발색 편향 및 야간 수면 반사에 대비하여 아래 현장 세팅을 권장합니다.

1. **화이트포인트 보존 감마 적색기 역보정 (`?rgain` / `--r-gain`)**:
   - SVG `feComponentTransfer` 감마 곡선(`R' = R^(1/rgain)`)으로 적색 중·암부 과포화만 정밀 억제하므로, **`?rgain=0.90` 적용 시에도 `#FFFFFF` 순백 지면은 시안(Cyan) 틴트 없이 `RGB(255, 255, 255)`를 100% 유지**합니다.
   - 현장 적색기 편향 시 **`R-Gain 0.90 ~ 0.93`** 적용을 권장합니다:
     ```bash
     node scripts/render-mp4.mjs \
       --r-gain=0.90 \
       --out=renders/bulgwangcheon-aligned-skewed-6480x432-rgain090.mp4

     node scripts/render-stills.mjs --r-gain=0.90
     ```
2. **일몰 후 야간 휘도 디밍 권장 (`17:30–21:00`)**:
   - 본 작품은 약 `85~90%` 면적이 `#FFFFFF` 순백 지면으로 구성되어 있으므로, 일몰 후 야간 상영(`17:30–21:00`) 시 하천 수면 반사 눈부심과 세리프 획의 광학 블루밍(Halation)을 방지하고 먹색 판화 계조를 또렷이 유지하기 위해 현장 LED 컨트롤러 휘도를 **최대치의 `22~28%` (`900–1,200 nits` 상당)** 로 디밍할 것을 권장합니다.

### 주요 렌더러 옵션 요약 (`scripts/render-mp4.mjs`)

| 옵션 | 기본값 | 설명 |
| --- | --- | --- |
| `--fps` | `30` | 출력 프레임레이트 (`30`, `60` 등) |
| `--start` | `0` | 시작 초 |
| `--duration` | `120 - start` | 렌더링 길이(초) |
| `--out` | `renders/bulgwangcheon-aligned-skewed-6480x432-master.mp4` | 출력 파일 경로 |
| `--workers` | `min(4, max(2, cpus - 2))` | 병렬 Headless Chromium 페이지 수 |
| `--crf` | `15` | libx264 화질 계수 |
| `--maxrate` / `--bufsize` | `50M` / `100M` | VBV 비트레이트 상한 (공식 900 MB 이하 보장) |
| `--r-gain` | `1.0` | 화이트포인트 보존 R 채널 감마 역보정 (`0.50` ~ `1.00`) |
| `--skip-build` | `false` | `dist/`가 이미 최신일 때 `vite build` 생략 |

---

## 5. 불광천 미디어브릿지 확정 송출 사양 & 전시 일정

### 확정 송출 규격 (은평문화재단)

| 항목 | 공식 납품 사양 | 본 레포지토리 기본값 |
| --- | --- | --- |
| **해상도 / 비율** | `6480 × 432 px` (`15:1`) | `6480 × 432 px` (`15:1`) |
| **컨테이너 / 코덱** | `MP4` / `H.264` (`yuv420p`) | `MP4` / `libx264` High@L5.1, `yuv420p`, BT.709, `+faststart` |
| **프레임레이트** | `30 fps` 권장 | `30 fps` (`3,600 frames`, 옵션으로 `60 fps` 지원) |
| **오디오** | **무음** | `-an` (오디오 스트림 0개 검증) |
| **파일 용량** | **`900 MB` 이하** | VBV `50M/100M` (2분 최대 `<= 750 MB`, 자동 검수) |
| **러닝타임 / 루프** | 2분 연속 순환 | `120.0s` · `0.70s` 순백 무이음매 루프 (`<= 4 LSB` 자동 검수) |

### 전시 주요 일정표

| 날짜 | 마일스톤 | 산출물 / 체크포인트 |
| --- | --- | --- |
| **12/02 (수)** | 홍보 시트 마감 | 작품 소개·크레딧·대표 스틸 컷 전달 |
| **12/12 (토) 24:00** | 최종 영상 & 대표 이미지 제출 | `6480×432` H.264 무음 MP4 (`<= 900 MB`) + `renders/stills/` 대표 PNG 6종 |
| **12/13 (일) 14:00** | 현장 송출 리허설 | 불광천 미디어브릿지 실제 발색·적색기(`--r-gain`)·야간 휘도(`22~28%`) 점검 및 확정 |
| **12/15 (화) ~ 12/30 (수)** | **본 전시 상영** | 은평문화재단 불광천 미디어브릿지 야외 파노라마 상영 |
