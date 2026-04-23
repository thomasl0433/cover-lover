import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

interface Params {
    params: Promise<{ slug: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
    const { slug } = await params;
    const { userId } = await auth();

    const band = await prisma.band.findUnique({
        where: { slug },
        include: {
            members: {
                orderBy: { joinedAt: "asc" },
                select: { id: true, displayName: true, joinedAt: true },
            },
            songs: {
                include: {
                    addedBy: { select: { id: true, displayName: true } },
                    votes: { select: { memberId: true, member: { select: { displayName: true } } } },
                },
                orderBy: { addedAt: "desc" },
            },
        },
    });

    if (!band) {
        return NextResponse.json({ error: "Band not found" }, { status: 404 });
    }

    // Find current user's membership (separate query to avoid exposing all clerkIds)
    const currentMember = userId
        ? await prisma.member.findUnique({
            where: { bandId_clerkId: { bandId: band.id, clerkId: userId } },
            select: { id: true, displayName: true },
        })
        : null;

    if (!currentMember) {
        return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    return NextResponse.json({ band, currentMember });
}

