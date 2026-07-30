import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/validateApiKey";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await validateApiKey(token);

  if (!user) {
    return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
