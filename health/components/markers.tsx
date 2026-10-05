"use client";

import Link from "next/link";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getBiomarker, toStandard, type Flag } from "@/lib/biomarkers";
import type { MarkerSeries } from "@/lib/context";
import { plotValue } from "@/lib/normalize";
import type { ResultPoint } from "@/lib/types";
import { ArrowIcon, Chip, cx } from "./ui";

export function FlagChip({ flag }: { flag: Flag }) {
  if (flag === "high") return <Chip tone="alert">High</Chip>;
  if (flag === "low") return <Chip tone="alert">Low</Chip>;
  if (flag === "normal") return <Chip tone="moss">In range</Chip>;
  return <Chip tone="tan">No range</Chip>;
}

function trend(s: MarkerSeries): { arrow: string; label: string } | null {
  if (!s.previous) return null;
  const a = plotValue(s.previous);
  const b = plotValue(s.latest);
  if (a === 0) return null;
  const pct = ((b - a) / Math.abs(a)) * 100;
  if (Math.abs(pct) < 3) return { arrow: "→", label: "stable" };
  return { arrow: pct > 0 ? "↑" : "↓", label: `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%` };
}

/** Row styled like the reference's "Meet our providers" list; `highlight` renders the kombu band. */
export function MarkerRow({ s, highlight }: { s: MarkerSeries; highlight?: boolean }) {
  const t = trend(s);
  return (
    <Link
      href={`/markers/${encodeURIComponent(s.key)}`}
      className={cx(
        "group grid grid-cols-[1fr_auto] items-center gap-3 border-b border-noir/10 px-3 py-3 transition sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:px-4",
        highlight ? "rounded-xl border-transparent bg-kombu text-cream" : "hover:bg-bone/50"
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{s.name}</p>
        <p className={cx("text-xs", highlight ? "text-cream/70" : "text-noir/55")}>{s.latest.taken_at}</p>
      </div>
      <p className="hidden text-sm tabular-nums sm:block">
        {s.latest.value} <span className={highlight ? "text-cream/70" : "text-noir/55"}>{s.latest.unit}</span>
      </p>
      <p className={cx("hidden text-xs sm:block", highlight ? "text-cream/80" : "text-noir/60")}>
        {t ? `${t.arrow} ${t.label}` : "first result"} · {s.points.length} test{s.points.length > 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm tabular-nums sm:hidden">
          {s.latest.value} <span className="text-xs opacity-60">{s.latest.unit}</span>
        </span>
        <FlagChip flag={s.latest.flag} />
        <ArrowIcon className="opacity-50 transition group-hover:opacity-100" />
      </div>
    </Link>
  );
}

/** Reference band in standard units: prefer the latest lab range (converted), else the dictionary range. */
export function referenceBand(key: string, latest: ResultPoint): [number | null, number | null] {
  const lo = latest.ref_low != null ? (toStandard(key, latest.ref_low, latest.unit) ?? (latest.value_std == null ? latest.ref_low : null)) : null;
  const hi = latest.ref_high != null ? (toStandard(key, latest.ref_high, latest.unit) ?? (latest.value_std == null ? latest.ref_high : null)) : null;
  if (lo != null || hi != null) return [lo, hi];
  return getBiomarker(key)?.ref ?? [null, null];
}

export function TrendChart({ s, height = 260 }: { s: MarkerSeries; height?: number }) {
  const data = s.points.map((p) => ({ date: p.taken_at, value: plotValue(p), raw: `${p.value} ${p.unit}` }));
  const [lo, hi] = referenceBand(s.key, s.latest);
  const values = data.map((d) => d.value);
  const min = Math.min(...values, lo ?? Infinity);
  const max = Math.max(...values, hi ?? -Infinity);
  const pad = (max - min || Math.abs(max) || 1) * 0.15;
  // Round the axis to "nice" numbers so tick labels stay short (e.g. 0–180, not 0–170.25)
  const step = Math.pow(10, Math.floor(Math.log10(max - min + 2 * pad || 1))) / 2;
  const domain: [number, number] = [
    Math.max(0, Math.floor((min - pad) / step) * step),
    +(Math.ceil((max + pad) / step) * step).toPrecision(6),
  ];
  const unit = s.latest.value_std != null ? getBiomarker(s.key)?.unit ?? s.unit : s.latest.unit;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -6 }}>
          <defs>
            <linearGradient id="fillMoss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#889063" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#889063" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#4c3d19" strokeOpacity={0.08} vertical={false} />
          {(lo != null || hi != null) && (
            <ReferenceArea y1={lo ?? domain[0]} y2={hi ?? domain[1]} fill="#d9dcb4" fillOpacity={0.55} stroke="none" ifOverflow="hidden" />
          )}
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#4c3d19", opacity: 0.6 }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis domain={domain} tick={{ fontSize: 11, fill: "#4c3d19", opacity: 0.6 }} tickLine={false} axisLine={false} width={52} allowDecimals />
          <Tooltip
            contentStyle={{ background: "#f7f1e6", border: "1px solid rgba(76,61,25,.15)", borderRadius: 14, fontSize: 12 }}
            formatter={(v, _n, item) => [`${(item?.payload as { raw: string })?.raw ?? v}`, unit ? `Value (${unit} on chart)` : "Value"]}
          />
          <Area type="monotone" dataKey="value" stroke="none" fill="url(#fillMoss)" isAnimationActive={false} />
          <Line type="monotone" dataKey="value" isAnimationActive={false} stroke="#354024" strokeWidth={2.5} dot={{ r: 4, fill: "#354024", stroke: "#f7f1e6", strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
