/**
 * Backfills Spotify metadata (spotifyUri, imageUrl, duration) for songs that
 * were added before Spotify search was configured.
 *
 * Usage:
 *   node scripts/backfill-spotify-metadata.mjs
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
const CLIENT_ID = env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = env.SPOTIFY_CLIENT_SECRET;

if (!DATABASE_URL || !CLIENT_ID || !CLIENT_SECRET) {
    console.error("❌  DATABASE_URL, SPOTIFY_CLIENT_ID, and SPOTIFY_CLIENT_SECRET must be set in .env.local");
    process.exit(1);
}

// --- Spotify client credentials token ---
async function getAppToken() {
    const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${creds}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
    });
    if (!res.ok) throw new Error(`Token error: ${res.status}`);
    const data = await res.json();
    return data.access_token;
}

async function findSpotifyTrack(token, title, artist) {
    const q = `track:${title} artist:${artist}`;
    const params = new URLSearchParams({ q, type: "track", limit: "1" });
    const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const items = data.tracks?.items ?? [];
    if (items.length === 0) return null;
    const t = items[0];
    const images = (t.album.images ?? []).sort((a, b) => b.width - a.width);
    return {
        spotifyUri: t.uri,
        imageUrl: images[0]?.url ?? null,
        duration: t.duration_ms,
    };
}

// --- Main ---
const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const { rows: songs } = await client.query(
    `SELECT id, title, artist FROM "Song" WHERE "spotifyUri" IS NULL ORDER BY "addedAt" ASC`
);

if (songs.length === 0) {
    console.log("✅  No songs need backfilling.");
    await client.end();
    process.exit(0);
}

console.log(`Found ${songs.length} song(s) to backfill...\n`);
const token = await getAppToken();

let updated = 0;
let notFound = 0;

for (const song of songs) {
    const track = await findSpotifyTrack(token, song.title, song.artist);
    if (!track) {
        console.log(`  ✗ Not found: "${song.title}" by ${song.artist}`);
        notFound++;
        continue;
    }

    await client.query(
        `UPDATE "Song"
         SET "spotifyUri" = $1,
             "imageUrl"   = COALESCE("imageUrl", $2),
             "duration"   = COALESCE("duration", $3)
         WHERE id = $4`,
        [track.spotifyUri, track.imageUrl, track.duration, song.id]
    );
    console.log(`  ✓ Updated: "${song.title}" by ${song.artist}`);
    updated++;

    // Stay under Spotify rate limits
    await new Promise((r) => setTimeout(r, 150));
}

console.log(`\nDone. ${updated} updated, ${notFound} not found on Spotify.`);
await client.end();
