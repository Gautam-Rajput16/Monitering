/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    useWebRTC HOOK                             ║
 * ║  Manages WebRTC peer connections for streaming features       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import webrtcService from '../services/webrtcService';
import socketService, {
  emitStreamStart,
  emitStreamStop,
  emitWebRTCOffer,
  emitICECandidate,
} from '../services/socketService';
import { STREAM_TYPES } from '../config/constants';
import logger from '../utils/logger';

const useWebRTC = () => {
  const { state, dispatch, ACTIONS } = useApp();
  const cleanupRefs = useRef([]);

  /**
   * Start a media stream (camera/audio/screen).
   * Full lifecycle: permission → capture → peer connection → offer → socket
   * @param {string} streamType — 'camera' | 'screen' | 'audio'
   * @returns {Promise<MediaStream|null>} local stream for preview
   */
  const startStream = useCallback(
    async (streamType) => {
      try {
        logger.stream(`Starting ${streamType} stream`);

        // 1. Notify backend — create session
        const sessionId = await new Promise((resolve, reject) => {
          emitStreamStart(streamType, (ack) => {
            if (ack?.success) {
              resolve(ack.sessionId);
            } else {
              reject(new Error(ack?.message || 'Failed to start stream session'));
            }
          });

          // Timeout after 10 seconds
          setTimeout(() => reject(new Error('Stream start timeout')), 10000);
        });

        logger.stream(`Session created: ${sessionId}`);

        // 2. Capture media
        let localStream;
        switch (streamType) {
          case STREAM_TYPES.CAMERA:
            localStream = await webrtcService.getCameraStream();
            break;
          case STREAM_TYPES.AUDIO:
            localStream = await webrtcService.getAudioStream();
            break;
          case STREAM_TYPES.SCREEN:
            localStream = await webrtcService.getScreenStream();
            break;
          default:
            throw new Error(`Unknown stream type: ${streamType}`);
        }

        // 3. Create peer connection
        webrtcService.createPeerConnection(streamType, {
          onIceCandidate: (candidate) => {
            // Send ICE candidates to all admins via socket
            // The backend will route to the correct admin
            emitICECandidate({
              targetUserId: 'admin', // Backend routes based on session
              candidate,
              sessionId,
            });
          },
          onConnectionStateChange: (connectionState) => {
            logger.stream(`${streamType} connection: ${connectionState}`);
            if (connectionState === 'failed' || connectionState === 'disconnected') {
              logger.warn(`${streamType} connection ${connectionState}`);
            }
          },
        });

        // 4. Add tracks to peer connection
        webrtcService.addMediaTracks(streamType, localStream);

        // 5. Create and send offer
        const offer = await webrtcService.createOffer(streamType);

        // Send offer to admins (backend will relay to admin dashboard)
        emitWebRTCOffer({
          targetUserId: 'admin',
          offer,
          streamType,
          sessionId,
        });

        // Store cleanup refs — these were session-specific, but now we use global listeners
        // cleanupRefs.current.push(unsubAnswer, unsubIce, unsubIceBatch);

        // 8. Update global state
        dispatch({
          type: ACTIONS.SET_STREAM_ACTIVE,
          payload: { streamType, sessionId },
        });

        return localStream;
      } catch (error) {
        logger.error(`Failed to start ${streamType} stream`, error.message);
        throw error;
      }
    },
    [dispatch, ACTIONS]
  );

  /**
   * Stop a media stream and clean up resources.
   * @param {string} streamType
   */
  const stopStream = useCallback(
    async (streamType) => {
      try {
        const sessionId = state.streams[streamType]?.sessionId;

        // Close WebRTC connection and stop tracks
        webrtcService.closePeerConnection(streamType);

        // Notify backend
        if (sessionId) {
          emitStreamStop(sessionId, (ack) => {
            if (ack?.success) {
              logger.stream(`Stream session ${sessionId} stopped on backend`);
            }
          });
        }

        // Clean up socket listeners
        cleanupRefs.current.forEach((unsub) => unsub?.());
        cleanupRefs.current = [];

        // Update global state
        dispatch({
          type: ACTIONS.SET_STREAM_INACTIVE,
          payload: { streamType },
        });

        logger.stream(`${streamType} stream stopped`);
      } catch (error) {
        logger.error(`Failed to stop ${streamType} stream`, error.message);
      }
    },
    [state.streams, dispatch, ACTIONS]
  );

  /**
   * Stop all active streams.
   */
  const stopAllStreams = useCallback(async () => {
    const streamTypes = Object.keys(state.streams);
    for (const type of streamTypes) {
      if (state.streams[type]?.active) {
        await stopStream(type);
      }
    }
  }, [state.streams, stopStream]);

  // ── Remote Stream Requests ──────────────────────────────────
  useEffect(() => {
    const unsub = socketService.onStreamRequest((data) => {
      const { streamType } = data;
      logger.stream(`Remote stream request received: ${streamType}`);
      startStream(streamType).catch((err) => {
        logger.error(`Failed to handle remote stream request: ${err.message}`);
      });
    });

    return () => unsub?.();
  }, [startStream]);

  // ── Standardized Signaling ──────────────────────────────────
  useEffect(() => {
    // Override existing listeners to support standardized fromUserId
    const unsubAnswer = socketService.onWebRTCAnswer((data) => {
      // Backend standard: { fromUserId, answer, sessionId }
      const activeSession = Object.entries(state.streams).find(([_, s]) => s.sessionId === data.sessionId);
      if (activeSession) {
        webrtcService.handleAnswer(activeSession[0], data.answer);
      }
    });

    const unsubIce = socketService.onICECandidate((data) => {
      const activeSession = Object.entries(state.streams).find(([_, s]) => s.sessionId === data.sessionId);
      if (activeSession) {
        webrtcService.addIceCandidate(activeSession[0], data.candidate);
      }
    });

    const unsubIceBatch = socketService.onICECandidatesBatch((data) => {
      const activeSession = Object.entries(state.streams).find(([_, s]) => s.sessionId === data.sessionId);
      if (activeSession) {
        data.candidates.forEach((candidate) => {
          webrtcService.addIceCandidate(activeSession[0], candidate);
        });
      }
    });

    cleanupRefs.current.push(unsubAnswer, unsubIce, unsubIceBatch);

    return () => {
      unsubAnswer?.();
      unsubIce?.();
      unsubIceBatch?.();
    };
  }, [state.streams]); // Update when sessions change

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      cleanupRefs.current.forEach((unsub) => unsub?.());
      webrtcService.closeAllConnections();
    };
  }, []);
  return {
    streams: state.streams,
    startStream,
    stopStream,
    stopAllStreams,
    getLocalStream: webrtcService.getLocalStream,
  };
};

export default useWebRTC;
