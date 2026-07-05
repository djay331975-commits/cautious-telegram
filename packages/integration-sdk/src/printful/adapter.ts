import { PrintfulClient, PrintfulConfig } from './client';
import { BaseProduct, BaseOrder } from '../types';

export class PrintfulAdapter {
  private client: PrintfulClient;

  constructor(config: PrintfulConfig) {
    this.client = new PrintfulClient(config);
  }

  async getCatalogProducts(): Promise<BaseProduct[]> {
    const data = await this.client.get<any[]>('products');
    return data.map((p) => ({
      id: p.id.toString(),
      title: p.model || p.type || 'Unknown Product',
      price: 0,
      images: [p.image],
    }));
  }

  async createOrder(order: BaseOrder): Promise<any> {
    return await this.client.post('orders', {
      recipient: {
        name: order.customerName,
        address1: order.shippingAddress.address1,
        city: order.shippingAddress.city,
        country_code: order.shippingAddress.country,
        zip: order.shippingAddress.zip,
      },
      items: order.items.map((item) => ({
        sync_variant_id: item.sku, // Printful uses variant IDs
        quantity: item.quantity,
      })),
    });
  }

  async getOrderStatus(orderId: string): Promise<string> {
    const data = await this.client.get<any>(`orders/${orderId}`);
    return data.status;
  }
}
