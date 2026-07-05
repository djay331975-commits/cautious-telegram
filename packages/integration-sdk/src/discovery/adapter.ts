import { BaseProduct } from '../types';
import { CJAdapter } from '../fulfillment/cj-adapter';

export interface TrendSignal {
  platform: 'Amazon' | 'Shopify' | 'TikTok' | 'GoogleTrends' | 'CJ';
  title: string;
  growth: number;
  estimatedMonthlySales?: number;
  externalUrl?: string;
  price?: number;
}

export class DiscoveryAdapter {
  constructor() {}

  async fetchTrendingItems(niche: string, cjAdapter?: CJAdapter): Promise<TrendSignal[]> {
    // 1. Fetch from mock/external sources (Amazon/Google simulated)
    const mockData: Record<string, TrendSignal[]> = {
      'Sustainable Living': [
        { platform: 'Amazon', title: 'Reusable Beeswax Wraps', growth: 25, estimatedMonthlySales: 1500, price: 14.99 },
        { platform: 'TikTok', title: 'Bamboo Toothbrushes', growth: 40, estimatedMonthlySales: 5000, price: 9.99 },
        { platform: 'Amazon', title: 'Glass Food Storage', growth: 15, estimatedMonthlySales: 800, price: 45.00 },
      ],
      'Home Office': [
        { platform: 'Amazon', title: 'Ergonomic Desk Lamp', growth: 24, estimatedMonthlySales: 2100, price: 45.99 },
        { platform: 'GoogleTrends', title: 'Standing Desk Converter', growth: 12, estimatedMonthlySales: 1200, price: 120.00 },
      ]
    };

    const signals = mockData[niche] || [
      { platform: 'Amazon', title: `${niche} Trending Item 1`, growth: 10, estimatedMonthlySales: 100, price: 19.99 },
      { platform: 'Shopify', title: `${niche} Trending Item 2`, growth: 5, estimatedMonthlySales: 50, price: 29.99 },
    ];

    // 2. Real Integration: Search CJ Dropshipping if adapter is provided
    if (cjAdapter) {
      try {
        const cjProducts = await cjAdapter.listProducts({ productName: niche, pageSize: 3 });
        if (cjProducts.result && cjProducts.data.list) {
          const cjSignals: TrendSignal[] = cjProducts.data.list.map((p: any) => ({
            platform: 'CJ',
            title: p.productName,
            growth: Math.floor(Math.random() * 30) + 10, // Simulated growth for CJ items
            estimatedMonthlySales: Math.floor(Math.random() * 1000),
            price: parseFloat(p.productPrice),
            externalUrl: `https://app.cjdropshipping.com/product-detail.html?id=${p.pid}`
          }));
          signals.push(...cjSignals);
        }
      } catch (err) {
        console.warn('CJ Discovery Search failed:', err);
      }
    }

    return signals;
  }
}
