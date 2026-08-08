import { useState, useRef, useEffect } from 'react';
import { toCanvas } from 'html-to-image';
import html2canvas from 'html2canvas';

export const useLiveRecording = ({ 
  localMicrophoneTrack, 
  screenShareAudioTrack, 
  remoteUsers, 
  activeQuestionState 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioDestRef = useRef(null);
  const mediaStreamSourcesRef = useRef(new Map());
  const compositeCanvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const cachedQbImageRef = useRef(null);

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
           animFrameRef.current = requestAnimationFrame(drawCompositor);
           return;
        }

        const rect = presentationLayer.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
           animFrameRef.current = requestAnimationFrame(drawCompositor);
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
           ctx.fillRect(0, 0, canvas.width, canvas.height);
           ctx.fillStyle = '#ff0000';
           ctx.font = '30px Arial';
           ctx.fillText('Loading Question Bank UI...', 50, 100);
        }

        // 3. Draw All Visible Videos (Grid / PIP / Screen Share)
        const videos = Array.from(presentationLayer.querySelectorAll('video')).filter(v => v.readyState >= 2 && !v.paused);
        videos.forEach(video => {
           const vRect = video.getBoundingClientRect();
           const x = vRect.x - rect.x;
           const y = vRect.y - rect.y;
           
           ctx.save();
           // Clip to exact DOM size to perfectly mirror CSS sizing (object-cover is drawn fully inside the clipped area by the browser)
           ctx.beginPath();
           ctx.rect(x, y, vRect.width, vRect.height);
           ctx.clip();
           ctx.drawImage(video, x, y, vRect.width, vRect.height);
           ctx.restore();
        });

        // 4. Draw All Visible Whiteboards
        const wbs = Array.from(presentationLayer.querySelectorAll('canvas'));
        wbs.forEach(wb => {
           if (wb === canvas) return; // Skip our own composite canvas
           const wbRect = wb.getBoundingClientRect();
           const x = wbRect.x - rect.x;
           const y = wbRect.y - rect.y;
           ctx.drawImage(wb, x, y, wbRect.width, wbRect.height);
        });

        animFrameRef.current = requestAnimationFrame(drawCompositor);
      };
      
      // Force an initial synchronous paint to ensure captureStream doesn't fail on an empty buffer
      canvas.width = 1280;
      canvas.height = 720;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animFrameRef.current = requestAnimationFrame(drawCompositor);
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
      
      let options = {};
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          options = { mimeType: type };
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
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        
        let ext = 'webm';
        if (type.includes('mp4')) ext = 'mp4';
        else if (type.includes('matroska')) ext = 'mkv';
        
        a.download = `LiveClass_Recording_${new Date().toISOString().replace(/:/g, '-')}.${ext}`;
        a.click();
        window.URL.revokeObjectURL(url);
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);
        oscillator.stop();
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
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
          sourcesMap.set(id, source);
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

    for (const [id, source] of sourcesMap.entries()) {
      if (!currentTrackIds.has(id)) {
        source.disconnect();
        sourcesMap.delete(id);
      }
    }

  }, [isRecording, localMicrophoneTrack, remoteUsers, screenShareAudioTrack]);
  // --- END WEB AUDIO MIXING ---

  return {
    isRecording,
    isPaused,
    recordingTime,
    formatTime,
    startRecording,
    togglePauseRecording,
    stopRecording,
    compositeCanvasRef
  };
};
