import React, { useEffect, useState } from 'react';
import { 
  ShoppingBag, 
  Truck, 
  Search, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { fetchOrders } from '../utils/api';

const statusIcons: Record<string, any> = {
  'PENDING': Clock,
  'PROCESSING': RefreshCcw,
  'SHIPPED': Truck,
  'DELIVERED': CheckCircle2,
  'CANCELLED': AlertTriangle
};

const statusColors: Record<string, string> = {
  'PENDING': 'text-yellow-600 bg-yellow-50 border-yellow-100',
  'PROCESSING': 'text-blue-600 bg-blue-50 border-blue-100',
  'SHIPPED': 'text-purple-600 bg-purple-50 border-purple-100',
  'DELIVERED': 'text-green-600 bg-green-50 border-green-100',
  'CANCELLED': 'text-red-600 bg-red-50 border-red-100'
};

// Internal utility for icon rendering since RefreshCcw wasn't in the map above properly
import { RefreshCcw } from 'lucide-react';

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders().then(data => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  const filteredOrders = orders.filter(order => 
    order.externalOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.trackingNumber && order.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ShoppingBag className="text-purple-600" /> Order Tracking
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search Order ID, Customer, Tracking..."
            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-80"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Store</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">CJ Tracking</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredOrders.map((order) => {
              const Icon = statusIcons[order.status] || Clock;
              return (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-gray-900">{order.externalOrderId}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{order.customerName}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{order.storeName}</td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold w-fit ${statusColors[order.status] || 'text-gray-500 bg-gray-50'}`}>
                      <Icon size={12} />
                      {order.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">${order.totalPrice.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    {order.trackingNumber ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono text-gray-600">{order.trackingNumber}</span>
                        <ExternalLink size={12} className="text-blue-500 cursor-pointer" />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No tracking yet</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
