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
  MoreHorizontal,
  PlayCircle,
  Users,
  User,
  Check,
  UserPlus,
  X,
  MessageCircle,
  Pin,
  PinOff,
  Send,
  PenTool,
  BookOpen,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
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
  useConnectionState
} from "agora-rtc-react";
import Whiteboard from './Whiteboard';

// Extracted component to handle whiteboard sharing as an independent client
const WhiteboardShareClient = ({ appId, channel, token, stream }) => {
  const [wbClient] = useState(() => AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }));

  useEffect(() => {
    let isMounted = true;
    let track = null;

    if (stream && stream.getVideoTracks().length > 0) {
      try {
        track = AgoraRTC.createCustomVideoTrack({
          mediaStreamTrack: stream.getVideoTracks()[0]
        });

        wbClient.join(appId, channel, token, 999998).then(() => {
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
const ScreenShareClient = ({ appId, channel, token, onTrackEnded }) => {
  const [screenClient] = useState(() => AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }));
  const [screenTrack, setScreenTrack] = useState(null);
  const [screenAudioTrack, setScreenAudioTrack] = useState(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let localVidTrack = null;
    let localAudTrack = null;

    const initScreenShare = async () => {
      try {
        // "enable" tells the browser to capture system audio if the user allows it
        const tracks = await AgoraRTC.createScreenVideoTrack({}, "enable");
        
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

        setScreenTrack(localVidTrack);
        if (localAudTrack) setScreenAudioTrack(localAudTrack);

        const handleTrackEnded = () => {
          if (onTrackEnded) onTrackEnded();
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
        if (onTrackEnded) onTrackEnded();
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
      }
      screenClient.leave();
    };
  }, [screenClient, appId, channel, token, onTrackEnded]);

  if (!screenTrack || !joined) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white font-bold animate-pulse">
        Initializing Screen Share...
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <LocalVideoTrack track={screenTrack} play={true} className="w-full h-full object-cover" />
      {screenAudioTrack && (
        <div className="absolute top-4 left-4 bg-black/70 px-3 py-1 rounded-full text-white text-xs font-bold shadow-md z-30 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          Audio Shared
        </div>
      )}
    </div>
  );
};

// Extracted TeacherCall component for custom Agora rendering
const TeacherCall = ({ appId, channel, token, handleEndMeet, sessionId, isRecording, togglePauseRecording, stopRecording, startRecording, isPaused, recordingTime, formatTime, isChatOpen, toggleChat, chatToast, setChatToast, departmentQuestions }) => {
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const [whiteboardOn, setWhiteboardOn] = useState(false);
  const [whiteboardStream, setWhiteboardStream] = useState(null);
  const [pinnedUid, setPinnedUid] = useState(null);
  const [participantNames, setParticipantNames] = useState({});
  const client = useRTCClient();
  const connectionState = useConnectionState();

  // Question Bank State
  const [isQBModalOpen, setIsQBModalOpen] = useState(false);
  const [qbRangeInput, setQbRangeInput] = useState("");
  const [activeQuestionState, setActiveQuestionState] = useState(null);

  useEffect(() => {
    if (client.uid && sessionId) {
      const userName = localStorage.getItem('auth_name') || 'Teacher';
      setDoc(doc(db, 'live_sessions', sessionId, 'participants', client.uid.toString()), {
        name: userName
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

  // Microphone Lifecycle
  useEffect(() => {
    let track = null;
    let isCancelled = false;

    if (micOn) {
      AgoraRTC.createMicrophoneAudioTrack().then(async (t) => {
        if (isCancelled) { t.close(); return; }
        track = t;
        setLocalMicrophoneTrack(t);
        if (client.connectionState === 'CONNECTED') {
          await client.publish(t);
        }
      }).catch(console.error);
    }

    return () => {
      isCancelled = true;
      if (track) {
        if (client.localTracks.includes(track)) {
          client.unpublish(track).finally(() => {
            track.stop();
            track.close();
          });
        } else {
          track.stop();
          track.close();
        }
      }
      setLocalMicrophoneTrack(null);
    };
  }, [micOn, client, client.connectionState]);

  // Camera Lifecycle
  useEffect(() => {
    let track = null;
    let isCancelled = false;

    if (cameraOn) {
      AgoraRTC.createCameraVideoTrack().then(async (t) => {
        if (isCancelled) { t.close(); return; }
        track = t;
        setLocalCameraTrack(t);
        if (client.connectionState === 'CONNECTED') {
          await client.publish(t);
        }
      }).catch(console.error);
    }

    return () => {
      isCancelled = true;
      if (track) {
        if (client.localTracks.includes(track)) {
          client.unpublish(track).finally(() => {
            track.stop();
            track.close();
          });
        } else {
          track.stop();
          track.close();
        }
      }
      setLocalCameraTrack(null);
    };
  }, [cameraOn, client, client.connectionState]);

  // Publish tracks if connection happens after creation
  useEffect(() => {
    if (client.connectionState === 'CONNECTED') {
      if (localMicrophoneTrack && !client.localTracks.includes(localMicrophoneTrack)) {
        client.publish(localMicrophoneTrack).catch(console.error);
      }
      if (localCameraTrack && !client.localTracks.includes(localCameraTrack)) {
        client.publish(localCameraTrack).catch(console.error);
      }
    }
  }, [client.connectionState, localMicrophoneTrack, localCameraTrack, client]);

  const remoteUsers = useRemoteUsers();
  const remoteUserStyle = { width: '100%', height: '100%' };

  // Actually trigger subscriptions for the remote users
  useRemoteVideoTracks(remoteUsers);
  useRemoteAudioTracks(remoteUsers);

  // Filter out the Screen Share client and Whiteboard client so they don't appear as remote users
  const filteredUsers = remoteUsers.filter(u => u.uid !== 999999 && u.uid !== 999998);

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
    if (activeQuestionState?.isActive && pinnedUid !== 'question-bank') {
      setPinnedUid('question-bank');
    } else if (!activeQuestionState?.isActive && pinnedUid === 'question-bank') {
      setPinnedUid(null);
    }

    if (!whiteboardOn && pinnedUid === 'local-whiteboard') {
      setPinnedUid(null);
    }

    if (!screenShareOn && pinnedUid === 'local-screen') {
      setPinnedUid(null);
    }
  }, [activeQuestionState?.isActive, whiteboardOn, screenShareOn, pinnedUid]);

  const handleStartQB = async () => {
    if (!qbRangeInput.trim() || !departmentQuestions) return;

    // Parse range, e.g., "1-5" or just "1"
    const parts = qbRangeInput.split('-').map(p => parseInt(p.trim()));
    let startIdx = 0;
    let endIdx = 0;

    if (parts.length === 1 && !isNaN(parts[0])) {
      startIdx = parts[0] - 1;
      endIdx = parts[0] - 1;
    } else if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      startIdx = parts[0] - 1;
      endIdx = parts[1] - 1;
    } else {
      alert("Invalid range format. Use e.g. 1-5");
      return;
    }

    if (startIdx < 0) startIdx = 0;
    if (endIdx >= departmentQuestions.length) endIdx = departmentQuestions.length - 1;
    if (startIdx > endIdx) {
      alert("Invalid range.");
      return;
    }

    const selectedQList = departmentQuestions.slice(startIdx, endIdx + 1);

    if (selectedQList.length === 0) {
      alert("No questions found in that range.");
      return;
    }

    setIsQBModalOpen(false);
    setQbRangeInput("");
    setWhiteboardOn(true);

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
        setWhiteboardOn(false);
        await updateDoc(doc(db, 'live_sessions', sessionId), {
          activeQuestionState: null
        });
      }
    }
  };

  const handleCloseQB = async () => {
    setWhiteboardOn(false);
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
      const qbTile = (
        <div key="question-bank" className={`relative overflow-hidden bg-white shadow-xl group transition-all duration-300 ${isPinned ? 'absolute inset-0 z-0 h-full w-full' : 'w-48 h-32 shrink-0 z-50 rounded-2xl pointer-events-none p-4'}`}>

          {/* Base Layer: Question Content */}
          <div className={`absolute inset-0 w-full h-full flex flex-col max-w-6xl mx-auto ${isPinned ? 'p-8 md:p-12 pt-28' : 'pt-12'} z-10 pointer-events-none`}>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
              <h2 className={`${isPinned ? 'text-2xl md:text-4xl leading-snug mb-10' : 'text-sm mb-2'} font-bold text-slate-900 whitespace-normal break-words`}>
                <span className="text-slate-500 mr-3 md:mr-4">Q.{activeQuestionState.currentIndex + 1}</span>
                <span dangerouslySetInnerHTML={{ __html: activeQuestionState.questions[activeQuestionState.currentIndex].questionText }} />
              </h2>

              {activeQuestionState.questions[activeQuestionState.currentIndex].questionImageUrl && (
                <img src={activeQuestionState.questions[activeQuestionState.currentIndex].questionImageUrl} alt="Question" className={`${isPinned ? 'max-h-[40vh] mb-10' : 'max-h-16 mb-2'} object-contain`} />
              )}

              <div className="flex flex-col gap-4 md:gap-6 pl-4 md:pl-8">
                {['A', 'B', 'C', 'D'].map(opt => {
                  const text = activeQuestionState.questions[activeQuestionState.currentIndex][`option${opt}`];
                  if (!text) return null;
                  const isCorrect = activeQuestionState.questions[activeQuestionState.currentIndex].correctAnswer === opt;
                  const isRevealed = activeQuestionState.isAnswerRevealed;

                  return (
                    <div key={opt} className={`flex items-center text-xl md:text-2xl font-semibold transition-all ${isRevealed && isCorrect ? 'text-green-600 bg-green-50 p-4 rounded-xl inline-block w-max' : 'text-slate-800'}`}>
                      <span className="mr-4 font-bold">( {opt} )</span>
                      <span dangerouslySetInnerHTML={{ __html: text }} />
                      {isRevealed && isCorrect && <CheckCircle2 size={24} className="inline ml-4 text-green-500" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Middle Layer: Whiteboard Overlay */}
          {whiteboardOn && isPinned && (
            <div className="absolute inset-0 z-20 mix-blend-multiply pointer-events-auto">
              <Whiteboard onStreamReady={setWhiteboardStream} isOverlay={true} />
              <WhiteboardShareClient appId={appId} channel={channel} token={token} stream={whiteboardStream} />
            </div>
          )}

          {/* Top Layer: Controls */}
          {isPinned && (
            <div className={`absolute inset-x-0 top-0 w-full max-w-6xl mx-auto p-8 md:p-12 z-30 pointer-events-none flex justify-end items-start`}>
              <div className="flex gap-4 items-center pointer-events-auto">
                <button onClick={handleNextQB} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-bold shadow-md transition-transform hover:scale-105" title={activeQuestionState.isAnswerRevealed ? "Next Question" : "Reveal Answer"}>
                  {activeQuestionState.isAnswerRevealed ? "Next" : "Reveal"}
                </button>
                <button onClick={handleCloseQB} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><X size={20} /></button>
              </div>
            </div>
          )}

          <button onClick={() => togglePin('question-bank')} className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-[70] pointer-events-auto">
            {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
        </div>
      );
      if (isPinned) pinnedTiles.push(qbTile);
      else unpinnedTiles.push(qbTile);
    }

    // 0. Whiteboard (Local)
    const isQuestionBankActive = activeQuestionState?.isActive && activeQuestionState.questions;
    if (whiteboardOn && !isQuestionBankActive) {
      const isPinned = pinnedUid === 'local-whiteboard';
      const wbTile = (
        <div key="local-whiteboard" className={`relative rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800 group transition-all duration-300 ${isPinned ? 'absolute inset-0 z-0 rounded-none border-none h-full w-full' : (pinnedUid ? 'w-48 h-32 shrink-0 z-50 pointer-events-none' : 'h-full w-full')}`}>
          <div className="absolute inset-0 z-10 pointer-events-auto">
            <Whiteboard onStreamReady={setWhiteboardStream} />
          </div>
          {whiteboardStream && (
            <WhiteboardShareClient appId={appId} channel={channel} token={token} stream={whiteboardStream} />
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
          <ScreenShareClient appId={appId} channel={channel} token={token} onTrackEnded={() => setScreenShareOn(false)} />
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
        <div className={`absolute top-2 left-2 md:top-4 md:left-4 bg-black/70 px-2 py-1 md:px-3 md:py-1 rounded-lg text-white text-xs md:text-sm font-bold shadow-md z-30 ${pinnedUid && !isLocalPinned ? 'scale-75 origin-top-left' : ''}`}>You (Teacher)</div>
        <button onClick={() => togglePin('local-camera')} className="absolute top-2 right-2 md:top-4 md:right-4 p-2 bg-black/50 hover:bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-30">
          {isLocalPinned ? <PinOff size={16} /> : <Pin size={16} />}
        </button>
      </div>
    );
    if (isLocalPinned) pinnedTiles.push(localTile);
    else unpinnedTiles.push(localTile);

    // 3. Remote Users
    filteredUsers.forEach(user => {
      const isPinned = pinnedUid === user.uid;
      const userName = participantNames[user.uid] || `Student ${user.uid}`;
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
            {userName} {!user.hasAudio && <MicOff size={12} className="inline ml-1 text-red-400" />}
          </div>
          <button onClick={() => togglePin(user.uid)} className="absolute top-2 right-2 md:top-4 md:right-4 p-2 bg-black/50 hover:bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-30">
            {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
        </div>
      );
      if (isPinned) pinnedTiles.push(remoteTile);
      else unpinnedTiles.push(remoteTile);
    });

    return { pinnedTiles, unpinnedTiles };
  };

  const { pinnedTiles, unpinnedTiles } = renderGridTiles();
  const isScreenSharePinned = pinnedUid === 'local-screen' || pinnedUid === 999999;

  return (
    <div className="flex-1 flex flex-col relative bg-black">
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

      {/* Video Grid */}
      <div className={`flex-1 relative ${pinnedUid ? 'overflow-hidden' : `p-4 grid ${gridColsClass} gap-4 auto-rows-fr`}`}>
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
          {!isRecording ? (
            <button
              onClick={() => startRecording(localMicrophoneTrack)}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-red-500 hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
              title="Record Session"
            >
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </button>
          ) : (
            <div className="flex gap-2 bg-red-600/20 rounded-full p-1 border border-red-500/30 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
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
            onClick={() => setIsQBModalOpen(true)}
            className={`flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full transition-all shadow-lg ${activeQuestionState?.isActive ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
            title="Question Bank"
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

          <button
            onClick={() => setScreenShareOn(!screenShareOn)}
            className={`w-12 h-12 rounded-full border-[1.5px] flex items-center justify-center transition-all ${screenShareOn ? 'border-transparent bg-white text-[#0078FF] shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'border-white text-white hover:bg-white/20'}`}
            title={screenShareOn ? 'Stop Sharing' : 'Share Screen'}
          >
            <MonitorUp size={22} strokeWidth={1.5} />
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
            className="w-12 h-12 rounded-full text-white flex items-center justify-center control-btn-danger"
            title="End Call"
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
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsQBModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2"><BookOpen className="text-indigo-600" /> Question Bank</h3>
            <p className="text-slate-500 text-sm mb-6">Enter the question number range you'd like to present to the class.</p>

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Question Range (e.g. 1-5)</label>
              <input
                type="text"
                value={qbRangeInput}
                onChange={(e) => setQbRangeInput(e.target.value)}
                placeholder="1-5"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button onClick={handleStartQB} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-colors">
              Start Presentation
            </button>
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

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

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

  const [newClass, setNewClass] = useState({ topic: '', time: '', selectedStudents: [] });
  const [startClassData, setStartClassData] = useState({ topic: '' });

  const [activeSessions, setActiveSessions] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [departmentStudents, setDepartmentStudents] = useState([]);

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

  const recentRecordings = [];

  const handleConfirmStartMeet = async (e) => {
    if (e) e.preventDefault();
    setIsStartModalOpen(false);
    setIsInCall(true);

    try {
      const teacherName = localStorage.getItem('auth_name') || 'Teacher';
      const teacherEmail = localStorage.getItem('auth_email') || '';

      const sessionData = {
        teacherName,
        teacherEmail,
        department: department || 'General',
        topic: startClassData.topic || "Instant Live Session",
        status: 'live',
        startedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'live_sessions'), sessionData);
      setCurrentSessionId(docRef.id);
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

  const startRecording = async (localMicTrack) => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true,
        preferCurrentTab: true,
        systemAudio: "exclude"
      });

      const tracks = [...displayStream.getTracks()];

      // Reuse the existing noise-cancelled Agora mic track instead of requesting a new raw one
      if (localMicTrack) {
        tracks.push(localMicTrack.getMediaStreamTrack());
      }

      const combinedStream = new MediaStream(tracks);

      const mediaRecorder = new MediaRecorder(combinedStream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        a.download = `LiveClass_Recording_${new Date().toISOString().replace(/:/g, '-')}.webm`;
        a.click();
        window.URL.revokeObjectURL(url);
        setIsRecording(false);
      };

      displayStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      };

      mediaRecorder.start();
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
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
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
                isRecording={isRecording}
                togglePauseRecording={togglePauseRecording}
                stopRecording={stopRecording}
                startRecording={startRecording}
                isPaused={isPaused}
                recordingTime={recordingTime}
                formatTime={formatTime}
                isChatOpen={isChatOpen}
                toggleChat={() => setIsChatOpen(!isChatOpen)}
                chatToast={chatToast}
                setChatToast={setChatToast}
                departmentQuestions={departmentQuestions}
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
                        Re-Join <Video size={16} />
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

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
            {recentRecordings.length === 0 && (
              <p className="text-slate-400 text-sm font-medium text-center py-4">No recordings yet.</p>
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
    </div>
  );
}