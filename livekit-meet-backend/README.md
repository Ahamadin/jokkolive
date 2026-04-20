# 🎥 LiveKit Meet Backend

Backend Node.js pour une application de réunion vidéo style Google Meet, sans compte utilisateur, basé sur LiveKit.

---

## 📁 Structure du projet

```
livekit-meet-backend/
├── config/
│   ├── env.js                  # Variables d'environnement
│   └── livekit.js              # Config LiveKit
├── controllers/
│   ├── meet.controller.js      # Logique réunions
│   └── recording.controller.js # Logique enregistrement
├── middlewares/
│   └── authMeet.js             # Validation displayName + roomName (sans compte)
├── routes/
│   ├── meet.routes.js          # Routes /api/meet
│   └── recording.routes.js     # Routes /api/recording
├── services/
│   ├── livekit.service.js      # Token + gestion rooms LiveKit
│   └── recording.service.js    # Enregistrement → MinIO
├── app.js
├── server.js
├── .env.example
└── package.json
```

---

## 🚀 Installation depuis zéro

```bash
# 1. Cloner / créer le dossier
mkdir livekit-meet-backend && cd livekit-meet-backend

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Éditez .env avec vos valeurs

# 4. Démarrer
npm start

# Développement avec hot-reload
npm run dev
```

---

## ⚙️ Configuration `.env`

```env
PORT=4000
NODE_ENV=production

# LiveKit
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=votre_secret
LIVEKIT_URL=https://livekit.ec2lt.sn

# MinIO
S3_ENDPOINT=http://144.91.74.178:9000
S3_BUCKET=livekit-recordings
S3_KEY_ID=votre_access_key
S3_KEY_SECRET=votre_secret_key
S3_REGION=us-east-1

# CORS (séparés par virgule)
ALLOWED_ORIGINS=http://localhost:5173,https://clientcom.rtn.sn
```

---

## 📡 API Endpoints

### Réunions

#### `POST /api/meet/create` — Créer une réunion
```json
// Request
{ "displayName": "Alice", "roomName": "ma-reunion" }
// roomName optionnel → si absent, code auto généré : "abc-defg-hij"

// Response 201
{
  "token": "eyJ...",
  "roomName": "ma-reunion",
  "displayName": "Alice",
  "role": "host",
  "joinUrl": "/meet/ma-reunion"
}
```

#### `POST /api/meet/join` — Rejoindre une réunion
```json
// Request
{ "displayName": "Bob", "roomName": "ma-reunion" }

// Response 200
{
  "token": "eyJ...",
  "roomName": "ma-reunion",
  "displayName": "Bob",
  "role": "participant",
  "participantCount": 1,
  "participants": ["Alice"]
}
```

#### `GET /api/meet/:roomName/info` — Infos sur une réunion
```json
// Response
{
  "roomName": "ma-reunion",
  "active": true,
  "participantCount": 2,
  "participants": [
    { "name": "Alice", "joinedAt": "...", "isPublishing": true }
  ]
}
```

#### `DELETE /api/meet/:roomName` — Fermer une réunion

---

### Enregistrement

#### `POST /api/recording/start`
```json
// Request
{ "displayName": "Alice", "roomName": "ma-reunion" }

// Response
{
  "success": true,
  "egressId": "EG_xxx",
  "filepath": "recordings/2025-01-15/ma-reunion/1736956800000.mp4"
}
```

#### `POST /api/recording/stop`
```json
// Request
{ "displayName": "Alice", "roomName": "ma-reunion", "egressId": "EG_xxx" }
// egressId optionnel → arrête tous les enregistrements si absent

// Response
{ "success": true, "stopped": 1, "message": "Enregistrement arrêté" }
```

#### `GET /api/recording/active/:roomName`
```json
// Response
{
  "roomName": "ma-reunion",
  "count": 1,
  "recordings": [{ "egressId": "EG_xxx", "status": "ACTIVE" }]
}
```

---

## 🔧 Points clés

### Pas de compte requis
Le middleware `authMeet.js` valide uniquement `displayName` (≥ 2 caractères) et `roomName` (≥ 3 caractères). Aucun login, aucun mot de passe.

### Génération du code de réunion
Si `roomName` est absent lors de la création, un code unique est généré automatiquement au format `abc-defg-hij`.

### Fix MinIO — `forcePathStyle: true`
**Obligatoire pour MinIO.** Sans ce paramètre, LiveKit essaie d'accéder à `bucket.endpoint` au lieu de `endpoint/bucket`, ce qui fait échouer l'upload.

### Token LiveKit
- Durée de vie : 4h
- L'hôte reçoit `roomAdmin: true` → peut muter/expulser des participants
- Les participants ont accès publication + souscription audio/vidéo + data channel (chat)
