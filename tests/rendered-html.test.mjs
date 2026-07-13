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
  assert.match(page, /historicalEvents\.filter/);
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
  assert.match(page, /members \* 15 \+ policyBoost/);
  assert.match(page, /\(effectiveCurrent\.army - 70\) \/ 10/);
  assert.match(page, /effectiveCurrent\.sentiment \/ 10/);
  assert.match(page, /\(effectiveCurrent\.integrity \+ effectiveCurrent\.sentiment\) \/ 10/);
  assert.match(page, /clamp\(option\.chance \+ teamChance\(option\.tag\) \+ statBoost, 1, 100\)/);
  assert.match(page, /const effects = \{ population, grain \}/);
  assert.match(page, /formatDelta\(growth\.effects\.population\)/);
  assert.match(page, /formatDelta\(growth\.effects\.grain\)/);
  assert.match(page, /role="tooltip"/);
  assert.doesNotMatch(page, /官风惯性|贪腐积弊|盛治回调/);
  assert.match(page, /<StatPanel stats=\{game\.stats\} policyId=\{game\.policyId\} \/>/);
  assert.match(page, /对应专长使事件成功率 \+15%/);
  assert.match(page, /dynasty-save-\$\{slot\}/);
  assert.match(page, /\[0, 1, 2\]/);
  assert.match(page, /current\.elapsed >= 500/);
});
