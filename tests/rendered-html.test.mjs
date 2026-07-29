import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server renders the dynasty game landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>五百年王朝｜四时治世<\/title>/i);
  assert.match(html, /五百年/);
  assert.match(html, /开国治世/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("includes the expanded five-round roster, history events, and reign-only saves", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(page, /function shuffleMusicOrder\(length: number, previousIndex\?: number\)/);
  assert.match(page, /order\[0\] === previousIndex/);
  assert.match(page, /currentQueue\.position \+ 1 < currentQueue\.order\.length/);
  assert.match(page, /shuffleMusicOrder\(pool\.length, previousIndex\)/);
  assert.doesNotMatch(`${page}\n${layout}`, /官场风气|官风/);
  for (const title of ["秦始皇纪", "汉高祖纪", "汉武帝纪", "曹操传", "刘备传", "孙策传", "刘裕传", "唐太宗纪", "宋太祖纪", "成吉思汗纪", "明太祖纪"]) assert.match(page, new RegExp(title));
  assert.match(page, /const availableScriptIds = new Set\(\["qin", "liubang"\]\)/);
  assert.match(page, /disabled=\{!available\}/);
  assert.match(page, /敬请期待/);
  assert.match(page, /disabled=\{!chosenAvailable\}/);
  assert.match(page, /剧本只决定时代与历史事件/);
  assert.match(page, /role: "皇帝"/);
  assert.match(page, /secondaryRoles: \["名将"\]/);
  assert.match(page, /person\.secondaryRoles\.find\(\(role\) => !rosterSeats\[role\]\)/);
  assert.match(page, /eligible\.filter\(\(person\) => person\.role === role\)/);
  for (const name of ["汉文帝", "刘秀", "武则天", "忽必烈", "雍正", "张良", "司马懿", "范仲淹", "卫青", "霍去病", "戚继光", "赵过", "汲黯", "狄仁杰", "林则徐"]) assert.match(page, new RegExp(name));
  assert.match(page, /historicalRosterQuotes: Record<string, string>/);
  assert.match(page, /黄忠: "定军山阵斩夏侯渊/);
  assert.match(page, /许褚: "裸衣战马超/);
  assert.match(page, /quote: rosterQuote\(\{ \.\.\.seed, role \}\)/);
  assert.match(page, /primaryRoleOverrides: Partial<Record<string, Role>>/);
  assert.match(page, /商鞅: "财政"/);
  assert.match(page, /张良: "监察"/);
  assert.match(page, /第 \{round \+ 1\} 轮 \/ 共 5 轮/);
  assert.match(page, /const \[redrawsLeft, setRedrawsLeft\] = useState\(3\)/);
  assert.match(page, /换一批人才 · 剩 \{redrawsLeft\} 次/);
  assert.match(page, /disabled=\{redrawsLeft <= 0\}/);
  assert.match(page, /draggable=\{!!person\}/);
  assert.match(page, /displayPhase !== "reign"/);
  assert.match(page, /current=\{displayPhase === "reign" && !game\?\.debugHistory \? game : null\}/);
  assert.match(page, /debugAvailable=\{import\.meta\.env\.DEV\}/);
  assert.match(page, /DEBUG · 仅推演历史事件/);
  assert.doesNotMatch(page, /className="reign-actions"/);
  assert.doesNotMatch(page, /读取旧档/);
  assert.match(page, /已存入档案 \$\{slot \+ 1\}/);
  assert.match(page, /className="save-toast" role="status" aria-live="polite"/);
  assert.match(page, /historicalEvents[\s\S]{0,120}\.filter/);
  for (const scriptId of ["qin", "liubang", "hanwu", "caocao", "liubei", "sunce", "liuyu", "taizong", "song", "genghis", "ming"]) {
    const eventCount = page.match(new RegExp(`scriptId: "${scriptId}"`, "g"))?.length || 0;
    assert.ok(eventCount >= 4, `${scriptId} should have at least four historical events`);
  }
  assert.match(page, /id: "qin"[^\n]+startYear: -246[^\n]+秦王政元年 · 少年即位/);
  assert.ok((page.match(/scriptId: "qin"/g)?.length || 0) >= 22);
  assert.ok((page.match(/scriptId: "hanwu"/g)?.length || 0) >= 11);
  assert.match(page, /title: "少主临朝"[^\n]+text: "相邦吕不韦总揽朝政，宗室、军功贵族与太后宫中各有盘算。"/);
  assert.doesNotMatch(page, /庄襄王新丧，十三岁的嬴政即秦王位/);
  for (const title of ["少主临朝", "卷城鏖兵", "蒙骜攻韩", "东郡初置", "五国攻秦", "彗星再见", "屯留兵变", "蕲年宫变", "逐客风波", "韩国先亡", "邯郸陷落", "图穷匕见", "水灌大梁", "王翦灭楚", "燕代俱平", "凿渠征越", "龙城初捷", "河南之战", "漠南奔袭", "河西两战"]) assert.match(page, new RegExp(title));
  assert.doesNotMatch(page, /蝗疫蔽天|qin-locust-plague/);
  for (const title of ["六合初定", "垓下决楚", "巫蛊祸起", "赤壁风火", "荆州风急", "袁术僭号", "晋宋禅代", "虎牢一战", "陈桥黄袍", "野狐岭破金", "蓝玉案起"]) assert.match(page, new RegExp(title));
  assert.match(page, /className="chance-results"/);
  assert.match(page, /effectText\(option\.successEffects \|\| \{\}\)/);
  assert.match(page, /effectText\(option\.failEffects \|\| \{\}\)/);
  assert.match(page, /function liveState\(stats: Stats\)/);
  assert.match(page, /const grainNeed = stats\.population \* \.8/);
  assert.match(page, /const supply = shortageRatio > 0/);
  assert.match(page, /供养不足/);
  assert.match(page, /army: clamp\(stats\.army \+ army \+ supply, 0, 260\)/);
  assert.match(page, /const armyBuffs: ModifierView\[\]/);
  assert.match(page, /armyBuffs\.map\(\(item\) => <ModifierChip item=\{item\}/);
  assert.match(page, /const governance = Math\.sign\(stats\.integrity\) \* Math\.round\(Math\.abs\(stats\.integrity\) \/ 16\)/);
  assert.match(page, /const governanceGrowth = effective\.integrity \/ 48/);
  assert.match(page, /live\.modifiers\.governance > 0 \? "清明" : "贪腐"/);
  assert.match(page, /const teamBoost = members \* 7 \+ policyBoost/);
  assert.match(page, /\(effective\.army - 70\) \/ 20/);
  assert.match(page, /effective\.sentiment \/ 20/);
  assert.match(page, /\(effective\.integrity \+ effective\.sentiment\) \/ 20/);
  assert.match(page, /clamp\(option\.chance \+ teamBoost \+ statBoost - difficultyRule\(difficulty\)\.chancePenalty, 1, 100\)/);
  assert.match(page, /成功率 \$\{finalOptionChance\(option, game\.stats, roster, policy, game\.difficulty\)\}%/);
  assert.doesNotMatch(page, /基础成功率 \$\{option\.chance\}/);
  assert.match(page, /判定成功。班底各展所长，决策奏效。/);
  assert.match(page, /判定失败。局势未如所愿，代价已经显现。/);
  assert.doesNotMatch(page, /决策奏效（成功率/);
  assert.match(page, /const integrity = -6 - rule\.integrityDecayPenalty/);
  assert.match(page, /const populationContributionCap = populationTaxCap\(scriptId, qinConquestIndex\)/);
  assert.match(page, /const productivePopulation = Math\.min\(stats\.population, populationContributionCap\)/);
  assert.match(page, /const subsistenceOutput = stats\.population \* \.05/);
  assert.match(page, /const civilianUse = stats\.population \* \.05/);
  assert.match(page, /const taxableSurplus = productivePopulation \* populationTaxRate/);
  assert.match(page, /const populationYield = subsistenceOutput \+ taxableSurplus/);
  assert.match(page, /const militaryCost = effective\.army \* \.025/);
  assert.match(page, /const administration = effective\.integrity \/ 18/);
  assert.match(page, /clamp\(populationYield \+ \(policyId === "rest" \? 5 : 0\) \+ administration - civilianUse - militaryCost, -20, 20\)/);
  assert.match(page, /积弊滋生 \$\{integrity\}/);
  assert.match(page, /岁首合计扣减 \$\{Math\.abs\(integrity\)\} 点/);
  assert.match(page, /const effects = \{ population, grain, sentiment, integrity \}/);
  assert.match(page, /formatDelta\(growth\.effects\.population\)/);
  assert.match(page, /formatDelta\(growth\.effects\.grain\)/);
  assert.match(page, /annualChange=\{growth\.effects\.integrity\}/);
  assert.match(page, /className="axis-values"/);
  assert.match(page, /role="tooltip"/);
  assert.match(page, /integrity: "吏治"/);
  assert.match(page, /<AxisStat label="吏治"/);
  assert.match(page, /<StatPanel stats=\{game\.stats\} policyId=\{game\.policyId\} difficulty=\{game\.difficulty\} scriptId=\{game\.scriptId\}/);
  assert.match(page, /对应专长使事件成功率 \+7%/);
  assert.match(page, /dynasty-save-\$\{slot\}/);
  assert.match(page, /\[0, 1, 2\]/);
  assert.match(page, /randomSeed: number/);
  assert.match(page, /randomCount: number/);
  assert.match(page, /historyFlags: string\[\]/);
  assert.match(page, /qinConquestIndex: number/);
  assert.match(page, /qinConquestDelay: number/);
  assert.match(page, /qinConquestRetries: number/);
  assert.match(page, /qinConquestRequirementRelief: number/);
  assert.match(page, /version: 10/);
  assert.match(page, /type DifficultyId = "easy" \| "hard" \| "hell"/);
  assert.match(page, /difficulty: DifficultyId/);
  assert.match(page, /integrityDecayPenalty: 0, chancePenalty: 0/);
  assert.match(page, /integrityDecayPenalty: 3, chancePenalty: 10/);
  assert.match(page, /integrityDecayPenalty: 6, chancePenalty: 20/);
  assert.match(page, /const difficulty: DifficultyId = difficulties\.some/);
  assert.match(page, /saved\.difficulty! : "easy"/);
  assert.match(page, /setDifficulty\(saved\.difficulty\)/);
  assert.match(page, /\["历史剧本", "国策方向", "开国班底"\]/);
  assert.match(page, /const \[difficultyOpen, setDifficultyOpen\] = useState\(false\)/);
  assert.match(page, /aria-haspopup="menu" aria-expanded=\{difficultyOpen\}/);
  assert.match(page, /className="difficulty-menu" role="menu" aria-label="选择治世难度"/);
  assert.match(page, /role="menuitem"/);
  assert.match(page, /onStart=\{\(selectedDifficulty\) => \{ setDifficulty\(selectedDifficulty\); setPhase\("script"\); \}\}/);
  assert.match(page, /difficultyRule\(save\.difficulty\)\.name\}难度/);
  const difficultyRules = {
    easy: { integrityDecayPenalty: 0, chancePenalty: 0 },
    hard: { integrityDecayPenalty: 3, chancePenalty: 10 },
    hell: { integrityDecayPenalty: 6, chancePenalty: 20 },
  };
  assert.deepEqual(Object.fromEntries(Object.entries(difficultyRules).map(([id, rule]) => [id, -6 - rule.integrityDecayPenalty])), { easy: -6, hard: -9, hell: -12 });
  assert.deepEqual(Object.fromEntries(Object.entries(difficultyRules).map(([id, rule]) => [id, Math.max(1, Math.min(100, 65 - rule.chancePenalty))])), { easy: 65, hard: 55, hell: 45 });
  const populationContribution = (population) => Math.min(population, 120) * .065;
  const grainGrowth = (population, effectiveArmy, integrity) => Math.round(population * .05 + populationContribution(population) + integrity / 18 - population * .05 - effectiveArmy * .025);
  assert.ok(grainGrowth(100, 140, 0) > 0, "population output should cover civilian and military use under neutral administration");
  assert.ok(grainGrowth(100, 140, -40) > 0, "moderately poor administration should not immediately force grain income negative");
  assert.ok(grainGrowth(100, 140, -80) < 0, "severely corrupt administration should be able to force grain income negative");
  assert.ok(Math.abs(populationContribution(120) - 7.8) < 1e-9);
  assert.ok(Math.abs(populationContribution(300) - 7.8) < 1e-9, "population beyond the land carrying limit should not keep increasing treasury surplus");
  assert.match(page, /人口赋税 \$\{formatDelta\(taxableSurplus\)\}/);
  assert.match(page, /已封顶/);
  assert.match(page, /人口超过土地承载与统治范围上限后，不再增加赋税盈余/);
  const supplyPenalty = (population, grain) => {
    const need = population * .8;
    const ratio = need > 0 ? Math.max(0, need - grain) / need : 0;
    return ratio > 0 ? -Math.max(1, Math.round(ratio * 24)) : 0;
  };
  assert.equal(supplyPenalty(100, 80), 0);
  assert.ok(supplyPenalty(100, 79) < 0, "both sentiment and army should be penalized as soon as grain falls below the population supply line");
  assert.match(page, /legacyQinConquestIndex\(saved\)/);
  assert.match(page, /historyEventAvailable\(event, historyFlags\)/);
  assert.match(page, /seededRandom\(current\.randomSeed, randomCount\)/);
  assert.match(page, /randomCount: yearEvents\.randomCount/);
  assert.match(page, /function scaleConquestEffects/);
  assert.match(page, /value < 0 \? value - Math\.ceil\(Math\.abs\(value\) \* retries \* \.35\) : value/);
  assert.match(page, /const qinConquestRequirementReduction = 15/);
  assert.match(page, /function lowerConquestRequirements/);
  assert.match(page, /Math\.max\(0, value - relief\)/);
  assert.match(page, /requirements: option\.qinConquest === "advance" \? lowerConquestRequirements/);
  assert.match(page, /qinConquestRequirementRelief \+= qinConquestRequirementReduction/);
  assert.match(page, /qinConquestRequirementRelief = 0/);
  assert.match(page, /缓进奏效，下次灭国的每项国势要求降低\$\{qinConquestRequirementReduction\}点；连续成功可以叠加/);
  assert.match(page, /shiftCalendarYear\(event\.year, progress\.qinConquestDelay\)/);
  assert.match(page, /event\.qinConquestStage !== progress\.qinConquestIndex/);
  assert.match(page, /function suppressLaterHistoricalEvents/);
  assert.match(page, /seededShuffle\(pool, randomSeed, randomCount\)/);
  assert.match(page, /randomCount = suppressed\.randomCount/);
  assert.match(page, /此国未亡，来年仍须再决；本次之后的秦线大事也将顺延/);
  assert.match(page, /读档不会重掷事件或判定结果/);
  assert.match(page, /current\.elapsed >= 500/);

  const additionalSource = page.match(/const additionalHistoricalEvents: EventTemplate\[\] = (\[[\s\S]*?\n\]);\n\nconst coreHistoricalEvents/);
  const coreSource = page.match(/const coreHistoricalEvents: EventTemplate\[\] = (\[[\s\S]*?\n\]);\n\nconst lifeGapHistoricalEvents/);
  const lifeGapSource = page.match(/const lifeGapHistoricalEvents: EventTemplate\[\] = (\[[\s\S]*?\n\]);\n\nconst historicalEvents/);
  assert.ok(additionalSource && coreSource && lifeGapSource, "historical event definitions should be readable");
  const historicalEvents = [...Function(`return ${additionalSource[1]}`)(), ...Function(`return ${coreSource[1]}`)(), ...Function(`return ${lifeGapSource[1]}`)()];
  assert.equal(new Set(historicalEvents.map((event) => event.id)).size, historicalEvents.length, "historical event ids should be unique");
  const activeIds = (scriptId, year, flags = []) => {
    const known = new Set(flags);
    return historicalEvents.filter((event) => event.scriptId === scriptId && event.year === year
      && (event.requiresHistoryFlags || []).every((flag) => known.has(flag))
      && (event.excludesHistoryFlags || []).every((flag) => !known.has(flag))).map((event) => event.id);
  };
  const branches = [
    ["liubang", -206, "liubang-qin-support", "liubang-qin-resistance", "liubang_looted_guanzhong"],
    ["hanwu", -129, "hanwu-longcheng", "hanwu-border-council", "hanwu_defensive_border"],
    ["caocao", 199, "caocao-belt-edict", "caocao-luoyang-rescript", "caocao_emperor_in_luoyang"],
    ["liubei", 208, "liubei-redcliffs", "liubei-xiakou-council", "liubei_without_longzhong"],
    ["sunce", 199, "sunce-lujiang", "sunce-yuanshu-remnants", "sunce_stayed_with_yuanshu"],
    ["liuyu", 417, "liuyu-north", "liuyu-reopen-north", "liuyu_abandoned_guanggu"],
    ["taizong", 621, "taizong-hulao", "taizong-delayed-guanzhong", "taizong_delayed_jinyang"],
    ["song", 961, "song-cup", "song-zhou-generals", "song_returned_to_zhou"],
    ["genghis", 1211, "genghis-jin", "genghis-noble-vanguard", "genghis_old_nobles"],
    ["ming", 1393, "ming-lan-yu", "ming-merit-retirement", "ming_limited_purge"],
  ];
  for (const [scriptId, year, canonicalId, branchId, flag] of branches) {
    assert.ok(activeIds(scriptId, year).includes(canonicalId), `${canonicalId} should remain the legacy path`);
    assert.ok(!activeIds(scriptId, year).includes(branchId), `${branchId} should stay hidden without its cause`);
    assert.ok(!activeIds(scriptId, year, [flag]).includes(canonicalId), `${canonicalId} should yield to its branch`);
    assert.ok(activeIds(scriptId, year, [flag]).includes(branchId), `${branchId} should appear after its hidden cause`);
  }
  assert.ok(!activeIds("qin", -241).includes("qin-lao-ai-entry"));
  assert.ok(activeIds("qin", -241, ["qin_court_independent"]).includes("qin-lao-ai-entry"));
  assert.ok(activeIds("qin", -238).includes("qin-lao-ai"));
  assert.ok(!activeIds("qin", -238, ["qin_lao_ai_prevented"]).includes("qin-lao-ai"));
  const qinAccession = historicalEvents.find((event) => event.id === "qin-accession");
  const qinEntry = historicalEvents.find((event) => event.id === "qin-lao-ai-entry");
  assert.deepEqual(qinAccession.options[1].setHistoryFlags, ["qin_court_independent"]);
  assert.doesNotMatch(JSON.stringify(qinAccession.options), /嫪毐|宫中索人|蕲年/);
  assert.deepEqual(qinEntry.options.map((option) => option.setHistoryFlags), [["qin_lao_ai_admitted"], ["qin_lao_ai_prevented"]]);
  const qinEarlyTimeline = [
    [-245, "qin-juan-battle"],
    [-244, "qin-mengao-han"],
    [-242, "qin-east-commandery"],
    [-241, "qin-five-state-coalition"],
    [-240, "qin-comet-mengao"],
    [-239, "qin-chengjiao"],
  ];
  for (const [year, eventId] of qinEarlyTimeline) {
    assert.ok(activeIds("qin", year).includes(eventId), `Qin's early timeline should include ${eventId} in ${year}`);
  }
  assert.equal(activeIds("qin", -243).length, 0, "the duplicate Qin locust event should be removed");

  const conquestIds = ["qin-conquer-han", "qin-conquer-zhao", "qin-conquer-wei", "qin-conquer-chu", "qin-conquer-yan", "qin-unification"];
  const conquestYears = [-230, -228, -225, -223, -222, -221];
  const conquestEvents = conquestIds.map((id) => historicalEvents.find((event) => event.id === id));
  assert.ok(conquestEvents.every(Boolean), "all six Qin conquest stages should exist");
  conquestEvents.forEach((event, stage) => {
    assert.equal(event.qinConquestStage, stage, `${event.title} should be conquest stage ${stage}`);
    assert.equal(event.year, conquestYears[stage]);
    assert.deepEqual(event.options.map((option) => option.qinConquest).sort(), ["advance", "delay"]);
    const advance = event.options.find((option) => option.qinConquest === "advance");
    const delay = event.options.find((option) => option.qinConquest === "delay");
    assert.equal(advance.failOnUnmet, true, `${event.title} should require enough strength to destroy the state`);
    assert.ok(advance.requirements.army >= 130, `${event.title} should start with a substantially higher army requirement`);
    assert.ok(advance.requirements.grain >= 100, `${event.title} should start with a substantially higher grain requirement`);
    assert.ok(delay.chance > 0, `${event.title} delay should use a success roll`);
    assert.ok(delay.successEffects && delay.failEffects, `${event.title} delay should disclose success and failure effects`);
    const delayOutcomes = [delay.effects, delay.successEffects, delay.failEffects].filter(Boolean);
    assert.ok(delayOutcomes.length > 0, `${event.title} delay should have a real cost`);
    assert.ok(delayOutcomes.every((effects) => Object.values(effects).some((value) => value < 0)), `${event.title} delay outcomes should all retain a cost`);
  });

  const shiftYear = (year, delay) => {
    const shifted = year + delay;
    return year < 0 && shifted >= 0 ? shifted + 1 : shifted;
  };
  const scheduledQinIds = (year, progress) => historicalEvents.filter((event) => {
    if (event.scriptId !== "qin" || event.year < -230) return false;
    if (event.qinConquestStage !== undefined && event.qinConquestStage !== progress.index) return false;
    return shiftYear(event.year, progress.delay) === year;
  }).map((event) => event.id);
  assert.ok(scheduledQinIds(-230, { index: 0, delay: 0 }).includes("qin-conquer-han"));
  assert.ok(scheduledQinIds(-229, { index: 0, delay: 1 }).includes("qin-conquer-han"), "delayed Han should return next year");
  assert.ok(scheduledQinIds(-227, { index: 1, delay: 1 }).includes("qin-conquer-zhao"), "advancing should unlock the next conquest on the shifted timeline");
  assert.ok(scheduledQinIds(-226, { index: 0, delay: 1 }).includes("qin-jing-ke"), "non-conquest Qin history should shift with the conquest delay");
  assert.ok(scheduledQinIds(-226, { index: 1, delay: 2 }).includes("qin-conquer-zhao"), "a delayed Zhao should recur next year");
  assert.ok(scheduledQinIds(-225, { index: 1, delay: 2 }).includes("qin-jing-ke"), "later Qin history should continue to slide");

  const lowerRequirements = (requirements, successfulDelays) => Object.fromEntries(Object.entries(requirements).map(([key, value]) => [key, Math.max(0, value - successfulDelays * 15)]));
  for (const event of conquestEvents) {
    const advance = event.options.find((option) => option.qinConquest === "advance");
    const afterOneSuccess = lowerRequirements(advance.requirements, 1);
    const afterThreeSuccesses = lowerRequirements(advance.requirements, 3);
    assert.equal(afterOneSuccess.army, advance.requirements.army - 15);
    assert.equal(afterOneSuccess.grain, advance.requirements.grain - 15);
    assert.equal(afterThreeSuccesses.army, advance.requirements.army - 45);
    assert.equal(afterThreeSuccesses.grain, advance.requirements.grain - 45);
  }

  const pressure = (effects, retries) => Object.fromEntries(Object.entries(effects).map(([key, value]) => [
    key,
    value < 0 ? value - Math.ceil(Math.abs(value) * retries * .35) : value,
  ]));
  for (const event of conquestEvents) {
    for (const option of event.options) {
      for (const effects of [option.effects, option.successEffects, option.failEffects].filter(Boolean)) {
        const firstRetry = pressure(effects, 1);
        const secondRetry = pressure(effects, 2);
        for (const [key, value] of Object.entries(effects)) {
          if (value < 0) {
            assert.ok(firstRetry[key] < value, `${event.title} / ${option.label} should cost more after one delay`);
            assert.ok(secondRetry[key] < firstRetry[key], `${event.title} / ${option.label} should keep worsening`);
          } else {
            assert.equal(firstRetry[key], value, `${event.title} / ${option.label} should not inflate its upside`);
            assert.equal(secondRetry[key], value, `${event.title} / ${option.label} should preserve positive effects`);
          }
        }
      }
    }
  }

  const punitiveIds = ["qin-lao-ai", "liubang-qin-resistance", "caocao-luoyang-rescript", "sunce-yuanshu-remnants", "genghis-noble-vanguard"];
  const markedPunitiveIds = new Set(historicalEvents.filter((event) => event.punitive).map((event) => event.id));
  punitiveIds.forEach((id) => assert.ok(markedPunitiveIds.has(id)));
  for (const eventId of punitiveIds) {
    const event = historicalEvents.find((item) => item.id === eventId);
    for (const option of event.options) {
      const outcomes = [option.effects, option.successEffects, option.failEffects].filter(Boolean);
      assert.ok(outcomes.length > 0, `${event.title} / ${option.label} should define its losses`);
      for (const effects of outcomes) {
        const values = Object.values(effects);
        assert.ok(values.every((value) => value <= 0), `${event.title} / ${option.label} should only mitigate losses`);
        assert.ok(values.some((value) => value < 0), `${event.title} / ${option.label} should retain a real cost`);
      }
    }
  }

  const randomEventSource = page.match(/const randomEvents: EventTemplate\[\] = (\[[\s\S]*?\n\]);\n\nconst additionalHistoricalEvents/);
  assert.ok(randomEventSource, "random event definitions should be readable");
  const randomEvents = Function(`return ${randomEventSource[1]}`)();
  assert.equal(randomEvents.length, 51, "the generic random event pool should contain exactly 51 events");
  assert.equal(new Set(randomEvents.map((event) => event.id)).size, 51, "generic random event ids should be unique");
  assert.ok(randomEvents.some((event) => event.id === "locust" && event.title === "飞蝗蔽日"), "the generic locust event should remain");
  for (const id of ["epidemic", "early-frost", "ancient-cauldron", "maritime-trade", "postal-relay", "city-fire", "forest-commons", "irrigation-dispute", "tax-arrears", "border-hostage", "shipbuilding", "military-register"]) {
    assert.ok(randomEvents.some((event) => event.id === id), `${id} should be included in the expanded generic pool`);
  }
  const statKeys = ["population", "grain", "army", "sentiment", "integrity", "authority"];
  for (const event of randomEvents) {
    const deterministic = event.options.filter((option) => option.effects);
    for (const option of deterministic) {
      const values = statKeys.map((key) => option.effects[key] || 0);
      assert.ok(values.some((value) => value > 0), `${event.title} / ${option.label} should have an explicit upside`);
      for (const alternative of deterministic.filter((item) => item !== option)) {
        const alternativeValues = statKeys.map((key) => alternative.effects[key] || 0);
        const strictlyDominated = alternativeValues.every((value, index) => value >= values[index]) && alternativeValues.some((value, index) => value > values[index]);
        assert.equal(strictlyDominated, false, `${event.title} / ${option.label} should not be strictly dominated by ${alternative.label}`);
      }
    }
  }
});

test("models imperial authority, hidden loyalty, rebellions, and recruitment follow-ups", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /type StatKey = [^\n]+"authority"/);
  assert.match(page, /authority: "皇权"/);
  assert.match(page, /const historicalLoyalty: Partial<Record<string, number>>/);
  assert.match(page, /person\.role === "皇帝" \? person : \{ \.\.\.person, loyalty: loyaltyFor\(person\) \}/);
  assert.match(page, /function ministerRebellionChance\(authority: number, loyalty: number\)/);
  assert.match(page, /\(55 - authority\) \* 1\.1 \+ Math\.max\(0, 75 - loyalty\) \* \.8/);
  const rebellionChance = (authority, loyalty) => authority >= 55 || loyalty >= 85
    ? 0
    : Math.max(0, Math.min(70, Math.round((55 - authority) * 1.1 + Math.max(0, 75 - loyalty) * .8)));
  assert.equal(rebellionChance(55, 20), 0);
  assert.equal(rebellionChance(30, 90), 0);
  assert.ok(rebellionChance(20, 30) > rebellionChance(45, 70));
  assert.match(page, /function frontierArmyRequirement\(population: number\)/);
  assert.match(page, /clamp\(40 \+ population \* \.4, 55, 180\)/);
  assert.match(page, /const militaryGovernance = stats\.integrity < 0 \? -Math\.ceil\(Math\.abs\(stats\.integrity\) \/ 20\) : 0/);
  assert.match(page, /army: clamp\(stats\.army \+ army \+ supply \+ militaryGovernance, 0, 260\)/);
  assert.match(page, /朝堂掣肘/);
  const frontierNeed = (population) => Math.max(55, Math.min(180, Math.round(40 + population * .4)));
  assert.deepEqual([50, 100, 150, 200, 300].map(frontierNeed), [60, 80, 100, 120, 160]);
  assert.match(page, /effective\.army < frontierNeed && lowArmyYears >= 1/);

  assert.match(page, /function peasantUprisingChance\(sentiment: number, unrestYears: number, difficulty: DifficultyId\)/);
  assert.match(page, /if \(sentiment > -30 \|\| unrestYears < 1\) return 0/);
  assert.match(page, /if \(sentiment <= -60\) return 100/);
  assert.match(page, /\(-sentiment - 30\) \* 1\.2 \+ \(unrestYears - 1\) \* 10 \+ rule\.uprisingChanceBonus/);
  assert.match(page, /function corruptionCaseChance\(integrity: number, corruptionYears: number\)/);
  assert.match(page, /if \(integrity > -30 \|\| corruptionYears < 1\) return 0/);
  assert.match(page, /if \(integrity <= -60\) return 100/);
  assert.match(page, /\(-integrity - 30\) \* 1\.2 \+ \(corruptionYears - 1\) \* 10/);
  assert.match(page, /贪腐案发概率/);
  assert.match(page, /sentimentSoftCap: 70, uprisingChanceBonus: 0/);
  assert.match(page, /sentimentSoftCap: 55, uprisingChanceBonus: 8/);
  assert.match(page, /sentimentSoftCap: 40, uprisingChanceBonus: 16/);
  assert.match(page, /stats\.sentiment > rule\.sentimentSoftCap \? -Math\.ceil\(\(stats\.sentiment - rule\.sentimentSoftCap\) \/ 15\) : 0/);
  assert.match(page, /事件标示的民情增减仍按原数值完整结算/);

  assert.match(page, /title: "权臣叛变"/);
  assert.match(page, /title: "俘获贼首"/);
  assert.match(page, /special: "captured-minister"/);
  assert.match(page, /special: "captured-peasant"/);
  assert.match(page, /addEffects\(current\.stats, negateEffects\(person\.bonuses\)\)/);
  assert.match(page, /seatAssignments\[openRole\] = actor\.id/);
  assert.match(page, /班底没有可用空位/);
  for (const name of ["宋江", "杜伏威", "程咬金"]) assert.match(page, new RegExp(name));
  assert.match(page, /const allPeople: Person\[\] = \[\.\.\.people, \.\.\.specialRecruits\]/);
  assert.match(page, /const reviewedHistoricalEvents = historicalEvents\.filter\(\(\) => true\)\.map\(reviewEventAuthority\)/);

  const randomEventSource = page.match(/const randomEvents: EventTemplate\[\] = (\[[\s\S]*?\n\]);\n\nconst additionalHistoricalEvents/);
  const randomEvents = Function(`return ${randomEventSource[1]}`)();
  const rebellion = randomEvents.find((event) => event.id === "rebellion");
  assert.equal(rebellion.title, "农民起义");
  for (const option of rebellion.options) {
    for (const effects of [option.successEffects, option.failEffects]) {
      assert.ok(effects.population < 0 && effects.grain < 0 && effects.army < 0, `${option.label} must damage all three material stats on either outcome`);
    }
  }
  for (const id of ["corruption-office-sale", "corruption-salt-account", "corruption-granary"]) {
    const event = randomEvents.find((item) => item.id === id);
    assert.ok(event?.punitive, `${id} should be marked punitive`);
    for (const option of event.options) {
      for (const effects of [option.successEffects, option.failEffects]) {
        assert.ok(Object.values(effects).every((value) => value <= 0), `${option.label} should only mitigate corruption-case losses`);
        assert.ok(Object.values(effects).some((value) => value < 0), `${option.label} should retain a real cost`);
      }
    }
  }
});

test("checks every occupied non-emperor seat independently for rebellion", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function rollMinisterRebellions\(/);
  assert.match(page, /roles\.slice\(1\)\.map\(\(role\) =>/);
  assert.match(page, /candidates\.forEach\(\(\{ person, role, chance \}\) =>/);
  assert.match(page, /conditional\.push\(\.\.\.rebellionRoll\.events\)/);
  assert.doesNotMatch(page, /\.sort\(\(a, b\) => b!\.chance - a!\.chance\)/);
  assert.match(page, /pendingRebellionActors/);
  assert.match(page, /deferredRebellions/);
});

test("uses hidden annual merit to decide difficulty-scaled authority decay", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /meritThreshold: 3, authorityDecay: 1/);
  assert.match(page, /meritThreshold: 5, authorityDecay: 2/);
  assert.match(page, /meritThreshold: 7, authorityDecay: 3/);
  assert.match(page, /game\.annualSuccesses \* 3 - game\.annualFailures \* 2 \+ materialScore/);
  assert.match(page, /game\.stats\.population - game\.yearStartMaterial\.population/);
  assert.match(page, /game\.stats\.grain - game\.yearStartMaterial\.grain/);
  assert.match(page, /game\.stats\.army - game\.yearStartMaterial\.army/);
  assert.match(page, /authority: -merit\.authorityDecay/);
  assert.match(page, /本年无足以服众之功/);
});
