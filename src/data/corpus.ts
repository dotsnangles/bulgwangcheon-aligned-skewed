/**
 * Museum-Grade Multi-Layered Poetic & Natural-History Corpus (`src/data/corpus.ts`)
 *
 * - Zero English meta-slogans; pure specimen codes (`0.14`, `COS 0.884`, `280 MA`, `-812 m`, `5.64 Å`, `PL.01..16`)
 * - 8 Independent non-overlapping Y-rails across `X = 1860 .. 6160` for Act I.1 kitchen memories (leaving `X = 110..1640` pure-white sanctuary for hero query)
 * - Accelerating non-uniform 3D Skewed stations (`X = 2020, 2880, 3960, 5280`, `ΔX = 860 → 1080 → 1320px`) with crisp 2-line hero titles (zero mid-word cutoff)
 * - Balanced arterial graph (`topEdges`): `targetIndex` excluded in Act III, `maxDegree <= 4`, Cluster 5 capped at `<= 30` edges (zero right-edge crimson clot)
 */

import { ARCHIVAL_PLATES, getPlateById, type ArchivalPlateSpec } from '../illustrations.ts';
import { hash } from '../math.ts';

export interface CardSpec {
  readonly id: string;
  readonly gen: 1 | 2;
  readonly group: 'aligned' | 'skewed';
  readonly rank?: 1 | 2 | 3 | 4;
  readonly indexCode: string;
  readonly metric: string;
  readonly title: string;
  readonly snippet: string;
  readonly plateId?: string;
}

export interface SkewedStationSpec {
  readonly gen: 1 | 2;
  readonly rank: 1 | 2 | 3 | 4;
  readonly code: string;
  readonly shortTitle: string;
  readonly label: string;
  readonly sublabel: string;
  readonly x: number;
  readonly y: number;
  readonly rotY: number;
  readonly rotX: number;
  readonly heroPlateId: string;
  readonly cards: readonly CardSpec[];
}

export const QUERY_GEN1 = '김치찌개 끓이는 법';
export const QUERY_GEN2 = '수억 년 전의 바람';
export const REFRACTION_LENS_GEN1 = '발효의 시간 · 결정의 기억';
export const REFRACTION_LENS_GEN2 = '태고의 대기 · 기원의 소거';
export const ALIGNED_FORMULA = '450 ml · 1.75 tbsp · 12.5 min · 1.15 %';
export const TARGET_FRAGMENT_TEXT = '결정이 녹을 때 수억 년 전의 바람이 분다';

export const TARGET_PHRASE_PIECES = [
  { id: 'P0', text: '결정이 녹을 때', sim: 0.42, z: -85 },
  { id: 'P1', text: '수억 년 전의 바람', sim: 0.14, z: 95 },
  { id: 'P2', text: '이 분다', sim: 0.22, z: -75 },
] as const;

/**
 * 8 Tactile Kitchen Memory Strips on 8 strictly independent Y-rails (`y = 58, 102, 146, 190, 242, 286, 330, 374`)
 * strictly within `X = 1860 .. 6180` so `X = 110 .. 1640` remains 100% pure-white sanctuary for the 122px hero query!
 */
export const ALIGNED_MEMORY_LINES: readonly {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly appearAt: number;
}[] = [
  { text: '장독에서 갓 꺼낸 삼 년 묵은 김치 한 포기', x: 2480, y: 58, appearAt: 0.85 },
  { text: '비 오는 저녁 뚝배기 바닥에 지진 돼지비계', x: 4220, y: 102, appearAt: 1.25 },
  { text: '손등으로 가늠해 털어 넣은 굵은 소금', x: 3180, y: 146, appearAt: 1.65 },
  { text: '우물물로 헹군 배추 줄기의 서늘한 단맛', x: 5260, y: 190, appearAt: 2.05 },
  { text: '어머니가 국자로 떠 보던 마지막 간', x: 2380, y: 242, appearAt: 2.45 },
  { text: '아궁이 잔불 위에서 밤새 깊어진 국물', x: 4680, y: 286, appearAt: 2.85 },
  { text: '찬장 구석 사발로 퍼 담던 뿌연 쌀뜨물', x: 3460, y: 330, appearAt: 3.25 },
  { text: '김장철 마당에 번지던 붉은 고춧물과 입김', x: 5340, y: 374, appearAt: 3.65 },
];

export const GEN1_ALIGNED_CARDS: readonly CardSpec[] = [
  {
    id: 'g1_a0',
    gen: 1,
    group: 'aligned',
    indexCode: 'ALIGNED · 01',
    metric: 'COS 0.994',
    title: '표준 계량 공식 — 물 450ml · 12.5분',
    snippet: '묵은지 300g, 고춧가루 1.75큰술, 염도 1.15%로 수렴된 평균 조리안.',
    plateId: 'plate-01',
  },
  {
    id: 'g1_a1',
    gen: 1,
    group: 'aligned',
    indexCode: 'ALIGNED · 02',
    metric: '1.15 % NaCl',
    title: '나트륨 정량 배합과 편차 제거 규격',
    snippet: '국간장과 정제염 비율을 고정해 부엌마다 달랐던 손맛의 분산을 소거한다.',
    plateId: 'plate-15',
  },
  {
    id: 'g1_a2',
    gen: 1,
    group: 'aligned',
    indexCode: 'ALIGNED · 03',
    metric: 'EVAP 18.0%',
    title: '수분 증발률 18% 역산 가열 곡선',
    snippet: '초기 용량과 화력을 통제하여 언제나 동일한 농도의 국물에 도달한다.',
    plateId: 'plate-01',
  },
  {
    id: 'g1_a3',
    gen: 1,
    group: 'aligned',
    indexCode: 'ALIGNED · 04',
    metric: 'pH 4.3 STD',
    title: '산도 pH 4.3 중화 및 숙성 표준 구간',
    snippet: '발효 21일 차 젖산 농도에 정량 감미를 대응시키는 상위 응답의 평균값.',
    plateId: 'plate-15',
  },
  {
    id: 'g1_a4',
    gen: 1,
    group: 'aligned',
    indexCode: 'ALIGNED · 05',
    metric: '85.0 °C',
    title: '대량 조리 중심 온도 및 염도계 검수',
    snippet: '반복 재현을 위해 모든 감각적 판단을 계측기 수치로 치환한 표준 지침.',
    plateId: 'plate-01',
  },
  {
    id: 'g1_a5',
    gen: 1,
    group: 'aligned',
    indexCode: 'ALIGNED · 06',
    metric: 'COS 0.884',
    title: '반복 요약이 빚어낸 평균의 평균',
    snippet: '질문이 머뭇거릴 여백 없이 확률 분포의 가장 두터운 중심부로 귀속된다.',
    plateId: 'plate-01',
  },
];

export const GEN1_SKEWED_STATIONS: readonly SkewedStationSpec[] = [
  {
    gen: 1,
    rank: 1,
    code: 'COS 0.682 · 4.2 μm',
    shortTitle: '옹기 기공과 소금 꽃',
    label: '01 옹기 기공과 소금 꽃',
    sublabel: '유약의 미세 균열을 건너 피어오른 염분의 호흡',
    x: 2020,
    y: 140,
    rotY: -20,
    rotX: 5,
    heroPlateId: 'plate-02',
    cards: [
      {
        id: 'g1_s1_0',
        gen: 1,
        group: 'skewed',
        rank: 1,
        indexCode: '01 SKEWED',
        metric: '4.2 μm',
        title: '숨 쉬는 옹기 태토의 미세 기공',
        snippet: '소성된 흙 입자 틈으로 공기와 염수가 느리게 교차한다.',
        plateId: 'plate-02',
      },
      {
        id: 'g1_s1_1',
        gen: 1,
        group: 'skewed',
        rank: 1,
        indexCode: '01 SKEWED',
        metric: 'RH 42%',
        title: '발효 항아리 내벽의 모세관 증발',
        snippet: '그릇의 숨구멍이 사계절의 습도를 하얀 염분 테로 기록한다.',
        plateId: 'plate-15',
      },
      {
        id: 'g1_s1_2',
        gen: 1,
        group: 'skewed',
        rank: 1,
        indexCode: '01 SKEWED',
        metric: 'COS 0.682',
        title: '장독 어깨에 하얗게 맺힌 소금 꽃',
        snippet: '어두운 부엌의 염수가 다공질 벽을 건너 새벽 바람과 만날 때 결정이 핀다.',
        plateId: 'plate-02',
      },
    ],
  },
  {
    gen: 1,
    rank: 2,
    code: 'COS 0.476 · 5.64 Å',
    shortTitle: '정육면체 호퍼 결정',
    label: '02 정육면체 호퍼 결정',
    sublabel: '수면 위에서 스스로 깎이는 90도 역피라미드 계단',
    x: 2880,
    y: 48,
    rotY: -25,
    rotX: -5,
    heroPlateId: 'plate-03',
    cards: [
      {
        id: 'g1_s2_0',
        gen: 1,
        group: 'skewed',
        rank: 2,
        indexCode: '02 SKEWED',
        metric: '90.0°',
        title: '염화나트륨 격자와 X선 회절 대칭',
        snippet: '이온이 직각 격자로 응고되며 빛의 경로를 정교하게 꺾는다.',
        plateId: 'plate-08',
      },
      {
        id: 'g1_s2_1',
        gen: 1,
        group: 'skewed',
        rank: 2,
        indexCode: '02 SKEWED',
        metric: '26% NaCl',
        title: '염전 증발지 기하학과 결정 뗏목',
        snippet: '수증기가 마른 수면 끝에 얇은 결정 격자들이 부유한다.',
        plateId: 'plate-15',
      },
      {
        id: 'g1_s2_2',
        gen: 1,
        group: 'skewed',
        rank: 2,
        indexCode: '02 SKEWED',
        metric: '5.64 Å',
        title: '정육면체 호퍼 결정의 빈 계단 성장',
        snippet: '모서리가 면의 중심보다 빠르게 자라며 침강하는 역피라미드 테라스를 빚는다.',
        plateId: 'plate-03',
      },
    ],
  },
  {
    gen: 1,
    rank: 3,
    code: 'COS 0.312 · -812 m',
    shortTitle: '지하 812m 암염 습곡',
    label: '03 지하 812m 암염 습곡',
    sublabel: '사라진 고생대 내륙해가 대륙 심부에 남긴 지질 연층',
    x: 3960,
    y: 140,
    rotY: -30,
    rotX: 5,
    heroPlateId: 'plate-05',
    cards: [
      {
        id: 'g1_s3_0',
        gen: 1,
        group: 'skewed',
        rank: 3,
        indexCode: '03 SKEWED',
        metric: 'H-204',
        title: '시추 코어 연층에 새긴 가뭄 주기',
        snippet: '투명 암염과 경석고 띠가 사라진 바다의 계절을 증언한다.',
        plateId: 'plate-06',
      },
      {
        id: 'g1_s3_1',
        gen: 1,
        group: 'skewed',
        rank: 3,
        indexCode: '03 SKEWED',
        metric: '140 m',
        title: '산맥 아래 봉인된 페름기 증발암',
        snippet: '판게아 내륙해가 마르며 남긴 광맥이 심부에 잠들어 있다.',
        plateId: 'plate-06',
      },
      {
        id: 'g1_s3_2',
        gen: 1,
        group: 'skewed',
        rank: 3,
        indexCode: '03 SKEWED',
        metric: '-812 m',
        title: '지하 암염 돔의 부력과 지층 습곡',
        snippet: '수억 년의 지압 아래 소금 지층이 느린 유체처럼 솟아오르며 암반을 휘어 놓는다.',
        plateId: 'plate-05',
      },
    ],
  },
  {
    gen: 1,
    rank: 4,
    code: 'COS 0.168 · 280 MA',
    shortTitle: '페름기 유체 포유물',
    label: '04 페름기 유체 포유물',
    sublabel: '음결정 공동 안에서 떨리는 2억 8천만 년 전 기포',
    x: 5280,
    y: 48,
    rotY: -36,
    rotX: -4,
    heroPlateId: 'plate-07',
    cards: [
      {
        id: 'g1_s4_0',
        gen: 1,
        group: 'skewed',
        rank: 4,
        indexCode: '04 SKEWED',
        metric: 'Ø 0.30mm',
        title: '암염 음결정 내부의 원시 염수',
        snippet: '정육면체 미세 공동 안에 고생대 바닷물과 기포가 갇혀 있다.',
        plateId: 'plate-07',
      },
      {
        id: 'g1_s4_1',
        gen: 1,
        group: 'skewed',
        rank: 4,
        indexCode: '04 SKEWED',
        metric: 'O₂ 28.5%',
        title: '녹는 결정벽과 상승하는 기포열',
        snippet: '격자가 물에 풀리는 찰나 태고의 숨결이 기포열로 솟구친다.',
        plateId: 'plate-13',
      },
      {
        id: 'g1_s4_2',
        gen: 1,
        group: 'skewed',
        rank: 4,
        indexCode: '04 SKEWED',
        metric: '280 MA',
        title: '페름기 암염 포유물에 봉인된 대기',
        snippet: '결정이 닫히던 날 포획된 산소 28.5%의 공기가 편광 현미경 아래 미세하게 떨린다.',
        plateId: 'plate-07',
      },
    ],
  },
];

export const GEN2_ALIGNED_CARDS: readonly CardSpec[] = [
  {
    id: 'g2_a0',
    gen: 2,
    group: 'aligned',
    indexCode: 'ALIGNED · 01',
    metric: '-3,000 m',
    title: '남극 빙하 3,000m 심부 포획 기포',
    snippet: '만년설이 고압의 얼음으로 다져질 때 기포마다 태고의 하늘이 밀봉된다.',
    plateId: 'plate-09',
  },
  {
    id: 'g2_a1',
    gen: 2,
    group: 'aligned',
    indexCode: 'ALIGNED · 02',
    metric: 'DIP 24°',
    title: '고대 사막 사암 사층리와 무역풍',
    snippet: '이동하던 모래 언덕의 사선 결이 바위로 굳어 수억 년 전 풍향을 가리킨다.',
    plateId: 'plate-10',
  },
  {
    id: 'g2_a2',
    gen: 2,
    group: 'aligned',
    indexCode: 'ALIGNED · 03',
    metric: '300 MA',
    title: '석탄기 양치류 화석 기공 밀도',
    snippet: '탄화된 잎 뒷면의 숨구멍 개수가 사라진 고생대 숲의 대기 조성을 역산한다.',
    plateId: 'plate-11',
  },
  {
    id: 'g2_a3',
    gen: 2,
    group: 'aligned',
    indexCode: 'ALIGNED · 04',
    metric: '-2,540 m',
    title: '그린란드 빙하 시추 코어의 연층 기포',
    snippet: '북극권 설원이 해마다 가둔 계절의 공기가 얼음 기둥 속에 촘촘히 포개진다.',
    plateId: 'plate-09',
  },
  {
    id: 'g2_a4',
    gen: 2,
    group: 'aligned',
    indexCode: 'ALIGNED · 05',
    metric: '180 m LOESS',
    title: '황토 고원에 퇴적된 계절풍 먼지층',
    snippet: '대륙을 건넌 겨울 바람이 수백 미터 두께의 고운 실트 단애를 쌓아 올렸다.',
    plateId: 'plate-10',
  },
  {
    id: 'g2_a5',
    gen: 2,
    group: 'aligned',
    indexCode: 'ALIGNED · 06',
    metric: 'O₂ 28.5%',
    title: '결정 용해 시 방출되는 고대 기체',
    snippet: '단단한 격자가 허물어지며 풀려난 기포 하나가 행성 대기 순환과 공명한다.',
    plateId: 'plate-13',
  },
];

export const GEN2_SKEWED_STATIONS: readonly SkewedStationSpec[] = [
  {
    gen: 2,
    rank: 1,
    code: '1.8 MPa · -3,000 m',
    shortTitle: '빙하 심부 기포의 호흡',
    label: '01 빙하 심부 기포의 호흡',
    sublabel: '만년설 절편이 녹을 때 울리는 십만 년 전 공기의 진동',
    x: 2020,
    y: 140,
    rotY: -20,
    rotX: 5,
    heroPlateId: 'plate-09',
    cards: [
      {
        id: 'g2_s1_0',
        gen: 2,
        group: 'skewed',
        rank: 1,
        indexCode: '01 SKEWED',
        metric: '1.4 kHz',
        title: '고대 기포 방출음 오실로그램',
        snippet: '미세 진동이 수억 년 전 바람의 압력을 파형으로 그린다.',
        plateId: 'plate-14',
      },
      {
        id: 'g2_s1_1',
        gen: 2,
        group: 'skewed',
        rank: 1,
        indexCode: '01 SKEWED',
        metric: '4.2 mm/s',
        title: '얼음 벽을 타고 오르는 원시 산소열',
        snippet: '갇혀 있던 기체가 실선처럼 피어오르며 오늘의 공기와 섞인다.',
        plateId: 'plate-13',
      },
      {
        id: 'g2_s1_2',
        gen: 2,
        group: 'skewed',
        rank: 1,
        indexCode: '01 SKEWED',
        metric: '-3,000 m',
        title: '남극 빙하 코어가 녹을 때 터지는 숨',
        snippet: '수천 미터 얼음 압력을 견딘 기포가 물속에서 파열하며 맑은 파동을 남긴다.',
        plateId: 'plate-09',
      },
    ],
  },
  {
    gen: 2,
    rank: 2,
    code: 'AZIMUTH 248° · 95 Hz',
    shortTitle: '사암에 굳은 모래바람',
    label: '02 사암에 굳은 모래바람',
    sublabel: '겹쳐진 화석 사구의 능선과 노래하는 석영의 공명',
    x: 2880,
    y: 48,
    rotY: -25,
    rotX: -5,
    heroPlateId: 'plate-10',
    cards: [
      {
        id: 'g2_s2_0',
        gen: 2,
        group: 'skewed',
        rank: 2,
        indexCode: '02 SKEWED',
        metric: '95 Hz',
        title: '사막 사면을 미끄러지는 석영 공명',
        snippet: '마모된 모래 알갱이가 마찰하며 대지를 낮은 현악기처럼 울린다.',
        plateId: 'plate-14',
      },
      {
        id: 'g2_s2_1',
        gen: 2,
        group: 'skewed',
        rank: 2,
        indexCode: '02 SKEWED',
        metric: '3-FACET',
        title: '편서풍이 깎아낸 다면체 풍식 자갈',
        snippet: '보이지 않는 대기의 흐름이 현무암 모서리에 날카로운 결을 새긴다.',
        plateId: 'plate-10',
      },
      {
        id: 'g2_s2_2',
        gen: 2,
        group: 'skewed',
        rank: 2,
        indexCode: '02 SKEWED',
        metric: '248°',
        title: '사암 단애에 굳은 고대 사막의 능선',
        snippet: '바람이 모래를 밀어 올리고 무너뜨린 사선의 각도가 돌의 무늬로 영구화되었다.',
        plateId: 'plate-10',
      },
    ],
  },
  {
    gen: 2,
    rank: 3,
    code: '300 MA · ALT 32 km',
    shortTitle: '화석 기공과 성층권 우주진',
    label: '03 화석 기공과 성층권 우주진',
    sublabel: '화석 잎이 삼킨 숨결로부터 성층권을 떠도는 미세 구체까지',
    x: 3960,
    y: 140,
    rotY: -30,
    rotX: 5,
    heroPlateId: 'plate-11',
    cards: [
      {
        id: 'g2_s3_0',
        gen: 2,
        group: 'skewed',
        rank: 3,
        indexCode: '03 SKEWED',
        metric: '32 km',
        title: '성층권을 부유하는 수지상 우주진',
        snippet: '급랭된 미세 운석 구체가 양치류 잎 같은 결정 무늬를 품는다.',
        plateId: 'plate-12',
      },
      {
        id: 'g2_s3_1',
        gen: 2,
        group: 'skewed',
        rank: 3,
        indexCode: '03 SKEWED',
        metric: '-5,000 m',
        title: '심해 점토층에 가라앉은 태고 먼지',
        snippet: '성층권을 건넌 극미세 석영 입자가 바다 밑에서 풍속계를 이룬다.',
        plateId: 'plate-12',
      },
      {
        id: 'g2_s3_2',
        gen: 2,
        group: 'skewed',
        rank: 3,
        indexCode: '03 SKEWED',
        metric: '28 μm',
        title: '석탄기 양치류 표피와 열린 기공 화석',
        snippet: '3억 년 전 습지림을 스치던 바람이 식물의 여닫이 세포 모양으로 고스란히 남았다.',
        plateId: 'plate-11',
      },
    ],
  },
  {
    gen: 2,
    rank: 4,
    code: '38 m/s · 0.14 → ∞',
    shortTitle: '극지 사스트루기 설원',
    label: '04 극지 사스트루기 설원',
    sublabel: '발자국 없는 순백의 지평 위에 바람 스스로 조각한 파동',
    x: 5280,
    y: 48,
    rotY: -36,
    rotX: -4,
    heroPlateId: 'plate-16',
    cards: [
      {
        id: 'g2_s4_0',
        gen: 2,
        group: 'skewed',
        rank: 4,
        indexCode: '04 SKEWED',
        metric: '38 m/s',
        title: '극지 활강풍이 깎은 사스트루기 능선',
        snippet: '거센 극지 바람이 단단한 설면을 파내며 자신의 형상을 남긴다.',
        plateId: 'plate-16',
      },
      {
        id: 'g2_s4_1',
        gen: 2,
        group: 'skewed',
        rank: 4,
        indexCode: '04 SKEWED',
        metric: '4.6 GA',
        title: '운석 속 선태양 입자가 품은 별의 바람',
        snippet: '지구 대기 이전에 늙은 별이 불어낸 규소 먼지가 설원에서 발견된다.',
        plateId: 'plate-12',
      },
      {
        id: 'g2_s4_2',
        gen: 2,
        group: 'skewed',
        rank: 4,
        indexCode: '04 SKEWED',
        metric: '0.14 → ∞',
        title: '사라진 질문 너머 다시 열리는 설원',
        snippet: '부엌의 사소한 물음은 흔적 없이 지워지고 광활한 설원의 바람만이 지평을 건넌다.',
        plateId: 'plate-16',
      },
    ],
  },
];

/* =========================================================================
 * 200 MULTI-LAYERED DECONSTRUCTED FRAGMENTS
 * - 70 Poetic Anchors (2~8 chars, 35%)
 * - 110 Observational Short Sentences (10~24 chars, 55%)
 * - 20 Lithograph Plate Nodes (10%, crisp 13px Bold Mono specimen codes)
 * ========================================================================= */

const CLUSTER_ANCHORS: readonly (readonly string[])[] = [
  [
    '평균의 냄비',
    '표준 계량',
    '염도 1.15%',
    '보간된 맛',
    '끓는 표면',
    '보로노이 막',
    '수분 증발',
    '손짐작 소거',
    '대류 기포',
    '정렬된 답',
    '단일 공식',
  ],
  [
    '소금 꽃',
    '옹기 기공',
    '백화 현상',
    '모세관 숨',
    '유약의 틈',
    '장독의 밤',
    '염분 서리',
    '다공질 벽',
    '젖산 발효',
    '새벽 습도',
    '소성된 흙',
    '항아리 결',
  ],
  [
    '호퍼 결정',
    '직각 격자',
    '벽개면',
    '과포화 염수',
    '소금 뗏목',
    '회절 대칭',
    '역피라미드',
    '염전 기하',
    '입방 결정',
    '굴절된 빛',
    '결정 계단',
    '간수의 시간',
  ],
  [
    '연층의 시간',
    '암염 돔',
    '시추 코어',
    '마른 바다',
    '지하 812m',
    '습곡 단층',
    '증발암 분지',
    '페름기 층',
    '경석고 띠',
    '광물 성소',
    '판게아 해',
  ],
  [
    '고생대 대기',
    '유체 포유물',
    '음결정 공동',
    '원시 염수',
    '소광 십자',
    '브라운 떨림',
    '산소 28.5%',
    '상승 기포열',
    '복굴절 빛',
    '봉인된 숨',
    '미세 기포',
    '결정의 틈',
  ],
  [
    '빙하의 숨',
    '풍성 사층리',
    '화석 기공',
    '성층권 먼지',
    '사스트루기',
    '태고의 풍향',
    '만년설 기포',
    '모래의 공명',
    '초신성 입자',
    '비소거 변방',
    '설원 지평',
    '다음 질문',
  ],
];

const CLUSTER_SENTENCES: readonly (readonly string[])[] = [
  [
    '물 450ml와 가열 12.5분의 표준 공식',
    '계량스푼이 지워 버린 부엌의 손짐작',
    '상위 검색 결과는 하나의 숫자로 좁혀진다',
    '묵은지 한 포기가 평균 중량으로 환산된다',
    '비등점 위에서 거품이 다각형 막을 짠다',
    '끓어오르는 국물 표면의 보로노이 세포망',
    '뚝배기 바닥에서 수직으로 오르는 기포',
    '어머니의 눈대중이 소수점 아래로 절삭된다',
    '끓는점의 온도계가 서로 다른 부엌의 불길을 하나로 묶는다',
    '산도 pH 4.3에 맞춰 정렬된 조리 순서',
    '수분 증발률 18%를 역산한 균질한 농도',
    '굵은 천일염 한 줌이 정량 g으로 바뀐다',
    '편차를 허용하지 않는 매끈한 요약의 표면',
    '뜨거운 물 속에서 결정이 순식간에 풀린다',
    '반복 학습된 문장들이 서로의 모서리를 깎는다',
    '가장 안전한 중심부로 수렴하는 확률의 중력',
    '소금 한 알이 품었던 바다의 이력이 지워진다',
    '익숙한 레시피의 가장자리에서 사선이 열린다',
  ],
  [
    '장독 어깨마다 하얗게 피어오른 소금 서리',
    '흙 입자 사이 수 마이크로미터의 숨구멍',
    '염수가 어두운 도기 벽을 건너 바깥으로 배어 나온다',
    '유약의 실금 끝에서 결정이 처음으로 눈을 뜬다',
    '북향 장독대 그늘이 겨울의 건조한 바람을 모은다',
    '항아리는 닫혀 있어도 기공으로 계절을 마신다',
    '빈 독 안쪽 벽을 쓸면 사각거리는 하얀 입자',
    '삼투압이 배추 잎맥의 수분을 천천히 밀어낸다',
    '천일염의 쓴 간수가 가을 햇볕 아래 빠져나간다',
    '기압이 낮아진 저녁이면 옹기 표면이 촉촉해진다',
    '부엌의 그릇 벽면에서 미세한 광물학이 시작된다',
    '모세관 현상이 끌어 올린 느리고 투명한 염수 길',
    '옹기 외벽의 미세한 숨구멍마다 하얀 염분 침상이 자란다',
    '장독대 서늘한 새벽 공기가 포화 염수를 결정으로 응결시킨다',
    '발효의 기포가 어두운 수면에 작은 원을 그린다',
    '계절마다 다른 높이로 새겨진 염분의 나이테',
    '반투과성 점토막이 안과 밖의 공기를 교환한다',
    '손끝에 묻어나는 서늘하고 각진 소금 가루',
  ],
  [
    '모서리가 면보다 빨리 자라 계단 동굴을 판다',
    '수면장력에 매달린 채 자라나는 역피라미드 결정',
    '나트륨과 염소 이온이 90도 직각으로 맞물린다',
    '결정 하나를 쪼개도 다시 작은 정육면체가 된다',
    'X선이 통과한 자리에 별자리 같은 회절점이 찍힌다',
    '염전 수로 끝에 얼음장처럼 얇은 소금막이 뜬다',
    '남서풍이 수증기를 훔쳐 간 자리에 남는 기하학',
    '염수 농도 26% 임계점에서 첫 결정핵이 맺힌다',
    '여덟 겹의 직각 테라스가 중심으로 깊어져 간다',
    '완벽한 벽개면을 따라 빛이 1.544로 굴절된다',
    '액체의 무질서가 고체의 엄격한 대칭으로 굳는다',
    '빠르게 닫히는 격자 틈에 작은 모액이 갇힌다',
    '증발지 사각 칸마다 서로 다른 채도의 소금빛',
    '정오의 직사광선이 하얀 결정면을 날카롭게 깎는다',
    '면심입방 격자 상수 5.64옹스트롬의 미시 건축',
    '소금 창고의 어둠 속에서 결정의 모서리가 단단해진다',
    '자연이 사람의 손 없이 세운 가장 정직한 직각',
    '결정이 닫히는 바로 그 순간 내부 시간이 멈춘다',
  ],
  [
    '지하 812m 암반 아래 투명한 소금 산맥이 솟는다',
    '2억 8천만 년 전 내륙해가 증발하며 남긴 지층',
    '밀도가 낮은 암염층이 상부 퇴적암을 밀어 올린다',
    '시추 코어 원기둥에 교대로 새겨진 가뭄의 연층',
    '투명한 암염과 어두운 경석고 띠의 느린 리듬',
    '빛 한 줄기 없던 심부 지각에 보존된 옛 바다',
    '수천만 년의 압력이 딱딱한 결정을 유체처럼 휜다',
    '드릴 비트가 고생대의 마른 해안선을 관통한다',
    '판게아 초대륙 한복판에 고였던 거대한 염호',
    '대륙 이동이 옛 해저를 산맥의 뿌리로 들어 올렸다',
    '단층선을 따라 비스듬히 어긋난 백색 광물맥',
    '기록되지 않은 계절을 돌의 줄무늬가 증언한다',
    '시료 상자 H-204에 누운 수억 년의 수직 단면',
    '증발과 범람이 수만 번 되풀이되며 쌓인 시간',
    '동판화 세선처럼 휘어진 지하 암염 돔의 습곡',
    '지온 34.5도의 어둠 속에서 투명도를 지킨 결정',
    '사라진 대양의 무게가 한 뼘의 시추 코어에 응축된다',
    '지질학의 수직 시추가 사유의 사선과 교차한다',
  ],
  [
    '정육면체 음결정 공동 안에 고생대 공기가 떠 있다',
    '편광 현미경 아래 미세하게 떨리는 0.3mm 기포',
    '오늘날보다 짙었던 산소 28.5%의 원시 대기',
    '직교 편광판 사이로 선명한 십자 소광 무늬가 열린다',
    '완벽한 결정이 아니라 어긋난 결함이 기억을 품는다',
    '결정이 물에 풀리며 가느다란 기포열을 밀어 올린다',
    '얇은 소금 벽 너머에서 멈춰 있던 2억 8천만 년',
    '브라운 운동으로 끊임없이 진동하는 태고의 기포',
    '레이저 미세 천공이 봉인된 페름기 숨결을 깨운다',
    '기포 경계면의 전반사가 은빛 고리를 두른다',
    '질량분석기가 읽어 낸 고대 바다 위의 대기압',
    '원시 염수 한 방울 속에 잠든 시간의 미립자',
    '현미경 스테이지를 돌리면 간섭색 파동이 번진다',
    '온도 구배를 따라 기포가 결정벽을 느리게 오른다',
    '복굴절 광학 축이 하나의 빛을 두 갈래로 나눈다',
    '빈틈없이 정렬된 격자에는 숨결이 깃들지 못한다',
    '작은 결함 하나가 행성 규모의 대기를 증언한다',
    '녹아내리는 모서리마다 수억 년의 침묵이 풀려난다',
    '한 알의 결정이 녹아 다음 질문의 바람이 된다',
  ],
  [
    TARGET_FRAGMENT_TEXT,
    '남극 3,000m 빙하 코어에 갇힌 태고 하늘의 기포',
    '고대 사막 사암의 사층리에 굳어 있는 무역풍의 각도',
    '석탄기 양치류 화석 잎 뒷면에 열린 기공의 숨결',
    '성층권 편서풍을 타고 떠돌던 수지상 우주진 입자',
    '고대 기포가 터질 때 기록된 미세 음향 파형',
    '극지 활강풍이 설원에 깎아 놓은 사스트루기 물결',
    '극점의 만년설 아래에도 녹지 않은 미세 기포층이 숨을 쉰다',
    '빙하 시추공 깊은 벽면에서 고대 대기압의 균열음이 울린다',
    '그린란드 심부 얼음이 물속에서 맑은 파열음을 낸다',
    '모래 언덕이 이동하며 남긴 사선이 바위로 남았다',
    '백악기 호박 수지 안에 멈춘 작은 공기방울 하나',
    '황토 고원을 건너온 계절풍이 쌓은 수백 미터 먼지층',
    '운석 속 선태양 입자에 새겨진 늙은 별의 바람',
    '대양 바닥 점토층에 가라앉은 성층권의 석영 가루',
    '요리법의 기억이 지워진 자리에 광활한 대기가 열린다',
    '염전 바닥의 소금 결정이 지질 시대의 먼 바람과 공명한다',
    '부엌에서 출발한 사선이 마침내 극지의 지평에 닿는다',
    '순백의 설원 위로 수억 년 전의 바람이 다시 분다',
  ],
];

export type FragmentTier = 'anchor' | 'sentence' | 'plate';

export interface FragmentItem {
  readonly index: number;
  readonly id: string;
  readonly code: string;
  readonly type: 'text' | 'img';
  readonly tier: FragmentTier;
  readonly content: string;
  readonly label?: string;
  readonly plate?: ArchivalPlateSpec;
  readonly cluster: number;
  readonly querySim: number;
  readonly level: number;
  readonly scale: number;
  readonly opacity: number;
  readonly isHeading?: boolean;
  readonly isMacroHub?: boolean;
  readonly baseFontPx: number;
  readonly vec: Float32Array;
}

export const MACRO_HUB_TEXTS = new Set<string>([
  '평균의 냄비',
  '옹기 기공',
  '호퍼 결정',
  '판게아 해',
  '유체 포유물',
  '빙하의 숨',
]);

export interface PairWeight {
  readonly a: number;
  readonly b: number;
  readonly weight: number;
}

export interface CorpusBundle {
  readonly fragments: readonly FragmentItem[];
  readonly targetIndex: number;
  readonly neighborIndices: readonly number[];
  readonly rankedPairs: readonly PairWeight[];
  readonly topEdges: readonly { a: number; b: number; weight: number; strength: number }[];
  readonly neighbors: readonly (readonly { index: number; weight: number }[])[];
}

/** Crisp 13px Bold Mono specimen codes for outdoor P4.6 LED legibility (zero 9px Korean blur) */
const FINAL_IMAGE_SPECS: readonly {
  readonly plateId: string;
  readonly cluster: number;
  readonly customLabel: string;
  readonly code: string;
  readonly resonantOrder?: number;
}[] = [
  { plateId: 'plate-01', cluster: 0, customLabel: '보로노이 세포막', code: 'PL.01 · 100°C' },
  { plateId: 'plate-15', cluster: 0, customLabel: '염전 증발지', code: 'PL.15 · 1.15%' },
  { plateId: 'plate-01', cluster: 0, customLabel: '대류 거품망', code: 'PL.01B · FOAM' },
  { plateId: 'plate-02', cluster: 1, customLabel: '옹기 미세 기공', code: 'PL.02 · 4.2μm' },
  { plateId: 'plate-08', cluster: 1, customLabel: '결정 격자 회절', code: 'PL.08B · LAUE' },
  { plateId: 'plate-02', cluster: 1, customLabel: '백화 결정침', code: 'PL.02B · NaCl' },
  { plateId: 'plate-03', cluster: 2, customLabel: '호퍼 결정', code: 'PL.03 · 90.0°' },
  { plateId: 'plate-08', cluster: 2, customLabel: 'X선 회절무늬', code: 'PL.08 · 5.64Å' },
  { plateId: 'plate-03', cluster: 2, customLabel: '역피라미드 계단', code: 'PL.03B · FCC' },
  { plateId: 'plate-05', cluster: 3, customLabel: '암염 돔 습곡', code: 'PL.05 · -812m' },
  { plateId: 'plate-06', cluster: 3, customLabel: '시추 코어 연층', code: 'PL.06 · H-204' },
  { plateId: 'plate-07', cluster: 4, customLabel: '페름기 포유물', code: 'PL.07 · 280MA' },
  { plateId: 'plate-13', cluster: 4, customLabel: '상승 기포열', code: 'PL.13 · O₂ 28%', resonantOrder: 3 },
  { plateId: 'plate-07', cluster: 4, customLabel: '고생대 기포', code: 'PL.07B · 0.3mm' },
  { plateId: 'plate-09', cluster: 5, customLabel: '남극 빙하 기포', code: 'PL.09 · -3000m', resonantOrder: 0 },
  { plateId: 'plate-10', cluster: 5, customLabel: '풍성 사층리', code: 'PL.10 · 248°', resonantOrder: 1 },
  { plateId: 'plate-11', cluster: 5, customLabel: '양치류 화석 기공', code: 'PL.11 · 300MA', resonantOrder: 2 },
  { plateId: 'plate-14', cluster: 5, customLabel: '음향 오실로그램', code: 'PL.14 · 1.4kHz', resonantOrder: 4 },
  { plateId: 'plate-12', cluster: 5, customLabel: '성층권 우주진', code: 'PL.12 · 32km' },
  { plateId: 'plate-16', cluster: 5, customLabel: '사스트루기 설원', code: 'PL.16 · 38m/s' },
];

function buildSemanticVector(cluster: number, globalIdx: number): Float32Array {
  const dim = 16;
  const v = new Float32Array(dim);
  const primary = (cluster * 2) % dim;
  const secondary = (cluster * 2 + 1) % dim;
  const bridgeNext = ((cluster + 1) * 2) % dim;

  v[primary] = 1.0;
  v[secondary] = 0.66 + hash(globalIdx * 13 + 3) * 0.34;
  v[bridgeNext] = 0.28 + hash(globalIdx * 29 + 7) * 0.26;
  for (let d = 0; d < dim; d++) {
    v[d]! += (hash(globalIdx * 41 + d * 19) - 0.5) * 0.25;
  }

  let norm = 0;
  for (let d = 0; d < dim; d++) norm += v[d]! * v[d]!;
  norm = Math.sqrt(norm) || 1;
  for (let d = 0; d < dim; d++) v[d]! /= norm;
  return v;
}

function cosineWeight(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let d = 0; d < a.length; d++) dot += a[d]! * b[d]!;
  return Math.max(0, Math.min(1, (1 + dot) * 0.5));
}

let cachedBundle: CorpusBundle | null = null;

export function getCorpus(): CorpusBundle {
  if (cachedBundle) return cachedBundle;

  const simRanges: readonly [number, number][] = [
    [0.78, 0.99],
    [0.56, 0.77],
    [0.39, 0.56],
    [0.25, 0.39],
    [0.15, 0.26],
    [0.015, 0.145],
  ];

  const rawItems: {
    type: 'text' | 'img';
    tier: FragmentTier;
    content: string;
    label?: string;
    code: string;
    plate?: ArchivalPlateSpec;
    cluster: number;
    querySim: number;
    isHeading: boolean;
    baseFontPx: number;
    isMacroHub?: boolean;
    resonantOrder?: number;
  }[] = [];

  for (let c = 0; c < 6; c++) {
    const anchors = CLUSTER_ANCHORS[c]!;
    const sentences = CLUSTER_SENTENCES[c]!;
    const imgs = FINAL_IMAGE_SPECS.filter((im) => im.cluster === c);
    const [sLo, sHi] = simRanges[c]!;

    const maxSteps = Math.max(anchors.length, sentences.length);
    let aPtr = 0;
    let sPtr = 0;
    let iPtr = 0;

    for (let step = 0; step < maxSteps + 6; step++) {
      if (aPtr < anchors.length && (step % 2 === 0 || sPtr >= sentences.length)) {
        const txt = anchors[aPtr]!;
        const frac = 1 - aPtr / Math.max(1, anchors.length - 1);
        const qSim = Math.max(0.015, Math.min(0.99, sLo + (sHi - sLo) * (0.25 + 0.7 * frac)));
        const isMacroHub = MACRO_HUB_TEXTS.has(txt);
        const isHeroAnchor = aPtr < 2;
        rawItems.push({
          type: 'text',
          tier: 'anchor',
          content: txt,
          code: `C0${c + 1}.A${String(aPtr + 1).padStart(2, '0')}`,
          cluster: c,
          querySim: isMacroHub ? sHi : qSim,
          isHeading: true,
          isMacroHub,
          baseFontPx: isMacroHub ? 42 : isHeroAnchor ? 23.5 : 19.5,
        });
        aPtr++;
      }

      if (iPtr < imgs.length && step === Math.floor(((iPtr + 1) * maxSteps) / (imgs.length + 1))) {
        const im = imgs[iPtr]!;
        const baseSpec = getPlateById(im.plateId);
        const qSim = im.resonantOrder !== undefined ? 0.14 : sLo + (sHi - sLo) * (0.68 - iPtr * 0.16);
        rawItems.push({
          type: 'img',
          tier: 'plate',
          content: im.customLabel,
          label: im.customLabel,
          code: im.code,
          plate: { ...baseSpec, label: im.customLabel, code: im.code },
          cluster: c,
          querySim: Math.max(0.02, Math.min(0.96, qSim)),
          isHeading: false,
          baseFontPx: 13,
          resonantOrder: im.resonantOrder,
        });
        iPtr++;
      }

      if (sPtr < sentences.length) {
        const txt = sentences[sPtr]!;
        const isTarget = txt === TARGET_FRAGMENT_TEXT;
        const frac = 1 - sPtr / Math.max(1, sentences.length - 1);
        const jitter = (hash((c * 40 + sPtr) * 19 + 7) - 0.5) * 0.03;
        const qSim = isTarget ? 0.14 : Math.max(0.015, Math.min(0.985, sLo + (sHi - sLo) * frac + jitter));
        rawItems.push({
          type: 'text',
          tier: 'sentence',
          content: txt,
          code: `C0${c + 1}.S${String(sPtr + 1).padStart(2, '0')}`,
          cluster: c,
          querySim: qSim,
          isHeading: false,
          baseFontPx: 14.5,
        });
        sPtr++;
      }
    }

    while (aPtr < anchors.length) {
      const txt = anchors[aPtr++]!;
      const isMacroHub = MACRO_HUB_TEXTS.has(txt);
      rawItems.push({
        type: 'text',
        tier: 'anchor',
        content: txt,
        code: `C0${c + 1}.A${String(aPtr).padStart(2, '0')}`,
        cluster: c,
        querySim: isMacroHub ? sHi : sLo + (sHi - sLo) * 0.5,
        isHeading: true,
        isMacroHub,
        baseFontPx: isMacroHub ? 42 : 19.5,
      });
    }
    while (iPtr < imgs.length) {
      const im = imgs[iPtr++]!;
      const baseSpec = getPlateById(im.plateId);
      rawItems.push({
        type: 'img',
        tier: 'plate',
        content: im.customLabel,
        label: im.customLabel,
        code: im.code,
        plate: { ...baseSpec, label: im.customLabel, code: im.code },
        cluster: c,
        querySim: im.resonantOrder !== undefined ? 0.14 : sLo + (sHi - sLo) * 0.4,
        isHeading: false,
        baseFontPx: 13,
        resonantOrder: im.resonantOrder,
      });
    }
    while (sPtr < sentences.length) {
      const txt = sentences[sPtr++]!;
      const isTarget = txt === TARGET_FRAGMENT_TEXT;
      rawItems.push({
        type: 'text',
        tier: 'sentence',
        content: txt,
        code: `C0${c + 1}.S${String(sPtr).padStart(2, '0')}`,
        cluster: c,
        querySim: isTarget ? 0.14 : sLo + (sHi - sLo) * 0.3,
        isHeading: false,
        baseFontPx: 14.5,
      });
    }
  }

  if (rawItems.length !== 200) {
    throw new Error(`Expected exactly 200 fragments, got ${rawItems.length}`);
  }

  let minSim = Infinity;
  let maxSim = -Infinity;
  for (const r of rawItems) {
    if (r.querySim < minSim) minSim = r.querySim;
    if (r.querySim > maxSim) maxSim = r.querySim;
  }
  const simSpan = Math.max(1e-6, maxSim - minSim);

  let targetIndex = -1;
  const resonantSlots: number[] = [-1, -1, -1, -1, -1];

  const fragments: FragmentItem[] = rawItems.map((r, idx) => {
    const isTarget = r.type === 'text' && r.content === TARGET_FRAGMENT_TEXT;
    if (isTarget) targetIndex = idx;
    if (r.resonantOrder !== undefined) {
      resonantSlots[r.resonantOrder] = idx;
    }

    const level = isTarget ? 0.0 : Math.max(0, Math.min(1, (r.querySim - minSim) / simSpan));
    const scale = isTarget ? 0.72 : 0.72 + level;
    // Preserve non-erasure principle while keeping outdoor P4.6 LED visibility crisp (0.28 + 0.72 * level)
    const opacity = isTarget ? 0.28 : Math.max(0.28, 0.28 + 0.72 * level);
    const vec = buildSemanticVector(r.cluster, idx);

    return {
      index: idx,
      id: `f_${String(idx).padStart(3, '0')}`,
      code: r.code,
      type: r.type,
      tier: r.tier,
      content: r.content,
      label: r.label,
      plate: r.plate,
      cluster: r.cluster,
      querySim: r.querySim,
      level,
      scale,
      opacity,
      isHeading: r.isHeading,
      isMacroHub: r.isMacroHub,
      baseFontPx: r.baseFontPx,
      vec,
    };
  });

  if (targetIndex < 0) {
    throw new Error('Target peripheral fragment missing from corpus.');
  }

  const neighborIndices = resonantSlots.filter((idx) => idx >= 0);

  const n = fragments.length;
  const rankedPairs: PairWeight[] = [];
  const adjLists: { index: number; weight: number }[][] = Array.from({ length: n }, () => []);

  for (let i = 0; i < n; i++) {
    const vi = fragments[i]!.vec;
    for (let j = i + 1; j < n; j++) {
      const w = cosineWeight(vi, fragments[j]!.vec);
      rankedPairs.push({ a: i, b: j, weight: w });
      adjLists[i]!.push({ index: j, weight: w });
      adjLists[j]!.push({ index: i, weight: w });
    }
  }

  rankedPairs.sort((p, q) => q.weight - p.weight || p.a - q.a || p.b - q.b);

  const neighbors = adjLists.map((list) => {
    list.sort((a, b) => b.weight - a.weight || a.index - b.index);
    return list.slice(0, 5);
  });

  // Balanced, degree-capped arterial graph (`topEdges`):
  //   (a) Exclude `targetIndex` completely until Act IV
  //   (b) Max degree <= 4 per node (zero broomstick/starburst clots!)
  //   (c) Even quota per cluster: <= 48 intra-cluster edges for clusters 0..4, <= 30 for Cluster 5, plus <= 36 cross-cluster bridges
  const degree = new Uint16Array(n);
  const clusterEdgeCount = [0, 0, 0, 0, 0, 0];
  const clusterQuota = [48, 48, 48, 48, 48, 30];
  let crossBridgeCount = 0;
  const selectedPairs: PairWeight[] = [];

  for (const pair of rankedPairs) {
    if (pair.a === targetIndex || pair.b === targetIndex) continue;
    if (degree[pair.a]! >= 4 || degree[pair.b]! >= 4) continue;

    const ca = fragments[pair.a]!.cluster;
    const cb = fragments[pair.b]!.cluster;
    if (ca === cb) {
      if (clusterEdgeCount[ca]! >= clusterQuota[ca]!) continue;
      clusterEdgeCount[ca]!++;
    } else {
      if (Math.abs(ca - cb) > 1 || crossBridgeCount >= 36) continue;
      crossBridgeCount++;
    }

    degree[pair.a]!++;
    degree[pair.b]!++;
    selectedPairs.push(pair);
    if (selectedPairs.length >= 300) break;
  }

  const wMax = selectedPairs[0]?.weight ?? 1;
  const wMin = selectedPairs[selectedPairs.length - 1]?.weight ?? 0.7;
  const wDenom = Math.max(1e-6, wMax - wMin);
  const topEdges = selectedPairs.map((e) => ({
    a: e.a,
    b: e.b,
    weight: e.weight,
    strength: Math.max(0, Math.min(1, (e.weight - wMin) / wDenom)),
  }));

  cachedBundle = {
    fragments,
    targetIndex,
    neighborIndices,
    rankedPairs,
    topEdges,
    neighbors,
  };
  return cachedBundle;
}

export { ARCHIVAL_PLATES };
