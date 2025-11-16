import { Queue, Worker } from 'bullmq';
import { logger } from '../utils/logger';

export class QueueManager {
  private queues: Map<string, Queue>;
  private workers: Worker[];

  constructor() {
    this.queues = new Map();
    this.workers = [];
  }

  async initialize(): Promise<void> {
    const connection = {
      host: process.env.REDIS_URL?.split('://')[1]?.split(':')[0] || 'localhost',
      port: parseInt(process.env.REDIS_URL?.split(':')[2] || '6379'),
    };

    const cleanupQueue = new Queue('cleanup', { connection });
    this.queues.set('cleanup', cleanupQueue);

    const cleanupWorker = new Worker('cleanup', async (job) => {
      logger.info(`Processing cleanup job: ${job.name}`);
    }, { connection });

    this.workers.push(cleanupWorker);

    logger.info('Queue manager initialized');
  }

  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map(w => w.close()));
    await Promise.all(Array.from(this.queues.values()).map(q => q.close()));
  }
}