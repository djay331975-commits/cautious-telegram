import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Play, 
  Pause, 
  RefreshCw,
  Search,
  ChevronRight,
  Database
} from 'lucide-react';
import { fetchWorkersStatus } from '../utils/api';

const Workers: React.FC = () => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkersStatus().then(data => {
      setWorkers(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Workers...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Automation Engine</h2>
        <p className="text-sm text-gray-500">Monitor and manage background worker processes.</p>
      </div>

      {/* Worker Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {workers.map((worker) => (
          <div key={worker.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`${worker.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'} p-2 rounded-lg`}>
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">{worker.name}</h3>
                  <p className="text-[10px] text-gray-400 font-mono">{worker.queue}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                worker.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
              }`}>
                {worker.status}
              </span>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-400">In Queue</p>
                <p className="text-lg font-bold text-gray-800">{worker.jobs}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Processed</p>
                <p className="text-lg font-bold text-gray-800">{worker.processed}</p>
              </div>
              <div className="col-span-2 pt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-400">Success Rate</span>
                  <span className="text-xs font-semibold text-gray-700">
                    {worker.processed > 0 ? ((worker.processed / (worker.processed + worker.failed)) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-green-500 h-full rounded-full" 
                    style={{ width: worker.processed > 0 ? `${(worker.processed / (worker.processed + worker.failed)) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-3 flex justify-around border-t">
              <button className="text-gray-400 hover:text-blue-600 transition-colors">
                <Play size={16} />
              </button>
              <button className="text-gray-400 hover:text-orange-600 transition-colors">
                <Pause size={16} />
              </button>
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Failure Log */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center bg-white">
          <h3 className="text-gray-800 font-semibold">Automation Error Log</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200">
              Clear Logs
            </button>
          </div>
        </div>
        <div className="divide-y">
          {[
            { id: 'job-1234', worker: 'Listing Worker', error: 'Shopify API Rate Limit Exceeded', time: '5 mins ago' },
            { id: 'job-1235', worker: 'Discovery Worker', error: 'Connection Timeout (Amazon API)', time: '12 mins ago' },
            { id: 'job-1236', worker: 'Listing Worker', error: 'Missing Image URL for Product #99', time: '45 mins ago' },
          ].map((log, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                  <AlertCircle size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{log.error}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase">{log.worker}</span>
                  </div>
                  <p className="text-xs text-gray-400">Job ID: {log.id} • {log.time}</p>
                </div>
              </div>
              <button className="p-2 text-gray-400 hover:text-blue-600">
                <ChevronRight size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Workers;
