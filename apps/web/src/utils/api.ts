const API_URL = '';

export async function fetchStats() {
  const res = await fetch(`${API_URL}/api/stats`);
  return res.json();
}

export async function fetchStores() {
  const res = await fetch(`${API_URL}/api/stores`);
  return res.json();
}

export async function fetchNiches() {
  const res = await fetch(`${API_URL}/api/discovery/niches`);
  return res.json();
}

export async function fetchTrendingProducts() {
  const res = await fetch(`${API_URL}/api/discovery/products`);
  return res.json();
}

export async function fetchWorkersStatus() {
  const res = await fetch(`${API_URL}/api/workers/status`);
  return res.json();
}

export async function fetchInventory() {
  const res = await fetch(`${API_URL}/api/inventory`);
  return res.json();
}

export async function fetchOrders() {
  const res = await fetch(`${API_URL}/api/orders`);
  return res.json();
}

export async function updateProductStatus(id: string, status: string) {
  const res = await fetch(`${API_URL}/api/inventory/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return res.json();
}
