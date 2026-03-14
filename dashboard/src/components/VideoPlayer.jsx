import React, { useRef, useEffect, memo } from 'react';

const VideoPlayer = memo(({ stream, isMirror = false }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${isMirror ? 'scale-x-[-1]' : ''}`}
      />
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          Waiting for video stream...
        </div>
      )}
    </div>
  );
});

export default VideoPlayer;
