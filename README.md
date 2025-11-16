# KodariAllInOne Discord Bot

A production-ready, all-in-one Discord bot built with TypeScript and discord.js v14, optimized for low-latency performance on Render.

## Features

- **Advanced Ticket System** - Form-based tickets with state management
- **Music Player** - Spotify metadata + YouTube playback via Lavalink
- **AI Support Chat** - Pattern-matched automated responses
- **Reaction Roles** - Classic role assignment via reactions
- **Moderation System** - Comprehensive mod commands with logging
- **Team Management** - Team-specific commands and role management
- **Security Suite** - Anti-spam, anti-raid, anti-nuke, link filtering
- **Verification System** - Account age and spam checks
- **Web Dashboard** - Next.js admin panel with Discord OAuth2

## Tech Stack

- **Language**: TypeScript
- **Discord**: discord.js v14, @discordjs/voice
- **Music**: Lavalink + play-dl + Spotify API
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis (ioredis)
- **Queue**: BullMQ
- **Dashboard**: Next.js + TailwindCSS + NextAuth
- **Deploy**: Render

## Project Structure

```
kodari-all-in-one/
├── apps/
│   ├── bot/          # Discord bot worker
│   └── dashboard/    # Next.js web dashboard
├── packages/
│   ├── database/     # Prisma schema and client
│   └── shared/       # Shared types and utilities
└── docker-compose.yml
```

## Quick Start

### Prerequisites

- Node.js 18+ or 20+
- PostgreSQL 16+
- Redis 7+
- Discord Bot Token
- Spotify API Credentials

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd kodari-all-in-one
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Configure `.env` with your credentials

5. Start development services:
```bash
docker-compose up -d
```

6. Generate Prisma client:
```bash
npm run db:generate
```

7. Push database schema:
```bash
npm run db:push
```

8. Deploy slash commands:
```bash
npm run deploy-commands --workspace=apps/bot
```

9. Start the bot and dashboard:
```bash
npm run dev
```

## Deployment to Render

### Bot Service

1. Create a new Web Service
2. Build Command: `npm install && npm run build:bot`
3. Start Command: `npm run start:bot`
4. Add environment variables from `.env.example`
5. Enable health check at `/health`

### Dashboard Service

1. Create a new Web Service
2. Build Command: `npm install && npm run build:dashboard`
3. Start Command: `npm run start:dashboard`
4. Add environment variables
5. Set `NEXTAUTH_URL` to your dashboard URL

### Database & Redis

1. Add PostgreSQL addon in Render
2. Add Redis addon in Render
3. Update `DATABASE_URL` and `REDIS_URL` in environment variables

### Lavalink (Optional)

1. Create separate service for Lavalink
2. Use `fredboat/lavalink` Docker image
3. Mount `lavalink-config/application.yml`

## Configuration

### Guild Config

All server settings are managed via the dashboard or stored in the database:
- Prefix, welcome messages, logging channels
- Anti-spam/raid thresholds
- Music settings
- Verification thresholds

### Slash Commands

All commands are slash commands registered globally or per-guild:
- `/play` - Play music
- `/warn`, `/ban`, `/kick`, `/mute` - Moderation
- `/team-warn`, `/team-uprank` - Team management
- `/serverstart` - Server announcements

### Ticket System

Configure up to 5 ticket categories in dashboard:
- One category can use forms (Entbannungsantrag)
- Auto-ping team roles
- State management: Open → Claimed → Closed

### Music Controls

- Only session owner can control playback
- Auto-disconnect when voice empty
- 30s grace period after track ends
- Spotify metadata + YouTube streaming

### AI Support

- Dashboard-managed trigger → response pairs
- Regex and keyword matching
- Priority ranking
- Fallback message for unmatched questions

## Performance Optimizations

- Redis caching for guild configs (1h TTL)
- Connection pooling for PostgreSQL
- Lazy-loading for rare features
- Rate limiting on high-frequency events
- Sharding support for 2000+ guilds
- Pre-warmed cache on startup

## Monitoring

- Health endpoint: `GET /health`
- Metrics endpoint: `GET /metrics`
- Sentry error tracking
- Winston logging (console + file)

## Testing

Run tests:
```bash
npm test
```

## Common Operations

### Restart Shard
```bash
# Via Render dashboard or API
curl -X POST https://api.render.com/v1/services/{serviceId}/restart
```

### Flush Redis Cache
```bash
redis-cli FLUSHDB
```

### Database Migration
```bash
npm run db:migrate --workspace=packages/database
```

### Backup Config
Export guild config via dashboard or:
```bash
npm run backup --workspace=packages/database
```

## License

MIT

## Support

For issues and feature requests, open an issue on GitHub.