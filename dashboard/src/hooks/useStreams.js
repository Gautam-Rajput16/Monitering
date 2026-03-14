import { useState, useEffect } from 'react';
import webrtcService from '../services/webrtcService';
import { useSocket } from './useSocket';

export const useStreams = (userId, type = 'camera') => {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  // Hook into socket events to trigger WebRTC lifecycle
  const { emit } = useSocket({
    'webrtc-offer': (data) => {
       // Filter offers by the target user ID and stream type 
       // If the backend passes track type in the socket data, verify it here.
       // Defaulting to only handling offers for our selected user.
       if (data.userId === userId) {
         webrtcService.handleOffer(data, type === 'audio');
       }
    },
    'webrtc-answer': (data) => {
       // As receivers we usually only send answers, but if we sent an offer, we handle answers here
    },
    'ice-candidate': (data) => {
       if (data.userId === userId) {
          webrtcService.handleIceCandidate(data);
       }
    },
    'stream-stop': (data) => {
       if (data.userId === userId && data.type === type) {
          webrtcService.closeConnection(userId);
       }
    }
  });

  useEffect(() => {
    if (!userId) return;

    const handleStreamUpdate = (newStream) => {
       setStream(newStream);
    };

    // Subscribe to UI updates
    webrtcService.onStream(userId, handleStreamUpdate);

    // On mount, ask backend to request a stream from the mobile app
    // The backend should tell mobile to send an offer
    emit('stream-start', { userId, type });

    return () => {
      webrtcService.offStream(userId, handleStreamUpdate);
      webrtcService.closeConnection(userId);
      emit('stream-stop', { userId, type });
      setStream(null);
    };
  }, [userId, type, emit]);

  return { stream, error };
};
