// Entry for the claude.ai artifact build: same pages as the Next.js app, hash-routed in one page.
import "./polyfills";
import { useEffect, useState, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import BodyPage from "@/app/body/page";
import CoachPage from "@/app/coach/page";
import FoodPage from "@/app/food/page";
import ReportPage from "@/app/labs/[id]/page";
import LabsPage from "@/app/labs/page";
import MarkerPage from "@/app/markers/[key]/page";
import MarkersPage from "@/app/markers/page";
import Dashboard from "@/app/page";
import PlanPage from "@/app/plan/page";
import ProfilePage from "@/app/profile/page";
import SummaryPage from "@/app/summary/page";
import WorkoutsPage from "@/app/workouts/page";
import { AppShell } from "@/components/AppShell";
import { match, RouterProvider } from "./router";

(globalThis as { __SOUL_MODEL_URL__?: string }).__SOUL_MODEL_URL__ = "anatomy/body.glb.b64.txt";

const ROUTES: [string, ComponentType][] = [
  ["/", Dashboard],
  ["/body", BodyPage],
  ["/labs", LabsPage],
  ["/labs/:id", ReportPage],
  ["/markers", MarkersPage],
  ["/markers/:key", MarkerPage],
  ["/plan", PlanPage],
  ["/food", FoodPage],
  ["/workouts", WorkoutsPage],
  ["/coach", CoachPage],
  ["/profile", ProfilePage],
  ["/summary", SummaryPage],
];

function render(path: string) {
  for (const [pattern, Page] of ROUTES) {
    const params = match(pattern, path);
    if (params) return { node: <Page key={path} />, params };
  }
  return { node: <Dashboard />, params: {} };
}

/** Small notice when saving to the account fails (data is kept for this visit). */
function SaveErrors() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => setMsg((e as CustomEvent<string>).detail || "Couldn't save");
    window.addEventListener("soul-save-error", on);
    return () => window.removeEventListener("soul-save-error", on);
  }, []);
  if (!msg) return null;
  return (
    <div role="alert" className="fixed inset-x-3 top-3 z-[60] rounded-2xl bg-alert px-4 py-3 text-sm text-cream shadow-lg">
      Couldn&apos;t save your latest change ({msg}). Keep this page open and try again, or download a backup in Profile.
      <button className="ml-2 underline" onClick={() => setMsg(null)}>
        OK
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <>
    <SaveErrors />
    <RouterProvider render={(path) => {
      const r = render(path);
      return { node: <AppShell>{r.node}</AppShell>, params: r.params };
    }} />
  </>
);
