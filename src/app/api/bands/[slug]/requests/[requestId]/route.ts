import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

interface Params {
    params: Promise<{ slug: string; requestId: string }>;
}

// PATCH — approve or reject a request
export async function PATCH(req: NextRequest, { params }: Params) {
    const { slug, requestId } = await params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { action } = await req.json(); // "approve" | "reject"
        if (action !== "approve" && action !== "reject") {
            return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
        }

        const band = await prisma.band.findUnique({ where: { slug } });
        if (!band) return NextResponse.json({ error: "Band not found" }, { status: 404 });

        // Only existing members can approve/reject
        const approver = await prisma.member.findUnique({
            where: { bandId_clerkId: { bandId: band.id, clerkId: userId } },
        });
        if (!approver) return NextResponse.json({ error: "Not a member" }, { status: 403 });

        const request = await prisma.joinRequest.findUnique({
            where: { id: requestId },
        });
        if (!request || request.bandId !== band.id) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }
        if (request.status !== "pending") {
            return NextResponse.json({ error: "Request already resolved" }, { status: 409 });
        }

        if (action === "approve") {
            // Check display name still available
            const nameTaken = await prisma.member.findFirst({
                where: {
                    bandId: band.id,
                    displayName: { equals: request.displayName, mode: "insensitive" },
                },
            });
            if (nameTaken) {
                return NextResponse.json(
                    { error: "Display name is now taken — ask the requester to change it" },
                    { status: 409 }
                );
            }

            const [member] = await prisma.$transaction([
                prisma.member.create({
                    data: {
                        bandId: band.id,
                        clerkId: request.clerkId,
                        displayName: request.displayName,
                    },
                }),
                prisma.joinRequest.update({
                    where: { id: requestId },
                    data: { status: "approved" },
                }),
            ]);

            return NextResponse.json({ member });
        } else {
            const updated = await prisma.joinRequest.update({
                where: { id: requestId },
                data: { status: "rejected" },
            });
            return NextResponse.json({ request: updated });
        }
    } catch (err) {
        console.error("PATCH /api/bands/[slug]/requests/[requestId] error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
