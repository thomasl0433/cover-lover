// This route is no longer used — joining is handled via /api/bands/[slug]/requests
// Kept as a placeholder to avoid 404s on any cached links.
import { NextResponse } from "next/server";
export async function POST() {
    return NextResponse.json({ error: "Use /api/bands/[slug]/requests to join" }, { status: 410 });
}

