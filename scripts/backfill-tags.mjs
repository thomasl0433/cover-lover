/**
 * Backfills tags for all songs using MusicBrainz artist genres (falling back
 * to Last.fm tags when MusicBrainz has none). Caches per artist to avoid
 * redundant API calls for bands with multiple songs by the same artist.
 *
 * Usage:
 *   node scripts/backfill-tags.mjs
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import pg from "pg";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
const envLines = readFileSync(envPath, "utf8").split("\n");
const env = {};
for (const line of envLines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
}

const DATABASE_URL = env.DATABASE_URL;
const LASTFM_API_KEY = env.LASTFM_API_KEY;
const MB_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "CoverLover/1.0 (backfill)";

if (!DATABASE_URL) {
    console.error("❌  DATABASE_URL must be set in .env.local");
    process.exit(1);
}

async function getMusicBrainzGenres(artistName) {
    try {
        const searchParams = new URLSearchParams({ query: `artist:${artistName}`, limit: "1", fmt: "json" });
        const searchRes = await fetch(`${MB_BASE}/artist/?${searchParams}`, { headers: { "User-Agent": USER_AGENT } });
        if (!searchRes.ok) return [];
        const searchData = await searchRes.json();
        const mbid = searchData.artists?.[0]?.id;
        if (!mbid) return [];

        await new Promise(r => setTimeout(r, 1100)); // MusicBrainz: 1 req/sec

        const artistRes = await fetch(`${MB_BASE}/artist/${mbid}?inc=genres&fmt=json`, { headers: { "User-Agent": USER_AGENT } });
        if (!artistRes.ok) return [];
        const artistData = await artistRes.json();
        const genres = artistData.genres ?? [];
        return genres.sort((a, b) => b.count - a.count).slice(0, 5).map(g => g.name);
    } catch {
        return [];
    }
}

async function getLastFmTags(artist, title) {
    if (!LASTFM_API_KEY) return [];
    try {
        const params = new URLSearchParams({
            method: "track.getInfo",
            api_key: LASTFM_API_KEY,
            artist,
            track: title,
            format: "json",
            autocorrect: "1",
        });
        const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`);
        if (!res.ok) return [];
        const data = await res.json();
        const tags = data.track?.toptags?.tag ?? [];
        return tags.slice(0, 5).map(t => t.name.toLowerCase());
    } catch {
        return [];
    }
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const { rows: songs } = await client.query(
    `SELECT id, title, artist FROM "Song" ORDER BY "addedAt" ASC`
);

console.log(`Backfilling tags for ${songs.length} song(s)...\n`);

const artistCache = new Map();

for (const song of songs) {
    let genres;
    if (artistCache.has(song.artist)) {
        genres = artistCache.get(song.artist);
    } else {
        genres = await getMusicBrainzGenres(song.artist);
        artistCache.set(song.artist, genres);
    }

    if (genres.length === 0 && LASTFM_API_KEY) {
        genres = await getLastFmTags(song.artist, song.title);
    }

    if (genres.length > 0) {
        await client.query(`UPDATE "Song" SET tags = $1::jsonb WHERE id = $2`, [JSON.stringify(genres), song.id]);
        console.log(`  ✓ "${song.title}" by ${song.artist} → [${genres.join(", ")}]`);
    } else {
        console.log(`  ✗ "${song.title}" by ${song.artist} → no tags found`);
    }
}

console.log("\nDone.");
await client.end();
