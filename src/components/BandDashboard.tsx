"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Link2, Users, RefreshCw, CheckSquare, Trash2, Bell, Check, X,
    Music2, ThumbsUp, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SongSearch from "@/components/SongSearch";
import SongCard from "@/components/SongCard";
import { classifyGenre, GENRE_PALETTE } from "@/lib/song-color";
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

function isVoteActivity(type: string): boolean {
    return type !== "SONG_ADDED" && type !== "SONG_REMOVED";
}

function songKey(title: string, artist: string): string {
    return `${title}::${artist}`;
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
    const [activeSongView, setActiveSongView] = useState<"ranked" | "pool" | "activity">("ranked");
    const [showAddSongs, setShowAddSongs] = useState(false);
    const [rankedSearch, setRankedSearch] = useState("");
    const [rankedVoteFilter, setRankedVoteFilter] = useState<"all" | "votedByMe" | "notVotedByMe">("all");
    const [rankedSort, setRankedSort] = useState<"votesDesc" | "votesAsc" | "titleAsc">("votesDesc");
    const [feedItems, setFeedItems] = useState<ActivityItem[]>([]);
    const songRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const pendingScrollId = useRef<string | null>(null);
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
        const isNewPlaylist = !band?.spotifyPlaylistId;
        setExportingSpotify(true);
        try {
            const res = await fetch("/api/spotify/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug }),
            });
            if (!res.ok) throw new Error("Export failed");
            const { url } = await res.json();
            setWasNewPlaylist(isNewPlaylist);
            setSpotifyPlaylistUrl(url);
            setShowSpotifyModal(true);
        } catch {
            alert("Failed to export playlist. Please try again.");
        } finally {
            setExportingSpotify(false);
        }
    }

    function focusSong(songId: string) {
        setActiveSongView("ranked");
        requestAnimationFrame(() => {
            songRefs.current[songId]?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    }

    const sortedSongs = band
        ? [...band.songs].sort((a, b) => b.votes.length - a.votes.length)
        : [];
    const favoriteSongs = sortedSongs.filter((s) => s.votes.length > 0);
    const poolSongs = band ? band.songs.filter((s) => s.votes.length === 0) : [];
    const currentMemberId = currentMember?.id;

    const totalVotes = sortedSongs.reduce((sum, s) => sum + s.votes.length, 0);
    const topVoteCount = sortedSongs[0]?.votes.length ?? 0;
    const topTiedSongs = topVoteCount > 0 ? sortedSongs.filter(s => s.votes.length === topVoteCount) : [];
    const firstPlaceCount = topTiedSongs.length;
    const closeRaceSongs = topVoteCount > 0
        ? sortedSongs.filter((s) => topVoteCount - s.votes.length <= 1 && s.votes.length > 0)
        : [];
    const closeRaceCount = closeRaceSongs.length;
    const hasCloseRaceCTA = closeRaceSongs.length >= 3;
    const raceLeader = sortedSongs[0] ?? null;
    const raceChallenger = sortedSongs[1] ?? null;
    const challengerGap = raceLeader && raceChallenger
        ? raceLeader.votes.length - raceChallenger.votes.length
        : null;

    const voteEvents = feedItems.filter((item) => isVoteActivity(item.type));
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentVoteEvents = voteEvents.filter((item) => new Date(item.createdAt).getTime() >= oneDayAgo);
    const lastVoteAt = voteEvents.reduce<string | null>((latest, item) => {
        if (!latest) return item.createdAt;
        return new Date(item.createdAt).getTime() > new Date(latest).getTime() ? item.createdAt : latest;
    }, null);
    const momentumBySong = recentVoteEvents.reduce<Map<string, number>>((acc, item) => {
        const key = songKey(item.songTitle, item.songArtist);
        acc.set(key, (acc.get(key) ?? 0) + 1);
        return acc;
    }, new Map());
    const topMomentum = Array.from(momentumBySong.entries())
        .map(([key, votes]) => {
            const [title, artist] = key.split("::");
            const song = sortedSongs.find((s) => s.title === title && s.artist === artist);
            return { key, title, artist, votes, songId: song?.id ?? null };
        })
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 3);
    const votesByMemberToday = recentVoteEvents.reduce<Map<string, number>>((acc, item) => {
        acc.set(item.memberName, (acc.get(item.memberName) ?? 0) + 1);
        return acc;
    }, new Map());
    const topVoterToday = Array.from(votesByMemberToday.entries())
        .sort((a, b) => b[1] - a[1])[0] ?? null;
    const isVotingQuiet = !lastVoteAt || (Date.now() - new Date(lastVoteAt).getTime()) > 36 * 60 * 60 * 1000;
    const unvotedRankedByMe = currentMemberId
        ? favoriteSongs.filter((song) => !song.votes.some((v) => v.memberId === currentMemberId))
        : [];

    // Filtered song lists (for the rendered sections — chart data stays unfiltered)
    const rankedQuery = rankedSearch.trim().toLowerCase();
    const filteredFavoritesBase = favoriteSongs;
    const filteredFavorites = filteredFavoritesBase
        .filter((song) => {
            if (!rankedQuery) return true;
            return (`${song.title} ${song.artist}`.toLowerCase().includes(rankedQuery));
        })
        .filter((song) => {
            if (rankedVoteFilter === "all") return true;
            const iVoted = currentMemberId ? song.votes.some((v) => v.memberId === currentMemberId) : false;
            return rankedVoteFilter === "votedByMe" ? iVoted : !iVoted;
        });
    const sortedFilteredFavorites = [...filteredFavorites].sort((a, b) => {
        if (rankedSort === "votesAsc") return a.votes.length - b.votes.length;
        if (rankedSort === "titleAsc") return a.title.localeCompare(b.title);
        return b.votes.length - a.votes.length;
    });
    const showRankNumbers = rankedSort === "votesDesc"
        && rankedVoteFilter === "all"
        && !rankedQuery;
    const filteredPool = poolSongs;

    // Genre bubble data — all songs (pool + favorites give full picture of band taste)
    const genreBuckets = (() => {
        if (!band || band.songs.length === 0) return [];
        const counts = new Map<string, { total: number; voted: number }>();
        for (const song of band.songs) {
            const genre = classifyGenre(song.tags as string[]);
            const prev = counts.get(genre) ?? { total: 0, voted: 0 };
            counts.set(genre, { total: prev.total + 1, voted: prev.voted + (song.votes.length > 0 ? 1 : 0) });
        }
        return Array.from(counts.entries())
            .map(([genre, { total, voted }]) => ({ genre, total, voted, ...GENRE_PALETTE[genre] }))
            .sort((a, b) => b.total - a.total);
    })();
    const showGenres = genreBuckets.length >= 2;

    const voteBuckets = (() => {
        if (!band || sortedSongs.length === 0) return [];
        const THRESHOLD = 6;
        const bucketMap = new Map<number, number>();
        for (const song of band.songs) {
            const v = song.votes.length;
            bucketMap.set(v, (bucketMap.get(v) ?? 0) + 1);
        }
        const maxVote = Math.max(...bucketMap.keys());
        const buckets: { label: string; count: number; isPool: boolean }[] = [];
        for (let v = 0; v <= Math.min(maxVote, THRESHOLD); v++) {
            buckets.push({ label: v === 0 ? "pool" : `${v}`, count: bucketMap.get(v) ?? 0, isPool: v === 0 });
        }
        if (maxVote > THRESHOLD) {
            let overflow = 0;
            for (const [k, c] of bucketMap) if (k > THRESHOLD) overflow += c;
            buckets.push({ label: `${THRESHOLD + 1}+`, count: overflow, isPool: false });
        }
        return buckets;
    })();

    // Songs added per member (for contributor chart — only show if >1 contributor)
    const songsPerMember = band
        ? band.members
            .map(m => ({ name: m.displayName, count: band.songs.filter(s => s.addedBy?.id === m.id).length, isMe: m.id === currentMember?.id }))
            .filter(m => m.count > 0)
            .sort((a, b) => b.count - a.count)
        : [];

    // Votes cast per member (for engagement chart — only show if >1 voter)
    const votesPerMember = band
        ? band.members
            .map(m => ({ name: m.displayName, count: band.songs.reduce((s, song) => s + song.votes.filter(v => v.memberId === m.id).length, 0), isMe: m.id === currentMember?.id }))
            .filter(m => m.count > 0)
            .sort((a, b) => b.count - a.count)
        : [];

    // After a vote re-sorts the list, scroll the voted card into view
    useEffect(() => {
        if (!pendingScrollId.current) return;
        const id = pendingScrollId.current;
        // Double-rAF: first frame commits layout, second frame is after paint
        const raf = requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const el = songRefs.current[id];
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                pendingScrollId.current = null;
            });
        });
        return () => cancelAnimationFrame(raf);
    }, [band]);

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

            {/* Stats carousel */}
            {sortedSongs.length > 0 && (() => {
                const maxVoteBucket = Math.max(...voteBuckets.map(b => b.count), 1);
                const maxContrib = Math.max(...songsPerMember.map(m => m.count), 1);
                const maxVotesCast = Math.max(...votesPerMember.map(m => m.count), 1);
                const maxGenreCount = Math.max(...genreBuckets.map((g) => g.total), 1);
                const showContrib = songsPerMember.length > 1;
                const showEngagement = votesPerMember.length > 1;
                const hasSecondaryCards = showContrib || showEngagement || showGenres;

                const MiniBar = ({ frac, isMe, isPool }: { frac: number; isMe?: boolean; isPool?: boolean }) => (
                    <div
                        className={`h-2 rounded-sm transition-all duration-300 ${isPool ? "bg-border-base" : isMe ? "bg-violet-400" : "bg-violet-500/60"}`}
                        style={{ width: `${Math.max(4, Math.round(frac * 100))}%` }}
                    />
                );

                return (
                    <div className="flex flex-col gap-3">
                        {/* Setlist race hero */}
                        <div className="rounded-xl border border-border-base bg-surface p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div>
                                    <p className="text-xs font-semibold text-muted-2 uppercase tracking-wider">Setlist race</p>
                                    <p className="text-[11px] text-muted mt-0.5">
                                        {lastVoteAt ? `Last vote ${timeAgo(lastVoteAt)}` : "No vote activity yet"}
                                    </p>
                                </div>
                                {topVoterToday && (
                                    <span className="hidden sm:inline-flex text-[10px] px-2 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400">
                                        {topVoterToday[0]} most active today ({topVoterToday[1]})
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="rounded-lg border border-border-base bg-background/60 p-2.5">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-2">Leading now</p>
                                    <p className="text-sm font-semibold text-foreground truncate mt-1">
                                        {raceLeader?.title ?? "No songs yet"}
                                    </p>
                                    {raceLeader && (
                                        <p className="text-xs text-muted mt-0.5">{raceLeader.votes.length} votes</p>
                                    )}
                                </div>
                                <div className="rounded-lg border border-border-base bg-background/60 p-2.5">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-2">Closest challenger</p>
                                    <p className="text-sm font-semibold text-foreground truncate mt-1">
                                        {firstPlaceCount > 1
                                            ? `${firstPlaceCount} songs`
                                            : raceChallenger?.title ?? "Waiting for challengers"}
                                    </p>
                                    {raceChallenger && challengerGap !== null && (
                                        <p className="text-xs text-muted mt-0.5">
                                            {firstPlaceCount > 1
                                                ? `share first place at ${topVoteCount} votes`
                                                : `${challengerGap} behind`}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="hidden sm:flex items-end gap-1.5" style={{ height: "52px" }}>
                                {voteBuckets.map((bucket) => (
                                    <div key={bucket.label} className="flex flex-col items-center gap-1 flex-1 h-full justify-end">
                                        {bucket.count > 0 && (
                                            <span className="text-[10px] text-muted leading-none">{bucket.count}</span>
                                        )}
                                        <div
                                            className={`w-full rounded-t-sm transition-all duration-300 ${bucket.isPool ? "bg-border-base" : "bg-violet-500"}`}
                                            style={{ height: bucket.count === 0 ? "2px" : `${Math.max(4, Math.round((bucket.count / maxVoteBucket) * 36))}px` }}
                                        />
                                        <span className="text-[9px] text-muted-2 leading-none">{bucket.label}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="sm:hidden grid grid-cols-2 gap-2 text-xs text-muted mt-1">
                                <div className="rounded-md border border-border-base bg-background/60 px-2 py-1.5">
                                    <span className="text-muted-2">Ranked songs</span>
                                    <p className="text-foreground font-semibold mt-0.5">{favoriteSongs.length}</p>
                                </div>
                                <div className="rounded-md border border-border-base bg-background/60 px-2 py-1.5">
                                    <span className="text-muted-2">Top cluster</span>
                                    <p className="text-foreground font-semibold mt-0.5">{closeRaceCount} songs within 1 vote</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border-base">
                                <div className="flex items-center gap-3 text-xs text-muted">
                                    <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-border-base" />{poolSongs.length} in pool</span>
                                    <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-violet-500" />{favoriteSongs.length} ranked</span>
                                </div>
                                {topTiedSongs.length === 1 && (
                                    <span className="text-xs text-muted truncate max-w-[40%]">Top: <span className="text-foreground font-medium">{topTiedSongs[0].title}</span></span>
                                )}
                            </div>

                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                {hasCloseRaceCTA && (
                                    <>
                                        <span className="text-[10px] text-muted-2 uppercase tracking-wider">Close race</span>
                                        {closeRaceSongs.slice(0, 3).map((song) => (
                                            <button
                                                key={song.id}
                                                onClick={() => focusSong(song.id)}
                                                className="text-[11px] px-2 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors max-w-[160px] truncate"
                                            >
                                                {song.title}
                                            </button>
                                        ))}
                                        {closeRaceSongs.length > 3 && (
                                            <span className="text-[10px] text-muted">+{closeRaceSongs.length - 3} more</span>
                                        )}
                                    </>
                                )}
                                {!hasCloseRaceCTA && topMomentum.length > 0 && (
                                    <>
                                        <span className="text-[10px] text-muted-2 uppercase tracking-wider">Momentum (24h)</span>
                                        {topMomentum.map((item) => (
                                            <button
                                                key={item.key}
                                                onClick={() => item.songId && focusSong(item.songId)}
                                                disabled={!item.songId}
                                                className="text-[11px] px-2 py-1 rounded-full border border-border-base bg-background/70 text-muted hover:text-foreground hover:border-violet-500/30 transition-colors disabled:opacity-60 disabled:cursor-default max-w-[180px] truncate"
                                            >
                                                +{item.votes} {item.title}
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>

                            {isVotingQuiet && (
                                    <div className="mt-2.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 flex items-center justify-between gap-2">
                                        <p className="text-[10px] text-amber-300">
                                        Quiet lately. One vote can reshuffle the ranked setlist.
                                    </p>
                                    {(unvotedRankedByMe[0] || favoriteSongs[0]) && (
                                        <button
                                            onClick={() => focusSong((unvotedRankedByMe[0] ?? favoriteSongs[0]).id)}
                                            className="text-[10px] px-2 py-1 rounded-full border border-amber-400/40 text-amber-200 hover:bg-amber-400/10 transition-colors shrink-0"
                                        >
                                            Vote now
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Secondary insight cards */}
                        {hasSecondaryCards && (
                            <div className="hidden sm:block overflow-hidden -mx-4">
                                <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 scroll-pl-4 pb-1" style={{ scrollbarWidth: "none" }}>

                                    {/* Card 2: Contributor breakdown (only if >1 contributor) */}
                                    {showContrib && (
                                        <div className="hidden sm:block snap-start shrink-0 w-[calc(100%-3rem)] rounded-xl border border-border-base bg-surface p-4" style={{ minHeight: 136 }}>
                                            <p className="text-xs font-semibold text-muted-2 uppercase tracking-wider mb-3">Songs added</p>
                                            <div className="flex flex-col gap-2">
                                                {songsPerMember.map(m => (
                                                    <div key={m.name} className="flex items-center gap-2">
                                                        <span className={`text-xs w-16 shrink-0 truncate ${m.isMe ? "text-foreground font-medium" : "text-muted"}`}>{m.name}</span>
                                                        <div className="flex-1 flex items-center gap-1.5">
                                                            <MiniBar frac={m.count / maxContrib} isMe={m.isMe} />
                                                            <span className="text-[10px] text-muted shrink-0">{m.count}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Card 3: Voter engagement (only if >1 voter) */}
                                    {showEngagement && (
                                        <div className="snap-start shrink-0 w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] rounded-xl border border-border-base bg-surface p-4" style={{ minHeight: 136 }}>
                                            <p className="text-xs font-semibold text-muted-2 uppercase tracking-wider mb-3">Votes cast</p>
                                            <div className="flex flex-col gap-2">
                                                {votesPerMember.map(m => (
                                                    <div key={m.name} className="flex items-center gap-2">
                                                        <span className={`text-xs w-16 shrink-0 truncate ${m.isMe ? "text-foreground font-medium" : "text-muted"}`}>{m.name}</span>
                                                        <div className="flex-1 flex items-center gap-1.5">
                                                            <MiniBar frac={m.count / maxVotesCast} isMe={m.isMe} />
                                                            <span className="text-[10px] text-muted shrink-0">{m.count}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Card 4: Genre mix (readable bars) */}
                                    {showGenres && (
                                        <div className="snap-start shrink-0 w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] rounded-xl border border-border-base bg-surface p-4" style={{ minHeight: 136 }}>
                                            <p className="text-xs font-semibold text-muted-2 uppercase tracking-wider mb-3">Genre mix</p>
                                            <div className="flex flex-col gap-2">
                                                {genreBuckets.slice(0, 4).map((g) => (
                                                    <div key={g.genre} className="flex items-center gap-2">
                                                        <span className="text-xs text-muted w-20 shrink-0 truncate">{g.label}</span>
                                                        <div className="flex-1 h-2 rounded-sm bg-surface-2 overflow-hidden">
                                                            <div
                                                                className="h-full rounded-sm"
                                                                style={{
                                                                    width: `${Math.max(8, Math.round((g.total / maxGenreCount) * 100))}%`,
                                                                    backgroundColor: g.border,
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] text-muted shrink-0">{g.total}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="shrink-0 w-4" />
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Add songs — collapsible */}
            <div className="rounded-xl border border-border-base bg-surface overflow-hidden">
                <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors"
                    onClick={() => setShowAddSongs(v => !v)}
                >
                    <span className="text-sm font-semibold text-muted">Add a song to the pool</span>
                    <span className="text-xs text-muted-2">{showAddSongs ? "▲" : "▼"}</span>
                </button>
                {showAddSongs && (
                    <div className="px-4 pb-4 flex flex-col gap-3 border-t border-border-base pt-3">
                        <SongSearch slug={slug} onSongAdded={fetchBand} />
                        <BulkUpload slug={slug} onSongsAdded={fetchBand} />
                    </div>
                )}
            </div>

            {/* Song sections */}
            <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-border-base bg-surface-2/40 p-1 flex items-center gap-1">
                    <button
                        onClick={() => setActiveSongView("ranked")}
                        className={`flex-1 h-8 rounded-lg text-xs font-medium transition-colors ${activeSongView === "ranked" ? "bg-violet-600 text-white" : "text-muted hover:text-foreground"}`}
                    >
                        Ranked ({favoriteSongs.length})
                    </button>
                    <button
                        onClick={() => setActiveSongView("pool")}
                        className={`flex-1 h-8 rounded-lg text-xs font-medium transition-colors ${activeSongView === "pool" ? "bg-violet-600 text-white" : "text-muted hover:text-foreground"}`}
                    >
                        Pool ({poolSongs.length})
                    </button>
                    <button
                        onClick={() => { setActiveSongView("activity"); exitSelectMode(); }}
                        className={`flex-1 h-8 rounded-lg text-xs font-medium transition-colors ${activeSongView === "activity" ? "bg-violet-600 text-white" : "text-muted hover:text-foreground"}`}
                    >
                        Activity ({feedItems.length})
                    </button>
                </div>

                {/* Toolbar: count + actions */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-foreground">
                            {activeSongView === "ranked" && `${favoriteSongs.length} ranked song${favoriteSongs.length !== 1 ? "s" : ""}`}
                            {activeSongView === "pool" && `${poolSongs.length} pool song${poolSongs.length !== 1 ? "s" : ""}`}
                            {activeSongView === "activity" && `${feedItems.length} activity item${feedItems.length !== 1 ? "s" : ""}`}
                        </h2>
                        <div className="flex gap-1.5 items-center shrink-0">
                            {!selectMode && activeSongView !== "activity" && sortedSongs.length > 0 && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={exportToSpotify}
                                        disabled={exportingSpotify}
                                        title="Export as Spotify playlist"
                                        className="text-green-600 hover:text-green-500 hover:bg-green-500/10 px-2"
                                    >
                                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0" aria-hidden="true">
                                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                        </svg>
                                        <span className="text-xs">{exportingSpotify ? (band.spotifyPlaylistId ? "Updating…" : "Exporting…") : (band.spotifyPlaylistId ? "Update" : "Export")}</span>
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectMode(true)} className="px-2">
                                        <CheckSquare className="h-4 w-4" />
                                        <span className="text-xs">Select</span>
                                    </Button>
                                </>
                            )}
                            {selectMode && activeSongView !== "activity" && (
                                <>
                                    <Button variant="destructive" size="sm" onClick={deleteSelected} disabled={selectedIds.size === 0} className="px-2">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="text-xs">Delete {selectedIds.size > 0 ? selectedIds.size : ""}</span>
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={exitSelectMode} className="px-2">
                                        <span className="text-xs">Cancel</span>
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {activeSongView === "ranked" && (
                    <div className="flex flex-col gap-3">
                        {favoriteSongs.length === 0 ? (
                            <p className="text-sm text-muted text-center py-4">No ranked songs yet. Vote in the pool to build the ranked setlist.</p>
                        ) : (
                            <>
                                <div className="rounded-xl border border-border-base bg-surface-2/40 p-2.5 flex flex-col gap-2">
                                    <Input
                                        value={rankedSearch}
                                        onChange={(e) => setRankedSearch(e.target.value)}
                                        placeholder="Search ranked songs"
                                        className="h-8 text-xs bg-surface"
                                        aria-label="Search ranked setlist"
                                    />

                                    <div className="flex items-start gap-2 text-xs">
                                        <span className="w-10 shrink-0 text-[10px] uppercase tracking-wider text-muted-2 pt-1">Scope</span>
                                        <div className="inline-flex flex-wrap rounded-md border border-border-base bg-background/70 p-0.5 gap-0.5">
                                            <button
                                                onClick={() => setRankedVoteFilter("all")}
                                                className={`whitespace-nowrap text-[11px] px-2 py-1 rounded-sm transition-colors ${rankedVoteFilter === "all" ? "bg-surface text-foreground font-semibold shadow-sm" : "text-muted hover:text-foreground"}`}
                                            >
                                                All ranked
                                            </button>
                                            <button
                                                onClick={() => setRankedVoteFilter("votedByMe")}
                                                className={`whitespace-nowrap text-[11px] px-2 py-1 rounded-sm transition-colors ${rankedVoteFilter === "votedByMe" ? "bg-surface text-foreground font-semibold shadow-sm" : "text-muted hover:text-foreground"}`}
                                            >
                                                I voted
                                            </button>
                                            <button
                                                onClick={() => setRankedVoteFilter("notVotedByMe")}
                                                className={`whitespace-nowrap text-[11px] px-2 py-1 rounded-sm transition-colors ${rankedVoteFilter === "notVotedByMe" ? "bg-surface text-foreground font-semibold shadow-sm" : "text-muted hover:text-foreground"}`}
                                            >
                                                Needs my vote
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2 text-xs">
                                        <span className="w-10 shrink-0 text-[10px] uppercase tracking-wider text-muted-2 pt-1">Sort</span>
                                        <div className="inline-flex flex-wrap rounded-md border border-border-base bg-background/70 p-0.5 gap-0.5">
                                            <button
                                                onClick={() => setRankedSort("votesDesc")}
                                                className={`whitespace-nowrap text-[11px] px-2 py-1 rounded-sm transition-colors ${rankedSort === "votesDesc" ? "bg-surface text-foreground font-semibold shadow-sm" : "text-muted hover:text-foreground"}`}
                                            >
                                                Most votes
                                            </button>
                                            <button
                                                onClick={() => setRankedSort("votesAsc")}
                                                className={`whitespace-nowrap text-[11px] px-2 py-1 rounded-sm transition-colors ${rankedSort === "votesAsc" ? "bg-surface text-foreground font-semibold shadow-sm" : "text-muted hover:text-foreground"}`}
                                            >
                                                Fewest votes
                                            </button>
                                            <button
                                                onClick={() => setRankedSort("titleAsc")}
                                                className={`whitespace-nowrap text-[11px] px-2 py-1 rounded-sm transition-colors ${rankedSort === "titleAsc" ? "bg-surface text-foreground font-semibold shadow-sm" : "text-muted hover:text-foreground"}`}
                                            >
                                                Title A-Z
                                            </button>
                                        </div>
                                    </div>

                                    {(rankedSearch || rankedVoteFilter !== "all" || rankedSort !== "votesDesc") && (
                                        <button
                                            onClick={() => {
                                                setRankedSearch("");
                                                setRankedVoteFilter("all");
                                                setRankedSort("votesDesc");
                                            }}
                                            className="self-start text-[10px] px-2 py-1 rounded-md border border-border-base bg-surface text-muted hover:text-foreground hover:border-violet-500/30 transition-colors"
                                        >
                                            Reset filters
                                        </button>
                                    )}
                                </div>

                                {sortedFilteredFavorites.length === 0 ? (
                                    <p className="text-sm text-muted text-center py-4">No ranked songs match your filters.</p>
                                ) : sortedFilteredFavorites.map((song, i) => (
                                    <div key={song.id} ref={(el) => { songRefs.current[song.id] = el; }}>
                                        <SongCard
                                            song={{ ...song, tags: song.tags as string[] }}
                                            rank={showRankNumbers ? i + 1 : undefined}
                                            memberId={currentMember.id}
                                            slug={slug}
                                            onVoteChange={() => { pendingScrollId.current = song.id; fetchBand(); }}
                                            onDelete={fetchBand}
                                            selectMode={selectMode}
                                            isSelected={selectedIds.has(song.id)}
                                            onToggleSelect={() => toggleSelect(song.id)}
                                        />
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}

                {activeSongView === "pool" && (
                    <div>
                        {filteredPool.length === 0 ? (
                            <p className="text-sm text-muted text-center py-4">No pool songs right now.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredPool.map((song) => (
                                    <div key={song.id} ref={(el) => { songRefs.current[song.id] = el; }}>
                                        <SongCard
                                            song={{ ...song, tags: song.tags as string[] }}
                                            memberId={currentMember.id}
                                            slug={slug}
                                            onVoteChange={() => { pendingScrollId.current = song.id; fetchBand(); }}
                                            onDelete={fetchBand}
                                            selectMode={selectMode}
                                            isSelected={selectedIds.has(song.id)}
                                            onToggleSelect={() => toggleSelect(song.id)}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeSongView === "activity" && (
                    <div>
                        {feedItems.length === 0 ? (
                            <p className="text-sm text-muted text-center py-4">No recent activity yet.</p>
                        ) : (
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
        </div>
    );
}

