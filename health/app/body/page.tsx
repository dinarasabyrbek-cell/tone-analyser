"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { BodyMode } from "@/components/Body3D";
import { FlagChip } from "@/components/markers";
import { ButtonLink, Card, Chip, Disclaimer, ErrorBox, Loading, cx } from "@/components/ui";
import { exerciseVideoLinks, learnLinks, MUSCLES, ORGAN_BY_MESH, ORGANS, watchLinks } from "@/lib/anatomy";
import { organStatuses, STATUS_COLORS, type OrganStatus } from "@/lib/bodyStatus";
import { daysAgo } from "@/lib/client/data";
import { useLoad } from "@/lib/client/useLoad";
import { seriesByMarker } from "@/lib/context";
import { getStore } from "@/lib/store";
import { muscleFatigue, recoveryPct, weeklyCounts } from "@/lib/training";
import type { SystemStatus } from "@/lib/types";

const Body3D = dynamic(() => import("@/components/Body3D"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-kombu/70">Loading 3D…</div>,
});

const STATUS_LABEL: Record<SystemStatus, string> = { good: "Looks good", watch: "Keep an eye on", attention: "Needs attention", unknown: "No data yet" };

/** Recovery colour: fresh (moss) → tired (terracotta). */
function recoveryColor(pct: number): string {
  const a = new Map([
    [0, [181, 100, 60]],
    [50, [212, 166, 74]],
    [100, [136, 144, 99]],
  ]);
  const [lo, hi] = pct < 50 ? [0, 50] : [50, 100];
  const t = (pct - lo) / 50;
  const c = a.get(lo)!.map((v, i) => Math.round(v + (a.get(hi)![i] - v) * t));
  return `rgb(${c.join(",")})`;
}

export default function BodyPage() {
  const store = getStore();
  const { data, error, loading, reload } = useLoad(async () => {
    const [results, review, workouts] = await Promise.all([store.listResults(), store.latestReview(), store.listWorkouts(daysAgo(14))]);
    return { series: seriesByMarker(results), review, workouts };
  });
  const [mode, setMode] = useState<BodyMode>("health");
  const [selected, setSelected] = useState<string | null>(null); // organ id or muscle mesh id
  const [showSkin, setShowSkin] = useState(true);
  const [showBones, setShowBones] = useState(false);
  const [view, setView] = useState<"front" | "back">("front");
  const [fail, setFail] = useState<string | null>(null);

  const statuses = useMemo(() => (data ? organStatuses(data.series, data.review) : new Map<string, OrganStatus>()), [data]);
  const fatigue = useMemo(() => (data ? muscleFatigue(data.workouts) : new Map<string, number>()), [data]);
  const weekly = useMemo(() => (data ? weeklyCounts(data.workouts) : new Map<string, number>()), [data]);

  const colors = useMemo(() => {
    const c: Record<string, string> = {};
    if (mode === "health") {
      for (const st of statuses.values()) for (const m of st.organ.meshes) c[m] = STATUS_COLORS[st.status];
    } else {
      for (const m of MUSCLES) c[m.id] = recoveryColor(recoveryPct(fatigue.get(m.id)));
    }
    return c;
  }, [mode, statuses, fatigue]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox onRetry={reload}>{error}</ErrorBox>;

  const organSel = mode === "health" && selected ? statuses.get(selected) ?? null : null;
  const muscleSel = mode === "muscles" && selected ? MUSCLES.find((m) => m.id === selected) ?? null : null;
  const selectedMeshes = organSel ? organSel.organ.meshes : muscleSel ? [muscleSel.id] : [];

  function pick(mesh: string | null) {
    if (!mesh) return setSelected(null);
    if (mode === "muscles") return setSelected(mesh);
    const organ = ORGAN_BY_MESH.get(mesh);
    setSelected(organ ? organ.id : null);
  }

  function switchMode(m: BodyMode) {
    setMode(m);
    setSelected(null);
    if (m === "muscles") setShowBones(false);
  }

  const counts = { good: 0, watch: 0, attention: 0, unknown: 0 };
  for (const s of statuses.values()) counts[s.status]++;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-4xl sm:text-5xl">
          Your <em>body</em>
        </h1>
        <div className="flex rounded-full bg-bone/70 p-1" role="tablist">
          {(["health", "muscles"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={cx("rounded-full px-4 py-1.5 text-sm font-semibold transition", mode === m ? "bg-kombu text-cream" : "text-noir/65")}
            >
              {m === "health" ? "Organs" : "Muscles"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        {/* Viewer */}
        <div className="hero-bg relative h-[62vh] min-h-[420px] overflow-hidden rounded-5xl lg:h-[78vh]">
          {fail ? (
            <div className="grid h-full place-items-center p-6 text-center text-sm text-noir/70">{fail} Use the list below instead.</div>
          ) : (
            <Body3D mode={mode} colors={colors} selectedMeshes={selectedMeshes} onPick={pick} showSkin={showSkin} showBones={showBones} view={view} onError={setFail} />
          )}
          <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap justify-between gap-2">
            <div className="pointer-events-auto flex gap-1.5">
              <Toggle on={showSkin} onClick={() => setShowSkin((v) => !v)}>Skin</Toggle>
              {mode === "health" && <Toggle on={showBones} onClick={() => setShowBones((v) => !v)}>Bones</Toggle>}
            </div>
            <div className="pointer-events-auto flex gap-1.5">
              <Toggle on={view === "front"} onClick={() => setView("front")}>Front</Toggle>
              <Toggle on={view === "back"} onClick={() => setView("back")}>Back</Toggle>
              {selected && (
                <button onClick={() => setSelected(null)} className="rounded-full bg-kombu px-3 py-1 text-xs font-semibold text-cream">
                  Reset
                </button>
              )}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap justify-center gap-1.5 text-[11px]">
            {mode === "health"
              ? (["attention", "watch", "good", "unknown"] as const).map((s) => (
                  <span key={s} className="flex items-center gap-1 rounded-full bg-cream/85 px-2.5 py-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[s] }} />
                    {STATUS_LABEL[s]} ({counts[s]})
                  </span>
                ))
              : [
                  ["Tired", 0],
                  ["Recovering", 50],
                  ["Fresh", 100],
                ].map(([l, p]) => (
                  <span key={l} className="flex items-center gap-1 rounded-full bg-cream/85 px-2.5 py-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: recoveryColor(p as number) }} />
                    {l}
                  </span>
                ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-4">
          {organSel ? (
            <OrganPanel st={organSel} />
          ) : muscleSel ? (
            <Card tone="white" className="flex flex-col gap-3">
              <p className="display text-3xl text-kombu">{muscleSel.name}</p>
              <div className="flex flex-wrap gap-2">
                <Chip tone="moss">{recoveryPct(fatigue.get(muscleSel.id))}% recovered</Chip>
                <Chip tone="tan">
                  {weekly.get(muscleSel.id) ?? 0} session{weekly.get(muscleSel.id) === 1 ? "" : "s"} this week
                </Chip>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-moss">Exercises</p>
              <ul className="flex flex-col gap-2">
                {muscleSel.exercises.map((ex) => (
                  <li key={ex} className="flex items-center justify-between gap-2 rounded-2xl bg-bone/50 px-3 py-2 text-sm">
                    <span className="capitalize">{ex}</span>
                    <span className="flex gap-1.5">
                      {exerciseVideoLinks(ex).map((l) => (
                        <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="rounded-full bg-kombu px-2.5 py-1 text-[11px] font-semibold text-cream">
                          ▶ {l.label}
                        </a>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
              <ButtonLink href="/workouts">Log a workout</ButtonLink>
            </Card>
          ) : (
            <Card tone="white">
              <p className="display text-2xl">
                Tap {mode === "health" ? "an organ" : "a muscle"} to <em>zoom in</em>
              </p>
              <p className="mt-2 text-sm text-noir/70">
                {mode === "health"
                  ? "Colours come from your lab results and the latest AI review. Drag to rotate, pinch to zoom."
                  : "Colours show how recovered each muscle is from your logged workouts in the last 3 days."}
              </p>
              {mode === "muscles" && !data.workouts.length && (
                <p className="mt-3 text-sm">
                  No workouts yet — <Link href="/workouts" className="font-semibold text-kombu underline">log your first one</Link>.
                </p>
              )}
            </Card>
          )}

          {/* Accessible list */}
          <div className="flex flex-wrap gap-1.5">
            {mode === "health"
              ? ORGANS.map((o) => {
                  const st = statuses.get(o.id)!;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setSelected(selected === o.id ? null : o.id)}
                      className={cx("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition", selected === o.id ? "border-kombu bg-kombu text-cream" : "border-noir/10 bg-[#fffaf2]")}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[st.status] }} />
                      {o.name}
                    </button>
                  );
                })
              : MUSCLES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelected(selected === m.id ? null : m.id)}
                    className={cx("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition", selected === m.id ? "border-kombu bg-kombu text-cream" : "border-noir/10 bg-[#fffaf2]")}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: recoveryColor(recoveryPct(fatigue.get(m.id))) }} />
                    {m.name}
                  </button>
                ))}
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-[10px] leading-relaxed text-noir/45">
        3D anatomy: BodyParts3D, © The Database Center for Life Science, licensed under{" "}
        <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en" className="underline" target="_blank" rel="noreferrer">
          CC BY-SA 2.1 JP
        </a>
        . Simplified for mobile; the model is a single adult male body, the thyroid shape is approximate.
      </p>
      <Disclaimer />
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cx("rounded-full px-3 py-1 text-xs font-semibold backdrop-blur transition", on ? "bg-cream text-kombu" : "bg-cream/40 text-noir/60")}
    >
      {children}
    </button>
  );
}

function OrganPanel({ st }: { st: OrganStatus }) {
  const { organ, status, markers, flagged, notes } = st;
  const question = `Explain what my results say about my ${organ.name.toLowerCase()} and what I can do.`;
  return (
    <Card tone="white" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <p className="display text-3xl text-kombu">{organ.name}</p>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-cream" style={{ background: STATUS_COLORS[status] }}>
          {STATUS_LABEL[status]}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-noir/80">{organ.about}</p>

      {flagged.length > 0 && (
        <div className="rounded-2xl bg-alert-100 p-3 text-sm text-alert">
          <p className="font-semibold">What&apos;s off</p>
          <ul className="mt-1 list-disc pl-5">
            {flagged.map((f) => (
              <li key={f.key}>
                {f.name} is {f.latest.flag} — {f.latest.value} {f.latest.unit}
                {f.latest.ref_low != null || f.latest.ref_high != null ? ` (range ${f.latest.ref_low ?? "…"}–${f.latest.ref_high ?? "…"})` : ""} on {f.latest.taken_at}
              </li>
            ))}
          </ul>
        </div>
      )}
      {notes.map((n) => (
        <p key={n} className="rounded-2xl bg-sage-100 p-3 text-sm">
          <span className="font-semibold">AI review: </span>
          {n}
        </p>
      ))}

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-moss">What your labs show</p>
        <p className="text-sm text-noir/75">{organ.labsTell}</p>
        {markers.length > 0 ? (
          <div className="mt-2 flex flex-col divide-y divide-noir/10 rounded-2xl bg-bone/40 px-3">
            {markers.map((m) => (
              <Link key={m.key} href={`/markers/${m.key}`} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span>{m.name}</span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums">
                    {m.latest.value} <span className="text-xs text-noir/50">{m.latest.unit}</span>
                  </span>
                  <FlagChip flag={m.latest.flag} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-noir/60">
            No results for this organ yet. <Link href="/plan" className="font-semibold text-kombu underline">See which tests help</Link>.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {learnLinks(organ.topic).map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="rounded-full border border-kombu/30 px-3 py-1 text-xs font-semibold text-kombu">
            Read · {l.label}
          </a>
        ))}
        {watchLinks(organ.topic).map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="rounded-full bg-kombu px-3 py-1 text-xs font-semibold text-cream">
            ▶ {l.label}
          </a>
        ))}
      </div>
      <ButtonLink href={`/coach?q=${encodeURIComponent(question)}`} variant="outline">
        Ask the coach
      </ButtonLink>
    </Card>
  );
}
