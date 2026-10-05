// Renders PDF pages to JPEG data URLs in the browser (Claude in the artifact reads images, not PDFs).
import "./polyfills";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import * as worker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

// Run pdf.js on the main thread: no worker file or blob URL needed inside the sandboxed page.
(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker;

function dataUrlBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function pdfToImages(dataUrl: string, maxPages: number, width = 1600): Promise<{ images: string[]; pages: number }> {
  const doc = await pdfjs.getDocument({ data: dataUrlBytes(dataUrl) }).promise;
  const images: string[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: width / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    images.push(canvas.toDataURL("image/jpeg", 0.85));
  }
  const pages = doc.numPages;
  await doc.cleanup?.();
  return { images, pages };
}

export { dataUrlBytes };

/** Extracts a PDF's text, rebuilding table rows: items on the same line are joined left-to-right with tabs. */
export async function pdfToText(dataUrl: string, maxPages = 12): Promise<{ text: string; pages: number }> {
  const doc = await pdfjs.getDocument({ data: dataUrlBytes(dataUrl) }).promise;
  const out: string[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const rows: { y: number; items: { x: number; s: string }[] }[] = [];
    for (const it of content.items as { str?: string; transform?: number[] }[]) {
      const s = (it.str ?? "").trim();
      if (!s || !it.transform) continue;
      const x = it.transform[4];
      const y = it.transform[5];
      let row = rows.find((r) => Math.abs(r.y - y) < 3);
      if (!row) rows.push((row = { y, items: [] }));
      row.items.push({ x, s });
    }
    rows.sort((a, b) => b.y - a.y);
    out.push(`--- page ${i} ---`, ...rows.map((r) => r.items.sort((a, b) => a.x - b.x).map((t) => t.s).join("\t")));
  }
  const pages = doc.numPages;
  await doc.cleanup?.();
  return { text: out.join("\n"), pages };
}
