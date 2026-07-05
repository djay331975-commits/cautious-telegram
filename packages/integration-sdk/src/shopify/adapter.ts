import { ShopifyClient, ShopifyConfig } from './client';
import { BaseProduct, BaseOrder } from '../types';

export class ShopifyAdapter {
  private client: ShopifyClient;

  constructor(config: ShopifyConfig) {
    this.client = new ShopifyClient(config);
  }

  async getProducts(): Promise<BaseProduct[]> {
    const data = await this.client.get<{ products: any[] }>('products.json');
    return data.products.map((p) => ({
      id: p.id.toString(),
      title: p.title,
      description: p.body_html,
      price: parseFloat(p.variants[0]?.price || '0'),
      sku: p.variants[0]?.sku,
      images: p.images.map((img: any) => img.src),
    }));
  }

  async createProduct(product: Partial<BaseProduct>): Promise<BaseProduct> {
    const data = await this.client.post<{ product: any }>('products.json', {
      product: {
        title: product.title,
        body_html: product.description,
        variants: [
          {
            price: product.price?.toString(),
            sku: product.sku,
          },
        ],
        images: product.images?.map((src) => ({ src })),
      },
    });
    const p = data.product;
    return {
      id: p.id.toString(),
      title: p.title,
      description: p.body_html,
      price: parseFloat(p.variants[0]?.price || '0'),
      sku: p.variants[0]?.sku,
      images: p.images.map((img: any) => img.src),
    };
  }

  async getOrders(): Promise<BaseOrder[]> {
    const data = await this.client.get<{ orders: any[] }>('orders.json', { status: 'any' });
    return data.orders.map((o) => ({
      id: o.id.toString(),
      customerName: `${o.customer?.first_name} ${o.customer?.last_name}`,
      shippingAddress: {
        address1: o.shipping_address?.address1,
        city: o.shipping_address?.city,
        country: o.shipping_address?.country,
        zip: o.shipping_address?.zip,
      },
      items: o.line_items.map((item: any) => ({
        sku: item.sku,
        quantity: item.quantity,
        price: parseFloat(item.price),
      })),
      status: o.financial_status,
    }));
  }

  async fulfillOrder(orderId: string, locationId: string, trackingInfo?: { number: string; company: string }): Promise<void> {
    // Note: In recent Shopify API versions, fulfillment is a bit more complex (FulfillmentOrder)
    // This is a simplified version using the older Fulfillment REST API for MVP purposes
    await this.client.post(`orders/${orderId}/fulfillments.json`, {
      fulfillment: {
        location_id: locationId,
        tracking_number: trackingInfo?.number,
        tracking_company: trackingInfo?.company,
      },
    });
  }
}
