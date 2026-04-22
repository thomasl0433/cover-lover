import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

interface Params {
    params: Promise<{ slug: string; songId: string }>;
}

export async function DELETE(_req: NextRequest, { params }: Params) {
    const { slug, songId } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const band = await prisma.band.findUnique({ where: { slug } });
    if (!band) {
        return NextResponse.json({ error: "Band not found" }, { status: 404 });
    }

    const member = await prisma.member.findUnique({
        where: { bandId_clerkId: { bandId: band.id, clerkId: userId } },
    });
    if (!member) {
        return NextResponse.json({ error: "Not a band member" }, { status: 403 });
    }

    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song || song.bandId !== band.id) {
        return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    if (song.addedById !== member.id) {
        return NextResponse.json(
            { error: "You can only remove songs you added" },
            { status: 403 }
        );
    }

    await prisma.song.delete({ where: { id: songId } });
    return NextResponse.json({ ok: true });
}

