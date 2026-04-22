# Cover Lover

A collaborative setlist voting app for bands. Create a band, invite bandmates via a shareable link, add cover songs to the pool, and vote on what to play.

## Features

- **Band creation** with a shareable invite link
- **No login required** — just enter a display name when joining
- **Last.fm-powered song search** — search for any track by name or artist
- **Genre-based color coding** — song cards are color-themed based on Last.fm tags (metal = red, pop = pink, jazz = blue, etc.)
- **Live ranked voting** — songs sorted by votes in real time
- **Song metadata** — album art, duration, genre tags pulled from Last.fm

## Getting Started

### 1. Set up environment variables

Edit `.env.local` with your values:

\`\`\`
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
LASTFM_API_KEY="your_key_here"
\`\`\`

**Last.fm API key:** Free at https://www.last.fm/api/account/create  
**Database:** Use [Neon](https://neon.tech) (free tier, Vercel-native) or any PostgreSQL provider.

### 2. Run database migration

\`\`\`bash
npm run db:push   # quick push (dev)
# or
npm run db:migrate  # tracked migration
\`\`\`

### 3. Start dev server

\`\`\`bash
npm run dev
\`\`\`

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel dashboard
3. Add env vars: \`DATABASE_URL\`, \`LASTFM_API_KEY\`
4. Deploy — Vercel runs \`prisma generate && next build\` automatically via vercel.json

## Tech Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Prisma 7** + **PostgreSQL** (pg adapter)
- **Last.fm API** for music search & genre tags
- **Tailwind CSS** + **Radix UI** + **Lucide** icons
- **localStorage** for sessionless identity (no auth required)
