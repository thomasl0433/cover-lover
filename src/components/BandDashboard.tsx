"use client";

import { useState, useEffect, useCallback } from "react";
import { Link2, Users, RefreshCw, CheckSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SongSearch from "@/components/SongSearch";
import SongCard from "@/components/SongCard";
import BulkUpload from "@/components/BulkUpload";

interface Member {
    id: string;
    displayName: string;
}

interface Song {
    id: string;
    title: string;
    artist: string;
    lastfmUrl: string | null;
    imageUrl: string | null;
    tags: unknown;
    duration: number | null;
    addedBy: { id: string; displayName: string };
    votes: Array<{ memberId: string }>;
}

interface Band {
    id: string;
    name: string;
    slug: string;
    members: Member[];
    songs: Song[];
}

interface Props {
    slug: string;
    sessionId: string;
    memberId: string;
    memberName: string;
}

export default function BandDashboard({
    slug,
    sessionId,
    memberId,
    memberName,
}: Props) {
    const [band, setBand] = useState<Band | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const fetchBand = useCallback(async () => {
        try {
            const res = await fetch(`/api/bands/${slug}`);
            const data = await res.json();
            if (res.ok) setBand(data.band);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchBand();
    }, [fetchBand]);

    function copyInviteLink() {
        const url = `${window.location.origin}/join/${slug}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function toggleSelect(id: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    function exitSelectMode() {
        setSelectMode(false);
        setSelectedIds(new Set());
    }

    async function deleteSelected() {
        for (const id of selectedIds) {
            await fetch(
                `/api/bands/${slug}/songs/${id}?sessionId=${encodeURIComponent(sessionId)}`,
                { method: "DELETE" }
            );
        }
        exitSelectMode();
        fetchBand();
    }

    const sortedSongs = band
        ? [...band.songs].sort((a, b) => b.votes.length - a.votes.length)
        : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-500">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Loading…
            </div>
        );
    }

    if (!band) {
        return <p className="text-red-400 text-center py-10">Band not found.</p>;
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-foreground">{band.name}</h1>
                    <p className="text-muted text-sm mt-0.5">
                        Voting as <span className="text-violet-500">{memberName}</span>
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                    <Button variant="outline" size="sm" onClick={copyInviteLink}>
                        <Link2 className="h-4 w-4" />
                        {copied ? "Copied!" : "Invite Link"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={fetchBand}>
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Members */}
            <div className="flex items-center gap-2 flex-wrap">
                <Users className="h-4 w-4 text-muted-2 shrink-0" />
                {band.members.map((m) => (
                    <span
                        key={m.id}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                            m.id === memberId
                                ? "bg-violet-600 text-white"
                                : "bg-surface-2 text-muted border border-border-base"
                        }`}
                    >
                        {m.displayName}
                    </span>
                ))}
            </div>

            {/* Search */}
            <div className="rounded-xl border border-border-base bg-surface p-4">
                <h2 className="text-sm font-semibold text-muted mb-3">
                    Add a song to the pool
                </h2>
                <SongSearch
                    slug={slug}
                    sessionId={sessionId}
                    onSongAdded={fetchBand}
                />
            </div>

            {/* Bulk upload */}
            <BulkUpload slug={slug} sessionId={sessionId} onSongsAdded={fetchBand} />

            {/* Song list */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-muted-2 uppercase tracking-wider">
                        {sortedSongs.length} song{sortedSongs.length !== 1 ? "s" : ""} in the pool
                    </h2>
                    {selectMode ? (
                        <div className="flex gap-2">
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={deleteSelected}
                                disabled={selectedIds.size === 0}
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete {selectedIds.size > 0 ? selectedIds.size : ""}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={exitSelectMode}>
                                Cancel
                            </Button>
                        </div>
                    ) : (
                        sortedSongs.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => setSelectMode(true)}>
                                <CheckSquare className="h-4 w-4" />
                                Select
                            </Button>
                        )
                    )}
                </div>
                {sortedSongs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border-base p-10 text-center text-muted-2">
                        No songs yet — add the first one above!
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {sortedSongs.map((song, i) => (
                            <SongCard
                                key={song.id}
                                song={{ ...song, tags: song.tags as string[] }}
                                rank={i + 1}
                                memberId={memberId}
                                sessionId={sessionId}
                                slug={slug}
                                onVoteChange={fetchBand}
                                onDelete={fetchBand}
                                selectMode={selectMode}
                                isSelected={selectedIds.has(song.id)}
                                onToggleSelect={() => toggleSelect(song.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
