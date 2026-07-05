import React, { useEffect, useState } from 'react';
import { 
  Search, 
  TrendingUp, 
  ArrowUpRight, 
  ExternalLink, 
  Plus,
  Filter,
  ArrowRight
} from 'lucide-react';
import { fetchNiches, fetchTrendingProducts } from '../utils/api';

const NicheCard: React.FC<{ 
  name: string; 
  score: number; 
  status: string 
}> = ({ name, score, status }) => (
  <div className="bg-white p-6 rounded-xl border shadow-sm hover:border-blue-300 transition-colors cursor-pointer group">
    <div className="flex justify-between items-start mb-4">
      <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{name}</h3>
      <TrendingUp size={18} className={score > 90 ? "text-green-500" : "text-blue-500"} />
    </div>
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500 font-medium">Growth Score</span>
          <span className="text-blue-600 font-bold">{score}/100</span>
        </div>
        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-blue-500 h-full rounded-full" 
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
      <div className="flex justify-between items-center pt-2">
        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{status}</span>
        <button className="text-xs text-blue-600 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
          Details <ArrowRight size={12} />
        </button>
      </div>
    </div>
  </div>
);

const Discovery: React.FC = () => {
  const [niches, setNiches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchNiches(), fetchTrendingProducts()]).then(([nData, pData]) => {
      setNiches(nData);
      setProducts(pData);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Trends...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header with Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Trend Discovery</h2>
          <p className="text-sm text-gray-500">Real-time market insights and product opportunities.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search niches..." 
              className="pl-10 pr-4 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-sm"
            />
          </div>
          <button className="p-2 bg-white border rounded-lg text-gray-600 hover:bg-gray-50 shadow-sm">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Niche Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {niches.map(niche => (
          <NicheCard key={niche.id} {...niche} />
        ))}
      </div>

      {/* Trending Products Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-gray-800 font-semibold">Trending Products (Top Matches)</h3>
          <span className="text-xs text-gray-400 font-medium italic">Showing matches for your active stores</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Niche</th>
                <th className="px-6 py-4">Platform</th>
                <th className="px-6 py-4">Growth</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-800">{product.name}</div>
                    <div className="text-xs text-gray-400">${product.price} Est. Cost</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-medium border border-blue-100">
                      {product.niche}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      {product.platform} <ExternalLink size={12} />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-green-600 font-bold">+{product.growth}%</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors">
                      <Plus size={14} /> Add to Store
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Discovery;
