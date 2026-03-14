import React from 'react';
import StatusIndicator from './StatusIndicator';
import { useSocket } from '../hooks/useSocket';

const Navbar = () => {
  const { isConnected } = useSocket();

  return (
    <nav className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
      <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
        SPY Admin
      </div>
      <div>
        <StatusIndicator 
          isActive={isConnected} 
          label={isConnected ? 'Connected to Server' : 'Disconnected'} 
        />
      </div>
    </nav>
  );
};

export default Navbar;
