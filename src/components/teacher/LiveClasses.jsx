import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, onSnapshot, setDoc } from 'firebase/firestore';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Calendar,
  Plus,
  Clock,
  BookOpen, PenTool, Pin, PinOff, SquareUser, Users, MessageSquareText, FileText, CheckCircle2, Play, Pause, ChevronLeft, ChevronRight, X, User, PlayCircle, Check, UserPlus, MessageCircle, Send, Search, Eye, WifiOff, UploadCloud, MoreHorizontal
} from 'lucide-react';
import html2canvas from 'html2canvas';
import AgoraRTC, {
  AgoraRTCProvider,
  useRTCClient,
  useLocalCameraTrack,
  useLocalMicrophoneTrack,
  usePublish,
  useJoin,
  useRemoteUsers,
  useRemoteVideoTracks,
  useRemoteAudioTracks,
  RemoteUser,
  LocalVideoTrack,
  useLocalScreenTrack,
  useConnectionState,
  useNetworkQuality
} from "agora-rtc-react";
import Whiteboard from './Whiteboard';
import { useLiveRecording } from './hooks/useLiveRecording';
// Extracted component to handle whiteboard sharing as an independent client
const WhiteboardShareClient = ({ appId, channel, token, stream, uid = 999998 }) => {
  const [wbClient] = useState(() => AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }));

  useEffect(() => {
    let isMounted = true;
    let track = null;

    if (stream && stream.getVideoTracks().length > 0) {
      try {
        track = AgoraRTC.createCustomVideoTrack({
          mediaStreamTrack: stream.getVideoTracks()[0]
        });

        wbClient.join(appId, channel, token, uid).then(() => {
          if (isMounted) {
            wbClient.publish([track]);
          }
        }).catch(console.error);
      } catch (err) {
        console.error("Error publishing whiteboard stream:", err);
      }

      return () => {
        isMounted = false;
        wbClient.leave();
        if (track) track.close();
      };
    }
  }, [stream, wbClient, appId, channel, token]);

  return null;
};

// Extracted component to handle screen sharing as an independent client
const ScreenShareClient = ({ appId, channel, token, onTrackEnded, onAudioTrackReady, onTrackReady }) => {
  const [screenClient] = useState(() => AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }));
  const [joined, setJoined] = useState(false);
  const initStarted = useRef(false);
  
  // Keep latest onTrackEnded without triggering effect
  const onTrackEndedRef = useRef(onTrackEnded);
  useEffect(() => {
    onTrackEndedRef.current = onTrackEnded;
  }, [onTrackEnded]);

  const onAudioTrackReadyRef = useRef(onAudioTrackReady);
  useEffect(() => {
    onAudioTrackReadyRef.current = onAudioTrackReady;
  }, [onAudioTrackReady]);

  const onTrackReadyRef = useRef(onTrackReady);
  useEffect(() => {
    onTrackReadyRef.current = onTrackReady;
  }, [onTrackReady]);

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;

    let isMounted = true;
    let localVidTrack = null;
    let localAudTrack = null;

    const initScreenShare = async () => {
      try {
        let tracks;
        try {
          // "auto" tells the browser to capture system audio if the user allows it
          tracks = await AgoraRTC.createScreenVideoTrack({}, "auto");
        } catch (err) {
          if (err.code === 'NOT_SUPPORTED' || err.message?.includes('not support')) {
            console.warn("Screen audio not supported on this platform, falling back to video-only");
            tracks = await AgoraRTC.createScreenVideoTrack({}, "disable");
          } else {
            throw err;
          }
        }
        
        if (!isMounted) {
          if (Array.isArray(tracks)) {
            tracks.forEach(t => t.close());
          } else {
            tracks.close();
          }
          return;
        }

        // It can return an array [videoTrack, audioTrack] or just a videoTrack
        if (Array.isArray(tracks)) {
          localVidTrack = tracks[0];
          localAudTrack = tracks[1];
        } else {
          localVidTrack = tracks;
        }

        if (onTrackReadyRef.current) onTrackReadyRef.current(localVidTrack);
        
        if (localAudTrack) {
          if (onAudioTrackReadyRef.current) onAudioTrackReadyRef.current(localAudTrack);
        }

        const handleTrackEnded = () => {
          if (onTrackEndedRef.current) onTrackEndedRef.current();
        };
        localVidTrack.on('track-ended', handleTrackEnded);

        await screenClient.join(appId, channel, token, 999999);
        
        if (isMounted) {
          const tracksToPublish = [localVidTrack];
          if (localAudTrack) tracksToPublish.push(localAudTrack);
          await screenClient.publish(tracksToPublish);
          setJoined(true);
        } else {
          screenClient.leave();
        }
      } catch (error) {
        console.error("Failed to start screen share:", error);
        if (onTrackEndedRef.current) onTrackEndedRef.current();
      }
    };

    initScreenShare();

    return () => {
      isMounted = false;
      if (localVidTrack) {
        localVidTrack.removeAllListeners();
        localVidTrack.stop();
        localVidTrack.close();
      }
      if (localAudTrack) {
        localAudTrack.stop();
        localAudTrack.close();
        if (onAudioTrackReadyRef.current) onAudioTrackReadyRef.current(null);
      }
      try {
        if (screenClient.connectionState === 'CONNECTED') {
          screenClient.unpublish().catch(() => {});
          screenClient.leave().catch(() => {});
        }
      } catch(e) {}
    };
  }, [screenClient, appId, channel, token]);

  return null;
};

// Extracted TeacherCall component for custom Agora rendering
const TeacherCall = ({ appId, channel, token, handleEndMeet, sessionId, isChatOpen, toggleChat, chatToast, setChatToast, departmentQuestions, department }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [isRevealing, setIsRevealing] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [whiteboardOn, setWhiteboardOn] = useState(false);
  const [whiteboardStream, setWhiteboardStream] = useState(null);
  const [qbWhiteboardStream, setQbWhiteboardStream] = useState(null);
  const whiteboardOnRef = useRef(whiteboardOn);
  useEffect(() => { whiteboardOnRef.current = whiteboardOn; }, [whiteboardOn]);
  const [pinnedUid, setPinnedUid] = useState(null);
  const [participantNames, setParticipantNames] = useState({});
  const client = useRTCClient();
  const connectionState = useConnectionState();
  const remoteUsers = useRemoteUsers();
  const networkQuality = useNetworkQuality();
  
  const getQuality = (uid) => {
    const stats = networkQuality[uid];
    if (!stats) return 0;
    return Math.max(stats.uplinkNetworkQuality, stats.downlinkNetworkQuality);
  };

  const [screenShareAudioTrack, setScreenShareAudioTrack] = useState(null);
  const [screenShareVideoTrack, setScreenShareVideoTrack] = useState(null);

  // Question Bank State
  const [isQBModalOpen, setIsQBModalOpen] = useState(false);
  const [selectedQBIds, setSelectedQBIds] = useState([]);
  const [qbSearchFilter, setQbSearchFilter] = useState("");
  const [qbDifficultyFilter, setQbDifficultyFilter] = useState("ALL");
  const [activeQuestionState, setActiveQuestionState] = useState(null);
  const activeQuestionStateRef = useRef(activeQuestionState);
  const [newRecordingName, setNewRecordingName] = useState('');
  const [sessionBundleId, setSessionBundleId] = useState('free');


  
  useEffect(() => {
    activeQuestionStateRef.current = activeQuestionState;
  }, [activeQuestionState]);

  useEffect(() => {
    if (client.uid && sessionId) {
      const userName = localStorage.getItem('auth_name') || 'Teacher';
      setDoc(doc(db, 'live_sessions', sessionId, 'participants', client.uid.toString()), {
        name: userName,
        role: 'teacher'
      }).catch(console.error);
    }
  }, [client.uid, sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    // Listen for participant names
    const unsubParticipants = onSnapshot(collection(db, 'live_sessions', sessionId, 'participants'), (snapshot) => {
      const names = {};
      snapshot.forEach(d => { names[d.id] = d.data().name; });
      setParticipantNames(names);
    });

    // Listen for session state (Question Bank sync)
    const unsubSession = onSnapshot(doc(db, 'live_sessions', sessionId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.bundleId) setSessionBundleId(data.bundleId);
        if (data.activeQuestionState) {
          setActiveQuestionState(data.activeQuestionState);
        } else {
          setActiveQuestionState(null);
        }
      }
    });

    return () => {
      unsubParticipants();
      unsubSession();
    };
  }, [sessionId]);

  useJoin({ appid: appId, channel: channel, token: token, uid: null });

  const [localMicrophoneTrack, setLocalMicrophoneTrack] = useState(null);
  const [localCameraTrack, setLocalCameraTrack] = useState(null);

  useEffect(() => {
    let activeTrack = null;
    if (cameraOn) {
      AgoraRTC.createCameraVideoTrack().then(track => {
        activeTrack = track;
        setLocalCameraTrack(track);
      }).catch(console.error);
    } else {
      setLocalCameraTrack(prev => {
        if (prev) {
          try {
            prev.stop();
            prev.close();
          } catch(e) {}
        }
        return null;
      });
    }
    return () => {
      if (activeTrack) {
        try {
          activeTrack.stop();
          activeTrack.close();
        } catch(e) {}
      }
    };
  }, [cameraOn]);

  useEffect(() => {
    let activeTrack = null;
    if (micOn) {
      AgoraRTC.createMicrophoneAudioTrack().then(track => {
        activeTrack = track;
        setLocalMicrophoneTrack(track);
      }).catch(console.error);
    } else {
      setLocalMicrophoneTrack(prev => {
        if (prev) {
          try {
            prev.stop();
            prev.close();
          } catch(e) {}
        }
        return null;
      });
    }
    return () => {
      if (activeTrack) {
        try {
          activeTrack.stop();
          activeTrack.close();
        } catch(e) {}
      }
    };
  }, [micOn]);

  // We are handling publishing manually in useEffects above
  // usePublish([localMicrophoneTrack, localCameraTrack].filter(Boolean));

  useEffect(() => {
    if (localCameraTrack && client.connectionState === 'CONNECTED') {
      client.publish(localCameraTrack).catch(console.error);
      return () => {
        if (client.connectionState === 'CONNECTED') {
          client.unpublish(localCameraTrack).catch(console.error);
        }
      };
    }
  }, [localCameraTrack, client, client.connectionState]);

  useEffect(() => {
    if (localMicrophoneTrack && client.connectionState === 'CONNECTED') {
      client.publish(localMicrophoneTrack).catch(console.error);
      return () => {
        if (client.connectionState === 'CONNECTED') {
          client.unpublish(localMicrophoneTrack).catch(console.error);
        }
      };
    }
  }, [localMicrophoneTrack, client, client.connectionState]);

  const {
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
  } = useLiveRecording({
    localMicrophoneTrack,
    screenShareAudioTrack,
    remoteUsers,
    activeQuestionState,
    onUploadComplete: async (url, fileName) => {
      try {
        const teacherName = localStorage.getItem('auth_name') || 'Teacher';
        await addDoc(collection(db, 'recordings'), {
          fileName,
          url,
          teacherName,
          department: department || 'General',
          bundleId: sessionBundleId || 'free',
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Error saving recording metadata", err);
      }
    }
  });

  const remoteUserStyle = { width: '100%', height: '100%' };

  // Actually trigger subscriptions for the remote users
  useRemoteVideoTracks(remoteUsers);
  useRemoteAudioTracks(remoteUsers);

  // Filter out the Screen Share client and Whiteboard clients so they don't appear as remote users
  const filteredUsers = remoteUsers.filter(u => u.uid !== 999999 && u.uid !== 999998 && u.uid !== 999997);

  // Dynamic grid based on participant count
  const totalParticipants = 1 + filteredUsers.length + (screenShareOn ? 1 : 0) + (whiteboardOn ? 1 : 0) + (activeQuestionState?.isActive ? 1 : 0);
  const gridColsClass =
    totalParticipants === 1 ? 'grid-cols-1 md:grid-cols-1' :
      totalParticipants === 2 ? 'grid-cols-1 md:grid-cols-2' :
        totalParticipants <= 4 ? 'grid-cols-2 md:grid-cols-2' :
          'grid-cols-2 md:grid-cols-3';

  const togglePin = (id) => {
    setPinnedUid(prev => prev === id ? null : id);
  };

  useEffect(() => {
    const hasQuestionBank = activeQuestionState?.isActive;

    if (hasQuestionBank && pinnedUid !== 'question-bank') {
      setPinnedUid('question-bank');
    } else if (screenShareOn && pinnedUid !== 'local-screen' && !hasQuestionBank) {
      setPinnedUid('local-screen');
    } else if (whiteboardOn && pinnedUid !== 'local-whiteboard' && !hasQuestionBank && !screenShareOn) {
      setPinnedUid('local-whiteboard');
    } else if (!hasQuestionBank && !whiteboardOn && !screenShareOn && (pinnedUid === 'question-bank' || pinnedUid === 'local-whiteboard' || pinnedUid === 'local-screen')) {
      setPinnedUid(null);
    }
  }, [activeQuestionState?.isActive, whiteboardOn, screenShareOn, pinnedUid]);

  const handleStartQB = async () => {
    if (!departmentQuestions || selectedQBIds.length === 0) {
      alert("Please select at least one question.");
      return;
    }

    // Preserve the order of selection based on departmentQuestions array
    const selectedQList = departmentQuestions.filter(q => selectedQBIds.includes(q.id));

    if (selectedQList.length === 0) {
      alert("Selected questions not found.");
      return;
    }

    setIsQBModalOpen(false);
    setSelectedQBIds([]);
    setQbSearchFilter("");

    await updateDoc(doc(db, 'live_sessions', sessionId), {
      activeQuestionState: {
        isActive: true,
        questions: selectedQList,
        currentIndex: 0,
        isAnswerRevealed: false
      }
    });
  };

  const handleNextQB = async () => {
    if (!activeQuestionState) return;

    if (!activeQuestionState.isAnswerRevealed) {
      await updateDoc(doc(db, 'live_sessions', sessionId), {
        'activeQuestionState.isAnswerRevealed': true
      });
    } else {
      if (activeQuestionState.currentIndex + 1 < activeQuestionState.questions.length) {
        await updateDoc(doc(db, 'live_sessions', sessionId), {
          'activeQuestionState.isAnswerRevealed': false,
          'activeQuestionState.currentIndex': activeQuestionState.currentIndex + 1
        });
      } else {
        await updateDoc(doc(db, 'live_sessions', sessionId), {
          activeQuestionState: null
        });
      }
    }
  };

  const handleCloseQB = async () => {
    await updateDoc(doc(db, 'live_sessions', sessionId), {
      activeQuestionState: null
    });
  };

  const renderGridTiles = () => {
    const pinnedTiles = [];
    const unpinnedTiles = [];

    // -1. Question Bank Overlay
    // -1. Question Bank Overlay
    if (activeQuestionState?.isActive && activeQuestionState.questions) {
      const isPinned = pinnedUid === 'question-bank';
      const qbContentNode = (
        <>
          {/* Base Layer: Question Content */}
          <div id="qb-content" className={`absolute inset-0 h-full flex flex-col w-full z-10 pointer-events-none bg-white md:bg-white/90 p-6 md:p-12`}>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 flex flex-col">
              {/* Top: Full Width Question */}
              <div className={`w-full flex font-bold text-slate-900 ${isPinned ? 'text-base md:text-lg mb-6' : 'text-sm mb-4'}`}>
                <div id="qb-qnum" className={`text-slate-500 shrink-0 flex flex-col items-center gap-4 mt-1 ${isPinned ? 'w-16 mr-4' : 'w-10 mr-2'}`}>
                  <span>Q.{activeQuestionState.currentIndex + 1}</span>
                </div>
                <div id="qb-qtext" className="flex-1" dangerouslySetInnerHTML={{ __html: activeQuestionState.questions[activeQuestionState.currentIndex].questionText }} />
              </div>

              {/* Bottom: Options (Left 40%) */}
              <div id="qb-options-area" className="w-full md:w-[45%] flex flex-col">
                {activeQuestionState.questions[activeQuestionState.currentIndex].questionImageUrl && (
                  <div className={`${isPinned ? 'ml-20' : 'ml-10'} mb-6`}>
                    <img src={activeQuestionState.questions[activeQuestionState.currentIndex].questionImageUrl} alt="Question" className={`${isPinned ? 'max-h-[30vh]' : 'max-h-16'} object-contain`} />
                  </div>
                )}

                <div className={`flex flex-col gap-4 md:gap-5 ${isPinned ? 'ml-20' : 'ml-10'}`}>
                  {['A', 'B', 'C', 'D'].map(opt => {
                    const text = activeQuestionState.questions[activeQuestionState.currentIndex][`option${opt}`];
                    if (!text) return null;
                    const isCorrect = activeQuestionState.questions[activeQuestionState.currentIndex].correctAnswer === opt;
                    const isRevealed = activeQuestionState.isAnswerRevealed;

                    return (
                      <div id={`qb-opt-container-${opt}`} key={opt} className={`flex items-center text-base md:text-lg font-semibold transition-all ${isRevealed && isCorrect ? 'text-green-600 bg-green-50 p-4 rounded-xl inline-block w-max' : 'text-slate-800 p-3'}`}>
                        <span id={`qb-opt-prefix-${opt}`} className="mr-4 font-bold shrink-0 whitespace-nowrap">( {opt} )</span>
                        <span id={`qb-opt-text-${opt}`} dangerouslySetInnerHTML={{ __html: text }} />
                        {isRevealed && isCorrect && <CheckCircle2 size={24} className="inline ml-4 text-green-500" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Middle Layer: Whiteboard Overlay (Covers Entire Screen) */}
          {isPinned && (
            <div className="absolute inset-0 z-40 pointer-events-none">
              <Whiteboard canvasId="qb-whiteboard-canvas" onStreamReady={setQbWhiteboardStream} isOverlay={true} />
              <WhiteboardShareClient appId={appId} channel={channel} token={token} stream={qbWhiteboardStream} uid={999997} />
              
              {/* Top Layer: Interactive Controls Overlay (aligned with Q.1) */}
              <div className="absolute inset-0 p-6 md:p-12 pointer-events-none flex flex-col">
                <div className={`w-full flex font-bold ${isPinned ? 'text-base md:text-lg mb-8' : 'text-sm mb-4'}`}>
                  <div className="shrink-0 flex flex-col items-center gap-4 mt-1 w-16 mr-4">
                    <span className="invisible pointer-events-none">Q.{activeQuestionState.currentIndex + 1}</span>
                    <button onClick={handleNextQB} className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-md transition-transform hover:scale-105 pointer-events-auto" title={activeQuestionState.isAnswerRevealed ? "Next Question" : "Reveal Answer"}>
                      {activeQuestionState.isAnswerRevealed ? <ChevronRight size={22} /> : <Eye size={22} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      );

      const qbTile = (
        <div key="question-bank" className={`relative overflow-hidden bg-white shadow-xl group transition-all duration-300 ${isPinned ? 'absolute inset-0 z-0 h-full w-full' : 'w-48 h-32 shrink-0 z-50 rounded-2xl pointer-events-none p-4'}`}>
          {qbContentNode}
          <button onClick={() => togglePin('question-bank')} className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-[70] pointer-events-auto">
            {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
        </div>
      );
      if (isPinned) pinnedTiles.push(qbTile);
      else unpinnedTiles.push(qbTile);
    }

    // 0. Whiteboard (Local)
    if (whiteboardOn) {
      const isPinned = pinnedUid === 'local-whiteboard';
      const wbTile = (
        <div key="local-whiteboard" className={`relative rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800 group transition-all duration-300 ${isPinned ? 'absolute inset-0 z-0 rounded-none border-none h-full w-full' : (pinnedUid ? 'w-48 h-32 shrink-0 z-50 pointer-events-none' : 'h-full w-full')}`}>
          <div className="absolute inset-0 z-10 pointer-events-auto">
            <Whiteboard canvasId="main-whiteboard-canvas" onStreamReady={setWhiteboardStream} />
          </div>
          {whiteboardStream && (
            <WhiteboardShareClient appId={appId} channel={channel} token={token} stream={whiteboardStream} uid={999998} />
          )}
          <div className={`absolute top-2 left-2 md:top-4 md:left-4 bg-purple-600/90 px-2 py-1 md:px-3 md:py-1 rounded-lg text-white text-xs md:text-sm font-bold shadow-md z-30 pointer-events-none ${pinnedUid && !isPinned ? 'scale-75 origin-top-left' : ''}`}>Whiteboard</div>
          <button onClick={() => togglePin('local-whiteboard')} className="absolute top-2 right-2 md:top-4 md:right-4 p-2 bg-black/50 hover:bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-30">
            {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
        </div>
      );
      if (isPinned) pinnedTiles.push(wbTile);
      else unpinnedTiles.push(wbTile);
    }

    // 1. Screen Share (Local)
    if (screenShareOn) {
      const isPinned = pinnedUid === 'local-screen';
      const screenTile = (
        <div key="local-screen" className={`relative rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800 group transition-all duration-300 ${isPinned ? 'absolute inset-0 z-0 rounded-none border-none h-full w-full' : (pinnedUid ? 'w-48 h-32 shrink-0 z-50' : 'h-full')}`}>
          {screenShareVideoTrack ? (
            <LocalVideoTrack track={screenShareVideoTrack} play={true} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white font-bold animate-pulse">
              Initializing Screen Share...
            </div>
          )}
          {screenShareAudioTrack && (
            <div className="absolute top-4 left-24 bg-black/70 px-2 py-1 rounded-full text-white text-xs font-bold shadow-md z-30 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              Audio Shared
            </div>
          )}
          <div className={`absolute top-2 left-2 md:top-4 md:left-4 bg-blue-600/90 px-2 py-1 md:px-3 md:py-1 rounded-lg text-white text-xs md:text-sm font-bold shadow-md z-30 ${pinnedUid && !isPinned ? 'scale-75 origin-top-left' : ''}`}>Your Screen</div>
          <button onClick={() => togglePin('local-screen')} className="absolute top-2 right-2 md:top-4 md:right-4 p-2 bg-black/50 hover:bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-30">
            {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
        </div>
      );
      if (isPinned) pinnedTiles.push(screenTile);
      else unpinnedTiles.push(screenTile);
    }

    // 2. Local Camera
    const isLocalPinned = pinnedUid === 'local-camera';
    const localQuality = getQuality(client.uid);
    const isLocalSlow = localQuality >= 4 && localQuality <= 6;
    const localTile = (
      <div key="local-camera" className={`relative rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800 group transition-all duration-300 ${isLocalPinned ? 'absolute inset-0 z-0 rounded-none border-none h-full w-full' : (pinnedUid ? 'w-48 h-32 shrink-0 z-50' : 'h-full')}`}>
        {localCameraTrack && cameraOn ? (
          <LocalVideoTrack track={localCameraTrack} play={true} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-10">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-700 rounded-full flex items-center justify-center shadow-inner">
              <User size={32} className="text-slate-400" />
            </div>
          </div>
        )}
        <div className={`absolute top-2 left-2 md:top-4 md:left-4 bg-black/70 px-2 py-1 md:px-3 md:py-1 rounded-lg text-white text-xs md:text-sm font-bold shadow-md z-30 ${pinnedUid && !isLocalPinned ? 'scale-75 origin-top-left' : ''}`}>
          You (Teacher)
          {isLocalSlow && <span className="ml-2 text-red-500 inline-flex items-center gap-1"><WifiOff size={12}/> Slow Network</span>}
        </div>
        <button onClick={() => togglePin('local-camera')} className="absolute top-2 right-2 md:top-4 md:right-4 p-2 bg-black/50 hover:bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-30">
          {isLocalPinned ? <PinOff size={16} /> : <Pin size={16} />}
        </button>
      </div>
    );
    if (isLocalPinned) {
      pinnedTiles.push(localTile);
    } else if (!pinnedUid || pinnedUid === 'local-screen' || pinnedUid === 'local-whiteboard' || pinnedUid === 'question-bank') {
      unpinnedTiles.push(localTile);
    }

    // 3. Remote Users
    filteredUsers.forEach(user => {
      const isPinned = pinnedUid === user.uid;
      const userName = participantNames[user.uid] || `Student ${user.uid}`;
      const quality = getQuality(user.uid);
      const isSlow = quality >= 4 && quality <= 6;
      const remoteTile = (
        <div key={user.uid} className={`relative rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800 group transition-all duration-300 ${isPinned ? 'absolute inset-0 z-0 rounded-none border-none h-full w-full' : (pinnedUid ? 'w-48 h-32 shrink-0 z-50' : 'h-full')}`}>
          <div className="absolute inset-0">
            <RemoteUser user={user} style={remoteUserStyle} />
          </div>
          {!user.hasVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-10">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-700 rounded-full flex items-center justify-center shadow-inner">
                <User size={32} className="text-slate-400" />
              </div>
            </div>
          )}
          <div className={`absolute top-2 left-2 md:top-4 md:left-4 bg-black/70 px-2 py-1 md:px-3 md:py-1 rounded-lg text-white text-xs md:text-sm font-bold shadow-md z-30 transition-opacity ${pinnedUid && !isPinned ? 'scale-75 origin-top-left' : ''}`}>
            {userName} 
            {!user.hasAudio && <MicOff size={12} className="inline ml-1 text-red-400" />}
            {isSlow && <span className="ml-2 text-red-500 inline-flex items-center gap-1"><WifiOff size={12}/> Slow Network</span>}
          </div>
          <button onClick={() => togglePin(user.uid)} className="absolute top-2 right-2 md:top-4 md:right-4 p-2 bg-black/50 hover:bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-30">
            {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
        </div>
      );
      if (isPinned) {
        pinnedTiles.push(remoteTile);
      } else if (!pinnedUid) {
        unpinnedTiles.push(remoteTile);
      } else {
        // Render visually hidden to maintain audio playback when PIP is restricted. 
        // display: none causes some browsers or intersection observers to pause media.
        unpinnedTiles.push(
          <div key={user.uid} className="absolute opacity-0 pointer-events-none w-1 h-1 overflow-hidden">
            <RemoteUser user={user} />
          </div>
        );
      }
    });

    return { pinnedTiles, unpinnedTiles };
  };

  const { pinnedTiles, unpinnedTiles } = renderGridTiles();
  const isScreenSharePinned = pinnedUid === 'local-screen' || pinnedUid === 999999;

  return (
    <div className="flex-1 flex flex-col relative bg-black">
      {screenShareOn && (
        <ScreenShareClient 
          appId={appId} 
          channel={channel} 
          token={token} 
          onTrackEnded={() => setScreenShareOn(false)} 
          onAudioTrackReady={(track) => setScreenShareAudioTrack(track)}
          onTrackReady={(track) => setScreenShareVideoTrack(track)}
        />
      )}
      {/* Hidden Composite Canvas for clean Recording */}
      <canvas ref={compositeCanvasRef} width={1280} height={720} className="fixed top-0 left-0 pointer-events-none z-[9999]" style={{ opacity: 0.01, transform: 'scale(0.01)', transformOrigin: 'top left' }} />

      <div className="absolute top-4 right-4 z-50 flex gap-2">
        {chatToast.show && (
          <div className="absolute top-12 right-0 bg-slate-800 border border-slate-700 text-white p-4 rounded-xl shadow-2xl z-50 flex flex-col gap-1 min-w-[280px] animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-400 text-sm">{chatToast.sender}</span>
              <button onClick={() => setChatToast({ show: false })}><X size={14} className="text-slate-400 hover:text-white" /></button>
            </div>
            <p className="text-sm text-slate-300 truncate max-w-[240px]">{chatToast.message}</p>
            <button onClick={() => { setChatToast({ show: false }); setIsChatOpen(true); }} className="text-xs text-blue-400 font-bold mt-2 text-left hover:text-blue-300 transition-colors uppercase tracking-wider">Reply</button>
          </div>
        )}
      </div>

      {/* Video Grid / Classroom Presentation Layer */}
      <div id="classroom-presentation" className={`flex-1 relative ${pinnedUid ? 'overflow-hidden' : `p-4 grid ${gridColsClass} gap-4 auto-rows-fr`}`}>
        {pinnedUid ? (
          <>
            {/* The single pinned video taking the full background */}
            {pinnedTiles}

            {/* Small floating PIP videos container (Vertical Stack) */}
            <div className="absolute bottom-28 right-6 z-[90] flex flex-col gap-3 max-h-[calc(100vh-250px)] overflow-y-auto pl-2 custom-scrollbar">
              {unpinnedTiles}
            </div>
          </>
        ) : (
          unpinnedTiles
        )}
      </div>

      {/* Custom Control Bar (Glassmorphic Theme mimicking Navbar) */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-4 rounded-full z-[100] transition-all duration-500 hover:scale-[1.02]"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow: "rgba(0, 0, 0, 0.3) 0px 20px 40px -10px, inset 0px 1px 1px rgba(255, 255, 255, 0.4), inset 0px 0px 0px 1px rgba(255, 255, 255, 0.15)"
        }}
      >
        <div className="flex items-center gap-6 pr-6 border-r border-white/20">

          {/* Record Button */}
          {isUploading ? (
            <div className="flex items-center gap-3 bg-blue-600/20 rounded-full p-2 pr-4 border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
              <div className="relative w-8 h-8 flex items-center justify-center">
                <svg className="w-8 h-8 transform -rotate-90">
                  <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3" fill="none" className="text-blue-500/30" />
                  <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3" fill="none" className="text-blue-500 transition-all duration-300" strokeDasharray="88" strokeDashoffset={88 - (88 * uploadProgress) / 100} />
                </svg>
                <UploadCloud size={14} className="absolute text-blue-400 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-blue-300 font-bold leading-none mb-1">Uploading</span>
                <span className="text-[10px] text-blue-400 font-mono leading-none">{Math.round(uploadProgress)}%</span>
              </div>
            </div>
          ) : !isRecording ? (
            <button
              onClick={startRecording}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-red-500 hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
              title="Record Session"
            >
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-red-600/20 rounded-full p-1 pr-4 border border-red-500/30 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
              <div className="flex gap-1">
                <button onClick={togglePauseRecording} className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${isPaused ? 'bg-yellow-500' : 'bg-slate-700 hover:bg-slate-600'}`} title={isPaused ? "Resume" : "Pause"}>
                  {isPaused ? (
                    <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-white border-b-[4px] border-b-transparent"></div>
                  ) : (
                    <div className="flex gap-[3px]"><div className="w-1 h-3 bg-white rounded-full"></div><div className="w-1 h-3 bg-white rounded-full"></div></div>
                  )}
                </button>
                <button onClick={stopRecording} className={`w-10 h-10 rounded-full flex items-center justify-center text-white bg-red-600 hover:bg-red-700 ${isPaused ? '' : 'animate-pulse'}`} title="Stop Recording">
                  <div className="w-2.5 h-2.5 bg-white rounded-sm"></div>
                </button>
              </div>
              <div className={`font-mono font-bold text-sm tracking-wider ${!isPaused ? 'text-red-400 animate-pulse' : 'text-yellow-500'}`}>
                {formatTime(recordingTime)}
              </div>
            </div>
          )}

          {/* Camera Button */}
          <button
            onClick={() => setCameraOn(!cameraOn)}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${cameraOn ? 'control-btn' : 'control-btn off'}`}
            title={cameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {cameraOn ? <Video size={22} strokeWidth={1.5} /> : <VideoOff size={22} strokeWidth={1.5} />}
          </button>

          {/* Mic Button */}
          <button
            onClick={() => setMicOn(!micOn)}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${micOn ? 'control-btn' : 'control-btn off'}`}
            title={micOn ? 'Mute' : 'Unmute'}
          >
            {micOn ? <Mic size={22} strokeWidth={1.5} /> : <MicOff size={22} strokeWidth={1.5} />}
          </button>

          {/* Question Bank Button */}
          <button
            onClick={() => activeQuestionState?.isActive ? handleCloseQB() : setIsQBModalOpen(true)}
            className={`flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full transition-all shadow-lg ${activeQuestionState?.isActive ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
            title={activeQuestionState?.isActive ? "Close Question Bank" : "Open Question Bank"}
          >
            <BookOpen size={20} className="md:w-6 md:h-6" />
          </button>

          {/* Screen Share Button */}
          <button
            onClick={() => setWhiteboardOn(!whiteboardOn)}
            className={`flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full transition-all shadow-lg ${whiteboardOn ? 'bg-purple-600 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
            title={whiteboardOn ? "Stop Whiteboard" : "Start Whiteboard"}
          >
            <PenTool size={20} className="md:w-6 md:h-6" />
          </button>

          {/* Screen Share Button */}
          <button
            onClick={() => setScreenShareOn(!screenShareOn)}
            className={`flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full transition-all shadow-lg ${screenShareOn ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
            title={screenShareOn ? 'Stop Sharing' : 'Share Screen'}
          >
            <MonitorUp size={20} className="md:w-6 md:h-6" />
          </button>

        </div>

        <div className="flex items-center gap-4">
          {/* Chat Button */}
          <button
            onClick={toggleChat}
            className={`w-12 h-12 rounded-full flex items-center justify-center relative text-white ${isChatOpen ? 'control-btn' : 'control-btn off'}`}
            title={isChatOpen ? 'Close Chat' : 'Open Chat'}
          >
            <MessageCircle size={22} strokeWidth={1.5} />
          </button>

          {/* End Call Button */}
          <button
            onClick={() => handleEndMeet()}
            disabled={isUploading}
            className={`w-12 h-12 rounded-full text-white flex items-center justify-center ${isUploading ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'control-btn-danger'}`}
            title={isUploading ? "Wait for upload to finish" : "End Call"}
          >
            <PhoneOff size={22} strokeWidth={1.5} />
          </button>
        </div>

        {/* Connection Status Indicator */}
        <div className="absolute -top-10 right-4 text-xs font-bold px-3 py-1 rounded-full shadow-md bg-black/50 text-white backdrop-blur-md border border-white/10 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connectionState === 'CONNECTED' ? 'bg-green-500' : connectionState === 'CONNECTING' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div>
          {connectionState || 'DISCONNECTED'}
        </div>
      </div>

      {/* Question Bank Modal */}
      {isQBModalOpen && (
        <div className="absolute inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsQBModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2"><BookOpen className="text-indigo-600" /> Select Questions to Present</h3>
            <p className="text-slate-500 text-sm mb-4">Choose the exact questions you'd like to share with the class.</p>

            <div className="flex items-center gap-2 mb-4 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search by topic or text..."
                  value={qbSearchFilter}
                  onChange={(e) => setQbSearchFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl pl-10 pr-4 py-3 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all"
                />
              </div>
              <select 
                value={qbDifficultyFilter}
                onChange={(e) => setQbDifficultyFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all cursor-pointer"
              >
                <option value="ALL">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-200 rounded-xl mb-4 bg-slate-50 p-2 space-y-2 min-h-[300px]">
              {departmentQuestions && departmentQuestions
                .filter(q => 
                  ((q.questionText || '').toLowerCase().includes(qbSearchFilter.toLowerCase()) ||
                  (q.topic || '').toLowerCase().includes(qbSearchFilter.toLowerCase()) ||
                  (q.subject || '').toLowerCase().includes(qbSearchFilter.toLowerCase())) &&
                  (qbDifficultyFilter === "ALL" || (q.difficultyLevel && q.difficultyLevel.toLowerCase() === qbDifficultyFilter.toLowerCase()))
                )
                .map((q, idx) => {
                  const isSelected = selectedQBIds.includes(q.id);
                  const cleanText = q.questionText ? q.questionText.replace(/<[^>]+>/g, '').substring(0, 100) + '...' : '';
                  return (
                    <div 
                      key={q.id}
                      onClick={() => {
                        setSelectedQBIds(prev => 
                          prev.includes(q.id) ? prev.filter(id => id !== q.id) : [...prev, q.id]
                        );
                      }}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:border-slate-200'}`}
                    >
                      <div className="mt-0.5 shrink-0">
                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">{q.subject}</span>
                          {q.topic && <span className="text-xs font-medium text-slate-500 truncate">{q.topic}</span>}
                          {q.difficultyLevel && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            q.difficultyLevel.toLowerCase() === 'easy' ? 'bg-green-100 text-green-700' :
                            q.difficultyLevel.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>{q.difficultyLevel}</span>}
                        </div>
                        <p className="text-sm text-slate-800 line-clamp-2">{cleanText}</p>
                      </div>
                    </div>
                  );
              })}
              {(!departmentQuestions || departmentQuestions.length === 0) && (
                <div className="text-center py-10 text-slate-500 font-medium">No questions available in bank.</div>
              )}
            </div>

            <div className="flex items-center justify-between shrink-0 mt-2">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    const filteredIds = departmentQuestions
                      .filter(q => 
                        ((q.questionText || '').toLowerCase().includes(qbSearchFilter.toLowerCase()) ||
                        (q.topic || '').toLowerCase().includes(qbSearchFilter.toLowerCase()) ||
                        (q.subject || '').toLowerCase().includes(qbSearchFilter.toLowerCase())) &&
                        (qbDifficultyFilter === "ALL" || (q.difficultyLevel && q.difficultyLevel.toLowerCase() === qbDifficultyFilter.toLowerCase()))
                      ).map(q => q.id);
                    
                    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedQBIds.includes(id));
                    
                    if (allSelected) {
                      setSelectedQBIds(prev => prev.filter(id => !filteredIds.includes(id)));
                    } else {
                      setSelectedQBIds(prev => [...new Set([...prev, ...filteredIds])]);
                    }
                  }}
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {departmentQuestions && departmentQuestions.filter(q => 
                    ((q.questionText || '').toLowerCase().includes(qbSearchFilter.toLowerCase()) ||
                    (q.topic || '').toLowerCase().includes(qbSearchFilter.toLowerCase()) ||
                    (q.subject || '').toLowerCase().includes(qbSearchFilter.toLowerCase())) &&
                    (qbDifficultyFilter === "ALL" || (q.difficultyLevel && q.difficultyLevel.toLowerCase() === qbDifficultyFilter.toLowerCase()))
                  ).every(q => selectedQBIds.includes(q.id)) && departmentQuestions.filter(q => 
                    ((q.questionText || '').toLowerCase().includes(qbSearchFilter.toLowerCase()) ||
                    (q.topic || '').toLowerCase().includes(qbSearchFilter.toLowerCase()) ||
                    (q.subject || '').toLowerCase().includes(qbSearchFilter.toLowerCase())) &&
                    (qbDifficultyFilter === "ALL" || (q.difficultyLevel && q.difficultyLevel.toLowerCase() === qbDifficultyFilter.toLowerCase()))
                  ).length > 0 ? "Deselect All" : "Select All"}
                </button>
                <span className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">Selected: {selectedQBIds.length}</span>
              </div>
              <button 
                onClick={handleStartQB}
                disabled={selectedQBIds.length === 0}
                className="py-3 px-6 bg-indigo-600 disabled:bg-indigo-400 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-colors"
              >
                Start Presentation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Recording Naming Modal */}
      {pendingRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => cancelRecording()}></div>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
                <Video size={24} />
              </div>
              <h2 className="text-xl font-[900] text-slate-900">Name Your Recording</h2>
              <p className="text-slate-500 text-sm mt-1">Provide a memorable title for this session so students can easily find it.</p>
            </div>
            <div className="p-6">
              <input
                type="text"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-[15px] font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all bg-slate-50"
                placeholder={pendingRecording.defaultName}
                value={newRecordingName}
                onChange={(e) => setNewRecordingName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => cancelRecording()}
                className="px-5 py-2.5 font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => {
                  confirmRecordingName(newRecordingName);
                  setNewRecordingName('');
                }}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md flex items-center gap-2 transition-colors"
              >
                <UploadCloud size={18} /> Save & Upload
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default function LiveClasses({ department }) {
  const [agoraClient] = useState(() => AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }));
  const [isInCall, setIsInCall] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatToast, setChatToast] = useState({ show: false, sender: '', message: '' });
  const prevMessagesLength = useRef(0);

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);

  const [newClass, setNewClass] = useState({ topic: '', time: '', selectedStudents: [], bundleId: '' });
  const [startClassData, setStartClassData] = useState({ topic: '', bundleId: '' });
  const [availableBundles, setAvailableBundles] = useState([]);

  const [activeSessions, setActiveSessions] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [departmentStudents, setDepartmentStudents] = useState([]);
  const [playingVideoUrl, setPlayingVideoUrl] = useState(null);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!department) return;
      try {
        const q = query(
          collection(db, 'joined_students'),
          where('department', '==', department)
        );
        const snapshot = await getDocs(q);
        const students = snapshot.docs.map(doc => doc.data().name);
        setDepartmentStudents(students);
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    };
    fetchStudents();

    const fetchBundles = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'course_bundles'));
        setAvailableBundles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching bundles:", err);
      }
    };
    fetchBundles();
  }, [department]);

  const [departmentQuestions, setDepartmentQuestions] = useState([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const qSnapshot = await getDocs(collection(db, 'question_bank'));
        const qData = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const departmentMapping = {
          'CSE': 'Computer Science (CSE)',
          'ECE': 'Electronics (ECE)',
          'ME': 'Mechanical (ME)',
          'CE': 'Civil (CE)',
          'EE': 'Electrical (EE)',
          'DS': 'Data Science (DS)'
        };
        const teacherFullDept = departmentMapping[department] || department || 'All Departments';

        const filtered = qData.filter(q => {
          if (teacherFullDept === 'All Departments') return true;
          return q.department === teacherFullDept || q.department === 'All Departments' || q.department === 'ALL' || !q.department;
        });

        setDepartmentQuestions(filtered);
      } catch (e) {
        console.error("Failed to fetch questions for live classes", e);
      }
    };
    fetchQuestions();
  }, [department]);

  useEffect(() => {
    const teacherEmail = localStorage.getItem('auth_email');
    if (!teacherEmail) return;

    const q = query(
      collection(db, 'live_sessions'),
      where('teacherEmail', '==', teacherEmail),
      where('status', '==', 'live')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveSessions(sessions);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isInCall || !currentSessionId) return;
    const q = query(collection(db, 'live_chats'), where('sessionId', '==', currentSessionId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      messages.sort((a, b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0));

      if (prevMessagesLength.current > 0 && messages.length > prevMessagesLength.current && !isChatOpen) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.senderEmail !== localStorage.getItem('auth_email')) {
          setChatToast({ show: true, sender: lastMsg.senderName, message: lastMsg.message });
          setTimeout(() => setChatToast(prev => ({ ...prev, show: false })), 5000);
        }
      }
      prevMessagesLength.current = messages.length;

      setChatMessages(messages);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubscribe();
  }, [isInCall, currentSessionId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentSessionId) return;

    try {
      await addDoc(collection(db, 'live_chats'), {
        sessionId: currentSessionId,
        senderName: localStorage.getItem('auth_name') || 'Teacher',
        senderEmail: localStorage.getItem('auth_email') || '',
        message: newMessage,
        timestamp: serverTimestamp()
      });
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message", err);
    }
  };

  const [recentRecordings, setRecentRecordings] = useState([]);

  useEffect(() => {
    let q;
    if (department && department !== 'All Departments') {
      q = query(collection(db, 'recordings'), where('department', 'in', [department, 'General']));
    } else {
      q = query(collection(db, 'recordings'));
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      recs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setRecentRecordings(recs);
    });
    return () => unsubscribe();
  }, [department]);

  const handleConfirmStartMeet = async (e) => {
    if (e) e.preventDefault();
    setIsStartModalOpen(false);

    try {
      const teacherName = localStorage.getItem('auth_name') || 'Teacher';
      const teacherEmail = localStorage.getItem('auth_email') || '';

      const sessionData = {
        teacherName,
        teacherEmail,
        department: department || 'General',
        topic: startClassData.topic || "Instant Live Session",
        status: 'live',
        bundleId: startClassData.bundleId || 'free',
        startedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'live_sessions'), sessionData);
    } catch (e) {
      console.error("Failed to create live session in Firestore", e);
    }
  };

  const handleEndMeet = async (sessionIdToEnd = currentSessionId) => {
    if (sessionIdToEnd === currentSessionId) setIsInCall(false);

    if (sessionIdToEnd) {
      try {
        await updateDoc(doc(db, 'live_sessions', sessionIdToEnd), {
          status: 'ended',
          endedAt: serverTimestamp()
        });
        if (sessionIdToEnd === currentSessionId) setCurrentSessionId(null);
      } catch (e) {
        console.error("Failed to end live session in Firestore", e);
      }
    }

    // Graceful unmount (hooks automatically close tracks on unmount)
    if (sessionIdToEnd === currentSessionId) {
      if (agoraClient) {
        try {
          await agoraClient.leave();
          agoraClient.removeAllListeners();
        } catch (e) {
          console.error("Error leaving Agora channel:", e);
        }
      }
      setIsInCall(false);
      setCurrentSessionId(null);
    }
  };

  const handleScheduleSubmit = (e) => {
    e.preventDefault();
    if (!newClass.topic || !newClass.time) return;

    setUpcomingClasses([
      ...upcomingClasses,
      {
        id: Date.now(),
        topic: newClass.topic,
        time: newClass.time,
        students: newClass.selectedStudents.length || departmentStudents.length,
        duration: "1h 00m"
      }
    ]);
    setIsScheduleModalOpen(false);
    setNewClass({ topic: "", time: "", selectedStudents: [] });
  };

  const toggleStudentSelection = (studentName) => {
    if (newClass.selectedStudents.includes(studentName)) {
      setNewClass({ ...newClass, selectedStudents: newClass.selectedStudents.filter(s => s !== studentName) });
    } else {
      setNewClass({ ...newClass, selectedStudents: [...newClass.selectedStudents, studentName] });
    }
  };

  if (isInCall && currentSessionId) {
    const rtcProps = {
      appId: import.meta.env.VITE_AGORA_APP_ID || '',
      channel: 'MS_ACADEMY',
      token: import.meta.env.VITE_AGORA_TEMP_TOKEN || null,
      role: 'host',
      layout: 0,
      enableScreensharing: true
    };

    const callbacks = {
      EndCall: () => handleEndMeet(),
    };

    return (
      <div className="fixed inset-0 z-[100] bg-[#111827] w-full h-full flex overflow-hidden">
        {!rtcProps.appId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white p-8 text-center">
            <h3 className="text-2xl font-bold text-red-400 mb-4">Agora App ID Missing</h3>
            <p className="text-slate-300 max-w-md">Please add your Agora App ID to the <code className="bg-slate-800 px-2 py-1 rounded">.env</code> file as <code className="bg-slate-800 px-2 py-1 rounded">VITE_AGORA_APP_ID</code> and restart the server.</p>
            <button onClick={handleEndMeet} className="mt-6 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-colors">Go Back</button>
          </div>
        ) : (
          <div className="flex-1 w-full h-full flex overflow-hidden">
            <AgoraRTCProvider client={agoraClient}>
              <TeacherCall
                appId={rtcProps.appId}
                channel={rtcProps.channel}
                token={rtcProps.token}
                sessionId={currentSessionId}
                handleEndMeet={handleEndMeet}
                isChatOpen={isChatOpen}
                toggleChat={() => setIsChatOpen(!isChatOpen)}
                chatToast={chatToast}
                setChatToast={setChatToast}
                departmentQuestions={departmentQuestions}
                department={department}
              />
            </AgoraRTCProvider>

            {/* CHAT SIDEBAR */}
            {isChatOpen && (
              <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={18} className="text-blue-400" />
                    <h3 className="text-white font-bold text-sm">Live Chat</h3>
                  </div>
                  <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-slate-500 text-sm mt-10">No messages yet. Say hi!</div>
                  ) : (
                    chatMessages.map(msg => (
                      <div key={msg.id} className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-500 mb-1">{msg.senderName}</span>
                        <div className={`px-3 py-2 rounded-xl text-sm max-w-[90%] break-words ${msg.senderEmail === localStorage.getItem('auth_email') ? 'bg-blue-600 text-white self-end rounded-tr-sm' : 'bg-slate-800 text-slate-200 self-start rounded-tl-sm'}`}>
                          {msg.message}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={sendMessage} className="p-3 border-t border-slate-800 bg-slate-900">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-slate-800 border-none rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <button type="submit" disabled={!newMessage.trim()} className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors">
                      <Send size={16} />
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Regular Dashboard View
  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm min-h-[calc(100vh-140px)] flex flex-col relative">

      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-[900] text-slate-900 tracking-tight flex items-center gap-2">
            <Video className="text-blue-600" size={28} />
            Live Classes
          </h2>
          <p className="text-slate-500 font-medium mt-1">Manage your virtual classrooms and recordings.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center gap-2"
          >
            <Calendar size={18} /> Schedule Class
          </button>
          <button
            onClick={() => setIsStartModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] flex items-center gap-2"
          >
            <Plus size={18} strokeWidth={2.5} /> Start Instant Class
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">

        {/* Main Section */}
        <div className="lg:col-span-2 space-y-8">

          {/* Active Sessions */}
          {activeSessions.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                Active Live Sessions
              </h3>
              <div className="space-y-4">
                {activeSessions.map((session) => (
                  <div key={session.id} className="p-5 border-2 border-red-200 rounded-2xl bg-red-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    <div className="relative z-10">
                      <div className="text-sm font-bold text-red-600 mb-1 flex items-center gap-2">
                        LIVE NOW
                      </div>
                      <h4 className="text-lg font-[800] text-slate-900 mb-1">{session.topic}</h4>
                      <p className="text-slate-600 font-medium text-[14px]">by {session.teacherName}</p>
                    </div>

                    <div className="flex flex-row items-center gap-3 relative z-10">
                      <button
                        onClick={() => handleEndMeet(session.id)}
                        className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        End Class
                      </button>
                      <button
                        onClick={() => {
                          setCurrentSessionId(session.id);
                          setIsInCall(true);
                        }}
                        className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-red-500/20"
                      >
                        Join <Video size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Classes */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock className="text-orange-500" size={20} /> Upcoming Sessions
            </h3>

            <div className="space-y-4">
              {upcomingClasses.map((cls) => (
                <div key={cls.id} className="p-5 border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all group bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-blue-600 mb-1">{cls.time}</div>
                    <h4 className="text-lg font-[800] text-slate-900 mb-1">{cls.topic}</h4>

                    <div className="flex items-center gap-4 mt-4 text-[13px] font-semibold text-slate-400">
                      <span className="flex items-center gap-1.5"><Users size={14} /> {cls.students} Enrolled</span>
                      <span className="flex items-center gap-1.5"><Clock size={14} /> {cls.duration}</span>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2 mt-2 sm:mt-0">
                    <button
                      onClick={() => {
                        setStartClassData({ topic: cls.topic });
                        setIsStartModalOpen(true);
                      }}
                      className="w-full sm:w-auto px-6 py-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                      Start Class <Video size={16} />
                    </button>
                    <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                </div>
              ))}

              {upcomingClasses.length === 0 && (
                <div className="text-center p-10 border border-dashed border-slate-300 rounded-2xl bg-slate-50">
                  <p className="text-slate-500 font-medium">No upcoming classes scheduled.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Section: Recent Recordings */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <PlayCircle className="text-purple-500" size={20} /> Recent Recordings
          </h3>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            {recentRecordings.length === 0 ? (
              <p className="text-slate-400 text-sm font-medium text-center py-4">No recordings yet.</p>
            ) : (
              recentRecordings.map(rec => (
                <div key={rec.id} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-purple-200 transition-colors group cursor-pointer" onClick={() => setPlayingVideoUrl(rec.url)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <PlayCircle size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{rec.fileName}</h4>
                      <p className="text-[11px] text-slate-500 font-bold">{new Date(rec.createdAt?.toMillis() || Date.now()).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Watch Recording">
                    <Play size={16} fill="currentColor" />
                  </button>
                </div>
              ))
            )}
          </div>

          <button className="w-full py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-100">
            View All Recordings
          </button>
        </div>

      </div>

      {/* Start Instant Class Modal */}
      {isStartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-[900] text-slate-800">Start Live Class</h2>
              <button onClick={() => setIsStartModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <form id="start-form" onSubmit={handleConfirmStartMeet} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Class Topic / Title</label>
                  <input
                    type="text"
                    required
                    value={startClassData.topic}
                    onChange={(e) => setStartClassData({ ...startClassData, topic: e.target.value })}
                    placeholder="e.g. Advanced Database Optimization"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl flex justify-end gap-3">
              <button
                onClick={() => setIsStartModalOpen(false)}
                className="px-5 py-2.5 font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                form="start-form"
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
              >
                <Video size={16} /> Go Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Class Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-[900] text-slate-800">Schedule Targeted Class</h2>
              <button onClick={() => setIsScheduleModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="schedule-form" onSubmit={handleScheduleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Class Topic</label>
                  <input
                    type="text"
                    required
                    value={newClass.topic}
                    onChange={(e) => setNewClass({ ...newClass, topic: e.target.value })}
                    placeholder="e.g. Advanced Database Optimization"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Date & Time</label>
                    <input
                      type="text"
                      required
                      value={newClass.time}
                      onChange={(e) => setNewClass({ ...newClass, time: e.target.value })}
                      placeholder="e.g. Tomorrow, 4:00 PM"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Invite Specific Students</label>
                  <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                    {departmentStudents.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500 text-center">No students found in your department ({department}).</p>
                    ) : (
                      departmentStudents.map((student, idx) => (
                        <label key={idx} onClick={() => toggleStudentSelection(student)} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors last:border-0">
                          <div className={`w-5 h-5 rounded flex items-center justify-center border ${newClass.selectedStudents.includes(student) ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 bg-white'}`}>
                            {newClass.selectedStudents.includes(student) && <Check size={14} strokeWidth={3} />}
                          </div>
                          <span className="text-[14px] font-medium text-slate-700">{student}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-[12px] text-slate-500 mt-2 flex items-center gap-1">
                    <UserPlus size={14} /> {newClass.selectedStudents.length === 0 ? "All enrolled students will be invited." : `${newClass.selectedStudents.length} student(s) selected.`}
                  </p>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl flex justify-end gap-3">
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-5 py-2.5 font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                form="schedule-form"
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md"
              >
                Schedule Class
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. In-App Video Player Modal */}
      {playingVideoUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setPlayingVideoUrl(null)}></div>
          <div className="relative z-10 w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl bg-black border border-slate-800 animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setPlayingVideoUrl(null)} 
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors backdrop-blur-sm"
            >
              <X size={20} />
            </button>
            <video 
              src={playingVideoUrl} 
              controls 
              autoPlay 
              className="w-full h-auto max-h-[85vh] outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}