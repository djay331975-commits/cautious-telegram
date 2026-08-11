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

// ===== Shopify OAuth Callback Route =====
// Store the latest OAuth code in memory (volatile — for owner-led flow only)
let latestOauthCode: string | null = null;

fastify.get('/shopify/callback', async (request: any, reply: any) => {
  const code = request.query?.code;
  if (code) {
    latestOauthCode = code;
    console.log('✅ Shopify OAuth code received:', code);
    
    // Automatically exchange the code for an access token
    const clientId = process.env.SHOPIFY_API_KEY || '0b99067d252c789f111c527e27d4abab';
    const clientSecret = process.env.SHOPIFY_API_SECRET || '';
    
    try {
      const response = await fetch(`https://wnun0z-h9.myshopify.com/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: code
        })
      });
      const data: any = await response.json();
      
      if (data.access_token) {
        console.log('🎉 SHOPIFY ACCESS TOKEN:', data.access_token);
        console.log('Scopes:', data.scope);
        // Store in process environment for use by the app
        process.env.SHOPIFY_ACCESS_TOKEN = data.access_token;
        
        reply.type('text/html').send(`
          <html><body style="font-family:sans-serif;padding:40px">
            <h1>✅ Shopify Connected!</h1>
            <p>Access token received. You can close this tab.</p>
            <pre style="background:#f5f5f5;padding:10px;border-radius:5px">${data.access_token.substring(0, 20)}...</pre>
          </body></html>
        `);
      } else {
        console.error('Token exchange failed:', data);
        reply.type('text/html').send(`
          <html><body style="font-family:sans-serif;padding:40px">
            <h1>❌ Token Exchange Failed</h1>
            <pre>${JSON.stringify(data, null, 2)}</pre>
            <p>Error: ${data.error_description || data.message || 'Unknown error'}</p>
          </body></html>
        `);
      }
    } catch (err: any) {
      console.error('Token exchange error:', err.message);
      reply.code(500).send({ error: err.message });
    }
  } else {
    const error = request.query?.error_description || request.query?.error || 'No code received';
    console.error('❌ OAuth callback error:', error);
    reply.type('text/html').send(`
      <html><body style="font-family:sans-serif;padding:40px">
        <h1>❌ OAuth Error</h1>
        <p>${error}</p>
      </body></html>
    `);
  }
});

// GET /api/shopify/token - Report the current token status
fastify.get('/api/shopify/token', async () => {
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  return {
    connected: !!token,
    tokenPrefix: token ? token.substring(0, 10) + '...' : null,
    message: token ? 'Token available' : 'No token yet — visit the authorize URL to connect'
  };
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

// ===== Shopify Webhook: orders/create → CJ Fulfillment =====
// CJ v2 API flow (verified 2026-08-11 from official docs):
//   1. GET  /api2.0/v1/product/query?productSku=<sku>  → variants[0].vid
//   2. POST /api2.0/v1/logistic/freightCalculate        → logisticName
//   3. POST /api2.0/v1/shopping/order/createOrder       → place order
const CJ_API_BASE = 'https://developers.cjdropshipping.com';
const CJ_API_KEY = process.env.CJ_API_KEY || '';

async function cjAuth(): Promise<string> {
  if (!CJ_API_KEY) throw new Error('CJ_API_KEY env var is required for CJ fulfillment');
  const authResp = await fetch(`${CJ_API_BASE}/api2.0/v1/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: CJ_API_KEY }),
  });
  const authData: any = await authResp.json();
  if (authData.code !== 200) throw new Error(`CJ auth failed: ${authData.message}`);
  return authData.data.accessToken;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// CJ API QPS limit is 1 request/second (429: "QPS limit is 1 time/1second").
// Pace calls >=1.3s apart and retry transient 429s with backoff.
async function cjCall(token: string, path: string, init?: RequestInit, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(1500 * Math.pow(2, i - 1)); // 1.5s, 3s, 6s
    const resp = await fetch(`${CJ_API_BASE}${path}`, {
      ...init,
      headers: { ...(init?.headers || {}), 'CJ-Access-Token': token },
    });
    if (resp.status === 429) {
      console.warn(`⚠️ CJ rate limited (429) on ${path}, retry ${i + 1}/${attempts}`);
      continue;
    }
    const data: any = await resp.json();
    if (data?.code === 429 || data?.code === '429') continue;
    return data;
  }
  return { code: 429, message: 'Too Many Requests after retries', data: null };
}

async function cjGet(token: string, path: string) {
  return cjCall(token, path);
}

async function cjPost(token: string, path: string, payload: any) {
  return cjCall(token, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

fastify.post('/api/webhooks/shopify/orders', async (request: any, reply: any) => {
  try {
    const order = request.body;
    console.log('📦 Order webhook received:', order?.id || 'unknown');

    // Extract line items with SKUs (Shopify SKUs == CJ product SKUs)
    const lineItems = order?.line_items || [];
    if (!lineItems.length) {
      return reply.code(200).send({ status: 'no_items' });
    }

    const items = lineItems
      .map((item: any) => ({ sku: item.sku || '', quantity: item.quantity || 1 }))
      .filter((p: any) => p.sku);

    if (!items.length) {
      return reply.code(200).send({ status: 'no_sku_products' });
    }

    const shippingAddr = order.shipping_address || order.billing_address || {};
    const customerName = shippingAddr.name
      || `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim()
      || 'Customer';

    const token = await cjAuth();

    // Step 1: Resolve each SKU → CJ variant id (vid) via /product/query
    // CJ QPS limit is 1/s — pace the calls and skip items that fail to resolve.
    const cjProducts: { vid: string; quantity: number }[] = [];
    for (const [idx, item] of items.entries()) {
      if (idx > 0) await sleep(1300);
      const query: any = await cjGet(token, `/api2.0/v1/product/query?productSku=${encodeURIComponent(item.sku)}`);
      const variants = query?.data?.variants || [];
      if (!variants.length) {
        console.warn(`⚠️ No CJ variant found for SKU ${item.sku}:`, query?.message || query);
        continue;
      }
      cjProducts.push({ vid: variants[0].vid, quantity: item.quantity });
    }
    if (!cjProducts.length) {
      return reply.code(200).send({ status: 'no_cj_variants' });
    }

    // Step 2: Get a valid logisticName for the destination (retry handled by cjPost)
    let logisticName = '';
    try {
      const freight: any = await cjPost(token, '/api2.0/v1/logistic/freightCalculate', {
        startCountryCode: 'CN',
        endCountryCode: shippingAddr.country_code || 'US',
        products: cjProducts,
      });
      if (freight?.data?.length) {
        logisticName = freight.data[0].logisticName;
      } else {
        console.warn('⚠️ Freight calc returned no logistic:', freight?.message || JSON.stringify(freight));
      }
    } catch (e: any) {
      console.warn('⚠️ Freight calc failed:', e.message);
    }

    if (!logisticName) {
      // Never place an order with a made-up logistic name — CJ rejects it (1605001).
      return reply.code(200).send({ status: 'freight_unavailable', orderNumber: `ASC-${order.id || Date.now()}` });
    }

    // Step 3: Place the order (sandbox=0 for real orders; set 1 to test without charges)
    const orderNumber = `ASC-${order.id || Date.now()}`;
    const cjOrderPayload = {
      orderNumber,
      shippingZip: shippingAddr.zip || '',
      shippingCountryCode: shippingAddr.country_code || 'US',
      shippingCountry: shippingAddr.country || shippingAddr.country_code || 'United States',
      shippingProvince: shippingAddr.province || shippingAddr.state || '',
      shippingCity: shippingAddr.city || '',
      shippingAddress: shippingAddr.address1 || '',
      shippingCustomerName: customerName,
      shippingPhone: shippingAddr.phone || order.customer?.phone || '',
      fromCountryCode: 'CN',
      logisticName,
      isSandbox: process.env.CJ_SANDBOX === '1' ? 1 : 0,
      products: cjProducts,
    };

    console.log('📤 Forwarding to CJ:', JSON.stringify(cjOrderPayload, null, 2));
    const cjData: any = await cjPost(token, '/api2.0/v1/shopping/order/createOrder', cjOrderPayload);
    console.log('✅ CJ order response:', cjData);

    return reply.code(200).send({ status: 'forwarded', orderNumber, cj_response: cjData });
  } catch (err: any) {
    console.error('❌ Webhook error:', err.message);
    return reply.code(500).send({ status: 'error', message: err.message });
  }
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
