import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

export function registerMockShopify(fastify: FastifyInstance, prisma: PrismaClient) {
  // Mock Products API
  fastify.get('/mock/shopify/admin/api/:version/products.json', async (request, reply) => {
    const products = await prisma.product.findMany();
    return {
      products: products.map(p => ({
        id: p.id,
        title: p.title,
        body_html: p.description,
        variants: [
          {
            id: `v-${p.id}`,
            price: p.price.toString(),
            sku: p.sku,
          }
        ],
        images: (p.listingImageUrls || '').split('|').filter(Boolean).map(url => ({ src: url })),
      }))
    };
  });

  fastify.post('/mock/shopify/admin/api/:version/products.json', async (request: any, reply) => {
    const { product } = request.body;
    // For E2E testing, we can either save to the real Product table or just return a success
    // Let's save it so the dashboard shows it
    const newProduct = await prisma.product.create({
      data: {
        externalId: `mock-${Date.now()}`,
        title: product.title,
        description: product.body_html,
        price: parseFloat(product.variants?.[0]?.price || '0'),
        sku: product.variants?.[0]?.sku,
        status: 'PUBLISHED',
        storeId: 'mock-store-id', // We should probably pass this or find a default
      }
    });

    return {
      product: {
        id: newProduct.id,
        title: newProduct.title,
        body_html: newProduct.description,
        variants: [
          {
            id: `v-${newProduct.id}`,
            price: newProduct.price.toString(),
            sku: newProduct.sku,
          }
        ],
        images: [],
      }
    };
  });

  // Mock Orders API
  fastify.get('/mock/shopify/admin/api/:version/orders.json', async (request, reply) => {
    const orders = await prisma.order.findMany({
      include: { items: true }
    });

    return {
      orders: orders.map(o => ({
        id: o.id,
        customer: {
          first_name: o.customerName.split(' ')[0],
          last_name: o.customerName.split(' ').slice(1).join(' '),
          email: o.customerEmail,
        },
        shipping_address: JSON.parse(o.shippingAddress || '{}'),
        line_items: o.items.map(item => ({
          id: item.id,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price.toString(),
        })),
        financial_status: o.status === 'PENDING' ? 'pending' : 'paid',
      }))
    };
  });

  // Mock Fulfillment API
  fastify.post('/mock/shopify/admin/api/:version/orders/:orderId/fulfillments.json', async (request: any, reply) => {
    const { orderId } = request.params;
    const { fulfillment } = request.body;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'SHIPPED',
        trackingNumber: fulfillment.tracking_number,
      }
    });

    return {
      fulfillment: {
        id: `f-${Date.now()}`,
        status: 'success',
        tracking_number: fulfillment.tracking_number,
        tracking_company: fulfillment.tracking_company,
      }
    };
  });
}
