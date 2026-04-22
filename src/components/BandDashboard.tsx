"use client";

import { useState, useEffect, useCallback } from "react";
import { Link2, Users, RefreshCw, CheckSquare, Trash2, Bell, Check, X } from "lucide-react";
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
    addedBy: { id: string; displayName: string } | null;
    votes: Array<{ memberId: string }>;
}

interface Band {
    id: string;
    name: string;
    slug: string;
    members: Member[];
    songs: Song[];
}

interface CurrentMember {
    id: string;
    displayName: string;
}

interface JoinRequest {
    id: string;
    displayName: string;
    createdAt: string;
}

interface Props {
    slug: string;
}

export default function BandDashboard({ slug }: Props) {
    const [band, setBand] = useState<Band | null>(null);
    const [currentMember, setCurrentMember] = useState<CurrentMember | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [requests, setRequests] = useState<JoinRequest[]>([]);
    const [showRequests, setShowRequests] = useState(false);

    const fetchBand = useCallback(async () => {
        try {
            const res = await fetch(`/api/bands/${slug}`);
            const data = await res.json();
            if (res.ok) {
                setBand(data.band);
                setCurrentMember(data.currentMember);
            }
        } finally {
            setLoading(false);
        }
    }, [slug]);

    const fetchRequests = useCallback(async () => {
        const res = await fetch(`/api/bands/${slug}/requests`);
        if (res.ok) {
            const data = await res.json();
            setRequests(data.requests ?? []);
        }
    }, [slug]);

    useEffect(() => {
        fetchBand();
    }, [fetchBand]);

    useEffect(() => {
        if (currentMember) fetchRequests();
    }, [currentMember, fetchRequests]);

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
            await fetch(`/api/bands/${slug}/songs/${id}`, { method: "DELETE" });
        }
        exitSelectMode();
        fetchBand();
    }

    async function resolveRequest(requestId: string, action: "approve" | "reject") {
        await fetch(`/api/bands/${slug}/requests/${requestId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
        });
        fetchRequests();
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

    if (!band || !currentMember) {
        return <p className="text-red-400 text-center py-10">Band not found.</p>;
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-foreground">{band.name}</h1>
                    <p className="text-muted text-sm mt-0.5">
                        Voting as <span className="text-violet-500">{currentMember.displayName}</span>
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                    {requests.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowRequests((v) => !v)}
                            className="relative"
                        >
                            <Bell className="h-4 w-4" />
                            Requests
                            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-violet-500 text-white text-[10px] flex items-center justify-center font-bold">
                                {requests.length}
                            </span>
                        </Button>
                    )}
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

            {/* Join requests panel */}
            {showRequests && requests.length > 0 && (
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 flex flex-col gap-3">
                    <p className="text-sm font-semibold text-violet-500">Pending join requests</p>
                    {requests.map((r) => (
                        <div key={r.id} className="flex items-center justify-between gap-3">
                            <span className="text-sm text-foreground font-medium">{r.displayName}</span>
                            <div className="flex gap-1.5">
                                <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => resolveRequest(r.id, "approve")}
                                >
                                    <Check className="h-3.5 w-3.5" />
                                    Approve
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => resolveRequest(r.id, "reject")}
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Reject
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Members */}
            <div className="flex items-center gap-2 flex-wrap">
                <Users className="h-4 w-4 text-muted-2 shrink-0" />
                {band.members.map((m) => (
                    <span
                        key={m.id}
                        className={`text-xs px-2 py-0.5 rounded-full ${m.id === currentMember.id
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
                <SongSearch slug={slug} onSongAdded={fetchBand} />
            </div>

            {/* Bulk upload */}
            <BulkUpload slug={slug} onSongsAdded={fetchBand} />

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
                                memberId={currentMember.id}
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

