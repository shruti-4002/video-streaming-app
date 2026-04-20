import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const VideoPlayer = ({ src, onReady }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!src) return;

  
    const initPlayer = () => {
      if (!videoRef.current) return;

      
      if (playerRef.current) {
        playerRef.current.dispose();
      }

      const player = videojs(videoRef.current, {
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: true,
        html5: {
          vhs: { overrideNative: true }
        },
        sources: [{
          src: src,
          type: 'application/x-mpegURL'
        }]
      }, () => {
        console.log("VIDEOJS_NODE_READY");
        if (onReady) onReady();
      });

      playerRef.current = player;
    };

    const timeout = setTimeout(initPlayer, 100);

    return () => {
      clearTimeout(timeout);
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src]);

  return (
    <div style={{ width: '100%', height: '100%', background: '#000' }}>
      <div data-vjs-player style={{ width: '100%', height: '100%' }}>
        <video ref={videoRef} className="video-js vjs-big-play-centered vjs-matrix-theme" />
      </div>
      <style>{`
        .vjs-matrix-theme { background: #000; color: #0f0; }
        .vjs-matrix-theme .vjs-big-play-button { background: rgba(0,255,0,0.1); border-color: #0f0; }
        .vjs-matrix-theme .vjs-control-bar { background: rgba(0,20,0,0.9); }
        .vjs-matrix-theme .vjs-play-progress { background: #0f0; }
        .video-js.vjs-fluid { height: 100% !important; padding-top: 0 !important; }
      `}</style>
    </div>
  );
};

export default VideoPlayer;