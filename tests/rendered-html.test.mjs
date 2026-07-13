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

test("includes decoupled emperor selection, history events, and three local save slots", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  for (const title of ["秦始皇纪", "汉高祖纪", "汉武帝纪", "曹操传", "刘备传", "孙策传", "刘裕传", "唐太宗纪", "宋太祖纪", "成吉思汗纪", "明太祖纪"]) assert.match(page, new RegExp(title));
  assert.match(page, /剧本与皇帝互不绑定/);
  assert.match(page, /role: "皇帝"/);
  assert.match(page, /historicalEvents\.filter/);
  assert.match(page, /dynasty-save-\$\{slot\}/);
  assert.match(page, /\[0, 1, 2\]/);
  assert.match(page, /current\.elapsed >= 500/);
});
