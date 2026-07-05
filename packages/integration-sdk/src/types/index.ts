export interface BaseProduct {
  id: string;
  title: string;
  description?: string;
  price: number;
  sku?: string;
  images: string[];
}

export interface BaseOrder {
  id: string;
  customerName: string;
  shippingAddress: {
    address1: string;
    city: string;
    country: string;
    zip: string;
  };
  items: BaseOrderItem[];
  status: string;
}

export interface BaseOrderItem {
  sku: string;
  quantity: number;
  price: number;
}
