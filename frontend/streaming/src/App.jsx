import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import VideoPlayer from './VideoPlayer';
import BinaryRain from './BinaryRain';

const socket = io('http://localhost:8000');

const App = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState([]);
  const [activeTab, setActiveTab] = useState('gallery');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [statusMsg, setStatusMsg] = useState("AWAITING_SIGNAL...");
  const [isRetrieving, setIsRetrieving] = useState(false);

  const toastStyle = { background: '#000', color: '#0f0', border: '1px solid #0f0', fontFamily: 'monospace' };


  const generateThumbnail = (videoFile) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      video.src = URL.createObjectURL(videoFile);
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        video.currentTime = 1; 
      };

      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL("image/jpeg");
        URL.revokeObjectURL(video.src);
        resolve(base64Image);
      };

      video.onerror = () => reject("THUMBNAIL_GEN_FAILED");
    });
  };

  useEffect(() => {
    socket.on("connect", () => console.log("CONNECTED_TO_MATRIX"));
    socket.on("statusUpdate", (data) => {
      setStatusMsg(data.message);
      if (data.status === "COMPLETED") {
        setLoading(false);
        fetchVideos();
        toast.success("CORE_SYNC_COMPLETED", { style: toastStyle });
      }
    });
    return () => socket.off("statusUpdate");
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await axios.get('http://localhost:8000/video/all-videos');
      setVideos(res.data);
    } catch (err) { console.error("OFFLINE"); }
  };

  useEffect(() => { fetchVideos(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.warn("AWAITING_SOURCE...", { style: toastStyle });

    
    const MAX_SIZE = 30 * 1024 * 1024; // 30MB
    if (file.size > MAX_SIZE) {
      toast.error(`FILE_REJECTED: MAX 30MB ALLOWED. YOURS: ${(file.size / (1024*1024)).toFixed(2)}MB`, { style: toastStyle });
      return;
    }

    setLoading(true);
    setStatusMsg("GENERATING_THUMBNAIL_DATA...");
    
    try {
      
      const thumbnailData = await generateThumbnail(file);

      // 2. Request S3 URL with FileSize
      setStatusMsg("MATRIX_HANDSHAKE: Requesting S3 Access...");
      const { data } = await axios.post('http://localhost:8000/video/get-presigned-url', { 
        fileName: file.name, 
        fileType: file.type,
        fileSize: file.size 
      });

      // 3. Put to S3
      setStatusMsg("S3_PUSH: Streaming raw data packets...");
      await axios.put(data.url, file, { headers: { 'Content-Type': file.type } });

      // 4. Final Sync Signal
      setStatusMsg("SYNC_SIGNAL: Registering in Database...");
      await axios.post('http://localhost:8000/video/upload-complete', { 
        fileName: file.name, 
        key: data.key,
        thumbnailData: thumbnailData 
      });

      toast.info("UPLOAD_SUCCESS: Processing Initiated", { style: toastStyle });
      setFile(null);
    } catch (err) {
      console.error(err);
      setLoading(false);
      setStatusMsg(err.response?.data?.message || "CRITICAL_UPLOAD_ERROR");
      toast.error(err.response?.data?.error || "PROTOCOL_FAILED", { style: toastStyle });
    }
  };

  const handleVideoSelect = (vid) => {
    if (vid.status === 'COMPLETED') {
      setIsRetrieving(true);
      setSelectedVideo(vid.videoUrl);
    } else {
      toast.info(`NODE_BUSY: ${vid.status}`, { style: toastStyle });
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#0f0', fontFamily: 'monospace', position: 'relative' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, opacity: 0.5 }}>
        <BinaryRain />
      </div>
      
      <ToastContainer position="top-center" theme="dark" /> 
      
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <div style={styles.logo}>V-STREAM_CORE // 2.0</div>
          <div style={styles.tabs}>
            <button onClick={() => setActiveTab('gallery')} style={{...styles.tabBtn, color: activeTab === 'gallery' ? '#fff' : '#0f0'}}>[ REGISTRY ]</button>
            <button onClick={() => setActiveTab('upload')} style={{...styles.tabBtn, color: activeTab === 'upload' ? '#fff' : '#0f0'}}>[ UPLOAD ]</button>
          </div>
        </div>
      </nav>

      <main style={styles.main}>
        {activeTab === 'upload' ? (
          <div style={styles.card}>
            <h2 style={{letterSpacing: '5px'}}>SYSTEM_UPLOAD</h2>
            <div style={styles.progressBox}>
               <div className="blink" style={styles.statusText}>{" > "} {statusMsg}</div>
               {loading && <div className="loader-line"></div>}
            </div>
            <form onSubmit={handleUpload}>
              <label style={styles.drop}>
                <input type="file" accept="video/mp4" onChange={(e) => setFile(e.target.files[0])} style={{display: 'none'}} />
                <span>{file ? `[READY]: ${file.name}` : " >> SELECT PACKET SOURCE"}</span>
              </label>
              <button disabled={loading} style={styles.btn}>{loading ? "PROCESSING..." : "EXECUTE_UPLOAD"}</button>
            </form>
          </div>
        ) : (
          <div style={styles.grid}>
            <div style={styles.sidebar}>
              <h4 style={styles.sidebarHeader}>NETWORK_NODES</h4>
              <div style={styles.scrollArea}>
                {videos.map((vid) => (
                  <div key={vid._id} 
                    onClick={() => handleVideoSelect(vid)}
                    style={{...styles.nodeItem, background: selectedVideo === vid.videoUrl ? 'rgba(0,255,0,0.1)' : 'transparent', borderColor: selectedVideo === vid.videoUrl ? '#0f0' : '#003300'}}>
                    <img src={vid.thumbnailUrl || 'https://via.placeholder.com/60x35/000/0f0?text=...'} alt="t" style={styles.thumb} />
                    <div style={{fontSize: '11px', flex: 1}}>
                      {vid.title} <br/>
                      <span style={{color: vid.status === 'COMPLETED' ? '#0f0' : '#ff0'}}>[{vid.status}]</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={styles.monitor}>
                 <div style={{fontSize: '10px', color: '#0f0', marginBottom: '5px'}}>[ BACKEND_MONITOR ]</div>
                 <div className="blink" style={{fontSize: '9px', color: '#fff'}}>{">"} {statusMsg}</div>
              </div>
            </div>

            <div style={styles.playerWrapper}>
              {selectedVideo ? (
                <VideoPlayer key={selectedVideo} src={selectedVideo} onReady={() => setIsRetrieving(false)} />
              ) : (
                <div style={styles.placeholder}>AWAITING_SIGNAL_INPUT...</div>
              )}
              {isRetrieving && <div style={styles.overlay}>RETRIEVING_FROM_CLOUD...</div>}
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.2; } 100% { opacity: 1; } }
        .blink { animation: blink 1.5s infinite; }
        .loader-line { height: 2px; width: 100%; background: #0f0; margin-top: 10px; box-shadow: 0 0 10px #0f0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #0f0; }
      `}</style>
    </div>
  );
};

const styles = {
  nav: { borderBottom: '1px solid #00ff00', background: 'rgba(0,0,0,0.95)', position: 'sticky', top: 0, zIndex: 100 },
  navContent: { maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', padding: '15px' },
  logo: { color: '#0f0', fontWeight: 'bold' },
  tabs: { display: 'flex', gap: '30px' },
  tabBtn: { background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace' },
  main: { maxWidth: '1200px', margin: '40px auto', padding: '0 20px', position: 'relative', zIndex: 10 },
  grid: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: '30px' },
  sidebar: { border: '1px solid #00ff00', background: 'rgba(0,5,0,0.9)', padding: '15px', height: '540px', display: 'flex', flexDirection: 'column' },
  sidebarHeader: { borderBottom: '1px solid #00ff00', paddingBottom: '10px', marginBottom: '15px' },
  scrollArea: { flex: 1, overflowY: 'auto' },
  nodeItem: { display: 'flex', gap: '10px', padding: '10px', border: '1px solid', marginBottom: '10px', cursor: 'pointer' },
  thumb: { width: '60px', height: '35px', border: '1px solid #0f0', objectFit: 'cover' },
  monitor: { borderTop: '1px solid #004400', paddingTop: '10px', background: 'rgba(0,20,0,0.8)', padding: '10px', minHeight: '50px' },
  playerWrapper: { height: '540px', border: '1px solid #0f0', background: '#000', display: 'flex', position: 'relative' },
  placeholder: { margin: 'auto', color: '#004400', fontSize: '1.2rem' },
  card: { border: '1px solid #0f0', padding: '50px', background: 'rgba(0,10,0,0.8)', textAlign: 'center' },
  drop: { border: '1px dashed #0f0', padding: '40px', display: 'block', margin: '20px 0', cursor: 'pointer' },
  btn: { width: '100%', padding: '15px', background: 'rgba(0,255,0,0.1)', color: '#0f0', border: '1px solid #0f0', cursor: 'pointer' },
  progressBox: { marginBottom: '20px', background: 'rgba(0,20,0,0.5)', padding: '10px' },
  statusText: { color: '#fff', fontSize: '12px', textAlign: 'left' },
  overlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f0' }
};

export default App;