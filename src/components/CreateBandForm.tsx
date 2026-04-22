"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music2 } from "lucide-react";

export default function CreateBandForm() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/bands", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Failed to create band");
                return;
            }
            // Redirect to join page so creator can set their display name
            router.push(`/join/${data.band.slug}?creator=1`);
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
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={loading || !name.trim()} size="lg">
                {loading ? "Creating…" : "Create Band"}
            </Button>
        </form>
    );
}
