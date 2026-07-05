import React, { useEffect, useState } from 'react';
import { 
  Store, 
  Package, 
  Settings, 
  Shield, 
  Key, 
  RefreshCw,
  Plus,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { fetchStores } from '../utils/api';

const Configuration: React.FC = () => {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStores().then(data => {
      setStores(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Configuration...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Store Configuration</h2>
          <p className="text-sm text-gray-500">Manage your platform integrations and automation rules.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={18} /> Add New Store
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stores List */}
        <div className="lg:col-span-2 space-y-6">
          {stores.map((store) => (
            <div key={store.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                    <Store size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{store.name}</h3>
                    <p className="text-sm text-gray-400">{store.platform} • {store.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <CheckCircle2 size={12} /> {store.status}
                  </span>
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white">
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Total Products</p>
                  <p className="text-xl font-bold text-gray-800">{store.productCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Last Sync</p>
                  <p className="text-sm font-medium text-gray-600">{new Date(store.lastSync).toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-end">
                  <button className="text-sm text-blue-600 font-semibold hover:underline flex items-center gap-1">
                    Configure <ExternalLink size={14} />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t flex gap-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Shield size={14} className="text-gray-400" /> Secure API Connection
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <RefreshCw size={14} className="text-gray-400" /> Real-time Sync Active
                </div>
              </div>
            </div>
          ))}
          
          <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <div className="mx-auto w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 mb-4">
              <Plus size={24} />
            </div>
            <h4 className="text-gray-600 font-semibold">Connect another store</h4>
            <p className="text-sm text-gray-400 mt-1">Expand your reach to Amazon or eBay</p>
          </div>
        </div>

        {/* Global Settings Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-gray-800 font-bold mb-4 flex items-center gap-2">
              <Settings size={18} className="text-blue-500" /> Automation Rules
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Auto-approve niches', desc: 'Approve trending niches with score > 90', active: true },
                { label: 'Inventory Sync', desc: 'Sync with Printful every 15 mins', active: true },
                { label: 'AI Copywriting', desc: 'Auto-generate SEO listings', active: true },
                { label: 'Global Pricing', desc: 'Maintain 30% margin across all stores', active: false },
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`mt-1 w-10 h-5 rounded-full relative transition-colors ${rule.active ? 'bg-blue-500' : 'bg-gray-200'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${rule.active ? 'left-6' : 'left-1'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">{rule.label}</p>
                    <p className="text-xs text-gray-400">{rule.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:bg-gray-900 transition-colors">
              Save Global Rules
            </button>
          </div>

          <div className="bg-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={20} />
              <h3 className="font-bold">Pro Plan Active</h3>
            </div>
            <p className="text-sm text-blue-100 mb-4">You have 3 / 10 stores connected. Upgrade for unlimited stores and priority support.</p>
            <button className="w-full py-2 bg-white text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors">
              View Plans
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuration;
