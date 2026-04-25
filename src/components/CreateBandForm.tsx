"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music2, User, LogIn } from "lucide-react";

export default function CreateBandForm() {
    const router = useRouter();
    const { user, isLoaded } = useUser();
    const [name, setName] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Not yet loaded
    if (!isLoaded) return null;

    // Not signed in
    if (!user) {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <p className="text-muted text-sm">Create your band in one step after signing in.</p>
                <Button asChild size="lg" className="w-full gap-2">
                    <Link href="/sign-in">
                        <LogIn className="h-4 w-4" />
                        Sign in
                    </Link>
                </Button>
            </div>
        );
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !displayName.trim()) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/bands", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, displayName }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Failed to create band");
                return;
            }
            router.push(`/band/${data.band.slug}`);
        } catch {
            setError("Network error — please try again");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
                <label htmlFor="band-name" className="text-sm text-muted">
                    Band / Group Name
                </label>
                <div className="relative">
                    <Music2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-2" />
                    <Input
                        id="band-name"
                        className="pl-9"
                        placeholder="e.g. The Midnight Covers"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={60}
                        required
                    />
                </div>
            </div>
            <div className="flex flex-col gap-1.5">
                <label htmlFor="your-name" className="text-sm text-muted">
                    Your name in the band
                </label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-2" />
                    <Input
                        id="your-name"
                        className="pl-9"
                        placeholder="e.g. Alex"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        maxLength={40}
                        required
                    />
                </div>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button
                type="submit"
                disabled={loading || !name.trim() || !displayName.trim()}
                size="lg"
            >
                {loading ? "Creating…" : "Create Band"}
            </Button>
        </form>
    );
}

