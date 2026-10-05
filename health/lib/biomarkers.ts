// Canonical biomarker dictionary: names, aliases, standard units, unit conversions and body systems.
// Values are stored as reported by the lab AND converted to `unit` (value_std) so trends line up
// even when different labs use different units.

export type SystemKey =
  | "metabolic"
  | "heart"
  | "liver"
  | "kidney"
  | "thyroid"
  | "blood"
  | "iron"
  | "vitamins"
  | "hormones"
  | "inflammation"
  | "other";

export const SYSTEMS: Record<SystemKey, { name: string; blurb: string }> = {
  metabolic: { name: "Metabolism & sugar", blurb: "Glucose, insulin, HbA1c" },
  heart: { name: "Heart & lipids", blurb: "Cholesterol, triglycerides" },
  liver: { name: "Liver", blurb: "ALT, AST, GGT, bilirubin" },
  kidney: { name: "Kidneys", blurb: "Creatinine, eGFR, urea" },
  thyroid: { name: "Thyroid", blurb: "TSH, free T4, free T3" },
  blood: { name: "Blood count", blurb: "Haemoglobin, cells, platelets" },
  iron: { name: "Iron", blurb: "Ferritin, serum iron, transferrin" },
  vitamins: { name: "Vitamins & minerals", blurb: "D, B12, folate, magnesium" },
  hormones: { name: "Hormones", blurb: "Sex hormones, cortisol" },
  inflammation: { name: "Inflammation", blurb: "CRP, ESR, homocysteine" },
  other: { name: "Other", blurb: "Everything else" },
};

/** Converts a value from an alternative unit into the marker's standard unit. */
type Converter = number | ((v: number) => number);

export interface Biomarker {
  key: string;
  name: string;
  system: SystemKey;
  unit: string; // standard unit used for charts
  aliases: string[];
  /** alternative unit (normalised, see normalizeUnit) → multiply factor or function into `unit` */
  convert?: Record<string, Converter>;
  /** typical adult reference range in the standard unit, used when the lab gives none */
  ref?: [number | null, number | null];
  about: string;
  levers: string;
}

export const BIOMARKERS: Biomarker[] = [
  // ── Metabolic
  {
    key: "glucose", name: "Glucose (fasting)", system: "metabolic", unit: "mg/dL",
    aliases: ["glucose", "fasting glucose", "blood glucose", "glu", "глюкоза", "fpg"],
    convert: { "mmol/l": 18.016 }, ref: [70, 99],
    about: "Sugar level in your blood after fasting. Reflects how well your body handles carbohydrates.",
    levers: "Fibre, protein with meals, fewer refined carbs, walking after meals, sleep and stress.",
  },
  {
    key: "hba1c", name: "HbA1c", system: "metabolic", unit: "%",
    aliases: ["hba1c", "a1c", "glycated hemoglobin", "glycated haemoglobin", "glycosylated hemoglobin", "гликированный гемоглобин"],
    convert: { "mmol/mol": (v) => v / 10.929 + 2.15 }, ref: [null, 5.6],
    about: "Average blood sugar over the last ~3 months.",
    levers: "Same as glucose — consistent habits over months move it, not single days.",
  },
  {
    key: "insulin", name: "Insulin (fasting)", system: "metabolic", unit: "uIU/mL",
    aliases: ["insulin", "fasting insulin", "инсулин"],
    convert: { "pmol/l": 1 / 6.945, "miu/l": 1, "mu/l": 1 }, ref: [2, 20],
    about: "Hormone that moves sugar into cells. High fasting insulin can be an early sign of insulin resistance.",
    levers: "Strength training, fewer ultra-processed carbs, sleep, losing visceral fat.",
  },
  {
    key: "homa_ir", name: "HOMA-IR", system: "metabolic", unit: "",
    aliases: ["homa-ir", "homa ir", "homa", "индекс homa"], ref: [null, 2.5],
    about: "Insulin resistance index calculated from fasting glucose and insulin.",
    levers: "Movement, muscle mass, sleep, fibre-rich whole foods.",
  },
  {
    key: "uric_acid", name: "Uric acid", system: "metabolic", unit: "mg/dL",
    aliases: ["uric acid", "urate", "мочевая кислота"],
    convert: { "umol/l": 1 / 59.48, "mmol/l": 1000 / 59.48 }, ref: [2.4, 6.0],
    about: "Waste product from purine breakdown. High levels link to gout and metabolic stress.",
    levers: "Hydration, less alcohol and sugary drinks (fructose), moderate red meat/organ meats.",
  },

  // ── Heart & lipids
  {
    key: "total_cholesterol", name: "Total cholesterol", system: "heart", unit: "mg/dL",
    aliases: ["total cholesterol", "cholesterol", "chol", "холестерин", "холестерин общий"],
    convert: { "mmol/l": 38.67 }, ref: [null, 200],
    about: "All cholesterol carried in the blood, good and bad combined.",
    levers: "Soluble fibre (oats, legumes), less saturated fat, nuts, olive oil, exercise.",
  },
  {
    key: "ldl", name: "LDL cholesterol", system: "heart", unit: "mg/dL",
    aliases: ["ldl", "ldl cholesterol", "ldl-c", "лпнп", "холестерин лпнп"],
    convert: { "mmol/l": 38.67 }, ref: [null, 100],
    about: "The 'bad' cholesterol that can build up in arteries.",
    levers: "Less saturated & trans fat, more soluble fibre, plant sterols, weight and activity.",
  },
  {
    key: "hdl", name: "HDL cholesterol", system: "heart", unit: "mg/dL",
    aliases: ["hdl", "hdl cholesterol", "hdl-c", "лпвп", "холестерин лпвп"],
    convert: { "mmol/l": 38.67 }, ref: [40, null],
    about: "The 'good' cholesterol that helps clear excess cholesterol.",
    levers: "Aerobic exercise, not smoking, healthy fats, less refined sugar.",
  },
  {
    key: "triglycerides", name: "Triglycerides", system: "heart", unit: "mg/dL",
    aliases: ["triglycerides", "trig", "tg", "триглицериды"],
    convert: { "mmol/l": 88.57 }, ref: [null, 150],
    about: "Fat in the blood, strongly influenced by sugar, alcohol and refined carbs.",
    levers: "Cut sugar & alcohol, omega-3 rich fish, regular movement.",
  },
  {
    key: "apob", name: "ApoB", system: "heart", unit: "mg/dL",
    aliases: ["apob", "apolipoprotein b", "аполипопротеин b"],
    convert: { "g/l": 100 }, ref: [null, 90],
    about: "Counts atherogenic particles — often a better heart-risk marker than LDL alone.",
    levers: "Same as LDL.",
  },
  {
    key: "lpa", name: "Lipoprotein(a)", system: "heart", unit: "mg/dL",
    aliases: ["lp(a)", "lipoprotein a", "lipoprotein(a)", "липопротеин а"], ref: [null, 30],
    about: "Mostly genetic cholesterol particle; one test in a lifetime is usually enough.",
    levers: "Little lifestyle effect — knowing it helps you and your doctor manage other risks.",
  },

  // ── Liver
  {
    key: "alt", name: "ALT", system: "liver", unit: "U/L",
    aliases: ["alt", "alat", "sgpt", "alanine aminotransferase", "алт", "аланинаминотрансфераза"], ref: [null, 40],
    about: "Liver enzyme; rises when liver cells are stressed (fatty liver, alcohol, medications).",
    levers: "Less alcohol and sugar, weight loss if needed, coffee, avoiding unnecessary supplements.",
  },
  {
    key: "ast", name: "AST", system: "liver", unit: "U/L",
    aliases: ["ast", "asat", "sgot", "aspartate aminotransferase", "аст", "аспартатаминотрансфераза"], ref: [null, 40],
    about: "Enzyme found in liver and muscle. Hard workouts can raise it temporarily.",
    levers: "Same as ALT; avoid intense training 48h before testing.",
  },
  {
    key: "ggt", name: "GGT", system: "liver", unit: "U/L",
    aliases: ["ggt", "gamma-gt", "gamma gt", "ггт", "гамма-гт", "гамма-глутамилтрансфераза"], ref: [null, 40],
    about: "Liver/bile enzyme sensitive to alcohol and oxidative stress.",
    levers: "Less alcohol, more vegetables, weight management.",
  },
  {
    key: "alp", name: "Alkaline phosphatase", system: "liver", unit: "U/L",
    aliases: ["alp", "alkaline phosphatase", "щелочная фосфатаза"], ref: [40, 130],
    about: "Enzyme from liver and bone.",
    levers: "Usually reflects liver/bone conditions — discuss abnormal values with a doctor.",
  },
  {
    key: "bilirubin_total", name: "Bilirubin (total)", system: "liver", unit: "mg/dL",
    aliases: ["bilirubin", "total bilirubin", "билирубин", "билирубин общий"],
    convert: { "umol/l": 1 / 17.1 }, ref: [0.1, 1.2],
    about: "Breakdown product of red blood cells processed by the liver. Mildly high levels can be harmless (Gilbert's).",
    levers: "Hydration and regular meals; fasting can raise it.",
  },
  {
    key: "albumin", name: "Albumin", system: "liver", unit: "g/dL",
    aliases: ["albumin", "альбумин"], convert: { "g/l": 0.1 }, ref: [3.5, 5.0],
    about: "Main blood protein made by the liver; reflects nutrition and liver function.",
    levers: "Adequate protein intake.",
  },
  {
    key: "total_protein", name: "Total protein", system: "liver", unit: "g/dL",
    aliases: ["total protein", "protein total", "общий белок", "белок общий"], convert: { "g/l": 0.1 }, ref: [6.0, 8.3],
    about: "All proteins in blood (albumin + globulins).",
    levers: "Adequate protein intake and hydration.",
  },

  // ── Kidney
  {
    key: "creatinine", name: "Creatinine", system: "kidney", unit: "mg/dL",
    aliases: ["creatinine", "креатинин"], convert: { "umol/l": 1 / 88.4 }, ref: [0.6, 1.2],
    about: "Muscle waste product filtered by kidneys. Higher with more muscle or creatine supplements.",
    levers: "Hydration; avoid heavy meat meal and creatine before testing.",
  },
  {
    key: "egfr", name: "eGFR", system: "kidney", unit: "mL/min/1.73m2",
    aliases: ["egfr", "gfr", "скф", "estimated gfr"], ref: [90, null],
    about: "Estimated kidney filtration rate calculated from creatinine, age and sex.",
    levers: "Blood pressure and sugar control, hydration, limit NSAID painkillers.",
  },
  {
    key: "urea", name: "Urea / BUN", system: "kidney", unit: "mg/dL",
    aliases: ["urea", "bun", "blood urea nitrogen", "мочевина"], convert: { "mmol/l": 2.8 }, ref: [7, 20],
    about: "Protein waste product. Affected by protein intake and hydration.",
    levers: "Hydration; very high-protein diets raise it.",
  },
  {
    key: "sodium", name: "Sodium", system: "kidney", unit: "mmol/L",
    aliases: ["sodium", "na", "натрий"], convert: { "meq/l": 1 }, ref: [135, 145],
    about: "Electrolyte balancing fluids.", levers: "Hydration; very low or very high intake.",
  },
  {
    key: "potassium", name: "Potassium", system: "kidney", unit: "mmol/L",
    aliases: ["potassium", "k", "калий"], convert: { "meq/l": 1 }, ref: [3.5, 5.1],
    about: "Electrolyte key for heart and muscles.", levers: "Fruit, vegetables, legumes.",
  },

  // ── Thyroid
  {
    key: "tsh", name: "TSH", system: "thyroid", unit: "mIU/L",
    aliases: ["tsh", "thyroid stimulating hormone", "thyrotropin", "ттг", "тиреотропный гормон"],
    convert: { "uiu/ml": 1, "mu/l": 1 }, ref: [0.4, 4.0],
    about: "Signal from the brain to the thyroid. High = thyroid may be underactive, low = overactive.",
    levers: "Iodine & selenium adequacy, sleep; biotin supplements can distort the test.",
  },
  {
    key: "ft4", name: "Free T4", system: "thyroid", unit: "ng/dL",
    aliases: ["free t4", "ft4", "t4 free", "т4 свободный", "свободный т4"], convert: { "pmol/l": 1 / 12.87 }, ref: [0.8, 1.8],
    about: "Main thyroid hormone in its active, unbound form.", levers: "As TSH.",
  },
  {
    key: "ft3", name: "Free T3", system: "thyroid", unit: "pg/mL",
    aliases: ["free t3", "ft3", "t3 free", "т3 свободный", "свободный т3"], convert: { "pmol/l": 0.651 }, ref: [2.3, 4.2],
    about: "Most active thyroid hormone.", levers: "Adequate calories, selenium, sleep.",
  },
  {
    key: "anti_tpo", name: "Anti-TPO antibodies", system: "thyroid", unit: "IU/mL",
    aliases: ["anti-tpo", "anti tpo", "tpo antibodies", "ат-тпо", "антитела к тпо"], convert: { "u/ml": 1 }, ref: [null, 34],
    about: "Antibodies against the thyroid; elevated in autoimmune thyroiditis (Hashimoto's).",
    levers: "Selenium and vitamin D adequacy; follow-up with an endocrinologist if raised.",
  },

  // ── Blood count
  {
    key: "hemoglobin", name: "Haemoglobin", system: "blood", unit: "g/dL",
    aliases: ["hemoglobin", "haemoglobin", "hgb", "hb", "гемоглобин"], convert: { "g/l": 0.1, "mmol/l": 1.611 }, ref: [12.0, 16.0],
    about: "Protein in red blood cells that carries oxygen. Low = anaemia.",
    levers: "Iron, B12 and folate intake; manage heavy periods with a doctor.",
  },
  {
    key: "hematocrit", name: "Haematocrit", system: "blood", unit: "%",
    aliases: ["hematocrit", "haematocrit", "hct", "гематокрит"], convert: { "l/l": 100 }, ref: [36, 46],
    about: "Share of blood volume made of red cells.", levers: "Hydration, iron status.",
  },
  {
    key: "rbc", name: "Red blood cells", system: "blood", unit: "x10^12/L",
    aliases: ["rbc", "red blood cells", "erythrocytes", "эритроциты"], convert: { "x10^6/ul": 1, "m/ul": 1 }, ref: [3.9, 5.2],
    about: "Number of oxygen-carrying cells.", levers: "Iron, B12, folate.",
  },
  {
    key: "wbc", name: "White blood cells", system: "blood", unit: "x10^9/L",
    aliases: ["wbc", "white blood cells", "leukocytes", "leucocytes", "лейкоциты"], convert: { "x10^3/ul": 1, "k/ul": 1 }, ref: [4.0, 10.0],
    about: "Immune cells. Temporarily high with infection; persistently low or high needs follow-up.",
    levers: "Sleep, recovering from infections before testing.",
  },
  {
    key: "platelets", name: "Platelets", system: "blood", unit: "x10^9/L",
    aliases: ["platelets", "plt", "thrombocytes", "тромбоциты"], convert: { "x10^3/ul": 1, "k/ul": 1 }, ref: [150, 400],
    about: "Cells that help blood clot.", levers: "Usually not diet-driven; discuss abnormal values.",
  },
  {
    key: "mcv", name: "MCV", system: "blood", unit: "fL",
    aliases: ["mcv", "mean corpuscular volume", "средний объем эритроцита"], ref: [80, 100],
    about: "Average size of red cells. Small = often iron deficiency, large = often B12/folate deficiency.",
    levers: "Iron, B12, folate.",
  },
  {
    key: "ferritin", name: "Ferritin", system: "iron", unit: "ng/mL",
    aliases: ["ferritin", "ферритин"], convert: { "ug/l": 1, "pmol/l": 1 / 2.247 }, ref: [30, 200],
    about: "Your iron stores. Low ferritin causes tiredness, hair loss and poor exercise tolerance even before anaemia.",
    levers: "Red meat, liver, legumes + vitamin C; avoid tea/coffee with iron-rich meals.",
  },
  {
    key: "iron", name: "Serum iron", system: "iron", unit: "ug/dL",
    aliases: ["iron", "serum iron", "fe", "железо", "железо сывороточное"], convert: { "umol/l": 5.585 }, ref: [50, 170],
    about: "Iron circulating right now — fluctuates a lot day to day.", levers: "As ferritin; test in the morning, fasting.",
  },
  {
    key: "transferrin_sat", name: "Transferrin saturation", system: "iron", unit: "%",
    aliases: ["transferrin saturation", "tsat", "насыщение трансферрина", "коэффициент насыщения трансферрина"], ref: [20, 45],
    about: "How full your iron transport protein is.", levers: "As ferritin.",
  },

  // ── Vitamins & minerals
  {
    key: "vitamin_d", name: "Vitamin D (25-OH)", system: "vitamins", unit: "ng/mL",
    aliases: ["vitamin d", "25-oh vitamin d", "25(oh)d", "25-hydroxyvitamin d", "vit d", "витамин d", "25-oh витамин d"],
    convert: { "nmol/l": 1 / 2.496 }, ref: [30, 100],
    about: "Supports bones, immunity and mood. Very common to be low in winter or northern countries.",
    levers: "Sunlight, oily fish, eggs, and a D3 supplement if low (dose with a doctor).",
  },
  {
    key: "vitamin_b12", name: "Vitamin B12", system: "vitamins", unit: "pg/mL",
    aliases: ["vitamin b12", "b12", "cobalamin", "витамин b12", "цианокобаламин"], convert: { "pmol/l": 1.355 }, ref: [300, 900],
    about: "Needed for nerves and red blood cells. Low risk is higher on plant-based diets or with metformin.",
    levers: "Meat, fish, eggs, dairy; supplements for vegans.",
  },
  {
    key: "folate", name: "Folate", system: "vitamins", unit: "ng/mL",
    aliases: ["folate", "folic acid", "фолиевая кислота", "фолаты"], convert: { "nmol/l": 1 / 2.266 }, ref: [4, 20],
    about: "B vitamin for cell division and red blood cells.", levers: "Leafy greens, legumes, citrus.",
  },
  {
    key: "magnesium", name: "Magnesium", system: "vitamins", unit: "mg/dL",
    aliases: ["magnesium", "mg", "магний"], convert: { "mmol/l": 2.431 }, ref: [1.7, 2.4],
    about: "Mineral for muscles, nerves, sleep and energy.", levers: "Nuts, seeds, greens, dark chocolate, whole grains.",
  },
  {
    key: "calcium", name: "Calcium", system: "vitamins", unit: "mg/dL",
    aliases: ["calcium", "ca", "кальций", "кальций общий"], convert: { "mmol/l": 4.008 }, ref: [8.6, 10.3],
    about: "Bones, muscles and nerves. Tightly regulated in blood.", levers: "Dairy, sardines, greens, vitamin D status.",
  },
  {
    key: "zinc", name: "Zinc", system: "vitamins", unit: "ug/dL",
    aliases: ["zinc", "zn", "цинк"], convert: { "umol/l": 6.54 }, ref: [60, 120],
    about: "Immunity, skin and hormones.", levers: "Shellfish, meat, seeds, legumes.",
  },

  // ── Hormones
  {
    key: "testosterone", name: "Testosterone (total)", system: "hormones", unit: "ng/dL",
    aliases: ["testosterone", "total testosterone", "тестостерон", "тестостерон общий"], convert: { "nmol/l": 28.84 },
    about: "Main androgen in all sexes; ranges depend strongly on sex.", levers: "Sleep, strength training, healthy weight.",
  },
  {
    key: "estradiol", name: "Estradiol", system: "hormones", unit: "pg/mL",
    aliases: ["estradiol", "oestradiol", "e2", "эстрадиол"], convert: { "pmol/l": 1 / 3.671 },
    about: "Main estrogen; varies with cycle phase.", levers: "Interpret with cycle day.",
  },
  {
    key: "progesterone", name: "Progesterone", system: "hormones", unit: "ng/mL",
    aliases: ["progesterone", "прогестерон"], convert: { "nmol/l": 1 / 3.18 },
    about: "Rises after ovulation; varies with cycle phase.", levers: "Interpret with cycle day.",
  },
  {
    key: "prolactin", name: "Prolactin", system: "hormones", unit: "ng/mL",
    aliases: ["prolactin", "пролактин"], convert: { "miu/l": 1 / 21.2, "uiu/ml": 1 / 21.2 }, ref: [4, 23],
    about: "Milk hormone; also rises with stress and some medications.", levers: "Test rested, in the morning.",
  },
  {
    key: "cortisol", name: "Cortisol (morning)", system: "hormones", unit: "ug/dL",
    aliases: ["cortisol", "кортизол"], convert: { "nmol/l": 1 / 27.59 }, ref: [6, 23],
    about: "Stress hormone, highest in the morning.", levers: "Sleep, stress management.",
  },
  {
    key: "dhea_s", name: "DHEA-S", system: "hormones", unit: "ug/dL",
    aliases: ["dhea-s", "dheas", "dhea sulfate", "дгэа-с", "дгэа-сульфат"], convert: { "umol/l": 36.81 },
    about: "Adrenal hormone; declines with age.", levers: "Sleep, stress.",
  },
  {
    key: "fsh", name: "FSH", system: "hormones", unit: "mIU/mL",
    aliases: ["fsh", "follicle stimulating hormone", "фсг"], convert: { "iu/l": 1 },
    about: "Reproductive hormone; interpret with cycle day.", levers: "Interpret with cycle day.",
  },
  {
    key: "lh", name: "LH", system: "hormones", unit: "mIU/mL",
    aliases: ["lh", "luteinizing hormone", "лг"], convert: { "iu/l": 1 },
    about: "Reproductive hormone; interpret with cycle day.", levers: "Interpret with cycle day.",
  },

  // ── Inflammation
  {
    key: "crp", name: "CRP / hs-CRP", system: "inflammation", unit: "mg/L",
    aliases: ["crp", "c-reactive protein", "hs-crp", "hscrp", "срб", "с-реактивный белок"], convert: { "mg/dl": 10 }, ref: [null, 3],
    about: "General inflammation marker. Spikes with infections; low chronic levels are better for the heart.",
    levers: "Sleep, movement, omega-3, fewer ultra-processed foods; retest when not sick.",
  },
  {
    key: "esr", name: "ESR", system: "inflammation", unit: "mm/h",
    aliases: ["esr", "sed rate", "erythrocyte sedimentation rate", "соэ"], convert: { "mm/hr": 1 }, ref: [null, 20],
    about: "Older, slower inflammation marker.", levers: "As CRP.",
  },
  {
    key: "homocysteine", name: "Homocysteine", system: "inflammation", unit: "umol/L",
    aliases: ["homocysteine", "гомоцистеин"], ref: [null, 10],
    about: "Amino acid linked to B-vitamin status and vascular health.", levers: "Folate, B12, B6 intake.",
  },
];

const BY_KEY = new Map(BIOMARKERS.map((b) => [b.key, b]));

export function getBiomarker(key: string | null | undefined): Biomarker | undefined {
  return key ? BY_KEY.get(key) : undefined;
}

function cleanName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+\(/g, "(")
    .replace(/\(.*?\)/g, (m) => (m === "(a)" || m === "(oh)" ? m : " "))
    .replace(/[,:;*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALIAS_INDEX: [string, string][] = BIOMARKERS.flatMap((b) =>
  [b.key, b.name, ...b.aliases].map((a) => [cleanName(a), b.key] as [string, string])
);

/** Maps a lab's marker name (any language/spelling) to a canonical key, or null if unknown. */
export function matchBiomarker(rawName: string): string | null {
  const n = cleanName(rawName);
  if (!n) return null;
  for (const [alias, key] of ALIAS_INDEX) if (alias === n) return key;
  // Fall back to a whole-word contains match on longer aliases (avoid "k", "na", "fe" false hits)
  for (const [alias, key] of ALIAS_INDEX) {
    if (alias.length < 4) continue;
    const re = new RegExp(`(^|[^\\p{L}\\d])${escapeRe(alias)}($|[^\\p{L}\\d])`, "u");
    if (re.test(n)) return key;
  }
  return null;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Normalises unit spellings: µ/μ/мк → u, case-insensitive, common Cyrillic units. */
export function normalizeUnit(unit: string | null | undefined): string {
  if (!unit) return "";
  return unit
    .trim()
    .toLowerCase()
    .replace(/[µμ]/g, "u")
    .replace(/мкме/g, "uiu")
    .replace(/мкмоль/g, "umol")
    .replace(/ммоль/g, "mmol")
    .replace(/нмоль/g, "nmol")
    .replace(/пмоль/g, "pmol")
    .replace(/мкг/g, "ug")
    .replace(/мг/g, "mg")
    .replace(/нг/g, "ng")
    .replace(/пг/g, "pg")
    .replace(/мл/g, "ml")
    .replace(/мме/g, "miu")
    .replace(/мед/g, "miu")
    .replace(/ед/g, "u")
    .replace(/г\//g, "g/")
    .replace(/л$/g, "l")
    .replace(/\/л/g, "/l")
    .replace(/×|\*/g, "x")
    .replace(/\s+/g, "")
    .replace(/mcg/g, "ug")
    .replace(/mcmol/g, "umol")
    .replace(/^10\^/, "x10^");
}

/** Converts `value` in `unit` to the marker's standard unit. Returns null if the unit is unknown. */
export function toStandard(key: string | null, value: number, unit: string | null | undefined): number | null {
  const b = getBiomarker(key);
  if (!b || !Number.isFinite(value)) return null;
  const u = normalizeUnit(unit);
  if (u === normalizeUnit(b.unit) || (u === "" && b.unit === "")) return value;
  const c = b.convert?.[u];
  if (c === undefined) return null;
  const out = typeof c === "number" ? value * c : c(value);
  return Math.round(out * 1000) / 1000;
}

export type Flag = "low" | "high" | "normal" | "unknown";

export function computeFlag(value: number, low: number | null | undefined, high: number | null | undefined): Flag {
  if (!Number.isFinite(value)) return "unknown";
  const hasLow = low !== null && low !== undefined && Number.isFinite(low);
  const hasHigh = high !== null && high !== undefined && Number.isFinite(high);
  if (!hasLow && !hasHigh) return "unknown";
  if (hasLow && value < (low as number)) return "low";
  if (hasHigh && value > (high as number)) return "high";
  return "normal";
}

/** Slug used as key for markers that are not in the dictionary. */
export function customKey(rawName: string): string {
  return (
    "x_" +
    cleanName(rawName)
      .replace(/[^\p{L}\d]+/gu, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 48)
  );
}
