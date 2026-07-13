"use client";

import { useState } from "react";

type Phase = "landing" | "script" | "policy" | "roster" | "reign" | "ending";
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
};

type EventTemplate = {
  id: string;
  title: string;
  category: string;
  text: string;
  historical?: boolean;
  scriptId?: string;
  year?: number;
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
  version: 2;
  phase: Phase;
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
};

type SeatAssignments = Record<Role, string | null>;

const seasons: Season[] = ["春", "夏", "秋", "冬"];
const roles: Role[] = ["皇帝", "宰相", "名将", "财政", "监察"];
const emptySeats = (): SeatAssignments => ({ 皇帝: null, 宰相: null, 名将: null, 财政: null, 监察: null });
const statNames: Record<StatKey, string> = {
  population: "人口",
  grain: "钱粮",
  army: "武备",
  sentiment: "民情",
  integrity: "官风",
};

const scripts: Script[] = [
  { id: "qin", title: "秦始皇纪", ruler: "嬴政", dynasty: "秦", startYear: -221, startLabel: "始皇二十六年 · 一统六国", color: "#b78b3e", motto: "六合一统，法度初成", description: "从登基称帝之年开始。疆域空前，制度锋利，而天下民力已经绷紧。", base: { population: 92, grain: 98, army: 92, sentiment: -18, integrity: 18 } },
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
  { id: "reform", name: "整顿朝纲", seal: "治", desc: "考课百官，澄清吏治。官场风气更清明，剧烈改革也会触动既得利益。", effects: { grain: 4, integrity: 18, sentiment: -2 } as Partial<Stats>, tag: "吏治" as SkillTag },
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
    { label: "封锁灾区", detail: "保住库藏，但民怨会越过堤坝。", effects: { population: -8, sentiment: -18, integrity: -5 } },
  ]},
  { id: "drought", title: "赤地无雨", category: "灾异", text: "入夏无雨，禾苗枯卷。太史令称需祈雨，司农则请求立刻调粮。", options: [
    { label: "跨郡转运", detail: "损耗巨大，却最可靠。", effects: { grain: -14, population: -1, sentiment: 12 } },
    { label: "减膳祈雨并平粜", detail: "仪式与实政并行。", chance: 60, tag: "财政", successEffects: { grain: -7, sentiment: 9 }, failEffects: { grain: -10, population: -4, sentiment: -7 } },
    { label: "听其自救", detail: "朝廷没有损失，天下却有。", effects: { population: -9, sentiment: -16 } },
  ]},
  { id: "auspicious", title: "甘露降庭", category: "祥瑞", text: "宫苑老柏降下甘露，百官请上尊号、大赦天下。民间也在等待朝廷的态度。", options: [
    { label: "大赦并减今年租", detail: "把祥瑞变成百姓摸得到的恩典。", effects: { grain: -6, sentiment: 13 } },
    { label: "却尊号，奖农桑", detail: "不迷信天意，把功劳归于万民。", effects: { sentiment: 7, integrity: 7, grain: 3 } },
    { label: "大兴庆典", detail: "盛世声势很足，花费也很足。", effects: { grain: -10, sentiment: 5, integrity: -3 } },
  ]},
  { id: "academy", title: "太学论政", category: "文教", text: "太学生上书议论时政，有言辞激烈者。朝臣争论：年轻人的声音是国之元气，还是朋党之始？", options: [
    { label: "召见问策", detail: "纳言也考验君臣的胸襟。", chance: 65, tag: "谋略", successEffects: { sentiment: 9, integrity: 7 }, failEffects: { sentiment: -2, integrity: -3 } },
    { label: "令有司择善而行", detail: "制度化吸收意见。", effects: { sentiment: 4, integrity: 5 } },
    { label: "严禁妄议", detail: "朝堂安静得更快。", effects: { integrity: -5, sentiment: -10 } },
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
    { label: "闭关遣返", detail: "不添负担，也伤仁德。", effects: { sentiment: -9 } },
  ]},
  { id: "palace", title: "营建宫室", category: "朝堂", text: "将作监称旧宫狭陋，不足彰显国威；群臣都知道，这笔账最终要落在百姓头上。", options: [
    { label: "罢役，修官舍学校", detail: "国威不只在宫阙。", effects: { grain: -4, sentiment: 9, integrity: 4 } },
    { label: "量入为出，小修旧宫", detail: "顾全体面，也控制开支。", effects: { grain: -7, sentiment: 1 } },
    { label: "大兴土木", detail: "壮丽工程能提振威仪，但代价沉重。", effects: { grain: -20, population: -3, sentiment: -14, integrity: -4 } },
  ]},
  { id: "rebellion", title: "揭竿四起", category: "民变", text: "长期积压的民怨终于点燃。饥民攻破县城，裹挟者日众，地方官已无法收拾。", options: [
    { label: "赈抚并诛贪官", detail: "需要足够钱粮与清明官风。", requirements: { grain: 35, integrity: -20 }, failOnUnmet: true, effects: { grain: -18, sentiment: 25, integrity: 10, army: -3 } },
    { label: "遣精兵平乱", detail: "武备不足，出兵就是押上国运。", requirements: { army: 75 }, failOnUnmet: true, effects: { army: -12, population: -8, sentiment: -12 } },
    { label: "招安首领", detail: "暂息兵火，后患难测。", chance: 48, tag: "谋略", successEffects: { sentiment: 12, army: 3 }, failEffects: { army: -14, grain: -9, sentiment: -8 } },
  ]},
  { id: "invasion", title: "烽火入塞", category: "边患", text: "敌骑越塞，三郡告急。多年的武备松弛在这一刻都写进了战报。", options: [
    { label: "亲征迎敌", detail: "武力不足则国门洞开。", requirements: { army: 70 }, failOnUnmet: true, effects: { army: -10, grain: -10, sentiment: 8 } },
    { label: "坚壁清野", detail: "以空间换时间。", effects: { population: -5, grain: -8, army: 4, sentiment: -7 } },
    { label: "遣使议和", detail: "谋臣能争来喘息，也可能换来屈辱。", chance: 52, tag: "谋略", successEffects: { grain: -8, army: 2 }, failEffects: { grain: -15, sentiment: -10, army: -6 } },
  ]},
];

const historicalEvents: EventTemplate[] = [
  { id: "qin-sandhill", scriptId: "qin", year: -210, historical: true, title: "沙丘风雷", category: "历史大事", text: "东巡途中，皇帝病势沉重。中车府令与丞相在车驾外交换眼色，一纸遗诏将决定帝国走向。", options: [
    { label: "公开遗诏，扶苏即位", detail: "若朝纲清明、民心未失，可斩断沙丘之谋。", rewardRequirements: { integrity: 35, sentiment: 0 }, alternateText: "沙丘之谋未成，扶苏与蒙恬稳住帝国，秦亡的旧轨被彻底改写。", effects: { integrity: 12, sentiment: 14, army: 4 } },
    { label: "秘不发丧，依旧东归", detail: "官风腐败时，密谋将吞噬王朝。", requirements: { integrity: 5 }, failOnUnmet: true, effects: { integrity: -18, sentiment: -12 } },
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
    { label: "整肃宿卫，收编旧部", detail: "清明官风可提前识破刺客。", rewardRequirements: { integrity: 32, sentiment: 25 }, alternateText: "刺客在动手前落网。孙策得以继续北图中原，江东命运由此改写。", effects: { integrity: 9, army: 7 } },
    { label: "照常出猎，不疑左右", detail: "若武备与民心不能震慑宵小，此行便是终局。", requirements: { army: 95, sentiment: 10 }, failOnUnmet: true, effects: { army: -8, sentiment: -8 } },
  ]},
  { id: "liuyu-north", scriptId: "liuyu", year: 417, historical: true, title: "长安得失", category: "历史大事", text: "北伐连克洛阳、长安，关中父老夹道相迎。但后方权力不稳，留守与回师只能二选一。", options: [
    { label: "增兵关中，完成北定", detail: "国力雄厚、朝纲清明，才守得住胜利。", requirements: { grain: 90, army: 105 }, failOnUnmet: true, rewardRequirements: { grain: 125, army: 120, integrity: 35 }, alternateText: "关中守住，北魏受挫，南北统一第一次真正成为现实。", effects: { grain: -25, army: -12, sentiment: 15 } },
    { label: "回师建康，稳固根本", detail: "放弃长安，换取南方权力。", effects: { army: -8, integrity: 10, sentiment: -5 } },
  ]},
  { id: "taizong-xuanwu", scriptId: "taizong", year: 626, historical: true, title: "玄武门前", category: "历史大事", text: "兄弟相逼，储位之争已无退路。玄武门紧闭之前，所有人都在等待第一支箭。", options: [
    { label: "先发制人", detail: "军心不足，宫门之变必败。", requirements: { army: 90 }, failOnUnmet: true, effects: { army: -8, integrity: -10, sentiment: -6 } },
    { label: "请高祖召集廷议", detail: "朝纲清明到足以约束诸王，或可避开骨肉相残。", rewardRequirements: { integrity: 55, sentiment: 35 }, alternateText: "储位争端在廷议中解决，玄武门没有染血，贞观以另一种方式开启。", effects: { integrity: 10, sentiment: 8 } },
  ]},
  { id: "song-cup", scriptId: "song", year: 961, historical: true, title: "杯酒释兵权", category: "历史大事", text: "宿将掌禁军，五代旧习仍在。今夜一席酒，可以不流血地重写君臣边界。", options: [
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
      army: clamp(stats.army + army, 0, 260),
      sentiment: clamp(stats.sentiment + sentiment, -100, 100),
    },
    modifiers: { army, grainNeed, supply, governance, sentiment },
  };
}

function finalOptionChance(option: EventOption, stats: Stats, roster: Person[], policy: typeof policies[number]) {
  if (!option.chance) return 0;
  const effective = liveState(stats).effective;
  const members = option.tag ? roster.filter((person) => person.tags.includes(option.tag!)).length : 0;
  const policyBoost = option.tag && policy.tag === option.tag ? 8 : 0;
  const teamBoost = members * 7 + policyBoost;
  const statBoost = option.tag === "军事" ? Math.max(-8, (effective.army - 70) / 20) : option.tag === "财政" ? (effective.grain - 70) / 20 : option.tag === "吏治" ? effective.integrity / 20 : option.tag === "民生" ? effective.sentiment / 20 : (effective.integrity + effective.sentiment) / 20;
  return clamp(option.chance + teamBoost + statBoost, 1, 100);
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

function seededShuffle<T>(items: T[], seed: number) {
  const copy = [...items];
  let value = Math.abs(seed) + 1;
  for (let i = copy.length - 1; i > 0; i--) {
    value = (value * 9301 + 49297) % 233280;
    const j = Math.floor((value / 233280) * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildYearEvents(scriptId: string, year: number, stats: Stats, lowArmyYears: number, unrestYears: number) {
  const effective = liveState(stats).effective;
  const required = historicalEvents.filter((event) => event.scriptId === scriptId && event.year === year).slice(0, 4);
  const conditional: EventTemplate[] = [];
  if (effective.army < 55 && lowArmyYears >= 1) conditional.push(randomEvents.find((event) => event.id === "invasion")!);
  if (effective.sentiment <= -60 && unrestYears >= 1) conditional.push(randomEvents.find((event) => event.id === "rebellion")!);
  const excluded = new Set(conditional.map((event) => event.id));
  const base = randomEvents.filter((event) => !["invasion", "rebellion"].includes(event.id) && !excluded.has(event.id));
  const picked = seededShuffle(base, year * 37 + stats.population * 11 + stats.grain).slice(0, 4);
  const events = [...conditional, ...picked].slice(0, 4);
  while (events.length < 4) events.push(picked[events.length % picked.length]);
  required.forEach((event, index) => { events[(Math.abs(year) + index) % 4] = event; });
  return events;
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
  return { ...saved, version: 2, seatAssignments, rosterIds } as GameState;
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
  const [scriptId, setScriptId] = useState("qin");
  const [policyId, setPolicyId] = useState("rest");
  const [rosterSeats, setRosterSeats] = useState<SeatAssignments>(emptySeats);
  const [rosterRound, setRosterRound] = useState(0);
  const [redrawsLeft, setRedrawsLeft] = useState(3);
  const [candidateIds, setCandidateIds] = useState<string[]>([]);
  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [savesOpen, setSavesOpen] = useState(false);
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
    const variance = (offset: number) => ((Date.now() >> offset) % 11) - 5;
    let stats = { ...script.base };
    stats = addEffects(stats, policy.effects);
    roster.forEach((person) => { stats = addEffects(stats, person.bonuses); });
    stats = addEffects(stats, { population: variance(2), grain: variance(4), army: variance(6), sentiment: variance(8), integrity: variance(10) });
    const growth = annualGrowth(stats, policyId);
    stats = addEffects(stats, growth.effects);
    const effective = liveState(stats).effective;
    const initial: GameState = {
      version: 2, phase: "reign", scriptId, policyId, rosterIds, seatAssignments: rosterSeats, year: script.startYear, elapsed: 1, seasonIndex: 0,
      stats, events: buildYearEvents(scriptId, script.startYear, stats, 0, 0), outcome: null,
      chronicle: [{ year: script.startYear, season: "春", title: "开国建元", note: `${people.find((person) => person.id === rosterSeats.皇帝)?.name || "新君"}与开国班底共治天下。${growth.note}` }],
      lowArmyYears: effective.army < 55 ? 1 : 0, unrestYears: effective.sentiment <= -60 ? 1 : 0, alteredHistory: false,
      annualNote: growth.note, endingReason: "", endingVictory: false,
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
      if (option.chance) {
        const finalChance = finalOptionChance(option, current.stats, roster, policy);
        success = Math.random() * 100 < finalChance;
        effects = success ? (option.successEffects || {}) : (option.failEffects || {});
        resultText = success ? `班底各展所长，决策奏效（成功率 ${Math.round(finalChance)}%）。` : `局势未如所愿，代价已经显现（成功率 ${Math.round(finalChance)}%）。`;
      }
      const alternate = !!option.alternateText && meets(effectiveCurrent, option.rewardRequirements);
      if (alternate) resultText = option.alternateText!;
      const stats = addEffects(current.stats, effects);
      if (stats.population < 18 || stats.grain <= 0) {
        const cause = stats.population < 18 ? "人口跌破王朝存续底线" : "国库钱粮耗尽";
        return { ...current, stats, phase: "ending", endingVictory: false, endingReason: `${cause}。地方失去供养与秩序，国祚就此断绝。`, chronicle: [...current.chronicle, { year: current.year, season: seasons[current.seasonIndex], title: "山河易色", note: `${event.title}之后，${cause}。` }] };
      }
      return { ...current, stats, alteredHistory: current.alteredHistory || alternate, outcome: { title: alternate ? "历史改写" : success === false ? "事与愿违" : "诏令已行", text: resultText, effects, success, alternate }, chronicle: [...current.chronicle, { year: current.year, season: seasons[current.seasonIndex], title: event.title, note: `${option.label}。${resultText}` }].slice(-30) };
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
      const growth = annualGrowth(current.stats, current.policyId);
      const stats = addEffects(current.stats, growth.effects);
      if (stats.population < 18 || stats.grain <= 0) return { ...current, year, stats, phase: "ending", endingVictory: false, endingReason: stats.grain <= 0 ? "岁首核账，国库已经无粮可支，天下由此土崩瓦解。" : "连年凋敝后，编户不足以支撑国家，王朝悄然终结。" };
      const effective = liveState(stats).effective;
      const lowArmyYears = effective.army < 55 ? current.lowArmyYears + 1 : 0;
      const unrestYears = effective.sentiment <= -60 ? current.unrestYears + 1 : 0;
      return { ...current, year, elapsed: current.elapsed + 1, stats, seasonIndex: 0, outcome: null, annualNote: growth.note, lowArmyYears, unrestYears, events: buildYearEvents(current.scriptId, year, stats, lowArmyYears, unrestYears), chronicle: [...current.chronicle, { year, season: "春", title: "岁首国计", note: growth.note }].slice(-30) };
    });
  };

  const saveGame = (slot: number) => {
    if (!game || displayPhase !== "reign") return;
    localStorage.setItem(`dynasty-save-${slot}`, JSON.stringify({ ...game, phase: game.phase === "ending" ? "ending" : "reign" }));
    setSaveMeta((items) => items.map((item, index) => index === slot ? game : item));
  };

  const loadGame = (slot: number) => {
    const saved = saveMeta[slot];
    if (!saved) return;
    setGame(saved); setScriptId(saved.scriptId); setPolicyId(saved.policyId); setRosterSeats(saved.seatAssignments); setRosterRound(5); setCandidateIds([]); setPhase(saved.phase); setSavesOpen(false);
  };

  const deleteSave = (slot: number) => {
    localStorage.removeItem(`dynasty-save-${slot}`);
    setSaveMeta((items) => items.map((item, index) => index === slot ? null : item));
  };

  const restart = () => { setGame(null); setPhase("script"); setRosterSeats(emptySeats()); setRosterRound(0); setRedrawsLeft(3); setCandidateIds([]); setActivePersonId(null); setSavesOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <main className={`app phase-${displayPhase}`}>
      <div className="grain-overlay" />
      {displayPhase !== "landing" && <TopBar setPhase={setPhase} openSaves={() => setSavesOpen(true)} game={game} canSave={displayPhase === "reign"} />}

      {displayPhase === "landing" && <Landing onStart={() => setPhase("script")} onLoad={() => setSavesOpen(true)} />}
      {displayPhase === "script" && <ScriptSelect selected={scriptId} onSelect={setScriptId} onNext={() => setPhase("policy")} />}
      {displayPhase === "policy" && <PolicySelect selected={policyId} onSelect={setPolicyId} onBack={() => setPhase("script")} onNext={beginRoster} />}
      {displayPhase === "roster" && <RosterSelect seats={rosterSeats} round={rosterRound} redrawsLeft={redrawsLeft} candidates={candidateIds.map((id) => people.find((person) => person.id === id)).filter(Boolean) as Person[]} activePersonId={activePersonId} onActivate={setActivePersonId} onCanMove={canMovePerson} onMove={movePerson} onRedraw={redrawCandidates} onSelect={selectPerson} onBack={() => setPhase("policy")} onStart={startReign} />}
      {displayPhase === "reign" && game && <Reign game={game} script={script} policy={policy} roster={roster} onChoose={chooseOption} onContinue={continueSeason} onNextYear={beginNextYear} onSave={() => setSavesOpen(true)} />}
      {displayPhase === "ending" && game && <Ending game={game} script={script} onRestart={restart} onSaves={() => setSavesOpen(true)} />}

      {savesOpen && <SaveDrawer saves={saveMeta} current={displayPhase === "reign" ? game : null} onClose={() => setSavesOpen(false)} onSave={saveGame} onLoad={loadGame} onDelete={deleteSave} />}
    </main>
  );
}

function annualGrowth(stats: Stats, policyId: string) {
  const effective = liveState(stats).effective;
  const rest = policyId === "rest" ? 1.5 : 0;
  const governanceGrowth = effective.integrity / 48;
  const population = clamp(2.2 + effective.sentiment / 32 + rest + governanceGrowth, -8, 8);
  const grain = clamp(stats.population * .075 + (policyId === "rest" ? 5 : 0) + effective.integrity / 18 - stats.population * .05 - effective.army * .025, -20, 20);
  const integrity = -2;
  const effects = { population, grain, integrity };
  return {
    effects,
    note: `户口${population >= 0 ? "增" : "减"}${Math.abs(population)}，府库${grain >= 0 ? "盈" : "耗"}${Math.abs(grain)}，官风自然损耗${Math.abs(integrity)}。`,
    breakdown: {
      population: [
        { label: `民情 ${formatDelta(effective.sentiment / 32)}`, value: effective.sentiment / 32, detail: `有效民情 ${effective.sentiment} ÷ 32 = ${formatDelta(effective.sentiment / 32)}，计入每年人口增长；民情变化后立即重算。` },
        ...(rest ? [{ label: "休养 +1.5", value: 1.5, detail: "国策“休养生息”固定使每年人口增长 +1.5；更换国策后消失。" }] : []),
        ...(governanceGrowth ? [{ label: `官风 ${formatDelta(governanceGrowth)}`, value: governanceGrowth, detail: `当前官风 ${effective.integrity} ÷ 48 = ${formatDelta(governanceGrowth)}，计入每年人口增长；正官风为增益，负官风为减益，官风归零时消失。` }] : []),
      ],
      grain: [
        { label: `人口产出 ${formatDelta(stats.population * .075)}`, value: stats.population * .075, detail: `基础人口 ${stats.population} × 0.075 = ${formatDelta(stats.population * .075)}，计入每年钱粮增长。` },
        { label: `民用 ${formatDelta(-stats.population * .05)}`, value: -stats.population * .05, detail: `基础人口 ${stats.population} × 0.05 = ${formatDelta(stats.population * .05)}，作为每年民用消耗。` },
        { label: `军费 ${formatDelta(-effective.army * .025)}`, value: -effective.army * .025, detail: `当前有效武备 ${effective.army} × 0.025 = ${formatDelta(effective.army * .025)}，作为每年军费消耗。` },
        { label: `官风 ${formatDelta(effective.integrity / 18)}`, value: effective.integrity / 18, detail: `当前有效官风 ${effective.integrity} ÷ 18 = ${formatDelta(effective.integrity / 18)}，计入每年钱粮增长；官风变化后立即重算。` },
        ...(policyId === "rest" ? [{ label: "休养 +5", value: 5, detail: "国策“休养生息”固定使每年钱粮增长 +5；更换国策后消失。" }] : []),
      ],
      integrity: [{ label: "积弊滋生 -2", value: integrity, detail: "官场每年都会自然滋生积弊，岁首固定扣减官风 2 点。此项不改变当前官风，只有进入下一年时才结算；需要通过事件中的整饬吏治持续弥补。" }],
    },
  };
}

function formatDelta(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded >= 0 ? "+" : ""}${rounded}`;
}

function Landing({ onStart, onLoad }: { onStart: () => void; onLoad: () => void }) {
  return <section className="landing">
    <div className="mountain mountain-a" /><div className="mountain mountain-b" />
    <div className="landing-inner">
      <div className="eyebrow"><span />五人开朝 · 四时治世<span /></div>
      <div className="seal">国<br />祚</div>
      <h1>五百年<br /><em>王朝</em></h1>
      <p className="hero-copy">择一段历史为局，定一条治国之道，携四位股肱之臣走过每个春夏秋冬。<br />这一次，结局不由一次随机判词决定。</p>
      <div className="hero-actions"><button className="primary xl" onClick={onStart}>选择剧本 · 开国</button><button className="ghost" onClick={onLoad}>读取旧档</button></div>
      <div className="hero-rules"><span>五项国势彼此牵引</span><i>◆</i><span>历史大事必然发生</span><i>◆</i><span>五百年方成千古一朝</span></div>
    </div>
  </section>;
}

function Progress({ active }: { active: number }) {
  return <div className="progress" aria-label="开国进度">{["历史剧本", "国策方向", "开国班底"].map((label, index) => <div className={index <= active ? "active" : ""} key={label}><b>0{index + 1}</b><span>{label}</span></div>)}</div>;
}

function ScriptSelect({ selected, onSelect, onNext }: { selected: string; onSelect: (id: string) => void; onNext: () => void }) {
  const chosen = scripts.find((item) => item.id === selected)!;
  return <section className="setup-page"><Progress active={0} /><header className="setup-heading"><span>第一诏</span><h2>选择历史剧本</h2><p>历史给你一道开局，但不会替你写下结局。</p></header>
    <div className="script-layout"><div className="script-grid">{scripts.map((item) => <button key={item.id} className={`script-card ${selected === item.id ? "selected" : ""}`} onClick={() => onSelect(item.id)} style={{ "--accent": item.color } as React.CSSProperties}><span className="dynasty">{item.dynasty}</span><h3>{item.title}</h3><p>{item.motto}</p><small>{item.startLabel}</small></button>)}</div>
      <aside className="script-detail" style={{ "--accent": chosen.color } as React.CSSProperties}><div className="big-seal">{chosen.dynasty.slice(0, 2)}</div><span className="kicker">历史原型</span><h3>{chosen.ruler}</h3><strong>{yearLabel(chosen.startYear)}</strong><p>{chosen.description} 剧本只决定时代与历史事件，稍后仍可选择任意皇帝入席。</p><div className="initial-stats"><span>人口 {chosen.base.population}</span><span>钱粮 {chosen.base.grain}</span><span>武备 {chosen.base.army}</span></div><button className="primary" onClick={onNext}>以此纪开局</button></aside>
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
  return <nav className="topbar"><button className="brand" onClick={() => !game && setPhase("landing")}><i>祚</i><span>五百年王朝<small>RISE OF DYNASTY</small></span></button><div><span className="top-status">{game ? `${yearLabel(game.year)} · 国祚第${game.elapsed}年` : "正在开国"}</span><button className="nav-button" onClick={openSaves}>▣ {canSave ? "存读档" : "读取旧档"}</button></div></nav>;
}

function StatPanel({ stats, policyId }: { stats: Stats; policyId: string }) {
  const growth = annualGrowth(stats, policyId);
  const live = liveState(stats);
  const sentimentBuffs = [
    live.modifiers.supply && { label: `供养不足 ${live.modifiers.supply}`, value: live.modifiers.supply, detail: `人口需要钱粮 ${formatDelta(live.modifiers.grainNeed).slice(1)}（人口 ${stats.population} × 0.8）。当前钱粮 ${stats.grain} 低于需求线，缺口占需求的比例 × 24 并四舍五入，民情 ${live.modifiers.supply}；钱粮达到需求线后立即消失。` },
    live.modifiers.governance && { label: `${live.modifiers.governance > 0 ? "清明" : "贪腐"} ${formatDelta(live.modifiers.governance)}`, value: live.modifiers.governance, detail: `官风绝对值 ${Math.abs(stats.integrity)} ÷ 16 并四舍五入，再保留官风正负号，得到民情 ${formatDelta(live.modifiers.governance)}；正官风为“清明”增益，负官风为“贪腐”减益，官风接近 0 时消失。` },
  ].filter(Boolean) as ModifierView[];
  const integrityBuffs: ModifierView[] = [];
  return <div className="stats-panel">
    <div className="number-stat"><span>户</span><div><small>人口 · 万户</small><strong>{stats.population}<b className={growth.effects.population >= 0 ? "growth-up" : "growth-down"}>{formatDelta(growth.effects.population)}</b></strong><em>下年增长</em><div className="stat-buffs">{growth.breakdown.population.map((item) => <ModifierChip item={item} key={item.label} />)}</div></div></div>
    <div className="number-stat"><span>仓</span><div><small>钱粮 · 国用</small><strong>{stats.grain}<b className={growth.effects.grain >= 0 ? "growth-up" : "growth-down"}>{formatDelta(growth.effects.grain)}</b></strong><em>下年增长</em><div className="stat-buffs">{growth.breakdown.grain.map((item) => <ModifierChip item={item} key={item.label} />)}</div></div></div>
    <div className="number-stat"><span>兵</span><div><small>武备 · 基础 {stats.army}</small><strong>{live.effective.army}</strong><em>当前实效</em><div className="stat-buffs"><ModifierChip item={{ label: `人口 +${live.modifiers.army}`, value: live.modifiers.army, detail: `基础人口 ${stats.population} × 0.18 并四舍五入，为当前武备 +${live.modifiers.army}；人口变化后立即重算。` }} /></div></div></div>
    <AxisStat label="民情" value={live.effective.sentiment} baseValue={stats.sentiment} modifiers={sentimentBuffs} text={axisLabel("sentiment", live.effective.sentiment)} left="民怨沸腾" right="安居乐业" />
    <AxisStat label="官场风气" value={live.effective.integrity} baseValue={stats.integrity} modifiers={integrityBuffs} annualChange={growth.effects.integrity} annualDetail={growth.breakdown.integrity[0].detail} text={axisLabel("integrity", live.effective.integrity)} left="贪墨成风" right="海内澄清" />
  </div>;
}

type ModifierView = { label: string; value: number; detail: string };

function ModifierChip({ item }: { item: ModifierView }) {
  return <i className={item.value < 0 ? "debuff" : "buff"} tabIndex={0}>{item.label}<span role="tooltip">{item.detail}</span></i>;
}

function AxisStat({ label, value, baseValue, modifiers, annualChange, annualDetail, text, left, right }: { label: string; value: number; baseValue: number; modifiers: ModifierView[]; annualChange?: number; annualDetail?: string; text: string; left: string; right: string }) {
  return <div className="axis-stat"><div><small>{label} · 基础 {baseValue}</small><strong>{text}</strong><span className="axis-values"><b>{value}</b>{annualChange !== undefined && <em className={annualChange < 0 ? "annual-delta negative" : "annual-delta positive"} tabIndex={0}>{formatDelta(annualChange)}<span role="tooltip">{annualDetail}</span></em>}</span></div>{modifiers.length > 0 && <div className="stat-buffs">{modifiers.map((item) => <ModifierChip item={item} key={item.label} />)}</div>}<div className="axis"><i style={{ left: `${(value + 100) / 2}%` }} /></div><footer><span>{left}</span><span>{right}</span></footer></div>;
}

function Reign({ game, script, policy, roster, onChoose, onContinue, onNextYear, onSave }: { game: GameState; script: Script; policy: typeof policies[number]; roster: Person[]; onChoose: (option: EventOption) => void; onContinue: () => void; onNextYear: () => void; onSave: () => void }) {
  const event = game.events[Math.min(game.seasonIndex, 3)];
  const isYearEnd = game.seasonIndex === 4;
  const assigned = (role: Role) => roster.find((person) => person.id === game.seatAssignments[role]);
  const emperor = assigned("皇帝");
  return <section className="reign-page"><div className="reign-header"><div><span>{script.title} · 君主 {emperor?.name}</span><h1>{yearLabel(game.year)}</h1><p>国祚第 {game.elapsed} 年 · 国策「{policy.name}」{game.alteredHistory && <b> · 已偏离原有历史线</b>}</p></div><div className="reign-actions"><button onClick={onSave}>存档</button></div></div><div className="reign-grid"><aside><StatPanel stats={game.stats} policyId={game.policyId} /><div className="cabinet"><header><span>治国班底</span><small>对应专长使事件成功率 +7%</small></header><div className="cabinet-ruler"><i>{emperor?.dynasty.slice(0, 1) || "帝"}</i><div><small>皇帝 · {emperor?.dynasty}</small><b>{emperor?.name}</b></div></div>{roles.slice(1).map((role) => { const person = assigned(role); return <div className="cabinet-person" key={role}><div><small>{role}</small><b>{person?.name}</b></div><span>{person?.tags.join(" · ")}</span></div> })}</div></aside>
      <article className="court"><div className="yearline">{seasons.map((season, index) => <div className={index < game.seasonIndex ? "done" : index === game.seasonIndex ? "active" : ""} key={season}><i>{index < game.seasonIndex ? "✓" : season}</i><span>{season}{index === 0 ? "耕" : index === 1 ? "长" : index === 2 ? "收" : "藏"}</span></div>)}</div>
        {isYearEnd ? <YearEnd game={game} onNext={onNextYear} /> : <div className={`event-card ${event.historical ? "historical" : ""}`}><header><div><span>{event.category}</span>{event.historical && <b>必至的历史节点</b>}</div><small>{yearLabel(game.year)} · {seasons[game.seasonIndex]}季</small></header><h2>{event.title}</h2><p className="event-text">{event.text}</p>{!game.outcome ? <div className="options">{event.options.map((option, index) => <button onClick={() => onChoose(option)} key={option.label}><i>{String.fromCharCode(65 + index)}</i><div><strong>{option.label}</strong><p>{option.detail}</p><small>{option.requirements && `考验：${requirementText(option.requirements)}　`}{option.chance && `成功率 ${finalOptionChance(option, game.stats, roster, policy)}%　`}{option.effects && effectText(option.effects)}</small>{option.chance && <div className="chance-results"><em className="success-result"><b>成功</b>{effectText(option.successEffects || {}) || "国势无直接变化"}</em><em className="fail-result"><b>失败</b>{effectText(option.failEffects || {}) || "国势无直接变化"}</em></div>}</div><span>决断</span></button>)}</div> : <div className={`outcome ${game.outcome.alternate ? "alternate" : game.outcome.success === false ? "failure" : ""}`}><span>{game.outcome.alternate ? "新史线" : "奏报"}</span><h3>{game.outcome.title}</h3><p>{game.outcome.text}</p><strong>{effectText(game.outcome.effects) || "国势未直接变动"}</strong><button className="primary" onClick={onContinue}>{game.seasonIndex === 3 ? "封存本年奏牍" : `进入${seasons[game.seasonIndex + 1]}季`}</button></div>}</div>}
        <Chronicle entries={game.chronicle} /></article></div></section>;
}

function YearEnd({ game, onNext }: { game: GameState; onNext: () => void }) {
  const effective = liveState(game.stats).effective;
  const growth = annualGrowth(game.stats, game.policyId).effects;
  return <div className="year-end"><span>年终奏报</span><h2>{yearLabel(game.year)} · 四时已毕</h2><p>四道决断已写入起居注。常驻修正会随国势即时出现或消失；新岁结算人口、钱粮增长与官风自然损耗。</p><div className="annual-note"><i>来岁预估</i><strong>人口 {formatDelta(growth.population)}　钱粮 {formatDelta(growth.grain)}　官风 {formatDelta(growth.integrity)}</strong></div><div className="warning-row">{effective.army < 55 && <span>⚑ 武备低迷，来年边患概率上升</span>}{effective.sentiment <= -60 && <span>⚠ 民怨沸腾，起义正在酝酿</span>}{liveState(game.stats).modifiers.supply < 0 && <span>▱ 钱粮不足以供养人口，民情正受拖累</span>}{game.stats.integrity < -30 && <span>◇ 贪腐正在侵蚀增长与民情</span>}</div><button className="primary xl" onClick={onNext}>{game.elapsed >= 500 ? "验看五百年国运" : "颁新历 · 进入下一年"}</button></div>;
}

function Chronicle({ entries }: { entries: Chronicle[] }) {
  const visible = entries.slice(-6).reverse();
  return <div className="chronicle"><header><span>起居注</span><small>最近六则</small></header>{visible.map((entry, index) => <div key={`${entry.year}-${entry.season}-${index}`}><time>{yearLabel(entry.year)} · {entry.season}</time><b>{entry.title}</b><p>{entry.note}</p></div>)}</div>;
}

function Ending({ game, script, onRestart, onSaves }: { game: GameState; script: Script; onRestart: () => void; onSaves: () => void }) {
  const effective = liveState(game.stats).effective;
  const score = clamp(game.elapsed * 2 + effective.population + effective.grain + effective.army + effective.sentiment + effective.integrity, 0, 9999);
  return <section className={`ending ${game.endingVictory ? "victory" : "defeat"}`}><div className="ending-card"><span className="ending-kicker">{game.endingVictory ? "千古一朝" : "国祚已终"}</span><div className="ending-seal">{game.endingVictory ? "盛" : "殁"}</div><h1>{script.dynasty}祚 · {game.elapsed}年</h1><p>{game.endingReason}</p><div className="ending-stats"><div><small>最后年份</small><strong>{yearLabel(game.year)}</strong></div><div><small>治世评定</small><strong>{score}</strong></div><div><small>历史线</small><strong>{game.alteredHistory ? "另开新史" : "大势未改"}</strong></div></div><blockquote>“{game.chronicle[game.chronicle.length - 1]?.note}”</blockquote><div><button className="primary" onClick={onRestart}>再开一纪</button><button className="ghost" onClick={onSaves}>读取旧档</button></div></div></section>;
}

function SaveDrawer({ saves, current, onClose, onSave, onLoad, onDelete }: { saves: (GameState | null)[]; current: GameState | null; onClose: () => void; onSave: (slot: number) => void; onLoad: (slot: number) => void; onDelete: (slot: number) => void }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="save-drawer" role="dialog" aria-modal="true" aria-label={current ? "存读档" : "读取存档"}><header><div><span>本地纪年库</span><h2>{current ? "存读档" : "读取存档"}</h2></div><button onClick={onClose} aria-label="关闭">×</button></header><p className="save-explain">存档只保存在这台设备的浏览器中。只有进入治国阶段才能写入或覆盖；读取与删除旧档不受限制。</p><div className="save-slots">{saves.map((save, index) => { const savedScript = save && scripts.find((item) => item.id === save.scriptId); return <article className={save ? "occupied" : ""} key={index}><span>档案 {index + 1}</span>{save ? <><h3>{savedScript?.title}</h3><p>{yearLabel(save.year)} · 国祚第{save.elapsed}年</p><small>人口 {save.stats.population}　钱粮 {save.stats.grain}　武备 {save.stats.army}</small><div><button onClick={() => onLoad(index)}>读取</button>{current && <button onClick={() => onSave(index)}>覆盖</button>}<button className="danger" onClick={() => onDelete(index)}>删除</button></div></> : <><h3>空白卷宗</h3><p>尚未写入任何王朝。</p>{current ? <button className="primary" onClick={() => onSave(index)}>存入此槽</button> : <small>进入治国阶段后方可存档</small>}</>}</article> })}</div></section></div>;
}

export default App;
