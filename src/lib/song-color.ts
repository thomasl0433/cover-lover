/** Maps Last.fm tags to Tailwind color tokens for song cards */

export interface SongColorTheme {
    bg: string;
    border: string;
    badge: string;
    text: string;
    glow: string;
}

const COLOR_RULES: Array<{ keywords: string[]; theme: SongColorTheme }> = [
    {
        keywords: ["metal", "heavy metal", "hard rock", "hardcore", "punk", "thrash", "death metal", "grunge"],
        theme: {
            bg: "bg-red-100 dark:bg-red-950/60",
            border: "border-red-300 dark:border-red-700/60",
            badge: "bg-red-600 text-white dark:bg-red-700 dark:text-red-100",
            text: "text-red-700 dark:text-red-200",
            glow: "shadow-red-200 dark:shadow-red-900/40",
        },
    },
    {
        keywords: ["rock", "classic rock", "alternative rock", "indie rock"],
        theme: {
            bg: "bg-orange-100 dark:bg-orange-950/60",
            border: "border-orange-300 dark:border-orange-700/60",
            badge: "bg-orange-600 text-white dark:bg-orange-700 dark:text-orange-100",
            text: "text-orange-700 dark:text-orange-200",
            glow: "shadow-orange-200 dark:shadow-orange-900/40",
        },
    },
    {
        keywords: ["electronic", "dance", "edm", "techno", "house", "club", "trance", "electro", "synth"],
        theme: {
            bg: "bg-violet-100 dark:bg-violet-950/60",
            border: "border-violet-300 dark:border-violet-600/60",
            badge: "bg-violet-600 text-white dark:text-violet-100",
            text: "text-violet-700 dark:text-violet-200",
            glow: "shadow-violet-200 dark:shadow-violet-900/40",
        },
    },
    {
        keywords: ["pop", "indie pop", "power pop", "bubblegum"],
        theme: {
            bg: "bg-pink-100 dark:bg-pink-950/60",
            border: "border-pink-300 dark:border-pink-600/60",
            badge: "bg-pink-600 text-white dark:text-pink-100",
            text: "text-pink-700 dark:text-pink-200",
            glow: "shadow-pink-200 dark:shadow-pink-900/40",
        },
    },
    {
        keywords: ["hip-hop", "rap", "hip hop", "trap", "r&b", "rnb", "soul"],
        theme: {
            bg: "bg-yellow-100 dark:bg-yellow-950/60",
            border: "border-yellow-300 dark:border-yellow-600/60",
            badge: "bg-yellow-600 text-white dark:text-yellow-100",
            text: "text-yellow-700 dark:text-yellow-200",
            glow: "shadow-yellow-200 dark:shadow-yellow-900/40",
        },
    },
    {
        keywords: ["folk", "acoustic", "indie folk", "americana", "bluegrass", "singer-songwriter"],
        theme: {
            bg: "bg-emerald-100 dark:bg-emerald-950/60",
            border: "border-emerald-300 dark:border-emerald-700/60",
            badge: "bg-emerald-600 text-white dark:bg-emerald-700 dark:text-emerald-100",
            text: "text-emerald-700 dark:text-emerald-200",
            glow: "shadow-emerald-200 dark:shadow-emerald-900/40",
        },
    },
    {
        keywords: ["country", "southern rock", "outlaw country"],
        theme: {
            bg: "bg-amber-100 dark:bg-amber-950/60",
            border: "border-amber-300 dark:border-amber-600/60",
            badge: "bg-amber-600 text-white dark:text-amber-100",
            text: "text-amber-700 dark:text-amber-200",
            glow: "shadow-amber-200 dark:shadow-amber-900/40",
        },
    },
    {
        keywords: ["jazz", "blues", "soul", "funk", "swing", "bebop", "smooth jazz"],
        theme: {
            bg: "bg-blue-100 dark:bg-blue-950/60",
            border: "border-blue-300 dark:border-blue-600/60",
            badge: "bg-blue-600 text-white dark:text-blue-100",
            text: "text-blue-700 dark:text-blue-200",
            glow: "shadow-blue-200 dark:shadow-blue-900/40",
        },
    },
    {
        keywords: ["classical", "orchestral", "opera", "baroque", "cinematic", "instrumental", "ambient"],
        theme: {
            bg: "bg-cyan-100 dark:bg-cyan-950/60",
            border: "border-cyan-300 dark:border-cyan-600/60",
            badge: "bg-cyan-600 text-white dark:text-cyan-100",
            text: "text-cyan-700 dark:text-cyan-200",
            glow: "shadow-cyan-200 dark:shadow-cyan-900/40",
        },
    },
];

const DEFAULT_THEME: SongColorTheme = {
    bg: "bg-surface-2 dark:bg-slate-800/60",
    border: "border-border-base dark:border-slate-600/60",
    badge: "bg-slate-500 text-white dark:bg-slate-600 dark:text-slate-100",
    text: "text-muted dark:text-slate-300",
    glow: "shadow-slate-200 dark:shadow-slate-900/40",
};

export function getSongColorTheme(tags: string[]): SongColorTheme {
    const lowerTags = tags.map((t) => t.toLowerCase());
    for (const rule of COLOR_RULES) {
        if (rule.keywords.some((kw) => lowerTags.some((t) => t.includes(kw)))) {
            return rule.theme;
        }
    }
    return DEFAULT_THEME;
}

export function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}
