"use client";

import { useParams } from "next/navigation";
import BandDashboard from "@/components/BandDashboard";
import TopNav from "@/components/TopNav";

export default function BandPage() {
    const params = useParams<{ slug: string }>();
    const slug = params.slug;

    return (
        <>
            <TopNav />
            <main className="max-w-2xl mx-auto px-4 py-10">
                <BandDashboard slug={slug} />
            </main>
        </>
    );
}

