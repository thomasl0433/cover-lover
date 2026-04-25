"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { Music4, ChevronDown, Bell, Settings, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface BandEntry {
    name: string;
    slug: string;
}

interface ActivityItem {
    id: string;
    memberName: string;
    type: string;
    songTitle: string;
    songArtist: string;
    createdAt: string;
}

function activityLabel(item: ActivityItem) {
    if (item.type === "SONG_ADDED") return `${item.memberName} added "${item.songTitle}"`;
    if (item.type === "SONG_REMOVED") return `${item.memberName} removed "${item.songTitle}"`;
    return `${item.memberName} voted for "${item.songTitle}"`;
}

function lastSeenKey(slug: string) {
    return `activity-seen-${slug}`;
}

export default function TopNav() {
    const params = useParams<{ slug?: string }>();
    const slug = params?.slug;
    const { user, isLoaded } = useUser();
    const [bands, setBands] = useState<BandEntry[]>([]);
    const [open, setOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [bellOpen, setBellOpen] = useState(false);
    const [unseenItems, setUnseenItems] = useState<ActivityItem[]>([]);
    const [visibleItems, setVisibleItems] = useState<ActivityItem[]>([]);
    const ref = useRef<HTMLDivElement>(null);
    const bellRef = useRef<HTMLDivElement>(null);
    const settingsRef = useRef<HTMLDivElement>(null);
    const { theme, setTheme } = useTheme();
    const [themeMounted, setThemeMounted] = useState(false);
    useEffect(() => setThemeMounted(true), []);

    const THEMES = [
        { value: "light", icon: Sun, label: "Light" },
        { value: "dark", icon: Moon, label: "Dark" },
        { value: "system", icon: Monitor, label: "System" },
    ] as const;

    useEffect(() => {
        if (!user) { setBands([]); return; }
        fetch("/api/me/bands")
            .then((r) => r.json())
            .then((d) => setBands(d.bands ?? []))
            .catch(() => { });
    }, [user]);

    // Fetch activity for current band and compute unseen items
    useEffect(() => {
        if (!slug || !user) { setUnseenItems([]); return; }
        async function load() {
            const res = await fetch(`/api/bands/${slug}/activity`).catch(() => null);
            if (!res?.ok) return;
            const data = await res.json();
            const items: ActivityItem[] = data.activities ?? [];
            const lastSeen = localStorage.getItem(lastSeenKey(slug!));
            const lastSeenDate = lastSeen ? new Date(lastSeen) : new Date(0);
            setUnseenItems(items.filter((a) => new Date(a.createdAt) > lastSeenDate));
        }
        load();
    }, [slug, user]);

    useEffect(() => {
        function onOutside(e: MouseEvent) {
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
        }
        if (settingsOpen) document.addEventListener("mousedown", onOutside);
        return () => document.removeEventListener("mousedown", onOutside);
    }, [settingsOpen]);

    useEffect(() => {
        function onOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        if (open) document.addEventListener("mousedown", onOutside);
        return () => document.removeEventListener("mousedown", onOutside);
    }, [open]);

    useEffect(() => {
        function onOutside(e: MouseEvent) {
            if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
        }
        if (bellOpen) document.addEventListener("mousedown", onOutside);
        return () => document.removeEventListener("mousedown", onOutside);
    }, [bellOpen]);

    function openBell() {
        if (slug) {
            localStorage.setItem(lastSeenKey(slug), new Date().toISOString());
        }
        // Snapshot the current unseen items for display, then clear the badge
        setVisibleItems(unseenItems);
        setUnseenItems([]);
        setBellOpen((o) => !o);
    }

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
                    <span className="hidden sm:inline">Cover Lover</span>
                </Link>

                <div className="flex items-center gap-2">
                    {/* Settings dropdown with theme toggle */}
                    <div className="relative" ref={settingsRef}>
                        <button
                            onClick={() => setSettingsOpen((o) => !o)}
                            className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-surface-2 transition-colors text-muted hover:text-foreground"
                            aria-label="Settings"
                        >
                            <Settings className="h-4 w-4" />
                        </button>
                        {settingsOpen && (
                            <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-border-base bg-surface shadow-xl z-50 overflow-hidden py-1">
                                <p className="px-3 py-1.5 text-xs font-semibold text-muted-2 uppercase tracking-wider">Theme</p>
                                {THEMES.map(({ value, icon: Icon, label }) => (
                                    <button
                                        key={value}
                                        onClick={() => { setTheme(value); setSettingsOpen(false); }}
                                        className={cn(
                                            "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors",
                                            themeMounted && theme === value
                                                ? "bg-violet-500/10 text-violet-500 font-medium"
                                                : "text-muted hover:bg-surface-2 hover:text-foreground"
                                        )}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Activity bell — only shown when on a band page */}
                    {slug && user && (
                        <div className="relative" ref={bellRef}>
                            <button
                                onClick={openBell}
                                className="relative flex items-center justify-center h-8 w-8 rounded-full hover:bg-surface-2 transition-colors text-muted hover:text-foreground"
                                aria-label="Activity notifications"
                            >
                                <Bell className="h-4 w-4" />
                                {unseenItems.length > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                                        {unseenItems.length > 9 ? "9+" : unseenItems.length}
                                    </span>
                                )}
                            </button>

                            {bellOpen && (
                                <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border-base bg-surface shadow-xl z-50 overflow-visible">
                                    {/* Arrow pointing up toward bell icon */}
                                    <div className="absolute -top-[7px] right-[14px] w-3 h-3 rotate-45 bg-surface border-l border-t border-border-base rounded-tl-sm" />
                                    <div className="overflow-hidden rounded-xl">
                                    <p className="px-4 py-2.5 text-xs font-semibold text-muted-2 uppercase tracking-wider border-b border-border-base">
                                        New activity
                                    </p>
                                    {visibleItems.length === 0 ? (
                                        <p className="px-4 py-4 text-sm text-muted text-center">You&apos;re all caught up</p>
                                    ) : (
                                        <div className="max-h-72 overflow-y-auto divide-y divide-border-base">
                                            {visibleItems.map((item) => (
                                                <div key={item.id} className="px-4 py-2.5 flex items-start gap-2.5">
                                                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
                                                        {item.memberName[0]?.toUpperCase() ?? "?"}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-foreground leading-snug">{activityLabel(item)}</p>
                                                        <p className="text-xs text-muted mt-0.5">
                                                            {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {isLoaded && bands.length === 1 && (
                        <Link
                            href={`/band/${bands[0].slug}`}
                            aria-label={bands[0].name}
                            className="flex items-center justify-center h-8 w-8 rounded-full border border-border-base bg-surface hover:bg-surface-2 transition-colors"
                        >
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {bands[0].name[0].toUpperCase()}
                            </div>
                        </Link>
                    )}

                    {isLoaded && bands.length > 1 && displayBand && (
                        <div className="relative" ref={ref}>
                            <button
                                onClick={() => setOpen((o) => !o)}
                                aria-label={`Switch band (current: ${displayBand.name})`}
                                className="flex items-center gap-1 rounded-full border border-border-base bg-surface pl-1 pr-1.5 py-1 hover:bg-surface-2 transition-colors"
                            >
                                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {displayBand.name[0].toUpperCase()}
                                </div>
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
