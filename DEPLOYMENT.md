# Deployment Guide for Render

## Overview

This guide covers deploying KodariAllInOne to Render with optimal configuration for low-latency performance.

## Services Required

1. **Bot Worker** (Web Service)
2. **Dashboard** (Web Service)
3. **PostgreSQL** (Managed Database)
4. **Redis** (Managed Redis)
5. **Lavalink** (Optional - Web Service or external)

## Step-by-Step Deployment

### 1. Database Setup

1. In Render Dashboard, create new PostgreSQL instance
2. Name: `kodari-db`
3. Plan: Choose based on expected load
4. Copy connection string
5. Add to environment variables as `DATABASE_URL`

### 2. Redis Setup

1. Create new Redis instance in Render
2. Name: `kodari-redis`
3. Plan: Choose based on expected load
4. Copy connection string
5. Add to environment variables as `REDIS_URL`

### 3. Bot Service

1. Create new Web Service
2. Connect GitHub repository
3. Configuration:
   - **Name**: `kodari-bot`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build:bot && npm run db:push --workspace=packages/database`
   - **Start Command**: `npm run start:bot`
   - **Health Check Path**: `/health`
   - **Instance Type**: Standard or higher (for sharding)

4. Environment Variables:
```
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DATABASE_URL=from_render_postgres
REDIS_URL=from_render_redis
SPOTIFY_CLIENT_ID=your_spotify_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret
LAVALINK_HOST=your_lavalink_host
LAVALINK_PORT=2333
LAVALINK_PASSWORD=your_lavalink_password
SENTRY_DSN=your_sentry_dsn
NODE_ENV=production
PORT=10000
```

5. Auto-Deploy: Enable for main branch

### 4. Dashboard Service

1. Create new Web Service
2. Connect same GitHub repository
3. Configuration:
   - **Name**: `kodari-dashboard`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build:dashboard`
   - **Start Command**: `npm run start:dashboard`
   - **Instance Type**: Starter or Standard

4. Environment Variables:
```
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=https://your-dashboard.onrender.com/api/auth/callback
DATABASE_URL=from_render_postgres
REDIS_URL=from_render_redis
NEXTAUTH_URL=https://your-dashboard.onrender.com
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NODE_ENV=production
DASHBOARD_PORT=10000
```

5. Auto-Deploy: Enable for main branch

### 5. Lavalink Service (Optional)

**Option A: Self-hosted on Render**

1. Create new Web Service
2. Use Docker deploy
3. Image: `fredboat/lavalink:latest`
4. Environment Variables:
```
SERVER_PORT=2333
LAVALINK_SERVER_PASSWORD=your_password
```

**Option B: External Provider**

Use managed Lavalink service like:
- lavalink.dev
- lavalink.darrennathanael.com

Update `LAVALINK_HOST`, `LAVALINK_PORT`, `LAVALINK_PASSWORD` in bot environment.

### 6. Deploy Commands

After bot is deployed, run once:

```bash
npm run deploy-commands --workspace=apps/bot
```

Or use Render Shell access on bot service:
```bash
npm run deploy-commands
```

## Post-Deployment Checklist

- [ ] Bot is online in Discord
- [ ] Dashboard loads at your URL
- [ ] Discord OAuth works
- [ ] Health check passes: `https://your-bot.onrender.com/health`
- [ ] Database migrations applied
- [ ] Redis connection working
- [ ] Slash commands registered
- [ ] Test music playback
- [ ] Test ticket creation
- [ ] Test moderation commands
- [ ] Check logs for errors
- [ ] Configure Sentry alerts

## Performance Tuning

### Render Instance Sizing

**Bot Service**:
- < 10 servers: Starter ($7/mo)
- 10-100 servers: Standard ($25/mo)
- 100-1000 servers: Pro ($85/mo)
- 1000+ servers: Pro with sharding

**Dashboard**:
- Starter or Standard sufficient for most cases

**Database**:
- Starter plan sufficient for < 100 guilds
- Standard for 100-1000 guilds

**Redis**:
- 256MB sufficient for most use cases
- 1GB for high-traffic bots

### Connection Pooling

Prisma automatically manages connection pooling. For high traffic:

```env
DATABASE_URL=postgresql://user:pass@host/db?connection_limit=10&pool_timeout=20
```

### Caching Strategy

- Guild configs: 1 hour TTL
- Music sessions: 1 hour TTL
- AI triggers: 5 minute TTL
- Spam records: Auto-expire based on config

## Monitoring

### Health Checks

Bot health endpoint returns:
```json
{
  "status": "healthy",
  "shards": [...],
  "uptime": 123456
}
```

### Logs

Access via Render Dashboard → Logs

Critical log levels:
- ERROR: Immediate attention required
- WARN: Monitor for patterns
- INFO: Normal operations

### Metrics

- Use Render's built-in metrics
- Integration with Prometheus/Grafana optional
- Sentry for error tracking

## Troubleshooting

### Bot Not Starting

1. Check environment variables
2. Verify DATABASE_URL and REDIS_URL
3. Check Render logs for errors
4. Ensure Discord token is valid

### Commands Not Appearing

1. Run `npm run deploy-commands`
2. Wait up to 1 hour for global commands
3. Check bot has `applications.commands` scope

### Music Not Working

1. Verify Lavalink connection
2. Check Spotify credentials
3. Ensure voice intents enabled
4. Check Render logs for errors

### Dashboard Login Failing

1. Verify OAuth redirect URI matches exactly
2. Check NEXTAUTH_SECRET is set
3. Ensure Discord app has correct redirect URIs
4. Clear browser cookies

### Database Connection Issues

1. Verify DATABASE_URL format
2. Check Render database status
3. Review connection pool settings
4. Check for connection leaks in logs

## Scaling

### Horizontal Scaling

Enable sharding when reaching 2000 guilds:

```typescript
totalShards: 'auto'
```

Render will auto-scale based on configuration.

### Vertical Scaling

Upgrade instance types in Render dashboard:
- Starter → Standard → Pro

### Database Scaling

1. Monitor query performance
2. Add indexes for slow queries
3. Upgrade Render database plan
4. Consider read replicas for high load

## Backup & Restore

### Database Backups

Render automatically backs up PostgreSQL daily.

Manual backup:
```bash
pg_dump $DATABASE_URL > backup.sql
```

Restore:
```bash
psql $DATABASE_URL < backup.sql
```

### Config Export

Via dashboard or:
```bash
npm run backup --workspace=packages/database
```

## Cost Estimation

**Minimum Setup**:
- Bot: $7/mo (Starter)
- Dashboard: $7/mo (Starter)
- PostgreSQL: $7/mo (Starter)
- Redis: $10/mo (256MB)
- **Total**: ~$31/mo

**Recommended Setup**:
- Bot: $25/mo (Standard)
- Dashboard: $7/mo (Starter)
- PostgreSQL: $15/mo (Standard)
- Redis: $25/mo (1GB)
- **Total**: ~$72/mo

## Security Checklist

- [ ] All secrets in environment variables
- [ ] NEXTAUTH_SECRET is strong random string
- [ ] Discord bot token regenerated if exposed
- [ ] Database not publicly accessible
- [ ] Rate limiting enabled
- [ ] Sentry DSN configured
- [ ] HTTPS enforced on dashboard
- [ ] OAuth redirect URIs whitelist only

## Support

For deployment issues:
1. Check Render status page
2. Review Render documentation
3. Check bot logs for errors
4. Open GitHub issue with logs

## Maintenance

### Regular Tasks

- Monitor error rates in Sentry
- Review Render metrics weekly
- Update dependencies monthly
- Rotate secrets quarterly
- Review and optimize database queries

### Updates

1. Test changes locally
2. Deploy to staging (if available)
3. Push to main branch
4. Render auto-deploys
5. Monitor health checks
6. Verify critical features work

## Load Testing

Before going live with high traffic:

```bash
npm run test:load
```

Monitor:
- Response times < 200ms
- Memory usage stable
- CPU < 80%
- Database connections < limit
- Redis memory usage

Target benchmarks:
- Command response: < 200ms
- Music playback start: < 3s
- Ticket creation: < 1s
- Dashboard load: < 2s