import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import crypto from 'crypto';
import IORedis from 'ioredis';
// @ts-ignore
import RedisMock from 'ioredis-mock';
import { registerMockShopify } from './mock-shopify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
    },
  },
});

console.log('DATABASE_URL:', process.env.DATABASE_URL);
const prisma = new PrismaClient();

const redisConnection = process.env.REDIS_URL === 'mock' 
  ? new RedisMock()
  : new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });

// Queues for status monitoring
const discoveryQueue = new Queue('discovery-task', { connection: redisConnection as any });
const listingQueue = new Queue('listing-task', { connection: redisConnection as any });
const fulfillmentQueue = new Queue('fulfillment-task', { connection: redisConnection as any });

registerMockShopify(fastify, prisma);

fastify.register(cors, {
  origin: '*',
});

// Serve static files from the web app's build directory
const webDistPath = path.join(__dirname, '../../web/dist');
fastify.register(fastifyStatic, {
  root: webDistPath,
  prefix: '/',
});

// Fallback to index.html for SPA routing
fastify.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api')) {
    reply.code(404).send({ error: 'Not Found' });
  } else {
    reply.sendFile('index.html');
  }
});

fastify.get('/health', async () => {
  return { status: 'ok' };
});

// GET /api/stats
fastify.get('/api/stats', async () => {
  const [totalStores, totalProducts, totalOrders] = await Promise.all([
    prisma.store.count(),
    prisma.product.count(),
    prisma.order.count(),
  ]);
  
  return {
    gmv: 12450.50,
    activeStores: totalStores,
    activeProducts: totalProducts,
    orders: totalOrders || 432,
    churn: 2.4,
    revenueData: [
      { name: 'May 20', gmv: 400, orders: 12 },
      { name: 'May 21', gmv: 600, orders: 18 },
      { name: 'May 22', gmv: 500, orders: 15 },
      { name: 'May 23', gmv: 900, orders: 25 },
      { name: 'May 24', gmv: 1100, orders: 30 },
      { name: 'May 25', gmv: 800, orders: 22 },
      { name: 'May 26', gmv: 1200, orders: 35 },
    ],
    storeDistribution: [
      { name: 'EcoStream Home', value: 65 },
      { name: 'Store B', value: 25 },
      { name: 'Store C', value: 10 },
    ]
  };
});

// GET /api/stores
fastify.get('/api/stores', async () => {
  const stores = await prisma.store.findMany({
    include: {
      _count: {
        select: { products: true }
      }
    }
  });
  return stores.map(s => ({
    id: s.id,
    name: s.name,
    platform: s.platform,
    status: 'Connected',
    lastSync: s.updatedAt,
    productCount: s._count.products
  }));
});

// GET /api/discovery/niches
fastify.get('/api/discovery/niches', async () => {
  const niches = await prisma.niche.findMany({
    orderBy: { lastUpdated: 'desc' }
  });
  
  return niches.map(n => ({
    id: n.id,
    name: n.name,
    growthScore: n.growthScore || 0,
    status: n.competitionLevel || 'Stable'
  }));
});

// GET /api/discovery/products
fastify.get('/api/discovery/products', async () => {
  const trendingProducts = await prisma.trendingProduct.findMany({
    include: { niche: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  return trendingProducts.map(tp => ({
    id: tp.id,
    name: tp.title,
    niche: tp.niche.name,
    platform: tp.discoveryPlatform,
    growth: (tp.signalStrength || 0) * 100,
    price: tp.currentMarketPrice || 0
  }));
});

// GET /api/workers/status
fastify.get('/api/workers/status', async () => {
  const [discoveryStats, listingStats, fulfillmentStats] = await Promise.all([
    discoveryQueue.getJobCounts('completed', 'failed', 'active', 'waiting'),
    listingQueue.getJobCounts('completed', 'failed', 'active', 'waiting'),
    fulfillmentQueue.getJobCounts('completed', 'failed', 'active', 'waiting'),
  ]).catch(err => {
    fastify.log.error(err);
    return [{}, {}, {}] as any;
  });

  return [
    { 
      id: 'discovery-worker', 
      name: 'Discovery Worker', 
      status: 'Active', 
      queue: 'discovery-task', 
      jobs: (discoveryStats.active || 0) + (discoveryStats.waiting || 0),
      processed: discoveryStats.completed || 0,
      failed: discoveryStats.failed || 0
    },
    { 
      id: 'listing-worker', 
      name: 'Listing Worker', 
      status: 'Active', 
      queue: 'listing-task', 
      jobs: (listingStats.active || 0) + (listingStats.waiting || 0),
      processed: listingStats.completed || 0,
      failed: listingStats.failed || 0
    },
    { 
      id: 'fulfillment-worker', 
      name: 'Fulfillment Worker', 
      status: 'Active', 
      queue: 'fulfillment-task', 
      jobs: (fulfillmentStats.active || 0) + (fulfillmentStats.waiting || 0),
      processed: fulfillmentStats.completed || 0,
      failed: fulfillmentStats.failed || 0
    },
  ];
});

// GET /api/inventory
fastify.get('/api/inventory', async () => {
  const products = await prisma.product.findMany({
    include: {
      store: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return products.map(p => ({
    id: p.id,
    externalId: p.externalId,
    title: p.title,
    sku: p.sku,
    price: p.price,
    status: p.status,
    storeName: p.store.name,
    stockLevel: Math.floor(Math.random() * 100), // Mock stock level for now
    lastUpdated: p.updatedAt
  }));
});

// PATCH /api/inventory/:id
fastify.patch<{ Params: { id: string }, Body: { status: string } }>('/api/inventory/:id', async (request) => {
  const { id } = request.params;
  const { status } = request.body;

  const product = await prisma.product.update({
    where: { id },
    data: { status }
  });

  return { success: true, product };
});

// GET /api/orders
fastify.get('/api/orders', async () => {
  const orders = await prisma.order.findMany({
    include: {
      store: true,
      OrderItem: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return orders.map(o => ({
    id: o.id,
    externalOrderId: o.externalOrderId,
    storeName: o.store.name,
    customerName: o.customerName,
    totalPrice: o.totalPrice,
    status: o.status,
    trackingNumber: o.trackingNumber,
    cjOrderId: o.cjOrderId,
    itemCount: o.OrderItem.length,
    createdAt: o.createdAt
  }));
});

// Trigger discovery for a niche
fastify.post<{ Body: { niche: string, userId: string } }>('/api/discovery/trigger', async (request) => {
  const { niche, userId } = request.body;
  await discoveryQueue.add('discovery-task', { nicheName: niche, userId });
  return { success: true };
});

// Mock endpoint to trigger an order (for E2E testing)
fastify.post('/api/test/create-order', async (request: any) => {
  const { storeId, productSku } = request.body;
  
  const order = await prisma.order.create({
    data: {
      id: crypto.randomUUID(),
      externalOrderId: `MOCK-${Date.now()}`,
      storeId,
      customerEmail: 'test@example.com',
      customerName: 'E2E Test Customer',
      shippingAddress: JSON.stringify({
        address1: '123 Mock St',
        city: 'Mock City',
        country: 'US',
        zip: '12345',
      }),
      totalPrice: 29.99,
      status: 'PENDING',
      updatedAt: new Date(),
      OrderItem: {
        create: [
          {
            id: crypto.randomUUID(),
            productId: 'test-product-id',
            sku: productSku || 'TEST-SKU',
            quantity: 1,
            price: 29.99,
          }
        ]
      }
    }
  });

  // Automatically add to fulfillment queue
  // await fulfillmentQueue.add('fulfillment-task', { orderId: order.id });

  return { success: true, orderId: order.id };
});

// Trigger listing for a trending product
fastify.post<{ Body: { trendingProductId: string, userId: string, storeId?: string } }>('/api/test/trigger-listing', async (request) => {
  const { trendingProductId, userId, storeId } = request.body;
  
  const trending = await prisma.trendingProduct.findUnique({
    where: { id: trendingProductId }
  });

  if (!trending) {
    throw new Error('Trending product not found');
  }

  // Create a mock product directly to test UI
  await prisma.product.create({
    data: {
      id: crypto.randomUUID(),
      externalId: `MOCK-PROD-${Date.now()}`,
      title: trending.title,
      price: trending.currentMarketPrice || 45.0,
      sku: `MOCK-${trending.id.substring(0, 8).toUpperCase()}`,
      status: 'PUBLISHED',
      storeId: storeId || 'ecostream-home-id',
      updatedAt: new Date()
    }
  });

  return { success: true };
});

// ===== PHASE 4: Multi-Niche Support Routes =====

// GET /api/niches - List all niches with their configs and store links
fastify.get('/api/niches', async () => {
  const niches = await prisma.niche.findMany({
    include: {
      config: true,
      storeNiches: {
        include: { store: { select: { id: true, name: true } } }
      },
      _count: { select: { products: true, productList: true } }
    },
    orderBy: { name: 'asc' }
  });
  return niches.map(n => ({
    id: n.id,
    name: n.name,
    category: n.category,
    growthScore: n.growthScore,
    profitabilityIndex: n.profitabilityIndex,
    competitionLevel: n.competitionLevel,
    trendingProductCount: n._count.products,
    productCount: n._count.productList,
    config: n.config ? {
      fulfillmentPartner: n.config.fulfillmentPartner,
      shippingOrigin: n.config.shippingOrigin,
      defaultMarkupPercent: n.config.defaultMarkupPercent,
      preferredWarehouse: n.config.preferredWarehouse,
      maxShippingDays: n.config.maxShippingDays,
      listingPlatform: n.config.listingPlatform,
      isActive: n.config.isActive
    } : null,
    stores: n.storeNiches.map(sn => ({ id: sn.store.id, name: sn.store.name }))
  }));
});

// GET /api/niches/:id/config - Get a single niche's full configuration
fastify.get<{ Params: { id: string } }>('/api/niches/:id/config', async (request, reply) => {
  const { id } = request.params;
  const niche = await prisma.niche.findUnique({
    where: { id },
    include: { config: true }
  });
  if (!niche) {
    reply.code(404).send({ error: 'Niche not found' });
    return;
  }
  return {
    id: niche.id,
    name: niche.name,
    category: niche.category,
    config: niche.config || null
  };
});

// PUT /api/niches/:id/config - Update niche configuration
fastify.put<{ Params: { id: string }, Body: {
  fulfillmentPartner?: string;
  shippingOrigin?: string;
  defaultMarkupPercent?: number;
  preferredWarehouse?: string;
  maxShippingDays?: number;
  cjCategoryId?: string;
  listingPromptPrefix?: string;
  listingPlatform?: string;
  isActive?: boolean;
} }>('/api/niches/:id/config', async (request, reply) => {
  const { id } = request.params;
  const updateData = request.body;

  const niche = await prisma.niche.findUnique({ where: { id } });
  if (!niche) {
    reply.code(404).send({ error: 'Niche not found' });
    return;
  }

  const config = await prisma.nicheConfig.upsert({
    where: { nicheId: id },
    create: { ...updateData, nicheId: id },
    update: updateData,
  });

  return { success: true, config };
});

// GET /api/stores/:storeId/niches - Get all niches assigned to a store
fastify.get<{ Params: { storeId: string } }>('/api/stores/:storeId/niches', async (request, reply) => {
  const { storeId } = request.params;
  const storeNiches = await prisma.storeNiche.findMany({
    where: { storeId },
    include: {
      niche: {
        include: { config: true }
      }
    }
  });
  return storeNiches.map(sn => ({
    id: sn.niche.id,
    name: sn.niche.name,
    category: sn.niche.category,
    config: sn.niche.config ? {
      fulfillmentPartner: sn.niche.config.fulfillmentPartner,
      shippingOrigin: sn.niche.config.shippingOrigin,
      defaultMarkupPercent: sn.niche.config.defaultMarkupPercent,
      preferredWarehouse: sn.niche.config.preferredWarehouse,
      maxShippingDays: sn.niche.config.maxShippingDays
    } : null
  }));
});

// POST /api/stores/:storeId/niches - Assign a niche to a store
fastify.post<{ Params: { storeId: string }, Body: { nicheId: string } }>('/api/stores/:storeId/niches', async (request, reply) => {
  const { storeId } = request.params;
  const { nicheId } = request.body;

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    reply.code(404).send({ error: 'Store not found' });
    return;
  }
  const niche = await prisma.niche.findUnique({ where: { id: nicheId } });
  if (!niche) {
    reply.code(404).send({ error: 'Niche not found' });
    return;
  }

  await prisma.storeNiche.upsert({
    where: { storeId_nicheId: { storeId, nicheId } },
    create: { storeId, nicheId },
    update: {},
  });

  return { success: true, message: `Niche "${niche.name}" assigned to store "${store.name}"` };
});

// DELETE /api/stores/:storeId/niches/:nicheId - Remove a niche from a store
fastify.delete<{ Params: { storeId: string, nicheId: string } }>('/api/stores/:storeId/niches/:nicheId', async (request, reply) => {
  const { storeId, nicheId } = request.params;
  await prisma.storeNiche.deleteMany({
    where: { storeId, nicheId }
  });
  return { success: true };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
