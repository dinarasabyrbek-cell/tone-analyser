#!/usr/bin/env node
// Builds the claude.ai artifact version into dist-artifact/:
//   index.html (page), app.js (bundle), app.css (Tailwind), anatomy/body.glb (3D model)
// AI runs on the viewer's own Claude account (artifact `sample` capability); data is saved to the
// viewer's private db subtree (or browser storage as a fallback). No server, no API key.
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import * as esbuild from "esbuild";

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const OUT = path.join(ROOT, "dist-artifact");
const r = (...p) => path.join(ROOT, ...p);

const swaps = {
  [r("lib/store/index.ts")]: r("artifact/store.ts"),
  [r("lib/client/api.ts")]: r("artifact/api.ts"),
};
const shims = {
  "next/link": r("artifact/shims/next-link.tsx"),
  "next/navigation": r("artifact/shims/next-navigation.ts"),
  "next/dynamic": r("artifact/shims/next-dynamic.tsx"),
};

const artifactPlugin = {
  name: "soul-artifact",
  setup(build) {
    build.onResolve({ filter: /^next\/(link|navigation|dynamic)$/ }, (a) => ({ path: shims[a.path] }));
    build.onResolve({ filter: /^next\// }, (a) => ({ errors: [{ text: `${a.path} is not available in the artifact build (imported by ${a.importer})` }] }));
    build.onLoad({ filter: /\.(ts|tsx)$/ }, async (a) => {
      const to = swaps[a.path];
      if (!to) return undefined;
      return { contents: `export * from ${JSON.stringify(to)};`, loader: "ts", resolveDir: path.dirname(to) };
    });
  },
};

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(path.join(OUT, "anatomy"), { recursive: true });

const result = await esbuild.build({
  entryPoints: [r("artifact/main.tsx")],
  outfile: path.join(OUT, "app.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  jsx: "automatic",
  legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [artifactPlugin],
  metafile: true,
  logLevel: "warning",
});

execFileSync(path.join(ROOT, "node_modules/.bin/tailwindcss"), ["-i", r("app/globals.css"), "-o", path.join(OUT, "app.css"), "--minify"], { cwd: ROOT, stdio: "inherit" });
// claude.ai serves only web file types, so the model ships base64-encoded as text
await fs.writeFile(path.join(OUT, "anatomy/body.glb.b64.txt"), (await fs.readFile(r("public/anatomy/body.glb"))).toString("base64"));
// claude.ai pages run under a strict CSP: inline the CSS and JS into the page; only the 3D model ships as a file.
const js = (await fs.readFile(path.join(OUT, "app.js"), "utf8")).replace(/<\/script/gi, "<\\/script");
const css = await fs.readFile(path.join(OUT, "app.css"), "utf8");
const shell = await fs.readFile(r("artifact/index.html"), "utf8");
await fs.writeFile(
  path.join(OUT, "index.html"),
  shell.replace('<link rel="stylesheet" href="app.css">', () => `<style>${css}</style>`).replace('<script type="module" src="app.js"></script>', () => `<script type="module">${js}</script>`)
);

const sizes = await Promise.all(["index.html", "anatomy/body.glb.b64.txt"].map(async (f) => `${f} ${((await fs.stat(path.join(OUT, f))).size / 1e6).toFixed(2)} MB`));
console.log("dist-artifact:", sizes.join(", "));
void result;
