import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuthenticationError, RateLimitError, IntegrationError, NotFoundError } from '../errors';

export interface ShopifyConfig {
  shopName: string;
  accessToken: string;
  apiVersion?: string;
  baseUrl?: string;
}

export class ShopifyClient {
  private client: AxiosInstance;

  constructor(config: ShopifyConfig) {
    const apiVersion = config.apiVersion || '2024-01';
    const baseURL = config.baseUrl || `https://${config.shopName}.myshopify.com/admin/api/${apiVersion}`;
    
    this.client = axios.create({
      baseURL,
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const status = error.response.status;
          if (status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            throw new RateLimitError('Shopify rate limit exceeded', retryAfter ? parseInt(retryAfter, 10) : undefined);
          }
          if (status === 401) {
            throw new AuthenticationError('Invalid Shopify access token');
          }
          if (status === 404) {
            throw new NotFoundError('Shopify resource not found');
          }
          throw new IntegrationError(`Shopify API error: ${error.message}`, status);
        }
        throw new IntegrationError(`Shopify network error: ${error.message}`);
      }
    );
  }

  async get<T>(path: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(path, { params });
    return response.data;
  }

  async post<T>(path: string, data: any): Promise<T> {
    const response = await this.client.post<T>(path, data);
    return response.data;
  }

  async put<T>(path: string, data: any): Promise<T> {
    const response = await this.client.put<T>(path, data);
    return response.data;
  }

  async delete<T>(path: string): Promise<T> {
    const response = await this.client.delete<T>(path);
    return response.data;
  }
}
