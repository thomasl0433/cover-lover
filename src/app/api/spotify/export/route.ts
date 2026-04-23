import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceAccessToken, createSpotifyPlaylist, updateSpotifyPlaylist, isSpotifyExportConfigured } from "@/lib/spotify";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!isSpotifyExportConfigured()) {
        return NextResponse.json({ error: "Spotify export is not configured" }, { status: 503 });
    }

    const { slug } = await req.json();
    if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });

    const band = await prisma.band.findUnique({
        where: { slug },
        include: {
            songs: {
                orderBy: [
                    { votes: { _count: "desc" } },
                    { addedAt: "asc" },
                ],
                select: {
                    title: true,
                    artist: true,
                    spotifyUri: true,
                },
            },
        },
    });

    if (!band) {
        return NextResponse.json({ error: "Band not found" }, { status: 404 });
    }

    const accessToken = await getServiceAccessToken();
    let playlistUrl: string;

    if (band.spotifyPlaylistId) {
        // Playlist already exists — replace its tracks with the current song list
        playlistUrl = await updateSpotifyPlaylist(accessToken, band.spotifyPlaylistId, band.songs);
    } else {
        // First export — create a new playlist and persist its ID
        playlistUrl = await createSpotifyPlaylist(accessToken, band.name, band.songs);
        const playlistId = playlistUrl.split("/").pop()!;
        await prisma.band.update({
            where: { slug },
            data: { spotifyPlaylistId: playlistId, spotifyPlaylistUrl: playlistUrl },
        });
    }

    return NextResponse.json({ url: playlistUrl });
}
