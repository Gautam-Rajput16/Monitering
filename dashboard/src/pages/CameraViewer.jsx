import React, { useState, useEffect } from 'react';
import { useStreams } from '../hooks/useStreams';
import VideoPlayer from '../components/VideoPlayer';
import { apiService } from '../services/apiService';
import { logger } from '../utils/logger';

const CameraViewer = () => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Utilize our custom stream hook
  const { stream, error } = useStreams(selectedUserId, 'camera');

  useEffect(() => {
    fetchActiveUsers();
  }, []);

  const fetchActiveUsers = async () => {
    try {
      const activeUsers = await apiService.getUsers();
      if (Array.isArray(activeUsers)) setUsers(activeUsers);
    } catch (err) {
      logger.error('Failed fetching users for camera view:', err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Camera Stream Viewer</h1>
        <div className="flex gap-4 items-center">
            <span className="text-gray-400 text-sm">Select User:</span>
            <select 
              className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none"
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="" disabled>-- Select Device --</option>
              {users.map(u => (
                 <option key={u.id} value={u.id}>{u.name || u.id}</option>
              ))}
            </select>
            <button onClick={fetchActiveUsers} className="p-2 bg-gray-800 rounded border border-gray-700 hover:bg-gray-700">
               🔄
            </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Stream Window */}
        <div className="col-span-1 lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-4">
           {selectedUserId ? (
             <div className="space-y-4">
               <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${stream ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                    Live Feed • {users.find(u => u.id === selectedUserId)?.name || selectedUserId}
                  </h3>
                  {error && <span className="text-red-400 text-sm">{error}</span>}
               </div>
               
               <div className="rounded-lg overflow-hidden border border-gray-900 shadow-xl bg-black min-h-[50vh]">
                 <VideoPlayer stream={stream} isMirror={false} />
               </div>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500">
                <span className="text-4xl mb-4">📹</span>
                <p>Select a user from the dropdown to initiate WebRTC connection</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default CameraViewer;
