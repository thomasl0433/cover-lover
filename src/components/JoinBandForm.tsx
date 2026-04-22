"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Clock, XCircle } from "lucide-react";

interface Props {
    slug: string;
    bandName: string;
    existingRequest: { status: string } | null;
}

export default function JoinBandForm({ slug, bandName, existingRequest }: Props) {
    const router = useRouter();
    const [displayName, setDisplayName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    // Already has a pending request
    if (existingRequest?.status === "pending" || submitted) {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                    <p className="font-bold text-foreground text-lg">Request pending</p>
                    <p className="text-muted text-sm mt-1">
                        An existing member of <span className="text-foreground font-medium">{bandName}</span> needs to approve your request.
                        Ask them to open the app!
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push("/")}>
                    Back to home
                </Button>
            </div>
        );
    }

    // Request was rejected
    if (existingRequest?.status === "rejected") {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                    <p className="font-bold text-foreground text-lg">Request declined</p>
                    <p className="text-muted text-sm mt-1">
                        Your request to join <span className="text-foreground font-medium">{bandName}</span> was declined.
                        You can request again with a different name.
                    </p>
                </div>
            </div>
        );
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!displayName.trim()) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/bands/${slug}/requests`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ displayName }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Failed to send request");
                return;
            }
            // If a member record was returned (already a member), redirect
            if (data.member) {
                router.push(`/band/${slug}`);
                return;
            }
            setSubmitted(true);
        } catch {
            setError("Network error — please try again");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="text-center mb-2">
                <p className="text-muted text-sm">You&apos;ve been invited to join</p>
                <p className="text-foreground text-2xl font-bold mt-1">{bandName}</p>
            </div>
            <div className="flex flex-col gap-1.5">
                <label htmlFor="display-name" className="text-sm text-muted">
                    Your name in the band
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
                    An existing member will need to approve your request.
                </p>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={loading || !displayName.trim()} size="lg">
                {loading ? "Sending…" : "Request to Join"}
            </Button>
        </form>
    );
}

