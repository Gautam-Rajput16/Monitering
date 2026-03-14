import { useEffect, useState } from 'react';
import socketService from '../services/socketService';

export const useSocket = (eventMap) => {
  const [isConnected, setIsConnected] = useState(socketService.isConnected);

  useEffect(() => {
    // Built-in handlers for connection state
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const unsubscribers = [];

    // Always listen to connection changes dynamically
    unsubscribers.push(socketService.on('connect', handleConnect));
    unsubscribers.push(socketService.on('disconnect', handleDisconnect));

    // Listen to component specific events passed in `eventMap`
    if (eventMap) {
      Object.entries(eventMap).forEach(([event, callback]) => {
        if (typeof callback === 'function') {
           const unsub = socketService.on(event, callback);
           unsubscribers.push(unsub);
        }
      });
    }

    // Cleanup all registered listeners on component unmount
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [eventMap]);

  return { isConnected, emit: socketService.emit.bind(socketService) };
};
