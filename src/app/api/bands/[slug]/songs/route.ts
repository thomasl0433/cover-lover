import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { findBestTrack } from "@/lib/lastfm";
import { findSpotifyTrack, isSpotifyConfigured } from "@/lib/spotify";
import { getArtistGenres } from "@/lib/musicbrainz";

interface Params {
    params: Promise<{ slug: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
    const { slug } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { title, artist, spotifyUri: providedSpotifyUri } = body as {
            title: string;
            artist: string;
            spotifyUri?: string;
        };

        if (!title || !artist) {
            return NextResponse.json(
                { error: "title and artist are required" },
                { status: 400 }
            );
        }

        const band = await prisma.band.findUnique({ where: { slug } });
        if (!band) {
            return NextResponse.json({ error: "Band not found" }, { status: 404 });
        }

        const member = await prisma.member.findUnique({
            where: { bandId_clerkId: { bandId: band.id, clerkId: userId } },
        });
        if (!member) {
            return NextResponse.json(
                { error: "You are not a member of this band" },
                { status: 403 }
            );
        }

        // Check for duplicate song in this band
        const existing = await prisma.song.findFirst({
            where: {
                bandId: band.id,
                title: { equals: title.trim(), mode: "insensitive" },
                artist: { equals: artist.trim(), mode: "insensitive" },
            },
        });
        if (existing) {
            return NextResponse.json(
                { error: "This song is already in the pool" },
                { status: 409 }
            );
        }

        // Enrich with Spotify metadata (preferred) or Last.fm (fallback)
        let enrichedTitle = title.trim();
        let enrichedArtist = artist.trim();
        let lastfmUrl: string | null = null;
        let imageUrl: string | null = null;
        let tags: string[] = [];
        let duration: number | null = null;
        let spotifyUri: string | null = providedSpotifyUri ?? null;

        if (isSpotifyConfigured()) {
            try {
                const spotifyTrack = spotifyUri
                    ? null // already have the URI from the search result
                    : await findSpotifyTrack(title.trim(), artist.trim());
                if (spotifyTrack) {
                    enrichedTitle = spotifyTrack.title;
                    enrichedArtist = spotifyTrack.artist;
                    imageUrl = spotifyTrack.imageUrl;
                    duration = spotifyTrack.duration;
                    spotifyUri = spotifyTrack.spotifyUri;
                }
            } catch {
                // Spotify errors are non-fatal
            }
        }

        // Always try Last.fm for imageUrl/duration fallback
        try {
            const lastfm = await findBestTrack(
                enrichedArtist || artist.trim(),
                enrichedTitle || title.trim()
            );
            if (lastfm) {
                lastfmUrl = lastfm.lastfmUrl;
                if (!imageUrl) imageUrl = lastfm.imageUrl;
                if (duration === null) duration = lastfm.duration;
            }
        } catch {
            // Last.fm errors are non-fatal
        }

        // Tags: MusicBrainz artist genres (clean, curated) → Last.fm fallback
        try {
            const mbGenres = await getArtistGenres(enrichedArtist || artist.trim());
            if (mbGenres.length > 0) {
                tags = mbGenres;
            } else {
                // Fall back to Last.fm tags if MusicBrainz has none
                const lastfm = await findBestTrack(
                    enrichedArtist || artist.trim(),
                    enrichedTitle || title.trim()
                );
                if (lastfm) tags = lastfm.tags;
            }
        } catch {
            // Tag errors are non-fatal
        }

        const song = await prisma.song.create({
            data: {
                bandId: band.id,
                title: enrichedTitle,
                artist: enrichedArtist,
                lastfmUrl,
                imageUrl,
                tags,
                duration,
                spotifyUri,
                addedById: member.id,
            },
            include: {
                addedBy: { select: { id: true, displayName: true } },
                votes: { select: { memberId: true, member: { select: { displayName: true } } } },
            },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                bandId: band.id,
                memberId: member.id,
                memberName: member.displayName,
                type: "SONG_ADDED",
                songId: song.id,
                songTitle: song.title,
                songArtist: song.artist,
            },
        });

        return NextResponse.json({ song }, { status: 201 });
    } catch (err) {
        console.error("POST /api/bands/[slug]/songs error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

