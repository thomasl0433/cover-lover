import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

interface Params {
    params: Promise<{ songId: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
    const { songId } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const song = await prisma.song.findUnique({ where: { id: songId } });
        if (!song) {
            return NextResponse.json({ error: "Song not found" }, { status: 404 });
        }

        const member = await prisma.member.findUnique({
            where: { bandId_clerkId: { bandId: song.bandId, clerkId: userId } },
        });
        if (!member) {
            return NextResponse.json({ error: "Not a band member" }, { status: 403 });
        }

        await prisma.vote.upsert({
            where: { songId_memberId: { songId, memberId: member.id } },
            create: { songId, memberId: member.id },
            update: {},
        });

        const voteCount = await prisma.vote.count({ where: { songId } });
        return NextResponse.json({ voteCount });
    } catch (err) {
        console.error("POST /api/songs/[songId]/vote error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
    const { songId } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song) {
        return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    const member = await prisma.member.findUnique({
        where: { bandId_clerkId: { bandId: song.bandId, clerkId: userId } },
    });
    if (!member) {
        return NextResponse.json({ error: "Not a band member" }, { status: 403 });
    }

    await prisma.vote.deleteMany({
        where: { songId, memberId: member.id },
    });

    const voteCount = await prisma.vote.count({ where: { songId } });
    return NextResponse.json({ voteCount });
}

