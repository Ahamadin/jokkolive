# JokkoLive — Plateforme de Diffusion en Direct

> **"Jokko"** signifie *"parler / se connecter"* en wolof.  
> JokkoLive est une plateforme de streaming en temps réel sécurisée, développée pour la diffusion d'événements avec interaction audience.

---

## Table des matières

1. [Présentation du projet](#1-présentation-du-projet)
2. [Architecture globale](#2-architecture-globale)
3. [Stack technique](#3-stack-technique)
4. [Structure du projet](#4-structure-du-projet)
5. [Fonctionnalités principales](#5-fonctionnalités-principales)
6. [Flux de données & communication](#6-flux-de-données--communication)
7. [Chiffrement de bout en bout (E2EE)](#7-chiffrement-de-bout-en-bout-e2ee)
8. [Sous-titres en temps réel (IA embarquée)](#8-sous-titres-en-temps-réel-ia-embarquée)
9. [Étapes de développement](#9-étapes-de-développement)
10. [Installation & démarrage](#10-installation--démarrage)
11. [Variables d'environnement](#11-variables-denvironnement)
12. [API Backend](#12-api-backend)
13. [Déploiement](#13-déploiement)

---

## 1. Présentation du projet

JokkoLive est une application web de diffusion en direct (live streaming) construite autour de **LiveKit** (WebRTC). Elle permet à un hôte de lancer un stream vidéo/audio, d'inviter des intervenants sur scène, et de gérer une audience en temps réel avec des outils d'interaction riches.

**Cas d'usage :**
- Conférences et webinaires
- Sessions de formation en direct
- Émissions interactives avec questions/réponses
- Événements sécurisés nécessitant un chiffrement de bout en bout

**Caractéristiques clés :**
- Streaming WebRTC basse latence via LiveKit
- Chiffrement E2EE (AES-GCM 256 bits)
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
┌─────────────────┐   ┌──────────────────────┐
│   Backend API   │   │   LiveKit Server     │
│  (Node.js)      │   │  (Media SFU)         │
│  backjm.unchk.sn│   │  livekitjm.unchk.sn  │
│                 │   │                      │
│  /api/stream/*  │──►│  Gestion des rooms   │
│  Génère tokens  │   │  Routage vidéo/audio │
│  JWT LiveKit    │   │  DataChannel         │
└─────────────────┘   └──────────────────────┘
```

**Flux simplifié :**
1. L'hôte appelle le backend pour créer un stream → reçoit un **token JWT LiveKit**
2. Le client se connecte au **serveur LiveKit** via WebSocket avec ce token
3. LiveKit gère le routage des flux vidéo/audio entre participants (SFU)
4. Les messages de chat, réactions et signaux passent par le **DataChannel** de LiveKit
5. Whisper tourne localement dans un **Web Worker** pour les sous-titres

---

## 3. Stack technique

| Couche | Technologie | Version | Rôle |
|--------|-------------|---------|------|
| Framework UI | React | 19.2.0 | Composants et gestion d'état |
| Routage | React Router DOM | 7.13.1 | Navigation SPA |
| Build | Vite + SWC | 7.3.1 | Bundler ultra-rapide |
| WebRTC | livekit-client | 2.17.2 | Streaming vidéo/audio temps réel |
| Style | Tailwind CSS | 3.4.1 | Utility-first CSS |
| Icônes | Lucide React | 0.575.0 | Bibliothèque d'icônes SVG |
| IA / ASR | @huggingface/transformers | 3.8.1 | Whisper (speech-to-text) |
| Chiffrement | Web Crypto API | natif | AES-GCM E2EE |
| Audio | AudioWorklet API | natif | Traitement microphone bas niveau |

---

## 4. Structure du projet

```
jokkolive/
├── public/
│   ├── senegal.jpg              # Logo / branding
│   └── sons/                   # Sons de notification
│
├── certificats/                 # Certificats SSL (dev local HTTPS)
│   ├── localhost.pem
│   └── localhost-key.pem
│
├── src/
│   ├── main.jsx                 # Point d'entrée React
│   ├── App.jsx                  # Routeur principal
│   ├── config.js                # Variables d'env centralisées + rôles + types de messages
│   ├── index.css                # Styles globaux + Tailwind
│   │
│   ├── api/
│   │   └── stream.js            # Toutes les requêtes REST vers le backend
│   │
│   ├── routes/
│   │   ├── Home.jsx             # Page d'accueil (créer / rejoindre un stream)
│   │   ├── Stream.jsx           # Page du stream actif
│   │   └── Join.jsx             # Rejoindre via lien direct /join/:code
│   │
│   ├── components/
│   │   └── ScheduleModal.jsx    # Modal planification d'un stream
│   │
│   └── features/
│       └── stream/
│           ├── components/      # Tous les composants UI du stream
│           │   ├── ChatPanel.jsx          # Chat en direct avec modération
│           │   ├── StreamHeader.jsx       # En-tête : titre, compteur, métriques
│           │   ├── StreamControls.jsx     # Contrôles hôte (micro, caméra, screen)
│           │   ├── StageArea.jsx          # Zone vidéo des intervenants
│           │   ├── SpeakerTile.jsx        # Tuile vidéo d'un intervenant
│           │   ├── ParticipantsPanel.jsx  # Liste participants + rôles
│           │   ├── AudiencePanel.jsx      # Vue audience
│           │   ├── PollPanel.jsx          # Sondages interactifs
│           │   ├── NotesPanel.jsx         # Notes collaboratives
│           │   ├── FileShareButton.jsx    # Upload de fichiers
│           │   ├── FileViewerPanel.jsx    # Prévisualisation fichiers
│           │   ├── LiveSubtitles.jsx      # Affichage sous-titres temps réel
│           │   ├── ReactionsOverlay.jsx   # Animation emoji flottants
│           │   ├── HandRaisedToast.jsx    # Notification lever de main
│           │   ├── StageInviteModal.jsx   # Modal invitation sur scène
│           │   ├── StreamAnnouncer.jsx    # Toast d'annonces (entrée/sortie)
│           │   ├── StreamStatsPanel.jsx   # Stats réseau et bitrate
│           │   └── LeaveConfirmModal.jsx  # Confirmation quitter
│           │
│           ├── context/
│           │   └── StreamContext.jsx      # State global du stream (802 lignes)
│           │
│           ├── hooks/
│           │   ├── useLiveSubtitles.js    # Hook orchestration Whisper
│           │   ├── useStreamAnnouncer.js  # Hook annonces participants
│           │   └── useStreamTimer.js      # Hook durée du stream
│           │
│           ├── utils/
│           │   └── e2ee.js                # Utilitaires chiffrement E2EE
│           │
│           └── workers/
│               ├── whisper.worker.js      # Worker IA transcription (Whisper)
│               └── mic.processor.js       # AudioWorklet traitement micro
│
├── .env                         # Variables d'environnement (non versionné)
├── vite.config.js               # Configuration Vite (HTTPS, workers, build)
├── tailwind.config.js           # Thème personnalisé (couleurs, polices, animations)
├── postcss.config.js            # PostCSS (Tailwind + Autoprefixer)
├── eslint.config.js             # Règles ESLint
└── package.json                 # Dépendances
```

---

## 5. Fonctionnalités principales

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

## 6. Flux de données & communication

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

## 7. Chiffrement de bout en bout (E2EE)

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

## 8. Sous-titres en temps réel (IA embarquée)

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

## 9. Étapes de développement

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

## 10. Installation & démarrage

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

### Certificats SSL (développement local)

L'HTTPS est **obligatoire** pour E2EE et `SharedArrayBuffer`.

```bash
# Avec mkcert
mkcert -install
mkcert localhost
mv localhost.pem certificats/localhost.pem
mv localhost-key.pem certificats/localhost-key.pem
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

## 11. Variables d'environnement

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

## 12. API Backend

Le frontend consomme ces endpoints REST :

| Méthode | Endpoint | Corps | Réponse | Description |
|---------|----------|-------|---------|-------------|
| `POST` | `/api/stream/create` | `{ displayName, roomName }` | `{ token, roomName, wsUrl }` | Créer un stream (hôte) |
| `POST` | `/api/stream/join` | `{ displayName, roomName }` | `{ token, roomName, wsUrl }` | Rejoindre un stream |
| `POST` | `/api/stream/invite-to-stage` | `{ roomName, identity }` | `{ success }` | Inviter un spectateur à parler |
| `POST` | `/api/stream/remove-from-stage` | `{ roomName, identity }` | `{ success }` | Retirer un intervenant |
| `POST` | `/api/stream/accept-stage` | `{ roomName, identity }` | `{ token }` | Obtenir un token speaker |
| `POST` | `/api/stream/end` | `{ roomName }` | `{ success }` | Terminer le stream |
| `GET` | `/api/stream/info/:roomName` | — | métadonnées room | Infos stream actif |

---

## 13. Déploiement

### Frontend

```bash
npm run build
# Servir dist/ avec Nginx ou Caddy
```

### Headers Nginx obligatoires

```nginx
server {
  listen 443 ssl;
  server_name jokkolive.example.com;

  # Requis pour SharedArrayBuffer (Whisper) et E2EE
  add_header Cross-Origin-Opener-Policy "same-origin";
  add_header Cross-Origin-Embedder-Policy "require-corp";

  location / {
    root /var/www/jokkolive/dist;
    try_files $uri $uri/ /index.html;
  }
}
```

### Infrastructure de production

```
Internet
    │
    ▼
CDN / Reverse Proxy (Nginx)
    │
    ├──► Frontend React (dist/ statique)
    │
    ├──► Backend API Node.js  (backjm.unchk.sn)
    │         └── Génère tokens JWT LiveKit
    │
    └──► LiveKit Server SFU   (livekitjm.unchk.sn)
              └── WebRTC media routing
```

---

## Licence

Projet développé dans le cadre de la plateforme **RTN** (Réseau de Télévision Numérique).  
© 2024-2025 — Tous droits réservés.
