/** Spotify Web API helpers — server-side only */

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

// ---------------------------------------------------------------------------
// Credential helpers
// ---------------------------------------------------------------------------

export function getClientId(): string {
    const id = process.env.SPOTIFY_CLIENT_ID;
    if (!id) throw new Error("SPOTIFY_CLIENT_ID is not set");
    return id;
}

export function getClientSecret(): string {
    const secret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!secret) throw new Error("SPOTIFY_CLIENT_SECRET is not set");
    return secret;
}

export function getRedirectUri(): string {
    const uri = process.env.SPOTIFY_REDIRECT_URI;
    if (!uri) throw new Error("SPOTIFY_REDIRECT_URI is not set");
    return uri;
}

export function isSpotifyConfigured(): boolean {
    return !!(
        process.env.SPOTIFY_CLIENT_ID &&
        process.env.SPOTIFY_CLIENT_SECRET
    );
}

export function isSpotifyExportConfigured(): boolean {
    return !!(
        process.env.SPOTIFY_CLIENT_ID &&
        process.env.SPOTIFY_CLIENT_SECRET &&
        process.env.SPOTIFY_SERVICE_REFRESH_TOKEN
    );
}

// ---------------------------------------------------------------------------
// Client Credentials token (for search / metadata — no user auth needed)
// ---------------------------------------------------------------------------

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAppToken(): Promise<string> {
    const now = Date.now();
    if (cachedToken && now < tokenExpiresAt) return cachedToken;

    const creds = Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64");
    const res = await fetch(SPOTIFY_TOKEN_URL, {
        method: "POST",
        headers: {
            Authorization: `Basic ${creds}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
        cache: "no-store",
    });

    if (!res.ok) throw new Error(`Spotify token error: ${res.status}`);
    const data = await res.json();
    cachedToken = data.access_token as string;
    tokenExpiresAt = now + (data.expires_in as number) * 1000 - 60_000;
    return cachedToken!;
}

// ---------------------------------------------------------------------------
// Search result types
// ---------------------------------------------------------------------------

export interface SpotifyTrack {
    id: string;
    title: string;
    artist: string;
    imageUrl: string | null;
    duration: number | null; // milliseconds
    spotifyUri: string;
    spotifyUrl: string;
}

interface RawSpotifyTrack {
    id: string;
    name: string;
    uri: string;
    duration_ms: number;
    artists: { name: string }[];
    album: { images: { url: string; width: number }[] };
    external_urls: { spotify: string };
}

function normalizeTrack(t: RawSpotifyTrack): SpotifyTrack {
    const images = t.album.images.sort((a, b) => b.width - a.width);
    return {
        id: t.id,
        title: t.name,
        artist: t.artists.map((a) => a.name).join(", "),
        imageUrl: images[0]?.url ?? null,
        duration: t.duration_ms,
        spotifyUri: t.uri,
        spotifyUrl: t.external_urls.spotify,
    };
}

// ---------------------------------------------------------------------------
// Track search (uses Client Credentials — no user required)
// ---------------------------------------------------------------------------

export async function searchSpotifyTracks(query: string): Promise<SpotifyTrack[]> {
    const token = await getAppToken();
    const params = new URLSearchParams({ q: query, type: "track", limit: "10" });
    const res = await fetch(`${SPOTIFY_API_BASE}/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`Spotify search failed: ${res.status}`);
    const data = await res.json();
    return (data.tracks?.items ?? []).map(normalizeTrack);
}

/** Find the single best matching Spotify track for a title + artist pair. */
export async function findSpotifyTrack(
    title: string,
    artist: string
): Promise<SpotifyTrack | null> {
    const token = await getAppToken();
    const q = `track:${title} artist:${artist}`;
    const params = new URLSearchParams({ q, type: "track", limit: "1" });
    const res = await fetch(`${SPOTIFY_API_BASE}/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const items: RawSpotifyTrack[] = data.tracks?.items ?? [];
    return items.length > 0 ? normalizeTrack(items[0]) : null;
}

// ---------------------------------------------------------------------------
// Service account token (uses stored refresh token — no user OAuth needed)
// ---------------------------------------------------------------------------

let serviceToken: string | null = null;
let serviceTokenExpiresAt = 0;

export async function getServiceAccessToken(): Promise<string> {
    const now = Date.now();
    if (serviceToken && now < serviceTokenExpiresAt) return serviceToken;

    const refreshToken = process.env.SPOTIFY_SERVICE_REFRESH_TOKEN;
    if (!refreshToken) throw new Error("SPOTIFY_SERVICE_REFRESH_TOKEN is not set");

    const creds = Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64");
    const res = await fetch(SPOTIFY_TOKEN_URL, {
        method: "POST",
        headers: {
            Authorization: `Basic ${creds}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Spotify service token refresh error: ${res.status}`);
    const data = await res.json();
    serviceToken = data.access_token as string;
    serviceTokenExpiresAt = now + (data.expires_in as number) * 1000 - 60_000;
    return serviceToken!;
}

// ---------------------------------------------------------------------------
// Playlist creation (uses user access token)
// ---------------------------------------------------------------------------

/** Search for a track URI using an app token (avoids consuming user token quota). */
async function resolveTrackUri(
    title: string,
    artist: string
): Promise<string | null> {
    try {
        const track = await findSpotifyTrack(title, artist);
        return track?.spotifyUri ?? null;
    } catch {
        return null;
    }
}

export async function createSpotifyPlaylist(
    accessToken: string,
    bandName: string,
    songs: { title: string; artist: string; spotifyUri: string | null }[]
): Promise<string> {
    // Create the playlist (POST /me/playlists — user endpoint, not user-id endpoint)
    const createRes = await fetch(
        `${SPOTIFY_API_BASE}/me/playlists`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: `${bandName} — Cover Lover`,
                description: "Exported from Cover Lover",
                public: false,
            }),
            cache: "no-store",
        }
    );
    if (!createRes.ok) throw new Error("Failed to create Spotify playlist");
    const playlist = await createRes.json();
    const playlistId: string = playlist.id;
    const playlistUrl: string = playlist.external_urls?.spotify ?? `https://open.spotify.com/playlist/${playlistId}`;

    // Resolve URIs (use stored ones when available, otherwise search)
    const uris: string[] = [];
    for (const song of songs) {
        const uri = song.spotifyUri ?? (await resolveTrackUri(song.title, song.artist));
        if (uri) uris.push(uri);
    }

    // Add tracks in batches of 100 (Spotify limit)
    // Uses POST /playlists/{id}/items (replaces deprecated /tracks endpoint)
    for (let i = 0; i < uris.length; i += 100) {
        const batch = uris.slice(i, i + 100);
        await fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}/items`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ uris: batch }),
            cache: "no-store",
        });
    }

    return playlistUrl;
}

/**
 * Replace all tracks in an existing playlist with the current song list.
 * Returns the playlist URL (unchanged).
 */
export async function updateSpotifyPlaylist(
    accessToken: string,
    playlistId: string,
    songs: { title: string; artist: string; spotifyUri: string | null }[]
): Promise<string> {
    // Resolve URIs
    const uris: string[] = [];
    for (const song of songs) {
        const uri = song.spotifyUri ?? (await resolveTrackUri(song.title, song.artist));
        if (uri) uris.push(uri);
    }

    // Replace all tracks: PUT /playlists/{id}/tracks with first batch (max 100),
    // then POST additional batches.
    const firstBatch = uris.slice(0, 100);
    await fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: firstBatch }),
        cache: "no-store",
    });

    for (let i = 100; i < uris.length; i += 100) {
        const batch = uris.slice(i, i + 100);
        await fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ uris: batch }),
            cache: "no-store",
        });
    }

    return `https://open.spotify.com/playlist/${playlistId}`;
}
