import type { FoodEntry, MealResult, MenuResult, ReceiptResult } from "@/lib/types";
import { Chip } from "./ui";

function Macro({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="rounded-2xl bg-cream/80 px-3 py-2 text-center">
      <p className="text-lg font-semibold tabular-nums text-kombu">{value ?? "–"}<span className="text-xs font-normal text-noir/50">{value != null ? unit : ""}</span></p>
      <p className="text-[10px] uppercase tracking-wider text-noir/50">{label}</p>
    </div>
  );
}

export function FoodResult({ entry }: { entry: Pick<FoodEntry, "kind" | "result"> }) {
  if (entry.kind === "meal") {
    const r = entry.result as MealResult;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <p className="display text-2xl text-kombu">{r.title}</p>
          {r.score != null && <Chip tone={r.score >= 7 ? "moss" : r.score >= 4 ? "tan" : "alert"}>{r.score}/10 for you</Chip>}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <Macro label="kcal" value={r.calories} unit="" />
          <Macro label="Protein" value={r.protein_g} unit="g" />
          <Macro label="Carbs" value={r.carbs_g} unit="g" />
          <Macro label="Fat" value={r.fat_g} unit="g" />
          <Macro label="Fibre" value={r.fiber_g} unit="g" />
          <Macro label="Sugar" value={r.sugar_g} unit="g" />
        </div>
        {r.items.length > 0 && <p className="text-xs text-noir/60">{r.items.map((i) => `${i.name}${i.portion ? ` (${i.portion})` : ""}`).join(" · ")}</p>}
        {r.highlights.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {r.highlights.map((h) => (
              <Chip key={h} tone="moss">{h}</Chip>
            ))}
          </div>
        )}
        {r.fit_for_you && <p className="rounded-2xl bg-sage-100 p-3 text-sm leading-relaxed">{r.fit_for_you}</p>}
      </div>
    );
  }
  if (entry.kind === "menu") {
    const r = entry.result as MenuResult;
    return (
      <div className="flex flex-col gap-3">
        <p className="display text-2xl text-kombu">{r.place || "Menu picks"}</p>
        {r.summary && <p className="text-sm text-noir/75">{r.summary}</p>}
        <ol className="flex flex-col gap-2">
          {r.picks.map((p, i) => (
            <li key={i} className="flex gap-3 rounded-2xl bg-sage-100 p-3">
              <span className="display grid h-7 w-7 shrink-0 place-items-center rounded-full bg-kombu text-sm text-cream">{i + 1}</span>
              <div className="text-sm">
                <p className="font-semibold">{p.dish}</p>
                <p className="text-noir/70">{p.why}</p>
                {p.tip && <p className="mt-1 text-xs text-moss">Tip: {p.tip}</p>}
              </div>
            </li>
          ))}
        </ol>
        {r.avoid.length > 0 && (
          <div className="rounded-2xl bg-alert-100/70 p-3 text-sm">
            <p className="mb-1 font-semibold text-alert">Maybe skip</p>
            {r.avoid.map((a, i) => (
              <p key={i}>
                <strong>{a.dish}</strong> — {a.why}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }
  const r = entry.result as ReceiptResult;
  return (
    <div className="flex flex-col gap-3">
      <p className="display text-2xl text-kombu">{r.store || "Your shopping"}</p>
      {r.summary && <p className="text-sm text-noir/75">{r.summary}</p>}
      {r.good.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-moss">Great choices</p>
          <ul className="list-disc pl-5 text-sm">{r.good.map((g) => <li key={g}>{g}</li>)}</ul>
        </div>
      )}
      {r.swaps.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-moss">Smart swaps</p>
          {r.swaps.map((s, i) => (
            <div key={i} className="rounded-2xl bg-sage-100 p-3 text-sm">
              <p>
                <span className="line-through opacity-60">{s.from}</span> → <strong>{s.to}</strong>
              </p>
              <p className="text-xs text-noir/65">{s.why}</p>
            </div>
          ))}
        </div>
      )}
      {r.missing.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-noir/60">Add next time:</span>
          {r.missing.map((m) => (
            <Chip key={m} tone="tan">{m}</Chip>
          ))}
        </div>
      )}
    </div>
  );
}
