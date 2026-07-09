#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────
#  Script de lancement des tests E2E complets
#  Utilise Docker pour PostgreSQL + MinIO,
#  puis lance le backend et le frontend, et Cypress.
# ─────────────────────────────────────────────────────

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# ── Nettoyage initial : on s'assure que tout est arrêté avant de commencer ──
echo "=============================================="
echo " 🧹 Nettoyage initial"
echo "=============================================="
docker compose -f docker-compose.yml down -v 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1
echo "   ✓ Prêt"

# Nettoyage en cas d'erreur ou d'interruption
cleanup() {
  local exit_code=$?
  echo ""
  echo "=============================================="
  echo " 🧹 Nettoyage final"
  echo "=============================================="

  # Arrêter les serveurs s'ils tournent encore
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "${FRONTEND_PID:-}" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
  fi

  # Arrêter et supprimer les volumes Docker
  docker compose -f docker-compose.yml down -v 2>/dev/null || true

  if [ $exit_code -eq 0 ]; then
    echo " ✅ Tests E2E réussis !"
  else
    echo " ❌ Tests E2E échoués (code: $exit_code)"
  fi
}
trap cleanup EXIT

echo "=============================================="
echo " 1. Lancement des services Docker"
echo "    (PostgreSQL + MinIO)"
echo "=============================================="
docker compose -f docker-compose.yml up -d postgres-e2e minio-e2e

echo ""
echo "Attente de la disponibilité des services..."
docker compose -f docker-compose.yml up setup

echo ""
echo "=============================================="
echo " 2. Installation des dépendances si nécessaire"
echo "=============================================="
cd "$ROOT_DIR/backend"
if [ ! -d "node_modules" ]; then
  npm ci
fi

cd "$ROOT_DIR/frontend"
if [ ! -d "node_modules" ]; then
  npm ci
fi

echo ""
echo "=============================================="
echo " 3. Génération du client Prisma"
echo "=============================================="
cd "$ROOT_DIR/backend"
cp env.e2e .env.e2e.local
export $(grep -v '^#' env.e2e | xargs)

npx prisma generate
echo "   Application des migrations..."
npx prisma migrate deploy

echo ""
echo "   Seed des données de test..."
npx prisma db seed

echo ""
echo "=============================================="
echo " 4. Build et démarrage du backend (port 3000)"
echo "=============================================="
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

cd "$ROOT_DIR/backend"
NODE_ENV=e2e \
  DATABASE_URL="postgresql://datashare:datashare_e2e_pass@localhost:5433/datashare_e2e" \
  JWT_SECRET="e2e-test-secret-key-not-for-production" \
  AWS_REGION="us-east-1" \
  AWS_S3_BUCKET="datashare-e2e" \
  AWS_ACCESS_KEY_ID="minioadmin" \
  AWS_SECRET_ACCESS_KEY="minioadmin123" \
  AWS_ENDPOINT="http://localhost:9000" \
  AWS_FORCE_PATH_STYLE="true" \
  npx nest build

NODE_ENV=e2e \
  DATABASE_URL="postgresql://datashare:datashare_e2e_pass@localhost:5433/datashare_e2e" \
  JWT_SECRET="e2e-test-secret-key-not-for-production" \
  AWS_REGION="us-east-1" \
  AWS_S3_BUCKET="datashare-e2e" \
  AWS_ACCESS_KEY_ID="minioadmin" \
  AWS_SECRET_ACCESS_KEY="minioadmin123" \
  AWS_ENDPOINT="http://localhost:9000" \
  AWS_FORCE_PATH_STYLE="true" \
  node dist/src/main > /tmp/datashare-backend-e2e.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

echo ""
echo "=============================================="
echo " 5. Démarrage du frontend (port 5173)"
echo "=============================================="
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

cd "$ROOT_DIR/frontend"
npm run dev > /tmp/datashare-frontend-e2e.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "=============================================="
echo " Attente de la disponibilité des serveurs..."
echo "=============================================="

# --- Attente du backend (port 3000) ---
echo -n "   Backend (port 3000)"
for i in $(seq 1 60); do
  http_code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null || echo "000")
  case "$http_code" in
    200|201|301|302|404)
      echo ""
      echo "   ✓ Backend prêt"
      break
      ;;
  esac
  echo -n "."
  sleep 2
done
# Vérification finale
final_http=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null || echo "000")
case "$final_http" in
  200|201|301|302|404)
    ;;
  *)
    echo ""
    echo "   ✗ Backend non disponible après 120s (dernier code HTTP: $final_http)"
    echo "   Consultez les logs : cat /tmp/datashare-backend-e2e.log"
    exit 1
    ;;
esac

# --- Attente du frontend (port 5173) ---
echo -n "   Frontend (port 5173)"
for i in $(seq 1 60); do
  http_code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/ 2>/dev/null || echo "000")
  case "$http_code" in
    200|304)
      echo ""
      echo "   ✓ Frontend prêt"
      break
      ;;
  esac
  echo -n "."
  sleep 2
done
# Vérification finale
final_http=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/ 2>/dev/null || echo "000")
case "$final_http" in
  200|304)
    ;;
  *)
    echo ""
    echo "   ✗ Frontend non disponible après 120s (dernier code HTTP: $final_http)"
    echo "   Consultez les logs : cat /tmp/datashare-frontend-e2e.log"
    exit 1
    ;;
esac

echo ""
echo "=============================================="
echo " 6. Lancement des tests Cypress (avec coverage)"
echo "=============================================="
cd "$ROOT_DIR/frontend"
if [ "${1:-}" = "--open" ]; then
  npx cypress open
else
  npx cypress run --spec "cypress/e2e/parcours-critique.cy.ts" --env coverage=true
fi

echo ""
echo "=============================================="
echo " 7. Coverage E2E généré"
echo "=============================================="
if [ -f "frontend/coverage/coverage-final.json" ]; then
  echo "   ✓ Coverage frontend disponible dans frontend/coverage/"
  echo "   Résumé :"
  npx --yes nyc report --reporter text --report-dir /dev/null \
    --temp-dir frontend/coverage 2>/dev/null || true
else
  echo "   ⚠ Aucun rapport de coverage frontend trouvé"
fi
