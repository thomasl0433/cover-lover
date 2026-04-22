import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/lastfm";

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get("q");

    if (!q || q.trim().length < 2) {
        return NextResponse.json({ tracks: [] });
    }

    try {
        const tracks = await searchTracks(q.trim());
        return NextResponse.json({ tracks });
    } catch (err) {
        console.error("GET /api/search error:", err);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}
