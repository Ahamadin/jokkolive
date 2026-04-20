// src/features/stream/context/StreamContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// E2EE — API officielle LiveKit :
//
//  ORDRE OBLIGATOIRE (source : docs.livekit.io + client-sdk-js Room.ts) :
//   1. keyProvider = new ExternalE2EEKeyProvider()           ← createKeyProvider()
//   2. new Room({ encryption: { keyProvider, worker } })     ← createE2EEWorker()
//   3. await keyProvider.setKey(roomCode)                    ← PBKDF2 auto (string)
//   4. await room.setE2EEEnabled(true)                       ← active sur tous les tracks
//   5. await room.connect(url, token)                        ← connexion normale
//
//  Désactivation : await room.setE2EEEnabled(false)
//
//  Preuves SDK :
//   • RoomEvent.ParticipantEncryptionStatusChanged(enabled, participant)
//     → émis par le SDK quand un participant active/désactive réellement E2EE
//   • RoomEvent.EncryptionError(error, participant)
//     → émis si une frame ne peut pas être déchiffrée (mauvaise clé)
//
//  Propagation globale (hôte → tous) via DataChannel :
//   • MSG 'e2ee_enable_all'  → chaque client active localement
//   • MSG 'e2ee_disable_all' → chaque client désactive localement
//   • MSG 'e2ee_sync'        → envoyé aux nouveaux arrivants si E2EE global actif
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext, useContext, useState, useEffect,
  useRef, useCallback, useReducer,
} from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { ROLE, MSG, LIVEKIT_WS_URL } from '../../../config.js';
import { inviteToStage, removeFromStage, acceptStageInvite, endStream } from '../../../api/stream.js';
import { API_BASE_URL } from '../../../config.js';
import { createKeyProvider, createE2EEWorker, isE2EESupported } from '../utils/e2ee.js';

const StreamCtx = createContext(null);

function chatReducer(state, action) {
  switch (action.type) {
    case 'ADD':   return [...state.slice(-199), action.msg];
    case 'CLEAR': return [];
    default:      return state;
  }
}

export function StreamProvider({ children, initToken, initRole, initName, roomName, wsUrl }) {

  // ── États LiveKit core ────────────────────────────────────────
  const [room,             setRoom]             = useState(null);
  const [connectionState,  setConnState]        = useState('idle');
  const [localParticipant, setLocalPart]        = useState(null);
  const [participants,     setParticipants]     = useState(new Map());
  const [myRole,           setMyRole]           = useState(initRole || ROLE.VIEWER);
  const [isLive,           setIsLive]           = useState(false);
  const [speakerIds,       setSpeakerIds]       = useState(new Set());
  const [handRaisedIds,    setHandRaisedIds]    = useState(new Set());
  const [pendingInvite,    setPendingInvite]    = useState(false);
  const [viewerCount,      setViewerCount]      = useState(0);
  const [reactions,        setReactions]        = useState([]);
  const [chatMessages,     dispatchChat]        = useReducer(chatReducer, []);
  const [isMicOn,          setIsMicOn]          = useState(true);
  const [isCamOn,          setIsCamOn]          = useState(true);
  const [isScreenSharing,  setIsScreenSharing]  = useState(false);
  const [screenSharePub,   setScreenSharePub]   = useState(null);
  const [activeSpeakerId,  setActiveSpeakerId]  = useState(null);
  const [unreadChat,       setUnreadChat]       = useState(0);
  const [activePanel,      setActivePanelState] = useState(null);
  const [notes,            setNotes]            = useState('');
  const [isRecording,      setIsRecording]      = useState(false);
  const [egressId,         setEgressId]         = useState(null);
  const [error,            setError]            = useState(null);
  const [streamStartTime,  setStreamStartTime]  = useState(null);
  const [liveKitRoomName,  setLiveKitRoomName]  = useState('');

  // ── États E2EE ────────────────────────────────────────────────
  const [e2eeEnabled,            setE2eeEnabled]            = useState(false);
  const [e2eeSupported,          setE2eeSupported]          = useState(false);
  // 'manual' = activé par ce client uniquement
  // 'global'  = activé par l'hôte, propagé à tous via DataChannel
  const [e2eeMode,               setE2eeMode]               = useState('manual');
  // Map<identity: string, enabled: boolean>
  // Alimentée par RoomEvent.ParticipantEncryptionStatusChanged — preuve SDK
  const [e2eeParticipantStatus,  setE2eeParticipantStatus]  = useState(new Map());
  // Erreurs de déchiffrement (RoomEvent.EncryptionError)
  const [e2eeErrors,             setE2eeErrors]             = useState([]);

  // ── Refs ──────────────────────────────────────────────────────
  const roomRef        = useRef(null);
  const panelRef       = useRef(null);
  const myRoleRef      = useRef(initRole);
  const cleanupRef     = useRef(null);
  const connectingRef  = useRef(false);

  // Refs E2EE — évitent des dépendances dans les callbacks
  const e2eeEnabledRef  = useRef(false);
  const e2eeModeRef     = useRef('manual');
  // keyProvider — singleton de session, créé une seule fois si navigateur compatible
  // Doit être passé dans RoomOptions.encryption au moment de new Room()
  const keyProviderRef  = useRef(null);

  useEffect(() => { panelRef.current      = activePanel;   }, [activePanel]);
  useEffect(() => { myRoleRef.current     = myRole;        }, [myRole]);
  useEffect(() => { e2eeEnabledRef.current = e2eeEnabled;  }, [e2eeEnabled]);
  useEffect(() => { e2eeModeRef.current    = e2eeMode;     }, [e2eeMode]);

  // Vérifier support E2EE au montage — créer keyProvider si supporté
  useEffect(() => {
    const supported = isE2EESupported();
    setE2eeSupported(supported);
    if (supported) {
      // Le keyProvider est créé ICI une seule fois.
      // Il est ensuite passé dans RoomOptions.encryption dans connect().
      keyProviderRef.current = createKeyProvider();
      console.log('[E2EE] KeyProvider initialisé — navigateur compatible');
    } else {
      console.warn('[E2EE] Navigateur non compatible — E2EE désactivé');
    }
  }, []);

  // ── Helpers participants ──────────────────────────────────────
  const buildMap = useCallback((lkRoom) => {
    const map = new Map();
    if (lkRoom?.localParticipant) map.set(lkRoom.localParticipant.identity, lkRoom.localParticipant);
    lkRoom?.remoteParticipants?.forEach((p, id) => { if (p) map.set(id, p); });
    return map;
  }, []);

  const refreshSpeakers = useCallback((lkRoom) => {
    const ids = new Set();
    lkRoom?.remoteParticipants?.forEach(p => { if (p?.permissions?.canPublish) ids.add(p.identity); });
    if (lkRoom?.localParticipant?.permissions?.canPublish) ids.add(lkRoom.localParticipant.identity);
    setSpeakerIds(ids);
  }, []);

  // ── Handler messages DataChannel ─────────────────────────────
  const handleData = useCallback((payload, participant) => {
    try {
      const msg  = JSON.parse(new TextDecoder().decode(payload));
      const from = participant?.identity || '';
      const name = participant?.name || from;

      switch (msg.type) {
        // ── Chat, réactions, main levée ───────────────────────
        case MSG.CHAT:
          dispatchChat({ type: 'ADD', msg: { id: Date.now()+Math.random(), from: name, text: msg.text, ts: Date.now(), isHost: msg.isHost } });
          if (panelRef.current !== 'chat') setUnreadChat(n => n + 1);
          break;
        case MSG.REACTION:
          setReactions(prev => [...prev.slice(-29), { id: Date.now()+Math.random(), emoji: msg.emoji, name }]);
          setTimeout(() => setReactions(prev => prev.slice(1)), 2600);
          break;
        case MSG.RAISE_HAND:
          setHandRaisedIds(prev => { const n = new Set(prev); n.add(from); return n; });
          break;
        case MSG.LOWER_HAND:
          setHandRaisedIds(prev => { const n = new Set(prev); n.delete(from); return n; });
          break;

        // ── Gestion scène ─────────────────────────────────────
        case MSG.INVITE_STAGE:
          if (msg.target === roomRef.current?.localParticipant?.identity) setPendingInvite(true);
          break;
        case MSG.REMOVE_STAGE:
          if (msg.target === roomRef.current?.localParticipant?.identity) {
            setMyRole(ROLE.VIEWER); myRoleRef.current = ROLE.VIEWER;
            roomRef.current?.localParticipant?.setCameraEnabled(false).catch(()=>{});
            roomRef.current?.localParticipant?.setMicrophoneEnabled(false).catch(()=>{});
          }
          break;
        case MSG.STREAM_ENDED:
          // Ignoré par l'hôte lui-même (il gère sa propre déconnexion)
          if (myRoleRef.current !== ROLE.HOST) {
            setIsLive(false);
            setError('Le stream est terminé');
          }
          break;
        case 'notes_update':
          setNotes(msg.content || '');
          break;

        // ── Messages E2EE ─────────────────────────────────────
        // Reçu quand l'hôte active E2EE en mode global → activer localement
        case 'e2ee_enable_all':
          if (!e2eeEnabledRef.current && keyProviderRef.current) {
            const lk = roomRef.current;
            if (lk) {
              setE2eeMode('global');
              _activateE2EELocal(lk).then(ok => {
                if (ok) console.log('[E2EE] 🌐 Auto-activé par', name);
              });
            }
          }
          break;

        // Reçu quand l'hôte désactive E2EE pour tous → désactiver localement
        case 'e2ee_disable_all':
          if (e2eeEnabledRef.current) {
            const lk = roomRef.current;
            if (lk) {
              lk.setE2EEEnabled(false).catch(err => console.warn('[E2EE] disable:', err));
              setE2eeEnabled(false);
              setE2eeMode('manual');
              setE2eeParticipantStatus(new Map());
              console.log('[E2EE] 🔓 Désactivé par l\'hôte');
            }
          }
          break;

        // Reçu par un nouvel arrivant pour synchroniser son état avec la room
        case 'e2ee_sync':
          if (msg.active && msg.mode === 'global' && !e2eeEnabledRef.current && keyProviderRef.current) {
            const lk = roomRef.current;
            if (lk) {
              setE2eeMode('global');
              _activateE2EELocal(lk).then(ok => {
                if (ok) console.log('[E2EE] 🔄 Synchronisé — E2EE global actif dans cette room');
              });
            }
          }
          break;

        // ── Sondages ──────────────────────────────────────────
        case 'poll_created':
        case 'poll_vote':
        case 'poll_closed':
          window.dispatchEvent(new CustomEvent('stream:poll_event', {
            detail: { type: msg.type, poll: msg.poll, pollId: msg.pollId, optionIndex: msg.optionIndex, voterName: name },
          }));
          break;

        // ── Fichiers partagés ──────────────────────────────────
        case 'file_shared':
          if (msg.file) window.dispatchEvent(new CustomEvent('stream:file_received', { detail: msg.file }));
          break;

        default: break;
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── _activateE2EELocal — cœur de l'activation E2EE ───────────
  // Utilise la VRAIE API LiveKit :
  //   1. keyProvider.setKey(roomCode) → SDK dérive la clé via PBKDF2
  //   2. room.setE2EEEnabled(true)    → SDK applique le Worker sur tous les tracks
  //
  // ⚠️  La Room DOIT avoir été créée avec { encryption: { keyProvider, worker } }
  //     dans son constructeur, sinon setE2EEEnabled() échoue silencieusement.
  const _activateE2EELocal = useCallback(async (lk) => {
    if (!lk || !keyProviderRef.current || !isE2EESupported()) return false;
    try {
      // Fournir la passphrase = code du live
      // Le SDK calcule PBKDF2(roomCode) automatiquement → clé AES-GCM 256 bits
      // Tous les participants avec le même roomCode ont la même clé dérivée
      await keyProviderRef.current.setKey(roomName);

      // Activer E2EE sur la room — le SDK configure RTCRtpScriptTransform
      // sur tous les tracks publiés ET sur les futurs tracks
      await lk.setE2EEEnabled(true);

      setE2eeEnabled(true);
      console.log(`[E2EE] ✅ Activé — PBKDF2(${roomName}) → AES-GCM 256 bits`);
      return true;
    } catch (err) {
      console.error('[E2EE] ❌ Activation échouée:', err.message);
      // Erreur fréquente : Room créée sans encryption dans les options
      // → vérifier que createE2EEWorker() est bien passé dans RoomOptions.encryption
      return false;
    }
  }, [roomName]);

  // ── connect — crée la Room avec encryption options ────────────
  // CRITIQUE : encryption doit être dans le constructeur de Room, pas après.
  // Le Worker LiveKit officiel (livekit-client/e2ee-worker) est instancié ici.
  const connect = useCallback(async (token, wsOverride) => {
    if (roomRef.current?.state === 'connected' || roomRef.current?.state === 'connecting') {
      console.log('[Stream] already connected/connecting, skip');
      return;
    }
    try {
      setConnState('connecting');
      setError(null);
      const wsUrl_ = wsOverride || wsUrl || LIVEKIT_WS_URL;

      // ── Options Room ──────────────────────────────────────────
      const roomOptions = {
        adaptiveStream: true,
        dynacast:       true,
        autoSubscribe:  true,
      };

      // Ajouter encryption si le navigateur est compatible
      // Le keyProvider (singleton) + le Worker officiel LiveKit sont passés ici.
      // Sans ça, room.setE2EEEnabled() n'a aucun effet.
      if (isE2EESupported() && keyProviderRef.current) {
        roomOptions.encryption = {
          keyProvider: keyProviderRef.current,
          // Worker officiel de livekit-client — résolu par Vite via import.meta.url
          // NE PAS remplacer par un Blob worker maison
          worker: createE2EEWorker(),
        };
        console.log('[E2EE] Room initialisée avec encryption activable');
      }

      const lkRoom = new Room(roomOptions);
      roomRef.current = lkRoom;

      // ── Listeners connexion ───────────────────────────────────
      const onDisconn = () => { setConnState('disconnected'); setIsLive(false); };
      const onReconn  = () => setConnState('reconnecting');
      const onReconnd = () => setConnState('connected');

      lkRoom.on(RoomEvent.Disconnected,  onDisconn);
      lkRoom.on(RoomEvent.Reconnecting,  onReconn);
      lkRoom.on(RoomEvent.Reconnected,   onReconnd);

      // ── Listener E2EE #1 : ParticipantEncryptionStatusChanged ─
      // Émis par le SDK (Room.ts ligne ~250) pour chaque participant
      // quand son statut E2EE change réellement.
      // args : (enabled: boolean, participant: Participant)
      // C'est la PREUVE que le chiffrement est actif côté SDK.
      const onE2EEStatus = (enabled, participant) => {
        const identity = participant?.identity ?? 'local';
        console.log(`[E2EE] 🔐 SDK confirm — ${identity} : ${enabled ? '✅ ON' : '❌ OFF'}`);
        setE2eeParticipantStatus(prev => {
          const next = new Map(prev);
          next.set(identity, enabled);
          return next;
        });
      };

      // ── Listener E2EE #2 : EncryptionError ───────────────────
      // Émis par le SDK quand le Worker ne peut pas déchiffrer une frame.
      // Cause principale : un participant a une clé différente.
      // args : (error: Error, participant?: Participant)
      // OUTIL DE TEST : rejoindre avec une mauvaise clé → cette erreur apparaît.
      const onE2EEError = (error, participant) => {
        const identity = participant?.identity ?? 'inconnu';
        console.error(`[E2EE] ❌ EncryptionError — ${identity}:`, error?.message);
        setE2eeErrors(prev => [
          ...prev.slice(-9),
          { ts: Date.now(), identity, message: error?.message ?? 'Erreur inconnue' },
        ]);
        // Auto-effacer après 6 secondes dans l'UI
        setTimeout(() => setE2eeErrors(prev => prev.slice(1)), 6000);
      };

      lkRoom.on(RoomEvent.ParticipantEncryptionStatusChanged, onE2EEStatus);
      lkRoom.on(RoomEvent.EncryptionError, onE2EEError);

      // ── Listeners participants & tracks ───────────────────────
      const onPChange = () => { setParticipants(buildMap(lkRoom)); refreshSpeakers(lkRoom); };
      const onTChange = () => { setParticipants(buildMap(lkRoom)); refreshSpeakers(lkRoom); };
      const onSpeak   = (speakers) => setActiveSpeakerId(speakers?.[0]?.identity ?? null);
      const onPerm    = () => refreshSpeakers(lkRoom);

      lkRoom.on(RoomEvent.ParticipantConnected,          onPChange);
      lkRoom.on(RoomEvent.ParticipantDisconnected,       onPChange);
      lkRoom.on(RoomEvent.TrackSubscribed,               onTChange);
      lkRoom.on(RoomEvent.TrackUnsubscribed,             onTChange);
      lkRoom.on(RoomEvent.LocalTrackPublished,           onTChange);
      lkRoom.on(RoomEvent.LocalTrackUnpublished,         onTChange);
      lkRoom.on(RoomEvent.ActiveSpeakersChanged,         onSpeak);
      lkRoom.on(RoomEvent.ParticipantPermissionsChanged, onPerm);
      lkRoom.on(RoomEvent.DataReceived,                  handleData);

      cleanupRef.current = () => {
        lkRoom.off(RoomEvent.Disconnected,                       onDisconn);
        lkRoom.off(RoomEvent.Reconnecting,                       onReconn);
        lkRoom.off(RoomEvent.Reconnected,                        onReconnd);
        lkRoom.off(RoomEvent.ParticipantEncryptionStatusChanged, onE2EEStatus);
        lkRoom.off(RoomEvent.EncryptionError,                    onE2EEError);
        lkRoom.off(RoomEvent.ParticipantConnected,               onPChange);
        lkRoom.off(RoomEvent.ParticipantDisconnected,            onPChange);
        lkRoom.off(RoomEvent.TrackSubscribed,                    onTChange);
        lkRoom.off(RoomEvent.TrackUnsubscribed,                  onTChange);
        lkRoom.off(RoomEvent.LocalTrackPublished,                onTChange);
        lkRoom.off(RoomEvent.LocalTrackUnpublished,              onTChange);
        lkRoom.off(RoomEvent.ActiveSpeakersChanged,              onSpeak);
        lkRoom.off(RoomEvent.ParticipantPermissionsChanged,      onPerm);
        lkRoom.off(RoomEvent.DataReceived,                       handleData);
      };

      // ── Connexion ─────────────────────────────────────────────
      const wsFinal   = wsUrl_.startsWith('http') ? wsUrl_.replace(/^http/, 'ws') : wsUrl_;
      const isHost    = myRoleRef.current === ROLE.HOST;
      const isSpeaker = myRoleRef.current === ROLE.SPEAKER;

      await lkRoom.connect(wsFinal, token);

      setRoom(lkRoom);
      setLocalPart(lkRoom.localParticipant);
      setParticipants(buildMap(lkRoom));
      refreshSpeakers(lkRoom);
      setConnState('connected');
      setIsLive(true);
      setStreamStartTime(new Date());
      setLiveKitRoomName(lkRoom.name || roomName);
      setViewerCount(lkRoom.remoteParticipants.size + 1);

      if (isHost || isSpeaker) {
        try { await lkRoom.localParticipant.setMicrophoneEnabled(true); setIsMicOn(true); } catch {}
        try { await lkRoom.localParticipant.setCameraEnabled(true);    setIsCamOn(true); } catch {}
        setTimeout(() => { setParticipants(buildMap(lkRoom)); refreshSpeakers(lkRoom); }, 500);
      }

      // Si E2EE global était actif avant reconnexion → resync les nouveaux arrivants
      if (e2eeEnabledRef.current && e2eeModeRef.current === 'global') {
        setTimeout(async () => {
          try {
            await lkRoom.localParticipant.publishData(
              new TextEncoder().encode(JSON.stringify({ type: 'e2ee_sync', active: true, mode: 'global' })),
              { reliable: true },
            );
          } catch {}
        }, 1500);
      }

    } catch (err) {
      if (err?.message?.includes('Client initiated disconnect')) {
        // Ignoré — artefact du StrictMode React en dev
        return;
      }
      console.error('[Stream] connect error:', err);
      setError(err.message);
      setConnState('error');
    }
  }, [buildMap, refreshSpeakers, handleData, wsUrl, _activateE2EELocal]);

  useEffect(() => {
    if (connectingRef.current) return;
    connectingRef.current = true;
    if (initToken) connect(initToken);
    return () => {
      cleanupRef.current?.();
      if (roomRef.current) { roomRef.current.disconnect(); roomRef.current = null; }
      connectingRef.current = false;
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (room) setViewerCount(room.remoteParticipants.size + 1);
  }, [participants, room]);

  // ── publish ───────────────────────────────────────────────────
  const publish = useCallback(async (obj) => {
    const lk = roomRef.current;
    if (!lk?.localParticipant) return;
    await lk.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(obj)),
      { reliable: true },
    );
  }, []);

  // ── Actions hôte ─────────────────────────────────────────────
  const hostInviteToStage = useCallback(async (identity) => {
    try {
      await inviteToStage(roomName, identity);
      await publish({ type: MSG.INVITE_STAGE, target: identity });
    } catch (e) { console.error('[Stream] invite:', e); }
  }, [roomName, publish]);

  const hostRemoveFromStage = useCallback(async (identity) => {
    try {
      await removeFromStage(roomName, identity);
      await publish({ type: MSG.REMOVE_STAGE, target: identity });
      setHandRaisedIds(prev => { const n = new Set(prev); n.delete(identity); return n; });
    } catch (e) { console.error('[Stream] remove:', e); }
  }, [roomName, publish]);

  // Terminer définitivement le live
  const hostEndStream = useCallback(async () => {
    try {
      await publish({ type: MSG.STREAM_ENDED });
      await endStream(roomName);
      roomRef.current?.disconnect();
    } catch (e) { console.error('[Stream] end:', e); }
  }, [roomName, publish]);

  // Pause hôte — quitte sans envoyer MSG.STREAM_ENDED (live reste actif)
  const disconnectOnly = useCallback(async () => {
    try {
      const lk = roomRef.current;
      if (lk?.localParticipant) {
        await lk.localParticipant.setMicrophoneEnabled(false).catch(() => {});
        await lk.localParticipant.setCameraEnabled(false).catch(() => {});
        if (isScreenSharing) {
          await lk.localParticipant.setScreenShareEnabled(false).catch(() => {});
          setIsScreenSharing(false);
          setScreenSharePub(null);
        }
      }
      await roomRef.current?.disconnect();
    } catch (e) { console.error('[Stream] disconnectOnly:', e); }
  }, [isScreenSharing]);

  // ── E2EE — toggle personnel (ce client uniquement) ───────────
  // N'envoie PAS de message DataChannel → n'affecte que ce client.
  const toggleE2EE = useCallback(async () => {
    if (!e2eeSupported) return;
    const lk = roomRef.current;
    if (!lk) return;

    if (e2eeEnabled) {
      try {
        await lk.setE2EEEnabled(false);
        setE2eeEnabled(false);
        setE2eeMode('manual');
        setE2eeParticipantStatus(new Map());
        console.log('[E2EE] 🔓 Désactivé (mode personnel)');
      } catch (err) { console.error('[E2EE] désactivation:', err.message); }
    } else {
      setE2eeMode('manual');
      await _activateE2EELocal(lk);
    }
  }, [e2eeEnabled, e2eeSupported, _activateE2EELocal]);

  // ── E2EE — toggle global (hôte uniquement, propage à tous) ───
  // Envoie 'e2ee_enable_all' ou 'e2ee_disable_all' via DataChannel.
  // Chaque client active/désactive localement via handleData.
  const toggleE2EEGlobal = useCallback(async () => {
    if (!e2eeSupported || myRoleRef.current !== ROLE.HOST) return;
    const lk = roomRef.current;
    if (!lk) return;

    if (e2eeEnabled) {
      try {
        await lk.setE2EEEnabled(false);
        setE2eeEnabled(false);
        setE2eeMode('manual');
        setE2eeParticipantStatus(new Map());
        await publish({ type: 'e2ee_disable_all' });
        console.log('[E2EE] 🌐 Désactivé pour tous');
      } catch (err) { console.error('[E2EE] désactivation globale:', err.message); }
    } else {
      setE2eeMode('global');
      const ok = await _activateE2EELocal(lk);
      if (ok) {
        await publish({ type: 'e2ee_enable_all' });
        console.log('[E2EE] 🌐 Activé pour tous — e2ee_enable_all diffusé');
      }
    }
  }, [e2eeEnabled, e2eeSupported, _activateE2EELocal, publish]);

  // ── Partage d'écran ───────────────────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    const lk = roomRef.current;
    if (!lk?.localParticipant) return;
    try {
      if (!isScreenSharing) {
        await lk.localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
        const pubs = Array.from(lk.localParticipant.getTrackPublications().values());
        const sp   = pubs.find(p => p.source === Track.Source.ScreenShare && p.kind === Track.Kind.Video);
        setScreenSharePub(sp ?? null);
      } else {
        await lk.localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
        setScreenSharePub(null);
      }
    } catch (e) { console.error('[Stream] screenshare:', e); setIsScreenSharing(false); }
  }, [isScreenSharing]);

  // ── Enregistrement ────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE_URL}/api/stream/recording/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ roomName: roomRef.current?.name || roomName, displayName: initName }),
      });
      const data = await res.json();
      if (data.egressId) { setEgressId(data.egressId); setIsRecording(true); }
    } catch (e) { console.error('[Stream] rec start:', e); }
  }, [roomName, initName]);

  const stopRecording = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/api/stream/recording/stop`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ roomName: roomRef.current?.name || roomName, egressId }),
      });
      setIsRecording(false);
      setEgressId(null);
    } catch (e) { console.error('[Stream] rec stop:', e); }
  }, [roomName, egressId]);

  // ── Notes ─────────────────────────────────────────────────────
  const updateNotes = useCallback(async (content) => {
    setNotes(content);
    await publish({ type: 'notes_update', content });
  }, [publish]);

  // ── Chat / Reactions / Main levée ────────────────────────────
  const sendChat = useCallback(async (text) => {
    if (!text.trim()) return;
    dispatchChat({ type: 'ADD', msg: { id: Date.now(), from: 'Vous', text: text.trim(), ts: Date.now(), isMe: true, isHost: myRoleRef.current === ROLE.HOST } });
    await publish({ type: MSG.CHAT, text: text.trim(), isHost: myRoleRef.current === ROLE.HOST });
  }, [publish]);

  const sendReaction = useCallback(async (emoji) => {
    setReactions(prev => [...prev.slice(-29), { id: Date.now(), emoji, name: 'Vous' }]);
    setTimeout(() => setReactions(prev => prev.slice(1)), 2600);
    await publish({ type: MSG.REACTION, emoji });
  }, [publish]);

  const raiseHand = useCallback(async () => {
    await publish({ type: MSG.RAISE_HAND });
  }, [publish]);

  const lowerHand = useCallback(async () => {
    await publish({ type: MSG.LOWER_HAND });
    setHandRaisedIds(prev => {
      const n = new Set(prev);
      n.delete(roomRef.current?.localParticipant?.identity);
      return n;
    });
  }, [publish]);

  const acceptInvite = useCallback(async () => {
    try {
      const data = await acceptStageInvite(roomName, roomRef.current?.localParticipant?.identity);
      setPendingInvite(false);
      setMyRole(ROLE.SPEAKER);
      myRoleRef.current = ROLE.SPEAKER;
      if (data?.token) {
        await roomRef.current.disconnect();
        await connect(data.token);
      } else {
        await roomRef.current?.localParticipant?.setMicrophoneEnabled(true);
        await roomRef.current?.localParticipant?.setCameraEnabled(true);
      }
    } catch (e) { console.error('[Stream] acceptInvite:', e); }
  }, [roomName, connect]);

  const declineInvite = useCallback(() => {
    setPendingInvite(false);
    publish({ type: MSG.DECLINE_STAGE });
  }, [publish]);

  const toggleMic = useCallback(async () => {
    const lk = roomRef.current;
    if (!lk?.localParticipant) return;
    const next = !isMicOn;
    await lk.localParticipant.setMicrophoneEnabled(next);
    setIsMicOn(next);
  }, [isMicOn]);

  const toggleCam = useCallback(async () => {
    const lk = roomRef.current;
    if (!lk?.localParticipant) return;
    const next = !isCamOn;
    await lk.localParticipant.setCameraEnabled(next);
    setIsCamOn(next);
  }, [isCamOn]);

  // mode : 'end'   → hôte termine définitivement (envoie STREAM_ENDED)
  //        'pause' → hôte quitte temporairement (live reste actif, spectateurs restent)
  //        'leave' → spectateur quitte simplement
  //        'close' → fermeture onglet/navigateur (sync, fire-and-forget)
  const leaveStream = useCallback(async (mode = 'leave') => {
    const isHost = myRoleRef.current === ROLE.HOST;

    if (mode === 'close') {
      // Fermeture onglet — synchrone obligatoire (pas d'await)
      // navigator.sendBeacon utilisé pour fire-and-forget fiable
      if (isHost) {
        // Hôte ferme l'onglet → on termine le live côté serveur via sendBeacon
        const url = `${API_BASE_URL}/api/stream/end`;
        navigator.sendBeacon(url, JSON.stringify({ roomName }));
        // Publier STREAM_ENDED en best-effort (peut échouer si connexion coupée)
        try { publish({ type: MSG.STREAM_ENDED }); } catch {}
      }
      try { roomRef.current?.disconnect(); } catch {}
      return;
    }

    if (mode === 'end' && isHost) {
      await hostEndStream();
      return;
    }

    if (mode === 'pause' && isHost) {
      await disconnectOnly();
      return;
    }

    // Spectateur quitte (mode 'leave' ou fallback)
    try { roomRef.current?.disconnect(); } catch {}
  }, [hostEndStream, disconnectOnly, roomName, publish]);

  const setActivePanel = useCallback((panel) => {
    setActivePanelState(p => p === panel ? null : panel);
    if (panel === 'chat') setUnreadChat(0);
  }, []);

  // ── Valeur du contexte ────────────────────────────────────────
  const value = {
    // LiveKit core
    room, connectionState, localParticipant, participants,
    myRole, isLive, speakerIds, handRaisedIds, pendingInvite,
    viewerCount, reactions, chatMessages, unreadChat, activePanel,
    isMicOn, isCamOn, isScreenSharing, screenSharePub,
    activeSpeakerId, error, roomName, displayName: initName,
    notes, isRecording, egressId, streamStartTime, liveKitRoomName,

    // E2EE
    e2eeEnabled,           // boolean — E2EE actif sur ce client
    e2eeSupported,         // boolean — navigateur compatible
    e2eeMode,              // 'manual' | 'global'
    e2eeParticipantStatus, // Map<identity, boolean> — confirmé par SDK (ParticipantEncryptionStatusChanged)
    e2eeErrors,            // Array<{ts, identity, message}> — erreurs EncryptionError récentes
    toggleE2EE,            // () → active/désactive pour ce client uniquement
    toggleE2EEGlobal,      // () → active/désactive pour tous (hôte uniquement)

    // Actions
    setActivePanel,
    hostInviteToStage, hostRemoveFromStage, hostEndStream,
    disconnectOnly,
    sendChat, sendReaction, raiseHand, lowerHand,
    acceptInvite, declineInvite,
    toggleMic, toggleCam, toggleScreenShare,
    startRecording, stopRecording,
    updateNotes, leaveStream, publish,
  };

  return <StreamCtx.Provider value={value}>{children}</StreamCtx.Provider>;
}

export const useStream = () => {
  const ctx = useContext(StreamCtx);
  if (!ctx) throw new Error('useStream must be used inside StreamProvider');
  return ctx;
};