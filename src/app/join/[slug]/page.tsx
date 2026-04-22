import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { prisma } from "@/lib/prisma";
import JoinBandForm from "@/components/JoinBandForm";
import TopNav from "@/components/TopNav";

interface Props {
    params: Promise<{ slug: string }>;
}

export default async function JoinPage({ params }: Props) {
    const { slug } = await params;
    const { userId } = await auth();

    const band = await prisma.band.findUnique({ where: { slug } });
    if (!band) notFound();

    if (userId) {
        // Already a member? → go directly to band
        const member = await prisma.member.findUnique({
            where: { bandId_clerkId: { bandId: band.id, clerkId: userId } },
        });
        if (member) redirect(`/band/${slug}`);

        // Check for existing join request
        const existingRequest = await prisma.joinRequest.findUnique({
            where: { bandId_clerkId: { bandId: band.id, clerkId: userId } },
            select: { status: true },
        });

        return (
            <>
                <TopNav />
                <main className="flex flex-col items-center justify-center px-4 py-16">
                    <div className="w-full max-w-sm rounded-2xl border border-border-base bg-surface p-8 shadow-xl">
                        <JoinBandForm
                            slug={slug}
                            bandName={band.name}
                            existingRequest={existingRequest}
                        />
                    </div>
                </main>
            </>
        );
    }

    // Not signed in — show Clerk sign-in, redirecting back here after
    return (
        <>
            <TopNav />
            <main className="flex flex-col items-center justify-center px-4 py-16">
                <p className="text-muted text-sm mb-6">
                    Sign in to join <span className="text-foreground font-semibold">{band.name}</span>
                </p>
                <SignIn
                    forceRedirectUrl={`/join/${slug}`}
                    appearance={{ elements: { rootBox: "w-full max-w-sm" } }}
                />
            </main>
        </>
    );
}

