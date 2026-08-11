import axios, { AxiosInstance } from 'axios';

export interface CJAccessTokenResponse {
  code: number;
  result: boolean;
  message: string;
  data: {
    accessToken: string;
    accessTokenExpiry: number;
  };
}

export interface CJOrderPayload {
  fromCountryCode: string;
  recipientName: string;
  address: string;
  city: string;
  province: string;
  countryCode: string;
  zip: string;
  phone: string;
  products: {
    sku: string;
    quantity: number;
  }[];
}

export class CJAdapter {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private baseUrl = 'https://developers.cjdropshipping.com';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async authenticate(email: string, apiKey: string): Promise<string> {
    try {
      // Determine auth payload format:
      // If apiKey contains '@api@', it's the combined format (apiKey mode) — send only apiKey field
      // Otherwise, send both email and apiKey (legacy format)
      const payload: Record<string, string> = apiKey.includes('@api@')
        ? { apiKey }
        : { email, apiKey };

      const response = await this.client.post<CJAccessTokenResponse>('/api2.0/v1/authentication/getAccessToken', payload);

      if (response.data && response.data.code === 200 && response.data.result) {
        this.accessToken = response.data.data.accessToken;
        this.client.defaults.headers.common['CJ-Access-Token'] = this.accessToken;
        return this.accessToken;
      } else {
        throw new Error(`CJ Authentication failed: ${response.data?.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('CJ Auth Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async listProducts(params: { categoryId?: string; productName?: string; pageNum?: number; pageSize?: number }) {
    const response = await this.client.get('/api2.0/v1/product/list', { params });
    return response.data;
  }

  async getProductDetails(pid: string) {
    const response = await this.client.get('/api2.0/v1/product/details', { params: { pid } });
    return response.data;
  }

  async createOrder(orderData: CJOrderPayload) {
    const response = await this.client.post('/api2.0/v1/shopping/order/createOrder', orderData);
    return response.data;
  }

  async payOrder(orderId: string) {
    const response = await this.client.post('/api2.0/v1/order/pay', { orderId });
    return response.data;
  }

  async getTrackingNumber(orderId: string) {
    const response = await this.client.get('/api2.0/v1/order/getTrackingNumber', { params: { orderId } });
    return response.data;
  }

  async getFreight(params: {
    startCountryCode?: string;
    endCountryCode: string;
    quantity: number;
    pid: string;
  }) {
    const response = await this.client.post('/api2.0/v1/logistic/getFreight', params);
    return response.data;
  }
}
