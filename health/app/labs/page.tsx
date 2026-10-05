"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Stones } from "@/components/Shapes";
import { ArrowIcon, Button, Chip, Disclaimer, Empty, ErrorBox, Loading, PageHeader, Spinner, cx } from "@/components/ui";
import { postJSON } from "@/lib/client/api";
import { compressImage, MAX_PDF_BYTES, readAsDataURL } from "@/lib/client/files";
import { useLoad } from "@/lib/client/useLoad";
import { getStore } from "@/lib/store";
import type { NewResult } from "@/lib/store/types";

interface Extracted {
  taken_at: string;
  lab_name: string;
  notes: string;
  results: NewResult[];
}

type Job = { name: string; state: "reading" | "done" | "error"; message?: string; id?: string };

export default function LabsPage() {
  const store = getStore();
  const { data: reports, error, loading, reload } = useLoad(async () => {
    const [reports, results] = await Promise.all([store.listReports(), store.listResults()]);
    const counts = new Map<string, { n: number; flagged: number }>();
    for (const r of results) {
      const c = counts.get(r.report_id) ?? { n: 0, flagged: 0 };
      c.n++;
      if (r.flag === "high" || r.flag === "low") c.flagged++;
      counts.set(r.report_id, c);
    }
    return reports.map((r) => ({ ...r, counts: counts.get(r.id) }));
  });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const busy = jobs.some((j) => j.state === "reading");

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setJobs(list.map((f) => ({ name: f.name, state: "reading" })));
    // One at a time keeps requests small and gives clear per-file progress.
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const update = (patch: Partial<Job>) => setJobs((js) => js.map((j, k) => (k === i ? { ...j, ...patch } : j)));
      try {
        let dataUrl: string;
        let blob: Blob = f;
        if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
          if (f.size > MAX_PDF_BYTES) throw new Error("PDF is larger than 3 MB — split it or upload photos of the pages.");
          dataUrl = await readAsDataURL(f);
          if (!dataUrl.startsWith("data:application/pdf")) dataUrl = dataUrl.replace(/^data:[^;]*/, "data:application/pdf");
        } else {
          const img = await compressImage(f);
          dataUrl = img.dataUrl;
          blob = img.blob;
        }
        const ex = await postJSON<Extracted>("/api/labs/extract", { file: dataUrl, name: f.name });
        const file_path = await store.uploadFile("labs", blob, f.name).catch(() => null);
        const id = await store.createReport(
          {
            taken_at: ex.taken_at || new Date().toISOString().slice(0, 10),
            lab_name: ex.lab_name,
            file_name: f.name,
            file_path,
            status: "review",
            ai_notes: [ex.notes, ex.taken_at ? "" : "Date not found — please set it."].filter(Boolean).join(" "),
          },
          ex.results
        );
        update({ state: "done", id, message: `${ex.results.length} results found` });
      } catch (e) {
        update({ state: "error", message: (e as Error).message });
      }
    }
    reload();
  }

  return (
    <div>
      <PageHeader
        title={
          <>
            Your <em>labs</em>
          </>
        }
        intro="Upload any lab report — PDF or photo, old or new, any language. The AI reads every value, you check it, and it joins your history."
      />

      {/* Upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!busy) handleFiles(e.dataTransfer.files);
        }}
        className={cx(
          "relative flex flex-col items-center gap-4 overflow-hidden rounded-5xl border-2 border-dashed px-6 py-10 text-center transition",
          drag ? "border-kombu bg-sage" : "border-moss/50 bg-sage-100"
        )}
      >
        <Stones className="text-moss" />
        <p className="display text-2xl text-kombu">
          Drop reports <em>here</em>
        </p>
        <p className="max-w-sm text-xs text-noir/60">PDF up to 3 MB, or photos (JPG/PNG). Several files at once is fine.</p>
        <input
          ref={input}
          type="file"
          accept="application/pdf,image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button onClick={() => input.current?.click()} loading={busy}>
          {busy ? "Reading…" : "Choose files"}
        </Button>
      </div>

      {jobs.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {jobs.map((j, i) => (
            <li key={i} className="flex items-center justify-between gap-3 rounded-2xl bg-[#fffaf2] px-4 py-3 text-sm">
              <span className="truncate">{j.name}</span>
              {j.state === "reading" && (
                <span className="flex items-center gap-2 text-moss">
                  <Spinner small /> AI is reading…
                </span>
              )}
              {j.state === "done" && (
                <Link href={`/labs/${j.id}`} className="flex shrink-0 items-center gap-1 font-semibold text-kombu">
                  {j.message} — review <ArrowIcon />
                </Link>
              )}
              {j.state === "error" && <span className="text-right text-alert">{j.message}</span>}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10">
        {loading && !reports ? (
          <Loading />
        ) : error ? (
          <ErrorBox onRetry={reload}>{error}</ErrorBox>
        ) : !reports?.length ? (
          <Empty title="No reports yet">Your uploaded lab reports will appear here, newest first.</Empty>
        ) : (
          <div className="rounded-3xl bg-[#fffaf2] p-2">
            <div className="hidden grid-cols-[1fr_1fr_1fr_auto] px-4 py-2 text-[11px] uppercase tracking-wider text-noir/45 sm:grid">
              <span>Date</span>
              <span>Lab</span>
              <span>Results</span>
              <span />
            </div>
            {reports.map((r) => (
              <Link
                key={r.id}
                href={`/labs/${r.id}`}
                className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-noir/10 px-4 py-3 last:border-0 hover:bg-bone/40 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <div>
                  <p className="text-sm font-semibold">{r.taken_at}</p>
                  <p className="truncate text-xs text-noir/55 sm:hidden">{r.lab_name || r.file_name}</p>
                </div>
                <p className="hidden truncate text-sm text-noir/70 sm:block">{r.lab_name || r.file_name}</p>
                <p className="hidden text-sm text-noir/70 sm:block">
                  {r.status === "review" ? "—" : `${r.counts?.n ?? 0} values${r.counts?.flagged ? ` · ${r.counts.flagged} flagged` : ""}`}
                </p>
                <div className="flex items-center gap-2">
                  {r.status === "review" ? <Chip tone="alert">Needs review</Chip> : r.counts?.flagged ? <Chip tone="tan">{r.counts.flagged} flagged</Chip> : <Chip tone="moss">Saved</Chip>}
                  <ArrowIcon className="opacity-50" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Disclaimer />
    </div>
  );
}
