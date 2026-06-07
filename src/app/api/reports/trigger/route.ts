import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runDigest } from "@/lib/digest/run-digest";

export async function POST() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    await runDigest();
    return NextResponse.json({ ok: true, message: "Digest completed" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
