"use client";

import { useRef, useState } from "react";
import { FoodResult } from "@/components/FoodResult";
import { Drop } from "@/components/Shapes";
import { Button, Card, Disclaimer, Empty, ErrorBox, Loading, PageHeader, cx } from "@/components/ui";
import { postJSON } from "@/lib/client/api";
import { daysAgo, loadContext, startOfToday } from "@/lib/client/data";
import { compressImage, thumbnail } from "@/lib/client/files";
import { useLoad } from "@/lib/client/useLoad";
import { waterTarget } from "@/lib/context";
import { getStore } from "@/lib/store";
import type { FoodEntry, FoodKind } from "@/lib/types";

const KINDS: { kind: FoodKind; label: string; hint: string; placeholder: string }[] = [
  { kind: "meal", label: "Meal", hint: "Snap your plate — get nutrition and how it fits your labs.", placeholder: "Optional: e.g. 'large portion, cooked in butter'" },
  { kind: "menu", label: "Menu", hint: "Eating out? Photo the menu and get the best picks for you.", placeholder: "Optional: e.g. 'I want something light and high protein'" },
  { kind: "receipt", label: "Receipt", hint: "Photo a grocery receipt for a review and smarter swaps.", placeholder: "Optional: anything about this shop" },
];

export default function FoodPage() {
  const store = getStore();
  const { data, setData, error, loading, reload } = useLoad(async () => {
    const [food, water, profile] = await Promise.all([store.listFood(daysAgo(30)), store.listWater(daysAgo(7)), store.getProfile()]);
    return { food, water, target: waterTarget(profile) };
  });
  const [kind, setKind] = useState<FoodKind>("meal");
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [latest, setLatest] = useState<FoodEntry | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox onRetry={reload}>{error}</ErrorBox>;

  const cfg = KINDS.find((k) => k.kind === kind)!;

  async function analyse() {
    setBusy(true);
    setAiError(null);
    try {
      const [{ context }, img] = await Promise.all([loadContext({ food: true }), photo ? compressImage(photo.file, 1600) : Promise.resolve(null)]);
      const { result } = await postJSON<{ result: FoodEntry["result"] }>("/api/food/analyze", { kind, image: img?.dataUrl, text: note, context });
      const [thumb, photo_path] = await Promise.all([
        photo ? thumbnail(photo.file) : Promise.resolve(null),
        img ? store.uploadFile("food", img.blob, "photo.jpg").catch(() => null) : Promise.resolve(null),
      ]);
      const entry = await store.addFood({ kind, eaten_at: new Date().toISOString(), note, thumb, photo_path, result });
      setLatest(entry);
      setData((d) => (d ? { ...d, food: [entry, ...d.food] } : d));
      setPhoto(null);
      setNote("");
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

  async function undoWater() {
    const today = data!.water.filter((w) => w.logged_at >= startOfToday());
    const last = today[today.length - 1];
    if (!last) return;
    await store.deleteWater(last.id);
    setData((d) => (d ? { ...d, water: d.water.filter((w) => w.id !== last.id) } : d));
  }

  async function removeFood(id: string) {
    await store.deleteFood(id);
    setData((d) => (d ? { ...d, food: d.food.filter((f) => f.id !== id) } : d));
    if (latest?.id === id) setLatest(null);
  }

  // last 7 days of water, oldest → today
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const ml = data.water.filter((w) => new Date(w.logged_at) >= d && new Date(w.logged_at) < next).reduce((a, w) => a + w.ml, 0);
    return { label: d.toLocaleDateString(undefined, { weekday: "narrow" }), ml };
  });
  const today = days[6].ml;

  const byDay = new Map<string, FoodEntry[]>();
  for (const f of data.food) {
    const k = new Date(f.eaten_at).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
    byDay.set(k, [...(byDay.get(k) ?? []), f]);
  }

  return (
    <div>
      <PageHeader
        title={
          <>
            Food & <em>drink</em>
          </>
        }
        intro="Everything you log here is considered in your reviews and coach answers."
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Capture */}
        <Card tone="white" className="flex flex-col gap-4">
          <div className="flex rounded-full bg-bone/70 p-1" role="tablist">
            {KINDS.map((k) => (
              <button
                key={k.kind}
                role="tab"
                aria-selected={kind === k.kind}
                onClick={() => setKind(k.kind)}
                className={cx("flex-1 rounded-full py-2 text-sm font-semibold transition", kind === k.kind ? "bg-kombu text-cream" : "text-noir/65")}
              >
                {k.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-noir/70">{cfg.hint}</p>

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPhoto({ file: f, preview: URL.createObjectURL(f) });
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInput.current?.click()}
            className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-4xl border-2 border-dashed border-moss/50 bg-sage-100 text-kombu"
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.preview} alt="Selected" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
                <span className="text-sm font-semibold">Take or choose a photo</span>
              </span>
            )}
          </button>
          <textarea className="field min-h-20 text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder={photo ? cfg.placeholder : "No photo? Describe it instead, e.g. '2 eggs, toast, coffee with milk'"} />
          <div className="flex items-center justify-between gap-2">
            {photo ? (
              <Button variant="ghost" onClick={() => setPhoto(null)}>
                Remove photo
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={analyse} loading={busy} disabled={!photo && !note.trim()}>
              {busy ? "Analysing…" : "Analyse"}
            </Button>
          </div>
          {aiError && <ErrorBox onRetry={analyse}>{aiError}</ErrorBox>}
          {latest && (
            <div className="rounded-3xl bg-bone/50 p-4">
              <FoodResult entry={latest} />
            </div>
          )}
        </Card>

        {/* Water */}
        <Card tone="sage" className="flex flex-col gap-4 self-start">
          <div className="flex items-start justify-between">
            <div>
              <p className="display text-3xl">
                Water <em className="!text-kombu">today</em>
              </p>
              <p className="mt-1 text-sm tabular-nums text-noir/70">
                {(today / 1000).toFixed(2)} L of {(data.target / 1000).toFixed(1)} L
              </p>
            </div>
            <Drop className="text-moss" />
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-cream/70">
            <div className="h-full rounded-full bg-kombu transition-all" style={{ width: `${Math.min(100, (today / data.target) * 100)}%` }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {[150, 250, 500].map((ml) => (
              <Button key={ml} variant="light" onClick={() => addWater(ml)} className="!px-4 !py-2 !text-xs">
                + {ml} ml
              </Button>
            ))}
            <Button variant="ghost" onClick={undoWater} className="!px-3 !py-2 !text-xs" disabled={!today}>
              Undo
            </Button>
          </div>
          <div className="mt-2 flex h-28 items-end justify-between gap-2" aria-label="Water over the last 7 days">
            {days.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="relative flex h-20 w-full items-end overflow-hidden rounded-full bg-cream/60">
                  <div className={cx("w-full rounded-full", i === 6 ? "bg-kombu" : "bg-moss")} style={{ height: `${Math.min(100, (d.ml / data.target) * 100)}%` }} title={`${d.ml} ml`} />
                </div>
                <span className="text-[10px] text-noir/55">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* History */}
      <section className="mt-10">
        <h2 className="display mb-4 text-3xl">
          Recent <em>entries</em>
        </h2>
        {!data.food.length ? (
          <Empty title="Nothing logged yet">Meals, menus and receipts from the last 30 days will show up here.</Empty>
        ) : (
          <div className="flex flex-col gap-6">
            {[...byDay].map(([day, entries]) => (
              <div key={day}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-moss">{day}</p>
                <div className="flex flex-col gap-2">
                  {entries.map((f) => {
                    const title = "title" in f.result ? f.result.title : "place" in f.result ? f.result.place || "Menu" : f.result.store || "Receipt";
                    const open = openId === f.id;
                    return (
                      <div key={f.id} className="rounded-3xl bg-[#fffaf2] p-3">
                        <button onClick={() => setOpenId(open ? null : f.id)} className="flex w-full items-center gap-3 text-left">
                          {f.thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={f.thumb} alt="" className="h-12 w-12 shrink-0 rounded-2xl object-cover" />
                          ) : (
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sage text-xs font-semibold uppercase text-kombu">{f.kind.slice(0, 2)}</span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{title}</p>
                            <p className="text-xs text-noir/55">
                              {f.kind} · {new Date(f.eaten_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                              {"calories" in f.result && f.result.calories ? ` · ~${f.result.calories} kcal` : ""}
                            </p>
                          </div>
                          <span className="text-noir/40">{open ? "−" : "+"}</span>
                        </button>
                        {open && (
                          <div className="mt-3 border-t border-noir/10 pt-3">
                            <FoodResult entry={f} />
                            <button onClick={() => removeFood(f.id)} className="mt-3 text-xs text-alert underline">
                              Delete entry
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <Disclaimer />
    </div>
  );
}
