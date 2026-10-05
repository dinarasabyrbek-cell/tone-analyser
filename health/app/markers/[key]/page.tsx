"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FlagChip, TrendChart } from "@/components/markers";
import { ButtonLink, Card, Chip, Disclaimer, ErrorBox, Loading, PageHeader } from "@/components/ui";
import { getBiomarker, SYSTEMS } from "@/lib/biomarkers";
import { useLoad } from "@/lib/client/useLoad";
import { seriesByMarker } from "@/lib/context";
import { getStore } from "@/lib/store";

export default function MarkerPage() {
  const { key: rawKey } = useParams<{ key: string }>();
  const key = decodeURIComponent(rawKey);
  const store = getStore();
  const { data, error, loading, reload } = useLoad(async () => {
    const [results, review] = await Promise.all([store.listResults(), store.latestReview()]);
    return { series: seriesByMarker(results).find((s) => s.key === key) ?? null, review };
  }, [key]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox onRetry={reload}>{error}</ErrorBox>;
  const s = data.series;
  if (!s) return <ErrorBox>No results for this marker yet.</ErrorBox>;
  const b = getBiomarker(key);
  const systemNote = data.review?.systems.find((x) => x.key === s.system);
  const question = `Tell me about my ${s.name}: what do my results over time mean and what can I do?`;

  return (
    <div>
      <Link href="/markers" className="text-sm text-moss">
        ← All markers
      </Link>
      <PageHeader
        title={<>{s.name}</>}
        intro={
          <span className="flex flex-wrap items-center gap-2">
            <Chip tone="moss">{SYSTEMS[s.system as keyof typeof SYSTEMS]?.name ?? s.system}</Chip>
            <span>
              Latest: <strong>{s.latest.value} {s.latest.unit}</strong> on {s.latest.taken_at}
            </span>
            <FlagChip flag={s.latest.flag} />
          </span>
        }
        action={<ButtonLink href={`/coach?q=${encodeURIComponent(question)}`}>Ask the coach</ButtonLink>}
      />

      <Card tone="white" className="mb-6">
        {s.points.length > 1 ? (
          <TrendChart s={s} />
        ) : (
          <p className="py-6 text-center text-sm text-noir/60">Only one result so far — the trend appears after your next test.</p>
        )}
        <p className="mt-2 text-center text-[11px] text-noir/45">Shaded band = reference range</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {b && (
          <Card tone="kombu">
            <p className="display text-2xl">
              What it <em className="!text-lime">means</em>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-cream/85">{b.about}</p>
            <p className="display mt-5 text-2xl">
              What <em className="!text-lime">moves</em> it
            </p>
            <p className="mt-2 text-sm leading-relaxed text-cream/85">{b.levers}</p>
          </Card>
        )}
        <Card tone="bone">
          <p className="display text-2xl">
            Your <em>history</em>
          </p>
          <ul className="mt-3 flex flex-col divide-y divide-noir/10">
            {[...s.points].reverse().map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link href={`/labs/${p.report_id}`} className="underline-offset-4 hover:underline">
                  {p.taken_at}
                </Link>
                <span className="tabular-nums">
                  {p.value} {p.unit}
                  {(p.ref_low != null || p.ref_high != null) && (
                    <span className="ml-1 text-xs text-noir/50">
                      ({p.ref_low ?? "…"}–{p.ref_high ?? "…"})
                    </span>
                  )}
                </span>
                <FlagChip flag={p.flag} />
              </li>
            ))}
          </ul>
          {systemNote && <p className="mt-4 rounded-2xl bg-cream/70 p-3 text-sm text-noir/75">AI note: {systemNote.note}</p>}
        </Card>
      </div>
      <Disclaimer />
    </div>
  );
}
