import { NextResponse } from "next/server";
import { runDigest } from "@/lib/digest/run-digest";

export async function POST() {
  try {
    await runDigest();
    return NextResponse.json({ ok: true, message: "Digest completed" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
