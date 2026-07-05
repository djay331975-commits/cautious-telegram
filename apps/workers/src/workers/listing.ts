import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { ShopifyAdapter } from '@autostream/integration-sdk';
import { PrismaClient } from '@prisma/client';
import { ListingContentGenerator } from '../utils/content-generator';

import { getRedisConnection } from '../utils/redis';

const prisma = new PrismaClient();
const connection = getRedisConnection();

const contentGenerator = new ListingContentGenerator(process.env.OPENAI_API_KEY);

export const listingWorker = new Worker(
  'listing-task',
  async (job: Job) => {
    const { userId, storeId, product, trendingProductId } = job.data;
    console.log(`Processing autonomous listing for store ${storeId} (User: ${userId})`);

    // 1. Fetch store credentials
    const store = await prisma.store.findUnique({
      where: { id: storeId || 'ecostream-home-id' }
    });

    if (!store) {
      throw new Error(`Store ${storeId} not found`);
    }

    // 2. Fetch context from Discovery (TrendingProduct + Niche)
    let nicheName = 'General';
    if (trendingProductId) {
      const trending = await prisma.trendingProduct.findUnique({
        where: { id: trendingProductId },
        include: { niche: true }
      });
      if (trending?.niche) {
        nicheName = trending.niche.name;
      }
    }

    // 3. Autonomous Content Generation
    const { title, description, bulletPoints, imagePrompt } = await contentGenerator.generate(product, nicheName);

    // 4. Validation
    const validation = contentGenerator.validate({ title, description, bulletPoints });
    let listingStatus = 'DRAFT';
    if (!validation.success) {
      console.warn(`Content validation failed: ${validation.errors.join(', ')}`);
      listingStatus = 'FAILED_QC';
    }

    // 5. Image Generation (Simulated)
    console.log(`Generating images with prompt: ${imagePrompt}`);
    const imageUrls = ['https://placehold.co/1024x1024?text=EcoStream+Home+Listing'];

    // 6. Initialize Shopify Adapter
    const shopify = new ShopifyAdapter({
      shopName: store.name.toLowerCase().replace(/\s+/g, '-'),
      accessToken: store.accessToken,
      baseUrl: process.env.SHOPIFY_MOCK_BASE_URL,
    });

    try {
      // 7. Create listing via SDK with generated content
      const createdProduct = await shopify.createProduct({
        title,
        description: description + '\n\n' + bulletPoints,
        price: product.price,
        sku: product.sku,
        images: imageUrls,
      });

      console.log(`Successfully created autonomous listing: ${createdProduct.title} (ID: ${createdProduct.id})`);

      // 8. Record in database with full optimized fields
      await prisma.product.create({
        data: {
          externalId: createdProduct.id,
          title: createdProduct.title,
          description: createdProduct.description,
          price: createdProduct.price,
          sku: createdProduct.sku,
          listingTitle: title,
          listingDescription: description,
          bulletPoints: bulletPoints,
          listingImagePrompt: imagePrompt,
          listingImageUrls: imageUrls.join('|'),
          status: validation.success ? 'PUBLISHED' : 'FAILED_QC',
          storeId: store.id,
        }
      });

      // 9. Update TrendingProduct status
      if (trendingProductId) {
        await prisma.trendingProduct.update({
          where: { id: trendingProductId },
          data: { status: 'LISTED' }
        });
      }

      return createdProduct;
    } catch (error: any) {
      console.error(`Failed to create autonomous listing: ${error.message}`);
      throw error;
    }
  },
  { connection }
);

listingWorker.on('completed', (job) => {
  console.log(`Listing job ${job.id} completed.`);
});

listingWorker.on('failed', (job, err) => {
  console.error(`Listing job ${job?.id} failed: ${err.message}`);
});
