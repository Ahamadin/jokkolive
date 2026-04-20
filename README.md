# Disoo — Plateforme de Diffusion en Direct

> disoo est une plateforme de streaming en temps réel sécurisée, développée pour la diffusion d'événements avec interaction audience.

---

## Table des matières

1. [Présentation du projet](#1-présentation-du-projet)
2. [Architecture globale](#2-architecture-globale)
3. [Structure du projet](#4-structure-du-projet)
4. [Fonctionnalités principales](#5-fonctionnalités-principales)
5. [Flux de données & communication](#6-flux-de-données--communication)
6. [Chiffrement de bout en bout (E2EE)](#7-chiffrement-de-bout-en-bout-e2ee)
7. [Sous-titres en temps réel (IA embarquée)](#8-sous-titres-en-temps-réel-ia-embarquée)
8. [Étapes de développement](#9-étapes-de-développement)
9. [Installation & démarrage](#10-installation--démarrage)
10. [Variables d'environnement](#11-variables-denvironnement)

---

## 1. Présentation du projet

disoo est une application web de diffusion en direct (live streaming) construite autour de **LiveKit** (WebRTC). Elle permet à un hôte de lancer un stream vidéo/audio, d'inviter des intervenants sur scène, et de gérer une audience en temps réel avec des outils d'interaction riches.

**Cas d'usage :**
- Conférences et webinaires
- Sessions de formation en direct
- Émissions interactives avec questions/réponses
- Événements sécurisés nécessitant un chiffrement de bout en bout

**Caractéristiques clés :**
- Streaming WebRTC basse latence via LiveKit
- Sous-titres automatiques en temps réel (Whisper AI, 100% navigateur)
- Sondages, notes collaboratives, partage de fichiers
- Réactions emoji en temps réel
- Gestion des rôles : Hôte / Intervenant / Spectateur

---

## 2. Architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Navigateur)                       │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────────────┐  │
│  │  React 19    │   │  LiveKit SDK │   │  Web Worker (Whisper)│  │
│  │  (UI + State)│◄──►  (WebRTC)   │   │  Transcription IA    │  │
│  └──────┬───────┘   └──────┬───────┘   └─────────────────────┘  │
│         │                  │                                     │
└─────────┼──────────────────┼─────────────────────────────────────┘
          │ REST (fetch)      │ WebSocket (wss://)
          ▼                  ▼
   ┌──────────────────────┐
│   LiveKit Server     │
  │  (Media SFU)         │
   │  livekitjm.unchk.sn  │
│                 │   │                   
►│  Gestion des rooms   │
   │  Routage vidéo/audio │
  │  DataChannel         │
   └──────────────────────┘

---

## 3. Structure du projet

```
jokkolive/
├── public/
│   ├── senegal.jpg             
│   └── sons/                  
│
├── certificats/                
│   ├── localhost.pem
│   └── localhost-key.pem
│
├── src/
│   ├── main.jsx              
│   ├── App.jsx                 
│   ├── config.js               
│   ├── index.css              
│   │
│   ├── api/
│   │   └── stream.js           
│   │
│   ├── routes/
│   │   ├── Home.jsx            
│   │   ├── Stream.jsx         
│   │   └── Join.jsx             
│   │
│   ├── components/
│   │   └── ScheduleModal.jsx   
│   │
│   └── features/
│       └── stream/
│           ├── components/     
│           │   ├── ChatPanel.jsx          
│           │   ├── StreamHeader.jsx       
│           │   ├── StreamControls.jsx  
│           │   ├── StageArea.jsx          
│           │   ├── SpeakerTile.jsx      
│           │   ├── ParticipantsPanel.jsx  
│           │   ├── AudiencePanel.jsx     
│           │   ├── PollPanel.jsx       
│           │   ├── NotesPanel.jsx         
│           │   ├── FileShareButton.jsx    
│           │   ├── FileViewerPanel.jsx  
│           │   ├── LiveSubtitles.jsx     
│           │   ├── ReactionsOverlay.jsx 
│           │   ├── HandRaisedToast.jsx  
│           │   ├── StageInviteModal.jsx   
│           │   ├── StreamAnnouncer.jsx    
│           │   ├── StreamStatsPanel.jsx  
│           │   └── LeaveConfirmModal.jsx
│           │
│           ├── context/
│           │   └── StreamContext.jsx     
│           │
│           ├── hooks/
│           │   ├── useLiveSubtitles.js    
│           │   ├── useStreamAnnouncer.js 
│           │   └── useStreamTimer.js     
│           │
│           ├── utils/
│           │   └── e2ee.js              
│           │
│           └── workers/
│               ├── whisper.worker.js    
│               └── mic.processor.js     
│
├── .env                         
├── vite.config.js            
├── tailwind.config.js          
├── postcss.config.js           
├── eslint.config.js        
└── package.json               
```

---

## 4. Fonctionnalités principales

### Gestion des rôles

| Rôle | Permissions |
|------|-------------|
| **Hôte** (`host`) | Publie vidéo/audio, admin de la room, peut inviter/expulser |
| **Intervenant** (`speaker`) | Publie vidéo/audio après invitation de l'hôte |
| **Spectateur** (`viewer`) | Écoute uniquement, peut lever la main pour parler |

### Interaction temps réel (DataChannel LiveKit)

Tous les messages non-média passent par le DataChannel WebRTC :

| Type | Direction | Description |
|------|-----------|-------------|
| `chat` | Tous → Tous | Message de chat |
| `reaction` | Participant → Tous | Emoji réaction |
| `raise_hand` / `lower_hand` | Spectateur → Hôte | Demande de parole |
| `invite_to_stage` | Hôte → Spectateur | Invitation à parler |
| `accept_stage` / `decline_stage` | Spectateur → Hôte | Réponse invitation |
| `remove_from_stage` | Hôte → Intervenant | Retrait de la scène |
| `viewer_count` | Serveur → Tous | Nombre de spectateurs |
| `stream_ended` | Hôte → Tous | Fin du stream |

### Panneau latéral dynamique

Le sidebar droit bascule entre plusieurs panneaux :
- **Chat** — messagerie en direct avec modération
- **Participants** — liste avec badges de rôle
- **Audience** — vue dédiée spectateurs
- **Sondages** — création et vote en temps réel
- **Notes** — prise de notes collaborative
- **Fichiers** — partage et prévisualisation
- **Stats** — diagnostics réseau (bitrate, perte de paquets)

---

## 5. Flux de données & communication

### Créer un stream (Hôte)

```
Hôte                    Backend                   LiveKit Server
  │                        │                            │
  │── POST /api/stream/create ──►│                      │
  │   { displayName, roomName }  │                      │
  │                        │──── createRoom() ─────────►│
  │                        │◄─── room créée ────────────│
  │◄── { token, roomName, wsUrl }│                      │
  │                        │                            │
  │──────────────── connect(wsUrl, token) ─────────────►│
  │◄──────────────── connexion WebSocket établie ───────│
  │                        │                            │
  │──── publishTrack (caméra, micro) ──────────────────►│
```

### Rejoindre un stream (Spectateur)

```
Spectateur              Backend                   LiveKit Server
  │                        │                            │
  │── POST /api/stream/join ──────►│                    │
  │   { displayName, roomName }    │                    │
  │◄── { token, roomName, wsUrl }──│                    │
  │                        │                            │
  │──────────── connect(wsUrl, token) ─────────────────►│
  │◄──────────── tracks hôte reçus automatiquement ─────│
```

### Invitation sur scène

```
Hôte → DataChannel "invite_to_stage" → Spectateur
Spectateur → Modal d'invitation → Accepte
Spectateur → POST /api/stream/accept-stage → Nouveau token (canPublish=true)
Spectateur → reconnect avec nouveau token → publie vidéo/audio
```

---

## 6. Chiffrement de bout en bout (E2EE)

### Principe

L'E2EE utilise l'API officielle de LiveKit SDK (`KeyProvider`, `E2EEManager`). Les clés ne transitent **jamais** par le serveur.

### Dérivation de clé

```javascript
// Clé dérivée du code room via PBKDF2
const keyMaterial = await crypto.subtle.importKey(
  'raw',
  encoder.encode(roomCode),
  { name: 'PBKDF2' },
  false,
  ['deriveKey']
);

const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
  keyMaterial,
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);
```

### Modes

| Mode | Description |
|------|-------------|
| **Manuel** | Chaque participant active l'E2EE individuellement |
| **Global** | L'hôte active l'E2EE pour tous simultanément |

### Prérequis techniques

- Le serveur doit être servi en **HTTPS** (requis pour `SharedArrayBuffer`)
- Header `Cross-Origin-Opener-Policy: same-origin` obligatoire
- Le build Vite cible `esnext` pour les Workers ES modules

---

## 7. Sous-titres en temps réel (IA embarquée)

### Architecture Whisper

```
Microphone
    │
    ▼
AudioWorklet (mic.processor.js)   ← traitement bas niveau, thread audio
    │ PCM Float32 chunks
    ▼
whisper.worker.js                 ← Web Worker (thread séparé, non-bloquant)
    │ Détection activité vocale (VAD)
    │ Accumulation audio (fenêtres de ~2s)
    │ Xenova/whisper-tiny (40MB, chargé 1× depuis HuggingFace CDN)
    │ Transcription locale (aucune donnée envoyée au cloud)
    ▼
useLiveSubtitles.js hook          ← synchronise avec React
    │
    ▼
LiveSubtitles.jsx                 ← affichage overlay sur la vidéo
```

### Langues supportées

Français · Anglais · Arabe · Portugais · Espagnol · Allemand · Wolof

### Pourquoi en local ?

- **Confidentialité** : l'audio ne quitte jamais le navigateur
- **Latence** : pas d'aller-retour réseau
- **Coût** : aucun appel API payant

---

## 8. Étapes de développement

### Phase 1 — Fondation streaming
- Intégration LiveKit SDK
- Création / rejoindre une room via code
- Gestion des tokens JWT côté backend
- Affichage des flux vidéo (StageArea + SpeakerTile)
- Contrôles micro/caméra basiques

### Phase 2 — Gestion des rôles et de la scène
- Système de rôles Hôte / Intervenant / Spectateur
- DataChannel pour la signalisation (chat, mains levées)
- Flux complet invitation sur scène (invite → accept → token upgrade)
- Expulsion d'intervenant

### Phase 3 — Outils d'interaction
- Chat en direct avec historique (max 200 messages, reducer pattern)
- Réactions emoji animées (overlay flottant)
- Sondages interactifs (création + vote temps réel)
- Notes collaboratives partagées
- Partage et prévisualisation de fichiers

### Phase 4 — Sécurité et confidentialité
- Chiffrement E2EE avec PBKDF2 + AES-GCM 256 bits
- Mode manuel et global
- Indicateurs visuels de statut de chiffrement par participant

### Phase 5 — IA et accessibilité
- Intégration Whisper (Xenova/whisper-tiny) via Web Worker
- AudioWorklet pour capture micro bas niveau
- VAD (Voice Activity Detection)
- Affichage sous-titres avec identification du locuteur
- Support multilingue (7 langues)

### Phase 6 — Polissage et production
- Thème personnalisé Tailwind (couleurs, polices, animations)
- Panneau statistiques réseau
- Gestion propre de fermeture d'onglet (beforeunload / pagehide)
- SessionStorage pour persistance token (reprise après pause)
- Build production Vite avec chunk séparé pour Transformers.js
- HTTPS local avec certificats auto-signés

---

## 9. Installation & démarrage

### Prérequis

- Node.js >= 18
- Un serveur LiveKit accessible (auto-hébergé ou LiveKit Cloud)
- Le backend API Node.js (voir dépôt backend)

### Installation

```bash
git clone https://github.com/<votre-org>/jokkolive.git
cd jokkolive
npm install
```

```

### Lancement

```bash
npm run dev
# → https://localhost:5173
```

### Build production

```bash
npm run build
# → dist/
```

---

## 10. Variables d'environnement

Créer un fichier `.env` à la racine :

```env
# URL du backend API (génère les tokens LiveKit)
VITE_API_BASE=https://backjm.unchk.sn

# URL WebSocket du serveur LiveKit
VITE_LIVEKIT_WS_URL=wss://livekitjm.unchk.sn

# URL HTTP du serveur LiveKit
VITE_LIVEKIT_URL=https://livekitjm.unchk.sn

# Chemin du endpoint token (si différent)
VITE_TOKEN_PATH=/api/livekit/token

# Mode debug (affiche les logs config au démarrage)
VITE_DEBUG=false
```

---

## Licence 
© 2024-2025 — Tous droits réservés.
