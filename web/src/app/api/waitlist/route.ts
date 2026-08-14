import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseWaitlistPayload } from "@/lib/waitlist";

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 8_192) return NextResponse.json({ ok: false, error: "That request is too large." }, { status: 413 });

    const payload = await request.json();
    if (payload && typeof payload === "object" && "company" in payload && payload.company) {
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const parsed = parseWaitlistPayload(payload);
    if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });

    const { email, goal, platform, wantsBeta, locale } = parsed.data;
    const { error } = await supabaseAdmin().from("waitlist_signups").upsert(
      {
        email,
        goal,
        platform,
        wants_beta: wantsBeta,
        locale,
        privacy_consent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );

    if (error) {
      console.error("Waitlist insert failed", error.message);
      return NextResponse.json({ ok: false, error: "We could not save your place right now. Please try again." }, { status: 503 });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "We could not save your place right now. Please try again." }, { status: 400 });
  }
}
