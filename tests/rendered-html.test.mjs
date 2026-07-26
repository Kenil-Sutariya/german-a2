import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the German A2 application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>German A2 in 12 Weeks<\/title>/i);
  assert.match(html, /Preparing your course/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("includes the complete course seed, focus links and PWA assets", async () => {
  const [seedText, focusResourcesText, manifestText, workerText] = await Promise.all([
    readFile(new URL("../german-a2-course-data.json", import.meta.url), "utf8"),
    readFile(new URL("../lib/focus-resources.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
  ]);
  const seed = JSON.parse(seedText);
  const manifest = JSON.parse(manifestText);
  assert.equal(seed.modules.length, 13);
  assert.equal(seed.materials.length, 4);
  assert.equal(
    seed.modules.reduce((total, module) => total + module.tasks.length, 0),
    102,
  );
  for (let moduleIndex = 0; moduleIndex <= 12; moduleIndex += 1) {
    assert.match(focusResourcesText, new RegExp(`\\bT${moduleIndex}: \\[`));
  }
  assert.match(focusResourcesText, /deutsch\.lingolia\.com/);
  assert.match(focusResourcesText, /goethe\.de/);
  assert.equal(manifest.display, "standalone");
  assert.match(workerText, /caches\.open/);
});
