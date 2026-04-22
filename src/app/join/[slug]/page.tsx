import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import JoinBandForm from "@/components/JoinBandForm";
import TopNav from "@/components/TopNav";

interface Props {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ creator?: string }>;
}

export default async function JoinPage({ params, searchParams }: Props) {
    const { slug } = await params;
    const { creator } = await searchParams;

    const band = await prisma.band.findUnique({ where: { slug } });
    if (!band) notFound();

    return (
        <>
            <TopNav />
            <main className="flex flex-col items-center justify-center px-4 py-16">
                <div className="w-full max-w-sm rounded-2xl border border-border-base bg-surface p-8 shadow-xl">
                    <JoinBandForm
                        slug={slug}
                        bandName={band.name}
                        isCreator={creator === "1"}
                    />
                </div>
            </main>
        </>
    );
}
