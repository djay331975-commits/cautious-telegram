import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { DiscoveryAdapter, CJAdapter } from '@autostream/integration-sdk';
import { PrismaClient } from '@prisma/client';

import { getRedisConnection } from '../utils/redis';

const prisma = new PrismaClient();
const connection = getRedisConnection();

const discoveryAdapter = new DiscoveryAdapter();
const cjAdapter = new CJAdapter();

// Listing Queue
export const listingQueue = new Queue('listing-task', { connection });

// Discovery Worker logic
export const discoveryWorker = new Worker(
  'discovery-task',
  async (job: Job) => {
    const { nicheName, userId } = job.data;
    console.log(`Running real discovery for niche: ${nicheName}, user: ${userId}`);

    // 1. Authenticate CJ if credentials exist
    const cjEmail = process.env.CJ_EMAIL;
    const cjApiKey = process.env.CJ_API_KEY;
    if (cjEmail && cjApiKey) {
      await cjAdapter.authenticate(cjEmail, cjApiKey);
    }

    // 2. Signal Aggregation (Fetch from SDK)
    const signals = await discoveryAdapter.fetchTrendingItems(nicheName, cjEmail && cjApiKey ? cjAdapter : undefined);
    
    // 2. Persist Niche and Trending Products
    const niche = await prisma.niche.upsert({
      where: { name: nicheName },
      update: { lastUpdated: new Date() },
      create: { name: nicheName, category: 'General' },
    });

    for (const signal of signals) {
      console.log(`Processing signal: ${signal.title} from ${signal.platform}`);
      
      const trendingProduct = await prisma.trendingProduct.create({
        data: {
          title: signal.title,
          nicheId: niche.id,
          discoveryPlatform: signal.platform,
          currentMarketPrice: signal.price,
          estimatedMonthlySales: signal.estimatedMonthlySales,
          signalStrength: signal.growth / 100, // Normalized
          status: 'PENDING',
        },
      });

      // 3. Automation Rule Check (Simulated)
      // If growth > 20%, automatically move to next stage (Sourcing/Listing)
      if (signal.growth > 20) {
        console.log(`Auto-approving high growth product: ${signal.title}`);
        
        await prisma.trendingProduct.update({
          where: { id: trendingProduct.id },
          data: { status: 'APPROVED' }
        });

        // Queue a listing task (simplified for MVP)
        await listingQueue.add('create-listing', {
          userId,
          trendingProductId: trendingProduct.id,
          product: {
            title: signal.title,
            description: `Trending product in ${nicheName} niche.`,
            price: (signal.price || 10) * 1.5, // 50% markup
            sku: `TREND-${trendingProduct.id.slice(0, 8)}`,
            images: ['https://placehold.co/600x400?text=Trending+Product'],
          },
        });
      }
    }
  },
  { connection }
);

discoveryWorker.on('completed', (job) => {
  console.log(`Discovery job ${job.id} completed.`);
});

discoveryWorker.on('failed', (job, err) => {
  console.error(`Discovery job ${job?.id} failed: ${err.message}`);
});
