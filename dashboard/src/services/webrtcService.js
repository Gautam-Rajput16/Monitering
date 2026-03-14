import socketService from './socketService';
import { logger } from '../utils/logger';

class WebRTCService {
  constructor() {
    this.peerConnections = new Map(); // Map of userId -> RTCPeerConnection
    this.streams = new Map();         // Map of userId -> MediaStream
    this.onStreamCallbacks = new Map(); // Callbacks when stream is added
  }

  // Register callback to update UI when a stream arrives
  onStream(userId, callback) {
    if (!this.onStreamCallbacks.has(userId)) {
      this.onStreamCallbacks.set(userId, new Set());
    }
    this.onStreamCallbacks.get(userId).add(callback);
    
    // If stream already exists, trigger callback immediately
    if (this.streams.has(userId)) {
      callback(this.streams.get(userId));
    }
  }

  offStream(userId, callback) {
    if (this.onStreamCallbacks.has(userId)) {
      this.onStreamCallbacks.get(userId).delete(callback);
    }
  }

  // Configuration for ICE servers (STUN/TURN)
  get rtcConfig() {
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
        // In production, add paid TURN servers here
      ],
      iceCandidatePoolSize: 10,
    };
  }

  createPeerConnection(userId, isAudioOnly = false) {
    if (this.peerConnections.has(userId)) {
      logger.webrtc(`Cleaning up existing connection for ${userId}`);
      this.closeConnection(userId);
    }

    logger.webrtc(`Creating new PeerConnection for ${userId}`);
    const pc = new RTCPeerConnection(this.rtcConfig);
    
    this.peerConnections.set(userId, pc);

    // Provide direction: Admin Dashboard is strictly a RECEIVED (Viewer)
    // We do not send local tracks out.
    pc.addTransceiver(isAudioOnly ? 'audio' : 'video', { direction: 'recvonly' });
    if (!isAudioOnly) {
        pc.addTransceiver('audio', { direction: 'recvonly' });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send our ICE candidate to the backend, so the mobile app can connect
        socketService.emit('ice-candidate', {
          targetUserId: userId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      logger.webrtc(`Stream track received from ${userId}`, event.streams[0]);
      const stream = event.streams[0];
      this.streams.set(userId, stream);
      
      // Notify UI
      if (this.onStreamCallbacks.has(userId)) {
        this.onStreamCallbacks.get(userId).forEach(cb => cb(stream));
      }
    };

    pc.onconnectionstatechange = () => {
      logger.webrtc(`Connection state for ${userId}: ${pc.connectionState}`);
      if (['disconnected', 'default', 'failed', 'closed'].includes(pc.connectionState)) {
         this.closeConnection(userId);
      }
    };

    return pc;
  }

  async handleOffer(offerData, isAudioOnly = false) {
    const { fromUserId, offer, sessionId } = offerData;
    try {
      logger.webrtc(`Handling WebRTC Offer from ${fromUserId}`, { sessionId });
      const pc = this.createPeerConnection(fromUserId, isAudioOnly);
      
      // The offer object contains { type, sdp }
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send Answer back through backend to mobile
      socketService.emit('webrtc-answer', {
        targetUserId: fromUserId,
        answer: {
          type: pc.localDescription.type,
          sdp: pc.localDescription.sdp
        },
        sessionId,
      });
      logger.webrtc(`Sent WebRTC Answer to ${fromUserId}`);
      
    } catch (error) {
      logger.error(`Error handling offer from ${fromUserId}:`, error);
    }
  }

  async handleIceCandidate(candidateData) {
    const { fromUserId, candidate, sessionId } = candidateData;
    const pc = this.peerConnections.get(fromUserId);
    if (!pc) {
      logger.warn(`Received ICE candidate for ${fromUserId} but no PeerConnection exists.`);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      logger.webrtc(`Added remote ICE candidate from ${fromUserId}`);
    } catch (error) {
      logger.error(`Error adding ICE candidate from ${fromUserId}:`, error);
    }
  }

  closeConnection(userId) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      // Send a signal to other peer if possible? Usually stream-stop handles it.
      pc.close();
      this.peerConnections.delete(userId);
    }
    
    // Clear Stream output
    this.streams.delete(userId);
    if (this.onStreamCallbacks.has(userId)) {
      this.onStreamCallbacks.get(userId).forEach(cb => cb(null)); // notify subscribers of disconnect
    }
    logger.webrtc(`Closed peer connection for ${userId}`);
  }

  clearAllConnections() {
    this.peerConnections.forEach((pc, userId) => this.closeConnection(userId));
  }
}

// Singleton
export const webrtcService = new WebRTCService();
export default webrtcService;
