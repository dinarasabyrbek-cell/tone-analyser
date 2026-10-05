"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FlagChip } from "@/components/markers";
import { Button, Card, ErrorBox, Field, Loading, PageHeader } from "@/components/ui";
import { getBiomarker } from "@/lib/biomarkers";
import { useLoad } from "@/lib/client/useLoad";
import { finalizeRow, type DraftRow } from "@/lib/normalize";
import { getStore } from "@/lib/store";
import type { NewResult } from "@/lib/store/types";
import type { LabReport, LabResult } from "@/lib/types";

type Row = Record<keyof DraftRow, string> & { _k: number };

let seq = 0;
const toRow = (r: Partial<NewResult>): Row => ({
  _k: ++seq,
  marker_key: r.marker_key ?? "",
  raw_name: r.raw_name ?? "",
  value: r.value != null ? String(r.value) : "",
  unit: r.unit ?? "",
  ref_low: r.ref_low != null ? String(r.ref_low) : "",
  ref_high: r.ref_high != null ? String(r.ref_high) : "",
});

const num = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

function finalize(r: Row): NewResult | null {
  return finalizeRow({
    marker_key: getBiomarker(r.marker_key) ? r.marker_key : null,
    raw_name: r.raw_name,
    value: num(r.value),
    unit: r.unit,
    ref_low: num(r.ref_low),
    ref_high: num(r.ref_high),
  });
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading } = useLoad(() => getStore().getReport(id), [id]);
  if (loading) return <Loading />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!data) return <ErrorBox>Report not found.</ErrorBox>;
  return <Editor key={id} id={id} report={data.report} results={data.results} />;
}

function Editor({ id, report, results }: { id: string; report: LabReport; results: LabResult[] }) {
  const router = useRouter();
  const store = getStore();
  const [rows, setRows] = useState<Row[]>(() => results.map(toRow));
  const [takenAt, setTakenAt] = useState(report.taken_at);
  const [lab, setLab] = useState(report.lab_name);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (report.file_path) store.fileUrl(report.file_path).then(setFileUrl);
  }, [report.file_path, store]);

  const set = (k: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r._k === k ? { ...r, ...patch } : r)));

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(takenAt)) throw new Error("Please set the test date.");
      const results = rows.map(finalize).filter((r): r is NewResult => r !== null);
      if (!results.length) throw new Error("There are no valid results to save.");
      await store.updateReport(id, { taken_at: takenAt, lab_name: lab, status: "saved" }, results);
      router.push("/labs");
    } catch (e) {
      setSaveError((e as Error).message);
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this report and all its results?")) return;
    await store.deleteReport(id);
    router.push("/labs");
  }

  const reviewing = report.status === "review";

  return (
    <div>
      <Link href="/labs" className="text-sm text-moss">
        ← All reports
      </Link>
      <PageHeader
        title={
          reviewing ? (
            <>
              Check the <em>numbers</em>
            </>
          ) : (
            <>
              Report <em>{takenAt}</em>
            </>
          )
        }
        intro={
          reviewing
            ? "The AI read these values from your file. Fix anything it got wrong, remove rows you don't want, then save to add them to your history."
            : "You can still correct values here — changes update your trends."
        }
      />

      {report.ai_notes && <p className="mb-4 rounded-2xl bg-tan/40 px-4 py-3 text-sm">{report.ai_notes}</p>}

      <Card tone="white" className="mb-4 grid gap-4 sm:grid-cols-3">
        <Field label="Test date">
          <input type="date" className="field" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
        </Field>
        <Field label="Laboratory">
          <input className="field" value={lab} onChange={(e) => setLab(e.target.value)} placeholder="e.g. Invitro" />
        </Field>
        <Field label="Original file">
          {fileUrl ? (
            <a href={fileUrl} target="_blank" rel="noreferrer" className="field truncate text-kombu underline">
              {report.file_name}
            </a>
          ) : (
            <span className="field truncate text-noir/60">{report.file_name || "—"}</span>
          )}
        </Field>
      </Card>

      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          const fin = finalize(r);
          const known = getBiomarker(fin?.marker_key ?? r.marker_key);
          return (
            <div key={r._k} className="grid grid-cols-2 gap-2 rounded-2xl bg-[#fffaf2] p-3 sm:grid-cols-[1.6fr_0.8fr_0.8fr_0.7fr_0.7fr_auto_auto] sm:items-center">
              <div className="col-span-2 sm:col-span-1">
                <input className="field !py-2 text-sm font-semibold" value={r.raw_name} onChange={(e) => set(r._k, { raw_name: e.target.value, marker_key: "" })} aria-label="Marker name" />
                <p className="mt-1 pl-1 text-[11px] text-moss">{known ? `↳ ${known.name}` : "↳ custom marker"}</p>
              </div>
              <input className="field !py-2 text-sm" inputMode="decimal" value={r.value} onChange={(e) => set(r._k, { value: e.target.value })} placeholder="Value" aria-label="Value" />
              <input className="field !py-2 text-sm" value={r.unit} onChange={(e) => set(r._k, { unit: e.target.value })} placeholder="Unit" aria-label="Unit" />
              <input className="field !py-2 text-sm" inputMode="decimal" value={r.ref_low} onChange={(e) => set(r._k, { ref_low: e.target.value })} placeholder="Ref low" aria-label="Reference low" />
              <input className="field !py-2 text-sm" inputMode="decimal" value={r.ref_high} onChange={(e) => set(r._k, { ref_high: e.target.value })} placeholder="Ref high" aria-label="Reference high" />
              <div>{fin ? <FlagChip flag={fin.flag} /> : <span className="text-xs text-alert">invalid</span>}</div>
              <button onClick={() => setRows((rs) => rs.filter((x) => x._k !== r._k))} className="justify-self-end px-2 text-xl text-noir/40 hover:text-alert" aria-label="Remove row">
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-3">
        <Button variant="ghost" onClick={() => setRows((rs) => [...rs, toRow({})])}>
          + Add a value
        </Button>
      </div>

      {saveError && (
        <div className="mt-4">
          <ErrorBox>{saveError}</ErrorBox>
        </div>
      )}

      <div className="sticky bottom-24 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-full bg-cream/90 p-2 shadow-[0_6px_24px_rgba(53,64,36,0.12)] backdrop-blur md:bottom-4">
        <Button variant="ghost" onClick={remove} className="!text-alert">
          Delete
        </Button>
        <Button onClick={save} loading={saving}>
          {reviewing ? `Save ${rows.length} results` : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
