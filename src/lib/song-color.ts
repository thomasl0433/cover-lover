/** Maps Last.fm tags to Tailwind color tokens for song cards */

export interface SongColorTheme {
    bg: string;
    border: string;
    badge: string;
    text: string;
    glow: string;
}

type Energy = "high" | "med" | "low";
type ThemeVariants = Record<Energy, SongColorTheme>;

function inferEnergy(lower: string[]): Energy {
    const highKeywords = [
        "punk", "metal", "hardcore", "thrash", "hard rock", "grunge",
        "dance", "edm", "techno", "house", "club", "trance",
        "trap", "rap rock", "funk rock", "acid rock", "nu metal",
        "psychedelic rock", "uptempo", "energetic",
    ];
    const lowKeywords = [
        "ballad", "acoustic", "slow", "chill", "mellow",
        "ambient", "dreamy", "soft", "sad", "a cappella",
    ];
    const hi = highKeywords.filter((kw) => lower.some((t) => t.includes(kw))).length;
    const lo = lowKeywords.filter((kw) => lower.some((t) => t.includes(kw))).length;
    if (hi > lo && hi >= 1) return "high";
    if (lo > hi && lo >= 1) return "low";
    return "med";
}

const THEMES: Record<string, ThemeVariants> = {
    metal: {
        high: { bg: "bg-red-200 dark:bg-red-900/60", border: "border-red-500 dark:border-red-600/60", badge: "bg-red-700 text-white", text: "text-red-800 dark:text-red-200", glow: "shadow-red-300 dark:shadow-red-900/50" },
        med:  { bg: "bg-red-100 dark:bg-red-950/60", border: "border-red-300 dark:border-red-700/60", badge: "bg-red-600 text-white dark:bg-red-700 dark:text-red-100", text: "text-red-700 dark:text-red-200", glow: "shadow-red-200 dark:shadow-red-900/40" },
        low:  { bg: "bg-red-50 dark:bg-red-950/40",  border: "border-red-200 dark:border-red-800/40", badge: "bg-red-500 text-white", text: "text-red-600 dark:text-red-300", glow: "shadow-red-100 dark:shadow-red-900/30" },
    },
    rock: {
        high: { bg: "bg-orange-200 dark:bg-orange-900/60", border: "border-orange-500 dark:border-orange-600/60", badge: "bg-orange-700 text-white", text: "text-orange-800 dark:text-orange-200", glow: "shadow-orange-300 dark:shadow-orange-900/50" },
        med:  { bg: "bg-orange-100 dark:bg-orange-950/60", border: "border-orange-300 dark:border-orange-700/60", badge: "bg-orange-600 text-white dark:bg-orange-700 dark:text-orange-100", text: "text-orange-700 dark:text-orange-200", glow: "shadow-orange-200 dark:shadow-orange-900/40" },
        low:  { bg: "bg-amber-100 dark:bg-amber-950/40", border: "border-amber-300 dark:border-amber-700/40", badge: "bg-amber-600 text-white", text: "text-amber-700 dark:text-amber-300", glow: "shadow-amber-100 dark:shadow-amber-900/30" },
    },
    folk: {
        high: { bg: "bg-lime-100 dark:bg-lime-950/60", border: "border-lime-400 dark:border-lime-600/60", badge: "bg-lime-600 text-white", text: "text-lime-700 dark:text-lime-200", glow: "shadow-lime-200 dark:shadow-lime-900/40" },
        med:  { bg: "bg-emerald-100 dark:bg-emerald-950/60", border: "border-emerald-300 dark:border-emerald-700/60", badge: "bg-emerald-600 text-white dark:bg-emerald-700 dark:text-emerald-100", text: "text-emerald-700 dark:text-emerald-200", glow: "shadow-emerald-200 dark:shadow-emerald-900/40" },
        low:  { bg: "bg-teal-100 dark:bg-teal-950/40", border: "border-teal-200 dark:border-teal-700/40", badge: "bg-teal-500 text-white", text: "text-teal-700 dark:text-teal-300", glow: "shadow-teal-100 dark:shadow-teal-900/30" },
    },
    pop: {
        high: { bg: "bg-pink-200 dark:bg-pink-900/60", border: "border-pink-400 dark:border-pink-600/60", badge: "bg-pink-700 text-white", text: "text-pink-800 dark:text-pink-200", glow: "shadow-pink-300 dark:shadow-pink-900/50" },
        med:  { bg: "bg-pink-100 dark:bg-pink-950/60", border: "border-pink-300 dark:border-pink-600/60", badge: "bg-pink-600 text-white dark:text-pink-100", text: "text-pink-700 dark:text-pink-200", glow: "shadow-pink-200 dark:shadow-pink-900/40" },
        low:  { bg: "bg-rose-100 dark:bg-rose-950/40", border: "border-rose-200 dark:border-rose-700/40", badge: "bg-rose-500 text-white", text: "text-rose-600 dark:text-rose-300", glow: "shadow-rose-100 dark:shadow-rose-900/30" },
    },
    electronic: {
        high: { bg: "bg-fuchsia-100 dark:bg-fuchsia-950/60", border: "border-fuchsia-400 dark:border-fuchsia-600/60", badge: "bg-fuchsia-600 text-white", text: "text-fuchsia-700 dark:text-fuchsia-200", glow: "shadow-fuchsia-200 dark:shadow-fuchsia-900/40" },
        med:  { bg: "bg-violet-100 dark:bg-violet-950/60", border: "border-violet-300 dark:border-violet-600/60", badge: "bg-violet-600 text-white dark:text-violet-100", text: "text-violet-700 dark:text-violet-200", glow: "shadow-violet-200 dark:shadow-violet-900/40" },
        low:  { bg: "bg-indigo-100 dark:bg-indigo-950/40", border: "border-indigo-300 dark:border-indigo-700/40", badge: "bg-indigo-500 text-white", text: "text-indigo-700 dark:text-indigo-300", glow: "shadow-indigo-100 dark:shadow-indigo-900/30" },
    },
    hiphop: {
        high: { bg: "bg-purple-200 dark:bg-purple-900/60", border: "border-purple-500 dark:border-purple-600/60", badge: "bg-purple-700 text-white", text: "text-purple-800 dark:text-purple-200", glow: "shadow-purple-300 dark:shadow-purple-900/50" },
        med:  { bg: "bg-purple-100 dark:bg-purple-950/60", border: "border-purple-300 dark:border-purple-600/60", badge: "bg-purple-600 text-white dark:text-purple-100", text: "text-purple-700 dark:text-purple-200", glow: "shadow-purple-200 dark:shadow-purple-900/40" },
        low:  { bg: "bg-purple-50 dark:bg-purple-950/40", border: "border-purple-200 dark:border-purple-800/40", badge: "bg-purple-500 text-white", text: "text-purple-600 dark:text-purple-300", glow: "shadow-purple-100 dark:shadow-purple-900/30" },
    },
    blues: {
        high: { bg: "bg-sky-100 dark:bg-sky-950/60", border: "border-sky-400 dark:border-sky-600/60", badge: "bg-sky-600 text-white", text: "text-sky-700 dark:text-sky-200", glow: "shadow-sky-200 dark:shadow-sky-900/40" },
        med:  { bg: "bg-blue-100 dark:bg-blue-950/60", border: "border-blue-300 dark:border-blue-600/60", badge: "bg-blue-600 text-white dark:text-blue-100", text: "text-blue-700 dark:text-blue-200", glow: "shadow-blue-200 dark:shadow-blue-900/40" },
        low:  { bg: "bg-slate-100 dark:bg-slate-800/60", border: "border-slate-300 dark:border-slate-600/60", badge: "bg-slate-500 text-white", text: "text-slate-600 dark:text-slate-300", glow: "shadow-slate-100 dark:shadow-slate-900/30" },
    },
    country: {
        high: { bg: "bg-amber-200 dark:bg-amber-900/60", border: "border-amber-400 dark:border-amber-600/60", badge: "bg-amber-700 text-white", text: "text-amber-800 dark:text-amber-200", glow: "shadow-amber-200 dark:shadow-amber-900/40" },
        med:  { bg: "bg-amber-100 dark:bg-amber-950/60", border: "border-amber-300 dark:border-amber-600/60", badge: "bg-amber-600 text-white dark:text-amber-100", text: "text-amber-700 dark:text-amber-200", glow: "shadow-amber-200 dark:shadow-amber-900/40" },
        low:  { bg: "bg-yellow-50 dark:bg-yellow-950/40", border: "border-yellow-200 dark:border-yellow-800/40", badge: "bg-yellow-500 text-white", text: "text-yellow-700 dark:text-yellow-300", glow: "shadow-yellow-100 dark:shadow-yellow-900/30" },
    },
    classical: {
        high: { bg: "bg-cyan-100 dark:bg-cyan-950/60", border: "border-cyan-400 dark:border-cyan-600/60", badge: "bg-cyan-600 text-white", text: "text-cyan-700 dark:text-cyan-200", glow: "shadow-cyan-200 dark:shadow-cyan-900/40" },
        med:  { bg: "bg-cyan-100 dark:bg-cyan-950/60", border: "border-cyan-300 dark:border-cyan-600/60", badge: "bg-cyan-600 text-white dark:text-cyan-100", text: "text-cyan-700 dark:text-cyan-200", glow: "shadow-cyan-200 dark:shadow-cyan-900/40" },
        low:  { bg: "bg-cyan-50 dark:bg-cyan-950/40", border: "border-cyan-200 dark:border-cyan-800/40", badge: "bg-cyan-500 text-white", text: "text-cyan-600 dark:text-cyan-300", glow: "shadow-cyan-100 dark:shadow-cyan-900/30" },
    },
};

// Order matters: more specific genres must come before the broad ones they'd otherwise fall into.
// e.g. "indie folk" must come before "rock" so folk-rock songs don't get caught as orange rock.
// e.g. "indie pop" must come before "rock" so pop-rock songs skew pink not orange.
const COLOR_RULES: Array<{ keywords: string[]; theme: string }> = [
    { keywords: ["metal", "heavy metal", "thrash", "death metal", "hardcore", "nu metal"], theme: "metal" },
    { keywords: ["punk", "hard rock", "grunge"], theme: "metal" },
    { keywords: ["indie folk", "folk rock", "folk pop", "americana", "bluegrass"], theme: "folk" },
    { keywords: ["blues rock", "blues", "jazz", "swing", "bebop", "smooth jazz", "psychedelic rock", "acid rock"], theme: "blues" },
    { keywords: ["electronic", "dance", "edm", "techno", "house", "club", "trance", "electro", "synth"], theme: "electronic" },
    { keywords: ["hip-hop", "rap", "hip hop", "trap", "r&b", "rnb", "soul", "funk"], theme: "hiphop" },
    { keywords: ["indie pop", "pop", "power pop", "bubblegum"], theme: "pop" },
    { keywords: ["funk rock", "rap rock", "rock", "classic rock", "alternative rock", "indie rock", "surf rock"], theme: "rock" },
    { keywords: ["country", "southern rock", "outlaw country"], theme: "country" },
    { keywords: ["folk", "acoustic", "singer-songwriter"], theme: "folk" },
    { keywords: ["classical", "orchestral", "opera", "baroque", "cinematic", "instrumental", "ambient"], theme: "classical" },
];

const DEFAULT_THEME: SongColorTheme = {
    bg: "bg-surface-2 dark:bg-slate-800/60",
    border: "border-border-base dark:border-slate-600/60",
    badge: "bg-slate-500 text-white dark:bg-slate-600 dark:text-slate-100",
    text: "text-muted dark:text-slate-300",
    glow: "shadow-slate-200 dark:shadow-slate-900/40",
};

export const GENRE_PALETTE: Record<string, { label: string; bg: string; border: string; text: string; labelColor: string }> = {
    metal:      { label: "Metal / Punk",        bg: "#fee2e2", border: "#ef4444", text: "#991b1b", labelColor: "#b91c1c" },
    rock:       { label: "Rock",                bg: "#ffedd5", border: "#f97316", text: "#9a3412", labelColor: "#c2410c" },
    folk:       { label: "Folk / Americana",    bg: "#dcfce7", border: "#22c55e", text: "#14532d", labelColor: "#15803d" },
    pop:        { label: "Pop",                 bg: "#fce7f3", border: "#ec4899", text: "#831843", labelColor: "#be185d" },
    electronic: { label: "Electronic",          bg: "#ede9fe", border: "#8b5cf6", text: "#4c1d95", labelColor: "#6d28d9" },
    hiphop:     { label: "Hip-Hop / R&B",       bg: "#f3e8ff", border: "#a855f7", text: "#581c87", labelColor: "#7e22ce" },
    blues:      { label: "Blues / Jazz",        bg: "#dbeafe", border: "#3b82f6", text: "#1e3a8a", labelColor: "#1d4ed8" },
    country:    { label: "Country",             bg: "#fef3c7", border: "#f59e0b", text: "#78350f", labelColor: "#b45309" },
    classical:  { label: "Ambient",             bg: "#cffafe", border: "#06b6d4", text: "#164e63", labelColor: "#0e7490" },
    other:      { label: "Other",               bg: "#f1f5f9", border: "#94a3b8", text: "#334155", labelColor: "#475569" },
};

export function classifyGenre(tags: string[]): string {
    const lower = tags.map(t => t.toLowerCase());
    for (const rule of COLOR_RULES) {
        if (rule.keywords.some(kw => lower.some(t => t.includes(kw)))) return rule.theme;
    }
    return "other";
}

export function getSongColorTheme(tags: string[]): SongColorTheme {
    const lower = tags.map((t) => t.toLowerCase());
    const energy = inferEnergy(lower);
    for (const rule of COLOR_RULES) {
        if (rule.keywords.some((kw) => lower.some((t) => t.includes(kw)))) {
            return THEMES[rule.theme][energy];
        }
    }
    return DEFAULT_THEME;
}

export function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}
