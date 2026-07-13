#!/usr/bin/env bash
set -euo pipefail

echo "=============================================="
echo " 🧹 Nettoyage initial"
echo "=============================================="
# Nettoyer les anciens rapports de fusion
rm -rf .nyc_output coverage-merged
mkdir -p .nyc_output
echo "   ✓ Dossier .nyc_output/ prêt"

echo ""
echo "=============================================="
echo " 1. Tests unitaires backend (Jest + couverture)"
echo "=============================================="
cd backend
npm run test:cov
cd ..

echo ""
echo "=============================================="
echo " 2. Tests E2E frontend (Cypress + couverture)"
echo "=============================================="
bash scripts/run-e2e.sh

echo ""
echo "=============================================="
echo " 3. Regroupement des fichiers de couverture"
echo "=============================================="

BACKEND_COV_FILE="backend/coverage/coverage-final.json"
FRONTEND_COV_FILE="frontend/coverage/coverage-final.json"

BACKEND_FOUND=false
FRONTEND_FOUND=false

if [ -f "$BACKEND_COV_FILE" ]; then
  cp "$BACKEND_COV_FILE" .nyc_output/coverage-backend.json
  echo "   ✓ Rapport backend copié -> .nyc_output/coverage-backend.json ($(wc -c < "$BACKEND_COV_FILE") octets)"
  BACKEND_FOUND=true
else
  echo "   ⚠ Aucun rapport backend trouvé dans $BACKEND_COV_FILE"
fi

if [ -f "$FRONTEND_COV_FILE" ]; then
  cp "$FRONTEND_COV_FILE" .nyc_output/coverage-frontend.json
  echo "   ✓ Rapport frontend copié -> .nyc_output/coverage-frontend.json ($(wc -c < "$FRONTEND_COV_FILE") octets)"
  FRONTEND_FOUND=true
else
  echo "   ⚠ Aucun rapport frontend trouvé dans $FRONTEND_COV_FILE"
fi

echo ""
echo "=============================================="
echo " 4. Fusion des métriques avec nyc merge"
echo "=============================================="

if [ "$BACKEND_FOUND" = true ] || [ "$FRONTEND_FOUND" = true ]; then
  npx --yes nyc merge .nyc_output .nyc_output/merged-coverage.json
  echo "   ✓ Fichiers fusionnés -> .nyc_output/merged-coverage.json"
else
  echo "   ⚠ Aucun rapport de couverture trouvé, fusion impossible."
  exit 1
fi

echo ""
echo "=============================================="
echo " 5. Génération du rapport unifié (HTML + texte)"
echo "=============================================="

npx --yes nyc report -t .nyc_output --report-dir coverage-merged --reporter=html --reporter=text

echo ""
echo "=============================================="
echo " 📊 Résumé des rapports disponibles"
echo "=============================================="
echo "   Rapport fusionné : coverage-merged/index.html"
echo "   Backend seul      : backend/coverage/lcov-report/index.html"
echo "   Frontend seul     : frontend/coverage/lcov-report/index.html"

echo ""
echo "✅ Terminé !"

