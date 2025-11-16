import dotenv from 'dotenv';
dotenv.config();

import { ShardingManager } from 'discord.js';
import express from 'express';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3001;

const manager = new ShardingManager('./dist/bot.js', {
  token: process.env.DISCORD_TOKEN!,
  totalShards: 'auto',
  respawn: true,
});

manager.on('shardCreate', (shard) => {
  logger.info(`Launched shard ${shard.id}`);
  
  shard.on('ready', () => {
    logger.info(`Shard ${shard.id} is ready`);
  });

  shard.on('disconnect', () => {
    logger.warn(`Shard ${shard.id} disconnected`);
  });

  shard.on('reconnecting', () => {
    logger.info(`Shard ${shard.id} reconnecting`);
  });

  shard.on('error', (error) => {
    logger.error(`Shard ${shard.id} encountered error:`, error);
  });
});

const app = express();

app.get('/health', (req, res) => {
  const shards = manager.shards.map(shard => ({
    id: shard.id,
    ready: shard.ready,
  }));
  
  const allReady = shards.every(s => s.ready);
  
  res.status(allReady ? 200 : 503).json({
    status: allReady ? 'healthy' : 'degraded',
    shards,
    uptime: process.uptime(),
  });
});

app.get('/metrics', (req, res) => {
  res.status(200).send('');
});

app.listen(PORT, () => {
  logger.info(`Health server listening on port ${PORT}`);
});

manager.spawn().catch((error) => {
  logger.error('Failed to spawn shards:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await manager.broadcastEval(() => this.destroy());
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await manager.broadcastEval(() => this.destroy());
  process.exit(0);
});