import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

interface Params {
    params: Promise<{ slug: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
    const { slug } = await params;

    try {
        const { displayName, sessionId } = await req.json();

        if (
            !displayName ||
            typeof displayName !== "string" ||
            displayName.trim().length < 1
        ) {
            return NextResponse.json(
                { error: "Display name is required" },
                { status: 400 }
            );
        }

        const band = await prisma.band.findUnique({ where: { slug } });
        if (!band) {
            return NextResponse.json({ error: "Band not found" }, { status: 404 });
        }

        // If sessionId provided, check for existing member by sessionId — fastest path
        if (sessionId && typeof sessionId === "string") {
            const existing = await prisma.member.findUnique({
                where: { sessionId },
            });
            if (existing && existing.bandId === band.id) {
                return NextResponse.json({ member: existing });
            }
        }

        const sid = (sessionId as string) || nanoid(20);

        // Check if the name is already taken in this band.
        // If so, treat it as the same person returning (e.g. cleared localStorage)
        // and re-issue their session. The DB unique constraint prevents two *different*
        // members from ever having the same name simultaneously.
        const existingByName = await prisma.member.findFirst({
            where: {
                bandId: band.id,
                displayName: { equals: displayName.trim(), mode: "insensitive" },
            },
        });
        if (existingByName) {
            const updated = await prisma.member.update({
                where: { id: existingByName.id },
                data: { sessionId: sid },
            });
            return NextResponse.json({ member: updated });
        }

        const member = await prisma.member.create({
            data: {
                bandId: band.id,
                displayName: displayName.trim(),
                sessionId: sid,
            },
        });

        return NextResponse.json({ member }, { status: 201 });
    } catch (err) {
        console.error("POST /api/bands/[slug]/join error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
