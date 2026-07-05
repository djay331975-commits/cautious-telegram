import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuthenticationError, RateLimitError, IntegrationError, NotFoundError } from '../errors';

export interface PrintfulConfig {
  accessToken: string;
}

export class PrintfulClient {
  private client: AxiosInstance;

  constructor(config: PrintfulConfig) {
    this.client = axios.create({
      baseURL: 'https://api.printful.com',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const status = error.response.status;
          if (status === 429) {
            // Printful provides rate limit info in headers if needed
            throw new RateLimitError('Printful rate limit exceeded');
          }
          if (status === 401) {
            throw new AuthenticationError('Invalid Printful access token');
          }
          if (status === 404) {
            throw new NotFoundError('Printful resource not found');
          }
          throw new IntegrationError(`Printful API error: ${error.message}`, status);
        }
        throw new IntegrationError(`Printful network error: ${error.message}`);
      }
    );
  }

  async get<T>(path: string, params?: any): Promise<T> {
    const response = await this.client.get<{ result: T }>(path, { params });
    return response.data.result;
  }

  async post<T>(path: string, data: any): Promise<T> {
    const response = await this.client.post<{ result: T }>(path, data);
    return response.data.result;
  }
}
