"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import BandDashboard from "@/components/BandDashboard";
import TopNav from "@/components/TopNav";

export default function BandPage() {
    const router = useRouter();
    const params = useParams<{ slug: string }>();
    const slug = params.slug;

    const [session, setSession] = useState<{
        sessionId: string;
        memberId: string;
        memberName: string;
    } | null>(null);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const sessionId = localStorage.getItem(`cl_session_${slug}`);
        const memberId = localStorage.getItem(`cl_member_${slug}`);
        const memberName = localStorage.getItem(`cl_name_${slug}`);

        if (sessionId && memberId && memberName) {
            setSession({ sessionId, memberId, memberName });
        } else {
            router.replace(`/join/${slug}`);
        }
        setChecked(true);
    }, [slug, router]);

    if (!checked) {
        return (
            <div className="min-h-screen flex items-center justify-center text-slate-500">
                Loading…
            </div>
        );
    }

    if (!session) return null;

    return (
        <>
            <TopNav />
            <main className="max-w-2xl mx-auto px-4 py-10">
                <BandDashboard
                    slug={slug}
                    sessionId={session.sessionId}
                    memberId={session.memberId}
                    memberName={session.memberName}
                />
            </main>
        </>
    );
}
