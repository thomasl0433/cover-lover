import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/lastfm";
import { searchSpotifyTracks, isSpotifyConfigured } from "@/lib/spotify";

export interface SearchResult {
    id: string;
    title: string;
    artist: string;
    imageUrl: string | null;
    spotifyUri: string | null;
    source: "spotify" | "lastfm";
}

export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get("q");

    if (!q || q.trim().length < 2) {
        return NextResponse.json({ tracks: [] });
    }

    try {
        if (isSpotifyConfigured()) {
            const tracks = await searchSpotifyTracks(q.trim());
            const results: SearchResult[] = tracks.map((t) => ({
                id: t.id,
                title: t.title,
                artist: t.artist,
                imageUrl: t.imageUrl,
                spotifyUri: t.spotifyUri,
                source: "spotify",
            }));
            return NextResponse.json({ tracks: results });
        }

        // Fallback: Last.fm
        const tracks = await searchTracks(q.trim());
        const results: SearchResult[] = tracks.map((t) => ({
            id: `${t.name}||${t.artist}`,
            title: t.name,
            artist: typeof t.artist === "string" ? t.artist : (t.artist as { name: string }).name,
            imageUrl: null,
            spotifyUri: null,
            source: "lastfm",
        }));
        return NextResponse.json({ tracks: results });
    } catch (err) {
        console.error("GET /api/search error:", err);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}
