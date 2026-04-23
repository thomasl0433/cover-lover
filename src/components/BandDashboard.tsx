"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Link2, Users, RefreshCw, CheckSquare, Trash2, Bell, Check, X,
    Music2, ThumbsUp, Activity, ListMusic,
} from "lucide-react";
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
    votes: Array<{ memberId: string; member?: { displayName: string } | null }>;
}

interface Band {
    id: string;
    name: string;
    slug: string;
    spotifyPlaylistId: string | null;
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

interface ActivityItem {
    id: string;
    memberName: string;
    type: string;
    songTitle: string;
    songArtist: string;
    createdAt: string;
}

interface Props {
    slug: string;
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
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
    const [showFeed, setShowFeed] = useState(false);
    const [feedItems, setFeedItems] = useState<ActivityItem[]>([]);
    const [exportingSpotify, setExportingSpotify] = useState(false);
    const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState<string | null>(null);
    const [showSpotifyModal, setShowSpotifyModal] = useState(false);
    const [wasNewPlaylist, setWasNewPlaylist] = useState(false);

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

    const fetchFeed = useCallback(async () => {
        const res = await fetch(`/api/bands/${slug}/activity`);
        if (res.ok) {
            const data = await res.json();
            setFeedItems(data.activities ?? []);
        }
    }, [slug]);

    useEffect(() => {
        fetchBand();
    }, [fetchBand]);

    useEffect(() => {
        if (currentMember) {
            fetchRequests();
            fetchFeed();
        }
    }, [currentMember, fetchRequests, fetchFeed]);

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

    async function exportToSpotify() {
        setExportingSpotify(true);
        try {
            const res = await fetch("/api/spotify/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug }),
            });
            if (!res.ok) throw new Error("Export failed");
            const { url } = await res.json();
            setWasNewPlaylist(!band.spotifyPlaylistId);
            setSpotifyPlaylistUrl(url);
            setShowSpotifyModal(true);
        } catch {
            alert("Failed to export playlist. Please try again.");
        } finally {
            setExportingSpotify(false);
        }
    }

    const sortedSongs = band
        ? [...band.songs].sort((a, b) => b.votes.length - a.votes.length)
        : [];

    const totalVotes = sortedSongs.reduce((sum, s) => sum + s.votes.length, 0);
    const topSong = sortedSongs[0] ?? null;

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
            {/* Spotify export modal */}
            {showSpotifyModal && spotifyPlaylistUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowSpotifyModal(false)}
                >
                    <div
                        className="bg-surface border border-border-base rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 flex flex-col gap-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3">
                            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-green-500 shrink-0" aria-hidden="true">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                            <h2 className="text-lg font-bold text-foreground">
                                {wasNewPlaylist ? "Playlist created!" : "Playlist updated!"}
                            </h2>
                        </div>
                        {wasNewPlaylist ? (
                            <p className="text-sm text-muted leading-relaxed">
                                The playlist is live on the Cover Lover Spotify account. Open it and tap{" "}
                                <strong className="text-foreground">Save to your library</strong> so it appears in your own Spotify — then it’ll stay in sync whenever anyone hits “Update playlist”.
                            </p>
                        ) : (
                            <>
                                <p className="text-sm text-muted leading-relaxed">
                                    The playlist tracks have been replaced with the current setlist.
                                </p>
                                <p className="text-sm text-muted leading-relaxed">
                                    <strong className="text-foreground">Haven’t saved it yet?</strong> Open the playlist and tap{" "}
                                    <strong className="text-foreground">Save to your library</strong> to keep it in your own Spotify.
                                </p>
                            </>
                        )}
                        <a
                            href={spotifyPlaylistUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-500 hover:bg-green-400 text-black font-semibold text-sm px-4 py-2.5 transition-colors"
                        >
                            Open playlist in Spotify ↗
                        </a>
                        <button
                            onClick={() => setShowSpotifyModal(false)}
                            className="text-xs text-muted hover:text-foreground transition-colors text-center"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* Header — mobile-safe: name wraps before buttons */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-3xl font-black text-foreground break-words">{band.name}</h1>
                    <p className="text-muted text-sm mt-0.5">
                        Voting as <span className="text-violet-500">{currentMember.displayName}</span>
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap items-center shrink-0">
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
                        {copied ? "Copied!" : "Invite"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={fetchBand}>
                        <RefreshCw className="h-4 w-4" />
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

            {/* Data summary strip */}
            {sortedSongs.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border-base bg-surface p-3 flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-muted-2">
                            <Music2 className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium uppercase tracking-wider">Songs</span>
                        </div>
                        <p className="text-2xl font-black text-foreground">{sortedSongs.length}</p>
                    </div>
                    <div className="rounded-xl border border-border-base bg-surface p-3 flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-muted-2">
                            <ThumbsUp className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium uppercase tracking-wider">Votes</span>
                        </div>
                        <p className="text-2xl font-black text-foreground">{totalVotes}</p>
                    </div>
                    <div className="rounded-xl border border-border-base bg-surface p-3 flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-muted-2">
                            <ListMusic className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium uppercase tracking-wider">Top</span>
                        </div>
                        <p className="text-sm font-bold text-foreground truncate" title={topSong?.title}>
                            {topSong ? topSong.title : "—"}
                        </p>
                    </div>
                </div>
            )}

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
                    <div className="flex gap-2 items-center">
                        {sortedSongs.length > 0 && !selectMode && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={exportToSpotify}
                                    disabled={exportingSpotify}
                                    title="Export as Spotify playlist"
                                    className="text-green-600 hover:text-green-500 hover:bg-green-500/10"
                                >
                                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                    </svg>
                                    {exportingSpotify
                                        ? (band.spotifyPlaylistId ? "Updating…" : "Exporting…")
                                        : (band.spotifyPlaylistId ? "Update playlist" : "Export")
                                    }
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setSelectMode(true)}>
                                    <CheckSquare className="h-4 w-4" />
                                    Select
                                </Button>
                            </>
                        )}
                        {selectMode && (
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
                        )}
                    </div>
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

            {/* Activity feed */}
            {feedItems.length > 0 && (
                <div>
                    <button
                        className="flex items-center gap-1.5 text-sm font-semibold text-muted-2 uppercase tracking-wider mb-3 hover:text-foreground transition-colors"
                        onClick={() => setShowFeed((v) => !v)}
                    >
                        <Activity className="h-4 w-4" />
                        Activity
                        <span className="text-[10px] normal-case tracking-normal font-normal text-muted-2 ml-1">
                            {showFeed ? "▲ hide" : "▼ show"}
                        </span>
                    </button>
                    {showFeed && (
                        <div className="rounded-xl border border-border-base bg-surface divide-y divide-border-base">
                            {feedItems.map((item) => (
                                <div key={item.id} className="px-4 py-2.5 flex items-start gap-2">
                                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
                                        {item.memberName[0]?.toUpperCase() ?? "?"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-foreground">
                                            <span className="font-semibold">{item.memberName}</span>
                                            {" "}
                                            {item.type === "SONG_ADDED" ? "added" : item.type === "SONG_REMOVED" ? "removed" : "voted for"}
                                            {" "}
                                            <span className="font-medium text-violet-500">
                                                {item.songTitle}
                                            </span>
                                            {" "}
                                            <span className="text-muted-2">by {item.songArtist}</span>
                                        </p>
                                    </div>
                                    <span className="text-xs text-muted-2 shrink-0 mt-0.5">
                                        {timeAgo(item.createdAt)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

