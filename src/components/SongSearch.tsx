"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SearchResult } from "@/app/api/search/route";

interface Props {
    slug: string;
    onSongAdded: () => void;
}

export default function SongSearch({ slug, onSongAdded }: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [adding, setAdding] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const search = useCallback(async (q: string) => {
        if (q.trim().length < 2) {
            setResults([]);
            return;
        }
        setSearching(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            setResults(data.tracks ?? []);
        } catch {
            setResults([]);
        } finally {
            setSearching(false);
        }
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(query), 400);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, search]);

    async function addSong(track: SearchResult) {
        setAdding(track.id);
        setError(null);
        try {
            const res = await fetch(`/api/bands/${slug}/songs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: track.title,
                    artist: track.artist,
                    spotifyUri: track.spotifyUri ?? undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Failed to add song");
            } else {
                setQuery("");
                setResults([]);
                onSongAdded();
            }
        } catch {
            setError("Network error");
        } finally {
            setAdding(null);
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-2" />
                {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-2 animate-spin" />
                )}
                <Input
                    className="pl-9 pr-9"
                    placeholder="Search for a song or artist…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            {results.length > 0 && (
                <ul className="rounded-lg border border-border-base bg-surface divide-y divide-border-base overflow-hidden shadow-xl max-h-72 overflow-y-auto">
                    {results.map((track) => (
                        <li
                            key={track.id}
                            className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-2 transition-colors gap-2"
                        >
                            {track.imageUrl && (
                                <img
                                    src={track.imageUrl}
                                    alt=""
                                    className="w-8 h-8 rounded object-cover shrink-0"
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm text-foreground font-medium truncate">
                                    {track.title}
                                </p>
                                <p className="text-xs text-muted truncate">
                                    {track.artist}
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => addSong(track)}
                                disabled={adding === track.id}
                                className="shrink-0"
                            >
                                {adding === track.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4" />
                                )}
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
