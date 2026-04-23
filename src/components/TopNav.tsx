"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { Music4, ChevronDown } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

interface BandEntry {
    name: string;
    slug: string;
}

export default function TopNav() {
    const params = useParams<{ slug?: string }>();
    const slug = params?.slug;
    const { user, isLoaded } = useUser();
    const [bands, setBands] = useState<BandEntry[]>([]);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user) {
            setBands([]);
            return;
        }
        fetch("/api/me/bands")
            .then((r) => r.json())
            .then((d) => setBands(d.bands ?? []))
            .catch(() => { });
    }, [user]);

    useEffect(() => {
        function onOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        if (open) document.addEventListener("mousedown", onOutside);
        return () => document.removeEventListener("mousedown", onOutside);
    }, [open]);

    const currentBand = bands.find((b) => b.slug === slug);
    const displayBand = currentBand ?? bands[0];

    return (
        <header className="sticky top-0 z-40 w-full border-b border-border-base bg-background/80 backdrop-blur-md">
            <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-foreground hover:text-violet-500 transition-colors font-bold text-base"
                >
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shrink-0">
                        <Music4 className="h-4 w-4 text-white" />
                    </div>
                    Cover Lover
                </Link>

                <div className="flex items-center gap-2">
                    <ThemeToggle />

                    {isLoaded && bands.length === 1 && (
                        <Link
                            href={`/band/${bands[0].slug}`}
                            className="flex items-center gap-2 rounded-full border border-border-base bg-surface px-3 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                        >
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {bands[0].name[0].toUpperCase()}
                            </div>
                            <span className="text-foreground font-medium max-w-[8rem] sm:max-w-none truncate">{bands[0].name}</span>
                        </Link>
                    )}

                    {isLoaded && bands.length > 1 && displayBand && (
                        <div className="relative" ref={ref}>
                            <button
                                onClick={() => setOpen((o) => !o)}
                                className="flex items-center gap-2 rounded-full border border-border-base bg-surface px-3 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                            >
                                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {displayBand.name[0].toUpperCase()}
                                </div>
                                <span className="text-foreground font-medium max-w-[8rem] sm:max-w-none truncate">{displayBand.name}</span>
                                <ChevronDown className={cn("h-3 w-3 text-muted transition-transform duration-150", open && "rotate-180")} />
                            </button>

                            {open && (
                                <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-border-base bg-surface shadow-xl z-50 overflow-hidden py-1">
                                    <p className="px-3 py-1.5 text-xs font-semibold text-muted-2 uppercase tracking-wider">My bands</p>
                                    {bands.map((b) => (
                                        <Link
                                            key={b.slug}
                                            href={`/band/${b.slug}`}
                                            onClick={() => setOpen(false)}
                                            className={cn(
                                                "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                                                b.slug === slug
                                                    ? "bg-violet-500/10 text-violet-500 font-medium"
                                                    : "text-foreground hover:bg-surface-2"
                                            )}
                                        >
                                            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {b.name[0].toUpperCase()}
                                            </div>
                                            {b.name}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {isLoaded && user && (
                        <UserButton />
                    )}
                </div>
            </div>
        </header>
    );
}
