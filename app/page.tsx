"use client";

import { useRef, useState } from "react";

type Phase = "landing" | "script" | "policy" | "roster" | "reign" | "ending";
type DifficultyId = "easy" | "hard" | "hell";
type StatKey = "population" | "grain" | "army" | "sentiment" | "integrity";
type Season = "春" | "夏" | "秋" | "冬";
type SkillTag = "民生" | "财政" | "军事" | "吏治" | "谋略";
type Role = "皇帝" | "宰相" | "名将" | "财政" | "监察";

type Stats = Record<StatKey, number>;

type Person = {
  id: string;
  name: string;
  role: Role;
  secondaryRoles: Role[];
  dynasty: string;
  quote: string;
  tags: SkillTag[];
  bonuses: Partial<Stats>;
};

type Script = {
  id: string;
  title: string;
  ruler: string;
  dynasty: string;
  startYear: number;
  startLabel: string;
  color: string;
  motto: string;
  description: string;
  base: Stats;
};

type Requirement = Partial<Record<StatKey, number>>;

type EventOption = {
  label: string;
  detail: string;
  effects?: Partial<Stats>;
  successEffects?: Partial<Stats>;
  failEffects?: Partial<Stats>;
  chance?: number;
  tag?: SkillTag;
  requirements?: Requirement;
  failOnUnmet?: boolean;
  rewardRequirements?: Requirement;
  alternateText?: string;
  setHistoryFlags?: string[];
  successHistoryFlags?: string[];
  failHistoryFlags?: string[];
  qinConquest?: "advance" | "delay";
};

type EventTemplate = {
  id: string;
  title: string;
  category: string;
  text: string;
  historical?: boolean;
  scriptId?: string;
  year?: number;
  requiresHistoryFlags?: string[];
  excludesHistoryFlags?: string[];
  punitive?: boolean;
  qinConquestStage?: number;
  options: EventOption[];
};

type Outcome = {
  title: string;
  text: string;
  effects: Partial<Stats>;
  success?: boolean;
  alternate?: boolean;
};

type Chronicle = { year: number; season: Season; title: string; note: string };

type GameState = {
  version: 7;
  phase: Phase;
  difficulty: DifficultyId;
  scriptId: string;
  policyId: string;
  rosterIds: string[];
  seatAssignments: SeatAssignments;
  year: number;
  elapsed: number;
  seasonIndex: number;
  stats: Stats;
  events: EventTemplate[];
  outcome: Outcome | null;
  chronicle: Chronicle[];
  lowArmyYears: number;
  unrestYears: number;
  alteredHistory: boolean;
  annualNote: string;
  endingReason: string;
  endingVictory: boolean;
  randomSeed: number;
  randomCount: number;
  historyFlags: string[];
  qinConquestIndex: number;
  qinConquestDelay: number;
  qinConquestRetries: number;
  qinConquestRequirementRelief: number;
};

type HistoricalProgress = Pick<GameState, "qinConquestIndex" | "qinConquestDelay" | "qinConquestRetries" | "qinConquestRequirementRelief">;

type SeatAssignments = Record<Role, string | null>;

const seasons: Season[] = ["春", "夏", "秋", "冬"];
const roles: Role[] = ["皇帝", "宰相", "名将", "财政", "监察"];
const emptySeats = (): SeatAssignments => ({ 皇帝: null, 宰相: null, 名将: null, 财政: null, 监察: null });
const statNames: Record<StatKey, string> = {
  population: "人口",
  grain: "钱粮",
  army: "武备",
  sentiment: "民情",
  integrity: "吏治",
};

const difficulties = [
  { id: "easy", name: "简单", seal: "易", desc: "沿用当前治国规则，适合从容熟悉五百年国运。", integrityDecayPenalty: 0, chancePenalty: 0 },
  { id: "hard", name: "困难", seal: "难", desc: "积弊滋生更快，朝廷的每次冒险也更难如愿。", integrityDecayPenalty: 3, chancePenalty: 10 },
  { id: "hell", name: "地狱", seal: "狱", desc: "吏治迅速败坏，任何带有成败判定的决策都更加凶险。", integrityDecayPenalty: 6, chancePenalty: 20 },
] as const;

const difficultyRule = (id: DifficultyId) => difficulties.find((item) => item.id === id) || difficulties[0];

const scripts: Script[] = [
  { id: "qin", title: "秦始皇纪", ruler: "嬴政", dynasty: "秦", startYear: -246, startLabel: "秦王政元年 · 少年即位", color: "#b78b3e", motto: "奋六世余烈，并天下为一", description: "从即秦王位之年开始。秦国兵强法密，朝权却仍在相邦与太后手中，统一天下尚是二十五年后的远景。", base: { population: 70, grain: 82, army: 84, sentiment: -6, integrity: 14 } },
  { id: "liubang", title: "汉高祖纪", ruler: "刘邦", dynasty: "汉", startYear: -209, startLabel: "秦二世元年 · 沛县起兵", color: "#a23e32", motto: "约法三章，群雄逐鹿", description: "从沛县起兵开始。根基浅薄，却最懂得把天下英才放在合适的位置。", base: { population: 74, grain: 70, army: 66, sentiment: 12, integrity: 4 } },
  { id: "hanwu", title: "汉武帝纪", ruler: "刘彻", dynasty: "汉", startYear: -141, startLabel: "建元元年 · 少年天子", color: "#9b2f28", motto: "内强国本，外攘夷狄", description: "从登基之年开始。文景遗产丰厚，雄心也足以把储备燃烧殆尽。", base: { population: 112, grain: 142, army: 78, sentiment: 28, integrity: 24 } },
  { id: "caocao", title: "曹操传", ruler: "曹操", dynasty: "魏", startYear: 189, startLabel: "中平六年 · 陈留起兵", color: "#556b72", motto: "挟天子令诸侯", description: "从陈留散家财起兵开始。乱世中，秩序本身就是最稀缺的资源。", base: { population: 58, grain: 62, army: 72, sentiment: -8, integrity: 12 } },
  { id: "liubei", title: "刘备传", ruler: "刘备", dynasty: "蜀汉", startYear: 184, startLabel: "中平元年 · 涿郡起兵", color: "#54704e", motto: "以仁为旗，匡扶汉室", description: "从涿郡聚众开始。名望可聚民心，但每一块立足之地都得艰难争取。", base: { population: 48, grain: 52, army: 58, sentiment: 32, integrity: 20 } },
  { id: "sunce", title: "孙策传", ruler: "孙策", dynasty: "吴", startYear: 194, startLabel: "兴平元年 · 江东创业", color: "#326c67", motto: "江东猛虎，席卷六郡", description: "从借兵渡江开始。扩张速度惊人，年轻的霸业却暗藏致命裂隙。", base: { population: 54, grain: 58, army: 76, sentiment: 18, integrity: 8 } },
  { id: "liuyu", title: "刘裕传", ruler: "刘裕", dynasty: "宋", startYear: 404, startLabel: "元兴三年 · 京口举义", color: "#6e5d49", motto: "金戈北指，再造河山", description: "从京口举义开始。寒门军功登上舞台，北方故土仍在视线尽头。", base: { population: 66, grain: 64, army: 82, sentiment: 16, integrity: -2 } },
  { id: "taizong", title: "唐太宗纪", ruler: "李世民", dynasty: "唐", startYear: 617, startLabel: "大业十三年 · 晋阳起兵", color: "#8b4f35", motto: "济世安民，贞观将启", description: "从晋阳起兵开始。军略与纳谏兼备，但通往帝位的门前横着血亲。", base: { population: 62, grain: 72, army: 84, sentiment: 20, integrity: 24 } },
  { id: "song", title: "宋太祖纪", ruler: "赵匡胤", dynasty: "宋", startYear: 951, startLabel: "广顺元年 · 从军定乱", color: "#806b3c", motto: "收兵权，兴文治", description: "从投身军旅、平定乱局开始。五代兵骄将悍，必须重塑权力的规则。", base: { population: 72, grain: 78, army: 80, sentiment: 10, integrity: 6 } },
  { id: "genghis", title: "成吉思汗纪", ruler: "铁木真", dynasty: "大蒙古国", startYear: 1189, startLabel: "淳熙十六年 · 草原称汗", color: "#65704a", motto: "聚诸部，开万里", description: "从被推举为汗开始。骑兵锐不可当，治理辽阔疆域才是真正考验。", base: { population: 42, grain: 48, army: 96, sentiment: 8, integrity: -8 } },
  { id: "ming", title: "明太祖纪", ruler: "朱元璋", dynasty: "明", startYear: 1352, startLabel: "至正十二年 · 濠州投军", color: "#8c302d", motto: "驱逐胡虏，重整山河", description: "从濠州投军开始。最懂百姓饥寒，也最警惕功臣与贪官。", base: { population: 52, grain: 56, army: 68, sentiment: 24, integrity: 18 } },
];

const policies = [
  { id: "martial", name: "尚武开边", seal: "武", desc: "整军备边，主动争夺战略空间。军事事件成功率提高，钱粮消耗也更大。", effects: { army: 12, grain: -8, sentiment: -4 } as Partial<Stats>, tag: "军事" as SkillTag },
  { id: "rest", name: "休养生息", seal: "养", desc: "轻徭薄赋，蓄积人口钱粮。自然增长更快，但边患来临时更依赖名将。", effects: { population: 10, grain: 10, army: -6, sentiment: 10 } as Partial<Stats>, tag: "民生" as SkillTag },
  { id: "reform", name: "整顿朝纲", seal: "治", desc: "考课百官，澄清吏治。吏治越发清明，剧烈改革也会触动既得利益。", effects: { grain: 4, integrity: 18, sentiment: -2 } as Partial<Stats>, tag: "吏治" as SkillTag },
];

const corePeople: Person[] = [
  { id: "qinshihuang", name: "秦始皇", role: "皇帝", secondaryRoles: ["监察"], dynasty: "秦", quote: "制度开创极猛，民力也真扛不住。", tags: ["吏治", "军事"], bonuses: { army: 12, integrity: 8, sentiment: -8 } },
  { id: "liubang-emperor", name: "汉高祖", role: "皇帝", secondaryRoles: ["宰相"], dynasty: "汉", quote: "最懂得让天下英才各得其所。", tags: ["谋略", "民生"], bonuses: { sentiment: 10, grain: 5 } },
  { id: "hanwu-emperor", name: "汉武帝", role: "皇帝", secondaryRoles: ["名将"], dynasty: "汉", quote: "雄才大略，国力与野心一同燃烧。", tags: ["军事", "财政"], bonuses: { army: 14, grain: -6 } },
  { id: "caocao-emperor", name: "魏武帝", role: "皇帝", secondaryRoles: ["宰相"], dynasty: "魏", quote: "乱世枭雄，唯才是举。", tags: ["谋略", "吏治"], bonuses: { army: 8, integrity: 8 } },
  { id: "liubei-emperor", name: "汉昭烈帝", role: "皇帝", secondaryRoles: ["宰相"], dynasty: "蜀汉", quote: "以仁为旗，百折不挠。", tags: ["民生", "谋略"], bonuses: { sentiment: 14, population: 5 } },
  { id: "sunce-emperor", name: "孙策", role: "皇帝", secondaryRoles: ["名将"], dynasty: "吴", quote: "江东小霸王，锐进如风。", tags: ["军事", "谋略"], bonuses: { army: 13, sentiment: 3 } },
  { id: "liuyu-emperor", name: "宋武帝", role: "皇帝", secondaryRoles: ["名将"], dynasty: "刘宋", quote: "寒门军功，气吞万里如虎。", tags: ["军事", "吏治"], bonuses: { army: 12, integrity: 5 } },
  { id: "lishimin-emperor", name: "唐太宗", role: "皇帝", secondaryRoles: ["名将"], dynasty: "唐", quote: "善战亦善纳谏，守成不逊开创。", tags: ["军事", "吏治"], bonuses: { army: 10, integrity: 12, sentiment: 5 } },
  { id: "zhaokuangyin-emperor", name: "宋太祖", role: "皇帝", secondaryRoles: ["名将"], dynasty: "宋", quote: "收兵权，重文治，宽厚养民。", tags: ["吏治", "民生"], bonuses: { integrity: 10, sentiment: 8 } },
  { id: "genghis-emperor", name: "成吉思汗", role: "皇帝", secondaryRoles: ["名将"], dynasty: "大蒙古国", quote: "聚草原诸部，铁骑横越万里。", tags: ["军事", "谋略"], bonuses: { army: 18, population: -3 } },
  { id: "zhuyuanzhang-emperor", name: "明太祖", role: "皇帝", secondaryRoles: ["监察"], dynasty: "明", quote: "知民间疾苦，也以严酷驭群臣。", tags: ["吏治", "民生"], bonuses: { integrity: 14, sentiment: 5, grain: 4 } },
  { id: "xiaohe", name: "萧何", role: "宰相", secondaryRoles: ["财政"], dynasty: "汉", quote: "镇国家，抚百姓，给馈饷。", tags: ["财政", "民生"], bonuses: { grain: 14, integrity: 4 } },
  { id: "zhugeliang", name: "诸葛亮", role: "宰相", secondaryRoles: ["财政"], dynasty: "蜀汉", quote: "治军理政皆一流，就是太爱事必躬亲。", tags: ["吏治", "谋略"], bonuses: { integrity: 16, grain: 6 } },
  { id: "fangxuanling", name: "房玄龄", role: "宰相", secondaryRoles: ["监察"], dynasty: "唐", quote: "善谋能断，润物无声。", tags: ["谋略", "吏治"], bonuses: { integrity: 10, sentiment: 5 } },
  { id: "wanganshi", name: "王安石", role: "宰相", secondaryRoles: ["财政"], dynasty: "宋", quote: "天变不足畏，祖宗不足法。", tags: ["财政", "吏治"], bonuses: { grain: 12, sentiment: -4 } },
  { id: "hanxin", name: "韩信", role: "名将", secondaryRoles: ["宰相"], dynasty: "汉", quote: "多多益善，兵锋无双。", tags: ["军事", "谋略"], bonuses: { army: 20, sentiment: -2 } },
  { id: "lijing", name: "李靖", role: "名将", secondaryRoles: ["宰相"], dynasty: "唐", quote: "谋定后动，千里破敌。", tags: ["军事", "谋略"], bonuses: { army: 17, grain: 3 } },
  { id: "yuefei", name: "岳飞", role: "名将", secondaryRoles: ["监察"], dynasty: "宋", quote: "冻死不拆屋，饿死不掳掠。", tags: ["军事", "民生"], bonuses: { army: 15, sentiment: 8 } },
  { id: "xuda", name: "徐达", role: "名将", secondaryRoles: ["监察"], dynasty: "明", quote: "持重有谋，军纪肃然。", tags: ["军事", "吏治"], bonuses: { army: 16, integrity: 5 } },
  { id: "sang", name: "桑弘羊", role: "财政", secondaryRoles: ["宰相"], dynasty: "汉", quote: "盐铁归官，富国强兵。", tags: ["财政", "谋略"], bonuses: { grain: 20, sentiment: -7 } },
  { id: "liuyan", name: "刘晏", role: "财政", secondaryRoles: ["宰相"], dynasty: "唐", quote: "理财以爱民为先。", tags: ["财政", "民生"], bonuses: { grain: 14, sentiment: 7 } },
  { id: "zhangjuzheng", name: "张居正", role: "财政", secondaryRoles: ["监察"], dynasty: "明", quote: "考成核实，一条鞭行天下。", tags: ["财政", "吏治"], bonuses: { grain: 17, integrity: 8 } },
  { id: "wangjing", name: "王景", role: "财政", secondaryRoles: ["宰相"], dynasty: "东汉", quote: "治河千里，水患遂息。", tags: ["民生", "财政"], bonuses: { population: 9, grain: 10 } },
  { id: "weizheng", name: "魏征", role: "监察", secondaryRoles: ["宰相"], dynasty: "唐", quote: "兼听则明，偏信则暗。", tags: ["吏治", "谋略"], bonuses: { integrity: 20, sentiment: 4 } },
  { id: "baozheng", name: "包拯", role: "监察", secondaryRoles: ["宰相"], dynasty: "宋", quote: "清心为治本，直道是身谋。", tags: ["吏治", "民生"], bonuses: { integrity: 17, sentiment: 7 } },
  { id: "zhangtang", name: "张汤", role: "监察", secondaryRoles: ["财政"], dynasty: "汉", quote: "法令必行，百官震肃。", tags: ["吏治", "财政"], bonuses: { integrity: 15, grain: 6, sentiment: -6 } },
  { id: "hai", name: "海瑞", role: "监察", secondaryRoles: ["财政"], dynasty: "明", quote: "刚峰之下，无所回避。", tags: ["吏治", "民生"], bonuses: { integrity: 19, sentiment: 5, grain: -3 } },
];

type OriginalPersonSeed = Pick<Person, "id" | "name" | "dynasty" | "role" | "secondaryRoles">;

const originalPeopleSeeds: OriginalPersonSeed[] = [
  {
    "id": "original-hanwendi",
    "name": "汉文帝",
    "dynasty": "汉",
    "role": "皇帝",
    "secondaryRoles": [
      "财政"
    ],
  },
  {
    "id": "original-guangwudi",
    "name": "刘秀",
    "dynasty": "汉",
    "role": "皇帝",
    "secondaryRoles": [
      "名将"
    ],
  },
  {
    "id": "original-zhangliang",
    "name": "张良",
    "dynasty": "汉",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-chenping",
    "name": "陈平",
    "dynasty": "汉",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-weihuo",
    "name": "卫青",
    "dynasty": "汉",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-huoqubing",
    "name": "霍去病",
    "dynasty": "汉",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-lisi",
    "name": "李斯",
    "dynasty": "秦",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-shangyang",
    "name": "商鞅",
    "dynasty": "秦",
    "role": "宰相",
    "secondaryRoles": [
      "财政",
      "监察"
    ],
  },
  {
    "id": "original-wangjian",
    "name": "王翦",
    "dynasty": "秦",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-mengtian",
    "name": "蒙恬",
    "dynasty": "秦",
    "role": "名将",
    "secondaryRoles": [
      "财政"
    ],
  },
  {
    "id": "original-huoguang",
    "name": "霍光",
    "dynasty": "汉",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-zhangqian",
    "name": "张骞",
    "dynasty": "汉",
    "role": "监察",
    "secondaryRoles": [
      "财政"
    ],
  },
  {
    "id": "original-sunquan",
    "name": "孙权",
    "dynasty": "东吴",
    "role": "皇帝",
    "secondaryRoles": [
      "宰相",
      "监察"
    ],
  },
  {
    "id": "original-simayi",
    "name": "司马懿",
    "dynasty": "曹魏",
    "role": "宰相",
    "secondaryRoles": [
      "名将"
    ],
  },
  {
    "id": "original-xunyu",
    "name": "荀彧",
    "dynasty": "曹魏",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-guojia",
    "name": "郭嘉",
    "dynasty": "曹魏",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-zhouyu",
    "name": "周瑜",
    "dynasty": "东吴",
    "role": "名将",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-luxun",
    "name": "陆逊",
    "dynasty": "东吴",
    "role": "名将",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-dengai",
    "name": "邓艾",
    "dynasty": "曹魏",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-yanghu",
    "name": "羊祜",
    "dynasty": "西晋",
    "role": "名将",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-wangmeng",
    "name": "王猛",
    "dynasty": "前秦",
    "role": "宰相",
    "secondaryRoles": [
      "财政",
      "监察"
    ],
  },
  {
    "id": "original-xiean",
    "name": "谢安",
    "dynasty": "东晋",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-zut",
    "name": "祖逖",
    "dynasty": "东晋",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-huanwen",
    "name": "桓温",
    "dynasty": "东晋",
    "role": "名将",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-taokan",
    "name": "陶侃",
    "dynasty": "东晋",
    "role": "名将",
    "secondaryRoles": [
      "财政"
    ],
  },
  {
    "id": "original-suiwendi",
    "name": "隋文帝",
    "dynasty": "隋",
    "role": "皇帝",
    "secondaryRoles": [
      "财政"
    ],
  },
  {
    "id": "original-wuzetian",
    "name": "武则天",
    "dynasty": "武周",
    "role": "皇帝",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-tangxuanzong",
    "name": "唐玄宗",
    "dynasty": "唐",
    "role": "皇帝",
    "secondaryRoles": [],
  },
  {
    "id": "original-duruhui",
    "name": "杜如晦",
    "dynasty": "唐",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-liji",
    "name": "李绩",
    "dynasty": "唐",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-guoziyi",
    "name": "郭子仪",
    "dynasty": "唐",
    "role": "名将",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-liguangbi",
    "name": "李光弼",
    "dynasty": "唐",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-peidu",
    "name": "裴度",
    "dynasty": "唐",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-direnjie",
    "name": "狄仁杰",
    "dynasty": "武周",
    "role": "监察",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-yaochong",
    "name": "姚崇",
    "dynasty": "唐",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-songjing",
    "name": "宋璟",
    "dynasty": "唐",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-songrenzong",
    "name": "宋仁宗",
    "dynasty": "北宋",
    "role": "皇帝",
    "secondaryRoles": [],
  },
  {
    "id": "original-fanzhongyan",
    "name": "范仲淹",
    "dynasty": "北宋",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-simaguang",
    "name": "司马光",
    "dynasty": "北宋",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-ouyangxiu",
    "name": "欧阳修",
    "dynasty": "北宋",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-hanshizhong",
    "name": "韩世忠",
    "dynasty": "南宋",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-wentianxiang",
    "name": "文天祥",
    "dynasty": "南宋",
    "role": "监察",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-luxiufu",
    "name": "陆秀夫",
    "dynasty": "南宋",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-kubila",
    "name": "忽必烈",
    "dynasty": "元",
    "role": "皇帝",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-yelvchucai",
    "name": "耶律楚材",
    "dynasty": "蒙古",
    "role": "宰相",
    "secondaryRoles": [
      "财政"
    ],
  },
  {
    "id": "original-bayan",
    "name": "伯颜",
    "dynasty": "元",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-tuotuo",
    "name": "脱脱",
    "dynasty": "元",
    "role": "宰相",
    "secondaryRoles": [
      "财政"
    ],
  },
  {
    "id": "original-zhudi",
    "name": "朱棣",
    "dynasty": "明",
    "role": "皇帝",
    "secondaryRoles": [
      "名将"
    ],
  },
  {
    "id": "original-liubowen",
    "name": "刘伯温",
    "dynasty": "明",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-changyuchun",
    "name": "常遇春",
    "dynasty": "明",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-yuqian",
    "name": "于谦",
    "dynasty": "明",
    "role": "监察",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-qijiguang",
    "name": "戚继光",
    "dynasty": "明",
    "role": "名将",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-lishanchang",
    "name": "李善长",
    "dynasty": "明",
    "role": "宰相",
    "secondaryRoles": [
      "财政"
    ],
  },
  {
    "id": "original-zhenghe",
    "name": "郑和",
    "dynasty": "明",
    "role": "财政",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-kangxi",
    "name": "康熙",
    "dynasty": "清",
    "role": "皇帝",
    "secondaryRoles": [],
  },
  {
    "id": "original-yongzheng",
    "name": "雍正",
    "dynasty": "清",
    "role": "皇帝",
    "secondaryRoles": [
      "财政",
      "监察"
    ],
  },
  {
    "id": "original-qianlong",
    "name": "乾隆",
    "dynasty": "清",
    "role": "皇帝",
    "secondaryRoles": [],
  },
  {
    "id": "original-zengguofan",
    "name": "曾国藩",
    "dynasty": "清",
    "role": "宰相",
    "secondaryRoles": [
      "名将",
      "监察"
    ],
  },
  {
    "id": "original-zuozongtang",
    "name": "左宗棠",
    "dynasty": "清",
    "role": "名将",
    "secondaryRoles": [
      "财政"
    ],
  },
  {
    "id": "original-lihongzhang",
    "name": "李鸿章",
    "dynasty": "清",
    "role": "宰相",
    "secondaryRoles": [
      "财政"
    ],
  },
  {
    "id": "original-qingong",
    "name": "秦孝公",
    "dynasty": "秦",
    "role": "皇帝",
    "secondaryRoles": [],
  },
  {
    "id": "original-qinzhaoxiang",
    "name": "秦昭襄王",
    "dynasty": "秦",
    "role": "皇帝",
    "secondaryRoles": [
      "名将"
    ],
  },
  {
    "id": "original-hanjingdi",
    "name": "汉景帝",
    "dynasty": "汉",
    "role": "皇帝",
    "secondaryRoles": [],
  },
  {
    "id": "original-hanxuandi",
    "name": "汉宣帝",
    "dynasty": "汉",
    "role": "皇帝",
    "secondaryRoles": [],
  },
  {
    "id": "original-hanmingdi",
    "name": "汉明帝",
    "dynasty": "东汉",
    "role": "皇帝",
    "secondaryRoles": [],
  },
  {
    "id": "original-hanzhangdi",
    "name": "汉章帝",
    "dynasty": "东汉",
    "role": "皇帝",
    "secondaryRoles": [],
  },
  {
    "id": "original-caocan",
    "name": "曹参",
    "dynasty": "汉",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-zhoubo",
    "name": "周勃",
    "dynasty": "汉",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-guanying",
    "name": "灌婴",
    "dynasty": "汉",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-fankuai",
    "name": "樊哙",
    "dynasty": "汉",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-liguang",
    "name": "李广",
    "dynasty": "汉",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-zhaochongguo",
    "name": "赵充国",
    "dynasty": "汉",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-zhaoguo",
    "name": "赵过",
    "dynasty": "汉",
    "role": "财政",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-dongzhongshu",
    "name": "董仲舒",
    "dynasty": "汉",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-jima",
    "name": "汲黯",
    "dynasty": "汉",
    "role": "监察",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-bingji",
    "name": "丙吉",
    "dynasty": "汉",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-weixiang",
    "name": "魏相",
    "dynasty": "汉",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-zhufuyan",
    "name": "主父偃",
    "dynasty": "汉",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-fengtang",
    "name": "冯唐",
    "dynasty": "汉",
    "role": "监察",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-douwan",
    "name": "窦婴",
    "dynasty": "汉",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-zhidu",
    "name": "郅都",
    "dynasty": "汉",
    "role": "监察",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-chentang",
    "name": "陈汤",
    "dynasty": "汉",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-banchao",
    "name": "班超",
    "dynasty": "东汉",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-ban-gu",
    "name": "班固",
    "dynasty": "东汉",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-mayuan",
    "name": "马援",
    "dynasty": "东汉",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-dengyu",
    "name": "邓禹",
    "dynasty": "东汉",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-wuhan",
    "name": "吴汉",
    "dynasty": "东汉",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-guanyu",
    "name": "关羽",
    "dynasty": "蜀汉",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-zhangfei",
    "name": "张飞",
    "dynasty": "蜀汉",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-zhaoyun",
    "name": "赵云",
    "dynasty": "蜀汉",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-machao",
    "name": "马超",
    "dynasty": "蜀汉",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-huangzhong",
    "name": "黄忠",
    "dynasty": "蜀汉",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-fazheng",
    "name": "法正",
    "dynasty": "蜀汉",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-pangtong",
    "name": "庞统",
    "dynasty": "蜀汉",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-jiangwei",
    "name": "姜维",
    "dynasty": "蜀汉",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-lusu",
    "name": "鲁肃",
    "dynasty": "东吴",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-lvmeng",
    "name": "吕蒙",
    "dynasty": "东吴",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-zhangliao",
    "name": "张辽",
    "dynasty": "曹魏",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-dianwei",
    "name": "典韦",
    "dynasty": "曹魏",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-xuchu",
    "name": "许褚",
    "dynasty": "曹魏",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-xiahoudun",
    "name": "夏侯惇",
    "dynasty": "曹魏",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-xiahouyuan",
    "name": "夏侯渊",
    "dynasty": "曹魏",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-lukang",
    "name": "陆抗",
    "dynasty": "东吴",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-duyu",
    "name": "杜预",
    "dynasty": "西晋",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-zhouchu",
    "name": "周处",
    "dynasty": "西晋",
    "role": "监察",
    "secondaryRoles": [
      "名将"
    ],
  },
  {
    "id": "original-murongchui",
    "name": "慕容垂",
    "dynasty": "后燕",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-tuobatao",
    "name": "拓跋焘",
    "dynasty": "北魏",
    "role": "皇帝",
    "secondaryRoles": [
      "名将"
    ],
  },
  {
    "id": "original-gaohuan",
    "name": "高欢",
    "dynasty": "东魏",
    "role": "皇帝",
    "secondaryRoles": [
      "名将"
    ],
  },
  {
    "id": "original-yuwentai",
    "name": "宇文泰",
    "dynasty": "西魏",
    "role": "皇帝",
    "secondaryRoles": [
      "名将"
    ],
  },
  {
    "id": "original-weixiaokuan",
    "name": "韦孝宽",
    "dynasty": "北周",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-chenqingzhi",
    "name": "陈庆之",
    "dynasty": "南梁",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-tandaoji",
    "name": "檀道济",
    "dynasty": "刘宋",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-gaochanggong",
    "name": "高长恭",
    "dynasty": "北齐",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-cuihao",
    "name": "崔浩",
    "dynasty": "北魏",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-suchuo",
    "name": "苏绰",
    "dynasty": "西魏",
    "role": "宰相",
    "secondaryRoles": [
      "财政"
    ],
  },
  {
    "id": "original-yangguang",
    "name": "隋炀帝",
    "dynasty": "隋",
    "role": "皇帝",
    "secondaryRoles": [
      "名将"
    ],
  },
  {
    "id": "original-gaojiong",
    "name": "高颎",
    "dynasty": "隋",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-yangsu",
    "name": "杨素",
    "dynasty": "隋",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-zhangsunwuji",
    "name": "长孙无忌",
    "dynasty": "唐",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-mazhou",
    "name": "马周",
    "dynasty": "唐",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-chusuiliang",
    "name": "褚遂良",
    "dynasty": "唐",
    "role": "监察",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-zhangjianzhi",
    "name": "张柬之",
    "dynasty": "唐",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-guoyuanzhen",
    "name": "郭元振",
    "dynasty": "唐",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-zhangyue",
    "name": "张说",
    "dynasty": "唐",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-zhangjiuling",
    "name": "张九龄",
    "dynasty": "唐",
    "role": "监察",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-limi_tang",
    "name": "李泌",
    "dynasty": "唐",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-luzhi",
    "name": "陆贽",
    "dynasty": "唐",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-hanyu",
    "name": "韩愈",
    "dynasty": "唐",
    "role": "监察",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-liuzongyuan",
    "name": "柳宗元",
    "dynasty": "唐",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-lideyu",
    "name": "李德裕",
    "dynasty": "唐",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-niusengru",
    "name": "牛僧孺",
    "dynasty": "唐",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-yan-zhenqing",
    "name": "颜真卿",
    "dynasty": "唐",
    "role": "监察",
    "secondaryRoles": [
      "名将"
    ],
  },
  {
    "id": "original-xuerengui",
    "name": "薛仁贵",
    "dynasty": "唐",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-sudingfang",
    "name": "苏定方",
    "dynasty": "唐",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-peixingjian",
    "name": "裴行俭",
    "dynasty": "唐",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-wangzhongsi",
    "name": "王忠嗣",
    "dynasty": "唐",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-gaoxianzhi",
    "name": "高仙芝",
    "dynasty": "唐",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-geshuhan",
    "name": "哥舒翰",
    "dynasty": "唐",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-weigao",
    "name": "韦皋",
    "dynasty": "唐",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-liugu",
    "name": "柳公绰",
    "dynasty": "唐",
    "role": "监察",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-hunyuan",
    "name": "浑瑊",
    "dynasty": "唐",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-zhaopu",
    "name": "赵普",
    "dynasty": "北宋",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-koushun",
    "name": "寇准",
    "dynasty": "北宋",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-fubi",
    "name": "富弼",
    "dynasty": "北宋",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-hanqi",
    "name": "韩琦",
    "dynasty": "北宋",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-lvmengzheng",
    "name": "吕蒙正",
    "dynasty": "北宋",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-caixiang",
    "name": "蔡襄",
    "dynasty": "北宋",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-wangdan",
    "name": "王旦",
    "dynasty": "北宋",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-zhangdun",
    "name": "章惇",
    "dynasty": "北宋",
    "role": "宰相",
    "secondaryRoles": [
      "财政"
    ],
  },
  {
    "id": "original-ligang",
    "name": "李纲",
    "dynasty": "南宋",
    "role": "监察",
    "secondaryRoles": [
      "名将"
    ],
  },
  {
    "id": "original-zhaoding",
    "name": "赵鼎",
    "dynasty": "南宋",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-yuyunwen",
    "name": "虞允文",
    "dynasty": "南宋",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-xinqiji",
    "name": "辛弃疾",
    "dynasty": "南宋",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-menggong",
    "name": "孟珙",
    "dynasty": "南宋",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-yujie",
    "name": "余玠",
    "dynasty": "南宋",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-jiasidao",
    "name": "贾似道",
    "dynasty": "南宋",
    "role": "宰相",
    "secondaryRoles": [
      "财政"
    ],
  },
  {
    "id": "original-zhangshijie",
    "name": "张世杰",
    "dynasty": "南宋",
    "role": "监察",
    "secondaryRoles": [
      "名将"
    ],
  },
  {
    "id": "original-ashu",
    "name": "阿术",
    "dynasty": "元",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-haojing",
    "name": "郝经",
    "dynasty": "元",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-liubingzhong",
    "name": "刘秉忠",
    "dynasty": "元",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-zhanghongfan",
    "name": "张弘范",
    "dynasty": "元",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-wanyanaguda",
    "name": "完颜阿骨打",
    "dynasty": "金",
    "role": "皇帝",
    "secondaryRoles": [
      "名将"
    ],
  },
  {
    "id": "original-wanyanzongbi",
    "name": "完颜宗弼",
    "dynasty": "金",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-wanyanzongwang",
    "name": "完颜宗望",
    "dynasty": "金",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-shitanze",
    "name": "史天泽",
    "dynasty": "元",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-xuheng",
    "name": "许衡",
    "dynasty": "元",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-zhubiao",
    "name": "朱标",
    "dynasty": "明",
    "role": "皇帝",
    "secondaryRoles": [],
  },
  {
    "id": "original-zhuzhanji",
    "name": "朱瞻基",
    "dynasty": "明",
    "role": "皇帝",
    "secondaryRoles": [],
  },
  {
    "id": "original-yansong",
    "name": "严嵩",
    "dynasty": "明",
    "role": "宰相",
    "secondaryRoles": [
      "财政"
    ],
  },
  {
    "id": "original-gaogong",
    "name": "高拱",
    "dynasty": "明",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-xujie",
    "name": "徐阶",
    "dynasty": "明",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-yangtinghe",
    "name": "杨廷和",
    "dynasty": "明",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-yangshiqi",
    "name": "杨士奇",
    "dynasty": "明",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-yangrong",
    "name": "杨荣",
    "dynasty": "明",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-yangpu",
    "name": "杨溥",
    "dynasty": "明",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-yuanchonghuan",
    "name": "袁崇焕",
    "dynasty": "明",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-xiongtingbi",
    "name": "熊廷弼",
    "dynasty": "明",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-lichengliang",
    "name": "李成梁",
    "dynasty": "明",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-sunchengzong",
    "name": "孙承宗",
    "dynasty": "明",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-luxiangsheng",
    "name": "卢象升",
    "dynasty": "明",
    "role": "监察",
    "secondaryRoles": [
      "名将"
    ],
  },
  {
    "id": "original-hongchengchou",
    "name": "洪承畴",
    "dynasty": "明清",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-shilang",
    "name": "施琅",
    "dynasty": "清",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-niangengyao",
    "name": "年羹尧",
    "dynasty": "清",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-yuezhongqi",
    "name": "岳钟琪",
    "dynasty": "清",
    "role": "名将",
    "secondaryRoles": [],
  },
  {
    "id": "original-linzexu",
    "name": "林则徐",
    "dynasty": "清",
    "role": "监察",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-hulin-yi",
    "name": "胡林翼",
    "dynasty": "清",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-dingbaozhen",
    "name": "丁宝桢",
    "dynasty": "清",
    "role": "监察",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-liutongxun",
    "name": "刘统勋",
    "dynasty": "清",
    "role": "监察",
    "secondaryRoles": [
      "宰相"
    ],
  },
  {
    "id": "original-jixiaolan",
    "name": "纪晓岚",
    "dynasty": "清",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-zhangtingyu",
    "name": "张廷玉",
    "dynasty": "清",
    "role": "宰相",
    "secondaryRoles": [],
  },
  {
    "id": "original-eertai",
    "name": "鄂尔泰",
    "dynasty": "清",
    "role": "宰相",
    "secondaryRoles": [
      "监察"
    ],
  },
  {
    "id": "original-aobai",
    "name": "鳌拜",
    "dynasty": "清",
    "role": "宰相",
    "secondaryRoles": [
      "财政"
    ],
  },
  {
    "id": "original-duoergun",
    "name": "多尔衮",
    "dynasty": "清",
    "role": "皇帝",
    "secondaryRoles": [
      "名将"
    ],
  }
];

const roleProfile: Record<Role, Pick<Person, "tags" | "bonuses">> = {
  皇帝: { tags: ["谋略", "民生"], bonuses: { sentiment: 8, integrity: 6 } },
  宰相: { tags: ["谋略", "吏治"], bonuses: { integrity: 10, grain: 5 } },
  名将: { tags: ["军事", "谋略"], bonuses: { army: 14, grain: -2 } },
  财政: { tags: ["财政", "民生"], bonuses: { grain: 15, population: 3 } },
  监察: { tags: ["吏治", "民生"], bonuses: { integrity: 15, sentiment: 3 } },
};

const primaryRoleOverrides: Partial<Record<string, Role>> = {
  商鞅: "财政", 王猛: "财政", 苏绰: "财政", 高颎: "财政", 陆贽: "财政", 姚崇: "财政", 范仲淹: "财政",
  耶律楚材: "财政", 脱脱: "财政", 李善长: "财政", 李鸿章: "财政", 章惇: "财政", 鄂尔泰: "财政", 曹参: "财政",
  蒙恬: "财政", 赵充国: "财政", 邓艾: "财政", 陶侃: "财政", 李绩: "财政", 郭子仪: "财政", 左宗棠: "财政",
  戚继光: "财政", 孟珙: "财政", 郭元振: "财政",
  张良: "监察", 陈平: "监察", 荀彧: "监察", 谢安: "监察", 裴度: "监察", 司马光: "监察", 欧阳修: "监察",
  刘伯温: "监察", 徐阶: "监察", 赵云: "监察", 周瑜: "监察", 陆逊: "监察", 羊祜: "监察", 韦孝宽: "监察", 辛弃疾: "监察",
};

const historicalRosterQuotes: Record<string, string> = {
  汉文帝: "治霸陵皆以瓦器，躬行节俭不是一句空话。",
  刘秀: "仕宦当作执金吾，乱世归来却成了中兴之主。",
  张良: "运筹帷幄之中，决胜千里之外。",
  陈平: "六出奇计，每次都落在最要命的地方。",
  卫青: "七击匈奴而不矜功，难得的是持重。",
  霍去病: "匈奴未灭，何以家为。",
  李斯: "从郡吏到帝国丞相，他比谁都懂制度的力量。",
  商鞅: "徙木立信之后，秦国再也不是旧日秦国。",
  王翦: "六十万伐楚，老将的谨慎比豪言更可靠。",
  蒙恬: "却匈奴七百余里，长城之外也有他的军功。",
  霍光: "受遗辅少主，汉室最危险的年月由他托住。",
  张骞: "凿空西域，一次出使把世界打开了。",
  孙权: "生子当如孙仲谋，守住江东亦是雄才。",
  司马懿: "能忍住五丈原的巾帼，也等得到高平陵的雷霆。",
  荀彧: "王佐之才，为曹操定下迎天子的大略。",
  郭嘉: "十胜十败论未必尽真，识人料敌却真有锋芒。",
  周瑜: "曲有误，周郎顾；赤壁的火更让天下回头。",
  陆逊: "书生拜大将，夷陵一战便烧尽轻视。",
  邓艾: "阴平险道无人敢走，他偏从那里抵达成都。",
  羊祜: "轻裘缓带，连敌境百姓也愿意记他的好。",
  王猛: "扪虱谈天下，前秦的盛势离不开这位丞相。",
  谢安: "小儿辈遂已破贼，棋局旁自有东山气度。",
  祖逖: "闻鸡起舞，渡江后仍念着收复中原。",
  桓温: "既不能流芳后世，也要遗臭万年。",
  陶侃: "运甓习劳，真正把勤谨过成了日常。",
  隋文帝: "结束数百年分裂，开皇之治攒下厚实家底。",
  武则天: "政启开元，治宏贞观；无字碑留给后人评说。",
  唐玄宗: "开元天宝之间，盛世与转折都写在一人身上。",
  杜如晦: "房谋杜断，他最可贵的是临事能决。",
  李绩: "历事三朝而恩遇不衰，战功之外更见分寸。",
  郭子仪: "功盖天下而主不疑，位极人臣而众不疾。",
  李光弼: "与郭子仪齐名，再造唐室并非一人之功。",
  裴度: "平淮西、破藩镇，中唐朝堂终于硬了一回。",
  狄仁杰: "桃李满天下，更难得的是把国本悄悄扶正。",
  姚崇: "十事要说，开元新政先从能办成的事做起。",
  宋璟: "守法持正，盛世里也需要肯说不的人。",
  宋仁宗: "百事不会，只会做官家；宽厚因此成了一代底色。",
  范仲淹: "先天下之忧而忧，落到政事上也从不含糊。",
  司马光: "砸缸是少年名声，通鉴与相业才是毕生功课。",
  欧阳修: "文章冠天下，庆历政局中也不肯只做文士。",
  韩世忠: "黄天荡里困兀术，南宋并非无人敢战。",
  文天祥: "人生自古谁无死，留取丹心照汗青。",
  陆秀夫: "崖山最后一刻，他选择与国运一同沉海。",
  忽必烈: "从草原汗王到中原皇帝，他选择用制度统治疆域。",
  耶律楚材: "以儒术救苍生，让征服者明白百姓活着更有价值。",
  伯颜: "奉一纸诏书南下，临安城最终未能挡住他的军队。",
  脱脱: "修三史、治黄河，元末难局中仍想有所作为。",
  朱棣: "五征漠北、遣使远洋，永乐从不缺大手笔。",
  刘伯温: "渡江策士无双，功成之后却懂得退一步。",
  常遇春: "号称常十万，冲锋从来不等第二道军令。",
  于谦: "社稷为重，君为轻；北京城因此没有失守。",
  戚继光: "封侯非我意，但愿海波平。",
  李善长: "明初制度草创时，他是朱元璋最倚重的老臣。",
  郑和: "七下西洋，宝船带回的是一个辽阔世界。",
  康熙: "擒鳌拜、平三藩、定台湾，少年天子一路亲自解题。",
  雍正: "以勤先天下，案头灯火几乎从未熄灭。",
  乾隆: "十全武功之外，盛世也在他手中渐露疲态。",
  曾国藩: "结硬寨，打呆仗；笨功夫最后成了真本事。",
  左宗棠: "身无半亩，心忧天下；抬棺西行绝非虚言。",
  李鸿章: "一生都在补漏，而时代留下的裂缝比人更大。",
  秦孝公: "敢把国运交给变法者，本身就是一种魄力。",
  秦昭襄王: "在位五十余年，把秦的优势熬成了天下大势。",
  汉景帝: "七国之乱来得凶险，平定之后文景之治仍在继续。",
  汉宣帝: "生于民间、长于牢狱，他看天下的角度不同于宫中。",
  汉明帝: "明章之治从他开始，东汉尚有向上的锐气。",
  汉章帝: "宽厚好儒，盛世的温度有时比锋芒更难得。",
  曹参: "萧规曹随，不扰民也是治国本领。",
  周勃: "安刘氏者必勃也，木讷老实并不妨碍临危定局。",
  灌婴: "从贩缯少年到车骑将军，汉初战场处处有他。",
  樊哙: "鸿门宴上持盾闯帐，勇气从来写在脸上。",
  李广: "桃李不言，下自成蹊；飞将军一生却总差一点封侯。",
  赵充国: "百闻不如一见，老将坚持先到边地看清再奏。",
  赵过: "代田法让农具与耕作一起改变，史书里的农业专家。",
  董仲舒: "罢黜百家是否准确另论，他确实重塑了汉代政治语言。",
  汲黯: "好直谏，守节死义，连汉武帝也敬他三分。",
  丙吉: "问牛不问人，因为宰相惦记的是天下时序。",
  魏相: "留心民间疾苦，宣帝中兴少不了这样的务实臣子。",
  主父偃: "推恩令写得温和，落下去却拆开了诸侯根基。",
  冯唐: "冯唐易老，但敢在天子面前替将领说公道话。",
  窦婴: "平七国有功，身陷外戚党争时却没能全身而退。",
  郅都: "苍鹰之名不是赞美，却足见豪强对他的畏惧。",
  陈汤: "明犯强汉者，虽远必诛。",
  班超: "投笔从戎，三十余年经营西域。",
  班固: "一部汉书未及亲手写完，体例却影响千年。",
  马援: "马革裹尸，老将最怕的从来不是路远。",
  邓禹: "云台二十八将之首，功名来自识大体而非争锋。",
  吴汉: "差强人意最初说的，正是他能振奋军伍。",
  关羽: "威震华夏，也因刚而自矜留下败走麦城。",
  张飞: "当阳桥上一声喝退追兵，勇猛之外也曾义释严颜。",
  赵云: "一身都是胆，长坂坡并非他唯一的高光。",
  马超: "锦马超名震西凉，锋芒却没能换来安稳基业。",
  黄忠: "定军山阵斩夏侯渊，老将的箭从不问年龄。",
  法正: "奇画策算，蜀汉夺取汉中最锋利的谋臣。",
  庞统: "论帝王之秘策，揽倚伏之要最。",
  姜维: "九伐中原，执念让他撑到蜀汉最后一刻。",
  鲁肃: "榻上对早早看见三分天下，他不是只会做和事佬。",
  吕蒙: "士别三日，当刮目相待。",
  张辽: "八百破十万，逍遥津后江东小儿闻名止啼。",
  典韦: "古之恶来，宛城最后一战仍守在主公门前。",
  许褚: "裸衣战马超，虎痴的威名来自近身硬仗。",
  夏侯惇: "拔矢啖睛虽是演义传奇，忠勇宗亲却确有其人。",
  夏侯渊: "三日五百、六日一千，奔袭是他的成名法。",
  陆抗: "西陵一战挽住吴国晚势，也是最后的名将余晖。",
  杜预: "时人称杜武库，因为他像一座随取随用的知识库。",
  周处: "除三害从除掉旧日的自己开始。",
  慕容垂: "名将半生受猜忌，离开前秦后终于自立。",
  拓跋焘: "统一北方的铁骑雄主，锋芒也伴着残酷。",
  高欢: "若非英雄，安能生英雄；乱世人心被他牢牢抓住。",
  宇文泰: "关陇集团与府兵底色，都能追到他的布局。",
  韦孝宽: "玉璧城让高欢顿兵数十日，守城从来不是死守。",
  陈庆之: "名师大将莫自牢，千军万马避白袍。",
  檀道济: "自毁万里长城，是后世对他冤死最痛的注脚。",
  高长恭: "面具之下是兰陵王，邙山一战传成入阵曲。",
  崔浩: "国史之狱吞掉了这位谋臣，也暴露北魏政治边界。",
  苏绰: "六条诏书奠定西魏治术，制度文字可以改变国运。",
  隋炀帝: "大运河贯通南北，辽东战场也拖垮了他的天下。",
  高颎: "开皇治世的幕后支柱，杨坚曾称其心如明镜。",
  杨素: "上马能破敌，下马能谋国，权势也因此令人侧目。",
  长孙无忌: "凌烟阁第一功臣，最后却败给了自己熟悉的宫廷。",
  马周: "从旅舍困顿到直入中书，才华终究被太宗看见。",
  褚遂良: "陛下富有四海，何苦再得一昭仪。",
  张柬之: "年过八十发动神龙政变，让李唐重新回到台前。",
  郭元振: "安西经营十余年，边功并不只靠一场大战。",
  张说: "三度为相、主持封禅，文章与权术皆熟。",
  张九龄: "草木有本心，何求美人折。",
  李泌: "山中宰相四朝周旋，进退之间自有分寸。",
  陆贽: "奏议切中时病，德宗若多听几句或许会少些弯路。",
  韩愈: "欲为圣明除弊事，肯将衰朽惜残年。",
  柳宗元: "永州山水之外，他始终没放下改革理想。",
  李德裕: "会昌政局的强硬主导者，也没能走出党争。",
  牛僧孺: "牛李党争绵延数十年，他是其中绕不开的一端。",
  颜真卿: "安史之乱守城，李希烈营中赴死，字与人同样端正。",
  薛仁贵: "三箭定天山，白袍将军从军中脱颖而出。",
  苏定方: "前后灭三国，俘其主，唐军西进的真正利刃。",
  裴行俭: "儒将知人，又把西域道路走得极稳。",
  王忠嗣: "不愿以数万生命换个人功名，盛唐边将亦有克制。",
  高仙芝: "翻越葱岭远征千里，怛罗斯却成了命运转折。",
  哥舒翰: "北斗七星高，哥舒夜带刀；潼关一败令人长叹。",
  韦皋: "坐镇西川二十余年，让吐蕃始终难越成都一步。",
  柳公绰: "动静以礼，法令严而不苛，是中唐少见的清醒。",
  浑瑊: "奉天解围、平凉脱险，危局中总能找到他。",
  赵普: "半部论语治天下虽是传说，开国谋划却实打实。",
  寇准: "澶渊城下，他硬把犹疑的皇帝推到了前线。",
  富弼: "出使契丹不辱使命，庆历新政也有他的担当。",
  韩琦: "相三朝、立二帝，沉得住气就是他的锋芒。",
  吕蒙正: "不记旧怨，也不因贫寒忘记体恤后来人。",
  蔡襄: "一封荔枝谱之外，泉州洛阳桥更见实政。",
  王旦: "识大体、能容人，真宗朝的平稳有他的功劳。",
  章惇: "强项与争议一样鲜明，元祐政争从不温和。",
  李纲: "靖康城头主战到底，南渡后仍念念不忘中原。",
  赵鼎: "中兴贤相四字，足以说明南宋人对他的怀念。",
  虞允文: "采石矶临时督军，一介文臣竟挡住金主南下。",
  辛弃疾: "醉里挑灯看剑，他从来不甘只以词人留名。",
  孟珙: "机动救火二十余年，南宋防线靠他缝合。",
  余玠: "经营四川、筑山城体系，为钓鱼城传奇打下根基。",
  贾似道: "木棉庵外尘埃定，权术终究撑不起危亡天下。",
  张世杰: "崖山风急，他仍试图为宋室留下最后一线。",
  阿术: "襄阳之后长驱南下，是元军锋线上最硬的一支。",
  郝经: "被扣十六年不改使节，元初士人自有骨气。",
  刘秉忠: "大都城与元代制度背后，都有这位僧人出身的谋士。",
  张弘范: "崖山一役终结宋祚，功名也因此永远伴着争议。",
  完颜阿骨打: "两千五百破辽军十万，女真由此真正崛起。",
  完颜宗弼: "兀术南征北战，是岳飞一生最著名的对手。",
  完颜宗望: "一路直抵汴京，靖康之变前锋最锐。",
  史天泽: "横跨蒙元两朝，既统军也参与新朝治理。",
  许衡: "治生、治心、治国在他那里本是一套学问。",
  朱标: "仁厚太子若能继位，明初政治或许会换一种颜色。",
  朱瞻基: "斗蟋蟀的逸闻之外，仁宣之治在他手中收束。",
  严嵩: "青词宰相擅长揣摩圣意，身后骂名也由此而来。",
  高拱: "性情峭直，隆庆朝的办事效率有他一份。",
  徐阶: "小心隐忍二十年，终于把严嵩送出朝堂。",
  杨廷和: "正德骤亡后维持中枢，却在大礼议前不肯退让。",
  杨士奇: "三杨之首，长于调和而不失原则。",
  杨荣: "随驾北征、熟悉边务，三杨中最有决断的一位。",
  杨溥: "十年诏狱没有磨掉气节，入阁后更显宽厚。",
  袁崇焕: "五年复辽终成空言，宁远城下的炮声却真实存在。",
  熊廷弼: "三方布置未能施展，传首九边成了晚明冤案。",
  李成梁: "镇辽二十二年战功赫赫，边地格局也因他更复杂。",
  孙承宗: "督师辽东、筑关宁防线，书生也能守国门。",
  卢象升: "巨鹿最后一战，他带着残兵迎向必败之局。",
  洪承畴: "松锦败降之后仍有治事之才，名节争议却无法抹去。",
  施琅: "澎湖决战后台湾入版图，旧恩怨也随海潮未平。",
  年羹尧: "西北立功极盛，盛到最终容不下自己。",
  岳钟琪: "满营皆满人而大将军独为汉人，足见其军功。",
  林则徐: "苟利国家生死以，岂因祸福避趋之。",
  胡林翼: "才大心细，湘军能成体系不只是曾国藩一人之功。",
  丁宝桢: "敢杀安德海，也能把山东四川的实务办下去。",
  刘统勋: "遇事敢任、持正不阿，乾隆称他真宰相。",
  纪晓岚: "阅微草堂的机锋之外，四库馆里更见其博闻。",
  张廷玉: "配享太庙的汉臣，靠的是数十年如一日的谨慎。",
  鄂尔泰: "改土归流的执行者，雍正新政由他推向西南。",
  鳌拜: "战功曾使他显赫，专权又使他成为少年康熙的第一关。",
  多尔衮: "山海关一役改变天下，他离皇位始终只有半步。",
};

const rosterQuote = (seed: OriginalPersonSeed) => historicalRosterQuotes[seed.name] || `${seed.name}见于史册，自有一段可供后人评说的功过。`;

const importedPeople: Person[] = originalPeopleSeeds.map((seed) => {
  const role = primaryRoleOverrides[seed.name] || seed.role;
  const secondaryRoles = role === seed.role
    ? seed.secondaryRoles
    : [seed.role, ...seed.secondaryRoles].filter((item, index, items) => item !== role && items.indexOf(item) === index);
  return {
    ...seed,
    role,
    secondaryRoles,
    quote: rosterQuote({ ...seed, role }),
    tags: [...roleProfile[role].tags],
    bonuses: { ...roleProfile[role].bonuses },
  };
});

const people: Person[] = [...corePeople, ...importedPeople];

const randomEvents: EventTemplate[] = [
  { id: "spring-plough", title: "劝课农桑", category: "民生", text: "春耕将启，地方上奏：水渠年久失修，若不整治恐误农时；但国库也等着发军饷。", options: [
    { label: "发帑兴修水利", detail: "以眼前钱粮换来长期生计。", effects: { grain: -8, population: 4, sentiment: 8 }, tag: "民生" },
    { label: "令州县自行筹措", detail: "成败取决于官吏是否得力。", chance: 58, tag: "吏治", successEffects: { grain: 5, sentiment: 4 }, failEffects: { sentiment: -9, integrity: -8 } },
    { label: "军务为先，暂缓一年", detail: "保存库藏，但百姓会记住。", effects: { grain: 3, sentiment: -7 } },
  ]},
  { id: "merchant-tax", title: "商路榷税", category: "财政", text: "南北商旅渐盛，度支司建议增设关津之税。市肆可为国用，也可能因盘剥而凋敝。", options: [
    { label: "轻税通商", detail: "让民间先富起来。", effects: { grain: 6, sentiment: 5, integrity: 2 } },
    { label: "设官榷税", detail: "考验财政官的执行能力。", chance: 62, tag: "财政", successEffects: { grain: 15, integrity: 3 }, failEffects: { grain: 4, sentiment: -8, integrity: -7 } },
    { label: "交由豪商包税", detail: "见效最快，也最容易滋生勾结。", effects: { grain: 12, sentiment: -8, integrity: -10 } },
  ]},
  { id: "official-audit", title: "郡县考课", category: "吏治", text: "御史发现数郡账册彼此矛盾。有人主张彻查，也有人担心牵连太广、政务停摆。", options: [
    { label: "限期彻查", detail: "清理积弊，阻力不小。", chance: 55, tag: "吏治", successEffects: { grain: 9, integrity: 13, sentiment: 4 }, failEffects: { grain: -5, integrity: -5, sentiment: -3 } },
    { label: "惩首恶而安其余", detail: "在震慑与稳定之间取中。", effects: { integrity: 5, sentiment: 2 } },
    { label: "压下案卷", detail: "朝堂暂时安静，蛀虫继续长大。", effects: { grain: 5, integrity: -12 } },
  ]},
  { id: "frontier-market", title: "互市与烽燧", category: "边患", text: "边地部族请求开放互市，守将则称其中混有探子。是以利驭之，还是以兵拒之？", options: [
    { label: "开互市，遣使结盟", detail: "柔远之策需要谋略支撑。", chance: 60, tag: "谋略", successEffects: { grain: 10, sentiment: 3, army: 3 }, failEffects: { grain: -3, army: -8 } },
    { label: "耀兵塞上", detail: "武备足则震慑，不足则露怯。", chance: 48, tag: "军事", successEffects: { army: 10, sentiment: 2 }, failEffects: { army: -12, grain: -7 } },
    { label: "闭关拒绝", detail: "最稳妥，也失去一条财路。", effects: { army: 2, grain: -3 } },
  ]},
  { id: "flood", title: "河决千里", category: "灾异", text: "连日暴雨，河堤溃决。灾民扶老携幼涌向州城，粮价一夜三涨。", options: [
    { label: "开仓赈济，蠲免田租", detail: "先保人，再谈来年。", effects: { grain: -16, population: -2, sentiment: 15 } },
    { label: "以工代赈，堵口复堤", detail: "钱粮与能吏缺一不可。", chance: 52, tag: "民生", successEffects: { grain: -8, population: 2, sentiment: 10 }, failEffects: { grain: -14, population: -7, sentiment: -8 } },
    { label: "封锁灾区", detail: "不动国库赈粮，强行隔绝灾区以保全邻郡。", effects: { grain: 7, population: -8, sentiment: -16, integrity: -5 } },
  ]},
  { id: "drought", title: "赤地无雨", category: "灾异", text: "入夏无雨，禾苗枯卷。太史令称需祈雨，司农则请求立刻调粮。", options: [
    { label: "跨郡转运", detail: "损耗巨大，却最可靠。", effects: { grain: -14, population: -1, sentiment: 12 } },
    { label: "减膳祈雨并平粜", detail: "仪式与实政并行。", chance: 60, tag: "财政", successEffects: { grain: -7, sentiment: 9 }, failEffects: { grain: -10, population: -4, sentiment: -7 } },
    { label: "听其自救", detail: "停止跨郡转运，保全中央仓储，代价由灾民承担。", effects: { grain: 6, population: -9, sentiment: -16 } },
  ]},
  { id: "auspicious", title: "甘露降庭", category: "祥瑞", text: "宫苑老柏降下甘露，百官请上尊号、大赦天下。民间也在等待朝廷的态度。", options: [
    { label: "大赦并减今年租", detail: "把祥瑞变成百姓摸得到的恩典。", effects: { grain: -6, sentiment: 13 } },
    { label: "却尊号，奖农桑", detail: "不迷信天意，把功劳归于万民。", effects: { sentiment: 7, integrity: 7, grain: 3 } },
    { label: "大兴庆典", detail: "倾国同庆最能鼓舞人心，也最耗钱粮与官箴。", effects: { grain: -12, sentiment: 20, integrity: -4 } },
  ]},
  { id: "academy", title: "太学论政", category: "文教", text: "太学生上书议论时政，有言辞激烈者。朝臣争论：年轻人的声音是国之元气，还是朋党之始？", options: [
    { label: "召见问策", detail: "纳言也考验君臣的胸襟。", chance: 65, tag: "谋略", successEffects: { sentiment: 9, integrity: 7 }, failEffects: { sentiment: -2, integrity: -3 } },
    { label: "令有司择善而行", detail: "制度化吸收意见。", effects: { sentiment: 4, integrity: 5 } },
    { label: "严禁妄议", detail: "以整饬学规压下争论，官场肃然，士心却难平。", effects: { integrity: 9, sentiment: -6 } },
  ]},
  { id: "army-pay", title: "军饷迟发", category: "军务", text: "北营军饷已迟发两月，将士虽未哗变，营门前却多了卖甲换酒的人。", options: [
    { label: "足额补发", detail: "军心不可试。", effects: { grain: -12, army: 10 } },
    { label: "清查空饷后补发", detail: "若查得好，还能拔出一串蛀虫。", chance: 58, tag: "吏治", successEffects: { grain: -4, army: 8, integrity: 8 }, failEffects: { grain: -10, army: -8, integrity: -4 } },
    { label: "以爵赏抵饷", detail: "省下今日的钱，透支明日的制度。", effects: { grain: 3, army: 3, integrity: -10 } },
  ]},
  { id: "locust", title: "飞蝗蔽日", category: "灾异", text: "蝗群越过州界，如云压城。受灾郡县请求动用常平仓，邻郡却担心本地储备不足。", options: [
    { label: "倾力捕蝗赈灾", detail: "全天下共担一地之灾。", effects: { grain: -13, population: -2, sentiment: 11 } },
    { label: "悬赏收蝗", detail: "把灾异变成一场全民动员。", chance: 64, tag: "民生", successEffects: { grain: -5, sentiment: 8 }, failEffects: { grain: -9, population: -5, sentiment: -5 } },
    { label: "祭神禳灾", detail: "耗费不多，效果交给天意。", chance: 25, successEffects: { sentiment: 6 }, failEffects: { population: -7, grain: -7, sentiment: -8 } },
  ]},
  { id: "refugees", title: "流民入境", category: "民生", text: "邻境战乱，数万流民叩关求生。他们既是等待安置的嘴，也是可垦荒、可从军的人。", options: [
    { label: "授田安置", detail: "短期费粮，长期添户。", effects: { grain: -10, population: 10, sentiment: 8 } },
    { label: "择壮者编入军屯", detail: "成败在于军政协调。", chance: 55, tag: "军事", successEffects: { population: 5, army: 9, grain: -5 }, failEffects: { population: 2, sentiment: -8, army: -3 } },
    { label: "闭关遣返", detail: "守住关仓与边防，不添供养负担，也伤仁德。", effects: { grain: 5, army: 3, sentiment: -9 } },
  ]},
  { id: "palace", title: "营建宫室", category: "朝堂", text: "将作监称旧宫狭陋，不足彰显国威；群臣都知道，这笔账最终要落在百姓头上。", options: [
    { label: "罢役，修官舍学校", detail: "国威不只在宫阙。", effects: { grain: -4, sentiment: 9, integrity: 4 } },
    { label: "量入为出，小修旧宫", detail: "只修危旧之处，以最低开支顾全体面。", effects: { grain: -2, sentiment: 2 } },
    { label: "大兴土木", detail: "若调度得当可兴百业、聚人心，失控则劳民伤财。", chance: 55, tag: "财政", successEffects: { grain: -18, population: 5, sentiment: 12, integrity: -2 }, failEffects: { grain: -20, population: -3, sentiment: -14, integrity: -4 } },
  ]},
  { id: "rebellion", title: "揭竿四起", category: "民变", text: "长期积压的民怨终于点燃。饥民攻破县城，裹挟者日众，地方官已无法收拾。", options: [
    { label: "赈抚并诛贪官", detail: "需要足够钱粮与清明吏治。", requirements: { grain: 35, integrity: -20 }, failOnUnmet: true, effects: { grain: -18, sentiment: 25, integrity: 10, army: -3 } },
    { label: "遣精兵平乱", detail: "以伤亡换取确定的平乱结果，并追究失职官吏。", requirements: { army: 75 }, failOnUnmet: true, effects: { army: -12, population: -7, sentiment: -10, integrity: 7 } },
    { label: "招安首领", detail: "暂息兵火，后患难测。", chance: 48, tag: "谋略", successEffects: { sentiment: 12, army: 3 }, failEffects: { army: -14, grain: -9, sentiment: -8 } },
  ]},
  { id: "invasion", title: "烽火入塞", category: "边患", text: "敌骑越塞，三郡告急。多年的武备松弛在这一刻都写进了战报。", options: [
    { label: "亲征迎敌", detail: "武力不足则国门洞开。", requirements: { army: 70 }, failOnUnmet: true, effects: { army: -10, grain: -10, sentiment: 8 } },
    { label: "坚壁清野", detail: "以空间换时间。", effects: { population: -5, grain: -8, army: 4, sentiment: -7 } },
    { label: "遣使议和", detail: "谋臣能争来喘息，也可能换来屈辱。", chance: 52, tag: "谋略", successEffects: { grain: -8, army: 2 }, failEffects: { grain: -15, sentiment: -10, army: -6 } },
  ]},
  { id: "granary-fire", title: "仓廪夜火", category: "灾异", text: "州仓深夜失火，官吏称是天干物燥，守仓役卒却说起火前曾看见账吏搬运粮袋。", options: [
    { label: "重修仓廪，增设火道", detail: "先恢复储粮能力，再防下一场火。", effects: { grain: -8, integrity: 7, sentiment: 4 } },
    { label: "封仓彻查纵火与亏空", detail: "查清真相可能追回损失，也可能只抓到替罪羊。", chance: 57, tag: "吏治", successEffects: { grain: 10, integrity: 9 }, failEffects: { grain: -7, integrity: -6, sentiment: -4 } },
    { label: "以陈粮损耗结案", detail: "账面很快平了，仓里的窟窿仍在。", effects: { grain: 3, integrity: -10 } },
  ]},
  { id: "earthquake", title: "地动坏城", category: "灾异", text: "数郡同日地动，城垣、民居多有倒塌，余震未止，官府却已为先修衙署还是先安百姓争执。", options: [
    { label: "发料重建民居", detail: "耗费最大，却能让流离者尽快归家。", effects: { grain: -14, population: 2, sentiment: 12 } },
    { label: "蠲租并开放官地", detail: "让地方自行恢复，朝廷负责减轻负担。", effects: { grain: -7, sentiment: 8, integrity: 3 } },
    { label: "迁县治于高地", detail: "重整官署与防灾格局，但旧城百姓未必愿走。", effects: { grain: -3, population: -3, integrity: 6 } },
  ]},
  { id: "bumper-harvest", title: "嘉禾丰岁", category: "祥瑞", text: "数州同报丰收，田间又有一茎多穗的嘉禾。粮价下跌，朝廷既可充仓，也可让利于民。", options: [
    { label: "平价收粮充仓", detail: "为荒年积下底气，也替农户托住粮价。", effects: { grain: 14, sentiment: 2 } },
    { label: "减租任民交易", detail: "国库少收一些，让丰年真正落到民间。", effects: { grain: 6, sentiment: 10 } },
    { label: "献嘉禾，赐酺三日", detail: "把丰收办成盛典，人心振奋但不免铺张。", effects: { grain: -5, sentiment: 14, integrity: -3 } },
  ]},
  { id: "white-deer", title: "白鹿来献", category: "祥瑞", text: "山民献上一头白鹿，礼官称王化所感，请告祭宗庙；御史却说沿途进献已扰动数县。", options: [
    { label: "放归山林，却受尊号", detail: "拒绝把偶然当作功业。", effects: { grain: 3, integrity: 8 } },
    { label: "借瑞兆赦轻罪", detail: "让祥瑞化作看得见的宽政。", effects: { grain: -4, sentiment: 12, integrity: 2 } },
    { label: "遍告郡国，举行大祭", detail: "仪典能凝聚人心，也会耗费贡输。", effects: { grain: -9, sentiment: 8, army: 4 } },
  ]},
  { id: "salt-iron", title: "盐铁之议", category: "财政", text: "盐井与铁冶利润丰厚，度支司请收归官营，商贾则称官作价高、百姓终将多付。", options: [
    { label: "设官营盐铁监", detail: "制度执行得好可充实国用，失控便是层层盘剥。", chance: 58, tag: "财政", successEffects: { grain: 18, integrity: 4 }, failEffects: { grain: 3, sentiment: -9, integrity: -8 } },
    { label: "发牌照，按引征税", detail: "保留民营活力，以税契约束豪商。", effects: { grain: 10, sentiment: 3, integrity: -2 } },
    { label: "弛禁自由煮铸", detail: "朝廷少取利，让民间物价先稳下来。", effects: { grain: 5, sentiment: 8, integrity: 3 } },
  ]},
  { id: "coinage", title: "恶钱充市", category: "财政", text: "各地私铸轻钱涌入市集，同样一串钱轻重不一，军粮采购与百姓交易都受其扰。", options: [
    { label: "统一钱范，严查私铸", detail: "整顿币制需要强有力的财政与吏治协同。", chance: 56, tag: "财政", successEffects: { grain: 12, integrity: 8, sentiment: 4 }, failEffects: { grain: -8, integrity: -7, sentiment: -5 } },
    { label: "暂许私钱折价流通", detail: "先维持市面周转，代价是默认币制混乱。", effects: { grain: 8, sentiment: 4, integrity: -6 } },
    { label: "以官钱回收恶钱", detail: "国库承担损失，百姓手里的钱重新可信。", effects: { grain: -9, sentiment: 8, integrity: 7 } },
  ]},
  { id: "land-survey", title: "隐田出籍", category: "财政", text: "清丈时发现豪族田亩远多于黄册所载，佃户却坚称一旦改籍，自己会先被逐出土地。", options: [
    { label: "重造鱼鳞册", detail: "清丈准确便可增赋，操切则会激起抵抗。", chance: 54, tag: "吏治", successEffects: { grain: 14, integrity: 10 }, failEffects: { grain: -5, sentiment: -10, integrity: -6 } },
    { label: "先定佃户永业", detail: "承认耕作者权利，再追豪族欠赋。", effects: { grain: -5, population: 4, sentiment: 10 } },
    { label: "依豪族旧册结案", detail: "税粮来得快，却把隐田永久写成既成事实。", effects: { grain: 10, integrity: -9, sentiment: -5 } },
  ]},
  { id: "canal-silt", title: "漕渠淤塞", category: "民生", text: "漕渠数十里积沙，粮船接连搁浅。若错过水期，京仓与前线都会同时催粮。", options: [
    { label: "征发役夫全面疏浚", detail: "一次清开主渠，民力负担也最重。", effects: { grain: -10, population: 3, sentiment: 7 } },
    { label: "雇沿岸百姓分段清淤", detail: "地方协作得好可省工省粮，组织不善则延误水期。", chance: 63, tag: "民生", successEffects: { grain: 9, sentiment: 8 }, failEffects: { grain: -10, sentiment: -6 } },
    { label: "改走陆路保军粮", detail: "先保紧急运输，民用漕船仍被困在浅滩。", effects: { grain: -5, army: 5, sentiment: -4 } },
  ]},
  { id: "corvee-deserters", title: "役夫逃亡", category: "民生", text: "大工程沿线役夫逃亡渐多，地方称农时将至，若继续追捕，许多村落便无人下田。", options: [
    { label: "折役为税，募人施工", detail: "以钱代役，让愿做工者得到报酬。", effects: { grain: 9, sentiment: 5, integrity: 2 } },
    { label: "削减工程，放归农时", detail: "牺牲进度，保住今年耕作与户口。", effects: { grain: -6, population: 4, sentiment: 10 } },
    { label: "遣军追捕逃役", detail: "工程暂不缺人，乡里与官府的裂痕却更深。", effects: { army: 4, grain: 3, sentiment: -10, integrity: -5 } },
  ]},
  { id: "midwife", title: "产育之政", category: "民生", text: "数郡上报产妇与婴孩夭折增多，医官请求设产舍、训稳婆，礼官却嫌男女之事不宜由官府过问。", options: [
    { label: "州县设产舍药局", detail: "直接投入钱粮，保护最脆弱的人口。", effects: { grain: -7, population: 7, sentiment: 7 } },
    { label: "选训乡里稳婆", detail: "制度若能落到乡间，花费不大而收效长久。", chance: 65, tag: "民生", successEffects: { population: 8, sentiment: 5 }, failEffects: { grain: -4, population: -3, sentiment: -3 } },
    { label: "赐粟表彰多子之家", detail: "容易推行，但未必能救急难产育。", effects: { grain: -2, population: 2, sentiment: 8, integrity: -2 } },
  ]},
  { id: "clan-feud", title: "宗族械斗", category: "治安", text: "两姓为水源与坟地聚众械斗，县令与其中一族通婚，案卷送到州府后迟迟不决。", options: [
    { label: "异地会审，重勘旧界", detail: "能吏可解开积怨，处断不公则两边都反。", chance: 59, tag: "吏治", successEffects: { integrity: 10, sentiment: 8 }, failEffects: { population: -4, sentiment: -8, integrity: -6 } },
    { label: "分村定界，另开水渠", detail: "用工程隔开冲突，也给双方留下面子。", effects: { grain: -5, population: 3, sentiment: 5, integrity: 4 } },
    { label: "支持势强一族镇压", detail: "眼前秩序恢复，地方势力从此更难约束。", effects: { grain: 6, army: 2, integrity: -9, sentiment: -7 } },
  ]},
  { id: "road-bandits", title: "驿路盗起", category: "治安", text: "连接两州的山道盗匪出没，商旅绕行，驿卒不敢夜发。盗首原是裁撤边军中的一名校尉。", options: [
    { label: "设巡检，护送商旅", detail: "以常备力量慢慢夺回道路。", effects: { grain: -8, army: 7, sentiment: 5 } },
    { label: "招安盗首，收编旧卒", detail: "用得好是熟悉山路的兵，用不好便是引狼入室。", chance: 52, tag: "军事", successEffects: { army: 9, grain: 5 }, failEffects: { army: -8, grain: -5, integrity: -5 } },
    { label: "悬赏首级，限期清道", detail: "花费较少，却容易诱发冒功与株连。", effects: { grain: -4, army: 4, integrity: -3, sentiment: -3 } },
  ]},
  { id: "frontier-defector", title: "敌将叩关", category: "边患", text: "敌国一名边将率数百骑叩关请降，自称愿献出关隘图册。守臣怀疑这是一次精心安排的反间。", options: [
    { label: "厚待来降，依图出兵", detail: "识人得当可不战夺险，误信则会踏入伏地。", chance: 50, tag: "谋略", successEffects: { army: 12, grain: 5 }, failEffects: { army: -14, grain: -8, sentiment: -5 } },
    { label: "留人不用，反放假情报", detail: "把风险变成一场反间局。", effects: { army: 6, grain: 4, integrity: -4 } },
    { label: "礼送出境，固守关塞", detail: "不贪意外之利，也不轻易坏降者之路。", effects: { sentiment: 3, integrity: 6, army: -3 } },
  ]},
  { id: "horse-breeding", title: "官牧缺马", category: "军务", text: "官牧连年疫损，骑军一人两骑的旧额已难维持。牧官请圈占新草场，边民却靠那里放牧度日。", options: [
    { label: "扩建官牧，精选种马", detail: "长期补足骑军，眼下先要投入草料与土地。", effects: { grain: -10, army: 11, population: -2 } },
    { label: "向商旅市马", detail: "财政官若能控制价格，可迅速补齐缺额。", chance: 61, tag: "财政", successEffects: { grain: -7, army: 10 }, failEffects: { grain: -14, army: 2, integrity: -4 } },
    { label: "按户征马", detail: "最快凑齐军马，也最伤边地生计。", effects: { army: 8, grain: 3, sentiment: -10, integrity: -5 } },
  ]},
  { id: "arsenal", title: "武库朽甲", category: "军务", text: "秋阅前抽检武库，发现弓弦霉断、甲片锈蚀，账上却年年写着修缮完足。", options: [
    { label: "尽换朽械并追责", detail: "花费不小，却不让士卒拿性命填账。", effects: { grain: -10, army: 10, integrity: 4 } },
    { label: "分批验修，追查采买", detail: "办得好能同时补军备、拔蛀虫。", chance: 60, tag: "吏治", successEffects: { grain: -3, army: 9, integrity: 9 }, failEffects: { grain: -9, army: -6, integrity: -5 } },
    { label: "降等发给地方守备", detail: "中央账面得以腾挪，地方接过风险。", effects: { army: 3, grain: 6, integrity: -5 } },
  ]},
  { id: "veteran-settlement", title: "老卒归田", category: "军务", text: "一批久戍老卒期满归乡，有人田宅已失，有人携家眷愿留在边地。如何安置会决定后来者是否愿意从军。", options: [
    { label: "授田免税三年", detail: "让军功换成安稳生计。", effects: { grain: -8, population: 5, army: 6, sentiment: 6 } },
    { label: "编为边屯乡兵", detail: "组织得当可同时垦荒守边，失当则老卒再成流民。", chance: 58, tag: "军事", successEffects: { population: 5, grain: 8, army: 8 }, failEffects: { population: -3, sentiment: -7, army: -4 } },
    { label: "发给一次性赏钱", detail: "手续简单，也把后续生计交还个人。", effects: { grain: -10, sentiment: 10, integrity: 4 } },
  ]},
  { id: "local-schools", title: "郡学取士", category: "文教", text: "边郡请求设学官、荐寒门入仕，旧族认为乡里名望本就足以判断人才，不必另开门径。", options: [
    { label: "广设郡学，公开考课", detail: "培养新人需要时间，也能让仕途不再只看门第。", effects: { grain: -7, sentiment: 6, integrity: 8 } },
    { label: "令州郡岁举贤良", detail: "荐举得人可迅速补官，徇私则只是换一批门生。", chance: 62, tag: "吏治", successEffects: { integrity: 10, sentiment: 5 }, failEffects: { integrity: -8, sentiment: -4 } },
    { label: "纳粟入仕", detail: "立刻得到钱粮，却把官位标上了价码。", effects: { grain: 12, integrity: -12, sentiment: -6 } },
  ]},
  { id: "calendar", title: "历法差日", category: "文教", text: "太史发现现行历法与节气渐差，农书播种日期开始失准。改历会牵动祭祀、赋役与全国文书。", options: [
    { label: "召集术士重定新历", detail: "测算准确可利农事，仓促颁行则天下日期大乱。", chance: 66, tag: "谋略", successEffects: { grain: 8, sentiment: 5, integrity: 4 }, failEffects: { grain: -6, sentiment: -5, integrity: -4 } },
    { label: "保留旧历，校正节气注", detail: "不动制度根本，先给农事一套实用修正。", effects: { grain: 3, integrity: 4 } },
    { label: "新旧历并行三年", detail: "给地方适应时间，也免不了文书混用。", effects: { grain: -4, sentiment: 5, integrity: -3 } },
  ]},
  { id: "court-factions", title: "廷议成党", category: "朝堂", text: "两派大臣围绕边战与休养争论数月，奏疏开始不论事情，只论是谁提出。", options: [
    { label: "御前公开辩论国策", detail: "主持得当可回到事情本身，失控便是当殿攻讦。", chance: 60, tag: "谋略", successEffects: { integrity: 10, sentiment: 5, army: 3 }, failEffects: { integrity: -9, sentiment: -4 } },
    { label: "轮调两派骨干出京", detail: "拆散人事纽带，也让地方得到能臣。", effects: { grain: -3, integrity: 7, sentiment: 3 } },
    { label: "定一派为朋党严惩", detail: "迅速统一朝声，留下的却未必是真心。", effects: { army: 3, integrity: 5, sentiment: -8 } },
  ]},
  { id: "imperial-inlaw", title: "外戚请封", category: "朝堂", text: "后族以旧功请封侯增邑，朝臣担心一开此门，宫中亲缘便会越过官制。", options: [
    { label: "厚赐财物，不授实职", detail: "顾全情面，也划清权力边界。", effects: { integrity: 9, sentiment: 3, grain: -3 } },
    { label: "照功封爵，授以闲职", detail: "满足后族体面，地方与朝堂都会观察先例。", effects: { grain: 5, sentiment: 5, integrity: -9 } },
    { label: "遣往边郡立功再议", detail: "把请封变成考验，边军也多一名贵戚监军。", effects: { army: 6, integrity: 4, sentiment: -4 } },
  ]},
  { id: "censor-memorial", title: "御史弹章", category: "吏治", text: "年轻御史越级弹劾中枢重臣，证据只有几封私信，却牵出不少说不清的财货往来。", options: [
    { label: "保护御史，公开查案", detail: "查实可振纲纪，查空则朝堂人人自危。", chance: 57, tag: "吏治", successEffects: { grain: 8, integrity: 13, sentiment: 4 }, failEffects: { integrity: -7, sentiment: -5 } },
    { label: "封存案卷，秘密核查", detail: "减少政治震荡，但查案更依赖少数亲信。", effects: { grain: -4, integrity: 8, sentiment: 2 } },
    { label: "以越级言事罢御史", detail: "重臣得安，敢言者也看懂了边界。", effects: { grain: 6, integrity: -10 } },
  ]},
  { id: "prison-review", title: "大狱待决", category: "吏治", text: "秋决将至，刑曹发现数百份供状字句雷同，疑有刑讯逼供；地方却催促尽快结案以安治安。", options: [
    { label: "遣使逐案复核", detail: "复核得力可平反冤狱，拖延失控则牢狱先乱。", chance: 61, tag: "吏治", successEffects: { integrity: 12, sentiment: 8 }, failEffects: { grain: -5, integrity: -6, sentiment: -5 } },
    { label: "赦轻罪，重案再审", detail: "先释放牵连者，把有限人力留给重案。", effects: { grain: -5, sentiment: 11, integrity: -3 } },
    { label: "依原判发往边地服役", detail: "迅速清空牢狱并补充劳力，冤屈也被一并送走。", effects: { army: 5, grain: 7, sentiment: -10, integrity: -6 } },
  ]},
  { id: "epidemic", title: "时疫入城", category: "灾异", text: "城中接连有人高热倒下，医者尚未辨清病因，坊门外已出现逃难人群与趁乱涨价的药商。", options: [
    { label: "分坊隔离，设病舍救治", detail: "执行有序能截断疫病，恐慌失控则病人与粮道一同被困。", chance: 59, tag: "民生", successEffects: { grain: -6, population: 4, sentiment: 8 }, failEffects: { grain: -6, population: -8, sentiment: -7 } },
    { label: "官购药材，沿街施药", detail: "直接救治病患，也要承担药价与真假药材的风险。", effects: { grain: -10, population: 6, sentiment: 6 } },
    { label: "封闭城门，禁止人员往来", detail: "以严禁控制外传，城内生计与人心随之承压。", effects: { grain: 5, army: 3, population: -5, sentiment: -10 } },
  ]},
  { id: "early-frost", title: "早霜杀禾", category: "灾异", text: "秋收前突降重霜，北地晚禾大半枯死。受灾州县求调种粮，南方粮商则开始囤积居奇。", options: [
    { label: "跨郡调种，补种耐寒作物", detail: "赶上最后农时，至少为来年保住种子。", effects: { grain: -8, population: 2, sentiment: 9 } },
    { label: "缓征田租，平抑粮价", detail: "不直接替农户耕种，但让他们撑过歉收。", effects: { grain: -5, sentiment: 8, integrity: 4 } },
    { label: "优先保全京仓军储", detail: "中央仓储无虞，受灾地方只能自行消化损失。", effects: { grain: 7, army: 2, sentiment: -9 } },
  ]},
  { id: "ancient-cauldron", title: "古鼎出土", category: "祥瑞", text: "河工掘出一尊古鼎，铭文残缺难辨。地方官已上表称是受命之瑞，学官却怀疑只是前代祭器。", options: [
    { label: "召学者辨铭定年", detail: "考证清楚可增益文教，误判则让朝廷自失颜面。", chance: 64, tag: "谋略", successEffects: { integrity: 8, sentiment: 5 }, failEffects: { grain: -5, integrity: -4 } },
    { label: "归还当地，建亭保护", detail: "不争天命之说，让出土地的百姓得到体面。", effects: { grain: 2, sentiment: 9, integrity: 4 } },
    { label: "迎入太庙，宣示受命", detail: "盛典足以振奋人心，疑古者也会质问其真伪。", effects: { grain: -8, sentiment: 12, army: 3, integrity: -3 } },
  ]},
  { id: "maritime-trade", title: "海舶来市", category: "财政", text: "远海商舶携香料、珠玉与良种靠岸，请求常设市舶之所。地方豪强已抢先包揽翻译与仓栈。", options: [
    { label: "设市舶官统一抽分", detail: "管理得当可开辟财源，官商勾结则只多一处肥缺。", chance: 58, tag: "财政", successEffects: { grain: 16, population: 3, integrity: 4 }, failEffects: { grain: -6, integrity: -7, sentiment: -4 } },
    { label: "发给牌照，准民间互市", detail: "用较轻的约束换取港市繁荣。", effects: { grain: 10, sentiment: 6, integrity: -2 } },
    { label: "限制靠岸，严查海防", detail: "减少走私与探查风险，也放弃大半贸易收益。", effects: { army: 4, grain: 3, sentiment: -5 } },
  ]},
  { id: "postal-relay", title: "驿传告急", category: "吏治", text: "边报与官文日益繁多，驿马倒毙、驿卒逃亡，私人使者却常持权贵符节抢先换马。", options: [
    { label: "增设驿站，补足马匹", detail: "以持续投入恢复政令与军报速度。", effects: { grain: -9, army: 5, integrity: 6 } },
    { label: "核验符节，雇民马递送", detail: "整顿得当可省下官养驿马，执行失序则文书积压。", chance: 61, tag: "吏治", successEffects: { grain: 7, integrity: 8, army: 3 }, failEffects: { grain: -6, integrity: -5, army: -3 } },
    { label: "限制非紧急公文用驿", detail: "让驿传先喘口气，也会拖慢一般政务。", effects: { grain: 6, integrity: 4, sentiment: -4 } },
  ]},
  { id: "city-fire", title: "城坊大火", category: "灾异", text: "闹市油坊失火，风助火势连烧数坊。救火水道被摊贩占住，官差正考虑拆屋开出隔火带。", options: [
    { label: "调军民救火，赈济灾户", detail: "保人救火并重，需要大量物资与组织。", effects: { grain: -10, population: 3, sentiment: 8 } },
    { label: "拆屋开隔火带", detail: "判断准确可迅速断火，迟疑或误拆都会放大损失。", chance: 57, tag: "民生", successEffects: { grain: -5, population: 2, sentiment: 6 }, failEffects: { grain: -9, population: -6, sentiment: -7 } },
    { label: "封锁街巷，严禁夜市", detail: "治安易于控制，城市生计与怨气同时受损。", effects: { army: 4, grain: 2, sentiment: -8, integrity: -3 } },
  ]},
  { id: "forest-commons", title: "山林开禁", category: "民生", text: "官山木材繁盛，附近百姓请求入山采薪、狩猎；工部与驻军都称这些木料已有用途。", options: [
    { label: "划出民用山场", detail: "让百姓取得薪材与生计，同时承受盗伐风险。", effects: { grain: 8, population: 3, sentiment: 5, integrity: -3 } },
    { label: "封山育林，留作军需", detail: "保护长远木源，也断绝附近村落的日常取用。", effects: { army: 5, integrity: 7, grain: -4 } },
    { label: "发引限额采伐", detail: "以许可换取收入，监管不严便会超采。", effects: { grain: 11, integrity: 2, sentiment: -4 } },
  ]},
  { id: "irrigation-dispute", title: "争渠夺水", category: "民生", text: "上游豪庄截水灌田，下游数村渠底见泥。春耕将近，军屯又持公文要求优先供水。", options: [
    { label: "丈量田亩，按时分水", detail: "裁定公允可让各方服从，执行偏私便会引发争斗。", chance: 60, tag: "吏治", successEffects: { grain: 10, sentiment: 7, integrity: 6 }, failEffects: { grain: -7, sentiment: -7, integrity: -5 } },
    { label: "赎买上游水权补给下村", detail: "用国库换取下游生计，不直接触动豪庄田产。", effects: { grain: -8, population: 4, sentiment: 8 } },
    { label: "军屯优先，余水归民", detail: "确保军粮，普通农户只能分担缺水。", effects: { grain: 7, army: 6, sentiment: -9, integrity: -4 } },
  ]},
  { id: "tax-arrears", title: "积欠逋赋", category: "财政", text: "数县连续欠税，账上既有灾年贫户，也混着借机拖欠的大户。催征吏请求一律限期缴清。", options: [
    { label: "灾户蠲免，大户追征", detail: "区分对象最合情理，也最考验基层账册。", chance: 59, tag: "财政", successEffects: { grain: 8, sentiment: 7, integrity: 6 }, failEffects: { grain: -6, integrity: -5, sentiment: -4 } },
    { label: "普遍缓征，分年偿还", detail: "减少眼前收入，给县乡恢复生计的时间。", effects: { grain: -8, population: 4, sentiment: 11 } },
    { label: "查封欠户田宅抵税", detail: "国库很快见粮，许多田产也会流向有力者。", effects: { grain: 12, army: 3, sentiment: -12, integrity: -6 } },
  ]},
  { id: "border-hostage", title: "质子入朝", category: "边患", text: "邻国愿送王子入朝为质，换取停战与边市。有人称这是诚意，也有人担心质子只是来结交朝臣。", options: [
    { label: "厚待质子，缔结盟约", detail: "识其真意可稳住边境，误判则让对方摸清朝局。", chance: 62, tag: "谋略", successEffects: { army: 8, grain: 4, integrity: 3 }, failEffects: { army: -7, sentiment: -6, integrity: -3 } },
    { label: "礼送归国，只开边市", detail: "不以人质维系和平，先让双方从贸易获利。", effects: { grain: 6, sentiment: 5, army: -2 } },
    { label: "留质子，暂停一切互市", detail: "握住谈判筹码，也令邻国与边商同时不满。", effects: { army: 7, grain: 3, integrity: -7, sentiment: -4 } },
  ]},
  { id: "shipbuilding", title: "水师造舰", category: "军务", text: "沿江将领请建大型战船，以控制水道。度支司提醒造舰木料、铁钉与熟练船匠都十分昂贵。", options: [
    { label: "设船厂建造楼船", detail: "建立真正水师需要长期投入，也会征用沿岸人力。", effects: { grain: -13, army: 12, population: -2 } },
    { label: "征租商船，改装战具", detail: "调度得当可迅速成军，强征失控则商路与舰队一起受损。", chance: 56, tag: "军事", successEffects: { army: 9, grain: 3 }, failEffects: { army: -8, grain: -7, sentiment: -5 } },
    { label: "先建烽台与沿江堡寨", detail: "放弃争夺水面，以较低成本巩固岸防。", effects: { army: 6, grain: 5, sentiment: -3 } },
  ]},
  { id: "military-register", title: "军户冒籍", category: "军务", text: "核饷时发现军户名册中既有亡者领饷，也有壮丁假作老弱逃役，背后似有将吏相互遮掩。", options: [
    { label: "逐营点验，重造军籍", detail: "查清可追回空饷并补实兵额，操切则军中先乱。", chance: 58, tag: "吏治", successEffects: { grain: 9, army: 8, integrity: 8 }, failEffects: { grain: -5, army: -5, integrity: -4 } },
    { label: "赦旧冒籍，限期自首归册", detail: "不追旧罪换取人口回流，兵额恢复较慢。", effects: { population: 5, sentiment: 8, army: -3 } },
    { label: "维持旧册，削减来年军饷", detail: "账面兵额不动，国库先收回一部分支出。", effects: { grain: 7, army: 4, integrity: -7 } },
  ]},
];

const additionalHistoricalEvents: EventTemplate[] = [
  { id: "qin-accession", scriptId: "qin", year: -246, historical: true, title: "少主临朝", category: "历史大事", text: "相邦吕不韦总揽朝政，宗室、军功贵族与太后宫中各有盘算。", options: [
    { label: "尊吕不韦为仲父", detail: "借成熟相邦稳定国政，也容许相权继续坐大。", effects: { grain: 8, integrity: -5, sentiment: 5 } },
    { label: "亲近军功旧臣，徐收王权", detail: "谋划得当可提前建立自己的班底，失败则朝堂离心。", chance: 55, tag: "谋略", successEffects: { integrity: 9, army: 6 }, failEffects: { integrity: -8, sentiment: -4 }, setHistoryFlags: ["qin_court_independent"] },
  ]},
  { id: "qin-juan-battle", scriptId: "qin", year: -245, historical: true, title: "卷城鏖兵", category: "历史大事", text: "麃公率秦军攻魏地卷城，前军已逼近城下。军中主张趁锐强攻，客卿则称可围城断援。", options: [
    { label: "乘锐攻城", detail: "秦军若一鼓破城可震慑河内，受挫则伤亡难掩。", chance: 56, tag: "军事", successEffects: { army: 8, grain: -5, sentiment: 4 }, failEffects: { army: -12, grain: -8, population: -2 } },
    { label: "围城断援，迫其请降", detail: "以谋略减少强攻伤亡，也可能拖长粮道。", chance: 62, tag: "谋略", successEffects: { grain: 5, population: 4, integrity: 2 }, failEffects: { grain: -10, army: -5, sentiment: -3 } },
  ]},
  { id: "qin-mengao-han", scriptId: "qin", year: -244, historical: true, title: "蒙骜攻韩", category: "历史大事", text: "蒙骜东攻韩国，韩军连失城邑。秦廷可继续压取十三城，也可用兵锋换取割地与岁贡。", options: [
    { label: "乘胜连取韩城", detail: "扩张疆土会消耗兵粮，若受阻则前功尽弃。", chance: 58, tag: "军事", successEffects: { army: -4, grain: -5, population: 7, sentiment: 4 }, failEffects: { army: -12, grain: -10, sentiment: -5 } },
    { label: "受地罢兵，索取岁贡", detail: "不求尽取十三城，先把胜势换成现成国用。", effects: { grain: 7, army: 2, integrity: -5 } },
  ]},
  { id: "qin-east-commandery", scriptId: "qin", year: -242, historical: true, title: "东郡初置", category: "历史大事", text: "蒙骜攻魏，连下酸枣、雍丘、山阳等二十城。新地横亘秦魏之间，如何治理会决定它是屏障还是泥潭。", options: [
    { label: "置东郡，派秦吏直辖", detail: "把新地纳入秦制，短期需要大量官吏与驻军。", effects: { grain: -6, army: 5, integrity: 8, sentiment: -3 } },
    { label: "留降吏自治，按岁输贡", detail: "迅速得到赋粮，也让魏地旧势力继续扎根。", effects: { grain: 8, sentiment: 4, integrity: -7 } },
  ]},
  { id: "qin-five-state-coalition", scriptId: "qin", year: -241, historical: true, title: "五国攻秦", category: "历史大事", text: "韩、魏、赵、卫、楚再度合纵，联军取寿陵后向秦境逼近。咸阳需要决定以兵锋击破联军，还是先拆散诸侯。", options: [
    { label: "集结主力迎击联军", detail: "军力足可一战摧毁合纵，失利则边郡震动。", chance: 54, tag: "军事", successEffects: { army: 9, grain: -8, sentiment: 6 }, failEffects: { army: -15, grain: -12, population: -3, sentiment: -7 } },
    { label: "重金离间韩魏与楚赵", detail: "合纵本就各怀盘算，但游说诸侯也可能徒费国帑。", chance: 63, tag: "谋略", successEffects: { grain: -5, army: 6, integrity: 3 }, failEffects: { grain: -13, integrity: -5 } },
  ]},
  { id: "qin-comet-mengao", scriptId: "qin", year: -240, historical: true, title: "彗星再见", category: "历史大事", text: "彗星先后见于东西，蒙骜仍拔龙、孤、庆都，旋师攻汲。老将年迈，朝中有人请继续进取，也有人借天象劝止兵。", options: [
    { label: "命蒙骜尽取汲地", detail: "抓住魏军未稳的时机，也是在透支老将与士卒。", chance: 57, tag: "军事", successEffects: { army: 8, grain: -6, population: 4 }, failEffects: { army: -10, grain: -8, sentiment: -4 } },
    { label: "班师休整，厚待老将", detail: "不以天象决军政，却给连续出征的秦军喘息。", effects: { grain: 6, army: 3, sentiment: 3 } },
  ]},
  { id: "qin-chengjiao", scriptId: "qin", year: -239, historical: true, title: "屯留兵变", category: "历史大事", text: "王弟长安君成蟜奉命攻赵，屯留军中忽报兵变，成蟜死于军中。叛卒、军吏与当地百姓都等待咸阳的处断。", options: [
    { label: "急调近军平乱，只究首恶", detail: "控制局势后再辨罪责，可少伤无辜，也考验军令与查案。", chance: 58, tag: "吏治", successEffects: { army: -4, integrity: 8, sentiment: 5 }, failEffects: { army: -12, population: -3, integrity: -6, sentiment: -7 } },
    { label: "尽诛军吏，迁屯留民于临洮", detail: "以严酷处断震慑军中，代价由屯留民户一并承担。", effects: { army: 5, grain: 4, population: -3, integrity: -8, sentiment: -10 } },
  ]},
  { id: "qin-lao-ai-entry", scriptId: "qin", year: -241, historical: true, requiresHistoryFlags: ["qin_court_independent"], title: "宫中索人", category: "历史大事", text: "咸阳忽然传起一名奇人的荒诞声名，吕不韦府中有人称嫪毐善于伺候宫闱。太后宫中随即派人来索此人。", options: [
    { label: "按宦者籍送入宫中", detail: "顺从太后宫中的意思，朝堂可暂时少一场冲突。", effects: { grain: 5, integrity: -8, sentiment: -2 }, setHistoryFlags: ["qin_lao_ai_admitted"] },
    { label: "查其来历，拒绝入宫", detail: "以宫禁规制驳回请求，也要承受太后宫中的不满。", effects: { integrity: 9, sentiment: 3, grain: -3 }, setHistoryFlags: ["qin_lao_ai_prevented"] },
  ]},
  { id: "qin-lao-ai", scriptId: "qin", year: -238, historical: true, excludesHistoryFlags: ["qin_lao_ai_prevented"], punitive: true, title: "蕲年宫变", category: "历史大事", text: "嬴政行冠礼亲政，嫪毐却盗用王印、调兵作乱。叛军已指向蕲年宫，太后与相邦也被卷入其中。", options: [
    { label: "调秦军平定嫪毐", detail: "即使叛军被正面击溃，宫门流血与朝堂震荡也已无法挽回。", requirements: { army: 82, integrity: 5 }, failOnUnmet: true, effects: { army: -13, population: -2, sentiment: -5, integrity: -4 } },
    { label: "分化叛党，生擒首恶", detail: "谋臣只能设法缩小灾祸，不能让这场宫变没有代价。", chance: 58, tag: "谋略", successEffects: { grain: -7, army: -4, integrity: -3, sentiment: -2 }, failEffects: { army: -17, population: -4, integrity: -12, sentiment: -9 } },
  ]},
  { id: "qin-expel-guests", scriptId: "qin", year: -237, historical: true, title: "逐客风波", category: "历史大事", text: "郑国渠间谍案发，秦国宗室请尽逐六国客卿。李斯上书称逐客正是替诸侯削弱秦国。", options: [
    { label: "收回逐客令", detail: "不问出身继续延揽天下人才。", effects: { integrity: 11, grain: -3, army: 5, sentiment: 4 } },
    { label: "尽逐六国客卿", detail: "朝堂一时纯粹，人才与谋略也随之流向敌国。", effects: { grain: 5, integrity: -12, army: -5 } },
  ]},
  { id: "qin-conquer-han", scriptId: "qin", year: -230, historical: true, qinConquestStage: 0, title: "韩国先亡", category: "历史大事", text: "韩地扼守秦军东出之路，却已国小兵弱。内史腾请率军渡黄河，一举打开灭国战争。", options: [
    { label: "命内史腾灭韩", detail: "兵粮达到要求，韩国将成为六国中第一个灭亡者。", requirements: { army: 130, grain: 100 }, failOnUnmet: true, effects: { army: -8, grain: -9, population: 6, sentiment: 4 }, qinConquest: "advance" },
    { label: "迫韩献地称臣", detail: "若能迫韩持续输地纳贡，下次灭韩所需的各项国势会降低15点。", chance: 58, tag: "谋略", successEffects: { grain: 6, army: -4, integrity: -4 }, failEffects: { grain: -8, army: -8, integrity: -6 }, qinConquest: "delay" },
  ]},
  { id: "qin-conquer-zhao", scriptId: "qin", year: -228, historical: true, qinConquestStage: 1, title: "邯郸陷落", category: "历史大事", text: "赵国饥荒地震并至，李牧却仍守住正面。秦廷可以继续强攻，也可以从赵王身边寻找裂缝。", options: [
    { label: "王翦围邯郸灭赵", detail: "强军能够硬撼赵军，代价也不会轻。", requirements: { army: 145, grain: 112 }, failOnUnmet: true, effects: { army: -13, grain: -12, population: 8, sentiment: -3 }, qinConquest: "advance" },
    { label: "贿郭开，暂缓攻城", detail: "若反间计得手，赵军根基松动，下次灭赵所需的各项国势会降低15点。", chance: 55, tag: "谋略", successEffects: { grain: -8, army: 3, integrity: -6 }, failEffects: { grain: -14, army: -8, integrity: -8 }, qinConquest: "delay" },
  ]},
  { id: "qin-jing-ke", scriptId: "qin", year: -227, historical: true, title: "图穷匕见", category: "历史大事", text: "燕使荆轲献上督亢地图与樊於期首级。地图展开至尽头，一柄淬毒匕首突然露出。", options: [
    { label: "绕柱自卫，召侍医还击", detail: "宫廷宿卫与临机反应决定秦王能否活着走出大殿。", chance: 60, tag: "军事", successEffects: { army: 6, sentiment: 6, integrity: 3 }, failEffects: { army: -14, sentiment: -10, integrity: -5 } },
    { label: "先验图匣，再召燕使", detail: "吏治严密时，刺杀会在匕首出匣前败露。", chance: 62, tag: "吏治", successEffects: { integrity: 10, army: 4 }, failEffects: { sentiment: -8, integrity: -6 } },
  ]},
  { id: "qin-conquer-wei", scriptId: "qin", year: -225, historical: true, qinConquestStage: 2, title: "水灌大梁", category: "历史大事", text: "魏都大梁城坚池深，王贲请求引黄河、鸿沟水灌城。速胜与城中生民只能艰难权衡。", options: [
    { label: "决河灌城灭魏", detail: "迅速灭魏，却会毁坏人口与田土。", requirements: { army: 140, grain: 108 }, failOnUnmet: true, effects: { grain: -12, population: -7, army: -7, sentiment: -8 }, qinConquest: "advance" },
    { label: "围城纳贡，暂许魏祀", detail: "若围困迫使魏国割地输粮，下次灭魏所需的各项国势会降低15点。", chance: 57, tag: "谋略", successEffects: { grain: -9, army: -4, sentiment: 4 }, failEffects: { grain: -15, army: -8, sentiment: -5 }, qinConquest: "delay" },
  ]},
  { id: "qin-conquer-chu", scriptId: "qin", year: -223, historical: true, qinConquestStage: 3, title: "王翦灭楚", category: "历史大事", text: "楚地广阔，项燕仍有强军。老将王翦坚持非六十万不可，年轻将领李信则称二十万足矣。", options: [
    { label: "举六十万付王翦灭楚", detail: "倾国之兵需要极强武备和钱粮支撑。", requirements: { army: 165, grain: 135 }, failOnUnmet: true, rewardRequirements: { army: 190, grain: 160 }, alternateText: "王翦稳扎稳打，楚军主力完整瓦解，江淮比旧史更快归于安定。", effects: { army: -18, grain: -22, population: 12, sentiment: 7 }, qinConquest: "advance" },
    { label: "令李信试探楚境", detail: "若试探成功并消耗楚军，下次灭楚所需的各项国势会降低15点。", chance: 52, tag: "军事", successEffects: { army: -7, grain: -6, sentiment: 3 }, failEffects: { army: -24, grain: -14, sentiment: -7 }, qinConquest: "delay" },
  ]},
  { id: "qin-conquer-yan", scriptId: "qin", year: -222, historical: true, qinConquestStage: 4, title: "燕代俱平", category: "历史大事", text: "燕王逃往辽东，赵国残余又据代地称王。北方最后两处抵抗已失去彼此呼应。", options: [
    { label: "两路穷追，灭燕平代", detail: "持续作战仍需足够兵粮，胜后北方再无成建制敌军。", requirements: { army: 150, grain: 115 }, failOnUnmet: true, effects: { army: -11, grain: -12, population: 8, sentiment: 5 }, qinConquest: "advance" },
    { label: "许其纳土，保留旧君", detail: "若旧君交出城塞与军队，下次灭燕所需的各项国势会降低15点。", chance: 60, tag: "谋略", successEffects: { population: 5, sentiment: 8, integrity: -7, army: -3 }, failEffects: { population: -4, army: -8, integrity: -10, sentiment: -5 }, qinConquest: "delay" },
  ]},
  { id: "qin-unification", scriptId: "qin", year: -221, historical: true, qinConquestStage: 5, title: "六合初定", category: "历史大事", text: "五国皆亡，齐国孤悬东方。王贲请自燕南下直取临淄，齐王建则愿奉秦正朔、保留国祀。", options: [
    { label: "灭齐，天下尽行郡县", detail: "结束最后一个王国，以一套法度贯通天下。", requirements: { army: 148, grain: 112 }, failOnUnmet: true, effects: { grain: -8, army: -8, population: 7, integrity: 10, sentiment: -5 }, qinConquest: "advance" },
    { label: "许齐称臣，郡国并行", detail: "若齐廷交出关塞与军政，下次灭齐所需的各项国势会降低15点。", chance: 62, tag: "谋略", successEffects: { grain: -5, army: -3, integrity: -9, sentiment: 6 }, failEffects: { grain: -12, army: -8, integrity: -11, sentiment: -4 }, qinConquest: "delay" },
  ]},
  { id: "qin-fengshan", scriptId: "qin", year: -219, historical: true, title: "封禅泰山", category: "历史大事", text: "巡行至齐鲁，博士议封禅礼久而不决。皇帝可以借天地昭示一统，也可将民力留给新朝根本。", options: [
    { label: "登泰山封禅", detail: "盛典足以震动天下，沿途供亿也所费不赀。", effects: { grain: -12, sentiment: 9, integrity: -2 } },
    { label: "却礼务实", detail: "不以仪典争名，把钱粮用在驰道与农桑。", effects: { grain: 6, sentiment: 5, integrity: 6 } },
  ]},
  { id: "qin-xiongnu", scriptId: "qin", year: -215, historical: true, title: "北却匈奴", category: "历史大事", text: "燕赵故塞之外胡骑南下，蒙恬请率大军夺取河套。边疆能否北推，取决于兵锋与转运。", options: [
    { label: "命蒙恬北逐匈奴", detail: "武备不足时，漫长补给线足以拖垮帝国。", requirements: { army: 90, grain: 70 }, failOnUnmet: true, effects: { army: -12, grain: -14, sentiment: 5 } },
    { label: "守塞屯田", detail: "不求一战拓地，以军屯慢慢消化边患。", chance: 60, tag: "军事", successEffects: { army: 7, grain: 8 }, failEffects: { army: -9, grain: -6 } },
  ]},
  { id: "qin-books", scriptId: "qin", year: -213, historical: true, title: "咸阳议学", category: "历史大事", text: "博士以古非今，丞相请求禁绝私学。天下言论与帝国法度在咸阳殿上正面相撞。", options: [
    { label: "焚禁诸家之书", detail: "政令暂时归一，士人与民间记忆却不会一同消失。", effects: { grain: 3, integrity: -16, sentiment: -12 } },
    { label: "定官藏，容私学", detail: "让争论留在制度之内，考验朝廷驾驭异议的能力。", chance: 55, tag: "吏治", successEffects: { integrity: 11, sentiment: 8 }, failEffects: { integrity: -6, sentiment: -5 } },
  ]},
  { id: "qin-baiyue", scriptId: "qin", year: -214, historical: true, title: "凿渠征越", category: "历史大事", text: "岭南山川阻绝，首轮南征已因粮道断裂付出惨重代价。灵渠若成，大军可沿水路再入百越。", options: [
    { label: "凿灵渠，五路并进", detail: "钱粮与军势不足时，南方湿热和漫长补给会先击败秦军。", requirements: { grain: 100, army: 105 }, failOnUnmet: true, rewardRequirements: { grain: 130, army: 125 }, alternateText: "灵渠转运顺畅，各路秦军严守军纪，岭南以远低于旧史的伤亡纳入版图。", effects: { grain: -24, army: -16, population: 10, sentiment: -5 } },
    { label: "通商设吏，徐图岭南", detail: "不求一次征服，以贸易和移民逐步进入百越。", chance: 60, tag: "财政", successEffects: { grain: 12, population: 6, integrity: 5 }, failEffects: { grain: -10, army: -6, sentiment: -4 } },
  ]},

  { id: "liubang-uprising", scriptId: "liubang", year: -209, historical: true, title: "沛县举义", category: "历史大事", text: "陈胜吴广已揭竿而起，沛县父老推举刘邦主持城中。秦吏与豪杰都在等待第一面旗帜。", options: [
    { label: "开仓聚众，自称沛公", detail: "民心可聚兵，也可能因组织不及而迅速溃散。", chance: 60, tag: "民生", successEffects: { army: 10, sentiment: 12, grain: -5 }, failEffects: { population: -5, army: -8, sentiment: -6 } },
    { label: "据守沛县，静观天下", detail: "先保存根本，却会把先机让给别路义军。", effects: { grain: 5, army: 4, sentiment: -2 } },
  ]},
  { id: "liubang-guanzhong", scriptId: "liubang", year: -207, historical: true, title: "约法入关", category: "历史大事", text: "秦王已降，关中府库与百姓尽在眼前。是以宽法收心，还是先取财货犒军？", options: [
    { label: "约法三章，封存府库", detail: "用克制换取关中人心。", effects: { grain: -5, sentiment: 16, integrity: 10 } },
    { label: "尽取府库以赏三军", detail: "军粮立刻充足，也会让百姓把新军视作另一支暴秦。", effects: { grain: 12, army: 7, sentiment: -13, integrity: -8 }, setHistoryFlags: ["liubang_looted_guanzhong"] },
  ]},
  { id: "liubang-qin-support", scriptId: "liubang", year: -206, historical: true, excludesHistoryFlags: ["liubang_looted_guanzhong"], title: "关中父老", category: "历史大事", text: "约法入关之后，关中父老送来楚军营垒与道路消息。赴鸿门之前，这份民间相助也可能成为一条生路。", options: [
    { label: "受其向导，轻车赴宴", detail: "借熟悉山川的父老避开楚军耳目。", effects: { army: 4, sentiment: 7, grain: -3 } },
    { label: "谢绝私助，严守军令", detail: "不让百姓卷入楚汉军争。", effects: { integrity: 7, sentiment: 4 } },
  ]},
  { id: "liubang-qin-resistance", scriptId: "liubang", year: -206, historical: true, requiresHistoryFlags: ["liubang_looted_guanzhong"], punitive: true, title: "关中闭户", category: "历史大事", text: "军士取尽府库后，秦吏与父老闭门相拒。项羽的细作也在关中四处收集怨言，准备送往鸿门。", options: [
    { label: "退还所取，安抚关中", detail: "财货已经分入军中，追回退还只能挽回一部分人心。", effects: { grain: -14, army: -3, sentiment: -2 } },
    { label: "搜捕告变者", detail: "强行压住消息，会让军民裂痕变得更深。", effects: { population: -3, army: -4, sentiment: -12, integrity: -10 } },
  ]},
  { id: "liubang-gaixia", scriptId: "liubang", year: -202, historical: true, title: "垓下决楚", category: "历史大事", text: "鸿沟和议已破，项羽退至垓下。韩信请统诸军合围，这是结束乱世的一战。", options: [
    { label: "合诸侯兵围垓下", detail: "武备不济，诸侯便不会为汉军押上全部。", requirements: { army: 85, grain: 65 }, failOnUnmet: true, rewardRequirements: { army: 115, grain: 90 }, alternateText: "楚军在垓下彻底瓦解，诸侯无一敢再反复，统一比旧史更加稳固。", effects: { army: -18, grain: -12, sentiment: 13 } },
    { label: "守鸿沟之约", detail: "天下暂分楚汉，兵火稍息，统一却遥遥无期。", effects: { army: 3, grain: 5, sentiment: -4, integrity: -5 } },
  ]},
  { id: "liubang-baideng", scriptId: "liubang", year: -200, historical: true, title: "白登重围", category: "历史大事", text: "轻进追击的汉军被匈奴围在白登山，风雪与断粮比敌骑更先逼近。", options: [
    { label: "固守待奇计解围", detail: "谋臣若能看透敌营，尚有一线生门。", chance: 55, tag: "谋略", successEffects: { army: 5, sentiment: 6, grain: -8 }, failEffects: { army: -18, grain: -12, sentiment: -8 } },
    { label: "纳币和亲", detail: "以财货换全军生还，也留下北境长期代价。", requirements: { grain: 65 }, failOnUnmet: true, effects: { grain: -18, army: -4, sentiment: -5 } },
  ]},

  { id: "hanwu-mayi", scriptId: "hanwu", year: -133, historical: true, title: "马邑设伏", category: "历史大事", text: "边商愿诱单于深入马邑，三十万汉军已伏于山谷。若胡骑识破，和亲以来的平衡将就此终结。", options: [
    { label: "依计伏击单于", detail: "诱敌之计只差一步，也可能把国策推入长期战争。", chance: 50, tag: "谋略", successEffects: { army: 15, grain: 8, sentiment: 5 }, failEffects: { army: -15, grain: -12, integrity: -4 } },
    { label: "罢谋，增修边塞", detail: "避免仓促决战，以较慢速度转向主动防御。", effects: { army: 5, grain: -6, integrity: 4 }, setHistoryFlags: ["hanwu_defensive_border"] },
  ]},
  { id: "hanwu-longcheng", scriptId: "hanwu", year: -129, historical: true, excludesHistoryFlags: ["hanwu_defensive_border"], title: "龙城初捷", category: "历史大事", text: "马邑之后和亲已绝，汉廷首次同时遣四路骑军出塞。卫青直捣龙城，其余三路吉凶难料。", options: [
    { label: "四路齐出，寻歼匈奴", detail: "大规模主动出击将检验汉军骑战能力。", chance: 55, tag: "军事", successEffects: { army: 13, sentiment: 8, grain: 5 }, failEffects: { army: -16, grain: -12, sentiment: -5 } },
    { label: "集中精骑付卫青", detail: "减少分兵风险，把胜负押在一位新将身上。", chance: 62, tag: "谋略", successEffects: { army: 9, integrity: 4 }, failEffects: { army: -9, grain: -7 } },
  ]},
  { id: "hanwu-border-council", scriptId: "hanwu", year: -129, historical: true, requiresHistoryFlags: ["hanwu_defensive_border"], title: "边塞再议", category: "历史大事", text: "马邑设伏被罢后，匈奴使者再来请和，边将却报告塞外骑兵试探日繁。数年修塞给了朝廷第二次选择。", options: [
    { label: "重续和亲，开放关市", detail: "以贸易与婚盟换取边境喘息。", effects: { grain: 9, sentiment: 7, army: -4 } },
    { label: "依托边塞，小股出击", detail: "不发动倾国大战，先训练汉军主动出塞。", chance: 58, tag: "军事", successEffects: { army: 10, grain: 5, sentiment: 3 }, failEffects: { army: -9, grain: -7 } },
  ]},
  { id: "hanwu-ordos", scriptId: "hanwu", year: -127, historical: true, title: "河南之战", category: "历史大事", text: "匈奴再寇上谷，卫青请求由云中迂回河套，夺取河南地并切断白羊、楼烦诸王退路。", options: [
    { label: "命卫青迂回河套", detail: "兵粮充足才能把长途奔袭变成永久疆土。", requirements: { army: 90, grain: 78 }, failOnUnmet: true, effects: { army: -11, grain: -14, population: 6, sentiment: 7 } },
    { label: "筑朔方城，先固边地", detail: "以财政与屯田稳步推进，短期战果较小。", chance: 60, tag: "财政", successEffects: { grain: -7, army: 8, population: 4 }, failEffects: { grain: -15, army: -5 } },
  ]},
  { id: "hanwu-enfeoffment", scriptId: "hanwu", year: -127, historical: true, title: "推恩削藩", category: "历史大事", text: "诸侯王国尾大不掉，主父偃献策令诸王分封子弟。无需动兵，也能让封国日渐缩小。", options: [
    { label: "颁行推恩令", detail: "以礼制名义拆解诸侯权力。", effects: { integrity: 12, sentiment: 6, grain: -5 } },
    { label: "维持旧制，笼络诸王", detail: "眼前少生波澜，中央权力却继续外流。", effects: { grain: 8, sentiment: 3, integrity: -10 } },
  ]},
  { id: "hanwu-monam", scriptId: "hanwu", year: -124, historical: true, title: "漠南奔袭", category: "历史大事", text: "朔方城已立，卫青请求从高阙出塞，长途奔袭右贤王庭。大军必须在匈奴集结前完成合围。", options: [
    { label: "夜进六七百里合围王庭", detail: "名将与军势足够，奔袭才能快过敌军斥候。", chance: 60, tag: "军事", successEffects: { army: 16, grain: 8, sentiment: 9 }, failEffects: { army: -17, grain: -13 } },
    { label: "据朔方步步北推", detail: "放弃斩首式突袭，以城塞屯田压缩匈奴活动空间。", effects: { grain: -7, army: 8, population: 3, integrity: 3 } },
  ]},
  { id: "hanwu-hexi", scriptId: "hanwu", year: -121, historical: true, title: "河西两战", category: "历史大事", text: "十九岁的霍去病请率精骑深入河西，夺取祁连山与焉支山。此战将决定西域道路是否向汉朝打开。", options: [
    { label: "令霍去病两度远征河西", detail: "强军和粮秣必须支撑高速穿插与连续作战。", requirements: { army: 100, grain: 85 }, failOnUnmet: true, rewardRequirements: { army: 125, grain: 110 }, alternateText: "河西诸部迅速瓦解，汉军严整接收降众，通往西域的走廊以更小代价彻底打开。", effects: { army: -14, grain: -17, population: 8, sentiment: 9 } },
    { label: "招抚浑邪王，缓图河西", detail: "谋略若成可使匈奴内部分裂，失败则坐失战机。", chance: 58, tag: "谋略", successEffects: { population: 6, army: 8, integrity: 5 }, failEffects: { army: -10, grain: -8, sentiment: -4 } },
  ]},
  { id: "hanwu-dayuan", scriptId: "hanwu", year: -104, historical: true, title: "大宛汗血", category: "历史大事", text: "大宛拒献良马，又杀汉使。朝廷欲越万里沙漠征伐贰师城，以打通西域声威。", options: [
    { label: "再发大军征大宛", detail: "没有雄厚钱粮与军力，远征只会把士卒埋在沿途。", requirements: { grain: 100, army: 95 }, failOnUnmet: true, effects: { grain: -28, army: -14, population: 4, sentiment: 5 } },
    { label: "重开互市求马", detail: "财政与外交若能配合，可用较小代价获得良马。", chance: 60, tag: "财政", successEffects: { grain: -8, army: 11, integrity: 3 }, failEffects: { grain: -18, army: -4, sentiment: -5 } },
  ]},
  { id: "hanwu-witchcraft", scriptId: "hanwu", year: -91, historical: true, title: "巫蛊祸起", category: "历史大事", text: "宫中搜出木偶，诬告沿着酷吏与近臣一路指向太子。京师兵戈将起，父子之间只隔一道真伪未明的奏章。", options: [
    { label: "命酷吏穷治巫蛊", detail: "猜疑会让案件自行扩张，直到吞没储君与无数百姓。", effects: { population: -8, sentiment: -18, integrity: -16 } },
    { label: "封存诏狱，亲验奏章", detail: "朝纲清明、民心稳定时，或能让真相先于兵变抵达。", rewardRequirements: { integrity: 45, sentiment: 25 }, alternateText: "江充的构陷被提前揭破，太子没有兵败自尽，汉廷避开了最惨烈的内乱。", effects: { integrity: 12, sentiment: 15 } },
  ]},
  { id: "hanwu-luntai", scriptId: "hanwu", year: -89, historical: true, title: "轮台回望", category: "历史大事", text: "连年征伐之后，桑弘羊又请在轮台屯田。皇帝必须决定，是继续燃烧国力，还是承认百姓已经疲惫。", options: [
    { label: "下轮台诏，休养天下", detail: "承认过失比继续胜利更难。", effects: { sentiment: 20, integrity: 14, army: -6, grain: 5 } },
    { label: "准屯田，继续开边", detail: "边疆声势不坠，国内负担却还要延续。", effects: { army: 10, grain: -20, sentiment: -11 } },
  ]},

  { id: "caocao-xudu", scriptId: "caocao", year: 196, historical: true, title: "奉帝都许", category: "历史大事", text: "汉献帝辗转洛阳，衣食无着。迎天子至许县可取得名义，也会招来挟持皇帝的骂名。", options: [
    { label: "迎天子都许", detail: "以朝廷名义重建秩序。", effects: { grain: -8, integrity: 10, sentiment: 8, army: 4 } },
    { label: "奉诏而不迁都", detail: "少担宫廷供养，却失去号令诸侯的枢纽。", chance: 58, tag: "谋略", successEffects: { integrity: 6, grain: 5 }, failEffects: { integrity: -7, army: -5 }, setHistoryFlags: ["caocao_emperor_in_luoyang"] },
  ]},
  { id: "caocao-belt-edict", scriptId: "caocao", year: 199, historical: true, excludesHistoryFlags: ["caocao_emperor_in_luoyang"], title: "衣带密诏", category: "历史大事", text: "天子迁许数年后，一封密诏被缝进衣带。董承暗中联络朝臣与外镇，宫门内外忽然多了不能见光的往来。", options: [
    { label: "封宫查诏，止于首谋", detail: "尽快拆散密谋，也给天子保留最后的体面。", chance: 60, tag: "吏治", successEffects: { integrity: 8, army: 4, sentiment: 3 }, failEffects: { integrity: -9, sentiment: -7 } },
    { label: "借案清洗异己", detail: "让许都再无反对声音，代价是朝廷名义愈发空洞。", effects: { army: 7, integrity: -13, sentiment: -8 } },
  ]},
  { id: "caocao-luoyang-rescript", scriptId: "caocao", year: 199, historical: true, requiresHistoryFlags: ["caocao_emperor_in_luoyang"], punitive: true, title: "洛阳诏令", category: "历史大事", text: "天子仍居洛阳，韩暹、杨奉旧部与朝臣争相代拟诏书，袁绍的使者也已抵达宫门。谁能奉养朝廷，谁便可能取得号令诸侯的名义。", options: [
    { label: "输粮洛阳，维持奉诏", detail: "用钱粮勉强维持名义，却无法真正控制朝廷。", effects: { grain: -14, army: -2, sentiment: -2 } },
    { label: "抢在袁绍前迎驾", detail: "迟来的迁都即使成功，也要付出道路、军力与名分的代价。", chance: 52, tag: "谋略", successEffects: { grain: -8, army: -4, integrity: -3 }, failEffects: { grain: -12, integrity: -10, army: -8, sentiment: -5 } },
  ]},
  { id: "caocao-wuhuan", scriptId: "caocao", year: 207, historical: true, title: "白狼山北征", category: "历史大事", text: "袁氏余部投奔乌桓，郭嘉主张轻装越塞、出其不意。千里奔袭没有退路。", options: [
    { label: "轻兵疾出卢龙塞", detail: "武备不足，孤军深入便会全军覆没。", requirements: { army: 90, grain: 60 }, failOnUnmet: true, effects: { army: -13, grain: -11, sentiment: 8 } },
    { label: "招抚乌桓，离间袁氏", detail: "用谋略拆散敌军，失败则给对手整军时间。", chance: 58, tag: "谋略", successEffects: { army: 7, integrity: 5 }, failEffects: { army: -10, grain: -6 } },
  ]},
  { id: "caocao-redcliffs", scriptId: "caocao", year: 208, historical: true, title: "赤壁风火", category: "历史大事", text: "荆州新降，北军顺江而下。疫病、陌生水战与孙刘联军都在长江对岸等待。", options: [
    { label: "乘势东下，一战定江南", detail: "胜则天下将定，败则多年积累付之一炬。", chance: 50, tag: "军事", successEffects: { army: 18, grain: 14, population: 6, sentiment: 8 }, failEffects: { army: -25, grain: -16, population: -5 } },
    { label: "止军荆襄，整训水师", detail: "放弃速胜，先把新占土地变成真正根基。", effects: { army: 7, grain: 5, integrity: 3 } },
  ]},
  { id: "caocao-hanzhong", scriptId: "caocao", year: 219, historical: true, title: "汉中与樊城", category: "历史大事", text: "刘备已得汉中，关羽又围樊城、威震华夏。西南与荆襄同时告急，魏国必须选择力量投向。", options: [
    { label: "分兵救樊，稳住中原", detail: "同时维持两线需要强军和充足粮道。", requirements: { army: 100, grain: 75 }, failOnUnmet: true, effects: { army: -14, grain: -12, sentiment: 6 } },
    { label: "弃汉中险地，专守襄樊", detail: "承认一处得失，换取中原防线完整。", effects: { army: -5, grain: 8, integrity: 5, sentiment: -3 } },
  ]},

  { id: "liubei-longzhong", scriptId: "liubei", year: 207, historical: true, title: "隆中三顾", category: "历史大事", text: "新野寄人篱下，一位年轻隐士却在草庐中谈起荆益与天下三分。是否再一次亲往隆中？", options: [
    { label: "三顾草庐，请其出山", detail: "礼贤与谋略共同决定这次相遇能否改变天下。", chance: 65, tag: "谋略", successEffects: { integrity: 9, sentiment: 9, army: 4 }, failEffects: { grain: -3, sentiment: -2 }, failHistoryFlags: ["liubei_without_longzhong"] },
    { label: "留守新野，整训部曲", detail: "先求眼前自保，失去一次重画天下的机会。", effects: { army: 6, grain: 5 }, setHistoryFlags: ["liubei_without_longzhong"] },
  ]},
  { id: "liubei-redcliffs", scriptId: "liubei", year: 208, historical: true, excludesHistoryFlags: ["liubei_without_longzhong"], title: "联吴拒曹", category: "历史大事", text: "长坂败后兵不满万，曹军已至江陵。诸葛亮请赴江东说服孙权共同抗敌。", options: [
    { label: "遣使联吴，共拒曹军", detail: "联盟若成可转危为安，若败便无处立足。", chance: 55, tag: "谋略", successEffects: { army: 15, grain: 10, sentiment: 8 }, failEffects: { army: -20, grain: -12, sentiment: -6 } },
    { label: "避战西入益州", detail: "保存残部，却把荆州与盟友都留给曹军。", effects: { population: -4, grain: 6, army: -5, sentiment: -5 } },
  ]},
  { id: "liubei-xiakou-council", scriptId: "liubei", year: 208, historical: true, requiresHistoryFlags: ["liubei_without_longzhong"], title: "夏口问盟", category: "历史大事", text: "长坂败后兵不满万，曹军已至江陵。没有卧龙出使，鲁肃却奉孙权之命来到夏口，试探两家是否仍能共同拒曹。", options: [
    { label: "亲赴江东定盟", detail: "把身家性命带上谈判席，争取孙权信任。", chance: 50, tag: "谋略", successEffects: { army: 12, grain: 8, sentiment: 7 }, failEffects: { army: -17, grain: -10, sentiment: -5 } },
    { label: "依刘琦固守江夏", detail: "不把存亡寄托于盟友，独自承担曹军锋芒。", effects: { army: 5, grain: -6, population: -3, integrity: 4 } },
  ]},
  { id: "liubei-chengdu", scriptId: "liubei", year: 214, historical: true, title: "成都开门", category: "历史大事", text: "围攻数月后，刘璋准备出降。益州百姓与旧官僚都在观察新主如何进入成都。", options: [
    { label: "约束军士，受璋出降", detail: "克制掠夺，才能把夺来的土地变成根基。", chance: 60, tag: "吏治", successEffects: { population: 10, grain: 12, integrity: 6, sentiment: 8 }, failEffects: { army: -10, grain: -8, sentiment: -6 } },
    { label: "分赏府库与田宅", detail: "迅速酬劳功臣，也伤害益州旧民与法度。", effects: { grain: 14, army: 7, integrity: -9, sentiment: -8 } },
  ]},
  { id: "liubei-jingzhou", scriptId: "liubei", year: 219, historical: true, title: "荆州风急", category: "历史大事", text: "汉中方胜，关羽已从荆州北攻樊城。东吴索地不成，江陵后方却守备空虚。", options: [
    { label: "增援荆州，约束北攻", detail: "谋划得当可同时保住联盟与荆州。", chance: 55, tag: "谋略", successEffects: { army: 10, integrity: 6, sentiment: 5 }, failEffects: { army: -16, grain: -10, sentiment: -8 } },
    { label: "令关羽乘势北伐", detail: "武备达到极盛，或可在东吴动手前攻破襄樊。", requirements: { army: 105 }, failOnUnmet: true, rewardRequirements: { army: 130, integrity: 35 }, alternateText: "襄樊迅速陷落，东吴不敢背盟，荆州没有重演失守的旧史。", effects: { army: -15, grain: -12, sentiment: 7 } },
  ]},

  { id: "sunce-jiangdong", scriptId: "sunce", year: 195, historical: true, title: "横渡江东", category: "历史大事", text: "孙策以传国玉玺换得兵马，渡江直取牛渚、曲阿。江东豪族尚未决定归顺谁。", options: [
    { label: "疾取牛渚，席卷曲阿", detail: "锐气若受挫，借来的兵马很快就会散去。", chance: 60, tag: "军事", successEffects: { army: 13, population: 7, sentiment: 6 }, failEffects: { army: -13, grain: -8 } },
    { label: "先据丹阳，招纳豪杰", detail: "扩张较慢，却能把江东人心纳入麾下。", effects: { grain: 4, army: 5, integrity: 5 } },
  ]},
  { id: "sunce-yuanshu", scriptId: "sunce", year: 197, historical: true, title: "袁术僭号", category: "历史大事", text: "袁术在寿春称帝，传檄要求孙策继续奉命。依附旧主可得粮兵，决裂则能取得政治名分。", options: [
    { label: "绝书决裂，奉汉讨逆", detail: "舍弃旧援，换取江东政权的正当性。", effects: { grain: -6, integrity: 12, sentiment: 8 } },
    { label: "暂奉仲氏，以图后计", detail: "眼前兵粮充足，僭号污名也将一并承担。", effects: { grain: 13, army: 7, integrity: -18, sentiment: -8 }, setHistoryFlags: ["sunce_stayed_with_yuanshu"] },
  ]},
  { id: "sunce-lujiang", scriptId: "sunce", year: 199, historical: true, excludesHistoryFlags: ["sunce_stayed_with_yuanshu"], title: "席卷庐江", category: "历史大事", text: "庐江刘勋出兵在外，豫章诸郡也人心未定。孙策可以乘虚奔袭，或先消化六郡。", options: [
    { label: "奔袭皖城，兼取豫章", detail: "强军才能把速度变成疆土。", requirements: { army: 90, grain: 55 }, failOnUnmet: true, effects: { army: -10, grain: 10, population: 9, sentiment: 5 } },
    { label: "安抚六郡，暂缓西进", detail: "不争一时之地，先稳固江东官民。", effects: { sentiment: 10, integrity: 8, grain: -4 } },
  ]},
  { id: "sunce-yuanshu-remnants", scriptId: "sunce", year: 199, historical: true, requiresHistoryFlags: ["sunce_stayed_with_yuanshu"], punitive: true, title: "仲氏末路", category: "历史大事", text: "袁术败亡，残部携家眷、百工与最后的仪仗南来。刘勋也在半途争夺这支无主之众，寿春旧盟成了江东眼前的负担。", options: [
    { label: "接纳遗众，与袁氏割席", detail: "收留无主之众并洗去僭号烙印，只能尽量减少旧盟反噬。", chance: 56, tag: "民生", successEffects: { grain: -8, integrity: -3, sentiment: -2 }, failEffects: { grain: -15, population: -3, integrity: -9, sentiment: -7 } },
    { label: "奉袁氏后人继续号召", detail: "旧旗号已失去号召力，强行维持只会继续消耗江东。", effects: { grain: -6, army: -4, integrity: -15, sentiment: -10 } },
  ]},

  { id: "liuyu-jingkou", scriptId: "liuyu", year: 404, historical: true, title: "京口举义", category: "历史大事", text: "桓玄篡晋，京口北府旧部暗中响应。刘裕只有千余人，却必须在消息泄露前起兵。", options: [
    { label: "连夜举义，直趋建康", detail: "起兵贵在神速，失败便无退路。", chance: 60, tag: "军事", successEffects: { army: 14, sentiment: 11, integrity: 5 }, failEffects: { army: -15, population: -4 } },
    { label: "广结北府旧将再动", detail: "声势更稳，也可能错过桓玄立足未稳的窗口。", effects: { army: 7, grain: -6, integrity: 4 } },
  ]},
  { id: "liuyu-twofronts", scriptId: "liuyu", year: 410, historical: true, title: "广固与建康", category: "历史大事", text: "南燕都城广固将破，卢循却从岭南直逼建康。北伐成果与朝廷根本同时悬在一线。", options: [
    { label: "克广固后急师南返", detail: "军力与粮道必须支撑一次跨越南北的连续作战。", requirements: { army: 95, grain: 70 }, failOnUnmet: true, effects: { army: -14, grain: -15, population: 7, sentiment: 9 } },
    { label: "弃围广固，先救建康", detail: "保住根本，却让统一北方的窗口重新关闭。", chance: 60, tag: "谋略", successEffects: { army: 8, sentiment: 8 }, failEffects: { army: -12, sentiment: -10 }, setHistoryFlags: ["liuyu_abandoned_guanggu"] },
  ]},
  { id: "liuyu-found-song", scriptId: "liuyu", year: 420, historical: true, title: "晋宋禅代", category: "历史大事", text: "东晋皇权已只余名义，群臣劝刘裕受禅建宋。创业者终于站在帝位之前。", options: [
    { label: "受禅建宋", detail: "新朝由此建立，也要承受改朝换代的议论。", effects: { army: 5, sentiment: 5, integrity: -5 } },
    { label: "还政晋室，退居京口", detail: "朝纲与民心足够稳固时，或可开出一条没有禅代的新史。", rewardRequirements: { integrity: 50, sentiment: 40 }, alternateText: "刘裕还政而不受禅，东晋在强臣约束下续存，南朝历史由此转向。", effects: { integrity: 15, sentiment: 12, army: -5 } },
  ]},
  { id: "liuyu-reopen-north", scriptId: "liuyu", year: 417, historical: true, requiresHistoryFlags: ["liuyu_abandoned_guanggu"], title: "再议北伐", category: "历史大事", text: "当年为救建康撤去广固之围后，南燕得以喘息。七年过去，群臣再次争论是否越淮北进，青齐与关中都已不是旧日局面。", options: [
    { label: "先复青齐，再窥关中", detail: "重新补上北伐缺失的一环，需要更长的粮道。", requirements: { army: 92, grain: 82 }, failOnUnmet: true, effects: { army: -13, grain: -18, population: 7, sentiment: 9 } },
    { label: "经营淮南，等待北乱", detail: "不再孤注远征，以边镇积蓄下一代的机会。", effects: { grain: 7, army: 6, integrity: 5, sentiment: -3 } },
  ]},

  { id: "taizong-jinyang", scriptId: "taizong", year: 617, historical: true, title: "晋阳密谋", category: "历史大事", text: "隋失其鹿，李世民劝父亲在晋阳起兵。突厥、郡县与关中豪杰的态度都尚未明朗。", options: [
    { label: "劝父起兵，直取关中", detail: "谋划周全才能把地方军变成逐鹿之师。", chance: 60, tag: "谋略", successEffects: { army: 11, grain: 8, sentiment: 7 }, failEffects: { army: -7, integrity: -5 } },
    { label: "继续观望，积蓄晋阳", detail: "根基稍厚，却把长安先机让给他人。", effects: { grain: 6, army: 4, sentiment: -3 }, setHistoryFlags: ["taizong_delayed_jinyang"] },
  ]},
  { id: "taizong-hulao", scriptId: "taizong", year: 621, historical: true, excludesHistoryFlags: ["taizong_delayed_jinyang"], title: "虎牢一战", category: "历史大事", text: "王世充困守洛阳，窦建德率军来援。唐军若能在虎牢击破援军，天下大势将骤然倾斜。", options: [
    { label: "据险突击窦建德", detail: "精兵不足，少数骑兵的突击只会撞入重围。", requirements: { army: 90, grain: 60 }, failOnUnmet: true, effects: { army: -12, grain: -10, sentiment: 13 } },
    { label: "围洛阳，耗其粮道", detail: "财政调度若能维持围城，也可稳步取胜。", chance: 58, tag: "财政", successEffects: { grain: -5, army: 7 }, failEffects: { grain: -16, army: -8 } },
  ]},
  { id: "taizong-delayed-guanzhong", scriptId: "taizong", year: 621, historical: true, requiresHistoryFlags: ["taizong_delayed_jinyang"], title: "关中迟局", category: "历史大事", text: "晋阳起兵稍迟，长安与洛阳之间诸军并立。王世充与窦建德已经结援，唐军没有取得直抵虎牢的先机。", options: [
    { label: "先定关中，再图洛阳", detail: "承认先机已失，以稳固根本换取下一轮东进。", effects: { grain: 8, army: 7, sentiment: -3, integrity: 4 } },
    { label: "联窦制王，各个击破", detail: "在敌方盟约中寻找裂缝。", chance: 52, tag: "谋略", successEffects: { army: 12, grain: 7, integrity: 5 }, failEffects: { army: -13, grain: -10 } },
  ]},
  { id: "taizong-turks", scriptId: "taizong", year: 630, historical: true, title: "阴山擒颉利", category: "历史大事", text: "东突厥内乱，李靖请以轻骑雪夜深入阴山。渭水之盟的旧耻或可一战洗雪。", options: [
    { label: "命李靖夜袭阴山", detail: "名将与军势都将决定奔袭成败。", chance: 65, tag: "军事", successEffects: { army: 18, sentiment: 11, grain: 6 }, failEffects: { army: -15, grain: -10 } },
    { label: "纳降和亲，分化诸部", detail: "以较小代价解除边患，也留下复起可能。", effects: { grain: -8, sentiment: 7, integrity: 5, army: 3 } },
  ]},
  { id: "taizong-goguryeo", scriptId: "taizong", year: 645, historical: true, title: "辽东驻跸", category: "历史大事", text: "唐军已越辽河，高句丽山城坚守不下，冬季正在逼近。继续亲征或及时班师，都将定义这场战争。", options: [
    { label: "继续东征，直逼平壤", detail: "国力极盛时，或能改写亲征无功而返的旧史。", requirements: { army: 110, grain: 90 }, failOnUnmet: true, rewardRequirements: { army: 140, grain: 130 }, alternateText: "粮道与攻城军齐备，平壤在入冬前请降，辽东之役没有成为未竟之功。", effects: { army: -18, grain: -25, sentiment: 6 } },
    { label: "见好即收，班师休兵", detail: "保存将士与粮秣，把胜负留给后世。", effects: { army: 4, grain: -8, integrity: 5, sentiment: 3 } },
  ]},

  { id: "song-gaoping", scriptId: "song", year: 954, historical: true, title: "高平督战", category: "历史大事", text: "后周军初战动摇，禁军将校已有退意。赵匡胤必须在阵线崩溃前稳住军心。", options: [
    { label: "躬冒矢石，整军反击", detail: "个人勇决若不能转化为军令，只会一同陷入败阵。", chance: 60, tag: "军事", successEffects: { army: 13, sentiment: 8 }, failEffects: { army: -13, population: -3 } },
    { label: "护持中军，徐图再战", detail: "避免孤注一掷，但难以建立军中威望。", effects: { army: 5, grain: 4, sentiment: -2 } },
  ]},
  { id: "song-chenqiao", scriptId: "song", year: 960, historical: true, title: "陈桥黄袍", category: "历史大事", text: "北征途中诸将拥入帐中，黄袍已经披到赵匡胤身上。汴京只有幼主与太后。", options: [
    { label: "约束诸军，回师受禅", detail: "兵不血刃取得天下，名分争议却无法完全消除。", effects: { army: 8, sentiment: 4, integrity: -9 } },
    { label: "还师奉周，整饬禁军", detail: "朝纲与民心足够稳固时，或可让后周避开改朝换代。", rewardRequirements: { integrity: 45, sentiment: 30 }, alternateText: "赵匡胤拒绝黄袍、还政幼主，后周没有在陈桥终结，天下进入另一条统一道路。", effects: { integrity: 13, sentiment: 11, army: -5 }, setHistoryFlags: ["song_returned_to_zhou"] },
  ]},
  { id: "song-later-shu", scriptId: "song", year: 965, historical: true, title: "剑门入蜀", category: "历史大事", text: "后蜀君臣宴安，宋军可沿峡江与秦岭两路并进。山道转运将决定速胜还是久困。", options: [
    { label: "两路疾趋成都", detail: "谋划准确可一举灭蜀，失误则军粮尽在险道。", chance: 60, tag: "谋略", successEffects: { population: 7, grain: 13, army: 7 }, failEffects: { army: -12, grain: -11 } },
    { label: "据剑门，缓图蜀中", detail: "不求速灭，以较低风险蚕食边境。", effects: { grain: 6, army: 4, sentiment: -2 } },
  ]},
  { id: "song-southern-tang", scriptId: "song", year: 975, historical: true, title: "金陵归宋", category: "历史大事", text: "南唐国主李煜困守金陵，长江浮桥已成。统一南方只差最后一座都城。", options: [
    { label: "围金陵，尽取江南", detail: "兵粮不足，长江两岸会把宋军拖进持久战。", requirements: { army: 95, grain: 80 }, failOnUnmet: true, effects: { army: -12, grain: -14, population: 10, sentiment: 6 } },
    { label: "册封李煜，保留南唐", detail: "以名义臣服换取和平，割据根源仍在。", effects: { grain: 9, army: -3, integrity: -6, sentiment: 3 } },
  ]},
  { id: "song-zhou-generals", scriptId: "song", year: 961, historical: true, requiresHistoryFlags: ["song_returned_to_zhou"], title: "宿将再请", category: "历史大事", text: "陈桥之日拒绝黄袍后，禁军诸将并未散去。北汉边报再至，石守信等人请求掌握更完整的军权，以免前线重演迟疑。", options: [
    { label: "授节度使，责其北征", detail: "以更大兵权换取边军效命，五代旧局仍可能重来。", effects: { army: 11, sentiment: 4, integrity: -11 } },
    { label: "拆分禁军指挥", detail: "趁新的拥立尚未发生，先把军权分开。", chance: 58, tag: "吏治", successEffects: { integrity: 13, army: 3, sentiment: 5 }, failEffects: { army: -14, integrity: -8, sentiment: -6 } },
  ]},

  { id: "genghis-naiman", scriptId: "genghis", year: 1204, historical: true, title: "乃蛮决战", category: "历史大事", text: "乃蛮诸部集结于杭爱山，草原统一只差最后一个强敌。札木合也在敌阵之中。", options: [
    { label: "正面决战，尽破乃蛮", detail: "强军可一战统一草原，败军则诸部重新离散。", chance: 60, tag: "军事", successEffects: { army: 16, population: 7, sentiment: 6 }, failEffects: { army: -17, grain: -8 } },
    { label: "离间诸部，招降旧众", detail: "谋略若成可减少伤亡，若败则敌军坐大。", chance: 60, tag: "谋略", successEffects: { army: 9, integrity: 5 }, failEffects: { army: -6, integrity: -6 } },
  ]},
  { id: "genghis-kurultai", scriptId: "genghis", year: 1206, historical: true, title: "斡难河大会", category: "历史大事", text: "诸部会盟，铁木真被推为成吉思汗。新国家要依千户制重组，还是继续照顾旧部贵族？", options: [
    { label: "编立千户，打散旧部", detail: "军政一体带来效率，也触动世袭首领。", effects: { army: 13, integrity: 9, sentiment: -4 } },
    { label: "分封旧贵，共享草场", detail: "诸部眼前欢服，汗权却难以贯彻。", effects: { sentiment: 9, army: 5, integrity: -11 }, setHistoryFlags: ["genghis_old_nobles"] },
  ]},
  { id: "genghis-jin", scriptId: "genghis", year: 1211, historical: true, excludesHistoryFlags: ["genghis_old_nobles"], title: "野狐岭破金", category: "历史大事", text: "金军重兵列于野狐岭，山口狭窄，蒙古骑兵无法完全展开。这是南下中原的第一道铁门。", options: [
    { label: "集中骑军冲破中军", detail: "胜则金军主力瓦解，败则草原精锐尽折山谷。", chance: 55, tag: "军事", successEffects: { army: 19, grain: 11, sentiment: 8 }, failEffects: { army: -21, grain: -12 } },
    { label: "绕击州县，断其转运", detail: "不争一日胜负，以机动逐步耗尽金军。", effects: { grain: -8, army: 9, integrity: 3 } },
  ]},
  { id: "genghis-noble-vanguard", scriptId: "genghis", year: 1211, historical: true, requiresHistoryFlags: ["genghis_old_nobles"], punitive: true, title: "诸王争锋", category: "历史大事", text: "旧贵族的部众仍按氏族各自听令。面对野狐岭金军，诸王争夺先锋，拒绝把精骑混编成一支大军。", options: [
    { label: "强命诸部合阵", detail: "临战重整军令，即使压住旧贵也会先付出内耗。", chance: 50, tag: "吏治", successEffects: { army: -7, integrity: -4, sentiment: -3 }, failEffects: { army: -20, population: -3, integrity: -11 } },
    { label: "准其分道袭掠", detail: "避免当场冲突，却让各部争功与转运混乱继续扩大。", effects: { grain: -9, army: -5, integrity: -10, sentiment: -3 } },
  ]},
  { id: "genghis-western-xia", scriptId: "genghis", year: 1227, historical: true, title: "西夏末路", category: "历史大事", text: "西夏拒绝随征花剌子模，蒙古大军再次围住中兴府。大汗病势却在军中日重。", options: [
    { label: "尽灭西夏后班师", detail: "最后一战仍需强军与粮秣维持围城。", requirements: { army: 110, grain: 65 }, failOnUnmet: true, effects: { army: -15, grain: -18, population: 5, sentiment: 3 } },
    { label: "受降止兵，保存诸军", detail: "放弃彻底毁灭，以稳定继承为先。", effects: { sentiment: 9, integrity: 6, army: -4, grain: 4 } },
  ]},

  { id: "ming-nanjing", scriptId: "ming", year: 1356, historical: true, title: "金陵立基", category: "历史大事", text: "朱元璋攻取集庆，长江形胜与江南财赋尽入掌中。是先建根本，还是乘势北逐元军？", options: [
    { label: "改名应天，广积粮饷", detail: "以金陵为根本，先让新政权能够供养战争。", effects: { grain: 15, population: 8, integrity: 5, army: 3 } },
    { label: "乘胜北进，直逼中原", detail: "强军可扩大战果，失败则新得江南尚未稳固。", chance: 55, tag: "军事", successEffects: { army: 13, sentiment: 7 }, failEffects: { army: -11, grain: -9, sentiment: -4 } },
  ]},
  { id: "ming-foundation", scriptId: "ming", year: 1368, historical: true, title: "洪武开国", category: "历史大事", text: "群雄大体削平，北伐军即将出师。应天群臣请即皇帝位、定国号为明。", options: [
    { label: "即帝位，颁北伐诏", detail: "先立名号凝聚天下，再以新朝名义逐元。", effects: { grain: -8, integrity: 8, sentiment: 11, army: 5 } },
    { label: "先克大都，再议称帝", detail: "谋划成功可兼得名实，失败则军心无所系。", chance: 58, tag: "谋略", successEffects: { army: 11, integrity: 7 }, failEffects: { army: -9, grain: -11 } },
  ]},
  { id: "ming-hu-weiyong", scriptId: "ming", year: 1380, historical: true, title: "胡党大狱", category: "历史大事", text: "丞相胡惟庸被告谋反，案卷牵连中书省与大批功臣。皇帝也在考虑彻底废除丞相。", options: [
    { label: "穷治胡党，废除丞相", detail: "皇权从此直达六部，大狱也会沿关系网不断扩张。", effects: { integrity: 13, sentiment: -15, population: -4 } },
    { label: "限案于首恶，重定相权", detail: "清明吏治才能让审理止于证据，而非无限株连。", chance: 58, tag: "吏治", successEffects: { integrity: 15, sentiment: 6 }, failEffects: { integrity: -12, grain: -8, sentiment: -5 }, successHistoryFlags: ["ming_limited_purge"] },
  ]},
  { id: "ming-succession", scriptId: "ming", year: 1392, historical: true, title: "国本震荡", category: "历史大事", text: "太子朱标病逝，皇位继承骤然悬空。皇孙年少，诸王则兵权在握。", options: [
    { label: "立皇孙朱允炆", detail: "守嫡长礼法，也把削藩难题留给年轻储君。", effects: { integrity: 7, sentiment: 6, army: -5 } },
    { label: "改立燕王朱棣", detail: "军威与朝纲足以服众时，或可提前化解靖难之变。", rewardRequirements: { army: 110, integrity: 25 }, alternateText: "燕王以储君身份入京，诸王没有举兵靖难，明初国本沿另一条道路延续。", effects: { army: 10, integrity: -7, sentiment: -6 } },
  ]},
  { id: "ming-lan-yu", scriptId: "ming", year: 1393, historical: true, excludesHistoryFlags: ["ming_limited_purge"], title: "蓝玉案起", category: "历史大事", text: "大将蓝玉被控谋反，军中旧部与开国勋贵人人自危。此案将决定功臣集团的结局。", options: [
    { label: "诛蓝玉，遍索同党", detail: "迅速清除军中威胁，也使开国勋贵几乎一扫而空。", effects: { integrity: 10, army: -11, sentiment: -9, population: -3 } },
    { label: "收其兵权，免死幽置", detail: "吏治与军威俱强时，或能不用大狱完成权力交接。", rewardRequirements: { integrity: 50, army: 110 }, alternateText: "蓝玉交出兵权，勋贵未遭大规模株连，北军与储位都获得更平稳的过渡。", effects: { integrity: 13, army: 5, sentiment: 6 } },
  ]},
  { id: "ming-merit-retirement", scriptId: "ming", year: 1393, historical: true, requiresHistoryFlags: ["ming_limited_purge"], title: "勋臣归田", category: "历史大事", text: "胡惟庸案止于证据后，开国勋贵仍握重兵。蓝玉功高气盛，却尚未被卷入谋反大狱，朝廷必须为功臣安排退路。", options: [
    { label: "厚赐田宅，换其交兵", detail: "以国库换取不流血的权力交接。", requirements: { grain: 85, integrity: 25 }, failOnUnmet: true, effects: { grain: -16, army: -5, integrity: 12, sentiment: 7 } },
    { label: "保留爵位，轮换边镇", detail: "让勋臣继续有功可立，也避免一人久握边军。", chance: 60, tag: "吏治", successEffects: { army: 9, integrity: 10, sentiment: 4 }, failEffects: { army: -10, integrity: -8, sentiment: -5 } },
  ]},
];

const coreHistoricalEvents: EventTemplate[] = [
  { id: "qin-sandhill", scriptId: "qin", year: -210, historical: true, title: "沙丘风雷", category: "历史大事", text: "东巡途中，皇帝病势沉重。中车府令与丞相在车驾外交换眼色，一纸遗诏将决定帝国走向。", options: [
    { label: "公开遗诏，扶苏即位", detail: "若朝纲清明、民心未失，可斩断沙丘之谋。", rewardRequirements: { integrity: 35, sentiment: 0 }, alternateText: "沙丘之谋未成，扶苏与蒙恬稳住帝国，秦亡的旧轨被彻底改写。", effects: { integrity: 12, sentiment: 14, army: 4 } },
    { label: "秘不发丧，依旧东归", detail: "吏治腐败时，密谋将吞噬王朝。", requirements: { integrity: 5 }, failOnUnmet: true, effects: { integrity: -18, sentiment: -12 } },
    { label: "召集重臣共议国本", detail: "以制度约束阴谋。", chance: 62, tag: "吏治", successEffects: { integrity: 10, sentiment: 8 }, failEffects: { integrity: -15, sentiment: -10 } },
  ]},
  { id: "liubang-hongmen", scriptId: "liubang", year: -206, historical: true, title: "鸿门宴", category: "历史大事", text: "项羽四十万大军驻鸿门，席间剑影逼人。能否从宴席全身而退，将决定关中归属。", options: [
    { label: "卑辞谢罪，伺机脱身", detail: "谋臣越强，生门越宽。", chance: 58, tag: "谋略", successEffects: { army: 6, sentiment: 4 }, failEffects: { army: -15, grain: -8 } },
    { label: "掷杯为号，席间搏杀", detail: "武备不足便是王朝未立先亡。", requirements: { army: 82 }, failOnUnmet: true, effects: { army: -18, sentiment: 10 } },
  ]},
  { id: "hanwu-mobei", scriptId: "hanwu", year: -119, historical: true, title: "漠北决战", category: "历史大事", text: "大军将深入漠北，追击匈奴主力。此战若胜可绝边患，粮道若断则数十年积蓄尽空。", options: [
    { label: "倾国出塞，封狼居胥", detail: "钱粮与武备必须同时经得住考验。", requirements: { grain: 95, army: 100 }, failOnUnmet: true, rewardRequirements: { grain: 130, army: 115 }, alternateText: "漠北主力尽破，边境获得数十年安宁，帝国没有被战争拖空。", effects: { grain: -35, army: -16, sentiment: 7 } },
    { label: "分路蚕食，保全粮道", detail: "稳健推进，战果有限。", chance: 64, tag: "军事", successEffects: { grain: -14, army: 5 }, failEffects: { grain: -20, army: -8 } },
  ]},
  { id: "caocao-guandu", scriptId: "caocao", year: 200, historical: true, title: "官渡孤注", category: "历史大事", text: "袁绍大军压境，我军粮尽。许攸夜奔来投，献出乌巢粮仓的位置。", options: [
    { label: "轻骑夜袭乌巢", detail: "这是以少胜多的一次豪赌。", chance: 52, tag: "谋略", successEffects: { army: 18, grain: 15, sentiment: 8 }, failEffects: { army: -24, grain: -12 } },
    { label: "坚守待变", detail: "没有足够钱粮，坚守就是慢性败亡。", requirements: { grain: 55 }, failOnUnmet: true, effects: { grain: -22, army: -5 } },
  ]},
  { id: "liubei-yiling", scriptId: "liubei", year: 221, historical: true, title: "夷陵东征", category: "历史大事", text: "关羽已死，荆州已失。群臣劝阻东征，军中复仇之声却沸反盈天。", options: [
    { label: "止戈养民，转谋北伐", detail: "民心与朝纲足够稳固，才压得住复仇声浪。", rewardRequirements: { sentiment: 45, integrity: 35 }, alternateText: "夷陵之火没有燃起，蜀汉保存精锐，为后来北伐留下全新的可能。", effects: { sentiment: 10, army: 8, grain: 6 } },
    { label: "举国东征", detail: "武备不足，连营七百里就是绝路。", requirements: { army: 92 }, failOnUnmet: true, effects: { army: -22, grain: -20, population: -6 } },
  ]},
  { id: "sunce-assassin", scriptId: "sunce", year: 200, historical: true, title: "丹徒遇刺", category: "历史大事", text: "江东初定，旧怨未平。一次轻装出猎，把年轻君主暴露在刺客的弩箭前。", options: [
    { label: "整肃宿卫，收编旧部", detail: "清明吏治可提前识破刺客。", rewardRequirements: { integrity: 32, sentiment: 25 }, alternateText: "刺客在动手前落网。孙策得以继续北图中原，江东命运由此改写。", effects: { integrity: 9, army: 7 } },
    { label: "照常出猎，不疑左右", detail: "若武备与民心不能震慑宵小，此行便是终局。", requirements: { army: 95, sentiment: 10 }, failOnUnmet: true, effects: { army: -8, sentiment: -8 } },
  ]},
  { id: "liuyu-north", scriptId: "liuyu", year: 417, historical: true, excludesHistoryFlags: ["liuyu_abandoned_guanggu"], title: "长安得失", category: "历史大事", text: "北伐连克洛阳、长安，关中父老夹道相迎。但后方权力不稳，留守与回师只能二选一。", options: [
    { label: "增兵关中，完成北定", detail: "国力雄厚、朝纲清明，才守得住胜利。", requirements: { grain: 90, army: 105 }, failOnUnmet: true, rewardRequirements: { grain: 125, army: 120, integrity: 35 }, alternateText: "关中守住，北魏受挫，南北统一第一次真正成为现实。", effects: { grain: -25, army: -12, sentiment: 15 } },
    { label: "回师建康，稳固根本", detail: "放弃长安，换取南方权力。", effects: { army: -8, integrity: 10, sentiment: -5 } },
  ]},
  { id: "taizong-xuanwu", scriptId: "taizong", year: 626, historical: true, title: "玄武门前", category: "历史大事", text: "兄弟相逼，储位之争已无退路。玄武门紧闭之前，所有人都在等待第一支箭。", options: [
    { label: "先发制人", detail: "军心不足，宫门之变必败。", requirements: { army: 90 }, failOnUnmet: true, effects: { army: -8, integrity: -10, sentiment: -6 } },
    { label: "请高祖召集廷议", detail: "朝纲清明到足以约束诸王，或可避开骨肉相残。", rewardRequirements: { integrity: 55, sentiment: 35 }, alternateText: "储位争端在廷议中解决，玄武门没有染血，贞观以另一种方式开启。", effects: { integrity: 10, sentiment: 8 } },
  ]},
  { id: "song-cup", scriptId: "song", year: 961, historical: true, excludesHistoryFlags: ["song_returned_to_zhou"], title: "杯酒释兵权", category: "历史大事", text: "宿将掌禁军，五代旧习仍在。今夜一席酒，可以不流血地重写君臣边界。", options: [
    { label: "厚赐田宅，劝其归第", detail: "需要充足钱粮与君臣互信。", requirements: { grain: 85, integrity: 15 }, failOnUnmet: true, effects: { grain: -14, integrity: 15, army: -7, sentiment: 5 } },
    { label: "强夺兵权", detail: "简单直接，军中反弹难免。", chance: 50, tag: "军事", successEffects: { integrity: 8, army: 3 }, failEffects: { army: -18, sentiment: -8 } },
  ]},
  { id: "genghis-khwarazm", scriptId: "genghis", year: 1219, historical: true, title: "西征花剌子模", category: "历史大事", text: "商队被杀，使者受辱。草原诸部请战，但西方城池、长途补给都不同于旧日征伐。", options: [
    { label: "诸路西征", detail: "强军与粮秣缺一不可。", requirements: { army: 115, grain: 80 }, failOnUnmet: true, effects: { army: -16, grain: -24, population: 5 } },
    { label: "止兵问罪，重开商道", detail: "谋略足够，可将复仇变成长期收益。", chance: 45, tag: "谋略", successEffects: { grain: 18, sentiment: 5 }, failEffects: { army: -7, sentiment: -7 } },
  ]},
  { id: "ming-poyang", scriptId: "ming", year: 1363, historical: true, title: "鄱阳湖决战", category: "历史大事", text: "陈友谅巨舰蔽江，我军舟小势弱。湖口风向与每一道军令，都可能改变天下归属。", options: [
    { label: "火攻连舰", detail: "将帅与谋臣需抓住稍纵即逝的风。", chance: 55, tag: "谋略", successEffects: { army: 20, grain: 12, sentiment: 10 }, failEffects: { army: -22, grain: -15 } },
    { label: "固守湖口，断其粮道", detail: "自身储备先要撑得住。", requirements: { grain: 72 }, failOnUnmet: true, effects: { grain: -18, army: 8 } },
  ]},
];

const historicalEvents: EventTemplate[] = [...additionalHistoricalEvents, ...coreHistoricalEvents];
const allEventTemplates = [...historicalEvents, ...randomEvents];
const qinConquestEventIds = ["qin-conquer-han", "qin-conquer-zhao", "qin-conquer-wei", "qin-conquer-chu", "qin-conquer-yan", "qin-unification"];
const qinConquestBaseYears = [-230, -228, -225, -223, -222, -221];
const qinConquestRequirementReduction = 15;
const emptyHistoricalProgress = (): HistoricalProgress => ({ qinConquestIndex: 0, qinConquestDelay: 0, qinConquestRetries: 0, qinConquestRequirementRelief: 0 });

const clamp = (n: number, min = -100, max = 999) => Math.max(min, Math.min(max, Math.round(n)));
const addEffects = (stats: Stats, effects: Partial<Stats>): Stats => ({
  population: clamp(stats.population + (effects.population || 0), 0),
  grain: clamp(stats.grain + (effects.grain || 0), 0),
  army: clamp(stats.army + (effects.army || 0), 0, 240),
  sentiment: clamp(stats.sentiment + (effects.sentiment || 0), -100, 100),
  integrity: clamp(stats.integrity + (effects.integrity || 0), -100, 100),
});

function liveState(stats: Stats) {
  const army = Math.round(stats.population * .18);
  const grainNeed = stats.population * .8;
  const shortageRatio = grainNeed > 0 ? Math.max(0, grainNeed - stats.grain) / grainNeed : 0;
  const supply = shortageRatio > 0 ? -Math.max(1, Math.round(shortageRatio * 24)) : 0;
  const governance = Math.sign(stats.integrity) * Math.round(Math.abs(stats.integrity) / 16);
  const sentiment = supply + governance;
  return {
    effective: {
      ...stats,
      army: clamp(stats.army + army + supply, 0, 260),
      sentiment: clamp(stats.sentiment + sentiment, -100, 100),
    },
    modifiers: { army, grainNeed, supply, governance, sentiment },
  };
}

function finalOptionChance(option: EventOption, stats: Stats, roster: Person[], policy: typeof policies[number], difficulty: DifficultyId) {
  if (!option.chance) return 0;
  const effective = liveState(stats).effective;
  const members = option.tag ? roster.filter((person) => person.tags.includes(option.tag!)).length : 0;
  const policyBoost = option.tag && policy.tag === option.tag ? 8 : 0;
  const teamBoost = members * 7 + policyBoost;
  const statBoost = option.tag === "军事" ? Math.max(-8, (effective.army - 70) / 20) : option.tag === "财政" ? (effective.grain - 70) / 20 : option.tag === "吏治" ? effective.integrity / 20 : option.tag === "民生" ? effective.sentiment / 20 : (effective.integrity + effective.sentiment) / 20;
  return clamp(option.chance + teamBoost + statBoost - difficultyRule(difficulty).chancePenalty, 1, 100);
}

const nextCalendarYear = (year: number) => year === -1 ? 1 : year + 1;
const yearLabel = (year: number) => year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
const axisLabel = (key: "sentiment" | "integrity", value: number) => {
  if (key === "sentiment") return value < -60 ? "民怨沸腾" : value < -20 ? "怨声渐起" : value < 25 ? "人心未定" : value < 65 ? "政通人和" : "安居乐业";
  return value < -60 ? "贪墨成风" : value < -20 ? "积弊丛生" : value < 25 ? "清浊相杂" : value < 65 ? "吏治有序" : "海内澄清";
};

const effectText = (effects: Partial<Stats>) => (Object.entries(effects) as [StatKey, number][])
  .filter(([, value]) => value !== 0)
  .map(([key, value]) => `${statNames[key]} ${value > 0 ? "+" : ""}${value}`)
  .join(" · ");
const requirementText = (requirements: Requirement) => (Object.entries(requirements) as [StatKey, number][])
  .map(([key, value]) => `${statNames[key]} ≥ ${value}`)
  .join(" · ");

const meets = (stats: Stats, req?: Requirement) => !req || (Object.entries(req) as [StatKey, number][]).every(([key, value]) => stats[key] >= value);

function seededRandom(seed: number, randomCount: number) {
  let value = (seed + Math.imul(randomCount + 1, 0x6D2B79F5)) | 0;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function seededShuffle<T>(items: T[], seed: number, randomCount: number) {
  const copy = [...items];
  let count = randomCount;
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed, count) * (i + 1));
    count += 1;
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return { items: copy, randomCount: count };
}

function shiftCalendarYear(year: number, offset: number) {
  const shifted = year + Math.max(0, offset);
  return year < 0 && shifted >= 0 ? shifted + 1 : shifted;
}

function scaleConquestEffects(effects: Partial<Stats> | undefined, retries: number) {
  if (!effects || retries <= 0) return effects;
  return Object.fromEntries((Object.entries(effects) as [StatKey, number][]).map(([key, value]) => [
    key,
    value < 0 ? value - Math.ceil(Math.abs(value) * retries * .35) : value,
  ])) as Partial<Stats>;
}

function lowerConquestRequirements(requirements: Partial<Stats> | undefined, relief: number) {
  if (!requirements || relief <= 0) return requirements;
  return Object.fromEntries((Object.entries(requirements) as [StatKey, number][]).map(([key, value]) => [key, Math.max(0, value - relief)])) as Partial<Stats>;
}

function applyQinConquestPressure(event: EventTemplate, retries: number, requirementRelief: number) {
  if (event.qinConquestStage === undefined || (retries <= 0 && requirementRelief <= 0)) return event;
  const pressureText = retries > 0 ? `此国已第${retries + 1}次摆上廷议，拖延使军粮、军心与朝局代价进一步上升。` : "";
  const reliefText = requirementRelief > 0 ? `此前缓进已使下次灭国的每项国势要求累计降低${requirementRelief}点。` : "";
  return {
    ...event,
    text: `${event.text} ${pressureText}${reliefText}`,
    options: event.options.map((option) => ({
      ...option,
      requirements: option.qinConquest === "advance" ? lowerConquestRequirements(option.requirements, requirementRelief) : option.requirements,
      effects: scaleConquestEffects(option.effects, retries),
      successEffects: scaleConquestEffects(option.successEffects, retries),
      failEffects: scaleConquestEffects(option.failEffects, retries),
    })),
  };
}

function historyEventAvailable(event: EventTemplate, historyFlags: string[]) {
  const flags = new Set(historyFlags);
  return (event.requiresHistoryFlags || []).every((flag) => flags.has(flag))
    && (event.excludesHistoryFlags || []).every((flag) => !flags.has(flag));
}

function historyEventScheduled(event: EventTemplate, scriptId: string, year: number, historyFlags: string[], progress: HistoricalProgress) {
  if (event.scriptId !== scriptId || !historyEventAvailable(event, historyFlags)) return false;
  if (scriptId === "qin" && event.year !== undefined && event.year >= qinConquestBaseYears[0]) {
    if (event.qinConquestStage !== undefined && event.qinConquestStage !== progress.qinConquestIndex) return false;
    return shiftCalendarYear(event.year, progress.qinConquestDelay) === year;
  }
  return event.year === year;
}

function suppressLaterHistoricalEvents(events: EventTemplate[], seasonIndex: number, randomSeed: number, randomCount: number) {
  if (!events.some((event, index) => index > seasonIndex && event.historical)) return { events, randomCount };
  const used = new Set(events.filter((event, index) => index <= seasonIndex || !event.historical).map((event) => event.id));
  const pool = randomEvents.filter((event) => !["invasion", "rebellion"].includes(event.id) && !used.has(event.id));
  const picked = seededShuffle(pool, randomSeed, randomCount);
  let cursor = 0;
  const replacements = events.map((event, index) => {
    if (index <= seasonIndex || !event.historical) return event;
    const replacement = picked.items[cursor];
    cursor += 1;
    return replacement;
  });
  return { events: replacements, randomCount: picked.randomCount };
}

function buildYearEvents(scriptId: string, year: number, stats: Stats, lowArmyYears: number, unrestYears: number, randomSeed: number, randomCount: number, historyFlags: string[], progress: HistoricalProgress) {
  const effective = liveState(stats).effective;
  const required = historicalEvents
    .filter((event) => historyEventScheduled(event, scriptId, year, historyFlags, progress))
    .map((event) => applyQinConquestPressure(event, progress.qinConquestRetries, progress.qinConquestRequirementRelief))
    .slice(0, 4);
  const conditional: EventTemplate[] = [];
  if (effective.army < 55 && lowArmyYears >= 1) conditional.push(randomEvents.find((event) => event.id === "invasion")!);
  if (effective.sentiment <= -60 && unrestYears >= 1) conditional.push(randomEvents.find((event) => event.id === "rebellion")!);
  const excluded = new Set(conditional.map((event) => event.id));
  const base = randomEvents.filter((event) => !["invasion", "rebellion"].includes(event.id) && !excluded.has(event.id));
  const picked = seededShuffle(base, randomSeed, randomCount);
  const events = [...required, ...conditional].slice(0, 4);
  for (const event of picked.items) {
    if (events.length === 4) break;
    events.push(event);
  }
  const ordered = seededShuffle(events, randomSeed, picked.randomCount);
  return { events: ordered.items, randomCount: ordered.randomCount };
}

function createGameSeed() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0];
  }
  const clock = typeof performance !== "undefined" ? Math.floor(performance.now() * 1000) : 0;
  return (Date.now() ^ clock) >>> 0;
}

function legacySaveSeed(saved: Partial<GameState>) {
  const source = `${saved.scriptId}|${saved.policyId}|${saved.year}|${saved.elapsed}|${saved.seasonIndex}|${Object.values(saved.stats || {}).join(",")}|${saved.events?.map((event) => event.id).join(",")}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  return hash >>> 0;
}

const canServe = (person: Person, role: Role) => person.role === role || person.secondaryRoles.includes(role);

function assignLegacyRoster(ids: string[]) {
  const seats = emptySeats();
  ids.forEach((id) => {
    const person = people.find((item) => item.id === id);
    if (!person) return;
    if (!seats[person.role]) seats[person.role] = id;
    else {
      const secondary = person.secondaryRoles.find((role) => !seats[role]);
      if (secondary) seats[secondary] = id;
    }
  });
  return seats;
}

function legacyQinConquestIndex(saved: Partial<GameState>) {
  if (saved.scriptId !== "qin") return 0;
  const recordedTitles = new Set((saved.chronicle || []).map((entry) => entry.title));
  let index = 0;
  qinConquestEventIds.forEach((id, stage) => {
    const title = historicalEvents.find((event) => event.id === id)?.title;
    if ((saved.year ?? -246) > qinConquestBaseYears[stage] || (title && recordedTitles.has(title))) index = stage + 1;
  });
  return index;
}

function normalizeSave(raw: unknown): GameState | null {
  if (!raw || typeof raw !== "object") return null;
  const saved = raw as Partial<GameState> & { rosterIds?: string[]; seatAssignments?: Partial<SeatAssignments> };
  if (!saved.scriptId || !saved.policyId || !saved.stats || !saved.events || !saved.rosterIds) return null;
  const fallback = assignLegacyRoster(saved.rosterIds);
  const seatAssignments = roles.reduce((result, role) => {
    result[role] = saved.seatAssignments?.[role] || fallback[role];
    return result;
  }, emptySeats());
  const rosterIds = roles.map((role) => seatAssignments[role]).filter(Boolean) as string[];
  const randomSeed = Number.isInteger(saved.randomSeed) ? saved.randomSeed! >>> 0 : legacySaveSeed(saved);
  const randomCount = Number.isInteger(saved.randomCount) && saved.randomCount! >= 0 ? Math.floor(saved.randomCount!) : 0;
  const historyFlags = Array.isArray(saved.historyFlags) ? [...new Set(saved.historyFlags.filter((flag): flag is string => typeof flag === "string"))] : [];
  const qinConquestIndex = Number.isInteger(saved.qinConquestIndex) ? clamp(saved.qinConquestIndex!, 0, qinConquestEventIds.length) : legacyQinConquestIndex(saved);
  const qinConquestDelay = Number.isInteger(saved.qinConquestDelay) && saved.qinConquestDelay! >= 0 ? Math.floor(saved.qinConquestDelay!) : 0;
  const qinConquestRetries = Number.isInteger(saved.qinConquestRetries) && saved.qinConquestRetries! >= 0 ? Math.floor(saved.qinConquestRetries!) : 0;
  const qinConquestRequirementRelief = Number.isInteger(saved.qinConquestRequirementRelief) && saved.qinConquestRequirementRelief! >= 0 ? Math.floor(saved.qinConquestRequirementRelief!) : 0;
  const difficulty: DifficultyId = difficulties.some((item) => item.id === saved.difficulty) ? saved.difficulty! : "easy";
  const events = saved.events.map((event) => {
    const template = allEventTemplates.find((item) => item.id === event.id);
    return template ? applyQinConquestPressure(template, qinConquestRetries, qinConquestRequirementRelief) : event;
  });
  return { ...saved, version: 7, difficulty, seatAssignments, rosterIds, randomSeed, randomCount, historyFlags, events, qinConquestIndex, qinConquestDelay, qinConquestRetries, qinConquestRequirementRelief } as GameState;
}

function drawRosterCandidates(seats: SeatAssignments, selectedIds: string[]) {
  const eligible = people.filter((person) => !selectedIds.includes(person.id) && (!seats[person.role] || person.secondaryRoles.some((role) => !seats[role])));
  const pools = [...roles].sort(() => Math.random() - .5).map((role) => eligible.filter((person) => person.role === role).sort(() => Math.random() - .5));
  const candidates: Person[] = [];
  for (let depth = 0; candidates.length < 12 && pools.some((pool) => pool[depth]); depth += 1) {
    for (const pool of pools) {
      if (pool[depth]) candidates.push(pool[depth]);
      if (candidates.length === 12) break;
    }
  }
  return candidates.map((person) => person.id);
}

function App() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [difficulty, setDifficulty] = useState<DifficultyId>("easy");
  const [scriptId, setScriptId] = useState("qin");
  const [policyId, setPolicyId] = useState("rest");
  const [rosterSeats, setRosterSeats] = useState<SeatAssignments>(emptySeats);
  const [rosterRound, setRosterRound] = useState(0);
  const [redrawsLeft, setRedrawsLeft] = useState(3);
  const [candidateIds, setCandidateIds] = useState<string[]>([]);
  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [savesOpen, setSavesOpen] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const saveNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveMeta, setSaveMeta] = useState<(GameState | null)[]>(() => {
    if (typeof window === "undefined") return [null, null, null];
    return [0, 1, 2].map((slot) => {
      try {
        const raw = localStorage.getItem(`dynasty-save-${slot}`);
        return raw ? normalizeSave(JSON.parse(raw)) : null;
      } catch { return null; }
    });
  });

  const script = scripts.find((item) => item.id === scriptId) || scripts[0];
  const policy = policies.find((item) => item.id === policyId) || policies[0];
  const rosterIds = roles.map((role) => rosterSeats[role]).filter(Boolean) as string[];
  const roster = rosterIds.map((id) => people.find((person) => person.id === id)).filter(Boolean) as Person[];

  const displayPhase: Phase = game?.phase === "ending" ? "ending" : phase;

  const beginRoster = () => {
    const seats = emptySeats();
    setRosterSeats(seats); setRosterRound(0); setRedrawsLeft(3); setActivePersonId(null);
    setCandidateIds(drawRosterCandidates(seats, [])); setPhase("roster");
  };

  const redrawCandidates = () => {
    if (redrawsLeft <= 0) return;
    setCandidateIds(drawRosterCandidates(rosterSeats, rosterIds));
    setRedrawsLeft((count) => Math.max(0, count - 1));
  };

  const selectPerson = (person: Person) => {
    const target = !rosterSeats[person.role] ? person.role : person.secondaryRoles.find((role) => !rosterSeats[role]) || null;
    if (!target || rosterIds.includes(person.id) || rosterRound >= 5) return;
    const nextSeats = { ...rosterSeats, [target]: person.id };
    const nextIds = roles.map((role) => nextSeats[role]).filter(Boolean) as string[];
    const nextRound = rosterRound + 1;
    setRosterSeats(nextSeats); setRosterRound(nextRound); setActivePersonId(null);
    setCandidateIds(nextRound < 5 ? drawRosterCandidates(nextSeats, nextIds) : []);
  };

  const canMovePerson = (personId: string, target: Role) => {
    const source = roles.find((role) => rosterSeats[role] === personId);
    const person = people.find((item) => item.id === personId);
    if (!source || !person || source === target || !canServe(person, target)) return false;
    const targetId = rosterSeats[target];
    if (!targetId) return true;
    const targetPerson = people.find((item) => item.id === targetId);
    return !!targetPerson && canServe(targetPerson, source);
  };

  const movePerson = (personId: string, target: Role) => {
    if (!canMovePerson(personId, target)) return;
    const source = roles.find((role) => rosterSeats[role] === personId)!;
    const targetId = rosterSeats[target];
    setRosterSeats({ ...rosterSeats, [source]: targetId, [target]: personId });
    setActivePersonId(null);
  };

  const startReign = () => {
    const randomSeed = createGameSeed();
    let randomCount = 0;
    const variance = () => {
      const value = Math.floor(seededRandom(randomSeed, randomCount) * 11) - 5;
      randomCount += 1;
      return value;
    };
    let stats = { ...script.base };
    stats = addEffects(stats, policy.effects);
    roster.forEach((person) => { stats = addEffects(stats, person.bonuses); });
    stats = addEffects(stats, { population: variance(), grain: variance(), army: variance(), sentiment: variance(), integrity: variance() });
    const growth = annualGrowth(stats, policyId, difficulty);
    stats = addEffects(stats, growth.effects);
    const effective = liveState(stats).effective;
    const progress = emptyHistoricalProgress();
    const yearEvents = buildYearEvents(scriptId, script.startYear, stats, 0, 0, randomSeed, randomCount, [], progress);
    randomCount = yearEvents.randomCount;
    const initial: GameState = {
      version: 7, phase: "reign", difficulty, scriptId, policyId, rosterIds, seatAssignments: rosterSeats, year: script.startYear, elapsed: 1, seasonIndex: 0,
      stats, events: yearEvents.events, outcome: null,
      chronicle: [{ year: script.startYear, season: "春", title: "开国建元", note: `${people.find((person) => person.id === rosterSeats.皇帝)?.name || "新君"}与开国班底共治天下。${growth.note}` }],
      lowArmyYears: effective.army < 55 ? 1 : 0, unrestYears: effective.sentiment <= -60 ? 1 : 0, alteredHistory: false,
      annualNote: growth.note, endingReason: "", endingVictory: false, randomSeed, randomCount, historyFlags: [], ...progress,
    };
    setGame(initial); setPhase("reign"); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const chooseOption = (option: EventOption) => {
    setGame((current) => {
      if (!current || current.outcome) return current;
      const event = current.events[current.seasonIndex];
      const effectiveCurrent = liveState(current.stats).effective;
      if (option.failOnUnmet && !meets(effectiveCurrent, option.requirements)) {
        return { ...current, phase: "ending", endingVictory: false, endingReason: `${event.title}中，国力未达到「${option.label}」的最低要求。仓促的决断成为王朝覆亡的最后一根稻草。`, chronicle: [...current.chronicle, { year: current.year, season: seasons[current.seasonIndex], title: "国祚中绝", note: `${event.title}处置失当，王朝陨落。` }] };
      }
      let effects = option.effects || {};
      let success: boolean | undefined;
      let resultText = option.detail;
      let randomCount = current.randomCount;
      if (option.chance) {
        const finalChance = finalOptionChance(option, current.stats, roster, policy, current.difficulty);
        success = seededRandom(current.randomSeed, randomCount) * 100 < finalChance;
        randomCount += 1;
        effects = success ? (option.successEffects || {}) : (option.failEffects || {});
        resultText = success ? "判定成功。班底各展所长，决策奏效。" : "判定失败。局势未如所愿，代价已经显现。";
      }
      const alternate = !!option.alternateText && meets(effectiveCurrent, option.rewardRequirements);
      if (alternate) resultText = option.alternateText!;
      const historyFlags = new Set(current.historyFlags);
      option.setHistoryFlags?.forEach((flag) => historyFlags.add(flag));
      if (success === true) option.successHistoryFlags?.forEach((flag) => historyFlags.add(flag));
      if (success === false) option.failHistoryFlags?.forEach((flag) => historyFlags.add(flag));
      const nextHistoryFlags = [...historyFlags];
      let qinConquestIndex = current.qinConquestIndex;
      let qinConquestDelay = current.qinConquestDelay;
      let qinConquestRetries = current.qinConquestRetries;
      let qinConquestRequirementRelief = current.qinConquestRequirementRelief;
      let events = current.events;
      if (event.qinConquestStage !== undefined && option.qinConquest === "advance") {
        qinConquestIndex = Math.max(qinConquestIndex, event.qinConquestStage + 1);
        qinConquestRetries = 0;
        qinConquestRequirementRelief = 0;
      } else if (event.qinConquestStage !== undefined && option.qinConquest === "delay") {
        qinConquestDelay += 1;
        qinConquestRetries += 1;
        if (success === true) {
          qinConquestRequirementRelief += qinConquestRequirementReduction;
          resultText = `${resultText} 缓进奏效，下次灭国的每项国势要求降低${qinConquestRequirementReduction}点；连续成功可以叠加。`;
        }
        const suppressed = suppressLaterHistoricalEvents(events, current.seasonIndex, current.randomSeed, randomCount);
        events = suppressed.events;
        randomCount = suppressed.randomCount;
        resultText = `${resultText} 此国未亡，来年仍须再决；本次之后的秦线大事也将顺延。`;
      }
      const progress = { qinConquestIndex, qinConquestDelay, qinConquestRetries, qinConquestRequirementRelief };
      const stats = addEffects(current.stats, effects);
      if (stats.population < 18 || stats.grain <= 0) {
        const cause = stats.population < 18 ? "人口跌破王朝存续底线" : "国库钱粮耗尽";
        return { ...current, stats, events, randomCount, historyFlags: nextHistoryFlags, ...progress, phase: "ending", endingVictory: false, endingReason: `${cause}。地方失去供养与秩序，国祚就此断绝。`, chronicle: [...current.chronicle, { year: current.year, season: seasons[current.seasonIndex], title: "山河易色", note: `${event.title}之后，${cause}。` }] };
      }
      return { ...current, stats, events, randomCount, historyFlags: nextHistoryFlags, ...progress, alteredHistory: current.alteredHistory || alternate, outcome: { title: alternate ? "历史改写" : success === false ? "事与愿违" : "诏令已行", text: resultText, effects, success, alternate }, chronicle: [...current.chronicle, { year: current.year, season: seasons[current.seasonIndex], title: event.title, note: `${option.label}。${resultText}` }].slice(-30) };
    });
  };

  const continueSeason = () => {
    setGame((current) => {
      if (!current || !current.outcome) return current;
      if (current.seasonIndex < 3) return { ...current, seasonIndex: current.seasonIndex + 1, outcome: null };
      return { ...current, outcome: null, seasonIndex: 4 };
    });
  };

  const beginNextYear = () => {
    setGame((current) => {
      if (!current) return current;
      if (current.elapsed >= 500) return { ...current, phase: "ending", endingVictory: true, endingReason: "五百年间国祚不断，制度与民生经受住一代代风雨。你的王朝已成真正的千古一朝。" };
      const year = nextCalendarYear(current.year);
      const growth = annualGrowth(current.stats, current.policyId, current.difficulty);
      const stats = addEffects(current.stats, growth.effects);
      if (stats.population < 18 || stats.grain <= 0) return { ...current, year, stats, phase: "ending", endingVictory: false, endingReason: stats.grain <= 0 ? "岁首核账，国库已经无粮可支，天下由此土崩瓦解。" : "连年凋敝后，编户不足以支撑国家，王朝悄然终结。" };
      const effective = liveState(stats).effective;
      const lowArmyYears = effective.army < 55 ? current.lowArmyYears + 1 : 0;
      const unrestYears = effective.sentiment <= -60 ? current.unrestYears + 1 : 0;
      const yearEvents = buildYearEvents(current.scriptId, year, stats, lowArmyYears, unrestYears, current.randomSeed, current.randomCount, current.historyFlags, current);
      return { ...current, year, elapsed: current.elapsed + 1, stats, seasonIndex: 0, outcome: null, annualNote: growth.note, lowArmyYears, unrestYears, events: yearEvents.events, randomCount: yearEvents.randomCount, chronicle: [...current.chronicle, { year, season: "春", title: "岁首国计", note: growth.note }].slice(-30) };
    });
  };

  const saveGame = (slot: number) => {
    if (!game || displayPhase !== "reign") return;
    localStorage.setItem(`dynasty-save-${slot}`, JSON.stringify({ ...game, phase: game.phase === "ending" ? "ending" : "reign" }));
    setSaveMeta((items) => items.map((item, index) => index === slot ? game : item));
    setSavesOpen(false);
    setSaveNotice(`已存入档案 ${slot + 1}`);
    if (saveNoticeTimer.current) clearTimeout(saveNoticeTimer.current);
    saveNoticeTimer.current = setTimeout(() => setSaveNotice(""), 2200);
  };

  const loadGame = (slot: number) => {
    const saved = saveMeta[slot];
    if (!saved) return;
    setGame(saved); setDifficulty(saved.difficulty); setScriptId(saved.scriptId); setPolicyId(saved.policyId); setRosterSeats(saved.seatAssignments); setRosterRound(5); setCandidateIds([]); setPhase(saved.phase); setSavesOpen(false);
  };

  const deleteSave = (slot: number) => {
    localStorage.removeItem(`dynasty-save-${slot}`);
    setSaveMeta((items) => items.map((item, index) => index === slot ? null : item));
  };

  const restart = () => { setGame(null); setDifficulty("easy"); setPhase("landing"); setRosterSeats(emptySeats()); setRosterRound(0); setRedrawsLeft(3); setCandidateIds([]); setActivePersonId(null); setSavesOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <main className={`app phase-${displayPhase}`}>
      <div className="grain-overlay" />
      {displayPhase !== "landing" && <TopBar setPhase={setPhase} openSaves={() => setSavesOpen(true)} game={game} canSave={displayPhase === "reign"} />}

      {displayPhase === "landing" && <Landing onStart={(selectedDifficulty) => { setDifficulty(selectedDifficulty); setPhase("script"); }} onLoad={() => setSavesOpen(true)} />}
      {displayPhase === "script" && <ScriptSelect selected={scriptId} onSelect={setScriptId} onBack={() => setPhase("landing")} onNext={() => setPhase("policy")} />}
      {displayPhase === "policy" && <PolicySelect selected={policyId} onSelect={setPolicyId} onBack={() => setPhase("script")} onNext={beginRoster} />}
      {displayPhase === "roster" && <RosterSelect seats={rosterSeats} round={rosterRound} redrawsLeft={redrawsLeft} candidates={candidateIds.map((id) => people.find((person) => person.id === id)).filter(Boolean) as Person[]} activePersonId={activePersonId} onActivate={setActivePersonId} onCanMove={canMovePerson} onMove={movePerson} onRedraw={redrawCandidates} onSelect={selectPerson} onBack={() => setPhase("policy")} onStart={startReign} />}
      {displayPhase === "reign" && game && <Reign game={game} script={script} policy={policy} roster={roster} onChoose={chooseOption} onContinue={continueSeason} onNextYear={beginNextYear} />}
      {displayPhase === "ending" && game && <Ending game={game} script={script} onRestart={restart} onSaves={() => setSavesOpen(true)} />}

      {savesOpen && <SaveDrawer saves={saveMeta} current={displayPhase === "reign" ? game : null} onClose={() => setSavesOpen(false)} onSave={saveGame} onLoad={loadGame} onDelete={deleteSave} />}
      {saveNotice && <div className="save-toast" role="status" aria-live="polite">{saveNotice}</div>}
    </main>
  );
}

function annualGrowth(stats: Stats, policyId: string, difficulty: DifficultyId) {
  const effective = liveState(stats).effective;
  const rest = policyId === "rest" ? 1.5 : 0;
  const governanceGrowth = effective.integrity / 48;
  const population = clamp(2.2 + effective.sentiment / 32 + rest + governanceGrowth, -8, 8);
  const populationYield = stats.population * .12;
  const civilianUse = stats.population * .05;
  const militaryCost = effective.army * .025;
  const administration = effective.integrity / 18;
  const grain = clamp(populationYield + (policyId === "rest" ? 5 : 0) + administration - civilianUse - militaryCost, -20, 20);
  const rule = difficultyRule(difficulty);
  const integrity = -6 - rule.integrityDecayPenalty;
  const effects = { population, grain, integrity };
  return {
    effects,
    note: `户口${population >= 0 ? "增" : "减"}${Math.abs(population)}，府库${grain >= 0 ? "盈" : "耗"}${Math.abs(grain)}，吏治自然损耗${Math.abs(integrity)}。`,
    breakdown: {
      population: [
        { label: `民情 ${formatDelta(effective.sentiment / 32)}`, value: effective.sentiment / 32, detail: `有效民情 ${effective.sentiment} ÷ 32 = ${formatDelta(effective.sentiment / 32)}，计入每年人口增长；民情变化后立即重算。` },
        ...(rest ? [{ label: "休养 +1.5", value: 1.5, detail: "国策“休养生息”固定使每年人口增长 +1.5；更换国策后消失。" }] : []),
        ...(governanceGrowth ? [{ label: `吏治 ${formatDelta(governanceGrowth)}`, value: governanceGrowth, detail: `当前吏治 ${effective.integrity} ÷ 48 = ${formatDelta(governanceGrowth)}，计入每年人口增长；正吏治为增益，负吏治为减益，吏治归零时消失。` }] : []),
      ],
      grain: [
        { label: `人口产出 ${formatDelta(populationYield)}`, value: populationYield, detail: `基础人口 ${stats.population} × 0.12 = ${formatDelta(populationYield)}，计入每年钱粮增长；正常情况下足以覆盖大部分民用与军费。` },
        { label: `民用 ${formatDelta(-civilianUse)}`, value: -civilianUse, detail: `基础人口 ${stats.population} × 0.05 = ${formatDelta(civilianUse)}，作为每年民用消耗。` },
        { label: `军费 ${formatDelta(-militaryCost)}`, value: -militaryCost, detail: `当前有效武备 ${effective.army} × 0.025 = ${formatDelta(militaryCost)}，作为每年军费消耗。` },
        { label: `吏治 ${formatDelta(administration)}`, value: administration, detail: `当前有效吏治 ${effective.integrity} ÷ 18 = ${formatDelta(administration)}，计入每年钱粮增长；清明吏治提高收入，腐败吏治会侵蚀人口产出带来的盈余。` },
        ...(policyId === "rest" ? [{ label: "休养 +5", value: 5, detail: "国策“休养生息”固定使每年钱粮增长 +5；更换国策后消失。" }] : []),
      ],
      integrity: [{ label: `积弊滋生 ${integrity}`, value: integrity, detail: `吏治每年基础损耗 6 点${rule.integrityDecayPenalty ? `，${rule.name}难度额外损耗 ${rule.integrityDecayPenalty} 点` : ""}，岁首合计扣减 ${Math.abs(integrity)} 点。此项不改变当前吏治，只有进入下一年时才结算；需要通过事件中的整饬吏治持续弥补。` }],
    },
  };
}

function formatDelta(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded >= 0 ? "+" : ""}${rounded}`;
}

function Landing({ onStart, onLoad }: { onStart: (difficulty: DifficultyId) => void; onLoad: () => void }) {
  const [difficultyOpen, setDifficultyOpen] = useState(false);
  return <section className="landing">
    <div className="mountain mountain-a" /><div className="mountain mountain-b" />
    <div className="landing-inner">
      <div className="eyebrow"><span />五人开朝 · 四时治世<span /></div>
      <div className="seal">国<br />祚</div>
      <h1>五百年<br /><em>王朝</em></h1>
      <p className="hero-copy">择一段历史为局，定一条治国之道，携四位股肱之臣走过每个春夏秋冬。<br />这一次，结局不由一次随机判词决定。</p>
      <div className="hero-actions"><div className="start-menu"><button className="primary xl" aria-haspopup="menu" aria-expanded={difficultyOpen} onClick={() => setDifficultyOpen((open) => !open)}>开国治世 <span>▾</span></button>{difficultyOpen && <div className="difficulty-menu" role="menu" aria-label="选择治世难度">{difficulties.map((item) => <button role="menuitem" key={item.id} onClick={() => onStart(item.id)}><i>{item.seal}</i><span><b>{item.name}</b><small>吏治每年 {formatDelta(-6 - item.integrityDecayPenalty)} · {item.chancePenalty ? `成功率 -${item.chancePenalty}%` : "成功率不变"}</small></span></button>)}</div>}</div><button className="ghost" onClick={onLoad}>读取存档</button></div>
      <div className="hero-rules"><span>五项国势彼此牵引</span><i>◆</i><span>历史大事必然发生</span><i>◆</i><span>五百年方成千古一朝</span></div>
    </div>
  </section>;
}

function Progress({ active }: { active: number }) {
  return <div className="progress" aria-label="开国进度">{["历史剧本", "国策方向", "开国班底"].map((label, index) => <div className={index <= active ? "active" : ""} key={label}><b>0{index + 1}</b><span>{label}</span></div>)}</div>;
}

function ScriptSelect({ selected, onSelect, onBack, onNext }: { selected: string; onSelect: (id: string) => void; onBack: () => void; onNext: () => void }) {
  const chosen = scripts.find((item) => item.id === selected)!;
  return <section className="setup-page"><Progress active={0} /><header className="setup-heading"><span>第一诏</span><h2>选择历史剧本</h2><p>历史给你一道开局，但不会替你写下结局。</p></header>
    <div className="script-layout"><div className="script-grid">{scripts.map((item) => <button key={item.id} className={`script-card ${selected === item.id ? "selected" : ""}`} onClick={() => onSelect(item.id)} style={{ "--accent": item.color } as React.CSSProperties}><span className="dynasty">{item.dynasty}</span><h3>{item.title}</h3><p>{item.motto}</p><small>{item.startLabel}</small></button>)}</div>
      <aside className="script-detail" style={{ "--accent": chosen.color } as React.CSSProperties}><div className="big-seal">{chosen.dynasty.slice(0, 2)}</div><span className="kicker">历史原型</span><h3>{chosen.ruler}</h3><strong>{yearLabel(chosen.startYear)}</strong><p>{chosen.description} 剧本只决定时代与历史事件，稍后仍可选择任意皇帝入席。</p><div className="initial-stats"><span>人口 {chosen.base.population}</span><span>钱粮 {chosen.base.grain}</span><span>武备 {chosen.base.army}</span></div><div className="setup-actions"><button className="ghost" onClick={onBack}>返回首页</button><button className="primary" onClick={onNext}>以此纪开局</button></div></aside>
    </div></section>;
}

function PolicySelect({ selected, onSelect, onBack, onNext }: { selected: string; onSelect: (id: string) => void; onBack: () => void; onNext: () => void }) {
  return <section className="setup-page narrow"><Progress active={1} /><header className="setup-heading"><span>第二诏</span><h2>选择国策方向</h2><p>国策不是永久锁定，却会塑造开国三十年的惯性。</p></header><div className="policy-grid">{policies.map((item) => <button key={item.id} onClick={() => onSelect(item.id)} className={`policy-card ${selected === item.id ? "selected" : ""}`}><i>{item.seal}</i><span>国策</span><h3>{item.name}</h3><p>{item.desc}</p><small>{effectText(item.effects)}</small></button>)}</div><div className="setup-actions"><button className="ghost" onClick={onBack}>返回择史</button><button className="primary" onClick={onNext}>颁布国策</button></div></section>;
}

function RosterSelect({ seats, round, redrawsLeft, candidates, activePersonId, onActivate, onCanMove, onMove, onRedraw, onSelect, onBack, onStart }: { seats: SeatAssignments; round: number; redrawsLeft: number; candidates: Person[]; activePersonId: string | null; onActivate: (id: string | null) => void; onCanMove: (id: string, role: Role) => boolean; onMove: (id: string, role: Role) => void; onRedraw: () => void; onSelect: (person: Person) => void; onBack: () => void; onStart: () => void }) {
  return <section className="setup-page roster-page"><Progress active={2} /><header className="setup-heading"><span>第三诏</span><h2>五轮抽签 · 组建班底</h2><p>每轮从随机名册中择一人。主职空缺则优先入主职，否则转入次职。</p></header>
    <div className="seats roster-seats">{roles.map((role) => { const person = people.find((item) => item.id === seats[role]); const isActive = !!person && activePersonId === person.id; const valid = !!activePersonId && onCanMove(activePersonId, role); return <button type="button" draggable={!!person} className={`seat ${person ? "filled" : ""} ${isActive ? "dragging" : ""} ${valid ? "valid-drop" : ""}`} key={role} onClick={() => activePersonId && activePersonId !== person?.id ? onMove(activePersonId, role) : onActivate(person ? (isActive ? null : person.id) : null)} onDragStart={(event) => { if (!person) return; event.dataTransfer.setData("text/plain", person.id); onActivate(person.id); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const personId = event.dataTransfer.getData("text/plain") || activePersonId; if (personId) onMove(personId, role); }}><span>{role}</span><b>{person?.name || "待定"}</b><small>{person ? `主·${person.role}　次·${person.secondaryRoles.join("/") || "无"}` : "等待抽签入席"}</small>{person && <em>拖拽或点击换位</em>}</button> })}</div>
    <div className="roster-hint"><span>调位规则</span><p>拖动已选人物到高亮席位；若目标已有角色，只有对方也能胜任原席位时才会交换。触屏设备可先点人物，再点高亮席位。</p></div>
    {round < 5 ? <section className="roster-draw"><header><div><span>第 {round + 1} 轮 / 共 5 轮</span><h3>本轮随机候选</h3></div><button className="ghost" onClick={onRedraw} disabled={redrawsLeft <= 0}>换一批人才 · 剩 {redrawsLeft} 次</button></header><div className="random-candidates">{candidates.map((person) => <button className="person-card draw-card" onClick={() => onSelect(person)} key={person.id}><div><h3>{person.name}</h3><span>{person.dynasty}</span></div><p>{person.quote}</p><div className="role-directions"><i>主 · {person.role}</i><i>次 · {person.secondaryRoles.join("/") || "无"}</i></div><small>{person.tags.map((tag) => <i key={tag}>{tag}</i>)}</small></button>)}</div></section> : <div className="roster-complete"><span>五轮抽签已毕</span><h3>开国五席俱全</h3><p>仍可拖拽或点击上方人物调整任职方向；确认无误后开始治国。</p></div>}
    <div className="setup-actions sticky-actions"><button className="ghost" onClick={onBack}>返回改策</button><div><span>已完成 {round} / 5 轮</span><button className="primary" disabled={round !== 5 || roles.some((role) => !seats[role])} onClick={onStart}>班底已定 · 开始治国</button></div></div>
  </section>;
}

function TopBar({ setPhase, openSaves, game, canSave }: { setPhase: (phase: Phase) => void; openSaves: () => void; game: GameState | null; canSave: boolean }) {
  return <nav className="topbar"><button className="brand" onClick={() => !game && setPhase("landing")}><i>祚</i><span>五百年王朝<small>RISE OF DYNASTY</small></span></button><div><span className="top-status">{game ? `${yearLabel(game.year)} · 国祚第${game.elapsed}年` : "正在开国"}</span><button className="nav-button" onClick={openSaves}>▣ {canSave ? "存读档" : "读取存档"}</button></div></nav>;
}

function StatPanel({ stats, policyId, difficulty }: { stats: Stats; policyId: string; difficulty: DifficultyId }) {
  const growth = annualGrowth(stats, policyId, difficulty);
  const live = liveState(stats);
  const sentimentBuffs = [
    live.modifiers.supply && { label: `供养不足 ${live.modifiers.supply}`, value: live.modifiers.supply, detail: `人口需要钱粮 ${formatDelta(live.modifiers.grainNeed).slice(1)}（人口 ${stats.population} × 0.8）。当前钱粮 ${stats.grain} 低于需求线，缺口占需求的比例 × 24 并四舍五入，民情 ${live.modifiers.supply}；钱粮达到需求线后立即消失。` },
    live.modifiers.governance && { label: `${live.modifiers.governance > 0 ? "清明" : "贪腐"} ${formatDelta(live.modifiers.governance)}`, value: live.modifiers.governance, detail: `吏治绝对值 ${Math.abs(stats.integrity)} ÷ 16 并四舍五入，再保留吏治正负号，得到民情 ${formatDelta(live.modifiers.governance)}；正吏治为“清明”增益，负吏治为“贪腐”减益，吏治接近 0 时消失。` },
  ].filter(Boolean) as ModifierView[];
  const armyBuffs: ModifierView[] = [
    { label: `人口 +${live.modifiers.army}`, value: live.modifiers.army, detail: `基础人口 ${stats.population} × 0.18 并四舍五入，为当前武备 +${live.modifiers.army}；人口变化后立即重算。` },
    ...(live.modifiers.supply ? [{ label: `供养不足 ${live.modifiers.supply}`, value: live.modifiers.supply, detail: `人口需要钱粮 ${formatDelta(live.modifiers.grainNeed).slice(1)}（人口 ${stats.population} × 0.8）。当前钱粮低于需求线，缺口占需求的比例 × 24 并四舍五入，武备 ${live.modifiers.supply}；钱粮达到需求线后立即消失。` }] : []),
  ];
  const integrityBuffs: ModifierView[] = [];
  return <div className="stats-panel">
    <div className="number-stat"><span>户</span><div><small>人口 · 万户</small><strong>{stats.population}<b className={growth.effects.population >= 0 ? "growth-up" : "growth-down"}>{formatDelta(growth.effects.population)}</b></strong><em>下年增长</em><div className="stat-buffs">{growth.breakdown.population.map((item) => <ModifierChip item={item} key={item.label} />)}</div></div></div>
    <div className="number-stat"><span>仓</span><div><small>钱粮 · 国用</small><strong>{stats.grain}<b className={growth.effects.grain >= 0 ? "growth-up" : "growth-down"}>{formatDelta(growth.effects.grain)}</b></strong><em>下年增长</em><div className="stat-buffs">{growth.breakdown.grain.map((item) => <ModifierChip item={item} key={item.label} />)}</div></div></div>
    <div className="number-stat"><span>兵</span><div><small>武备 · 基础 {stats.army}</small><strong>{live.effective.army}</strong><em>当前实效</em><div className="stat-buffs">{armyBuffs.map((item) => <ModifierChip item={item} key={item.label} />)}</div></div></div>
    <AxisStat label="民情" value={live.effective.sentiment} baseValue={stats.sentiment} modifiers={sentimentBuffs} text={axisLabel("sentiment", live.effective.sentiment)} left="民怨沸腾" right="安居乐业" />
    <AxisStat label="吏治" value={live.effective.integrity} baseValue={stats.integrity} modifiers={integrityBuffs} annualChange={growth.effects.integrity} annualDetail={growth.breakdown.integrity[0].detail} text={axisLabel("integrity", live.effective.integrity)} left="贪墨成风" right="海内澄清" />
  </div>;
}

type ModifierView = { label: string; value: number; detail: string };

function ModifierChip({ item }: { item: ModifierView }) {
  return <i className={item.value < 0 ? "debuff" : "buff"} tabIndex={0}>{item.label}<span role="tooltip">{item.detail}</span></i>;
}

function AxisStat({ label, value, baseValue, modifiers, annualChange, annualDetail, text, left, right }: { label: string; value: number; baseValue: number; modifiers: ModifierView[]; annualChange?: number; annualDetail?: string; text: string; left: string; right: string }) {
  return <div className="axis-stat"><div><small>{label} · 基础 {baseValue}</small><strong>{text}</strong><span className="axis-values"><b>{value}</b>{annualChange !== undefined && <em className={annualChange < 0 ? "annual-delta negative" : "annual-delta positive"} tabIndex={0}>{formatDelta(annualChange)}<span role="tooltip">{annualDetail}</span></em>}</span></div>{modifiers.length > 0 && <div className="stat-buffs">{modifiers.map((item) => <ModifierChip item={item} key={item.label} />)}</div>}<div className="axis"><i style={{ left: `${(value + 100) / 2}%` }} /></div><footer><span>{left}</span><span>{right}</span></footer></div>;
}

function Reign({ game, script, policy, roster, onChoose, onContinue, onNextYear }: { game: GameState; script: Script; policy: typeof policies[number]; roster: Person[]; onChoose: (option: EventOption) => void; onContinue: () => void; onNextYear: () => void }) {
  const event = game.events[Math.min(game.seasonIndex, 3)];
  const isYearEnd = game.seasonIndex === 4;
  const assigned = (role: Role) => roster.find((person) => person.id === game.seatAssignments[role]);
  const emperor = assigned("皇帝");
  return <section className="reign-page"><div className="reign-header"><div><span>{script.title} · 君主 {emperor?.name}</span><h1>{yearLabel(game.year)}</h1><p>国祚第 {game.elapsed} 年 · {difficultyRule(game.difficulty).name}难度 · 国策「{policy.name}」{game.alteredHistory && <b> · 已偏离原有历史线</b>}</p></div></div><div className="reign-grid"><aside><StatPanel stats={game.stats} policyId={game.policyId} difficulty={game.difficulty} /><div className="cabinet"><header><span>治国班底</span><small>对应专长使事件成功率 +7%</small></header><div className="cabinet-ruler"><i>{emperor?.dynasty.slice(0, 1) || "帝"}</i><div><small>皇帝 · {emperor?.dynasty}</small><b>{emperor?.name}</b></div></div>{roles.slice(1).map((role) => { const person = assigned(role); return <div className="cabinet-person" key={role}><div><small>{role}</small><b>{person?.name}</b></div><span>{person?.tags.join(" · ")}</span></div> })}</div></aside>
      <article className="court"><div className="yearline">{seasons.map((season, index) => <div className={index < game.seasonIndex ? "done" : index === game.seasonIndex ? "active" : ""} key={season}><i>{index < game.seasonIndex ? "✓" : season}</i><span>{season}{index === 0 ? "耕" : index === 1 ? "长" : index === 2 ? "收" : "藏"}</span></div>)}</div>
        {isYearEnd ? <YearEnd game={game} onNext={onNextYear} /> : <div className={`event-card ${event.historical ? "historical" : ""}`}><header><div><span>{event.category}</span>{event.historical && <b>必至的历史节点</b>}</div><small>{yearLabel(game.year)} · {seasons[game.seasonIndex]}季</small></header><h2>{event.title}</h2><p className="event-text">{event.text}</p>{!game.outcome ? <div className="options">{event.options.map((option, index) => <button onClick={() => onChoose(option)} key={option.label}><i>{String.fromCharCode(65 + index)}</i><div><strong>{option.label}</strong><p>{option.detail}</p><small>{option.requirements && `考验：${requirementText(option.requirements)}　`}{option.chance && `成功率 ${finalOptionChance(option, game.stats, roster, policy, game.difficulty)}%　`}{option.effects && effectText(option.effects)}</small>{option.chance && <div className="chance-results"><em className="success-result"><b>成功</b>{effectText(option.successEffects || {}) || "国势无直接变化"}</em><em className="fail-result"><b>失败</b>{effectText(option.failEffects || {}) || "国势无直接变化"}</em></div>}</div><span>决断</span></button>)}</div> : <div className={`outcome ${game.outcome.alternate ? "alternate" : game.outcome.success === false ? "failure" : ""}`}><span>{game.outcome.alternate ? "新史线" : "奏报"}</span><h3>{game.outcome.title}</h3><p>{game.outcome.text}</p><strong>{effectText(game.outcome.effects) || "国势未直接变动"}</strong><button className="primary" onClick={onContinue}>{game.seasonIndex === 3 ? "封存本年奏牍" : `进入${seasons[game.seasonIndex + 1]}季`}</button></div>}</div>}
        <Chronicle entries={game.chronicle} /></article></div></section>;
}

function YearEnd({ game, onNext }: { game: GameState; onNext: () => void }) {
  const effective = liveState(game.stats).effective;
  const growth = annualGrowth(game.stats, game.policyId, game.difficulty).effects;
  return <div className="year-end"><span>年终奏报</span><h2>{yearLabel(game.year)} · 四时已毕</h2><p>四道决断已写入起居注。常驻修正会随国势即时出现或消失；新岁结算人口、钱粮增长与吏治自然损耗。</p><div className="annual-note"><i>来岁预估</i><strong>人口 {formatDelta(growth.population)}　钱粮 {formatDelta(growth.grain)}　吏治 {formatDelta(growth.integrity)}</strong></div><div className="warning-row">{effective.army < 55 && <span>⚑ 武备低迷，来年边患概率上升</span>}{effective.sentiment <= -60 && <span>⚠ 民怨沸腾，起义正在酝酿</span>}{liveState(game.stats).modifiers.supply < 0 && <span>▱ 钱粮不足以供养人口，民情与武备正受拖累</span>}{game.stats.integrity < -30 && <span>◇ 贪腐正在侵蚀增长与民情</span>}</div><button className="primary xl" onClick={onNext}>{game.elapsed >= 500 ? "验看五百年国运" : "颁新历 · 进入下一年"}</button></div>;
}

function Chronicle({ entries }: { entries: Chronicle[] }) {
  const visible = entries.slice(-6).reverse();
  return <div className="chronicle"><header><span>起居注</span><small>最近六则</small></header>{visible.map((entry, index) => <div key={`${entry.year}-${entry.season}-${index}`}><time>{yearLabel(entry.year)} · {entry.season}</time><b>{entry.title}</b><p>{entry.note}</p></div>)}</div>;
}

function Ending({ game, script, onRestart, onSaves }: { game: GameState; script: Script; onRestart: () => void; onSaves: () => void }) {
  const effective = liveState(game.stats).effective;
  const score = clamp(game.elapsed * 2 + effective.population + effective.grain + effective.army + effective.sentiment + effective.integrity, 0, 9999);
  return <section className={`ending ${game.endingVictory ? "victory" : "defeat"}`}><div className="ending-card"><span className="ending-kicker">{game.endingVictory ? "千古一朝" : "国祚已终"}</span><div className="ending-seal">{game.endingVictory ? "盛" : "殁"}</div><h1>{script.dynasty}祚 · {game.elapsed}年</h1><p>{game.endingReason}</p><div className="ending-stats"><div><small>最后年份</small><strong>{yearLabel(game.year)}</strong></div><div><small>治世评定</small><strong>{score}</strong></div><div><small>历史线</small><strong>{game.alteredHistory ? "另开新史" : "大势未改"}</strong></div></div><blockquote>“{game.chronicle[game.chronicle.length - 1]?.note}”</blockquote><div><button className="primary" onClick={onRestart}>再开一纪</button><button className="ghost" onClick={onSaves}>读取存档</button></div></div></section>;
}

function SaveDrawer({ saves, current, onClose, onSave, onLoad, onDelete }: { saves: (GameState | null)[]; current: GameState | null; onClose: () => void; onSave: (slot: number) => void; onLoad: (slot: number) => void; onDelete: (slot: number) => void }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="save-drawer" role="dialog" aria-modal="true" aria-label={current ? "存读档" : "读取存档"}><header><div><span>本地纪年库</span><h2>{current ? "存读档" : "读取存档"}</h2></div><button onClick={onClose} aria-label="关闭">×</button></header><p className="save-explain">存档只保存在这台设备的浏览器中。只有进入治国阶段才能写入或覆盖；读取与删除旧档不受限制。每局随机进程固定，读档不会重掷事件或判定结果。</p><div className="save-slots">{saves.map((save, index) => { const savedScript = save && scripts.find((item) => item.id === save.scriptId); return <article className={save ? "occupied" : ""} key={index}><span>档案 {index + 1}</span>{save ? <><h3>{savedScript?.title}</h3><p>{difficultyRule(save.difficulty).name}难度 · {yearLabel(save.year)} · 国祚第{save.elapsed}年</p><small>人口 {save.stats.population}　钱粮 {save.stats.grain}　武备 {save.stats.army}</small><div><button onClick={() => onLoad(index)}>读取</button>{current && <button onClick={() => onSave(index)}>覆盖</button>}<button className="danger" onClick={() => onDelete(index)}>删除</button></div></> : <><h3>空白卷宗</h3><p>尚未写入任何王朝。</p>{current ? <button className="primary" onClick={() => onSave(index)}>存入此槽</button> : <small>进入治国阶段后方可存档</small>}</>}</article> })}</div></section></div>;
}

export default App;
