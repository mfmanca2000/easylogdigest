import { handlers } from "@/auth";
import type { NextRequest } from "next/server";

// next-auth v5 handlers pre-date Next.js 16's Promise<params> constraint;
// wrapping them is the minimal shim needed until next-auth ships a v16 build.
export async function GET(req: NextRequest) {
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  return handlers.POST(req);
}
