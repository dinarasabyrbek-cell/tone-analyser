"use client";

import { useState } from "react";
import { Button, ButtonLink, Card, Chip, Disclaimer, Empty, ErrorBox, Loading, PageHeader, cx } from "@/components/ui";
import { exerciseVideoLinks, guessMinutes, guessMuscles, MUSCLES } from "@/lib/anatomy";
import { postJSON } from "@/lib/client/api";
import { daysAgo, loadContext } from "@/lib/client/data";
import { useLoad } from "@/lib/client/useLoad";
import { getStore } from "@/lib/store";
import { muscleFatigue, neglected, recoveryPct } from "@/lib/training";
import type { WorkoutEntry } from "@/lib/types";

const QUICK = ["Arms 40 min", "Legs & glutes 50 min", "Run 5 km", "Back & biceps", "Chest & triceps", "Yoga 30 min", "Walk 1 hour", "Full body HIIT 25 min"];
const MUSCLE_NAME = new Map(MUSCLES.map((m) => [m.id, m.name]));

type Draft = Omit<WorkoutEntry, "id" | "done_at" | "text">;

export default function WorkoutsPage() {
  const store = getStore();
  const { data, setData, error, loading, reload } = useLoad(() => store.listWorkouts(daysAgo(60)));
  const [text, setText] = useState("");
  const [intensity, setIntensity] = useState<1 | 2 | 3>(2);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox onRetry={reload}>{error}</ErrorBox>;

  async function log(input: string) {
    const t = input.trim();
    if (!t) return;
    setBusy(true);
    setNote(null);
    let draft: Draft;
    try {
      const { context } = await loadContext({ food: false });
      draft = await postJSON<Draft>("/api/workout/parse", { text: t, context });
      draft = { ...draft, intensity };
    } catch {
      // Offline / AI unavailable: simple keyword mapping still lights up the muscle map
      const ids = guessMuscles(t);
      draft = {
        title: t.charAt(0).toUpperCase() + t.slice(1),
        kind: /run|walk|cycl|bike|swim|бег|ходьб/i.test(t) ? "cardio" : /yoga|stretch|pilates|йог/i.test(t) ? "mobility" : "strength",
        minutes: guessMinutes(t),
        intensity,
        kcal: null,
        muscles: ids.map((id) => ({ id, role: "primary" as const })),
        exercises: [],
        note: ids.length ? "" : "Logged — add a body part (e.g. 'legs') to light up the muscle map.",
      };
    }
    const saved = await store.addWorkout({ ...draft, text: t, done_at: new Date().toISOString() });
    setData((d) => [saved, ...(d ?? [])]);
    setNote(saved.note || null);
    setText("");
    setBusy(false);
  }

  async function remove(id: string) {
    await store.deleteWorkout(id);
    setData((d) => (d ?? []).filter((w) => w.id !== id));
  }

  const fatigue = muscleFatigue(data, now);
  const tired = MUSCLES.filter((m) => recoveryPct(fatigue.get(m.id)) < 60);
  const fresh = neglected(data, now).slice(0, 6);
  const week = data.filter((w) => Date.parse(w.done_at) > now - 7 * 864e5);
  const weekMinutes = week.reduce((a, w) => a + (w.minutes ?? 0), 0);

  return (
    <div>
      <PageHeader
        title={
          <>
            Your <em>workouts</em>
          </>
        }
        intro="Just type what you did — the AI works out which muscles you used, and the 3D body shows how recovered each one is."
        action={<ButtonLink href="/body" variant="outline">Muscle map</ButtonLink>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card tone="white" className="flex flex-col gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              log(text);
            }}
            className="flex flex-col gap-3"
          >
            <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. arms 40 min, or 'ran 5k'" aria-label="What did you do?" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex rounded-full bg-bone/70 p-1 text-xs" role="radiogroup" aria-label="Intensity">
                {(["Easy", "Moderate", "Hard"] as const).map((l, i) => (
                  <button
                    type="button"
                    key={l}
                    role="radio"
                    aria-checked={intensity === i + 1}
                    onClick={() => setIntensity((i + 1) as 1 | 2 | 3)}
                    className={cx("rounded-full px-3 py-1.5 font-semibold", intensity === i + 1 ? "bg-kombu text-cream" : "text-noir/60")}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <Button type="submit" loading={busy} disabled={!text.trim()}>
                Log it
              </Button>
            </div>
          </form>
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button key={q} onClick={() => log(q)} disabled={busy} className="rounded-full border border-kombu/25 bg-cream px-3 py-1 text-xs text-kombu hover:bg-sage-100 disabled:opacity-50">
                {q}
              </button>
            ))}
          </div>
          {note && <p className="rounded-2xl bg-sage-100 p-3 text-sm">{note}</p>}
        </Card>

        <Card tone="kombu" className="flex flex-col gap-3">
          <p className="display text-2xl">
            This <em className="!text-lime">week</em>
          </p>
          <p className="text-sm text-cream/80">
            {week.length} session{week.length === 1 ? "" : "s"} · {weekMinutes} min
          </p>
          {tired.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-cream/60">Still recovering</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {tired.map((m) => (
                  <Chip key={m.id} tone="tan">
                    {m.name} · {recoveryPct(fatigue.get(m.id))}%
                  </Chip>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-wider text-cream/60">Fresh — good to train</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {fresh.map((m) => (
                <Chip key={m.id} tone="cream">
                  {m.name}
                </Chip>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="display mb-4 text-3xl">
          Recent <em>sessions</em>
        </h2>
        {!data.length ? (
          <Empty title="No workouts yet">Log one above — even a walk counts.</Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {data.map((w) => (
              <details key={w.id} className="group rounded-3xl bg-[#fffaf2] p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{w.title}</p>
                    <p className="text-xs text-noir/55">
                      {new Date(w.done_at).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · {w.kind}
                      {w.minutes ? ` · ${w.minutes} min` : ""} · {["", "easy", "moderate", "hard"][w.intensity]}
                      {w.kcal ? ` · ~${w.kcal} kcal` : ""}
                    </p>
                  </div>
                  <span className="text-noir/40 group-open:rotate-45">+</span>
                </summary>
                <div className="mt-3 flex flex-col gap-3 border-t border-noir/10 pt-3 text-sm">
                  {w.muscles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {w.muscles.map((m) => (
                        <Chip key={m.id} tone={m.role === "primary" ? "moss" : "tan"}>
                          {MUSCLE_NAME.get(m.id) ?? m.id}
                        </Chip>
                      ))}
                    </div>
                  )}
                  {w.exercises.map((ex) => (
                    <div key={ex} className="flex items-center justify-between gap-2">
                      <span className="capitalize">{ex}</span>
                      <span className="flex gap-1.5">
                        {exerciseVideoLinks(ex).map((l) => (
                          <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="rounded-full bg-kombu px-2.5 py-1 text-[11px] font-semibold text-cream">
                            ▶ {l.label}
                          </a>
                        ))}
                      </span>
                    </div>
                  ))}
                  {w.note && <p className="text-noir/70">{w.note}</p>}
                  <button onClick={() => remove(w.id)} className="self-start text-xs text-alert underline">
                    Delete
                  </button>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
      <Disclaimer />
    </div>
  );
}
