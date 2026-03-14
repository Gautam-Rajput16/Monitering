import React, { useState, useEffect, useRef } from 'react';
import { useStreams } from '../hooks/useStreams';
import { apiService } from '../services/apiService';
import { logger } from '../utils/logger';

// Extracted separate component for individual audio feeds
const AudioPlayerCard = ({ user }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef(null);
  const userId = user.userId || user.id;

  // Use the hook to connect audio stream for this specific user
  // This triggers stream-start implicitly on mount
  const { stream, error } = useStreams(isPlaying ? userId : null, 'audio');

  useEffect(() => {
    if (audioRef.current) {
      if (stream) {
        audioRef.current.srcObject = stream;
        audioRef.current.play().catch(e => logger.error('Audio play failed', e));
      } else {
        audioRef.current.srcObject = null;
      }
    }
  }, [stream]);

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-blue-500/50 transition-colors flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-xl">
            🎙️
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-gray-200 truncate">{user.name || user.email || 'Unknown User'}</h3>
            <p className="text-xs text-gray-400 font-mono truncate" title={userId}>ID: {userId.slice(0, 8)}...</p>
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full shrink-0 ${stream ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} title={stream ? 'Live' : 'Offline'} />
      </div>

      <div className="space-y-4">
        {/* Play/Stop Button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`w-full py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
            isPlaying 
              ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isPlaying ? (
            <><span>⏹</span> Stop Listening</>
          ) : (
            <><span>▶</span> Start Listening</>
          )}
        </button>

        {/* Volume Control */}
        {isPlaying && (
          <div className="flex items-center gap-3 bg-gray-900/50 p-2 rounded-lg">
            <span className="text-gray-400 text-sm">🔈</span>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer range-sm outline-none" 
            />
            <span className="text-gray-400 text-sm">🔊</span>
          </div>
        )}

        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} autoPlay />
    </div>
  );
};

const AudioMonitor = () => {
  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await apiService.getUsers();
      const users = data?.users || (Array.isArray(data) ? data : []);
      setActiveUsers(users);
    } catch (err) {
      logger.error('Failed fetching users for audio monitor', err);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Audio Stream Monitor</h1>
          <p className="text-gray-400 text-sm mt-1">Listen to realtime microphone feeds</p>
        </div>
        <button onClick={fetchUsers} className="p-2 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors">
            🔄 Refresh List
        </button>
      </div>
      
      {activeUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-800 rounded-xl border border-gray-700 text-gray-400">
          <span className="text-4xl mb-3">📴</span>
          <p>No active users found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {activeUsers.map(user => (
             <AudioPlayerCard key={user.userId || user.id} user={user} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AudioMonitor;
