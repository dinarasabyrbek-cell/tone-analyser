"use client";

import { MarkerRow } from "@/components/markers";
import { ButtonLink, Disclaimer, Empty, ErrorBox, Loading, PageHeader } from "@/components/ui";
import { SYSTEMS, type SystemKey } from "@/lib/biomarkers";
import { useLoad } from "@/lib/client/useLoad";
import { seriesByMarker } from "@/lib/context";
import { getStore } from "@/lib/store";

export default function MarkersPage() {
  const { data, error, loading, reload } = useLoad(() => getStore().listResults());
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox onRetry={reload}>{error}</ErrorBox>;

  const series = seriesByMarker(data);
  const groups = new Map<SystemKey, typeof series>();
  for (const s of series) groups.set(s.system as SystemKey, [...(groups.get(s.system as SystemKey) ?? []), s]);

  return (
    <div>
      <PageHeader
        title={
          <>
            All <em>markers</em>
          </>
        }
        intro="Every value you've ever tested, grouped by body system. Tap one to see its trend over time."
      />
      {!series.length ? (
        <Empty title="Nothing tracked yet" action={<ButtonLink href="/labs">Upload labs</ButtonLink>}>
          Once you save a lab report, each marker shows up here with its history.
        </Empty>
      ) : (
        <div className="flex flex-col gap-8">
          {[...groups].map(([sys, list]) => (
            <section key={sys}>
              <h2 className="display mb-2 text-2xl text-kombu">{SYSTEMS[sys]?.name ?? sys}</h2>
              <div className="rounded-3xl bg-[#fffaf2] p-2">
                {list.map((s) => (
                  <MarkerRow key={s.key} s={s} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <Disclaimer />
    </div>
  );
}
