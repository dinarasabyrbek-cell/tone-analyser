"use client";

import Link from "next/link";
import { useState } from "react";
import { MarkerRow } from "@/components/markers";
import { Leaf, Pebbles, Sparkle, Stones } from "@/components/Shapes";
import { ArrowButton, Button, ButtonLink, Card, Chip, Disclaimer, Display, ErrorBox, Eyebrow, Loading, cx } from "@/components/ui";
import { SYSTEMS } from "@/lib/biomarkers";
import { postJSON } from "@/lib/client/api";
import { loadContext, startOfToday } from "@/lib/client/data";
import { useLoad } from "@/lib/client/useLoad";
import { seriesByMarker, waterTarget } from "@/lib/context";
import { baselinePlan, planStatus } from "@/lib/plan";
import { getStore } from "@/lib/store";
import type { HealthReview, SystemStatus } from "@/lib/types";

const STATUS: Record<SystemStatus, { label: string; tone: "moss" | "tan" | "alert" | "cream"; dot: string }> = {
  good: { label: "Good", tone: "moss", dot: "bg-moss" },
  watch: { label: "Watch", tone: "tan", dot: "bg-tan" },
  attention: { label: "Attention", tone: "alert", dot: "bg-alert" },
  unknown: { label: "No data", tone: "cream", dot: "bg-noir/20" },
};

export default function Dashboard() {
  const store = getStore();
  const { data, setData, error, loading, reload } = useLoad(async () => {
    const [profile, results, review, water, food, plan] = await Promise.all([
      store.getProfile(),
      store.listResults(),
      store.latestReview(),
      store.listWater(startOfToday()),
      store.listFood(startOfToday()),
      store.getPlan(),
    ]);
    return { profile, results, review, water, food, plan };
  });
  const [busy, setBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox onRetry={reload}>{error}</ErrorBox>;

  const series = seriesByMarker(data.results);
  const flagged = series.filter((s) => s.latest.flag === "high" || s.latest.flag === "low");
  const review = data.review;
  const waterToday = data.water.reduce((a, w) => a + w.ml, 0);
  const target = waterTarget(data.profile);
  const plan = data.plan ?? baselinePlan(data.profile, series);
  const due = plan
    .map((p) => ({ p, st: planStatus(p, series) }))
    .sort((a, b) => a.st.daysLeft - b.st.daysLeft)
    .slice(0, 3);
  const hasProfile = Boolean(data.profile.birth_year || data.profile.sex);
  const stale = review && data.results.some((r) => r.taken_at > review.created_at.slice(0, 10));

  async function refreshReview() {
    setBusy(true);
    setAiError(null);
    try {
      const { context } = await loadContext();
      const r = await postJSON<Omit<HealthReview, "id" | "created_at">>("/api/review", { context });
      const saved = await store.saveReview(r);
      setData((d) => (d ? { ...d, review: saved } : d));
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addWater(ml: number) {
    const log = await store.addWater(ml);
    setData((d) => (d ? { ...d, water: [...d.water, log] } : d));
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="hero-bg relative overflow-hidden rounded-5xl px-5 pb-8 pt-10 sm:px-10 sm:pb-12 sm:pt-14">
        <div className="relative z-10 flex flex-col items-center text-center">
          <Eyebrow>Labs · Food · Habits</Eyebrow>
          <h1 className="display mt-3 text-5xl text-kombu sm:text-7xl">
            Your <em className="!text-cream">health</em> today
          </h1>
          <p className="mt-3 max-w-md text-sm text-noir/75">
            {data.profile.name ? `Hi ${data.profile.name}. ` : ""}Everything your results say — explained, tracked and turned into small daily steps.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <ButtonLink href="/labs?upload=1">Upload labs</ButtonLink>
            <ButtonLink href="/coach" variant="light">
              Ask the coach
            </ButtonLink>
          </div>

          <div className="glass relative mt-10 flex aspect-square w-full max-w-[22rem] flex-col items-center justify-center rounded-full p-10 text-center">
            {review ? (
              <>
                {review.score != null && (
                  <div className="mb-2 flex items-baseline gap-1 text-kombu">
                    <span className="display text-5xl">{review.score}</span>
                    <span className="text-xs text-noir/50">/100</span>
                  </div>
                )}
                <p className="display text-xl leading-snug text-noir sm:text-2xl">{review.headline}</p>
                <p className="mt-2 text-[11px] text-noir/50">Review from {review.created_at.slice(0, 10)}</p>
              </>
            ) : (
              <p className="display text-xl leading-snug text-noir sm:text-2xl">
                Healing <em>isn&apos;t always</em> a straight line. But it doesn&apos;t have to be <em>a circle</em>.
              </p>
            )}
            <Button onClick={refreshReview} loading={busy} disabled={!series.length} className="mt-5 !px-4 !py-2 !text-[11px]">
              {review ? "Refresh review" : "Get my review"}
            </Button>
            {!series.length && <p className="mt-2 text-[11px] text-noir/50">Upload a lab report first</p>}
          </div>
        </div>
        <Sparkle className="absolute left-6 top-8 h-8 w-8 text-cream/70" />
        <Sparkle className="absolute bottom-10 right-8 h-12 w-12 text-cream/60" />
      </section>

      {aiError && <ErrorBox onRetry={refreshReview}>{aiError}</ErrorBox>}
      {stale && <p className="-mt-6 text-center text-xs text-moss">You have newer lab results than this review — refresh it to include them.</p>}

      {/* Steps */}
      {(!series.length || !hasProfile) && (
        <section>
          <Display as="h2" className="mb-5 text-center">
            Few steps to <em>begin</em>
          </Display>
          <div className="grid gap-3 sm:grid-cols-3">
            <StepCard tone="kombu" title="Tell us about you" text="Age, sex, conditions, meds and goals make every insight personal." href="/profile" done={hasProfile} shape={<Leaf className="text-sage" />} />
            <StepCard tone="moss" title="Upload your labs" text="PDFs or phone photos, any year, any language. The AI reads every number." href="/labs?upload=1" done={series.length > 0} shape={<Stones className="text-sage" />} />
            <StepCard tone="sage" title="Get your plan" text="An overall review, what to eat and drink, and when to test next." href="/plan" shape={<Pebbles className="text-moss" />} />
          </div>
        </section>
      )}

      {/* Review */}
      {review && (
        <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Card tone="white" className="flex flex-col gap-4">
            <Display as="h2">
              The <em>overview</em>
            </Display>
            <p className="text-[15px] leading-relaxed text-noir/85">{review.summary}</p>
            {review.see_doctor.length > 0 && (
              <div className="rounded-2xl bg-alert-100 p-4 text-sm text-alert">
                <p className="mb-1 font-semibold">Worth discussing with a doctor</p>
                <ul className="list-disc pl-5">
                  {review.see_doctor.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
            {review.priorities.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-moss">Your priorities</p>
                <ol className="flex flex-col gap-2">
                  {review.priorities.map((p, i) => (
                    <li key={i} className="flex gap-3 rounded-2xl bg-bone/50 p-3">
                      <span className="display grid h-7 w-7 shrink-0 place-items-center rounded-full bg-kombu text-sm text-cream">{i + 1}</span>
                      <div>
                        <p className="text-sm font-semibold">{p.title}</p>
                        <p className="text-sm text-noir/70">{p.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </Card>
          <div className="flex flex-col gap-4">
            <Card tone="kombu">
              <p className="display text-2xl">
                Eat <em className="!text-lime">more</em>
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {review.eat_more.map((x) => (
                  <Chip key={x} tone="cream">{x}</Chip>
                ))}
              </div>
              {review.eat_less.length > 0 && (
                <>
                  <p className="display mt-5 text-2xl">
                    Go <em className="!text-tan">easy</em> on
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {review.eat_less.map((x) => (
                      <Chip key={x} tone="tan">{x}</Chip>
                    ))}
                  </div>
                </>
              )}
              {review.hydration && <p className="mt-5 text-sm text-cream/80">💧 {review.hydration}</p>}
            </Card>
          </div>
        </section>
      )}

      {/* Body systems */}
      {review && review.systems.length > 0 && (
        <section>
          <Display as="h2" className="mb-5">
            Body <em>systems</em>
          </Display>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {review.systems.map((s) => {
              const st = STATUS[s.status];
              return (
                <Card key={s.key} tone={s.status === "attention" ? "bone" : "cream"} className="flex flex-col gap-2 !p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{SYSTEMS[s.key]?.name ?? s.key}</p>
                    <Chip tone={st.tone}>
                      <span className={cx("h-1.5 w-1.5 rounded-full", st.dot)} /> {st.label}
                    </Chip>
                  </div>
                  <p className="text-sm text-noir/70">{s.note}</p>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Flagged markers */}
      {series.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <Display as="h2">
              {flagged.length ? (
                <>
                  Needs <em>attention</em>
                </>
              ) : (
                <>
                  All <em>in range</em>
                </>
              )}
            </Display>
            <Link href="/markers" className="text-sm font-semibold text-kombu underline-offset-4 hover:underline">
              All {series.length} markers →
            </Link>
          </div>
          {flagged.length ? (
            <div className="rounded-3xl bg-[#fffaf2] p-2">
              {flagged.slice(0, 8).map((s, i) => (
                <MarkerRow key={s.key} s={s} highlight={i === 0} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-noir/70">Every latest result is inside its reference range. Lovely.</p>
          )}
        </section>
      )}

      {/* Today */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Card tone="sage" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="display text-2xl">
              Water <em className="!text-kombu">today</em>
            </p>
            <span className="text-sm tabular-nums">
              {(waterToday / 1000).toFixed(2)} / {(target / 1000).toFixed(1)} L
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-cream/70">
            <div className="h-full rounded-full bg-kombu transition-all" style={{ width: `${Math.min(100, (waterToday / target) * 100)}%` }} />
          </div>
          <div className="flex gap-2">
            {[250, 500].map((ml) => (
              <Button key={ml} variant="light" onClick={() => addWater(ml)} className="!px-4 !py-2 !text-xs">
                + {ml} ml
              </Button>
            ))}
          </div>
        </Card>
        <Card tone="bone" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="display text-2xl">
              Next <em>tests</em>
            </p>
            <ArrowButton href="/plan" dark label="Open test plan" />
          </div>
          {due.map(({ p, st }) => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{p.name}</span>
              <Chip tone={st.overdue ? "alert" : "moss"}>{!st.lastDone ? "Not tested" : st.overdue ? "Overdue" : st.nextDue}</Chip>
            </div>
          ))}
          <p className="text-xs text-noir/55">
            {data.food.length} food entr{data.food.length === 1 ? "y" : "ies"} logged today ·{" "}
            <Link href="/food" className="underline">
              add a meal
            </Link>
          </p>
        </Card>
      </section>

      <Disclaimer />
    </div>
  );
}

function StepCard({
  tone,
  title,
  text,
  href,
  shape,
  done,
}: {
  tone: "kombu" | "moss" | "sage";
  title: string;
  text: string;
  href: string;
  shape: React.ReactNode;
  done?: boolean;
}) {
  const dark = tone !== "sage";
  return (
    <Card tone={tone} className="relative flex min-h-56 flex-col justify-between overflow-hidden">
      <div className="flex justify-end">{shape}</div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={cx("text-lg font-medium", dark ? "text-cream" : "text-kombu")}>
            {title} {done && "✓"}
          </p>
          <p className={cx("mt-1 text-xs leading-relaxed", dark ? "text-cream/75" : "text-noir/65")}>{text}</p>
        </div>
        <ArrowButton href={href} dark={!dark} label={title} />
      </div>
    </Card>
  );
}
