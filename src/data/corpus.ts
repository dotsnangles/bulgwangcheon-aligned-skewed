/**
 * Complete 100% unique Korean editorial corpus for Aligned / Skewed (6480x432 single unbroken canvas).
 * Zero 3-zone duplication: every card and all 200 deconstructed fragments are distinct.
 */

import { ARCHIVAL_PLATES, type ArchivalPlateSpec } from '../illustrations.ts';
import { hash } from '../math.ts';

export interface CardSpec {
  id: string;
  gen: 1 | 2;
  group: 'aligned' | 'skewed';
  rank?: 1 | 2 | 3 | 4;
  title: string;
  url: string;
  snippet: string;
}

export interface SkewedStationSpec {
  gen: 1 | 2;
  rank: 1 | 2 | 3 | 4;
  label: string;
  sublabel: string;
  x: number;
  cards: CardSpec[];
}

export const QUERY_GEN1 = '김치찌개 끓이는 법';
export const QUERY_GEN2 = '수억 년 전의 바람';
export const TARGET_FRAGMENT_TEXT = '결정이 녹을 때 수억 년 전의 바람이 분다';
export const TARGET_PHRASE_PIECES = [
  { id: 'P0', text: '결정이 녹을 때', sim: 0.42 },
  { id: 'P1', text: '수억 년 전의 바람', sim: 0.14 },
  { id: 'P2', text: '이 분다', sim: 0.22 },
] as const;

export const GEN1_ALIGNED_CARDS: CardSpec[] = [
  {
    id: 'g1_a0',
    gen: 1,
    group: 'aligned',
    title: '백종원 김치찌개 황금레시피 — 실패 없는 계량 공식',
    url: 'https://recipe.table.kr/kimchi-jjigae-standard',
    snippet: '묵은지 300g, 돼지고기 200g, 물 450ml, 고춧가루 1.75큰술, 소금 0.8큰술, 중불 12.5분 가열.',
  },
  {
    id: 'g1_a1',
    gen: 1,
    group: 'aligned',
    title: '돼지고기 김치찌개 칼로리 · 나트륨 · 양념 비율표',
    url: 'https://nutrition.fooddb.kr/jjigae-ratio',
    snippet: '1인분 기준 385kcal, 평균 염도 1.15%, 국간장과 굵은 소금 배합으로 편차를 줄이는 표준안.',
  },
  {
    id: 'g1_a2',
    gen: 1,
    group: 'aligned',
    title: '15분 초간단 찌개 끓이기 — 자취생 필수 레시피',
    url: 'https://cook15.kr/quick-kimchi-stew',
    snippet: '기름에 신김치를 먼저 3분 볶고 쌀뜨물 500ml를 부어 강불에서 12분 끓여냅니다.',
  },
  {
    id: 'g1_a3',
    gen: 1,
    group: 'aligned',
    title: '묵은지 김치찌개 물과 김치 황금비율 1.5 : 1',
    url: 'https://kitchen-lab.kr/water-kimchi-balance',
    snippet: '수분 증발률 18.0%를 역산해 초기 물 용량을 고정하면 매번 동일한 농도에 수렴합니다.',
  },
  {
    id: 'g1_a4',
    gen: 1,
    group: 'aligned',
    title: '참치 김치찌개 1인분 표준 계량 및 조리 순서',
    url: 'https://homecook.kr/tuna-jjigae-manual',
    snippet: '다진 마늘 1.0큰술, 설탕 0.5큰술로 산도 pH 4.3의 신맛을 중화하는 가장 흔한 방법.',
  },
  {
    id: 'g1_a5',
    gen: 1,
    group: 'aligned',
    title: '김치찌개 산도 pH 4.3과 숙성일수 최적 구간',
    url: 'https://ferment-guide.kr/kimchi-ph43',
    snippet: '발효 21일 차 배추김치의 젖산 농도가 찌개 국물의 감칠맛 평균값과 일치합니다.',
  },
  {
    id: 'g1_a6',
    gen: 1,
    group: 'aligned',
    title: '식당 맛 김치찌개 육수 · 마늘 · 고춧가루 배합',
    url: 'https://chef-notes.kr/restaurant-stew-base',
    snippet: '멸치 다시마 육수 500ml에 새우젓 반 큰술과 굵은 고춧가루를 정량 투입합니다.',
  },
  {
    id: 'g1_a7',
    gen: 1,
    group: 'aligned',
    title: '급식 100인분 김치찌개 대량 조리 표준 지침서',
    url: 'https://schoolmeal.kr/standard-100-jjigae',
    snippet: '온도계 중심 온도 85°C 이상 유지, 염도계 0.9% 이내 관리, 조리 시간 엄수.',
  },
  {
    id: 'g1_a8',
    gen: 1,
    group: 'aligned',
    title: '가장 많이 검색된 김치찌개 레시피 TOP 10 비교',
    url: 'https://rank.kitchen.kr/top10-kimchi-jjigae',
    snippet: '상위 10개 레시피의 소금·마늘·가열 시간 분산을 통계적으로 평균 낸 결과입니다.',
  },
  {
    id: 'g1_a9',
    gen: 1,
    group: 'aligned',
    title: '김치찌개 소금 0.8큰술 · 가열 12.5분 표준화 요약',
    url: 'https://avg-recipe.kr/kimchi-consensus',
    snippet: '검색 상위 문서들이 하나의 평균 레시피로 정렬될 때 사라지는 손맛과 우연한 변수들.',
  },
];

export const GEN1_SKEWED_STATIONS: SkewedStationSpec[] = [
  {
    gen: 1,
    rank: 1,
    label: '01 옹기 기공과 소금 꽃',
    sublabel: '항아리 유약 바깥에 맺히는 염분 호흡',
    x: 2040,
    cards: [
      {
        id: 'g1_s1_0',
        gen: 1,
        group: 'skewed',
        rank: 1,
        title: '숨 쉬는 옹기 태토의 미세 기공과 염분 이동',
        url: 'https://ceramic.archive.kr/onggi-micropores',
        snippet: '1200도 가마에서 소성된 흙 입자 사이 수 마이크로미터 틈으로 물과 공기가 드나듭니다.',
      },
      {
        id: 'g1_s1_1',
        gen: 1,
        group: 'skewed',
        rank: 1,
        title: '장독 가에 하얗게 피어오른 소금 꽃(백화 현상)',
        url: 'https://folk-craft.kr/jangdok-efflorescence',
        snippet: '간장과 김칫국물의 염수가 벽을 통과해 바깥 공기와 만나면 하얀 소금 서리가 앉습니다.',
      },
      {
        id: 'g1_s1_2',
        gen: 1,
        group: 'skewed',
        rank: 1,
        title: '발효 옹기 내벽의 모세관 증발과 염도 구배',
        url: 'https://ferment-physics.kr/capillary-salt',
        snippet: '부엌의 장독 하나가 계절의 습도와 기압 변화에 맞춰 천천히 소금을 결정화합니다.',
      },
    ],
  },
  {
    gen: 1,
    rank: 2,
    label: '02 천일염 정육면체 호퍼 결정',
    sublabel: '바닷물이 마르며 깎아내는 90도 계단 격자',
    x: 3040,
    cards: [
      {
        id: 'g1_s2_0',
        gen: 1,
        group: 'skewed',
        rank: 2,
        title: '바닷물 증발지에서 자라는 정육면체 소금 결정',
        url: 'https://mineral.kr/nacl-cubic-crystal',
        snippet: '나트륨과 염소 이온이 정확한 90도 직각 격자로 쌓이며 투명한 정방형 계단을 이룹니다.',
      },
      {
        id: 'g1_s2_1',
        gen: 1,
        group: 'skewed',
        rank: 2,
        title: '호퍼 결정(Hopper Crystal)의 속 빈 피라미드 성장',
        url: 'https://crystallography.kr/hopper-growth',
        snippet: '모서리 성장 속도가 면 중앙보다 빨라 역피라미드 모양의 계단식 테라스가 조각됩니다.',
      },
      {
        id: 'g1_s2_2',
        gen: 1,
        group: 'skewed',
        rank: 2,
        title: '포화 염수 표면장력과 부유 결정의 미세 포유',
        url: 'https://brine-optics.kr/surface-hopper',
        snippet: '빠르게 닫히는 결정 격자 틈 사이에 극소량의 모액과 대기 기포가 그대로 봉인됩니다.',
      },
    ],
  },
  {
    gen: 1,
    rank: 3,
    label: '03 산맥 아래 묻힌 암염 지층',
    sublabel: '사라진 고대 바다가 남긴 투명한 퇴적층',
    x: 4080,
    cards: [
      {
        id: 'g1_s3_0',
        gen: 1,
        group: 'skewed',
        rank: 3,
        title: '산맥 지하 812m 페름기 암염층과 증발암 분지',
        url: 'https://geology.kr/permian-halite-basin',
        snippet: '2억 8천만 년 전 내륙해가 증발하며 두께 140m에 달하는 투명 암염 지층을 남겼습니다.',
      },
      {
        id: 'g1_s3_1',
        gen: 1,
        group: 'skewed',
        rank: 3,
        title: '암염 돔(Salt Diapir)의 부력 상승과 지층 습곡',
        url: 'https://tectonics.kr/salt-diapir-dome',
        snippet: '수억 년의 압력 아래 암염층은 느린 유체처럼 솟아오르며 거대한 지하 돔을 형성합니다.',
      },
      {
        id: 'g1_s3_2',
        gen: 1,
        group: 'skewed',
        rank: 3,
        title: '시추 코어 H-204 연층(Varve)에 새긴 고대 가뭄 주기',
        url: 'https://drillcore.kr/varve-h204-log',
        snippet: '투명한 암염과 얇은 경석고 띠가 번갈아 쌓이며 사라진 계절의 연대기를 기록합니다.',
      },
    ],
  },
  {
    gen: 1,
    rank: 4,
    label: '04 결정 속 2억 8천만 년 전 공기',
    sublabel: '편광 아래 미세하게 떨리는 고생대 유체 기포',
    x: 5140,
    cards: [
      {
        id: 'g1_s4_0',
        gen: 1,
        group: 'skewed',
        rank: 4,
        title: '암염 음결정(Negative Crystal) 내부의 원시 염수',
        url: 'https://paleo-air.kr/negative-crystal-brine',
        snippet: '입방체 공동 안에 갇힌 염수는 지구가 판게아였던 시절의 화학 조성을 그대로 간직합니다.',
      },
      {
        id: 'g1_s4_1',
        gen: 1,
        group: 'skewed',
        rank: 4,
        title: '편광 현미경 아래 미세하게 떨리는 0.30mm 고생대 기포',
        url: 'https://optics-paleo.kr/polarized-bubble',
        snippet: '직교 편광판 사이로 간섭 무늬가 열리면 브라운 운동으로 흔들리는 태고의 기포가 보입니다.',
      },
      {
        id: 'g1_s4_2',
        gen: 1,
        group: 'skewed',
        rank: 4,
        title: '암염 유체 기포에 봉인된 고생대 대기 — 자연사 아카이브',
        url: 'https://archive.geology.kr/halite-fluid-inclusion-280ma',
        snippet: '결정이 물에 녹는 순간 2억 8천만 년 전 산소 28.5%의 공기가 오늘의 부엌으로 풀려납니다.',
      },
    ],
  },
];

export const GEN2_ALIGNED_CARDS: CardSpec[] = [
  {
    id: 'g2_a0',
    gen: 2,
    group: 'aligned',
    title: '남극 빙하 코어 3,000m 심부에 봉인된 80만 년 전 공기',
    url: 'https://polar-ice.kr/epica-dome-c-air',
    snippet: '눈이 만년설을 거쳐 얼음으로 압착될 때 미세한 기포 속에 당시 대기가 그대로 가두어집니다.',
  },
  {
    id: 'g2_a1',
    gen: 2,
    group: 'aligned',
    title: '사막 사암 사층리(Cross-bedding)로 읽는 페름기 무역풍',
    url: 'https://aeolian.geology.kr/permian-dunes',
    snippet: '화석 사구의 경사면 각도와 방위각은 수억 년 전 불었던 바람의 방향과 세기를 증명합니다.',
  },
  {
    id: 'g2_a2',
    gen: 2,
    group: 'aligned',
    title: '석탄기 양치류 화석 잎의 기공 밀도와 고대 이산화탄소',
    url: 'https://paleobotany.kr/stomata-co2-proxy',
    snippet: '3억 년 전 식물이 숨 쉬던 잎 뒷면 기공의 개수가 태고 대기의 조성을 역산합니다.',
  },
  {
    id: 'g2_a3',
    gen: 2,
    group: 'aligned',
    title: '그린란드 빙상 심부 시추 기포의 메탄·아르곤 동위원소',
    url: 'https://icecore.archive.kr/greenland-isotopes',
    snippet: '빙하 절편을 진공 챔버에서 녹이면 수십만 년 전 북반구의 바람과 기온이 복원됩니다.',
  },
  {
    id: 'g2_a4',
    gen: 2,
    group: 'aligned',
    title: '황토 고원 풍성 퇴적층에 기록된 신생대 계절풍 순환',
    url: 'https://loess-wind.kr/monsoon-strata',
    snippet: '수백 미터 두께의 미세 석영 먼지가 대륙을 건너온 바람의 역사를 층층이 쌓았습니다.',
  },
  {
    id: 'g2_a5',
    gen: 2,
    group: 'aligned',
    title: '암염 유체 포유물 질량분석기로 복원한 고생대 산소 28.5%',
    url: 'https://mass-spec.kr/halite-o2-285',
    snippet: '오늘날보다 짙었던 산소가 거대 잠자리와 석탄기 열대 우림의 바람을 밀어 올렸습니다.',
  },
  {
    id: 'g2_a6',
    gen: 2,
    group: 'aligned',
    title: '심해 점토층에 가라앉은 태고 성층권 먼지 입자 분석',
    url: 'https://abyssal.ocean.kr/stratospheric-dust',
    snippet: '태평양 바닥 5,000m 퇴적물 속 석영 알갱이가 대양을 건너온 제트기류를 증언합니다.',
  },
  {
    id: 'g2_a7',
    gen: 2,
    group: 'aligned',
    title: '결정이 녹을 때 방출되는 미량 기체와 고대 대기 모델',
    url: 'https://atmosphere-deep.kr/dissolution-release',
    snippet: '한 알의 소금이 녹는 짧은 파문이 2억 8천만 년 전 행성 대기 순환과 맞닿습니다.',
  },
];

export const GEN2_SKEWED_STATIONS: SkewedStationSpec[] = [
  {
    gen: 2,
    rank: 1,
    label: '01 빙하 심부 기포의 호흡',
    sublabel: '남극 만년설 아래 갇힌 흰 공기의 맥박',
    x: 2040,
    cards: [
      {
        id: 'g2_s1_0',
        gen: 2,
        group: 'skewed',
        rank: 1,
        title: '얼음이 녹을 때 터지는 10만 년 전 빙하 기포의 소리',
        url: 'https://glacier-acoustics.kr/ancient-fizz',
        snippet: '고압으로 압축된 고대 기포가 물속에서 터지며 맑고 미세한 파열음을 냅니다.',
      },
      {
        id: 'g2_s1_1',
        gen: 2,
        group: 'skewed',
        rank: 1,
        title: '보스토크 기지 빙하 절편의 편광 결정 무늬',
        url: 'https://vostok-thinsection.kr/ice-fabric',
        snippet: '수천 년의 중력 아래 얼음 결정들이 바람결처럼 나란히 정렬됩니다.',
      },
      {
        id: 'g2_s1_2',
        gen: 2,
        group: 'skewed',
        rank: 1,
        title: '눈송이 결정의 육각 대칭과 상층 대기 습도 기록',
        url: 'https://snow-crystal.kr/dendrite-humidity',
        snippet: '구름 속 온도와 과포화도가 결정 가지 끝마다 고유한 기하를 남깁니다.',
      },
    ],
  },
  {
    gen: 2,
    rank: 2,
    label: '02 사암 결에 굳은 모래바람',
    sublabel: '돌의 무늬로 화석화된 고대 사막의 능선',
    x: 3040,
    cards: [
      {
        id: 'g2_s2_0',
        gen: 2,
        group: 'skewed',
        rank: 2,
        title: '나바호 사암 단애에 새겨진 쥐라기 사막의 물결',
        url: 'https://sandstone-archive.kr/jurassic-erg',
        snippet: '모래 언덕이 수천 번 이동하며 겹쳐 놓은 사선 단층이 붉은 절벽에 굳어 있습니다.',
      },
      {
        id: 'g2_s2_1',
        gen: 2,
        group: 'skewed',
        rank: 2,
        title: '풍식 자갈(Ventifact)의 세 모서리와 편서풍의 조각',
        url: 'https://geomorph.kr/ventifact-facets',
        snippet: '모래를 품은 바람이 수만 년 동안 바위를 깎아 날카로운 다면체 능선을 빚습니다.',
      },
      {
        id: 'g2_s2_2',
        gen: 2,
        group: 'skewed',
        rank: 2,
        title: '사막 노래하는 모래(Singing Sand)의 공명 주파수',
        url: 'https://dune-physics.kr/booming-dunes',
        snippet: '균일한 크기의 석영 알갱이들이 사면을 미끄러지며 낮은 저음의 합창을 울립니다.',
      },
    ],
  },
  {
    gen: 2,
    rank: 3,
    label: '03 화석 잎이 삼킨 고생대 숨결',
    sublabel: '탄화된 엽맥과 호박 수지 속 공기방울',
    x: 4080,
    cards: [
      {
        id: 'g2_s3_0',
        gen: 2,
        group: 'skewed',
        rank: 3,
        title: '백악기 호박(Amber) 수지 속에 봉인된 원시 기포와 꽃가루',
        url: 'https://amber-museum.kr/cretaceous-resin',
        snippet: '송진이 굳는 순간 갇힌 작은 공기방울이 백악기 숲의 향기를 품고 있습니다.',
      },
      {
        id: 'g2_s3_1',
        gen: 2,
        group: 'skewed',
        rank: 3,
        title: '석탄기 인목(Lepidodendron) 수피의 마름모 격자 화석',
        url: 'https://coal-forest.kr/lepidodendron-bark',
        snippet: '고생대 습지림의 40m 거목들이 남긴 탄화 흔적이 대기의 탄소를 고정했습니다.',
      },
      {
        id: 'g2_s3_2',
        gen: 2,
        group: 'skewed',
        rank: 3,
        title: '규화목 나이테에 새긴 2억 년 전 건기와 우기의 진동',
        url: 'https://petrified-wood.kr/triassic-rings',
        snippet: '광물로 치환된 세포벽 하나하나가 사라진 계절의 일조량을 증명합니다.',
      },
    ],
  },
  {
    gen: 2,
    rank: 4,
    label: '04 태양풍과 행성 대기의 기억',
    sublabel: '화성 협곡의 먼지 소용돌이와 성간 바람',
    x: 5140,
    cards: [
      {
        id: 'g2_s4_0',
        gen: 2,
        group: 'skewed',
        rank: 4,
        title: '화성 게일 분화구 퇴적암에 남은 35억 년 전 호수의 물결',
        url: 'https://mars-strata.kr/gale-crater-ripples',
        snippet: '대기가 희박해진 붉은 행성에도 한때 바람이 일고 호수의 연흔이 굳었습니다.',
      },
      {
        id: 'g2_s4_1',
        gen: 2,
        group: 'skewed',
        rank: 4,
        title: '운석 속 선태양 입자(Presolar Grains)가 품은 초신성 바람',
        url: 'https://astro-mineral.kr/presolar-sic',
        snippet: '태양계가 태어나기 전 늙은 별이 불어낸 미세 규소 결정이 지구 운석에서 발견됩니다.',
      },
      {
        id: 'g2_s4_2',
        gen: 2,
        group: 'skewed',
        rank: 4,
        title: '행성 간 플라즈마 태양풍과 지구 자기권의 보이지 않는 경계',
        url: 'https://heliosphere.kr/solar-wind-bow',
        snippet: '부엌의 소금 한 알에서 출발한 사선 항해가 마침내 별들 사이의 바람에 닿습니다.',
      },
    ],
  },
];

/* =========================================================================
 * 200 UNIQUE DECONSTRUCTED FRAGMENTS (188 TEXT + 12 ARCHIVAL IMAGES)
 * ========================================================================= */

const CLUSTER_TEXTS: readonly (readonly string[])[] = [
  // Cluster 0: 조리·염도·표준 레시피 (31 texts + 2 imgs = 33)
  [
    '김치찌개 끓이는 법의 표준 계량',
    '소금 0.8큰술 · 가열 12.5분',
    '물 450ml · 고춧가루 1.75큰술',
    '다진 마늘 1.0큰술 정량 투입',
    '중불 180°C · 수분 증발 18.0%',
    '산도 pH 4.3 숙성 김치 기준',
    '굵은 천일염을 세 마디쯤 쥐었다',
    '묵은지는 손으로 길게 찢는다',
    '비계를 먼저 지져 국물을 낸다',
    '간은 눈대중 소금 한 줌이면 된다',
    '신김치엔 설탕 말고 양파를 넣는다',
    '멸치 육수가 끓어오르면 불을 줄인다',
    '냄비 뚜껑 틈으로 김이 피어오른다',
    '국간장 반 큰술로 짠맛의 바닥을 잡는다',
    '평균 염도 1.15%에 수렴하는 레시피',
    '상위 검색 결과는 하나의 공식으로 좁혀진다',
    '계량스푼이 지워버린 부엌의 손짐작',
    '뜨거운 국물 속에서 소금이 즉시 녹는다',
    '식염수의 비등점이 0.5도 높아진다',
    '두부는 마지막 2분에 얹어 형태를 지킨다',
    '대파 어슷썰기로 향의 끝을 닫는다',
    '쌀뜨물의 전분이 국물의 농도를 묶는다',
    '돼지 앞다리살 지방이 젖산과 만난다',
    '냄비 바닥 대류 기포가 수직으로 오른다',
    '고추기름 방울이 표면에 붉은 원을 그린다',
    '익은 김치 줄기가 부드럽게 풀린다',
    '식탁 위 뚝배기의 잔열이 3분간 이어진다',
    '매일 반복되는 저녁의 가장 익숙한 검색어',
    '정렬된 결과는 안전하지만 좁은 궤도다',
    '소금 한 꼬집이 바다의 기원을 숨긴다',
    '레시피의 숫자 너머로 시선을 비튼다',
  ],
  // Cluster 1: 옹기 기공·발효·소금 꽃 (31 texts + 2 imgs = 33)
  [
    '소금 꽃이 피는 옹기 기공',
    '장독 가에 하얀 소금기가 앉았다',
    '항아리 유약 바깥에 맺힌 하얀 결정',
    '흙 입자 사이 공기가 드나드는 통로',
    '1200도 가마에서 구워진 태토의 미세 틈',
    '옹기 벽면을 통과하는 느린 모세관 현상',
    '장독대 북향 그늘의 차가운 새벽 공기',
    '김장독 안에서 천천히 일어나는 젖산 발효',
    '바깥바람이 항아리 숨구멍을 스치고 간다',
    '유약의 미세 균열마다 소금 서리가 피어난다',
    '간장 독 어깨에 쌓인 계절의 염분 띠',
    '오래된 항아리 표면에 세월의 바람결이 어른거린다',
    '빈 항아리 안쪽 벽을 쓸면 사각거리는 입자',
    '가을 햇볕에 말린 천일염의 간수가 빠진다',
    '배추 잎맥 사이로 삼투압이 물을 밀어낸다',
    '절임 소금이 세포벽의 탄력을 바꾼다',
    '마당 한쪽 장독들이 겨울의 습도를 기억한다',
    '붉은 황토 알갱이 사이의 마이크로 기공망',
    '온도 변화에 따라 옹기는 숨을 들이마신다',
    '유약 표면에 맺힌 이슬이 소금을 다시 녹인다',
    '건조한 북서풍이 지나간 자리에 남은 백화',
    '손끝에 묻어나는 짭짤하고 서늘한 결정 가루',
    '부엌에서 마당으로, 마당에서 염전으로',
    '그릇의 다공성이 시간을 숙성시킨다',
    '발효의 기포가 액체 표면에 작은 고리를 남긴다',
    '겨울 땅속에 묻은 김장독의 일정한 지온',
    '점토와 모래가 빚어낸 반투과성 지질막',
    '항아리 뚜껑을 열 때 번지는 차가운 산미',
    '소금은 음식의 재료이자 광물의 조각이다',
    '일상의 그릇 벽에서 결정학이 시작된다',
    '표면 장력이 이끌어 올린 미세한 염수 길',
  ],
  // Cluster 2: 천일염·정육면체 호퍼 결정 (31 texts + 2 imgs = 33)
  [
    '바닷물과 정육면체 소금 결정',
    '물기 마른 자리에 자라는 투명 격자',
    '햇볕과 바람이 빚는 정육면체 계단',
    '염화나트륨 순도 · 99.4%',
    '정육면체 격자 각도 · 90.0°',
    '면심 입방 격자 상수 · 5.64Å',
    '소금 결정의 모서리가 면보다 빨리 자란다',
    '속이 빈 역피라미드 호퍼 결정(Hopper Crystal)',
    '수면 위에서 표면장력에 매달린 결정 뗏목',
    '나트륨 이온과 염소 이온의 정전기적 질서',
    '물기가 증발할수록 염수는 과포화에 도달한다',
    '90도 직각 테라스가 여덟 겹으로 침강한다',
    '45도 대각선 성장 섹터의 미세한 경계선',
    '빛이 통과할 때 굴절률 1.544로 꺾인다',
    '염전 결정지 바닥에 깔린 깨진 옹기 조각',
    '남서풍이 수면의 수증기를 빠르게 훔쳐 간다',
    '정사각형 결정의 완벽한 벽개면(Cleavage)',
    '결정 하나를 쪼개면 다시 작은 정육면체가 된다',
    '성장 계단 사이에 미세한 틈새 공동이 남는다',
    '염수 농도 26%에서 첫 결정핵이 싹튼다',
    '여름 정오의 강한 일사가 염전을 하얗게 덮는다',
    '소금 창고 어둠 속에서 천천히 빠지는 간수',
    '마그네슘과 칼슘이 미량의 쓴맛과 윤기를 더한다',
    '바다의 모든 이온이 기하학적 격자로 응고된다',
    '물컵 속 소금 한 알이 녹으며 파문을 만든다',
    '결정면의 미세 단차가 햇빛을 산란한다',
    '자연이 스스로 깎아낸 가장 정직한 직각',
    '액체의 무질서가 고체의 대칭으로 전이된다',
    '염전 수로 끝에 반짝이는 얇은 소금 껍질',
    '결정 성장이 멈추는 순간 내부 시간이 봉인된다',
    '투명한 소금 알갱이는 지질학의 렌즈다',
  ],
  // Cluster 3: 산맥 아래 암염 지층·시추 코어 (31 texts + 2 imgs = 33)
  [
    '산맥 아래 묻힌 투명한 암염층',
    '옛 바다가 산맥 아래 소금으로 굳어지다',
    '암염 시추 깊이 · 812.4m',
    '소금층 두께 · 140.0m',
    '포획 연대 · 2억 8천만 년',
    '시추공 온도 · 34.5°C',
    '보존 시료 번호 · H-204',
    '지층 단면에 나이테처럼 남은 계절 무늬',
    '페름기 내륙해가 증발하며 남긴 거대한 분지',
    '마른 바다 출현기 · 480만 년의 건조기',
    '지각 변동이 소금 바다를 대륙 깊숙이 덮었다',
    '밀도가 낮은 암염층이 상부 암반을 밀어 올린다',
    '수천만 년에 걸쳐 솟아오른 지하 암염 돔',
    '투명한 암염과 어두운 경석고 띠의 교대 연층',
    '드릴 비트가 800m 아래 고생대 지층을 뚫는다',
    '코어 시료 상자에 나란히 누운 투명한 원기둥',
    '빛이 닿지 않던 지하 깊숙한 곳의 광물 성소',
    '판게아 초대륙 중앙의 메마른 증발암 호수',
    '고대 해안선이 후퇴하며 남긴 동심원 소금 띠',
    '히말라야와 알프스 자락 아래 잠든 암염 광산',
    '습곡과 단층이 투명한 결정을 비스듬히 깎는다',
    '방사성 동위원소 연대 측정이 페름기를 가리킨다',
    '기록 없는 계절을 돌의 무늬가 기억한다',
    '수억 년의 지압 아래서도 암염은 빛을 통과시킨다',
    '지하 암염 동굴 벽면에 드러난 거대한 물결 무늬',
    '증발과 범람이 수만 번 되풀이된 층서 기록',
    '사라진 바다의 빛이 소금 속에 남는다',
    '대륙 이동이 옛 해저를 해발 천 미터로 들어 올렸다',
    '암염층은 지구가 스스로 만든 타임캡슐이다',
    '지질 단면도의 수평선들이 미세하게 어긋난다',
    '어두운 퇴적암 사이에 빛나는 순백의 소금 맥',
  ],
  // Cluster 4: 고생대 유체 기포·편광 현미경 (31 texts + 2 imgs = 33)
  [
    '소금 속에 갇힌 수억 년 전 공기',
    '편광 아래 미세하게 떨리는 고생대 기포',
    '결정이 닫히던 날 봉인된 태고의 대기',
    '내부 기포 지름 · 0.30mm',
    '고대 산소 농도 · 28.5%',
    '편광 투과율 · 84.0%',
    '암염 속 정육면체 음결정(Negative Crystal) 공동',
    '원시 바닷물 한 방울과 작은 공기방울 하나',
    '직교 편광판 아래 피어나는 십자 소광 무늬',
    '동심원 등색선(Isochrome) 간섭 고리의 파동',
    '현미경 대물렌즈 너머로 떨리는 브라운 운동',
    '0.3mm 기포 경계면의 전반사(TIR) 은빛 테두리',
    '레이저 미세 천공으로 원시 기체를 추출한다',
    '사중극자 질량분석기가 페름기 공기를 읽는다',
    '오늘날 21%보다 훨씬 짙었던 고생대의 산소',
    '기포 속 아르곤과 질소 비율이 대기압을 밝힌다',
    '투명한 결정 감옥 안에서 멈춰 있던 2억 8천만 년',
    '미세한 온도 변화에 기포가 벽을 따라 미끄러진다',
    '고생대 해수면 위를 스치던 습하고 짙은 공기',
    '염수 속에 녹아 있던 고대 미생물 휴면 포자',
    '초박편 암염 시료를 0.5mm 두께로 연마한다',
    '복굴절 광학 축을 따라 쪼개지는 두 갈래 빛',
    '작은 기포 하나가 거대한 지질 시대를 증명한다',
    '결정 격자의 결함이 오히려 기억의 그릇이 된다',
    '완벽히 정렬된 결정에는 공기가 들어갈 틈이 없다',
    '어긋나고 비껴간 틈새만이 태고의 숨결을 품는다',
    '현미경 스테이지를 돌릴 때마다 간섭색이 바뀐다',
    '기포의 둥근 메니스커스에 맺힌 미세한 초승달 빛',
    '2억 8천만 년의 침묵이 얇은 결정벽 너머에 있다',
    '실험실 핀셋 끝의 소금 조각이 숨을 품고 있다',
    '빛을 비추면 투명한 돌 속에 작은 우주가 뜬다',
  ],
  // Cluster 5: 변방 0.14 · 빙하·사암·수억 년 전의 바람 (33 texts + 2 imgs = 35)
  // NOTE: Index 0 of Cluster 5 is our exact target peripheral fragment (sim = 0.14)!
  // Indices 1..5 are its exact 5 closest semantic neighbors!
  [
    TARGET_FRAGMENT_TEXT, // '결정이 녹을 때 수억 년 전의 바람이 분다' (exact target!)
    '남극 빙하 삼천 미터 아래 봉인된 하늘의 기포',
    '사막 사암 단층에 물결로 굳어진 태고의 풍향',
    '석탄기 양치류 화석 잎에 남은 기공의 숨결',
    '페름기 대기 산소 농도 28.5% 복원 기록',
    '심해 점토층에 가라앉은 성층권의 먼지',
    '빙하에 갇힌 대기 · 사암에 굳은 바람',
    '닫힌 창문 틈으로 스며들어 커튼을 흔드는 미풍',
    '밤바다 수평선 위에서 소리 없이 번지는 번개',
    '비 개인 도로 가장자리에 남는 하얀 소금기',
    '사막 모래 언덕의 능선이 바람을 따라 이동한다',
    '그린란드 빙상 코어에서 터져 나오는 고대 기포',
    '백악기 호박 수지 안에 멈춰 있는 작은 공기방울',
    '황토 고원을 건너온 신생대 계절풍의 미세 석영',
    '만년설이 압착되며 얼음 결정 사이에 공기를 가둔다',
    '화석 사구의 경사면이 잃어버린 무역풍을 가리킨다',
    '규화목 나이테에 새겨진 수억 년 전의 계절 진동',
    '가장 먼 변방의 조각도 0.14 아래로 사라지지 않는다',
    '검색어와 가장 멀리 떨어진 문장이 새 길을 연다',
    '평균에서 밀려난 작은 기포가 지평을 뒤집는다',
    '부엌의 냄비 김이 행성의 대기와 한 호흡으로 이어진다',
    '사라진 대양의 파도가 내륙의 돌결로 남아 있다',
    '눈송이 육각 가지마다 상층 대기의 습도가 새겨진다',
    '바람이 깎아낸 사막 자갈의 세 날카로운 능선',
    '화성 분화구 바닥에 굳어 있는 35억 년 전 연흔',
    '초신성 바람이 흩뿌린 운석 속 선태양 규소 입자',
    '구름보다 높은 성층권의 고요한 편서풍 띠',
    '오래된 지도는 사라진 해안선의 굴곡을 기억한다',
    '썰물이 빠진 갯벌에 남는 미세한 물결 자국',
    '유리창에 서린 겨울 성에가 양치류 잎처럼 번진다',
    '물 한 모금에 소금 결정이 풀리며 작은 숨을 뱉는다',
    '지금 뺨을 스치는 바람 속에 고생대의 산소가 섞여 있다',
    '모든 사선은 결국 또 다른 정렬의 시작이 된다',
  ],
];

export interface FragmentItem {
  index: number;
  id: string;
  type: 'text' | 'img';
  content: string;
  label?: string;
  plate?: ArchivalPlateSpec;
  cluster: number;
  /** Raw query similarity in [0, 1] relative to QUERY_GEN1 */
  querySim: number;
  /** Normalized emphasis level t in [0, 1] */
  level: number;
  /** art-hackathon exact scale = 0.72 + t */
  scale: number;
  /** art-hackathon exact opacity = 0.14 + 0.86 * t */
  opacity: number;
  /** Is this a section heading in the Scene 2 document preview? */
  isHeading?: boolean;
  /** Synthetic 16-dim semantic vector for genuine cosine similarity */
  vec: Float32Array;
}

export interface PairWeight {
  a: number;
  b: number;
  weight: number;
}

export interface CorpusBundle {
  fragments: FragmentItem[];
  targetIndex: number;
  neighborIndices: number[];
  rankedPairs: PairWeight[];
  topEdges: { a: number; b: number; weight: number; strength: number }[];
  neighbors: { index: number; weight: number }[][];
}

let cachedBundle: CorpusBundle | null = null;

export function getCorpus(): CorpusBundle {
  if (cachedBundle) return cachedBundle;

  const fragments: FragmentItem[] = [];
  const plateByCluster = new Map<number, ArchivalPlateSpec[]>();
  for (const p of ARCHIVAL_PLATES) {
    const arr = plateByCluster.get(p.cluster) ?? [];
    arr.push(p);
    plateByCluster.set(p.cluster, arr);
  }

  // Cluster query-similarity bands (strictly descending from cooking -> wind 0.14 periphery)
  const simRanges: readonly [number, number][] = [
    [0.78, 0.99],
    [0.56, 0.77],
    [0.39, 0.57],
    [0.25, 0.40],
    [0.16, 0.27],
    [0.02, 0.155],
  ];

  // Build 188 texts + 12 images = EXACT 200 fragments in rich document reading order!
  let targetIndex = -1;
  let globalIdx = 0;

  for (let c = 0; c < 6; c++) {
    const texts = CLUSTER_TEXTS[c]!;
    const plates = plateByCluster.get(c) ?? [];
    const [sLo, sHi] = simRanges[c]!;

    for (let k = 0; k < texts.length; k++) {
      // Interleave 2 archival plate images naturally inside each section!
      if (k === 10 && plates[0]) {
        fragments.push(makeImgFrag(globalIdx++, plates[0], c, sLo + (sHi - sLo) * 0.65));
      }
      if (k === 22 && plates[1]) {
        fragments.push(makeImgFrag(globalIdx++, plates[1], c, sLo + (sHi - sLo) * 0.35));
      }

      const txt = texts[k]!;
      const isTarget = txt === TARGET_FRAGMENT_TEXT;
      const frac = 1 - k / Math.max(1, texts.length - 1);
      const jitter = (hash(globalIdx * 19 + c * 7) - 0.5) * 0.04;
      let qSim = sLo + (sHi - sLo) * frac + jitter;
      if (isTarget) {
        qSim = 0.14;
        targetIndex = globalIdx;
      }
      qSim = Math.max(0.01, Math.min(0.99, qSim));

      const vec = buildSemanticVector(c, k, globalIdx, isTarget, c === 5 && k >= 1 && k <= 5);
      fragments.push({
        index: globalIdx,
        id: `f_${globalIdx}`,
        type: 'text',
        content: txt,
        cluster: c,
        querySim: qSim,
        level: 0,
        scale: 1,
        opacity: 1,
        isHeading: k === 0,
        vec,
      });
      globalIdx++;
    }
  }

  // Normalize query similarities using art-hackathon's exact 5%..95% emphasis stretching
  const sims = fragments.map((f) => f.querySim);
  const sorted = [...sims].sort((a, b) => a - b);
  const low = sorted[Math.floor((sorted.length - 1) * 0.05)] ?? 0;
  const high = sorted[Math.ceil((sorted.length - 1) * 0.95)] ?? 1;
  const spanRange = Math.max(1e-6, high - low);

  for (const f of fragments) {
    const level = f.index === targetIndex ? 0.0 : Math.min(1, Math.max(0, (f.querySim - low) / spanRange));
    f.level = level;
    f.scale = 0.72 + level;
    f.opacity = 0.14 + 0.86 * level;
  }

  // Compute genuine pairwise cosine similarity w_ij = (1 + cos(e_i, e_j)) / 2
  const allPairs: PairWeight[] = [];
  const n = fragments.length;
  for (let i = 0; i < n; i++) {
    const vi = fragments[i]!.vec;
    for (let j = i + 1; j < n; j++) {
      const vj = fragments[j]!.vec;
      let dot = 0;
      for (let d = 0; d < vi.length; d++) dot += vi[d]! * vj[d]!;
      const w = (1 + dot) * 0.5;
      if (w >= 0.62 || fragments[i]!.cluster === fragments[j]!.cluster) {
        allPairs.push({ a: i, b: j, weight: w });
      }
    }
  }

  allPairs.sort((p, q) => q.weight - p.weight || p.a - q.a || p.b - q.b);

  // Nearest 5 neighbors per fragment (exact art-hackathon nearestNeighbors)
  const neighbors: { index: number; weight: number }[][] = Array.from({ length: n }, () => []);
  for (const { a, b, weight } of allPairs) {
    if (neighbors[a]!.length < 5) neighbors[a]!.push({ index: b, weight });
    if (neighbors[b]!.length < 5) neighbors[b]!.push({ index: a, weight });
  }

  // Select top ~420 taut semantic red threads (including intra-cluster & cross-cluster bridges!)
  const maxThreads = 420;
  const selected = allPairs.slice(0, maxThreads);
  const topW = selected[0]?.weight ?? 1;
  const floorW = selected[selected.length - 1]?.weight ?? 0.7;
  const wSpan = Math.max(1e-6, topW - floorW);
  const topEdges = selected.map((p) => ({
    a: p.a,
    b: p.b,
    weight: p.weight,
    strength: (p.weight - floorW) / wSpan,
  }));

  // Also add 24 curated inter-cluster bridge threads so the 6480px red network breathes continuously across clusters!
  for (let c = 0; c < 5; c++) {
    const cA = fragments.filter((f) => f.cluster === c);
    const cB = fragments.filter((f) => f.cluster === c + 1);
    for (let k = 0; k < 5; k++) {
      const fa = cA[Math.min(cA.length - 1, cA.length - 1 - k * 4)]!;
      const fb = cB[Math.min(cB.length - 1, k * 4)]!;
      topEdges.push({ a: fa.index, b: fb.index, weight: 0.76 - k * 0.03, strength: 0.35 + (4 - k) * 0.08 });
    }
  }

  const neighborIndices = (neighbors[targetIndex] ?? []).map((nb) => nb.index);

  cachedBundle = {
    fragments,
    targetIndex,
    neighborIndices,
    rankedPairs: allPairs,
    topEdges,
    neighbors,
  };
  return cachedBundle;
}

function makeImgFrag(index: number, plate: ArchivalPlateSpec, cluster: number, qSim: number): FragmentItem {
  return {
    index,
    id: plate.id,
    type: 'img',
    content: plate.label,
    label: plate.label,
    plate,
    cluster,
    querySim: qSim,
    level: 0,
    scale: 1,
    opacity: 1,
    vec: buildSemanticVector(cluster, 15, index, false, false),
  };
}

/** Deterministic unit-normalized 16-dim semantic embedding encoding cluster, bridge adjacency & target-neighbor affinity. */
function buildSemanticVector(
  cluster: number,
  localIdx: number,
  globalIdx: number,
  isTarget: boolean,
  isTargetNeighbor: boolean,
): Float32Array {
  const v = new Float32Array(16);
  // Primary cluster basis (dims 0..5)
  v[cluster] = 1.65;
  // Adjacent cluster conceptual bridge (cooking -> onggi -> hopper -> halite -> bubbles -> wind)
  if (cluster > 0) v[cluster - 1] = 0.32 * (1 - localIdx / 36);
  if (cluster < 5) v[cluster + 1] = 0.36 * (localIdx / 36);

  // Target & its 5 planetary-wind neighbors share a strong dedicated resonant semantic subspace (dims 6..7)
  if (isTarget) {
    v[6] = 1.45;
    v[7] = 1.1;
  } else if (isTargetNeighbor) {
    v[6] = 1.32 - localIdx * 0.05;
    v[7] = 0.96;
  }

  // Fine sub-topic texture (dims 8..15)
  for (let d = 8; d < 16; d++) {
    v[d] = (hash(globalIdx * 41 + d * 17) - 0.5) * 0.55;
  }

  let norm = 0;
  for (let d = 0; d < 16; d++) norm += v[d]! * v[d]!;
  norm = Math.sqrt(norm) || 1;
  for (let d = 0; d < 16; d++) v[d]! /= norm;
  return v;
}
