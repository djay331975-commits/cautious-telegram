import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Store, 
  ShoppingBag, 
  Package,
  MoreVertical,
  RefreshCcw,
  ArrowRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { fetchStats } from '../utils/api';

const StatsCard: React.FC<{ 
  title: string; 
  value: string | number; 
  change: string; 
  icon: any; 
  color: string 
}> = ({ title, value, change, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-xl border shadow-sm">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
        <p className={`text-xs mt-2 font-medium ${change.includes('^') ? 'text-green-600' : 'text-gray-400'}`}>
          {change}
        </p>
      </div>
      <div className={`${color} p-3 rounded-lg text-white`}>
        <Icon size={20} />
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats().then(data => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total GMV"
          value={`$${stats.gmv.toLocaleString()}`}
          change="+12.5% ^"
          icon={TrendingUp}
          color="bg-blue-500"
        />
        <StatsCard
          title="Active Stores"
          value={stats.activeStores}
          change="Healthy"
          icon={Store}
          color="bg-green-500"
        />
        <StatsCard
          title="Total Orders"
          value={stats.orders.toLocaleString()}
          change="+5% ^"
          icon={ShoppingBag}
          color="bg-purple-500"
        />
        <StatsCard
          title="Active Products"
          value={stats.activeProducts.toLocaleString()}
          change="Live Listings"
          icon={Package}
          color="bg-orange-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-gray-800 font-semibold mb-6">Performance Trends (GMV)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="gmv" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  dot={{ r: 4 }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-gray-800 font-semibold mb-6">Store Sales Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.storeDistribution.map((d: any) => ({ name: d.name, sales: d.value }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-gray-800 font-semibold">Recent Automation Activity</h3>
          <button className="text-sm text-blue-600 font-medium flex items-center gap-1">
            View All <ArrowRight size={14} />
          </button>
        </div>
        <div className="divide-y">
          {[
            { time: '14:32', msg: 'Product "Bamboo Brush" synced to Shopify', store: 'EcoStream Home', type: 'sync' },
            { time: '13:15', msg: 'New trend signal detected in "Health & Wellness" niche', store: 'Global', type: 'discovery' },
            { time: '12:05', msg: 'Order #4421 fulfilled via Printful API', store: 'EcoStream Home', type: 'order' },
          ].map((item, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-400 font-mono">{item.time}</span>
                <span className="text-sm text-gray-700">{item.msg}</span>
              </div>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{item.store}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
