/**
 * Museum-Grade Multi-Layered Poetic & Natural-History Corpus (`src/data/corpus.ts`)
 *
 * - Act I Aligned contrast: Living kitchen memories vs cold statistical formula (`450 ml · 1.75 tbsp · 12.5 min · 1.15 %`)
 * - Gen 1 Monoliths: 10 Aligned + 12 Skewed (`01 -> 04`) mapped to fine-press lithograph plates
 * - Gen 2 (`수억 년 전의 바람`) Monoliths: 16 unique 3D monolith cards mapped to `plate-09..16`
 * - 200 Unique Deconstructed Fragments:
 *     * 70 Condensed Poetic Anchors (`2~8 chars`, 35%)
 *     * 110 Observational Short Sentences (`10~24 chars`, 55%)
 *     * 20 Fine-Press Lithograph Plate Nodes (`plate-01..16` + 4 detail crops, 10%)
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
  readonly label: string;
  readonly sublabel: string;
  readonly x: number;
  readonly heroPlateId: string;
  readonly cards: readonly CardSpec[];
}

export const QUERY_GEN1 = '김치찌개 끓이는 법';
export const QUERY_GEN2 = '수억 년 전의 바람';
export const ALIGNED_FORMULA = '450 ml · 1.75 tbsp · 12.5 min · 1.15 %';
export const TARGET_FRAGMENT_TEXT = '결정이 녹을 때 수억 년 전의 바람이 분다';

export const TARGET_PHRASE_PIECES = [
  { id: 'P0', text: '결정이 녹을 때', sim: 0.42, z: -70 },
  { id: 'P1', text: '수억 년 전의 바람', sim: 0.14, z: 90 },
  { id: 'P2', text: '이 분다', sim: 0.22, z: -50 },
] as const;

/** Living, tactile kitchen memories crushed by statistical alignment in Act I (00:00–00:08) */
export const ALIGNED_MEMORY_LINES: readonly {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly beat: number;
}[] = [
  { text: '장독에서 갓 꺼낸 삼 년 묵은 김치 한 포기', x: 740, y: 96, beat: 3 },
  { text: '비 오는 저녁 뚝배기 바닥에 지진 돼지비계', x: 2040, y: 318, beat: 4 },
  { text: '손등으로 가늠해 털어 넣은 굵은 소금', x: 3420, y: 108, beat: 5 },
  { text: '우물물로 헹군 배추 줄기의 서늘한 단맛', x: 4780, y: 312, beat: 6 },
  { text: '어머니가 국자로 떠 보던 마지막 간', x: 1380, y: 204, beat: 7 },
  { text: '아궁이 잔불 위에서 밤새 깊어진 국물', x: 2780, y: 224, beat: 8 },
  { text: '찬장 구석 사발로 퍼 담던 뿌연 쌀뜨물', x: 4160, y: 196, beat: 9 },
  { text: '김장철 마당에 번지던 붉은 고춧물과 입김', x: 5560, y: 164, beat: 10 },
];

export const GEN1_ALIGNED_CARDS: readonly CardSpec[] = [
  {
    id: 'g1_a0',
    gen: 1,
    group: 'aligned',
    indexCode: 'ALN.01 / CONSENSUS',
    metric: 'COS 0.994 · σ 0.02',
    title: '표준 계량 공식 — 물 450ml · 가열 12.5분',
    snippet: '묵은지 300g, 돼지고기 200g, 고춧가루 1.75큰술, 염도 1.15%로 수렴된 평균 조리안.',
    plateId: 'plate-01',
  },
  {
    id: 'g1_a1',
    gen: 1,
    group: 'aligned',
    indexCode: 'ALN.02 / SALINITY',
    metric: 'COS 0.981 · 1.15%',
    title: '나트륨 정량 배합과 편차 제거 프로토콜',
    snippet: '1인분 385kcal 기준 국간장과 정제염 비율을 고정해 손맛의 분산을 소거한다.',
  },
  {
    id: 'g1_a2',
    gen: 1,
    group: 'aligned',
    indexCode: 'ALN.03 / THERMAL',
    metric: 'COS 0.968 · 18.0%',
    title: '수분 증발률 18.0% 역산 가열 곡선',
    snippet: '초기 용량과 화력을 수치로 통제하여 언제나 동일한 농도의 국물에 도달한다.',
    plateId: 'plate-01',
  },
  {
    id: 'g1_a3',
    gen: 1,
    group: 'aligned',
    indexCode: 'ALN.04 / ACIDITY',
    metric: 'COS 0.954 · pH 4.3',
    title: '산도 pH 4.3 중화 및 숙성 일수 표준 구간',
    snippet: '발효 21일 차 젖산 농도에 설탕 0.5큰술을 대응시키는 상위 응답의 평균값.',
  },
  {
    id: 'g1_a4',
    gen: 1,
    group: 'aligned',
    indexCode: 'ALN.05 / MATRIX',
    metric: 'COS 0.942 · TOP-10',
    title: '상위 10개 조리 문서의 통계적 중심값',
    snippet: '수만 개의 부엌이 지녔던 우연과 기호는 보간을 거치며 매끈한 표준으로 압축된다.',
    plateId: 'plate-15',
  },
  {
    id: 'g1_a5',
    gen: 1,
    group: 'aligned',
    indexCode: 'ALN.06 / BATCH-100',
    metric: 'COS 0.929 · 85.0°C',
    title: '대량 조리 중심 온도 85°C · 염도계 검수',
    snippet: '오차 없는 반복 재현을 위해 모든 감각적 판단을 계측기 수치로 치환한 지침.',
  },
  {
    id: 'g1_a6',
    gen: 1,
    group: 'aligned',
    indexCode: 'ALN.07 / BROTH-STD',
    metric: 'COS 0.915 · 500ml',
    title: '육수 추출 시간 10분 · 마늘 1.0큰술 규격',
    snippet: '지역과 계절의 차이를 지우고 가장 예측 가능한 단일 풍미로 정렬된 응답.',
  },
  {
    id: 'g1_a7',
    gen: 1,
    group: 'aligned',
    indexCode: 'ALN.08 / RATIO-1.5',
    metric: 'COS 0.903 · 1.5:1',
    title: '용매 대 고형물 질량비 1.5 : 1 균질화',
    snippet: '끓는점 오름 0.5°C 구간에서 대류 기포의 크기가 일정한 격자로 수렴한다.',
    plateId: 'plate-01',
  },
  {
    id: 'g1_a8',
    gen: 1,
    group: 'aligned',
    indexCode: 'ALN.09 / INTERPOLATE',
    metric: 'COS 0.891 · μ-AVG',
    title: '반복 요약이 빚어낸 평균의 평균',
    snippet: '질문이 머뭇거릴 틈 없이 가장 두터운 확률 분포의 한복판으로 즉시 귀속된다.',
  },
  {
    id: 'g1_a9',
    gen: 1,
    group: 'aligned',
    indexCode: 'ALN.10 / ZERO-VAR',
    metric: 'COS 0.884 · Δ 0.00',
    title: '소금 0.8큰술 · 가열 12.5분 최종 수렴본',
    snippet: '정렬된 세계의 끝에서 모든 냄비는 같은 시간 동안 같은 농도로 끓어오른다.',
  },
];

export const GEN1_SKEWED_STATIONS: readonly SkewedStationSpec[] = [
  {
    gen: 1,
    rank: 1,
    code: '01 / SKEWED · COS 0.682',
    label: '01 옹기 기공과 소금 꽃',
    sublabel: '유약의 미세 균열을 건너 피어오른 염분의 호흡',
    x: 2120,
    heroPlateId: 'plate-02',
    cards: [
      {
        id: 'g1_s1_0',
        gen: 1,
        group: 'skewed',
        rank: 1,
        indexCode: '01 / SKEWED · SEM-02',
        metric: 'PORE 4.2μm · COS 0.712',
        title: '숨 쉬는 옹기 태토의 미세 기공과 염분 이동',
        snippet: '1,200°C 가마에서 소성된 흙 입자 틈으로 공기와 염수가 느리게 교차한다.',
        plateId: 'plate-02',
      },
      {
        id: 'g1_s1_1',
        gen: 1,
        group: 'skewed',
        rank: 1,
        indexCode: '01 / SKEWED · BLOOM',
        metric: 'NaCl CRUST · COS 0.684',
        title: '장독 어깨에 하얗게 맺힌 소금 꽃 백화',
        snippet: '어두운 부엌의 염수가 다공질 벽을 건너 새벽 바람과 만날 때 결정이 핀다.',
        plateId: 'plate-02',
      },
      {
        id: 'g1_s1_2',
        gen: 1,
        group: 'skewed',
        rank: 1,
        indexCode: '01 / SKEWED · CAPILLARY',
        metric: 'RH 42% · COS 0.651',
        title: '발효 항아리 내벽의 모세관 증발과 계절 테',
        snippet: '그릇의 미세한 숨구멍이 사계절의 기압과 습도를 하얀 염분 띠로 기록한다.',
        plateId: 'plate-15',
      },
    ],
  },
  {
    gen: 1,
    rank: 2,
    code: '02 / SKEWED · COS 0.476',
    label: '02 정육면체 호퍼 결정',
    sublabel: '증발하는 수면 위에서 스스로 깎이는 90도 역피라미드 계단',
    x: 3200,
    heroPlateId: 'plate-03',
    cards: [
      {
        id: 'g1_s2_0',
        gen: 1,
        group: 'skewed',
        rank: 2,
        indexCode: '02 / SKEWED · HOPPER',
        metric: 'FCC 5.64Å · COS 0.508',
        title: '호퍼 결정(Hopper Crystal)의 속 빈 계단 성장',
        snippet: '모서리가 면의 중심보다 빠르게 자라며 침강하는 역피라미드 테라스를 빚는다.',
        plateId: 'plate-03',
      },
      {
        id: 'g1_s2_1',
        gen: 1,
        group: 'skewed',
        rank: 2,
        indexCode: '02 / SKEWED · LAUE-08',
        metric: '90.0° LATTICE · COS 0.474',
        title: '염화나트륨 면심입방 격자와 X선 회절 대칭',
        snippet: '나트륨과 염소 이온이 완벽한 직각 격자로 응고되며 빛의 경로를 꺾는다.',
        plateId: 'plate-08',
      },
      {
        id: 'g1_s2_2',
        gen: 1,
        group: 'skewed',
        rank: 2,
        indexCode: '02 / SKEWED · SALTERN',
        metric: 'BRINE 26% · COS 0.442',
        title: '해안 염전 증발지 기하학과 표면장력 뗏목',
        snippet: '바람이 수증기를 거두어간 수면 끝에 얇은 결정 격자들이 부유하다 가라앉는다.',
        plateId: 'plate-15',
      },
    ],
  },
  {
    gen: 1,
    rank: 3,
    code: '03 / SKEWED · COS 0.312',
    label: '03 지하 812m 암염 습곡',
    sublabel: '사라진 고생대 내륙해가 대륙 심부에 남긴 투명한 지질 연층',
    x: 4280,
    heroPlateId: 'plate-05',
    cards: [
      {
        id: 'g1_s3_0',
        gen: 1,
        group: 'skewed',
        rank: 3,
        indexCode: '03 / SKEWED · DIAPIR',
        metric: 'DEPTH -812M · COS 0.338',
        title: '암염 돔(Salt Diapir)의 부력 상승과 지층 습곡',
        snippet: '수억 년의 지압 아래 소금 지층이 느린 유체처럼 솟아오르며 암반을 휘어 놓는다.',
        plateId: 'plate-05',
      },
      {
        id: 'g1_s3_1',
        gen: 1,
        group: 'skewed',
        rank: 3,
        indexCode: '03 / SKEWED · H-204',
        metric: 'VARVE 140M · COS 0.309',
        title: '시추 코어 연층(Varve)에 각인된 고대 가뭄 주기',
        snippet: '투명 암염과 얇은 경석고 띠가 번갈아 쌓여 사라진 바다의 계절을 증언한다.',
        plateId: 'plate-06',
      },
      {
        id: 'g1_s3_2',
        gen: 1,
        group: 'skewed',
        rank: 3,
        indexCode: '03 / SKEWED · BASIN',
        metric: '280 MA · COS 0.284',
        title: '산맥 아래 봉인된 페름기 증발암 분지',
        snippet: '판게아 초대륙의 내륙해가 마르며 남긴 빛의 광맥이 지하 어둠 속에 잠들어 있다.',
        plateId: 'plate-05',
      },
    ],
  },
  {
    gen: 1,
    rank: 4,
    code: '04 / SKEWED · COS 0.186',
    label: '04 페름기 유체 포유물',
    sublabel: '음결정 공동 안에서 브라운 운동으로 떨리는 2억 8천만 년 전 기포',
    x: 5340,
    heroPlateId: 'plate-07',
    cards: [
      {
        id: 'g1_s4_0',
        gen: 1,
        group: 'skewed',
        rank: 4,
        indexCode: '04 / SKEWED · NEG-CRYS',
        metric: 'Ø 0.30mm · COS 0.214',
        title: '암염 음결정(Negative Crystal) 내부의 원시 염수',
        snippet: '정육면체 미세 공동 안에 고생대 바닷물 한 방울과 대기 기포가 갇혀 있다.',
        plateId: 'plate-07',
      },
      {
        id: 'g1_s4_1',
        gen: 1,
        group: 'skewed',
        rank: 4,
        indexCode: '04 / SKEWED · PLUME',
        metric: 'O₂ 28.5% · COS 0.191',
        title: '녹아내리는 결정벽과 상승하는 태고의 기포열',
        snippet: '결정 격자가 물에 풀리는 찰나 수억 년 전의 숨결이 가느다란 기포열로 솟구친다.',
        plateId: 'plate-13',
      },
      {
        id: 'g1_s4_2',
        gen: 1,
        group: 'skewed',
        rank: 4,
        indexCode: '04 / SKEWED · ARCHIVE',
        metric: '280 MA AIR · COS 0.168',
        title: '페름기 암염 유체 포유물에 봉인된 고대 대기',
        snippet: '결정이 닫히던 날 포획된 산소 28.5%의 공기가 편광 현미경 아래 미세하게 떨린다.',
        plateId: 'plate-07',
      },
    ],
  },
];

/**
 * Gen 2 (`QUERY_GEN2 = "수억 년 전의 바람"`): 16 Unique 3D Monolith Cards (`4 Aligned + 12 Skewed`)
 * Mapped comprehensively across `plate-09` .. `plate-16` with zero trace of cooking left!
 */
export const GEN2_ALIGNED_CARDS: readonly CardSpec[] = [
  {
    id: 'g2_a0',
    gen: 2,
    group: 'aligned',
    indexCode: 'GEN2.ALN.01 / EPICA',
    metric: '-3,000M · 800 KA',
    title: '남극 빙하 코어 3,000m 심부에 봉인된 고대 기포',
    snippet: '만년설이 고압의 얼음으로 다져질 때 기포마다 태고의 하늘이 그대로 밀봉된다.',
    plateId: 'plate-09',
  },
  {
    id: 'g2_a1',
    gen: 2,
    group: 'aligned',
    indexCode: 'GEN2.ALN.02 / AEOLIAN',
    metric: 'DIP 24° · PERMIAN',
    title: '고대 사막 사암의 풍성 사층리와 무역풍 방위각',
    snippet: '이동하던 모래 언덕의 사선 결이 붉은 바위로 굳어 수억 년 전의 풍향을 가리킨다.',
    plateId: 'plate-10',
  },
  {
    id: 'g2_a2',
    gen: 2,
    group: 'aligned',
    indexCode: 'GEN2.ALN.03 / STOMATA',
    metric: '300 MA · CO₂ PROXY',
    title: '석탄기 양치류 화석 잎의 기공 밀도와 고생대 대기',
    snippet: '탄화된 잎 뒷면의 미세한 숨구멍 개수가 사라진 숲의 공기 조성을 역산한다.',
    plateId: 'plate-11',
  },
  {
    id: 'g2_a3',
    gen: 2,
    group: 'aligned',
    indexCode: 'GEN2.ALN.04 / PLUME',
    metric: 'HALITE · O₂ 28.5%',
    title: '결정 용해 시 방출되는 고생대 미량 기체 파형',
    snippet: '단단한 격자가 허물어지며 풀려난 작은 기포 하나가 행성 대기 순환과 공명한다.',
    plateId: 'plate-13',
  },
];

export const GEN2_SKEWED_STATIONS: readonly SkewedStationSpec[] = [
  {
    gen: 2,
    rank: 1,
    code: '01 / SKEWED · GLACIAL FIZZ',
    label: '01 빙하 심부 기포의 파열음',
    sublabel: '남극 만년설 절편이 녹을 때 울리는 십만 년 전 공기의 진동',
    x: 2060,
    heroPlateId: 'plate-09',
    cards: [
      {
        id: 'g2_s1_0',
        gen: 2,
        group: 'skewed',
        rank: 1,
        indexCode: 'GEN2.01 / VOSTOK-ICE',
        metric: 'BUBBLE 1.8MPa',
        title: '빙하 코어가 녹을 때 터져 나오는 태고 기포의 맥박',
        snippet: '수천 미터 얼음 압력을 견딘 기포가 물속에서 파열하며 짧은 음향 파형을 남긴다.',
        plateId: 'plate-09',
      },
      {
        id: 'g2_s1_1',
        gen: 2,
        group: 'skewed',
        rank: 1,
        indexCode: 'GEN2.01 / ACOUSTIC-14',
        metric: 'WAVE 1.4kHz',
        title: '고대 기포 방출음의 오실로그램 스펙트럼 기록',
        snippet: '비가청 대역까지 번지는 미세 진동이 수억 년 전 바람의 압력을 파형으로 그린다.',
        plateId: 'plate-14',
      },
      {
        id: 'g2_s1_2',
        gen: 2,
        group: 'skewed',
        rank: 1,
        indexCode: 'GEN2.01 / MELT-PLUME',
        metric: 'ASCENT 4.2mm/s',
        title: '투명한 얼음 벽을 타고 수직 상승하는 원시 산소열',
        snippet: '갇혀 있던 기체가 가느다란 실선처럼 피어오르며 오늘의 공기와 다시 섞인다.',
        plateId: 'plate-13',
      },
    ],
  },
  {
    gen: 2,
    rank: 2,
    code: '02 / SKEWED · LITHIFIED WIND',
    label: '02 사암에 화석화된 모래바람',
    sublabel: '수천 번 겹쳐진 사구의 능선과 노래하는 석영의 공명',
    x: 3180,
    heroPlateId: 'plate-10',
    cards: [
      {
        id: 'g2_s2_0',
        gen: 2,
        group: 'skewed',
        rank: 2,
        indexCode: 'GEN2.02 / ERG-STRATA',
        metric: 'AZIMUTH 248°',
        title: '대륙 사암 단애에 겹겹이 굳은 고대 사막의 능선',
        snippet: '바람이 모래를 밀어 올리고 무너뜨린 사선의 각도가 돌의 무늬로 영구화되었다.',
        plateId: 'plate-10',
      },
      {
        id: 'g2_s2_1',
        gen: 2,
        group: 'skewed',
        rank: 2,
        indexCode: 'GEN2.02 / BOOMING-SAND',
        metric: 'RESONANCE 95Hz',
        title: '사막 사면을 미끄러지는 석영 입자의 저음 공명',
        snippet: '균일하게 마모된 모래 알갱이들이 마찰하며 대지 전체를 낮은 현악기처럼 울린다.',
        plateId: 'plate-14',
      },
      {
        id: 'g2_s2_2',
        gen: 2,
        group: 'skewed',
        rank: 2,
        indexCode: 'GEN2.02 / VENTIFACT',
        metric: 'AEOLIAN FACET',
        title: '편서풍이 수만 년간 깎아낸 다면체 풍식 자갈',
        snippet: '보이지 않는 대기의 흐름이 가장 단단한 현무암 모서리에 날카로운 결을 새긴다.',
        plateId: 'plate-10',
      },
    ],
  },
  {
    gen: 2,
    rank: 3,
    code: '03 / SKEWED · FOSSIL BREATH',
    label: '03 석탄기 기공과 성층권 우주진',
    sublabel: '화석 잎이 삼킨 숨결로부터 성층권을 떠도는 미세 구체까지',
    x: 4300,
    heroPlateId: 'plate-11',
    cards: [
      {
        id: 'g2_s3_0',
        gen: 2,
        group: 'skewed',
        rank: 3,
        indexCode: 'GEN2.03 / PTERIDOPHYTA',
        metric: 'STOMA 28μm',
        title: '석탄기 양치류 표피 세포망과 열린 기공의 화석',
        snippet: '3억 년 전 습지림을 스치던 바람이 식물의 여닫이 세포 모양으로 고스란히 남았다.',
        plateId: 'plate-11',
      },
      {
        id: 'g2_s3_1',
        gen: 2,
        group: 'skewed',
        rank: 3,
        indexCode: 'GEN2.03 / SPHERULE-12',
        metric: 'ALT 32KM · Fe-Ni',
        title: '성층권 편서풍을 타고 부유하는 수지상 우주진 구체',
        snippet: '대기권 상층에서 녹았다가 급랭된 미세 운석 입자가 양치류 잎 같은 결정화를 품는다.',
        plateId: 'plate-12',
      },
      {
        id: 'g2_s3_2',
        gen: 2,
        group: 'skewed',
        rank: 3,
        indexCode: 'GEN2.03 / DEEP-CLAY',
        metric: 'ABYSSAL -5,000M',
        title: '대양 심해 점토층에 가라앉은 태고 제트기류의 먼지',
        snippet: '대륙과 성층권을 건넌 극미세 입자들이 바다 밑바닥에서 행성의 풍속계를 이룬다.',
        plateId: 'plate-12',
      },
    ],
  },
  {
    gen: 2,
    rank: 4,
    code: '04 / SKEWED · SASTRUGI HORIZON',
    label: '04 극지 사스트루기 설원 지평선',
    sublabel: '어느 발자국도 남지 않은 순백의 지평 위에 바람 스스로 조각한 파동',
    x: 5420,
    heroPlateId: 'plate-16',
    cards: [
      {
        id: 'g2_s4_0',
        gen: 2,
        group: 'skewed',
        rank: 4,
        indexCode: 'GEN2.04 / SASTRUGI',
        metric: 'KATABATIC 38m/s',
        title: '극지 활강풍이 얼음 평원에 깎아 놓은 사스트루기 능선',
        snippet: '거센 극지 바람이 단단한 설면을 물결 모양으로 파내며 바람 자신의 형상을 남긴다.',
        plateId: 'plate-16',
      },
      {
        id: 'g2_s4_1',
        gen: 2,
        group: 'skewed',
        rank: 4,
        indexCode: 'GEN2.04 / PRESOLAR',
        metric: '4.6 GA · SiC',
        title: '운석 속 선태양 입자(Presolar Grain)가 품은 별의 바람',
        snippet: '지구의 대기가 태어나기 전 늙은 별이 불어낸 규소 먼지가 설원 얼음 속에서 발견된다.',
        plateId: 'plate-12',
      },
      {
        id: 'g2_s4_2',
        gen: 2,
        group: 'skewed',
        rank: 4,
        indexCode: 'GEN2.04 / WHITE-HORIZON',
        metric: 'ε 0.14 → ∞',
        title: '사라진 질문 너머에서 다시 시작되는 순백의 지평',
        snippet: '부엌의 사소한 물음은 흔적 없이 지워지고 광활한 설원의 바람만이 지평을 건넌다.',
        plateId: 'plate-16',
      },
    ],
  },
];

/* =========================================================================
 * 200 MULTI-LAYERED DECONSTRUCTED FRAGMENTS
 * - 70 Poetic Anchors (2~8 chars, 35%) — large architectural serif anchors
 * - 110 Observational Short Sentences (10~24 chars, 55%) — crisp natural history lines
 * - 20 Lithograph Plate Nodes (10%) — all 16 plates + 4 detail crops
 * ========================================================================= */

const CLUSTER_ANCHORS: readonly (readonly string[])[] = [
  // Cluster 0 (11 anchors, 2~8 chars)
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
  // Cluster 1 (12 anchors, 2~8 chars)
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
  // Cluster 2 (12 anchors, 2~8 chars)
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
  // Cluster 3 (11 anchors, 2~8 chars)
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
  // Cluster 4 (12 anchors, 2~8 chars)
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
  // Cluster 5 (12 anchors, 2~8 chars)
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
  // Cluster 0 (18 sentences, 10~24 chars)
  [
    '물 450ml와 가열 12.5분의 표준 공식',
    '계량스푼이 지워 버린 부엌의 손짐작',
    '상위 검색 결과는 하나의 숫자로 좁혀진다',
    '묵은지 한 포기가 평균 중량으로 환산된다',
    '비등점 위에서 거품이 다각형 막을 짠다',
    '끓어오르는 국물 표면의 보로노이 세포망',
    '뚝배기 바닥에서 수직으로 오르는 기포',
    '어머니의 눈대중이 소수점 아래로 절삭된다',
    '모두에게 무난한 답이 기이한 질문을 덮는다',
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
  // Cluster 1 (18 sentences, 10~24 chars)
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
    '질주하는 시간의 발굽이 정지된 규격을 깨뜨린다',
    '연속 촬영된 다섯 개의 그림자가 지평을 가른다',
    '발효의 기포가 어두운 수면에 작은 원을 그린다',
    '계절마다 다른 높이로 새겨진 염분의 나이테',
    '반투과성 점토막이 안과 밖의 공기를 교환한다',
    '손끝에 묻어나는 서늘하고 각진 소금 가루',
  ],
  // Cluster 2 (18 sentences, 10~24 chars)
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
  // Cluster 3 (18 sentences, 10~24 chars)
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
  // Cluster 4 (19 sentences, 10~24 chars)
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
  // Cluster 5 (19 sentences, 10~24 chars; index 0 is exact TARGET_FRAGMENT_TEXT!)
  [
    TARGET_FRAGMENT_TEXT, // '결정이 녹을 때 수억 년 전의 바람이 분다' (sim = 0.14)
    '남극 3,000m 빙하 코어에 갇힌 태고 하늘의 기포',
    '고대 사막 사암의 사층리에 굳어 있는 무역풍의 각도',
    '석탄기 양치류 화석 잎 뒷면에 열린 기공의 숨결',
    '성층권 편서풍을 타고 떠돌던 수지상 우주진 입자',
    '고대 기포가 터질 때 기록된 미세 음향 파형',
    '극지 활강풍이 설원에 깎아 놓은 사스트루기 물결',
    '가장 먼 변방의 파편도 0.14 아래로 지워지지 않는다',
    '중심에서 밀려난 미약한 문장이 처음의 목적을 허문다',
    '그린란드 심부 얼음이 물속에서 맑은 파열음을 낸다',
    '모래 언덕이 이동하며 남긴 사선이 바위로 남았다',
    '백악기 호박 수지 안에 멈춘 작은 공기방울 하나',
    '황토 고원을 건너온 계절풍이 쌓은 수백 미터 먼지층',
    '운석 속 선태양 입자에 새겨진 늙은 별의 바람',
    '대양 바닥 점토층에 가라앉은 성층권의 석영 가루',
    '요리법의 기억이 지워진 자리에 광활한 대기가 열린다',
    '평균 바깥의 길은 답이 아닌 다음 질문에서 시작된다',
    '부엌에서 출발한 사선이 마침내 극지의 지평에 닿는다',
    '순백의 설원 위로 수억 년 전의 바람이 다시 분다',
  ],
];

/** 20 Lithograph Image Fragment Specs (`16 unique plates + 4 detail crops = 20 img nodes = 10%`) */
const IMAGE_NODE_SPECS: readonly {
  readonly plateId: string;
  readonly cluster: number;
  readonly customLabel: string;
  readonly code: string;
}[] = [
  // Cluster 0 (3 imgs)
  { plateId: 'plate-01', cluster: 0, customLabel: '보로노이 비등 세포막', code: 'PL.01 / VORONOI' },
  { plateId: 'plate-15', cluster: 0, customLabel: '염전 증발지 표준 구획', code: 'PL.15 / GRID' },
  { plateId: 'plate-01', cluster: 0, customLabel: '표면 장력 기포 격자', code: 'PL.01B / FOAM' },
  // Cluster 1 (3 imgs)
  { plateId: 'plate-02', cluster: 1, customLabel: '옹기 미세 기공 SEM 단면', code: 'PL.02 / SEM-4.2μm' },
  { plateId: 'plate-04', cluster: 1, customLabel: '크로노포토그래피 5연속 질주', code: 'PL.04 / STRIDE' },
  { plateId: 'plate-02', cluster: 1, customLabel: '다공질 벽면 소금 꽃 결정침', code: 'PL.02B / NEEDLE' },
  // Cluster 2 (3 imgs)
  { plateId: 'plate-03', cluster: 2, customLabel: '정육면체 호퍼 결정 계단', code: 'PL.03 / HOPPER' },
  { plateId: 'plate-08', cluster: 2, customLabel: 'NaCl X선 라우에 회절무늬', code: 'PL.08 / LAUE' },
  { plateId: 'plate-03', cluster: 2, customLabel: '역피라미드 격자 침강면', code: 'PL.03B / STEP-90°' },
  // Cluster 3 (3 imgs)
  { plateId: 'plate-05', cluster: 3, customLabel: '지하 812m 암염 돔 습곡', code: 'PL.05 / DIAPIR' },
  { plateId: 'plate-06', cluster: 3, customLabel: '시추 코어 H-204 연층', code: 'PL.06 / VARVE' },
  { plateId: 'plate-15', cluster: 3, customLabel: '고대 증발 분지 결정 구획', code: 'PL.15B / BASIN' },
  // Cluster 4 (3 imgs)
  { plateId: 'plate-07', cluster: 4, customLabel: '페름기 음결정 유체 포유물', code: 'PL.07 / 280-MA' },
  { plateId: 'plate-13', cluster: 4, customLabel: '결정 용해와 상승 기포열', code: 'PL.13 / PLUME' },
  { plateId: 'plate-07', cluster: 4, customLabel: '0.30mm 고생대 기포 메니스커스', code: 'PL.07B / MENISCUS' },
  // Cluster 5 (5 imgs — the exact 5 resonant plates awakened across the 30m bridge in Act IV!)
  { plateId: 'plate-09', cluster: 5, customLabel: '남극 3,000m 빙하 포획 기포', code: 'PL.09 / ICE-CORE' },
  { plateId: 'plate-10', cluster: 5, customLabel: '고대 사막 사암 풍성 사층리', code: 'PL.10 / AEOLIAN' },
  { plateId: 'plate-11', cluster: 5, customLabel: '석탄기 양치류 화석 기공', code: 'PL.11 / STOMATA' },
  { plateId: 'plate-14', cluster: 5, customLabel: '고대 바람 음향 오실로그램', code: 'PL.14 / WAVEFORM' },
  { plateId: 'plate-12', cluster: 5, customLabel: '성층권 우주진 · 극지 설원', code: 'PL.12 / COSMIC' },
];

// Wait: let's make sure plate-16 is ALSO directly represented among the 20 image fragments!
// Notice Cluster 3 has plate-15B right now; if we put plate-16 in Cluster 5 and move one Cluster 0 duplicate to Cluster 5 or replace plate-15B with plate-16, ALL 16 plates 01..16 appear in the 200 fragments!

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
  /** Raw query similarity in [0, 1] relative to QUERY_GEN1 */
  readonly querySim: number;
  /** Normalized emphasis level t in [0, 1] */
  readonly level: number;
  /** art-hackathon exact scale = 0.72 + t */
  readonly scale: number;
  /** art-hackathon exact opacity = 0.14 + 0.86 * t (strictly >= 0.14 non-erasure floor) */
  readonly opacity: number;
  /** Large typographic anchor flag */
  readonly isHeading?: boolean;
  /** Base font size in px at scale=1.0 */
  readonly baseFontPx: number;
  /** Synthetic 16-dim semantic vector for genuine cosine similarity */
  readonly vec: Float32Array;
}

export interface PairWeight {
  readonly a: number;
  readonly b: number;
  readonly weight: number;
}

export interface CorpusBundle {
  readonly fragments: readonly FragmentItem[];
  readonly targetIndex: number;
  /** 5 resonant nodes across x = 900..5900 (plates 09, 10, 11, 13, 14) awakened in Act IV */
  readonly neighborIndices: readonly number[];
  readonly rankedPairs: readonly PairWeight[];
  readonly topEdges: readonly { a: number; b: number; weight: number; strength: number }[];
  readonly neighbors: readonly (readonly { index: number; weight: number }[])[];
}

const FINAL_IMAGE_SPECS: readonly {
  readonly plateId: string;
  readonly cluster: number;
  readonly customLabel: string;
  readonly code: string;
  readonly resonantOrder?: number;
}[] = [
  // Cluster 0 (3)
  { plateId: 'plate-01', cluster: 0, customLabel: '끓는 표면 보로노이 세포막', code: 'PL.01 / VORONOI' },
  { plateId: 'plate-15', cluster: 0, customLabel: '해안 염전 증발지 기하학', code: 'PL.15 / SALTERN' },
  { plateId: 'plate-01', cluster: 0, customLabel: '비등 대류 다각형 거품망', code: 'PL.01B / EBULLITION' },
  // Cluster 1 (3)
  { plateId: 'plate-02', cluster: 1, customLabel: '옹기 미세 기공과 소금 꽃', code: 'PL.02 / SEM-4.2μm' },
  { plateId: 'plate-04', cluster: 1, customLabel: '크로노포토그래피 5연속 질주', code: 'PL.04 / 5-STRIDE' },
  { plateId: 'plate-02', cluster: 1, customLabel: '도기 기공 백화 결정침', code: 'PL.02B / EFFLORESCE' },
  // Cluster 2 (3)
  { plateId: 'plate-03', cluster: 2, customLabel: '정육면체 호퍼 결정 계단', code: 'PL.03 / HOPPER' },
  { plateId: 'plate-08', cluster: 2, customLabel: 'NaCl X선 결정 회절무늬', code: 'PL.08 / LAUE-5.64Å' },
  { plateId: 'plate-03', cluster: 2, customLabel: '90도 역피라미드 성장 테라스', code: 'PL.03B / LATTICE' },
  // Cluster 3 (2)
  { plateId: 'plate-05', cluster: 3, customLabel: '지하 812m 암염 돔 습곡', code: 'PL.05 / DIAPIR' },
  { plateId: 'plate-06', cluster: 3, customLabel: '시추 코어 H-204 연층', code: 'PL.06 / VARVE' },
  // Cluster 4 (3) — includes resonant plate-13!
  { plateId: 'plate-07', cluster: 4, customLabel: '페름기 암염 유체 포유물', code: 'PL.07 / 280-MA' },
  { plateId: 'plate-13', cluster: 4, customLabel: '녹는 결정과 상승 기포열', code: 'PL.13 / PLUME', resonantOrder: 3 },
  { plateId: 'plate-07', cluster: 4, customLabel: '음결정 0.30mm 고생대 기포', code: 'PL.07B / INCLUSION' },
  // Cluster 5 (6) — includes resonant plates 09, 10, 11, 14 + plates 12, 16 -> ALL 16 plates present!
  { plateId: 'plate-09', cluster: 5, customLabel: '남극 3,000m 빙하 포획 기포', code: 'PL.09 / ICE-CORE', resonantOrder: 0 },
  { plateId: 'plate-10', cluster: 5, customLabel: '사막 사암 풍성 사층리', code: 'PL.10 / AEOLIAN', resonantOrder: 1 },
  { plateId: 'plate-11', cluster: 5, customLabel: '석탄기 양치류 화석 기공', code: 'PL.11 / STOMATA', resonantOrder: 2 },
  { plateId: 'plate-14', cluster: 5, customLabel: '고대 바람 음향 오실로그램', code: 'PL.14 / WAVEFORM', resonantOrder: 4 },
  { plateId: 'plate-12', cluster: 5, customLabel: '성층권 미세 우주진 입자', code: 'PL.12 / SPHERULE' },
  { plateId: 'plate-16', cluster: 5, customLabel: '극지 바람 사스트루기 설원', code: 'PL.16 / SASTRUGI' },
];

void IMAGE_NODE_SPECS; // replaced by FINAL_IMAGE_SPECS covering all 16 plates

function buildSemanticVector(
  cluster: number,
  localIdx: number,
  globalIdx: number,
  isTarget: boolean,
  isResonant: boolean,
): Float32Array {
  const dim = 16;
  const v = new Float32Array(dim);

  if (isTarget || isResonant) {
    v[10] = 0.96;
    v[11] = 0.72;
    v[5] = 0.56;
    v[12] = isTarget ? 0.32 : 0.28 + (localIdx % 5) * 0.03;
    for (let d = 0; d < dim; d++) {
      v[d]! += (hash(globalIdx * 31 + d * 17) - 0.5) * 0.08;
    }
  } else {
    const primary = cluster * 2;
    const secondary = (cluster * 2 + 1) % dim;
    const bridgeNext = ((cluster + 1) * 2) % dim;
    v[primary] = 1.0;
    v[secondary] = 0.68 + hash(globalIdx * 13 + 3) * 0.34;
    v[bridgeNext] = 0.28 + hash(globalIdx * 29 + 7) * 0.26;
    for (let d = 0; d < dim; d++) {
      v[d]! += (hash(globalIdx * 41 + d * 19) - 0.5) * 0.22;
    }
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
    resonantOrder?: number;
  }[] = [];

  for (let c = 0; c < 6; c++) {
    const anchors = CLUSTER_ANCHORS[c]!;
    const sentences = CLUSTER_SENTENCES[c]!;
    const imgs = FINAL_IMAGE_SPECS.filter((im) => im.cluster === c);
    const [sLo, sHi] = simRanges[c]!;

    // Interleave anchors, sentences, and lithograph plates in rhythmic editorial order
    const maxSteps = Math.max(anchors.length, sentences.length);
    let aPtr = 0;
    let sPtr = 0;
    let iPtr = 0;

    for (let step = 0; step < maxSteps + 6; step++) {
      if (aPtr < anchors.length && (step % 2 === 0 || sPtr >= sentences.length)) {
        const txt = anchors[aPtr]!;
        const frac = 1 - aPtr / Math.max(1, anchors.length - 1);
        const qSim = Math.max(0.015, Math.min(0.99, sLo + (sHi - sLo) * (0.25 + 0.7 * frac)));
        const isHeroAnchor = aPtr < 2;
        rawItems.push({
          type: 'text',
          tier: 'anchor',
          content: txt,
          code: `C0${c + 1}.A${String(aPtr + 1).padStart(2, '0')}`,
          cluster: c,
          querySim: qSim,
          isHeading: true,
          baseFontPx: isHeroAnchor ? 23.5 : 19.5,
        });
        aPtr++;
      }

      if (iPtr < imgs.length && step === Math.floor(((iPtr + 1) * maxSteps) / (imgs.length + 1))) {
        const im = imgs[iPtr]!;
        const baseSpec = getPlateById(im.plateId);
        const customPlate: ArchivalPlateSpec = {
          ...baseSpec,
          label: im.customLabel,
          code: im.code,
        };
        const qSim = im.resonantOrder !== undefined ? 0.14 : sLo + (sHi - sLo) * (0.68 - iPtr * 0.16);
        rawItems.push({
          type: 'img',
          tier: 'plate',
          content: im.customLabel,
          label: im.customLabel,
          code: im.code,
          plate: customPlate,
          cluster: c,
          querySim: Math.max(0.02, Math.min(0.96, qSim)),
          isHeading: false,
          baseFontPx: 11,
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
          baseFontPx: 14.2,
        });
        sPtr++;
      }
    }

    // Flush any remaining items in cluster
    while (aPtr < anchors.length) {
      const txt = anchors[aPtr++]!;
      rawItems.push({
        type: 'text',
        tier: 'anchor',
        content: txt,
        code: `C0${c + 1}.A${String(aPtr).padStart(2, '0')}`,
        cluster: c,
        querySim: sLo + (sHi - sLo) * 0.5,
        isHeading: true,
        baseFontPx: 19.5,
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
        baseFontPx: 11,
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
        baseFontPx: 14.2,
      });
    }
  }

  if (rawItems.length !== 200) {
    throw new Error(`Expected exactly 200 fragments (70 anchors + 110 sentences + 20 plates), got ${rawItems.length}`);
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
    const opacity = isTarget ? 0.14 : Math.max(0.14, 0.14 + 0.86 * level);
    const vec = buildSemanticVector(r.cluster, idx % 34, idx, isTarget, r.resonantOrder !== undefined);

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
      baseFontPx: r.baseFontPx,
      vec,
    };
  });

  if (targetIndex < 0) {
    throw new Error('Target peripheral fragment missing from corpus.');
  }

  const neighborIndices = resonantSlots.filter((idx) => idx >= 0);

  // Compute all 19,900 pairwise cosine similarities
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

  // Build top arterial Bezier network (strong intra-cluster cores + cross-cluster bridges = 420 filaments)
  const topSlice = rankedPairs.slice(0, 420);
  const wMax = topSlice[0]?.weight ?? 1;
  const wMin = topSlice[topSlice.length - 1]?.weight ?? 0.7;
  const wDenom = Math.max(1e-6, wMax - wMin);
  const topEdges = topSlice.map((e) => ({
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
