/** MusicBrainz API helpers — server-side only */

const MB_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "CoverLover/1.0 (cover-lover)";

/** Returns genres sorted by vote count (most popular first), max 5. */
export async function getArtistGenres(artistName: string): Promise<string[]> {
    try {
        // Step 1: search for the artist to get their MBID
        const searchParams = new URLSearchParams({
            query: `artist:${artistName}`,
            limit: "1",
            fmt: "json",
        });
        const searchRes = await fetch(`${MB_BASE}/artist/?${searchParams}`, {
            headers: { "User-Agent": USER_AGENT },
            next: { revalidate: 86400 },
        });
        if (!searchRes.ok) return [];

        const searchData = await searchRes.json();
        const mbid: string | undefined = searchData.artists?.[0]?.id;
        if (!mbid) return [];

        // Step 2: fetch genres for that artist by MBID
        const artistRes = await fetch(
            `${MB_BASE}/artist/${mbid}?inc=genres&fmt=json`,
            {
                headers: { "User-Agent": USER_AGENT },
                next: { revalidate: 86400 },
            }
        );
        if (!artistRes.ok) return [];

        const artistData = await artistRes.json();
        const genres: { name: string; count: number }[] = artistData.genres ?? [];

        return genres
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map((g) => g.name);
    } catch {
        return [];
    }
}
