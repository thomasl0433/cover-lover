import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

interface Params {
    params: Promise<{ slug: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
    const { slug } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const band = await prisma.band.findUnique({ where: { slug } });
    if (!band) return NextResponse.json({ error: "Band not found" }, { status: 404 });

    const member = await prisma.member.findUnique({
        where: { bandId_clerkId: { bandId: band.id, clerkId: userId } },
    });
    if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

    const activities = await prisma.activity.findMany({
        where: { bandId: band.id },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

    return NextResponse.json({ activities });
}
