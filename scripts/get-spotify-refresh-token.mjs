/**
 * One-time script to obtain a Spotify refresh token for the service account.
 *
 * Usage:
 *   node scripts/get-spotify-refresh-token.mjs
 *
 * Then follow the instructions printed to the terminal.
 * Copy the refresh token into .env.local as SPOTIFY_SERVICE_REFRESH_TOKEN.
 */

import http from "http";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually
const envPath = resolve(process.cwd(), ".env.local");
const envLines = readFileSync(envPath, "utf8").split("\n");
const env = {};
for (const line of envLines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
}

const CLIENT_ID = env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = "http://127.0.0.1:8765/callback";
const SCOPE = "playlist-modify-public playlist-modify-private";

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("❌  SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env.local");
    process.exit(1);
}

const authUrl =
    `https://accounts.spotify.com/authorize?` +
    new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: "code",
        redirect_uri: REDIRECT_URI,
        scope: SCOPE,
    });

console.log("\nStep 1: Add this Redirect URI to your Spotify app dashboard (Settings → Redirect URIs):");
console.log("\n   http://127.0.0.1:8765/callback\n");
console.log("Step 2: Open this URL in your browser, signed in as the SERVICE account:\n");
console.log("   " + authUrl);
console.log("\nWaiting for callback on http://127.0.0.1:8765 ...\n");

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://127.0.0.1:8765");
    if (url.pathname !== "/callback") return;

    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error || !code) {
        res.end("Authorization failed: " + (error ?? "no code"));
        server.close();
        return;
    }

    const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${creds}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: REDIRECT_URI,
        }),
    });

    const data = await tokenRes.json();

    if (!data.refresh_token) {
        res.end("Error: no refresh token in response. " + JSON.stringify(data));
        server.close();
        return;
    }

    res.end("✅ Success! You can close this tab and return to the terminal.");
    server.close();

    console.log("✅  Got refresh token!\n");
    console.log("Add this to your .env.local:\n");
    console.log(`SPOTIFY_SERVICE_REFRESH_TOKEN=${data.refresh_token}\n`);
});

server.listen(8765, "127.0.0.1");
