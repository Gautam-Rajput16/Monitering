/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    WEBRTC SERVICE                             ║
 * ║  WebRTC peer connection lifecycle for media streaming         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * This service handles:
 *  • Peer connection creation with ICE servers
 *  • Media track attachment (camera, audio, screen)
 *  • SDP offer/answer exchange
 *  • ICE candidate trickle
 *  • Connection cleanup
 */

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from 'react-native-webrtc';
import { ICE_SERVERS, STREAM_TYPES } from '../config/constants';
import logger from '../utils/logger';

// ─── Active peer connections (one per stream type) ──────────────
const peerConnections = new Map();
const localStreams = new Map();

/**
 * Create a new RTCPeerConnection for a given stream type.
 * @param {string} streamType — 'camera' | 'screen' | 'audio'
 * @param {{ onIceCandidate, onConnectionStateChange, onTrack }} callbacks
 * @returns {RTCPeerConnection}
 */
export const createPeerConnection = (streamType, callbacks = {}) => {
  // Close existing connection for this type if any
  closePeerConnection(streamType);

  const pc = new RTCPeerConnection({
    iceServers: ICE_SERVERS,
  });

  // ── ICE candidate handler ─────────────────────────────────────
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      logger.stream(`ICE candidate (${streamType})`, {
        type: event.candidate.type,
      });
      callbacks.onIceCandidate?.(event.candidate);
    }
  };

  // ── Connection state change ───────────────────────────────────
  pc.onconnectionstatechange = () => {
    logger.stream(`Connection state (${streamType}): ${pc.connectionState}`);
    callbacks.onConnectionStateChange?.(pc.connectionState);
  };

  // ── ICE connection state change ───────────────────────────────
  pc.oniceconnectionstatechange = () => {
    logger.stream(`ICE state (${streamType}): ${pc.iceConnectionState}`);

    if (pc.iceConnectionState === 'failed') {
      logger.warn(`ICE connection failed for ${streamType}, attempting restart`);
      pc.restartIce?.();
    }
  };

  // ── Track received (remote) ───────────────────────────────────
  pc.ontrack = (event) => {
    logger.stream(`Remote track received (${streamType})`, {
      kind: event.track.kind,
    });
    callbacks.onTrack?.(event);
  };

  peerConnections.set(streamType, pc);
  logger.stream(`Peer connection created (${streamType})`);
  return pc;
};

/**
 * Get the camera media stream (front camera).
 * @returns {Promise<MediaStream>}
 */
export const getCameraStream = async () => {
  try {
    const stream = await mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 24 },
      },
    });
    localStreams.set(STREAM_TYPES.CAMERA, stream);
    logger.stream('Camera stream acquired');
    return stream;
  } catch (error) {
    logger.error('Failed to get camera stream', error.message);
    throw error;
  }
};

/**
 * Get the microphone audio stream.
 * @returns {Promise<MediaStream>}
 */
export const getAudioStream = async () => {
  try {
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    localStreams.set(STREAM_TYPES.AUDIO, stream);
    logger.stream('Audio stream acquired');
    return stream;
  } catch (error) {
    logger.error('Failed to get audio stream', error.message);
    throw error;
  }
};

/**
 * Get display media (screen share).
 * Uses Android MediaProjection via WebRTC's getDisplayMedia.
 * @returns {Promise<MediaStream>}
 */
export const getScreenStream = async () => {
  try {
    const stream = await mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    localStreams.set(STREAM_TYPES.SCREEN, stream);
    logger.stream('Screen share stream acquired');
    return stream;
  } catch (error) {
    logger.error('Failed to get screen stream', error.message);
    throw error;
  }
};

/**
 * Add media tracks from a stream to the peer connection.
 * @param {string} streamType
 * @param {MediaStream} stream
 */
export const addMediaTracks = (streamType, stream) => {
  const pc = peerConnections.get(streamType);
  if (!pc) {
    logger.error(`No peer connection for ${streamType}`);
    return;
  }

  stream.getTracks().forEach((track) => {
    pc.addTrack(track, stream);
    logger.stream(`Track added (${streamType}): ${track.kind}`);
  });
};

/**
 * Create an SDP offer for a given stream type.
 * @param {string} streamType
 * @returns {Promise<RTCSessionDescription>}
 */
export const createOffer = async (streamType) => {
  const pc = peerConnections.get(streamType);
  if (!pc) throw new Error(`No peer connection for ${streamType}`);

  const offer = await pc.createOffer({
    offerToReceiveAudio: streamType === STREAM_TYPES.AUDIO,
    offerToReceiveVideo:
      streamType === STREAM_TYPES.CAMERA || streamType === STREAM_TYPES.SCREEN,
  });

  await pc.setLocalDescription(offer);
  logger.stream(`Offer created (${streamType})`);
  return offer;
};

/**
 * Handle an incoming SDP answer.
 * @param {string} streamType
 * @param {object} answer
 */
export const handleAnswer = async (streamType, answer) => {
  const pc = peerConnections.get(streamType);
  if (!pc) {
    logger.error(`No peer connection for ${streamType} to handle answer`);
    return;
  }

  await pc.setRemoteDescription(new RTCSessionDescription(answer));
  logger.stream(`Answer set (${streamType})`);
};

/**
 * Add an incoming ICE candidate.
 * @param {string} streamType
 * @param {object} candidate
 */
export const addIceCandidate = async (streamType, candidate) => {
  const pc = peerConnections.get(streamType);
  if (!pc) return;

  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    logger.error(`Failed to add ICE candidate (${streamType})`, error.message);
  }
};

/**
 * Close and clean up a peer connection.
 * @param {string} streamType
 */
export const closePeerConnection = (streamType) => {
  // Stop local media tracks
  const stream = localStreams.get(streamType);
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
      logger.stream(`Track stopped (${streamType}): ${track.kind}`);
    });
    localStreams.delete(streamType);
  }

  // Close peer connection
  const pc = peerConnections.get(streamType);
  if (pc) {
    pc.close();
    peerConnections.delete(streamType);
    logger.stream(`Peer connection closed (${streamType})`);
  }
};

/**
 * Close all active peer connections and streams.
 */
export const closeAllConnections = () => {
  for (const streamType of peerConnections.keys()) {
    closePeerConnection(streamType);
  }
  logger.stream('All connections closed');
};

/**
 * Get the local stream for a given type (for preview).
 * @param {string} streamType
 */
export const getLocalStream = (streamType) => localStreams.get(streamType);

export default {
  createPeerConnection,
  getCameraStream,
  getAudioStream,
  getScreenStream,
  addMediaTracks,
  createOffer,
  handleAnswer,
  addIceCandidate,
  closePeerConnection,
  closeAllConnections,
  getLocalStream,
};
