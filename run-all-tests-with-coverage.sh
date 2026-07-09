#!/usr/bin/env bash
set -euo pipefail

echo "=============================================="
echo " 🧹 Nettoyage initial"
echo "=============================================="
# Nettoyer les anciens rapports de fusion
rm -rf .nyc_output coverage-all
mkdir -p .nyc_output coverage-all
echo "   ✓ Dossiers .nyc_output/ et coverage-all/ prêts"

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
echo " 3. Fusion des rapports de couverture"
echo "=============================================="

# Vérifier les fichiers de couverture disponibles
BACKEND_COV_FILE="backend/coverage/coverage-final.json"
FRONTEND_COV_FILE="frontend/coverage/coverage-final.json"

BACKEND_FOUND=false
FRONTEND_FOUND=false

if [ -f "$BACKEND_COV_FILE" ]; then
  cp "$BACKEND_COV_FILE" .nyc_output/backend-coverage.json
  echo "   ✓ Rapport backend ajouté ($(wc -c < "$BACKEND_COV_FILE") octets)"
  BACKEND_FOUND=true
else
  echo "   ⚠ Aucun rapport backend trouvé dans $BACKEND_COV_FILE"
fi

if [ -f "$FRONTEND_COV_FILE" ]; then
  cp "$FRONTEND_COV_FILE" .nyc_output/frontend-coverage.json
  echo "   ✓ Rapport frontend ajouté ($(wc -c < "$FRONTEND_COV_FILE") octets)"
  FRONTEND_FOUND=true
else
  echo "   ⚠ Aucun rapport frontend trouvé dans $FRONTEND_COV_FILE"
fi

# Générer le rapport HTML combiné avec nyc
if [ "$BACKEND_FOUND" = true ] || [ "$FRONTEND_FOUND" = true ]; then
  echo ""
  echo "   Génération du rapport combiné..."
  npx --yes nyc report --reporter html --reporter text --report-dir coverage-all 2>&1
  RET=$?
  if [ $RET -ne 0 ]; then
    echo ""
    echo "   ⚠ La fusion nyc a échoué (code $RET)."
    echo "   Les rapports individuels sont disponibles dans :"
    echo "     - backend/coverage/lcov-report/index.html"
    echo "     - frontend/coverage/lcov-report/index.html"
  else
    echo "   ✓ Rapport combiné généré avec succès"
  fi
else
  echo ""
  echo "   ⚠ Aucun rapport de couverture trouvé, fusion impossible."
fi

echo ""
echo "=============================================="
echo " 📊 Résumé des rapports disponibles"
echo "=============================================="
echo "   Rapport combiné : coverage-all/index.html"
echo "   Backend seul    : backend/coverage/lcov-report/index.html"
echo "   Frontend seul   : frontend/coverage/lcov-report/index.html"

echo ""
echo "✅ Terminé !"
