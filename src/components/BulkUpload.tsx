"use client";

import { useState } from "react";
import {
    Upload,
    ChevronDown,
    ChevronUp,
    Loader2,
    CheckCircle2,
    XCircle,
    Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
    slug: string;
    onSongsAdded: () => void;
}

interface ParsedLine {
    raw: string;
    title: string;
    artist: string;
}

type ItemStatus = "pending" | "adding" | "added" | "duplicate" | "error";

interface BulkItem extends ParsedLine {
    selected: boolean;
    status: ItemStatus;
    error?: string;
}

/** Parse a block of text into title/artist pairs */
function parseText(text: string): ParsedLine[] {
    return text
        .split("\n")
        .map((line) => line.trim())
        // Strip leading numbers/bullets: "1.", "1)", "•", "-"
        .map((line) => line.replace(/^[\d]+[.)]\s*|^[•\-]\s*/, "").trim())
        .filter((line) => line.length > 1)
        .map((raw) => {
            // Tab-separated (copied from spreadsheet — Song\tArtist)
            if (raw.includes("\t")) {
                const parts = raw.split("\t").map((p) => p.trim()).filter(Boolean);
                if (parts.length >= 2) {
                    return { raw, title: parts[0], artist: parts[1] };
                }
            }
            // Try common separators: " - ", " – ", " — ", " | ", " / "
            const sep = raw.match(/\s[-–—|\/]\s/);
            if (sep) {
                const idx = raw.indexOf(sep[0]);
                const left = raw.slice(0, idx).trim();
                const right = raw.slice(idx + sep[0].length).trim();
                // Try to detect which side is artist vs title heuristically:
                // shorter side is usually artist, but default to left=artist right=title
                // if one side contains "by " treat that as "X by ARTIST"
                if (/\s+by\s+/i.test(raw)) {
                    const byMatch = raw.match(/^(.+?)\s+by\s+(.+)$/i);
                    if (byMatch) return { raw, title: byMatch[1].trim(), artist: byMatch[2].trim() };
                }
                return { raw, title: right, artist: left };
            }
            // Check for "X by Y" pattern
            const byMatch = raw.match(/^(.+?)\s+by\s+(.+)$/i);
            if (byMatch) {
                return { raw, title: byMatch[1].trim(), artist: byMatch[2].trim() };
            }
            // "Title (Original Artist)" — parens at end = artist
            const parenMatch = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
            if (parenMatch) {
                return { raw, title: parenMatch[1].trim(), artist: parenMatch[2].trim() };
            }
            // No separator — treat as title only, search will figure it out
            return { raw, title: raw, artist: "" };
        });
}

export default function BulkUpload({ slug, onSongsAdded }: Props) {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState("");
    const [items, setItems] = useState<BulkItem[] | null>(null);
    const [adding, setAdding] = useState(false);

    function handleParse() {
        const parsed = parseText(text);
        setItems(
            parsed.map((p) => ({ ...p, selected: true, status: "pending" }))
        );
    }

    function toggleItem(i: number) {
        setItems((prev) =>
            prev
                ? prev.map((item, idx) =>
                    idx === i ? { ...item, selected: !item.selected } : item
                )
                : prev
        );
    }

    async function addSong(item: ParsedLine): Promise<ItemStatus> {
        const res = await fetch(`/api/bands/${slug}/songs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: item.title,
                artist: item.artist || item.title,
            }),
        });
        if (res.status === 409) return "duplicate";
        if (!res.ok) return "error";
        return "added";
    }

    async function handleAdd() {
        if (!items) return;
        setAdding(true);

        const selected = items.filter((i) => i.selected && i.status === "pending");

        for (const item of selected) {
            setItems((prev) =>
                prev
                    ? prev.map((x) =>
                        x.raw === item.raw ? { ...x, status: "adding" } : x
                    )
                    : prev
            );

            const status = await addSong(item);

            setItems((prev) =>
                prev
                    ? prev.map((x) =>
                        x.raw === item.raw ? { ...x, status } : x
                    )
                    : prev
            );
        }

        setAdding(false);
        onSongsAdded();
    }

    const pendingCount = items?.filter((i) => i.selected && i.status === "pending").length ?? 0;
    const addedCount = items?.filter((i) => i.status === "added").length ?? 0;

    return (
        <div className="rounded-xl border border-border-base bg-surface overflow-hidden">
            {/* Toggle header */}
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors text-left"
            >
                <div className="flex items-center gap-2 text-sm font-semibold text-muted">
                    <Upload className="h-4 w-4" />
                    Bulk upload
                    <span className="text-xs font-normal text-muted-2">
                        — paste a list of songs
                    </span>
                </div>
                {open ? (
                    <ChevronUp className="h-4 w-4 text-muted-2" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-muted-2" />
                )}
            </button>

            {open && (
                <div className="px-4 pb-4 border-t border-border-base flex flex-col gap-3 pt-3">
                    <p className="text-xs text-muted-2">
                        Paste any list — including copied spreadsheet columns. Supported formats per line:
                        <span className="font-mono ml-1">Song[tab]Artist</span> (copied from a spreadsheet),{" "}
                        <span className="font-mono">Artist - Title</span>,{" "}
                        <span className="font-mono">Title by Artist</span>, or just{" "}
                        <span className="font-mono">Title</span>.
                    </p>
                    <textarea
                        className="w-full rounded-lg border border-border-base bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                        rows={6}
                        placeholder={`Eagles - Hotel California\nBohemian Rhapsody by Queen\nStairway to Heaven\n1. Jolene - Dolly Parton`}
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value);
                            setItems(null); // reset parsed list on edit
                        }}
                    />

                    {!items && (
                        <Button
                            onClick={handleParse}
                            disabled={text.trim().length < 3}
                            variant="secondary"
                            size="sm"
                        >
                            Parse songs
                        </Button>
                    )}

                    {items && (
                        <>
                            <ul className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                                {items.map((item, i) => (
                                    <li
                                        key={i}
                                        className={cn(
                                            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                                            item.status === "added" && "opacity-60",
                                            item.status === "error" && "bg-red-50 dark:bg-red-950/30"
                                        )}
                                    >
                                        {/* Checkbox / status icon */}
                                        {item.status === "adding" ? (
                                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-500" />
                                        ) : item.status === "added" ? (
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                                        ) : item.status === "duplicate" ? (
                                            <Minus className="h-4 w-4 shrink-0 text-amber-500" />
                                        ) : item.status === "error" ? (
                                            <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                                        ) : (
                                            <input
                                                type="checkbox"
                                                checked={item.selected}
                                                onChange={() => toggleItem(i)}
                                                className="h-4 w-4 shrink-0 accent-violet-600"
                                            />
                                        )}

                                        {/* Song info */}
                                        <div className="flex-1 min-w-0">
                                            <span className="text-foreground font-medium truncate">
                                                {item.title}
                                            </span>
                                            {item.artist && (
                                                <span className="text-muted-2 ml-1">— {item.artist}</span>
                                            )}
                                        </div>

                                        {item.status === "duplicate" && (
                                            <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">already in pool</span>
                                        )}
                                        {item.status === "error" && (
                                            <span className="text-xs text-red-500 shrink-0">failed</span>
                                        )}
                                    </li>
                                ))}
                            </ul>

                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={handleAdd}
                                    disabled={adding || pendingCount === 0}
                                    size="sm"
                                >
                                    {adding ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Adding…
                                        </>
                                    ) : (
                                        `Add ${pendingCount} song${pendingCount !== 1 ? "s" : ""}`
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setItems(null);
                                        setText("");
                                    }}
                                >
                                    Clear
                                </Button>
                                {addedCount > 0 && (
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                        {addedCount} added
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
