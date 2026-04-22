import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { findBestTrack } from "@/lib/lastfm";

interface Params {
    params: Promise<{ slug: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
    const { slug } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { title, artist } = await req.json();

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

        // Enrich with Last.fm data
        let enriched = null;
        try {
            enriched = await findBestTrack(artist.trim(), title.trim());
        } catch {
            // Last.fm errors are non-fatal; fall back to bare data
        }

        const song = await prisma.song.create({
            data: {
                bandId: band.id,
                title: enriched?.title ?? title.trim(),
                artist: enriched?.artist ?? artist.trim(),
                lastfmUrl: enriched?.lastfmUrl ?? null,
                imageUrl: enriched?.imageUrl ?? null,
                tags: enriched?.tags ?? [],
                duration: enriched?.duration ?? null,
                addedById: member.id,
            },
            include: {
                addedBy: { select: { id: true, displayName: true } },
                votes: { select: { memberId: true } },
            },
        });

        return NextResponse.json({ song }, { status: 201 });
    } catch (err) {
        console.error("POST /api/bands/[slug]/songs error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

