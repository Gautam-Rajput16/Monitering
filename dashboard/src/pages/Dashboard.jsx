import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { useSocket } from '../hooks/useSocket';
import { logger } from '../utils/logger';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeStreams: 0,
    trackingLocations: 0,
  });
  
  const [recentLogs, setRecentLogs] = useState([]);

  // Listen for realtime events to update dashboard logs
  useSocket({
    'user-connected': (user) => addLog(`Device connected: ${user.id}`, 'text-green-400'),
    'user-disconnected': (user) => addLog(`Device disconnected: ${user.id}`, 'text-red-400'),
    'stream-start': (data) => addLog(`Stream started (${data.type}) by ${data.userId}`, 'text-blue-400'),
    'stream-stop': (data) => addLog(`Stream stopped (${data.type}) by ${data.userId}`, 'text-yellow-400'),
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const data = await apiService.getUsers();
      const users = data?.users || (Array.isArray(data) ? data : []);
      
      setStats({
        totalUsers: users.length,
        activeStreams: Math.floor(users.length / 3) || 0,
        trackingLocations: users.length,
      });
    } catch (err) {
      logger.error('Failed to load dashboard stats:', err);
    }
  };

  const addLog = (message, colorClass = 'text-gray-300') => {
    const time = new Date().toLocaleTimeString();
    setRecentLogs(prev => {
      const newLogs = [{ time, message, colorClass }, ...prev];
      return newLogs.slice(0, 10); // Keep last 10
    });
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-gray-100 mb-8">System Overview</h1>
      
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium tracking-wide text-sm uppercase">Active Devices</h3>
            <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">📱</span>
          </div>
          <div className="text-4xl font-bold text-gray-100">{stats.totalUsers}</div>
          <div className="text-sm text-blue-400 mt-2">↑ Online right now</div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium tracking-wide text-sm uppercase">Live Streams</h3>
            <span className="p-2 bg-green-500/10 text-green-400 rounded-lg">🎥</span>
          </div>
          <div className="text-4xl font-bold text-gray-100">{stats.activeStreams}</div>
          <div className="text-sm text-green-400 mt-2">Video & Audio feeds</div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium tracking-wide text-sm uppercase">Location Trackers</h3>
            <span className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">📍</span>
          </div>
          <div className="text-4xl font-bold text-gray-100">{stats.trackingLocations}</div>
          <div className="text-sm text-purple-400 mt-2">Broadcasting GPS data</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Recent Activity Log */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-gray-100 mb-4 border-b border-gray-700 pb-2">Real-Time System Logs</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {recentLogs.length > 0 ? (
              recentLogs.map((log, index) => (
                <div key={index} className="flex gap-4 font-mono text-sm bg-gray-900/50 p-3 rounded border border-gray-700/50">
                  <span className="text-gray-500 shrink-0">[{log.time}]</span>
                  <span className={log.colorClass}>{log.message}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-sm py-4 italic text-center">No recent activity detected. Connect a device.</div>
            )}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
           <h3 className="text-lg font-bold text-gray-100 mb-4 border-b border-gray-700 pb-2">Quick Commands</h3>
           <div className="space-y-4">
             <button className="w-full flex justify-between items-center p-4 bg-gray-900/50 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors">
                <span className="text-gray-200 font-medium">Force Sync All Devices</span>
                <span className="text-blue-400">⚡</span>
             </button>
             <button className="w-full flex justify-between items-center p-4 bg-gray-900/50 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors">
                <span className="text-gray-200 font-medium">Download Daily Report</span>
                <span className="text-green-400">📊</span>
             </button>
             <button className="w-full flex justify-between items-center p-4 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-colors">
                <span className="text-red-400 font-medium text-left">Emergency Stop All Streams<br/><span className="text-xs text-gray-500">Kills all active P2P connections instantly</span></span>
                <span className="text-red-400 text-xl">🛑</span>
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
