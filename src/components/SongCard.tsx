"use client";

import { useState } from "react";
import { ThumbsUp, Trash2, Clock, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSongColorTheme, formatDuration } from "@/lib/song-color";

interface Song {
    id: string;
    title: string;
    artist: string;
    lastfmUrl: string | null;
    spotifyUri?: string | null;
    imageUrl: string | null;
    tags: string[];
    duration: number | null;
    addedBy: { id: string; displayName: string } | null;
    votes: Array<{ memberId: string; member?: { displayName: string } | null }>;
}

interface Props {
    song: Song;
    rank?: number;
    memberId: string;
    slug: string;
    onVoteChange: () => void;
    onDelete: () => void;
    selectMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: () => void;
}

export default function SongCard({
    song,
    rank,
    memberId,
    slug,
    onVoteChange,
    onDelete,
    selectMode = false,
    isSelected = false,
    onToggleSelect,
}: Props) {
    const [loadingVote, setLoadingVote] = useState(false);
    const [loadingDelete, setLoadingDelete] = useState(false);

    const hasVoted = song.votes.some((v) => v.memberId === memberId);
    const voteCount = song.votes.length;
    const isOwner = song.addedBy?.id === memberId;
    const theme = getSongColorTheme(song.tags as string[]);
    const spotifyTrackId = song.spotifyUri?.startsWith("spotify:track:")
        ? song.spotifyUri.replace("spotify:track:", "")
        : null;
    const spotifyUrl = spotifyTrackId
        ? `https://open.spotify.com/track/${spotifyTrackId}`
        : `https://open.spotify.com/search/${encodeURIComponent(`${song.title} ${song.artist}`)}`;

    async function toggleVote() {
        setLoadingVote(true);
        try {
            const method = hasVoted ? "DELETE" : "POST";
            await fetch(`/api/songs/${song.id}/vote`, { method });
            onVoteChange();
        } finally {
            setLoadingVote(false);
        }
    }

    async function deleteSong() {
        setLoadingDelete(true);
        try {
            await fetch(`/api/bands/${slug}/songs/${song.id}`, { method: "DELETE" });
            onDelete();
        } finally {
            setLoadingDelete(false);
        }
    }

    return (
        <div
            className={cn(
                "relative rounded-xl border p-4 flex gap-4 transition-all duration-300 shadow-lg",
                rank !== undefined ? "items-center" : "items-start",
                selectMode
                    ? [
                        isOwner ? "cursor-pointer" : "opacity-60",
                        isSelected
                            ? "ring-2 ring-violet-500 border-violet-400 bg-violet-50 dark:bg-violet-950/40"
                            : "bg-surface border-border-base hover:bg-surface-2",
                    ]
                    : [theme.bg, theme.border, theme.glow, "hover:scale-[1.01]"]
            )}
            onClick={selectMode && isOwner ? onToggleSelect : undefined}
        >
            {/* Rank / Select checkbox */}
            {selectMode ? (
                <div className="w-8 flex items-center justify-center shrink-0">
                    {isOwner && (
                        <div className={cn(
                            "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                            isSelected ? "border-violet-500 bg-violet-500" : "border-border-2"
                        )}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                    )}
                </div>
            ) : rank !== undefined ? (
                <div className="text-2xl font-black text-black/10 dark:text-white/20 w-8 text-center shrink-0">
                    {rank}
                </div>
            ) : (
                <div className="w-2 shrink-0" />
            )}

            {/* Album art */}
            {song.imageUrl ? (
                <img
                    src={song.imageUrl}
                    alt={`${song.title} artwork`}
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
            ) : (
                <div
                    className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center text-xl shrink-0",
                        theme.badge
                    )}
                >
                    🎵
                </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                    <p className={cn("text-foreground font-semibold leading-tight", rank !== undefined && "truncate")}>
                        {song.title}
                    </p>
                </div>
                <p className={cn("text-sm", rank !== undefined && "truncate", theme.text)}>{song.artist}</p>
                {!selectMode && (
                    <a
                        href={spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted mt-0.5 hover:text-green-500 transition-colors"
                        title="Open on Spotify"
                    >
                        Open in Spotify
                        <ExternalLink className="h-3 w-3" />
                    </a>
                )}

                <div className="flex flex-wrap gap-1.5 mt-2">
                    {(song.tags as string[]).slice(0, 4).map((tag) => (
                        <span
                            key={tag}
                            className={cn(
                                "text-xs px-1.5 py-0.5 rounded-full font-medium",
                                theme.badge
                            )}
                        >
                            {tag}
                        </span>
                    ))}
                    {song.duration && (
                        <span className="text-xs text-muted-2 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(song.duration)}
                        </span>
                    )}
                </div>

                <p className="text-xs text-muted-2 mt-1">
                    Added by {song.addedBy?.displayName ?? "Unknown"}
                </p>
            </div>

            {/* Vote + Delete column */}
            {!selectMode && (
                <div className="flex flex-col items-center gap-1 shrink-0">
                    {isOwner && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-600 hover:text-red-400"
                            onClick={deleteSong}
                            disabled={loadingDelete}
                            title="Remove song"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <Button
                        variant={hasVoted ? "success" : "outline"}
                        size="icon"
                        onClick={toggleVote}
                        disabled={loadingVote}
                        className={cn(
                            "h-10 w-10 rounded-full transition-all",
                            hasVoted && "scale-110"
                        )}
                        title={hasVoted ? "Remove vote" : "Vote for this song"}
                    >
                        <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-bold text-foreground">{voteCount}</span>
                    {/* Voter initials */}
                    {song.votes.length > 0 && (
                        <div className="flex flex-col items-center gap-0.5 mt-0.5">
                            {song.votes.map((v) => {
                                const name = v.member?.displayName ?? "?";
                                const initials = name
                                    .split(" ")
                                    .map((w) => w[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase();
                                return (
                                    <span
                                        key={v.memberId}
                                        title={name}
                                        className={cn(
                                            "h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white",
                                            v.memberId === memberId
                                                ? "bg-violet-500"
                                                : "bg-slate-400 dark:bg-slate-600"
                                        )}
                                    >
                                        {initials}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
