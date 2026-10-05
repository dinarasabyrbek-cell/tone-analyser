"use client";

import { Button, ErrorBox, Loading } from "@/components/ui";
import { SYSTEMS, type SystemKey } from "@/lib/biomarkers";
import { recentChanges } from "@/lib/changes";
import { useLoad } from "@/lib/client/useLoad";
import { age, seriesByMarker } from "@/lib/context";
import { criticalHits } from "@/lib/critical";
import { getStore } from "@/lib/store";

/** One printable page to bring to a doctor's appointment. */
export default function SummaryPage() {
  const store = getStore();
  const { data, error, loading, reload } = useLoad(async () => {
    const [profile, results, review] = await Promise.all([store.getProfile(), store.listResults(), store.latestReview()]);
    return { profile, series: seriesByMarker(results), review };
  });
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox onRetry={reload}>{error}</ErrorBox>;

  const { profile: p, series, review } = data;
  const flagged = series.filter((s) => s.latest.flag === "high" || s.latest.flag === "low");
  const changes = recentChanges(series);
  const critical = criticalHits(series.map((s) => s.latest));
  const bySystem = new Map<string, typeof series>();
  for (const s of series) bySystem.set(s.system, [...(bySystem.get(s.system) ?? []), s]);
  const questions = [
    ...flagged.map((f) => `My ${f.name} was ${f.latest.flag} (${f.latest.value} ${f.latest.unit}, ${f.latest.taken_at}). What could cause this, and should I re-test?`),
    ...(review?.see_doctor ?? []),
  ].slice(0, 8);

  return (
    <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 text-[13px] leading-relaxed text-black shadow-sm print:max-w-none print:rounded-none print:p-0 print:shadow-none sm:p-10">
      <div className="mb-6 flex items-start justify-between gap-4 print:hidden">
        <p className="text-sm text-noir/70">A one-page summary of your results to bring to an appointment. Print it or save as PDF.</p>
        <Button onClick={() => window.print()}>Print / PDF</Button>
      </div>

      <h1 className="display text-3xl text-kombu">Health summary</h1>
      <p className="mt-1 text-xs text-neutral-500">Prepared {new Date().toISOString().slice(0, 10)} with Soul Health from the patient&apos;s own uploaded lab reports. Not a clinical document.</p>

      <table className="mt-5 w-full text-left">
        <tbody>
          <Row k="Name" v={p.name || "—"} />
          <Row k="Age / sex" v={`${age(p) ?? "—"} / ${p.sex || "—"}`} />
          <Row k="Height / weight" v={`${p.height_cm ?? "—"} cm / ${p.weight_kg ?? "—"} kg`} />
          <Row k="Known conditions" v={p.conditions || "—"} />
          <Row k="Medications" v={p.medications || "—"} />
          <Row k="Supplements" v={p.supplements || "—"} />
        </tbody>
      </table>

      {critical.length > 0 && (
        <Section title="Urgent-range values">
          <ul className="list-disc pl-5 font-semibold text-alert">
            {critical.map((c) => (
              <li key={c.key}>
                {c.name}: {c.value} ({c.direction}) — {c.taken_at}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={`Out of range (${flagged.length})`}>
        {flagged.length ? (
          <ul className="list-disc pl-5">
            {flagged.map((f) => (
              <li key={f.key}>
                <strong>{f.name}</strong>: {f.latest.value} {f.latest.unit} ({f.latest.flag}; range {f.latest.ref_low ?? "…"}–{f.latest.ref_high ?? "…"}) on {f.latest.taken_at}
                {f.previous && ` — previously ${f.previous.value} ${f.previous.unit} on ${f.previous.taken_at}`}
              </li>
            ))}
          </ul>
        ) : (
          <p>All latest results are within the lab reference ranges.</p>
        )}
      </Section>

      {changes.length > 0 && (
        <Section title="Notable changes since the previous test">
          <ul className="list-disc pl-5">
            {changes.slice(0, 10).map((c) => (
              <li key={c.key}>
                {c.name}: {c.from} → {c.to} ({c.pct > 0 ? "+" : ""}
                {c.pct}%, {c.date})
              </li>
            ))}
          </ul>
        </Section>
      )}

      {questions.length > 0 && (
        <Section title="Questions for my doctor">
          <ol className="list-decimal pl-5">
            {questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </Section>
      )}

      <Section title="All latest results">
        {[...bySystem].map(([sys, list]) => (
          <div key={sys} className="mb-3 break-inside-avoid">
            <p className="font-semibold">{SYSTEMS[sys as SystemKey]?.name ?? sys}</p>
            <table className="w-full">
              <tbody>
                {list.map((s) => (
                  <tr key={s.key} className="border-b border-neutral-200">
                    <td className="py-0.5 pr-2">{s.name}</td>
                    <td className="py-0.5 pr-2 tabular-nums">
                      {s.latest.value} {s.latest.unit}
                    </td>
                    <td className="py-0.5 pr-2 text-neutral-500">
                      {s.latest.ref_low ?? "…"}–{s.latest.ref_high ?? "…"}
                    </td>
                    <td className={s.latest.flag === "high" || s.latest.flag === "low" ? "py-0.5 font-semibold text-alert" : "py-0.5 text-neutral-500"}>
                      {s.latest.flag === "normal" ? "" : s.latest.flag}
                    </td>
                    <td className="py-0.5 text-right text-neutral-500">{s.latest.taken_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {!series.length && <p>No results uploaded yet.</p>}
      </Section>

      {review && (
        <Section title={`AI overview (${review.created_at.slice(0, 10)}, for context only)`}>
          <p>{review.summary}</p>
        </Section>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <tr className="border-b border-neutral-200">
      <th className="w-40 py-1 pr-3 font-semibold">{k}</th>
      <td className="py-1">{v}</td>
    </tr>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 border-b-2 border-kombu pb-1 text-sm font-bold uppercase tracking-wider text-kombu">{title}</h2>
      {children}
    </section>
  );
}
