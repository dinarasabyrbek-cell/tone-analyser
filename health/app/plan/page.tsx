"use client";

import { useState } from "react";
import { Tiles } from "@/components/Shapes";
import { Button, Card, Chip, Disclaimer, ErrorBox, Loading, PageHeader, cx } from "@/components/ui";
import { getBiomarker } from "@/lib/biomarkers";
import { postJSON } from "@/lib/client/api";
import { loadContext } from "@/lib/client/data";
import { saveFile } from "@/lib/client/files";
import { useLoad } from "@/lib/client/useLoad";
import { seriesByMarker } from "@/lib/context";
import { baselinePlan, frequencyLabel, planStatus, sortPlan } from "@/lib/plan";
import { getStore } from "@/lib/store";
import { uid } from "@/lib/store/local";
import type { PlanItem } from "@/lib/types";

/** Downloads an all-day calendar reminder (.ics) — works with Apple, Google and Outlook calendars. */
function downloadIcs(item: PlanItem, date: string) {
  const d = date.replace(/-/g, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const esc = (s: string) => s.replace(/[,;\\]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Soul Health//EN",
    "BEGIN:VEVENT",
    `UID:${uid()}@soul-health`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d}`,
    `SUMMARY:${esc("Lab test: " + item.name)}`,
    `DESCRIPTION:${esc(item.reason + "\nFasting morning sample is usually best.")}`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    "DESCRIPTION:Lab test tomorrow",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  saveFile(`${item.name.replace(/[^\w]+/g, "-").toLowerCase()}.ics`, ics, "text/calendar").catch(() => {});
}

export default function PlanPage() {
  const store = getStore();
  const { data, setData, error, loading, reload } = useLoad(async () => {
    const [profile, results, saved] = await Promise.all([store.getProfile(), store.listResults(), store.getPlan()]);
    const series = seriesByMarker(results);
    return { series, items: saved ?? baselinePlan(profile, series), personalised: Boolean(saved?.some((i) => i.source === "ai")), profile };
  });
  const [busy, setBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox onRetry={reload}>{error}</ErrorBox>;

  async function personalise() {
    setBusy(true);
    setAiError(null);
    try {
      const { context } = await loadContext({ food: false });
      const { items } = await postJSON<{ items: Omit<PlanItem, "id" | "source">[] }>("/api/plan", { context });
      const plan = sortPlan(items.map((i) => ({ ...i, id: uid(), source: "ai" as const })));
      await store.savePlan(plan);
      setData((d) => (d ? { ...d, items: plan, personalised: true } : d));
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPlan() {
    const plan = baselinePlan(data!.profile, data!.series);
    await store.savePlan(plan);
    setData((d) => (d ? { ...d, items: plan, personalised: false } : d));
  }

  const rows = data.items.map((item) => ({ item, st: planStatus(item, data.series) })).sort((a, b) => a.st.daysLeft - b.st.daysLeft);

  return (
    <div>
      <PageHeader
        title={
          <>
            Next <em>tests</em>
          </>
        }
        intro={
          data.personalised
            ? "Your personalised schedule, built by the AI from your history, profile and flagged values."
            : "A sensible baseline schedule, with anything out of range brought forward. Personalise it with AI for your age, conditions and goals."
        }
        action={
          <div className="flex gap-2">
            {data.personalised && (
              <Button variant="outline" onClick={resetPlan}>
                Baseline
              </Button>
            )}
            <Button onClick={personalise} loading={busy}>
              {data.personalised ? "Re-personalise" : "Personalise with AI"}
            </Button>
          </div>
        }
      />
      {aiError && (
        <div className="mb-4">
          <ErrorBox onRetry={personalise}>{aiError}</ErrorBox>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map(({ item, st }, i) => (
          <Card key={item.id} tone={i === 0 ? "kombu" : st.overdue ? "bone" : "white"} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={cx("text-lg font-semibold", i === 0 && "text-cream")}>{item.name}</p>
                <p className={cx("text-xs", i === 0 ? "text-cream/70" : "text-noir/55")}>
                  {frequencyLabel(item.frequency_months)} · {item.priority === "high" ? "High priority" : item.priority === "low" ? "Nice to have" : "Routine"}
                </p>
              </div>
              {i === 0 ? <Tiles className="shrink-0 scale-75 text-moss" /> : null}
            </div>
            <p className={cx("text-sm", i === 0 ? "text-cream/85" : "text-noir/75")}>{item.reason}</p>
            {item.marker_keys.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.marker_keys.slice(0, 6).map((k) => (
                  <Chip key={k} tone={i === 0 ? "cream" : "tan"}>
                    {getBiomarker(k)?.name ?? k.replace(/^x_/, "").replace(/_/g, " ")}
                  </Chip>
                ))}
              </div>
            )}
            <div className={cx("mt-auto flex items-center justify-between gap-2 border-t pt-3 text-sm", i === 0 ? "border-cream/20" : "border-noir/10")}>
              <span className={i === 0 ? "text-cream/80" : "text-noir/65"}>
                {st.lastDone ? `Last: ${st.lastDone}` : "Never tested"}
                {" · "}
                <strong className={cx(st.overdue && (i === 0 ? "text-tan" : "text-alert"))}>
                  {!st.lastDone ? "Due now" : st.overdue ? `Overdue (${st.nextDue})` : `Due ${st.nextDue}`}
                </strong>
              </span>
              <button
                onClick={() => downloadIcs(item, st.overdue ? new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10) : st.nextDue)}
                className={cx("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", i === 0 ? "bg-cream text-kombu" : "bg-kombu text-cream")}
              >
                + Calendar
              </button>
            </div>
          </Card>
        ))}
      </div>
      <Disclaimer />
    </div>
  );
}
