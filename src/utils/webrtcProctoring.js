// 100% Free, Zero-Cost, Tokenless WebRTC Proctoring Helper
// Uses native WebRTC + Google public STUN servers + Firebase Firestore ephemeral signaling.
// $0.00 cost: Peer-to-peer live stream, NO media recording, NO storage bucket upload.

import { db } from '../firebase';
import { 
  collection, doc, setDoc, updateDoc, deleteDoc, 
  onSnapshot, serverTimestamp, query 
} from 'firebase/firestore';

export const RTC_CONFIGURATION = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 6
};

// Low bandwidth, video-only stream (320x240 @ 15fps, no audio) to minimize network load
export async function getLowBandwidthWebcamStream() {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error('WebRTC / Camera API is not supported in this browser environment.');
  }

  return await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      width: { ideal: 320, max: 480 },
      height: { ideal: 240, max: 360 },
      frameRate: { ideal: 15, max: 20 },
      facingMode: 'user'
    }
  });
}

// Helper to sanitize student IDs for Firestore doc keys
export function sanitizeStudentId(emailOrName) {
  if (!emailOrName) return 'anonymous_' + Math.random().toString(36).substring(2, 8);
  return String(emailOrName).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

// Waits for STUN candidates to gather into localDescription (vanilla SDP ICE)
export function waitForIceGathering(pc, maxTimeoutMs = 1000) {
  if (pc.iceGatheringState === 'complete') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let timer = null;
    const checkState = () => {
      if (pc.iceGatheringState === 'complete') {
        if (timer) clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }
    };
    timer = setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', checkState);
      resolve();
    }, maxTimeoutMs);
    pc.addEventListener('icegatheringstatechange', checkState);
  });
}

/**
 * Student Proctoring Session Controller:
 * - Upserts active session in `active_proctoring/{testId}/students/{studentId}`
 * - Listens for viewer offers under `.../viewers`
 * - Answers incoming viewer peer connections
 * - Provides cleanup on exam finish or unmount
 */
export function startStudentProctoringSession({
  testId,
  testTitle,
  department,
  studentId,
  studentName,
  studentEmail,
  regNo,
  totalQuestions,
  localStream,
  onWarningReceived,
  onError
}) {
  const sanitizedId = sanitizeStudentId(studentId || studentEmail || studentName);
  const studentDocRef = doc(db, 'active_proctoring', testId, 'students', sanitizedId);
  const testDocRef = doc(db, 'active_proctoring', testId);
  const viewersColRef = collection(db, 'active_proctoring', testId, 'students', sanitizedId, 'viewers');

  const peerConnections = new Map(); // viewerId -> RTCPeerConnection
  let unsubViewers = null;
  let unsubStudentDoc = null;
  let isCleanedUp = false;

  const init = async () => {
    try {
      // 1. Ensure test metadata doc exists
      await setDoc(testDocRef, {
        id: testId,
        title: testTitle || 'Proctored Test',
        department: department || 'General',
        lastActiveAt: serverTimestamp()
      }, { merge: true });

      // 2. Register student session
      await setDoc(studentDocRef, {
        studentId: sanitizedId,
        studentName: studentName || 'Student',
        studentEmail: studentEmail || '',
        regNo: regNo || (studentEmail ? studentEmail.split('@')[0] : 'N/A'),
        department: department || 'General',
        testId,
        testTitle: testTitle || '',
        cameraStatus: 'active',
        joinedAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        tabSwitchCount: 0,
        questionsAnswered: 0,
        totalQuestions: totalQuestions || 0,
        warningMessage: null,
        warningTimestamp: null
      }, { merge: true });

      // 3. Listen for invigilator warning updates
      unsubStudentDoc = onSnapshot(studentDocRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.warningMessage && onWarningReceived) {
          onWarningReceived({
            message: data.warningMessage,
            timestamp: data.warningTimestamp,
            id: data.warningId || String(data.warningTimestamp?.seconds || Date.now()),
            sentBy: data.sentBy || 'Exam Invigilator'
          });
        }
      }, (err) => {
        console.warn('Proctoring studentDoc listener error:', err);
      });

      // 4. Listen for incoming viewer connection requests
      unsubViewers = onSnapshot(viewersColRef, async (snapshot) => {
        if (isCleanedUp) return;

        for (const change of snapshot.docChanges()) {
          const viewerId = change.doc.id;
          const viewerData = change.doc.data();

          if (change.type === 'removed') {
            // Invigilator closed tile / navigated away
            const existingPc = peerConnections.get(viewerId);
            if (existingPc) {
              existingPc.close();
              peerConnections.delete(viewerId);
            }
            continue;
          }

          if ((change.type === 'added' || change.type === 'modified') && viewerData?.offer && !viewerData?.answer) {
            try {
              // Close prior connection for this viewerId if any
              const oldPc = peerConnections.get(viewerId);
              if (oldPc) {
                oldPc.close();
                peerConnections.delete(viewerId);
              }

              const pc = new RTCPeerConnection(RTC_CONFIGURATION);
              peerConnections.set(viewerId, pc);

              // Attach local low-bandwidth video tracks
              if (localStream) {
                localStream.getTracks().forEach((track) => {
                  pc.addTrack(track, localStream);
                });
              }

              // Set incoming offer
              await pc.setRemoteDescription(new RTCSessionDescription(viewerData.offer));

              // Create answer
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              // Gather STUN candidates
              await waitForIceGathering(pc, 900);

              // Write answer back to Firestore
              const viewerDocRef = doc(db, 'active_proctoring', testId, 'students', sanitizedId, 'viewers', viewerId);
              await updateDoc(viewerDocRef, {
                answer: {
                  type: pc.localDescription.type,
                  sdp: pc.localDescription.sdp
                },
                answeredAt: serverTimestamp()
              });
            } catch (peerErr) {
              console.error(`Error answering viewer ${viewerId}:`, peerErr);
            }
          }
        }
      }, (err) => {
        console.warn('Proctoring viewers listener error:', err);
      });

    } catch (e) {
      console.error('Failed to initialize student proctoring session:', e);
      onError?.(e);
    }
  };

  init();

  // Return session controller
  return {
    studentId: sanitizedId,
    updateProgress: async ({ questionsAnswered, currentIdx }) => {
      if (isCleanedUp) return;
      try {
        await updateDoc(studentDocRef, {
          questionsAnswered: typeof questionsAnswered === 'number' ? questionsAnswered : 0,
          currentQuestionIndex: typeof currentIdx === 'number' ? currentIdx : 0,
          lastSeen: serverTimestamp()
        });
      } catch (e) {
        // Silent fail for non-critical progress pulse
      }
    },
    recordTabSwitch: async (newCount) => {
      if (isCleanedUp) return;
      try {
        await updateDoc(studentDocRef, {
          tabSwitchCount: newCount,
          lastTabSwitchAt: serverTimestamp()
        });
      } catch (e) {
        console.warn('Failed to record tab switch:', e);
      }
    },
    cleanup: async () => {
      isCleanedUp = true;
      if (unsubViewers) unsubViewers();
      if (unsubStudentDoc) unsubStudentDoc();

      // Close all active peer connections
      peerConnections.forEach((pc) => {
        try { pc.close(); } catch (e) {}
      });
      peerConnections.clear();

      // Stop local video tracks
      if (localStream) {
        try {
          localStream.getTracks().forEach((track) => track.stop());
        } catch (e) {}
      }

      // Remove or mark student session as ended
      try {
        await deleteDoc(studentDocRef);
      } catch (e) {
        try {
          await updateDoc(studentDocRef, { cameraStatus: 'ended', endedAt: serverTimestamp() });
        } catch (err) {}
      }
    }
  };
}

/**
 * Invigilator Viewer Hook / Controller:
 * Connects to a single student's live feed peer-to-peer.
 */
export function connectToStudentLiveFeed({
  testId,
  studentId,
  onRemoteStream,
  onConnectionStateChange,
  onError
}) {
  const viewerSessionId = 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const viewerDocRef = doc(db, 'active_proctoring', testId, 'students', studentId, 'viewers', viewerSessionId);

  let pc = null;
  let unsubDoc = null;
  let hasSetRemote = false;
  let isCleanedUp = false;

  const start = async () => {
    try {
      pc = new RTCPeerConnection(RTC_CONFIGURATION);

      pc.onconnectionstatechange = () => {
        onConnectionStateChange?.(pc.connectionState);
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          onRemoteStream?.(event.streams[0]);
        }
      };

      // Add receive-only video transceiver
      pc.addTransceiver('video', { direction: 'recvonly' });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait briefly for STUN candidates
      await waitForIceGathering(pc, 900);

      if (isCleanedUp) return;

      // Write offer to Firestore
      await setDoc(viewerDocRef, {
        offer: {
          type: pc.localDescription.type,
          sdp: pc.localDescription.sdp
        },
        viewerId: viewerSessionId,
        createdAt: serverTimestamp()
      });

      // Listen for answer
      unsubDoc = onSnapshot(viewerDocRef, async (snap) => {
        if (!snap.exists() || isCleanedUp) return;
        const data = snap.data();
        if (data?.answer && !hasSetRemote && pc && pc.signalingState !== 'closed') {
          hasSetRemote = true;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          } catch (err) {
            console.warn('Failed to set remote answer description:', err);
          }
        }
      }, (err) => {
        console.warn('Viewer answer snapshot error:', err);
      });

    } catch (e) {
      console.error('Failed to establish viewer peer connection:', e);
      onError?.(e);
    }
  };

  start();

  return () => {
    isCleanedUp = true;
    if (unsubDoc) unsubDoc();
    if (pc) {
      try { pc.close(); } catch (e) {}
    }
    // Delete ephemeral signaling doc
    deleteDoc(viewerDocRef).catch(() => {});
  };
}
