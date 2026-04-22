import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

interface Params {
    params: Promise<{ slug: string }>;
}

// GET — list pending requests (members only)
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

    const requests = await prisma.joinRequest.findMany({
        where: { bandId: band.id, status: "pending" },
        orderBy: { createdAt: "asc" },
        select: { id: true, displayName: true, createdAt: true },
    });

    return NextResponse.json({ requests });
}

// POST — submit a join request
export async function POST(req: NextRequest, { params }: Params) {
    const { slug } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { displayName } = await req.json();

        if (!displayName || typeof displayName !== "string" || displayName.trim().length < 1) {
            return NextResponse.json({ error: "Display name is required" }, { status: 400 });
        }

        const band = await prisma.band.findUnique({ where: { slug } });
        if (!band) return NextResponse.json({ error: "Band not found" }, { status: 404 });

        // Already a member?
        const existingMember = await prisma.member.findUnique({
            where: { bandId_clerkId: { bandId: band.id, clerkId: userId } },
        });
        if (existingMember) {
            return NextResponse.json({ member: existingMember });
        }

        // Display name taken?
        const nameTaken = await prisma.member.findFirst({
            where: {
                bandId: band.id,
                displayName: { equals: displayName.trim(), mode: "insensitive" },
            },
        });
        if (nameTaken) {
            return NextResponse.json(
                { error: "That name is already taken in this band — choose another" },
                { status: 409 }
            );
        }

        // Upsert request (allow re-request after rejection if they change name)
        const request = await prisma.joinRequest.upsert({
            where: { bandId_clerkId: { bandId: band.id, clerkId: userId } },
            create: {
                bandId: band.id,
                clerkId: userId,
                displayName: displayName.trim(),
                status: "pending",
            },
            update: {
                displayName: displayName.trim(),
                status: "pending",
            },
        });

        return NextResponse.json({ request }, { status: 201 });
    } catch (err) {
        console.error("POST /api/bands/[slug]/requests error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
