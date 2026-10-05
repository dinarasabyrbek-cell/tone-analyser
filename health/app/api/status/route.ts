import { NextResponse } from "next/server";
import { MODEL_DEEP, MODEL_FAST } from "@/lib/ai";
import { cloudConfigured } from "@/lib/supabase/server";

// Lets the UI show setup hints (never exposes secrets).
export function GET() {
  return NextResponse.json({
    ai: Boolean((process.env.OPENROUTER_API_KEY || "").trim()),
    cloud: cloudConfigured(),
    passcode: Boolean(process.env.APP_PASSCODE) && !cloudConfigured(),
    models: { fast: MODEL_FAST, deep: MODEL_DEEP },
  });
}
