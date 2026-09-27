import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, RotateCw, Gauge } from 'lucide-react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

const fmt = (s) => {
  if (!isFinite(s) || s < 0) return '0:00';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
};

// Shared "watch a recording" modal used by the student, teacher and admin dashboards.
// recording: { id, url, duration? } - duration (seconds) is the wall-clock length captured
// by the recorder itself at upload time, when available; it's authoritative and needs no fixing.
export default function RecordingPlayerModal({ recording, onClose }) {
  const videoRef = useRef(null);
  const barRef = useRef(null);
  const lastSaveRef = useRef(0);
  const closedRef = useRef(false);

  const [duration, setDuration] = useState(
    recording.duration && isFinite(recording.duration) && recording.duration > 0 ? recording.duration : null
  );
  const [durationGaveUp, setDurationGaveUp] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragFraction, setDragFraction] = useState(0);

  const progressKey = `video_progress_${(sessionStorage.getItem('auth_email') || 'anon').toLowerCase()}_${recording.id}`;
  const getSavedTime = () => {
    try {
      const v = parseFloat(localStorage.getItem(progressKey));
      return isFinite(v) && v > 0 ? v : 0;
    } catch { return 0; }
  };
  const saveTime = (time, total) => {
    if (!isFinite(time)) return;
    try {
      if (total && time > total - 8) localStorage.removeItem(progressKey);
      else if (time > 3) localStorage.setItem(progressKey, String(time));
    } catch { /* localStorage unavailable - resume just won't persist */ }
  };

  const readBuffered = (v) => {
    try {
      if (v.buffered && v.buffered.length > 0) {
        setBufferedEnd(prev => Math.max(prev, v.buffered.end(v.buffered.length - 1)));
      }
    } catch { /* ignore */ }
  };

  // Work out this recording's real length (if the recorder didn't already save one) and start
  // playback, all on the ONE video element that's on screen - never a second hidden download of
  // the same file, which previously competed for bandwidth with the real player and could stall it.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let settled = false;

    const startPlayback = (resolvedDuration) => {
      if (settled) return;
      settled = true;
      if (resolvedDuration && isFinite(resolvedDuration)) setDuration(resolvedDuration);
      else setDurationGaveUp(true);
      const resumeAt = getSavedTime();
      if (resumeAt > 0 && (!resolvedDuration || resumeAt < resolvedDuration - 5)) {
        try { v.currentTime = resumeAt; } catch { /* ignore */ }
      }
      v.play().catch(() => {});
    };

    // Some recordings (typically webm without a proper index/Cues) never resolve duration via any
    // seek trick - don't leave the viewer staring at a frozen "reading length" state; start playing.
    const safety = setTimeout(() => startPlayback(null), 4000);

    // Chrome sometimes works out the real duration on its own as more of the file is buffered,
    // without needing a manual seek - catch that whenever it happens, active fix or not.
    const onDurationChange = () => {
      if (isFinite(v.duration) && v.duration > 0) setDuration(v.duration);
    };
    v.addEventListener('durationchange', onDurationChange);

    const onLoadedMetadata = () => {
      if (recording.duration && isFinite(recording.duration) && recording.duration > 0) {
        clearTimeout(safety);
        startPlayback(recording.duration);
        return;
      }
      if (isFinite(v.duration)) {
        clearTimeout(safety);
        startPlayback(v.duration);
        return;
      }
      // Known MediaRecorder webm quirk: duration reports Infinity until you seek near the end once.
      const onTimeUpdateOnce = () => {
        v.removeEventListener('timeupdate', onTimeUpdateOnce);
        clearTimeout(safety);
        const real = isFinite(v.duration) ? v.duration : null;
        v.currentTime = 0;
        startPlayback(real);
      };
      v.addEventListener('timeupdate', onTimeUpdateOnce);
      v.currentTime = 1e101;
    };

    const onProgress = () => readBuffered(v);

    v.addEventListener('loadedmetadata', onLoadedMetadata);
    v.addEventListener('progress', onProgress);
    return () => {
      clearTimeout(safety);
      v.removeEventListener('loadedmetadata', onLoadedMetadata);
      v.removeEventListener('durationchange', onDurationChange);
      v.removeEventListener('progress', onProgress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording.id]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    if (!dragging) setCurrent(v.currentTime);
    readBuffered(v);
    const now = Date.now();
    if (now - lastSaveRef.current > 4000) {
      lastSaveRef.current = now;
      saveTime(v.currentTime, duration);
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || measuring) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  };

  const skip = (deltaSeconds) => {
    const v = videoRef.current;
    if (!v || measuring) return;
    const target = Math.max(0, v.currentTime + deltaSeconds);
    try { v.currentTime = target; } catch { /* ignore */ }
    setCurrent(target);
    saveTime(target, duration);
  };

  // Once a real duration is known (measured or reached naturally), save it to the recording's own
  // record - the next person to open this recording, anywhere, gets the exact length immediately.
  const persistDiscoveredDuration = (real) => {
    if (!real || !isFinite(real) || real <= 0 || recording.duration) return;
    updateDoc(doc(db, 'recordings', recording.id), { duration: real }).catch(() => { /* no write access or offline - harmless, just skip */ });
  };

  // Some recordings have no index the browser can jump to, so it can never work out the length by
  // seeking. This is an explicit, opt-in fallback: race through the file once at high speed to find
  // the real end, then jump back to where the viewer actually was. Same single connection throughout.
  const measureFullLength = () => {
    const v = videoRef.current;
    if (!v || measuring) return;
    setMeasuring(true);
    const resumeTo = v.currentTime;
    const wasPlaying = !v.paused;
    const prevRate = v.playbackRate;
    const prevMuted = v.muted;
    v.pause();
    v.muted = true;

    const finish = (real) => {
      v.removeEventListener('ended', onEndedDuringScan);
      v.playbackRate = prevRate;
      v.muted = prevMuted;
      setMeasuring(false);
      if (real) {
        setDuration(real);
        setDurationGaveUp(false);
        persistDiscoveredDuration(real);
      }
      try { v.currentTime = resumeTo; } catch { /* ignore */ }
      if (wasPlaying) v.play().catch(() => {});
    };

    const onEndedDuringScan = () => finish(v.currentTime);
    v.addEventListener('ended', onEndedDuringScan);

    try {
      v.playbackRate = 16;
      v.currentTime = 0;
      v.play().catch(() => finish(null));
    } catch {
      finish(null);
    }
  };

  // A real duration makes the bar exact; without one, whatever has already downloaded (plus a
  // little headroom) stands in for "total" so the bar is still usable and keeps growing as more loads.
  const effectiveTotal = duration || Math.max(bufferedEnd, current + 30, 30);

  const fractionFromEvent = (e) => {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const seekToFraction = (fraction) => {
    const v = videoRef.current;
    if (!v || measuring) return;
    const target = fraction * effectiveTotal;
    try { v.currentTime = target; } catch { /* ignore */ }
    setCurrent(target);
    saveTime(target, duration);
  };

  const handleClose = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    const v = videoRef.current;
    if (v) saveTime(v.currentTime, duration);
    onClose();
  };

  // ESC to close, like the rest of the app's modals.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shownCurrent = dragging ? dragFraction * effectiveTotal : current;
  const pct = Math.min(100, (shownCurrent / effectiveTotal) * 100);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={handleClose}></div>
      <div className="relative z-10 w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl bg-black border border-slate-800 animate-in zoom-in-95 duration-300">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors backdrop-blur-sm"
        >
          <X size={20} />
        </button>

        <video
          ref={videoRef}
          key={recording.id}
          src={recording.url}
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setPlaying(true)}
          onPause={() => { setPlaying(false); const v = videoRef.current; if (v) saveTime(v.currentTime, duration); }}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          onEnded={(e) => {
            // Reaching the end naturally also reveals the true duration - save it even if nobody
            // asked, so the next viewer of this same recording sees the length immediately.
            if (!measuring) {
              const real = e.currentTarget.currentTime;
              if (!duration) { setDuration(real); setDurationGaveUp(false); }
              persistDiscoveredDuration(real);
            }
          }}
          className="w-full h-auto max-h-[80vh] outline-none cursor-pointer bg-black block"
        />

        {measuring && (
          <div className="absolute inset-0 top-0 bottom-[60px] z-20 bg-black/70 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-bold text-sm">Measuring the recording's length...</p>
            <p className="text-slate-300 text-xs">This only has to happen once for this recording.</p>
          </div>
        )}

        {/* Custom control bar - independent of the video element's own (often broken) duration */}
        <div className="bg-slate-900 px-4 py-3 flex flex-col gap-2 select-none">
          <div
            ref={barRef}
            className="relative h-2.5 bg-slate-700 rounded-full cursor-pointer group"
            onClick={(e) => seekToFraction(fractionFromEvent(e))}
            onMouseDown={(e) => { setDragging(true); setDragFraction(fractionFromEvent(e)); }}
            onMouseMove={(e) => { if (dragging) setDragFraction(fractionFromEvent(e)); }}
            onMouseUp={(e) => { if (dragging) { seekToFraction(fractionFromEvent(e)); setDragging(false); } }}
            onMouseLeave={() => setDragging(false)}
          >
            <div className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full pointer-events-none" style={{ width: `${pct}%` }} />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `calc(${pct}% - 7px)` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <div className="flex items-center gap-2.5">
              <button type="button" onClick={() => skip(-10)} title="Back 10 seconds" className="text-white hover:text-indigo-400 transition-colors">
                <RotateCcw size={16} />
              </button>
              <button type="button" onClick={togglePlay} className="text-white hover:text-indigo-400 transition-colors">
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button type="button" onClick={() => skip(10)} title="Forward 10 seconds" className="text-white hover:text-indigo-400 transition-colors">
                <RotateCw size={16} />
              </button>
              <button
                type="button"
                onClick={() => { const v = videoRef.current; if (v) v.muted = !v.muted; }}
                className="text-white hover:text-indigo-400 transition-colors"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <span className="tabular-nums">{fmt(shownCurrent)} / {duration ? fmt(duration) : '--:--'}</span>
              {!duration && !measuring && durationGaveUp && (
                <button
                  type="button"
                  onClick={measureFullLength}
                  className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 normal-case font-semibold transition-colors"
                  title="Quickly scans through the recording once to find its exact length, then saves it for everyone"
                >
                  <Gauge size={13} /> Measure exact length
                </button>
              )}
              {!duration && !durationGaveUp && (
                <span className="text-amber-400 normal-case font-semibold">Reading length...</span>
              )}
              {measuring && (
                <span className="text-indigo-400 normal-case font-semibold animate-pulse">Measuring length - scanning through the recording...</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => videoRef.current?.requestFullscreen?.()}
              className="text-white hover:text-indigo-400 transition-colors"
              title="Fullscreen"
            >
              <Maximize size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
