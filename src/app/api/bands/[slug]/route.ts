import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
    params: Promise<{ slug: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
    const { slug } = await params;

    const band = await prisma.band.findUnique({
        where: { slug },
        include: {
            members: { orderBy: { joinedAt: "asc" } },
            songs: {
                include: {
                    addedBy: { select: { id: true, displayName: true } },
                    votes: { select: { memberId: true } },
                },
                orderBy: { addedAt: "desc" },
            },
        },
    });

    if (!band) {
        return NextResponse.json({ error: "Band not found" }, { status: 404 });
    }

    return NextResponse.json({ band });
}
