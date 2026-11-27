# 정렬과 사선 (Aligned / Skewed) — 불광천 미디어브릿지 6480×432

**2026 아트코리아랩 오픈 프롬프트 해커톤 2조 (`안국AI기동타격대`)** 원작 웹아트를 **은평문화재단 불광천 미디어브릿지** 초광폭(`6480 × 432 px`, `15:1`) 야외 파노라마 스크린에 맞게 확장·제작한 실시간 웹아트 모션 스튜디오 및 공식 송출 동영상 렌더링 레포지토리입니다.

- **단일 전 폭 캔버스**: `6480 × 432 px` 전체를 3분할 복제 없이 하나의 연속된 공간으로 구성합니다.
- **원작 조형 문법 계승**: 순백 바탕(`#FFFFFF`), `1px #000` 잉크 선, 한국어 명조(`Noto Serif KR`), 정렬 파랑(`#0000FF`), 사선 주황(`#FF9E4D ~ #FFD09A`), 절단·유사도 빨강(`#FF0000`).
- **100% 결정론적 렌더링**: 라이브 브라우저 프리뷰와 Headless Chromium MP4 렌더러가 동일한 `window.renderAt(t)` 엔진을 실행하여 프레임 오차 0, 순백 무이음매 2분 루프를 보장합니다.

---

## 1. 실시간 웹 스튜디오 & 단톡방 피드백 공유법

코드 설치 없이 브라우저만으로 30m 전 폭과 `1:1` 실제 픽셀 디테일을 즉시 확인할 수 있습니다.

- **라이브 스튜디오 (GitHub Pages)**: [`https://dotsnangles.github.io/bulgwangcheon-aligned-skewed/`](https://dotsnangles.github.io/bulgwangcheon-aligned-skewed/)

### 단톡방에서 정확한 장면으로 피드백 주고받기
1. 스튜디오에서 수정·논의하고 싶은 시각(`Scrubber` 또는 `Scene 1~4` 버튼)으로 이동하고, 돋보기(`1:1` 또는 `0.65x`)를 드래그해 원하는 가로 위치(`x`)에 맞춥니다.
2. 우측 상단의 **`[현재 장면 링크 복사]`** 버튼을 클릭합니다.
3. 버튼이 **`링크 복사 완료!`** 로 바뀌며 클립보드에 딥링크 URL이 복사됩니다. 단톡방에 그대로 붙여넣으면 팀원이 클릭 즉시 **동일한 시각·동일한 X 좌표·일시정지 상태**로 같은 화면을 볼 수 있습니다.

```text
예시 딥링크:
https://dotsnangles.github.io/bulgwangcheon-aligned-skewed/?t=96.5&x=5210&zoom=1&pause=1
```

### 지원 URL 쿼리 파라미터

| 파라미터 | 범위 / 예시 | 설명 |
| --- | --- | --- |
| `t` | `0` ~ `120` (`?t=58.0`) | 시작 타임스탬프(초) |
| `x` | `0` ~ `6480` (`?x=3200`) | 돋보기 중심 X 좌표(px). 지정 시 `Auto-Follow Action: OFF`로 자동 고정 |
| `zoom` | `1` 또는 `0.65` (`?zoom=0.65`) | 하단 디테일 뷰포트 배율 (`1:1` / `0.65x`) |
| `pause` | `1` (`?pause=1`) | 일시정지 상태로 즉시 열기 |
| `rgain` | `0.50` ~ `1.00` (`?rgain=0.90`) | 현장 LED 적색기 보정 (스테이지 전체 R 채널 선형 스케일) |
| `raw` | `1` (`?raw=1&t=18`) | UI 없는 순수 `6480 × 432` 송출 원본 모드 |

---

## 2. 로컬 개발 환경 3분 세팅

### 사전 준비물
- **Node.js 22+** (`node -v` 확인)
- **pnpm** (`corepack enable && corepack prepare pnpm@latest --activate` 또는 `npm i -g pnpm`)
- **FFmpeg / FFprobe** (동영상 렌더링 및 규격 검수용)
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

# 3. (동영상·스틸 렌더링이 필요한 경우 1회 실행) Headless Chromium 설치
pnpm setup:render
```

---

## 3. 역할별 파일 수정 가이드

팀원 각자가 담당 영역만 안전하게 수정할 수 있도록 데이터·스타일·레이아웃·엔진이 분리되어 있습니다.

| 담당 역할 | 수정 파일 | 수정 내용 |
| --- | --- | --- |
| **기획 · 카피 · 아카이브 문구** | `src/data/corpus.ts` | 1·2차 검색어, `aligned` / `01~04 skewed` 카드 텍스트, 200개 분해 조각 문장 및 목표 구절 |
| **연출 · 타임라인 · 하단 자막** | `src/data/timeline.ts` | Scene 1~4 라벨·구간(`SCENES`), 하단 내러티브 캡션(`STAGE_CAPTIONS`), 길이/BPM 상수 |
| **타이포그래피 · 비주얼 스타일** | `src/style.css` | 명조 폰트 크기, 카드/포커스 패널 여백, `1px #000` 규칙선, 스튜디오 UI 스타일 |
| **아카이브 도판 일러스트** | `src/illustrations.ts` | 원문 내 삽입되는 12종 에디토리얼 판화(`240×160` 절차적 캔버스 도판) |
| **2D/3D 배치 알고리즘** | `src/layouts/deconstruct-layout.ts` | 18단 원문, 읽기 2D, 30m 수평 3D 나선, 코사인 스프링, 3D 구름, 타원 궤도 좌표 계산 |
| **모션 엔진 · 카메라 · 색보정** | `src/engine/stage.ts` | 120초 타임라인 애니메이션(`renderAt`), 돋보기 자동 추적(`getFocusX`), `?rgain` 필터 |

> **작업 전 확인**: 변경 후 반드시 `pnpm build`로 타입체크 및 프로덕션 빌드 오류 `0`건을 확인하세요. 세부 협업 원칙은 [`AGENTS.md`](./AGENTS.md)를 참고하세요.

---

## 4. 전시 규격 동영상 · 대표 이미지 렌더링 레시피

모든 출력 파일은 `renders/` 디렉터리에 생성되며(`.gitignore` 처리), 임시 PNG 파일을 디스크에 쌓지 않고 Playwright 워커에서 FFmpeg `stdin`으로 직접 파이프합니다.

### ① 빠른 검수 클립 렌더링 (8초, `t = 12..20s`)
```bash
pnpm render:clip
# 출력: renders/clip-preview.mp4 (완료 시 자동 규격 검수 포함)
```

### ② 2분 공식 마스터 MP4 렌더링 (30fps · `6480×432` · 무음 · `<= 900 MB`)
```bash
pnpm render:master
# 출력: renders/bulgwangcheon-aligned-skewed-6480x432-master.mp4
```

### ③ 60fps 고프레임 테스트 / 대안 마스터 렌더링
```bash
node scripts/render-mp4.mjs \
  --fps=60 \
  --out=renders/bulgwangcheon-aligned-skewed-6480x432-60fps.mp4
```
> `--maxrate=50M --bufsize=100M` VBV 제약이 기본 적용되어 있어 2분 풀 렌더 시 30fps·60fps 모두 최대 용량이 수학적으로 `<= 750 MB` 이내로 안전하게 관리됩니다.

### ④ `12/12` 제출용 `6480 × 432` 대표 이미지 추출 (무손실 PNG)
```bash
# 기본 주요 장면 6종 (t = 18.0, 39.2, 58.0, 70.5, 83.0, 96.5s) -> renders/stills/
pnpm render:stills

# 원하는 시각만 커스텀 지정
node scripts/render-stills.mjs --times=18,58,83
```

### ⑤ 납품 규격 자동 검수 (`verify-mp4.mjs`)
```bash
# 기본 마스터 파일 검수 (해상도·H.264·yuv420p·무음·900MB 이하·프레임 정합성 + 120초 순백 루프 이음매 검증)
pnpm render:verify

# 임의의 클립/보정본 검수
node scripts/verify-mp4.mjs renders/clip-preview.mp4
```

### ⑥ `12/13(일)` 현장 리허설 적색기(`Red-Tint`) 보정 레시피
불광천 미디어브릿지 야외 LED는 붉은 기가 강하게 발색될 수 있습니다. 현장 리허설에서 아래와 같이 즉시 색보정 값을 찾아 재렌더링할 수 있습니다.

1. **브라우저 실시간 확인**: 스튜디오 또는 Raw URL 뒤에 `?rgain=0.90`(허용 범위 `0.50..1.00`)을 붙여 확인합니다.
   - 예: `https://dotsnangles.github.io/bulgwangcheon-aligned-skewed/?t=58&rgain=0.90`
2. **적색기 보정 마스터 & 스틸 렌더링**:
   ```bash
   node scripts/render-mp4.mjs \
     --r-gain=0.90 \
     --out=renders/bulgwangcheon-aligned-skewed-6480x432-rgain090.mp4

   node scripts/render-stills.mjs --r-gain=0.90
   ```

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
| `--r-gain` | `1.0` | R 채널 선형 스케일 (`0.50` ~ `1.00`) |
| `--skip-build` | `false` | `dist/`가 이미 최신일 때 `vite build` 생략 |

---

## 5. 불광천 미디어브릿지 확정 송출 사양 & 전시 일정

### 확정 송출 규격 (은평문화재단)

| 항목 | 공식 납품 사양 | 본 레포지토리 기본값 |
| --- | --- | --- |
| **해상도 / 비율** | `6480 × 432 px` (`15:1`) | `6480 × 432 px` (`15:1`) |
| **컨테이너 / 코덱** | `MP4` / `H.264` (`yuv420p`) | `MP4` / `libx264` High@L5.1, `yuv420p`, BT.709, `+faststart` |
| **프레임레이트** | `30 fps` 권장 | `30 fps` (옵션으로 `60 fps` 지원) |
| **오디오** | **무음** | `-an` (오디오 스트림 0개 검증) |
| **파일 용량** | **`900 MB` 이하** | VBV `50M/100M` (2분 최대 `<= 750 MB`, 자동 검수) |
| **러닝타임 / 루프** | 2분 연속 순환 | `120.0s` · 순백 무이음매 루프 (`<= 4 LSB` 자동 검수) |

### 전시 주요 일정표

| 날짜 | 마일스톤 | 산출물 / 체크포인트 |
| --- | --- | --- |
| **12/02 (수)** | 홍보 시트 마감 | 작품 소개·크레딧·대표 스틸 컷 전달 |
| **12/12 (토) 24:00** | 최종 영상 & 대표 이미지 제출 | `6480×432` H.264 무음 MP4 (`<= 900 MB`) + `renders/stills/` 대표 PNG |
| **12/13 (일) 14:00** | 현장 송출 리허설 | 불광천 미디어브릿지 실제 발색·적색기(`--r-gain`) 점검 및 최종본 확정 |
| **12/15 (화) ~ 12/30 (수)** | **본 전시 상영** | 은평문화재단 불광천 미디어브릿지 야외 파노라마 상영 |
