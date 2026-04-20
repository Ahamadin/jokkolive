#!/bin/bash
# debug-minio.sh
# Lancer sur le serveur pour diagnostiquer le problème d'upload MinIO
# Usage: bash debug-minio.sh

MINIO_URL="http://144.91.74.178:9000"
MINIO_USER="nasry"
MINIO_PASS="Nasry3221646"
BUCKET="livekit-recordings"

echo "════════════════════════════════════════"
echo "  Diagnostic MinIO + LiveKit Egress"
echo "════════════════════════════════════════"

# 1. MinIO joignable ?
echo ""
echo "1️⃣  Test connexion MinIO..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$MINIO_URL/minio/health/live")
if [ "$HTTP_CODE" == "200" ]; then
  echo "   ✅ MinIO répond (HTTP $HTTP_CODE)"
else
  echo "   ❌ MinIO ne répond pas (HTTP $HTTP_CODE) — vérifier que MinIO tourne"
  echo "      docker ps | grep minio"
fi

# 2. Bucket existe ?
echo ""
echo "2️⃣  Vérification du bucket '$BUCKET'..."
BUCKET_CHECK=$(curl -s -o /dev/null -w "%{http_code}" \
  -u "$MINIO_USER:$MINIO_PASS" \
  "$MINIO_URL/$BUCKET/")
if [ "$BUCKET_CHECK" == "200" ] || [ "$BUCKET_CHECK" == "301" ]; then
  echo "   ✅ Bucket '$BUCKET' accessible"
else
  echo "   ❌ Bucket inaccessible (HTTP $BUCKET_CHECK)"
  echo "   → Créer avec: mc mb local/$BUCKET"
fi

# 3. Test d'écriture dans MinIO
echo ""
echo "3️⃣  Test d'écriture dans MinIO..."
TEST_FILE="/tmp/test-recording-$(date +%s).txt"
echo "test upload $(date)" > "$TEST_FILE"
UPLOAD_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -u "$MINIO_USER:$MINIO_PASS" \
  --upload-file "$TEST_FILE" \
  "$MINIO_URL/$BUCKET/test/$(basename $TEST_FILE)")
rm -f "$TEST_FILE"
if [ "$UPLOAD_CODE" == "200" ] || [ "$UPLOAD_CODE" == "201" ]; then
  echo "   ✅ Upload réussi dans MinIO"
else
  echo "   ❌ Échec upload (HTTP $UPLOAD_CODE)"
  echo "   → Vérifier les credentials et permissions du bucket"
fi

# 4. Egress tourne ?
echo ""
echo "4️⃣  Vérification du service Egress..."
if command -v docker &>/dev/null; then
  EGRESS_CONTAINER=$(docker ps --filter "name=egress" --format "{{.Names}}" 2>/dev/null | head -1)
  if [ -n "$EGRESS_CONTAINER" ]; then
    echo "   ✅ Conteneur egress trouvé: $EGRESS_CONTAINER"
    echo "   📋 Logs récents:"
    docker logs "$EGRESS_CONTAINER" --tail 20 2>&1 | sed 's/^/      /'
  else
    echo "   ⚠️  Aucun conteneur 'egress' trouvé via Docker"
    echo "   → Si egress tourne en bare-metal: ps aux | grep egress"
    ps aux | grep -i egress | grep -v grep | sed 's/^/      /'
  fi
else
  echo "   ℹ️  Docker non disponible — vérification processus:"
  ps aux | grep -i egress | grep -v grep | sed 's/^/      /')
fi

# 5. Contenu du bucket
echo ""
echo "5️⃣  Contenu actuel du bucket '$BUCKET'..."
if command -v mc &>/dev/null; then
  mc alias set local "$MINIO_URL" "$MINIO_USER" "$MINIO_PASS" --quiet 2>/dev/null
  echo "   Fichiers dans le bucket:"
  mc ls --recursive "local/$BUCKET" 2>/dev/null | tail -20 | sed 's/^/      /'
  COUNT=$(mc ls --recursive "local/$BUCKET" 2>/dev/null | wc -l)
  echo "   Total: $COUNT fichier(s)"
else
  echo "   ℹ️  'mc' non installé"
  echo "   Installer: wget https://dl.min.io/client/mc/release/linux-amd64/mc && chmod +x mc && sudo mv mc /usr/local/bin/"
fi

echo ""
echo "════════════════════════════════════════"
echo "  Résumé des actions recommandées"
echo "════════════════════════════════════════"
echo ""
echo "Si le fichier n'apparaît pas dans MinIO après un enregistrement :"
echo ""
echo "A) Vérifier les logs de l'egress PENDANT/APRÈS l'enregistrement :"
echo "   docker logs livekit-egress -f"
echo ""
echo "B) Vérifier egress.yml — force_path_style: true est OBLIGATOIRE pour MinIO"
echo ""
echo "C) Si egress est dans Docker, remplacer dans egress.yml :"
echo "   endpoint: http://144.91.74.178:9000"
echo "   → par: http://172.17.0.1:9000  (IP host depuis Docker)"
echo ""
echo "D) Vérifier que le service Node.js N'envoie PAS de config S3 inline"
echo "   → Utiliser recording.service.js fourni (filepath seulement, pas de s3Upload)"
echo ""
