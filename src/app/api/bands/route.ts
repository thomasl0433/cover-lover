import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { name, displayName } = await req.json();

        if (!name || typeof name !== "string" || name.trim().length < 2) {
            return NextResponse.json(
                { error: "Band name must be at least 2 characters" },
                { status: 400 }
            );
        }
        if (!displayName || typeof displayName !== "string" || displayName.trim().length < 1) {
            return NextResponse.json(
                { error: "Your display name is required" },
                { status: 400 }
            );
        }

        const slug = nanoid(10);

        const band = await prisma.band.create({
            data: {
                name: name.trim(),
                slug,
                members: {
                    create: {
                        clerkId: userId,
                        displayName: displayName.trim(),
                    },
                },
            },
        });

        return NextResponse.json({ band }, { status: 201 });
    } catch (err) {
        console.error("POST /api/bands error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

