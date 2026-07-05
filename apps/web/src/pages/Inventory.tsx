import React, { useEffect, useState } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  ExternalLink,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { fetchInventory, updateProductStatus } from '../utils/api';

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerms] = useState('');

  const loadInventory = () => {
    setLoading(true);
    fetchInventory().then(data => {
      setInventory(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    await updateProductStatus(id, newStatus);
    loadInventory();
  };

  const filteredInventory = inventory.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Inventory...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Package className="text-blue-600" /> Inventory Management
        </h2>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search products or SKU..."
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerms(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">
            <Filter size={18} /> Filter
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Store</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredInventory.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{item.title}</span>
                    <span className="text-xs text-gray-400">ID: {item.externalId}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{item.sku}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{item.storeName}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    item.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 
                    item.status === 'FAILED_QC' ? 'bg-red-100 text-red-700' : 
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${item.stockLevel < 10 ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                      {item.stockLevel}
                    </span>
                    {item.stockLevel < 10 && <AlertCircle size={14} className="text-red-500" />}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">${item.price.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {item.status === 'DRAFT' && (
                      <>
                        <button 
                          onClick={() => handleStatusUpdate(item.id, 'PUBLISHED')}
                          className="text-green-600 hover:text-green-800 transition-colors p-1" 
                          title="Approve & Publish"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(item.id, 'FAILED_QC')}
                          className="text-red-600 hover:text-red-800 transition-colors p-1" 
                          title="Reject (Failed QC)"
                        >
                          <XCircle size={18} />
                        </button>
                      </>
                    )}
                    <button className="text-blue-600 hover:text-blue-800 transition-colors p-1" title="View in Shopify">
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredInventory.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No products found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;
