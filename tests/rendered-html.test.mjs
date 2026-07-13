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
  assert.match(html, /选择剧本/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("includes the expanded five-round roster, history events, and reign-only saves", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  for (const title of ["秦始皇纪", "汉高祖纪", "汉武帝纪", "曹操传", "刘备传", "孙策传", "刘裕传", "唐太宗纪", "宋太祖纪", "成吉思汗纪", "明太祖纪"]) assert.match(page, new RegExp(title));
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
  assert.match(page, /current=\{displayPhase === "reign" \? game : null\}/);
  assert.doesNotMatch(page, /className="reign-actions"/);
  assert.doesNotMatch(page, /读取旧档/);
  assert.match(page, /已存入档案 \$\{slot \+ 1\}/);
  assert.match(page, /className="save-toast" role="status" aria-live="polite"/);
  assert.match(page, /historicalEvents\.filter/);
  for (const scriptId of ["qin", "liubang", "hanwu", "caocao", "liubei", "sunce", "liuyu", "taizong", "song", "genghis", "ming"]) {
    const eventCount = page.match(new RegExp(`scriptId: "${scriptId}"`, "g"))?.length || 0;
    assert.ok(eventCount >= 4, `${scriptId} should have at least four historical events`);
  }
  assert.match(page, /id: "qin"[^\n]+startYear: -246[^\n]+秦王政元年 · 少年即位/);
  assert.equal(page.match(/scriptId: "qin"/g)?.length, 16);
  assert.equal(page.match(/scriptId: "hanwu"/g)?.length, 11);
  assert.match(page, /title: "少主临朝"[^\n]+text: "相邦吕不韦总揽朝政，宗室、军功贵族与太后宫中各有盘算。"/);
  assert.doesNotMatch(page, /庄襄王新丧，十三岁的嬴政即秦王位/);
  for (const title of ["少主临朝", "蕲年宫变", "逐客风波", "韩国先亡", "邯郸陷落", "图穷匕见", "水灌大梁", "王翦灭楚", "燕代俱平", "凿渠征越", "龙城初捷", "河南之战", "漠南奔袭", "河西两战"]) assert.match(page, new RegExp(title));
  for (const title of ["六合初定", "垓下决楚", "巫蛊祸起", "赤壁风火", "荆州风急", "袁术僭号", "晋宋禅代", "虎牢一战", "陈桥黄袍", "野狐岭破金", "蓝玉案起"]) assert.match(page, new RegExp(title));
  assert.match(page, /className="chance-results"/);
  assert.match(page, /effectText\(option\.successEffects \|\| \{\}\)/);
  assert.match(page, /effectText\(option\.failEffects \|\| \{\}\)/);
  assert.match(page, /function liveState\(stats: Stats\)/);
  assert.match(page, /const grainNeed = stats\.population \* \.8/);
  assert.match(page, /const supply = shortageRatio > 0/);
  assert.match(page, /供养不足/);
  assert.match(page, /const governance = Math\.sign\(stats\.integrity\) \* Math\.round\(Math\.abs\(stats\.integrity\) \/ 16\)/);
  assert.match(page, /const governanceGrowth = effective\.integrity \/ 48/);
  assert.match(page, /live\.modifiers\.governance > 0 \? "清明" : "贪腐"/);
  assert.match(page, /const teamBoost = members \* 7 \+ policyBoost/);
  assert.match(page, /\(effective\.army - 70\) \/ 20/);
  assert.match(page, /effective\.sentiment \/ 20/);
  assert.match(page, /\(effective\.integrity \+ effective\.sentiment\) \/ 20/);
  assert.match(page, /clamp\(option\.chance \+ teamBoost \+ statBoost, 1, 100\)/);
  assert.match(page, /成功率 \$\{finalOptionChance\(option, game\.stats, roster, policy\)\}%/);
  assert.doesNotMatch(page, /基础成功率 \$\{option\.chance\}/);
  assert.match(page, /判定成功。班底各展所长，决策奏效。/);
  assert.match(page, /判定失败。局势未如所愿，代价已经显现。/);
  assert.doesNotMatch(page, /决策奏效（成功率/);
  assert.match(page, /const integrity = -2/);
  assert.match(page, /const effects = \{ population, grain, integrity \}/);
  assert.match(page, /formatDelta\(growth\.effects\.population\)/);
  assert.match(page, /formatDelta\(growth\.effects\.grain\)/);
  assert.match(page, /annualChange=\{growth\.effects\.integrity\}/);
  assert.match(page, /className="axis-values"/);
  assert.match(page, /role="tooltip"/);
  assert.doesNotMatch(page, /官风惯性|贪腐积弊|盛治回调/);
  assert.match(page, /<StatPanel stats=\{game\.stats\} policyId=\{game\.policyId\} \/>/);
  assert.match(page, /对应专长使事件成功率 \+7%/);
  assert.match(page, /dynasty-save-\$\{slot\}/);
  assert.match(page, /\[0, 1, 2\]/);
  assert.match(page, /randomSeed: number/);
  assert.match(page, /randomCount: number/);
  assert.match(page, /historyFlags: string\[\]/);
  assert.match(page, /historyEventAvailable\(event, historyFlags\)/);
  assert.match(page, /seededRandom\(current\.randomSeed, randomCount\)/);
  assert.match(page, /randomCount: yearEvents\.randomCount/);
  assert.match(page, /读档不会重掷事件或判定结果/);
  assert.match(page, /current\.elapsed >= 500/);

  const additionalSource = page.match(/const additionalHistoricalEvents: EventTemplate\[\] = (\[[\s\S]*?\n\]);\n\nconst coreHistoricalEvents/);
  const coreSource = page.match(/const coreHistoricalEvents: EventTemplate\[\] = (\[[\s\S]*?\n\]);\n\nconst historicalEvents/);
  assert.ok(additionalSource && coreSource, "historical event definitions should be readable");
  const historicalEvents = [...Function(`return ${additionalSource[1]}`)(), ...Function(`return ${coreSource[1]}`)()];
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

  const randomEventSource = page.match(/const randomEvents: EventTemplate\[\] = (\[[\s\S]*?\n\]);\n\nconst additionalHistoricalEvents/);
  assert.ok(randomEventSource, "random event definitions should be readable");
  const randomEvents = Function(`return ${randomEventSource[1]}`)();
  const statKeys = ["population", "grain", "army", "sentiment", "integrity"];
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
