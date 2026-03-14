import React, { useState, useEffect, useRef } from 'react';
import { useStreams } from '../hooks/useStreams';
import { apiService } from '../services/apiService';
import { logger } from '../utils/logger';

const ScreenViewer = () => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  // Utilize our custom stream hook for the 'screen' type
  const { stream, error } = useStreams(selectedUserId, 'screen');

  useEffect(() => {
    fetchActiveUsers();
  }, []);

  useEffect(() => {
    // Bind the WebRTC stream to the video element manually to allow standard DOM interactions (like fullscreen)
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const fetchActiveUsers = async () => {
    try {
      const data = await apiService.getUsers();
      const activeUsers = data?.users || (Array.isArray(data) ? data : []);
      setUsers(activeUsers);
    } catch (err) {
      logger.error('Failed fetching users for screen view:', err);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        logger.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Screen Share Viewer</h1>
        
        <div className="flex gap-4 items-center">
            <span className="text-gray-400 text-sm">Select User:</span>
            <select 
              className="bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none"
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="" disabled>-- Select Device --</option>
              {users.map(u => (
                 <option key={u.userId || u.id} value={u.userId || u.id}>{u.name || u.email || u.userId}</option>
              ))}
            </select>
            <button onClick={fetchActiveUsers} className="p-2 bg-gray-800 rounded border border-gray-700 hover:bg-gray-700">
               🔄
            </button>
        </div>
      </div>
 
      <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col">
         {selectedUserId ? (
           <div className="flex-1 flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                 <h3 className="text-lg font-medium text-white flex items-center gap-2">
                   <span className={`w-2 h-2 rounded-full ${stream ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                   Target: {users.find(u => (u.userId || u.id) === selectedUserId)?.email || selectedUserId}
                 </h3>
                
                <div className="flex items-center gap-4">
                  {error && <span className="text-red-400 text-sm">{error}</span>}
                  <button 
                    onClick={toggleFullscreen}
                    disabled={!stream}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
                  >
                    <span>📺</span> Fullscreen
                  </button>
                </div>
             </div>
             
             {/* Player Container */}
             <div 
               ref={containerRef}
               className="flex-1 rounded-lg overflow-hidden border border-gray-900 shadow-xl bg-black relative flex items-center justify-center min-h-0"
             >
                {stream ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="max-w-full max-h-full object-contain"
                    />
                ) : (
                    <div className="text-gray-500 flex flex-col items-center">
                       <span className="text-4xl mb-4 text-blue-500/50 animate-pulse">📡</span>
                       <p>Awaiting screen stream connection...</p>
                    </div>
                )}
             </div>
           </div>
         ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <span className="text-4xl mb-4">💻</span>
              <p>Select a user from the dropdown to initiate Screen Share</p>
           </div>
         )}
      </div>
    </div>
  );
};

export default ScreenViewer;
