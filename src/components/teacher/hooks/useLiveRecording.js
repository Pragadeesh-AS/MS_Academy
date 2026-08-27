import { useState, useRef, useEffect } from 'react';
import { toCanvas } from 'html-to-image';
import html2canvas from 'html2canvas';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../firebase';

export const useLiveRecording = ({ 
  localMicrophoneTrack, 
  screenShareAudioTrack, 
  remoteUsers, 
  activeQuestionState,
  onUploadComplete
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingRecording, setPendingRecording] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioDestRef = useRef(null);
  const mediaStreamSourcesRef = useRef(new Map());
  const compositeCanvasRef = useRef(null);
  const workerRef = useRef(null);
  const cachedQbImageRef = useRef(null);
  const mousePosRef = useRef({ x: -100, y: -100 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // React Effect for HTML-to-Image serialization
  useEffect(() => {
    if (activeQuestionState?.isActive && activeQuestionState?.questions) {
      let attempts = 0;
      const timer = setInterval(async () => {
        const qbContent = document.getElementById('qb-content');
        if (!qbContent) {
           attempts++;
           if (attempts > 10) clearInterval(timer);
           return;
        }
        clearInterval(timer);

        try {
          const renderedCanvas = await toCanvas(qbContent, {
            cacheBust: true,
            backgroundColor: '#ffffff',
            pixelRatio: 1,
            skipFonts: true, // Speeds up rendering if external fonts fail
            filter: (node) => {
               // Filter out external images to prevent Tainted Canvas SecurityError
               if (node.tagName === 'IMG' && node.src && node.src.includes('firebase')) {
                  return false;
               }
               return true;
            }
          });
          
          if (renderedCanvas.width > 0 && renderedCanvas.height > 0) {
             cachedQbImageRef.current = { img: renderedCanvas };
          }
        } catch (e) {
          console.error("html-to-image failed:", e);
        }
      }, 200);
      return () => clearInterval(timer);
    } else {
      cachedQbImageRef.current = null;
    }
  }, [activeQuestionState?.currentIndex, activeQuestionState?.isAnswerRevealed, activeQuestionState?.isActive]);

  const startRecording = async () => {
    try {
      const canvas = compositeCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      
      const drawCompositor = () => {
        if (!canvas) return;

        const presentationLayer = document.getElementById('classroom-presentation');
        if (!presentationLayer) {
           return;
        }

        const rect = presentationLayer.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
           return;
        }

        if (canvas.width !== rect.width || canvas.height !== rect.height) {
          canvas.width = rect.width;
          canvas.height = rect.height;
        }

        // 1. Base Background
        const compBg = window.getComputedStyle(presentationLayer).backgroundColor;
        ctx.fillStyle = (compBg && compBg !== 'rgba(0, 0, 0, 0)') ? compBg : '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Scale all drawing operations to match the 1920x1080 canvas resolution
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        ctx.save();
        ctx.scale(scaleX, scaleY);

        // 2. Draw Cached HTML-to-Image Canvas (Question Bank Content)
        if (cachedQbImageRef.current) {
           const { img } = cachedQbImageRef.current;
           const qbLayer = document.getElementById('qb-content');
           if (qbLayer) {
              const qbRect = qbLayer.getBoundingClientRect();
              const dx = qbRect.x - rect.x;
              const dy = qbRect.y - rect.y;
              ctx.drawImage(img, dx, dy, qbRect.width, qbRect.height);
           }
        } else if (document.getElementById('qb-content')) {
           // Fallback loading state for QB in case html-to-image is still processing or failed
           ctx.fillStyle = '#ffffff';
           ctx.fillRect(0, 0, rect.width, rect.height);
           ctx.fillStyle = '#ff0000';
           ctx.font = '30px Arial';
           ctx.fillText('Loading Question Bank UI...', 50, 100);
        }

        // 3 & 4. Draw All Visible Videos and Whiteboards in exact DOM order to preserve layering
        // This prevents the Whiteboard canvas from incorrectly covering PIP videos!
        const mediaElements = Array.from(presentationLayer.querySelectorAll('video, canvas'));
        mediaElements.forEach(el => {
           if (el.tagName.toLowerCase() === 'canvas') {
               if (el === canvas) return; // Skip our own composite canvas
               const wbRect = el.getBoundingClientRect();
               const x = wbRect.x - rect.x;
               const y = wbRect.y - rect.y;
               ctx.drawImage(el, x, y, wbRect.width, wbRect.height);
           } else if (el.tagName.toLowerCase() === 'video') {
               if (el.readyState < 2 || el.paused) return;
               const vRect = el.getBoundingClientRect();
               const x = vRect.x - rect.x;
               const y = vRect.y - rect.y;
               
               ctx.save();
               ctx.beginPath();
               // Slight border radius clipping for PIP aesthetics
               ctx.roundRect(x, y, vRect.width, vRect.height, 16); 
               ctx.clip();
               ctx.drawImage(el, x, y, vRect.width, vRect.height);
               ctx.restore();
           }
        });
        
        ctx.restore(); // Restore the global canvas scale

        // 5. Draw Mouse Cursor
        if (mousePosRef.current.x >= 0 && mousePosRef.current.y >= 0) {
           const mx = mousePosRef.current.x - rect.x;
           const my = mousePosRef.current.y - rect.y;
           if (mx >= 0 && my >= 0 && mx <= canvas.width && my <= canvas.height) {
             ctx.save();
             ctx.beginPath();
             ctx.moveTo(mx, my);
             ctx.lineTo(mx + 12, my + 12);
             ctx.lineTo(mx + 5, my + 12);
             ctx.lineTo(mx, my + 20);
             ctx.closePath();
             ctx.fillStyle = '#ffffff';
             ctx.fill();
             ctx.lineWidth = 1;
             ctx.strokeStyle = '#000000';
             ctx.stroke();
             ctx.restore();
           }
        }
      };
      
      // Force an initial synchronous paint to ensure captureStream doesn't fail on an empty buffer
      canvas.width = 1920;
      canvas.height = 1080;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Web Worker to bypass background tab throttling (requestAnimationFrame pauses in background)
      const workerCode = `
        let interval;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            interval = setInterval(() => self.postMessage('tick'), 1000/30);
          } else if (e.data === 'stop') {
            clearInterval(interval);
          }
        };
      `;
      const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(workerBlob);
      const worker = new Worker(workerUrl);
      worker.onmessage = () => drawCompositor();
      worker.postMessage('start');
      
      workerRef.current = { worker, workerUrl };

      const videoStream = canvas.captureStream(30);

      const tracks = [...videoStream.getVideoTracks()];

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume(); 
      }
      const dest = audioCtx.createMediaStreamDestination();
      
      // CRITICAL HACK: Force the audio stream to stay "active" by playing a completely silent sound.
      // If an audio stream goes completely dead, MediaRecorder stops writing video frames to the file!
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0; // 0 volume = completely silent
      oscillator.connect(gainNode);
      gainNode.connect(dest);
      oscillator.start();

      audioContextRef.current = audioCtx;
      audioDestRef.current = dest;

      tracks.push(...dest.stream.getAudioTracks());

      const combinedStream = new MediaStream(tracks);
      
      const types = [
        'video/webm;codecs=h264,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
      ];
      
      let options = { videoBitsPerSecond: 8000000 }; // 8 Mbps high quality
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          options.mimeType = type;
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mediaRecorder.onerror = (e) => {
        console.error("MediaRecorder error:", e);
      };

      mediaRecorder.onstop = () => {
        const type = mediaRecorder.mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type });
        
        let ext = 'webm';
        if (type.includes('mp4')) ext = 'mp4';
        else if (type.includes('matroska')) ext = 'mkv';
        
        const defaultName = `LiveClass_Recording_${new Date().toISOString().replace(/:/g, '-')}`;
        setPendingRecording({ blob, ext, defaultName });

        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);
        oscillator.stop();
        if (workerRef.current) {
          workerRef.current.worker.postMessage('stop');
          workerRef.current.worker.terminate();
          URL.revokeObjectURL(workerRef.current.workerUrl);
          workerRef.current = null;
        }
        recordedChunksRef.current = [];
      };

      videoStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      };

      mediaRecorder.start(1000); 
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          setRecordingTime(prev => prev + 1);
        }
      }, 1000);

    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Error starting recording: " + err.message);
    }
  };

  const confirmRecordingName = (fileName) => {
    if (!pendingRecording) return;
    const { blob, ext, defaultName } = pendingRecording;
    const finalName = fileName || defaultName;

    setIsUploading(true);
    setUploadProgress(0);
    setPendingRecording(null);

    const storageRef = ref(storage, `recordings/${finalName}.${ext}`);
    const uploadTask = uploadBytesResumable(storageRef, blob);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Upload error:", error);
        alert("Error uploading recording: " + error.message);
        setIsUploading(false);
      }, 
      async () => {
        console.log("Upload successful!");
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          if (onUploadComplete) {
            onUploadComplete(url, `${finalName}.${ext}`);
          }
        } catch (err) {
          console.error("Error getting download URL", err);
        }
        setIsUploading(false);
        setUploadProgress(100);
        setTimeout(() => setUploadProgress(0), 2000);
      }
    );
  };

  const cancelRecording = () => {
    setPendingRecording(null);
  };

  const togglePauseRecording = () => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      } else if (mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerIntervalRef.current);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- WEB AUDIO MIXING ---
  useEffect(() => {
    if (!isRecording || !audioContextRef.current || !audioDestRef.current) return;

    const audioCtx = audioContextRef.current;
    const dest = audioDestRef.current;
    const sourcesMap = mediaStreamSourcesRef.current;
    const currentTrackIds = new Set();

    const addTrack = (track) => {
      if (!track) return;
      const nativeTrack = track.getMediaStreamTrack ? track.getMediaStreamTrack() : track;
      if (!nativeTrack) return;
      
      const id = nativeTrack.id;
      currentTrackIds.add(id);

      if (!sourcesMap.has(id)) {
        try {
          const stream = new MediaStream([nativeTrack]);
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(dest);
          sourcesMap.set(id, { source, stream });
        } catch (e) {
          console.error("Error connecting track to mix", e);
        }
      }
    };

    if (localMicrophoneTrack) addTrack(localMicrophoneTrack);
    if (screenShareAudioTrack) addTrack(screenShareAudioTrack);
    
    remoteUsers.forEach(user => {
      // CRITICAL: Explicitly exclude programmatic UIDs from remote audio mixing to prevent echo/duplicate audio.
      if (user.uid !== 999999 && user.uid !== 999998 && user.uid !== 999997 && user.audioTrack) {
        addTrack(user.audioTrack);
      }
    });

    for (const [id] of sourcesMap.entries()) {
      if (!currentTrackIds.has(id)) {
        const entry = sourcesMap.get(id);
        if (entry && entry.source) {
           entry.source.disconnect();
        }
        sourcesMap.delete(id);
      }
    }

  }, [isRecording, localMicrophoneTrack, remoteUsers, screenShareAudioTrack]);
  // --- END WEB AUDIO MIXING ---

  return {
    isRecording,
    isPaused,
    recordingTime,
    isUploading,
    uploadProgress,
    pendingRecording,
    confirmRecordingName,
    cancelRecording,
    formatTime,
    startRecording,
    togglePauseRecording,
    stopRecording,
    compositeCanvasRef
  };
};
