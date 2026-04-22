const LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0/";

export interface LastFmTrack {
    name: string;
    artist: string;
    url: string;
    duration: string;
    image?: Array<{ "#text": string; size: string }>;
    listeners?: string;
}

export interface LastFmTag {
    name: string;
    url: string;
}

export interface EnrichedTrack {
    title: string;
    artist: string;
    lastfmUrl: string;
    imageUrl: string | null;
    duration: number | null;
    tags: string[];
}

function getApiKey(): string {
    const key = process.env.LASTFM_API_KEY;
    if (!key) throw new Error("LASTFM_API_KEY is not set");
    return key;
}

export async function searchTracks(query: string): Promise<LastFmTrack[]> {
    const params = new URLSearchParams({
        method: "track.search",
        track: query,
        api_key: getApiKey(),
        format: "json",
        limit: "10",
    });

    const res = await fetch(`${LASTFM_API_BASE}?${params}`, {
        next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error("Last.fm search failed");

    const data = await res.json();
    const matches = data?.results?.trackmatches?.track;
    if (!matches) return [];
    return Array.isArray(matches) ? matches : [matches];
}

/** Search using separate title + optional artist fields (better fuzzy matching than a combined query string) */
async function searchTrackByFields(title: string, artist?: string): Promise<LastFmTrack[]> {
    const params = new URLSearchParams({
        method: "track.search",
        track: title,
        api_key: getApiKey(),
        format: "json",
        limit: "5",
    });
    if (artist) params.set("artist", artist);
    const res = await fetch(`${LASTFM_API_BASE}?${params}`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    const matches = data?.results?.trackmatches?.track;
    if (!matches) return [];
    return Array.isArray(matches) ? matches : [matches];
}

/** Fetch artist-level top tags as a fallback when a track has no tags */
async function getArtistTags(artist: string): Promise<string[]> {
    const params = new URLSearchParams({
        method: "artist.getTopTags",
        artist,
        api_key: getApiKey(),
        format: "json",
        autocorrect: "1",
    });
    const res = await fetch(`${LASTFM_API_BASE}?${params}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.toptags?.tag ?? [])
        .map((t: LastFmTag) => t.name.toLowerCase())
        .slice(0, 5);
}

async function enrichWithArtistTagsFallback(track: EnrichedTrack): Promise<EnrichedTrack> {
    if (track.tags.length > 0) return track;
    const tags = await getArtistTags(track.artist);
    return { ...track, tags };
}

function trackToEnriched(t: LastFmTrack): EnrichedTrack {
    return {
        title: t.name,
        artist: t.artist,
        lastfmUrl: t.url,
        imageUrl:
            t.image?.find((i) => i.size === "large")?.["#text"] ??
            t.image?.find((i) => i.size === "medium")?.["#text"] ??
            null,
        duration:
            parseInt(t.duration ?? "0", 10) > 0
                ? Math.round(parseInt(t.duration!, 10) / 1000)
                : null,
        tags: [],
    };
}

/**
 * Best-effort track lookup:
 * 1. getTrackInfo with autocorrect=1 (handles minor typos, punctuation variants)
 * 2. track.search with separate artist + title fields (handles "Mt Joy" ↔ "Mt. Joy")
 * 3. track.search with title only (catches cases where artist spelling is too far off)
 * Artist-level tags are fetched as a fallback when a track has no tags.
 */
export async function findBestTrack(
    artist: string,
    title: string
): Promise<EnrichedTrack | null> {
    // 1. Exact lookup — autocorrect handles common typos and punctuation variants
    const exact = await getTrackInfo(artist, title);
    if (exact) return enrichWithArtistTagsFallback(exact);

    // 2. Fuzzy search with separate artist field so Last.fm fuzzy-matches each independently
    const withArtist = await searchTrackByFields(title, artist || undefined);
    if (withArtist.length > 0) {
        const enriched = await getTrackInfo(withArtist[0].artist, withArtist[0].name);
        const result = enriched ?? trackToEnriched(withArtist[0]);
        return enrichWithArtistTagsFallback(result);
    }

    // 3. Title-only search — catches heavily misspelled or missing artist names
    if (artist) {
        const titleOnly = await searchTrackByFields(title);
        if (titleOnly.length > 0) {
            const enriched = await getTrackInfo(titleOnly[0].artist, titleOnly[0].name);
            const result = enriched ?? trackToEnriched(titleOnly[0]);
            return enrichWithArtistTagsFallback(result);
        }
    }

    return null;
}

export async function getTrackInfo(
    artist: string,
    track: string
): Promise<EnrichedTrack | null> {
    const params = new URLSearchParams({
        method: "track.getInfo",
        artist,
        track,
        api_key: getApiKey(),
        format: "json",
        autocorrect: "1",
    });

    const res = await fetch(`${LASTFM_API_BASE}?${params}`, {
        next: { revalidate: 3600 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const t = data?.track;
    if (!t) return null;

    const tags: string[] = (t.toptags?.tag ?? [])
        .map((tag: LastFmTag) => tag.name.toLowerCase())
        .slice(0, 8);

    const durationMs = parseInt(t.duration ?? "0", 10);

    const imageArr: Array<{ "#text": string; size: string }> =
        t.album?.image ?? [];
    const imageUrl =
        imageArr.find((i) => i.size === "large")?.["#text"] ||
        imageArr.find((i) => i.size === "medium")?.["#text"] ||
        null;

    return {
        title: t.name,
        artist: t.artist?.name ?? artist,
        lastfmUrl: t.url,
        imageUrl: imageUrl || null,
        duration: durationMs > 0 ? Math.round(durationMs / 1000) : null,
        tags,
    };
}
