// What each 3D body part means for the user: linked lab markers, plain-language explanation, learn/watch links.
import type { SystemKey } from "./biomarkers";

export interface OrganInfo {
  id: string;
  meshes: string[]; // node names in public/anatomy/body.glb
  name: string;
  systems: SystemKey[];
  markers: string[];
  about: string;
  labsTell: string;
  topic: string; // search phrase for learn/watch links
}

export const ORGANS: OrganInfo[] = [
  {
    id: "brain", meshes: ["brain", "pituitary"], name: "Brain & pituitary", systems: ["hormones"],
    markers: ["vitamin_b12", "folate", "glucose", "sodium", "prolactin", "cortisol", "tsh"],
    about: "Your control centre. The pituitary gland at its base runs most hormone systems (thyroid, adrenal, reproductive).",
    labsTell: "B12, folate and stable blood sugar keep nerves and focus healthy; prolactin and cortisol reflect pituitary/stress signals.",
    topic: "brain health",
  },
  {
    id: "thyroid", meshes: ["thyroid"], name: "Thyroid", systems: ["thyroid"],
    markers: ["tsh", "ft4", "ft3", "anti_tpo"],
    about: "Butterfly-shaped gland in the neck that sets your metabolic speed — energy, weight, temperature, mood, hair and cycles. (Shape is approximate in this model.)",
    labsTell: "TSH is the brain's request for more or less hormone; free T4/T3 are the hormone itself; anti-TPO shows autoimmune thyroiditis.",
    topic: "thyroid function TSH",
  },
  {
    id: "heart", meshes: ["heart", "aorta", "vena_cava"], name: "Heart & vessels", systems: ["heart"],
    markers: ["ldl", "hdl", "total_cholesterol", "triglycerides", "apob", "lpa", "crp", "homocysteine", "potassium"],
    about: "Pumps ~7,000 litres of blood a day through the aorta and back via the vena cava.",
    labsTell: "Lipids (LDL, ApoB, Lp(a)) drive plaque in arteries; hs-CRP and homocysteine show vessel inflammation; potassium keeps rhythm stable.",
    topic: "heart health cholesterol",
  },
  {
    id: "lungs", meshes: ["lungs", "trachea", "diaphragm"], name: "Lungs & breathing", systems: ["blood"],
    markers: ["hemoglobin", "rbc", "hematocrit"],
    about: "Bring oxygen into the blood. The diaphragm under them does most of the breathing work.",
    labsTell: "Blood tests don't measure lungs directly, but haemoglobin shows how much oxygen your blood can carry.",
    topic: "how lungs work",
  },
  {
    id: "liver", meshes: ["liver", "gallbladder"], name: "Liver & gallbladder", systems: ["liver", "iron"],
    markers: ["alt", "ast", "ggt", "alp", "bilirubin_total", "albumin", "total_protein", "ferritin"],
    about: "Your chemical factory: filters blood, makes proteins and cholesterol, stores iron and vitamins. The gallbladder stores bile for digesting fat.",
    labsTell: "ALT/AST/GGT rise when liver cells are stressed (fatty liver, alcohol, meds); bilirubin and albumin show how well it processes and builds.",
    topic: "liver function tests",
  },
  {
    id: "stomach", meshes: ["stomach", "esophagus"], name: "Stomach & oesophagus", systems: ["vitamins", "iron"],
    markers: ["vitamin_b12", "ferritin", "iron"],
    about: "Breaks food down with acid. Stomach acid is needed to absorb iron and vitamin B12.",
    labsTell: "Low B12 or iron despite a good diet can point to absorption problems (e.g. long-term antacids, gastritis).",
    topic: "stomach digestion",
  },
  {
    id: "pancreas", meshes: ["pancreas"], name: "Pancreas", systems: ["metabolic"],
    markers: ["glucose", "hba1c", "insulin", "homa_ir"],
    about: "Makes insulin to control blood sugar, plus enzymes to digest food.",
    labsTell: "Glucose, HbA1c, insulin and HOMA-IR show how well your body handles sugar and whether insulin resistance is building.",
    topic: "insulin resistance blood sugar",
  },
  {
    id: "spleen", meshes: ["spleen"], name: "Spleen", systems: ["blood", "inflammation"],
    markers: ["platelets", "wbc", "hemoglobin"],
    about: "Filters old red blood cells, recycles their iron and stores immune cells and platelets.",
    labsTell: "Blood count changes (platelets, white cells) can reflect spleen activity.",
    topic: "spleen function",
  },
  {
    id: "intestines", meshes: ["small_intestine", "large_intestine"], name: "Intestines (gut)", systems: ["vitamins", "iron", "inflammation"],
    markers: ["ferritin", "iron", "vitamin_b12", "folate", "vitamin_d", "magnesium", "zinc", "crp"],
    about: "The small intestine absorbs nearly all nutrients; the large intestine hosts your microbiome and absorbs water.",
    labsTell: "Several low vitamins/minerals at once can signal poor absorption; CRP can rise with gut inflammation.",
    topic: "gut health nutrient absorption",
  },
  {
    id: "kidneys", meshes: ["kidneys", "bladder"], name: "Kidneys & bladder", systems: ["kidney"],
    markers: ["creatinine", "egfr", "urea", "uric_acid", "sodium", "potassium"],
    about: "Filter ~180 litres of blood a day, balance salts and water, and help control blood pressure.",
    labsTell: "Creatinine and eGFR show filtering power; urea and electrolytes show hydration and balance.",
    topic: "kidney function eGFR",
  },
  {
    id: "adrenals", meshes: ["adrenals"], name: "Adrenal glands", systems: ["hormones"],
    markers: ["cortisol", "dhea_s", "sodium", "potassium"],
    about: "Small glands on top of the kidneys that make cortisol (stress), adrenaline and DHEA.",
    labsTell: "Morning cortisol and DHEA-S reflect adrenal output; sodium/potassium balance also depends on them.",
    topic: "adrenal glands cortisol",
  },
  {
    id: "bones", meshes: ["skeleton"], name: "Bones & marrow", systems: ["vitamins", "blood"],
    markers: ["vitamin_d", "calcium", "alp", "magnesium", "hemoglobin", "wbc", "platelets"],
    about: "Store calcium and make all your blood cells in the marrow.",
    labsTell: "Vitamin D, calcium and magnesium keep bones strong; the blood count reflects marrow production.",
    topic: "bone health vitamin D calcium",
  },
];

export interface MuscleInfo {
  id: string; // mesh name
  name: string;
  region: "arms" | "shoulders" | "chest" | "back" | "core" | "legs";
  exercises: string[];
}

export const MUSCLES: MuscleInfo[] = [
  { id: "m_deltoid", name: "Shoulders (deltoids)", region: "shoulders", exercises: ["overhead press", "lateral raise", "face pull"] },
  { id: "m_pectoralis", name: "Chest (pectorals)", region: "chest", exercises: ["push-up", "bench press", "chest fly"] },
  { id: "m_biceps", name: "Biceps", region: "arms", exercises: ["biceps curl", "hammer curl", "chin-up"] },
  { id: "m_triceps", name: "Triceps", region: "arms", exercises: ["dips", "triceps pushdown", "close-grip push-up"] },
  { id: "m_forearm", name: "Forearms", region: "arms", exercises: ["farmer's carry", "wrist curl", "dead hang"] },
  { id: "m_abs", name: "Abs (rectus abdominis)", region: "core", exercises: ["crunch", "hanging knee raise", "dead bug"] },
  { id: "m_obliques", name: "Obliques", region: "core", exercises: ["side plank", "Pallof press", "Russian twist"] },
  { id: "m_lats", name: "Lats", region: "back", exercises: ["pull-up", "lat pulldown", "row"] },
  { id: "m_trapezius", name: "Trapezius", region: "back", exercises: ["shrug", "face pull", "farmer's carry"] },
  { id: "m_rhomboids", name: "Rhomboids", region: "back", exercises: ["seated row", "band pull-apart", "reverse fly"] },
  { id: "m_serratus", name: "Serratus anterior", region: "core", exercises: ["push-up plus", "wall slide", "bear crawl"] },
  { id: "m_glutes", name: "Glutes", region: "legs", exercises: ["hip thrust", "squat", "glute bridge"] },
  { id: "m_quads", name: "Quadriceps", region: "legs", exercises: ["squat", "lunge", "leg press"] },
  { id: "m_hamstrings", name: "Hamstrings", region: "legs", exercises: ["Romanian deadlift", "leg curl", "good morning"] },
  { id: "m_adductors", name: "Inner thighs (adductors)", region: "legs", exercises: ["Copenhagen plank", "sumo squat", "adductor machine"] },
  { id: "m_calves", name: "Calves", region: "legs", exercises: ["calf raise", "jump rope", "running"] },
  { id: "m_tibialis", name: "Shins (tibialis)", region: "legs", exercises: ["tibialis raise", "walking", "toe walks"] },
];

export const MUSCLE_IDS = MUSCLES.map((m) => m.id);
export const ORGAN_BY_MESH = new Map(ORGANS.flatMap((o) => o.meshes.map((m) => [m, o] as const)));

/** Rough keyword → muscles map, used offline and as a fallback when AI is unavailable. */
const KEYWORDS: [RegExp, string[]][] = [
  [/\barms?\b|рук/i, ["m_biceps", "m_triceps", "m_forearm"]],
  [/bicep|curl|бицепс/i, ["m_biceps", "m_forearm"]],
  [/tricep|dip|pushdown|трицепс/i, ["m_triceps"]],
  [/shoulder|delt|overhead|press|плеч/i, ["m_deltoid", "m_triceps"]],
  [/chest|bench|push.?up|pec|груд|отжим/i, ["m_pectoralis", "m_triceps", "m_deltoid"]],
  [/back|pull.?up|chin.?up|row|lat|спин|подтяг/i, ["m_lats", "m_rhomboids", "m_trapezius", "m_biceps"]],
  [/abs|core|plank|crunch|пресс|планк/i, ["m_abs", "m_obliques", "m_serratus"]],
  [/legs?\b|squat|lunge|leg press|ног|присед/i, ["m_quads", "m_glutes", "m_hamstrings", "m_adductors", "m_calves"]],
  [/glute|hip thrust|bridge|ягод/i, ["m_glutes", "m_hamstrings"]],
  [/deadlift|rdl|становая/i, ["m_hamstrings", "m_glutes", "m_trapezius", "m_forearm", "m_lats"]],
  [/\brun|\bran\b|jog|\d\s?k\b|бег/i, ["m_calves", "m_quads", "m_hamstrings", "m_glutes", "m_tibialis"]],
  [/walk|hike|ходьб|прогул/i, ["m_calves", "m_glutes", "m_tibialis"]],
  [/cycl|bike|spin|велос/i, ["m_quads", "m_glutes", "m_calves"]],
  [/swim|плав/i, ["m_lats", "m_deltoid", "m_triceps", "m_pectoralis", "m_abs"]],
  [/yoga|pilates|stretch|йог|пилат|растяж/i, ["m_abs", "m_obliques", "m_glutes", "m_hamstrings"]],
  [/full.?body|crossfit|hiit|circuit|кроссфит/i, ["m_quads", "m_glutes", "m_pectoralis", "m_lats", "m_deltoid", "m_abs"]],
  [/box|бокс/i, ["m_deltoid", "m_obliques", "m_calves", "m_triceps"]],
  [/tennis|padel|теннис/i, ["m_forearm", "m_deltoid", "m_obliques", "m_calves", "m_quads"]],
];

export function guessMuscles(text: string): string[] {
  const out = new Set<string>();
  for (const [re, ids] of KEYWORDS) if (re.test(text)) ids.forEach((i) => out.add(i));
  return [...out];
}

export function guessMinutes(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(h|hr|hour|час)/i);
  if (m) return Math.round(parseFloat(m[1].replace(",", ".")) * 60);
  const mm = text.match(/(\d+)\s*(m\b|min|мин)/i);
  return mm ? Number(mm[1]) : null;
}

// ── Learn & watch links (search URLs never go stale)
export function learnLinks(topic: string) {
  const q = encodeURIComponent(topic);
  return [
    { label: "MedlinePlus (US NIH)", href: `https://vsearch.nlm.nih.gov/vivisimo/cgi-bin/query-meta?v%3Aproject=medlineplus&query=${q}` },
    { label: "NHS", href: `https://www.nhs.uk/search/results?q=${q}` },
  ];
}

export function watchLinks(topic: string) {
  const yt = (s: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(s)}`;
  return [
    { label: "Explained simply", href: yt(`${topic} explained Osmosis`) },
    { label: "From doctors", href: yt(`${topic} Cleveland Clinic OR Mayo Clinic`) },
  ];
}

export function exerciseVideoLinks(exercise: string) {
  const yt = (s: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(s)}`;
  return [
    { label: "Technique", href: yt(`${exercise} proper form Jeff Nippard`) },
    { label: "Physio tips", href: yt(`${exercise} form Squat University`) },
  ];
}
