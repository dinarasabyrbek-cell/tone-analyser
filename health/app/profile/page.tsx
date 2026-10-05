"use client";

import { useEffect, useState } from "react";
import { Leaf } from "@/components/Shapes";
import { Button, Card, Disclaimer, ErrorBox, Field, Loading, PageHeader } from "@/components/ui";
import { getStatus, PASSCODE_KEY, type AppStatus } from "@/lib/client/api";
import { saveFile } from "@/lib/client/files";
import { useLoad } from "@/lib/client/useLoad";
import { waterTarget } from "@/lib/context";
import { getStore } from "@/lib/store";
import { exportLocal, importLocal } from "@/lib/store/local";
import type { Profile } from "@/lib/types";

const numOrNull = (v: string) => (v.trim() === "" || !Number.isFinite(Number(v)) ? null : Number(v));

export default function ProfilePage() {
  const { data, error, loading, reload } = useLoad(() => getStore().getProfile());
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox onRetry={reload}>{error}</ErrorBox>;
  return <ProfileForm initial={data} />;
}

function ProfileForm({ initial }: { initial: Profile }) {
  const store = getStore();
  const [p, setP] = useState<Profile>(initial);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [status, setStatus] = useState<AppStatus | null>(null);

  useEffect(() => {
    getStatus().then(setStatus);
  }, []);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => {
    setP({ ...p, [k]: v });
    setSaved(false);
  };

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      await store.saveProfile(p);
      setSaved(true);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={
          <>
            About <em>you</em>
          </>
        }
        intro="The AI uses this to read your results correctly — reference ranges and advice depend on age, sex, medications and goals."
        action={<Leaf className="hidden text-moss sm:block" />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card tone="white" className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input className="field" value={p.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Year of birth">
            <input className="field" inputMode="numeric" value={p.birth_year ?? ""} onChange={(e) => set("birth_year", numOrNull(e.target.value))} placeholder="1995" />
          </Field>
          <Field label="Sex">
            <select className="field" value={p.sex} onChange={(e) => set("sex", e.target.value as Profile["sex"])}>
              <option value="">—</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Height (cm)">
            <input className="field" inputMode="decimal" value={p.height_cm ?? ""} onChange={(e) => set("height_cm", numOrNull(e.target.value))} />
          </Field>
          <Field label="Weight (kg)">
            <input className="field" inputMode="decimal" value={p.weight_kg ?? ""} onChange={(e) => set("weight_kg", numOrNull(e.target.value))} />
          </Field>
          <Field label="Daily water goal (ml)" hint={`Leave empty for automatic (${waterTarget({ ...p, water_target_ml: null })} ml)`}>
            <input className="field" inputMode="numeric" value={p.water_target_ml ?? ""} onChange={(e) => set("water_target_ml", numOrNull(e.target.value))} />
          </Field>
        </Card>

        <Card tone="white" className="grid gap-4">
          <Field label="Known conditions" hint="e.g. hypothyroidism, PCOS, anaemia, allergies">
            <textarea className="field min-h-16" value={p.conditions} onChange={(e) => set("conditions", e.target.value)} />
          </Field>
          <Field label="Medications">
            <textarea className="field min-h-16" value={p.medications} onChange={(e) => set("medications", e.target.value)} />
          </Field>
          <Field label="Supplements">
            <textarea className="field min-h-16" value={p.supplements} onChange={(e) => set("supplements", e.target.value)} placeholder="e.g. vitamin D 2000 IU daily" />
          </Field>
        </Card>

        <Card tone="white" className="grid gap-4 lg:col-span-2 sm:grid-cols-2">
          <Field label="How you eat">
            <textarea className="field min-h-16" value={p.diet} onChange={(e) => set("diet", e.target.value)} placeholder="e.g. mostly home-cooked, little red meat, coffee 3x/day" />
          </Field>
          <Field label="Goals">
            <textarea className="field min-h-16" value={p.goals} onChange={(e) => set("goals", e.target.value)} placeholder="e.g. more energy, better sleep, lower cholesterol" />
          </Field>
        </Card>
      </div>

      {saveError && (
        <div className="mt-4">
          <ErrorBox>{saveError}</ErrorBox>
        </div>
      )}
      <div className="mt-5 flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-moss">Saved ✓</span>}
        <Button onClick={save} loading={saving}>
          Save profile
        </Button>
      </div>

      {status && !status.cloud && <BackupCard account={status.storage === "account"} />}
      {status?.passcode && <PasscodeCard />}

      {status && (
        <p className="mt-8 text-xs text-noir/50">
          Storage: {status.cloud ? "private cloud (Supabase)" : "this browser only (demo)"} · AI: {status.ai ? `${status.models.fast} / ${status.models.deep}` : "not connected"}
        </p>
      )}
      <Disclaimer />
    </div>
  );
}

/** Rendered only after the status fetch, so reading localStorage in the initialiser is client-only. */
function PasscodeCard() {
  const [passcode, setPasscode] = useState(() => {
    try {
      return localStorage.getItem(PASSCODE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  return (
    <Card tone="bone" className="mt-8 grid gap-3 sm:max-w-md">
      <Field label="App passcode" hint="This demo deployment is protected. Enter the passcode set in APP_PASSCODE.">
        <input
          className="field"
          type="password"
          value={passcode}
          onChange={(e) => {
            setPasscode(e.target.value);
            try {
              localStorage.setItem(PASSCODE_KEY, e.target.value);
            } catch {}
          }}
        />
      </Field>
    </Card>
  );
}

/** Local mode keeps everything in this browser — this lets the user keep and restore a copy. */
function BackupCard({ account }: { account: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  async function download() {
    try {
      await saveFile(`soul-health-backup-${new Date().toISOString().slice(0, 10)}.json`, exportLocal(), "application/json");
      setMsg("Backup saved. Keep it somewhere private — it contains your health data.");
    } catch {
      setMsg("The download was cancelled.");
    }
  }
  const [pending, setPending] = useState<File | null>(null);
  async function restore(file: File) {
    try {
      importLocal(await file.text());
      setMsg("Restored. Reloading…");
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  return (
    <Card tone="sage" className="mt-8 flex flex-col gap-3 sm:max-w-xl">
      <p className="display text-2xl">
        Backup <em className="!text-kombu">& restore</em>
      </p>
      <p className="text-sm text-noir/75">
        {account
          ? "Your data is saved privately to your Claude account. A backup file is an extra copy you control."
          : "Your data lives only in this browser. Clearing site data or switching phones loses it — download a backup now and then, and restore it on another device."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={download}>Download backup</Button>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-kombu/40 px-5 py-2.5 text-sm font-semibold uppercase tracking-wider text-kombu">
          Restore
          <input type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && setPending(e.target.files[0])} />
        </label>
      </div>
      {pending && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-cream/80 p-3 text-sm">
          <span>Replace everything here with “{pending.name}”?</span>
          <Button onClick={() => restore(pending)} className="!px-4 !py-1.5 !text-xs">
            Replace
          </Button>
          <Button variant="ghost" onClick={() => setPending(null)} className="!px-4 !py-1.5 !text-xs">
            Cancel
          </Button>
        </div>
      )}
      {msg && <p className="text-sm text-kombu">{msg}</p>}
    </Card>
  );
}
