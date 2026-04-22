"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "lucide-react";
import { nanoid } from "nanoid";

interface Props {
    slug: string;
    bandName: string;
    isCreator?: boolean;
}

export default function JoinBandForm({ slug, bandName, isCreator }: Props) {
    const router = useRouter();
    const [displayName, setDisplayName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!displayName.trim()) return;
        setLoading(true);
        setError(null);

        const sessionId = nanoid(20);

        try {
            const res = await fetch(`/api/bands/${slug}/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ displayName, sessionId }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Failed to join band");
                return;
            }

            // Persist session in localStorage
            localStorage.setItem(`cl_session_${slug}`, data.member.sessionId);
            localStorage.setItem(`cl_member_${slug}`, data.member.id);
            localStorage.setItem(`cl_name_${slug}`, data.member.displayName);

            router.push(`/band/${slug}`);
        } catch {
            setError("Network error — please try again");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="text-center mb-2">
                <p className="text-muted text-sm">
                    {isCreator ? "You're creating" : "You've been invited to join"}
                </p>
                <p className="text-foreground text-2xl font-bold mt-1">{bandName}</p>
            </div>
            <div className="flex flex-col gap-1.5">
                <label htmlFor="display-name" className="text-sm text-muted">
                    Your display name
                </label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-2" />
                    <Input
                        id="display-name"
                        className="pl-9"
                        placeholder="e.g. Alex"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        maxLength={40}
                        required
                        autoFocus
                    />
                </div>
                <p className="text-xs text-muted-2">
                    Returning? Use the same name you joined with to restore your session.
                </p>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={loading || !displayName.trim()} size="lg">
                {loading ? "Joining…" : isCreator ? "Enter Band" : "Join Band"}
            </Button>
        </form>
    );
}
