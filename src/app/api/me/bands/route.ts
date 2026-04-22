import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const members = await prisma.member.findMany({
        where: { clerkId: userId },
        include: { band: { select: { name: true, slug: true } } },
        orderBy: { joinedAt: "asc" },
    });

    const bands = members.map((m) => ({
        name: m.band.name,
        slug: m.band.slug,
    }));

    return NextResponse.json({ bands });
}
