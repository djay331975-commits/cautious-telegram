import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { CJAdapter, ShopifyAdapter } from '@autostream/integration-sdk';
import { PrismaClient } from '@prisma/client';

import { getRedisConnection } from '../utils/redis';

const prisma = new PrismaClient();
const connection = getRedisConnection();

const cjAdapter = new CJAdapter();

export const fulfillmentWorker = new Worker(
  'fulfillment-task',
  async (job: Job) => {
    const { orderId } = job.data;
    console.log(`Processing fulfillment for order: ${orderId}`);

    // 1. Fetch Order and Store Details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: true,
        items: true,
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // 2. Authenticate with CJ (using env vars or store-specific settings)
    const cjEmail = process.env.CJ_EMAIL || '';
    const cjApiKey = process.env.CJ_API_KEY || '';

    if (!cjEmail || !cjApiKey) {
      console.warn('CJ Credentials missing, skipping real fulfillment');
      return;
    }

    await cjAdapter.authenticate(cjEmail, cjApiKey);

    // 3. Create Order on CJ
    console.log(`Creating CJ order for external order: ${order.externalOrderId}`);
    const cjOrderResponse = await cjAdapter.createOrder({
      recipientName: order.customerName,
      address: order.shippingAddress || '',
      city: '', // Extract from address if needed
      province: '',
      countryCode: '',
      zip: '',
      phone: '',
      products: order.items.map(item => ({
        sku: item.sku,
        quantity: item.quantity,
      })),
    });

    if (cjOrderResponse.result) {
      const cjOrderId = cjOrderResponse.data.orderId;
      console.log(`CJ Order created: ${cjOrderId}`);

      // 4. Update Order Status in DB
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PROCESSING',
          cjOrderId: cjOrderId,
        },
      });

      // 5. Pay for Order (Optional auto-pay logic)
      // await cjAdapter.payOrder(cjOrderId);

      // 6. Update Shopify with Fulfillment info
      if (order.store.platform === 'Shopify') {
        const shopify = new ShopifyAdapter({
          shopName: order.store.name.toLowerCase().replace(/\s+/g, '-'),
          accessToken: order.store.accessToken,
          baseUrl: process.env.SHOPIFY_MOCK_BASE_URL,
        });

        try {
          await shopify.fulfillOrder(order.externalOrderId, 'mock-location-id', {
            number: `TRACK-${cjOrderId}`,
            company: 'CJ Dropshipping',
          });
          console.log(`Successfully updated Shopify fulfillment for order ${order.id}`);
        } catch (err: any) {
          console.error(`Failed to update Shopify fulfillment: ${err.message}`);
          // Don't fail the whole job if only Shopify update fails, or handle accordingly
        }
      }
    } else {
      console.error(`Failed to create CJ order: ${cjOrderResponse.message}`);
      throw new Error(`CJ Order Creation Failed: ${cjOrderResponse.message}`);
    }
  },
  { connection, concurrency: 2 }
);

fulfillmentWorker.on('completed', (job) => {
  console.log(`Fulfillment job ${job.id} completed.`);
});

fulfillmentWorker.on('failed', (job, err) => {
  console.error(`Fulfillment job ${job?.id} failed: ${err.message}`);
});
