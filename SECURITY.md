## Audit des Dépendances - 16/07/26

**Périmètre :** Racine du projet, Backend (NestJS) et Frontend (Vite)

**Outil :** `npm audit`

### 1. Synthèse des résultats

- **Racine du projet :** 0 vulnérabilité trouvée.
- **Frontend :** 0 vulnérabilité trouvée.
- **Backend :** 4 vulnérabilités détectées (3 High, 1 Moderate).

### 2. Analyse et Décisions de remédiation

| Paquet impacté | Sévérité | Faille                                                 | Composant parent              | Action menée                              |
| :------------- | :------: | :----------------------------------------------------- | :---------------------------- | :---------------------------------------- |
| `form-data`    | **High** | CRLF injection via field names/filenames               | Direct                        | **Résolu.** Exécution de `npm audit fix`. |
| `multer`       | **High** | Denial of Service (nested fields & incomplete cleanup) | `@nestjs/platform-express`    | **Résolu.** Exécution de `npm audit fix`. |
| `js-yaml`      | Moderate | Denial of Service (Quadratic-complexity)               | `@istanbuljs/load-nyc-config` | **Résolu.** Exécution de `npm audit fix`. |

### 3. Conclusion et évolution de la stratégie de sécurité

L'utilisation de `npm audit` en local permet de corriger les vulnérabilités de manière ponctuelle pour ce MVP. Cependant, compte tenu de la nature de l'application (qui gère l'upload de fichiers via `multer` et manipule des données utilisateur), une approche préventive **robuste et automatisée** est requise.

#### **Plan d'action DevSecOps :**

Il est préconisé de remplacer cette vérification manuelle par l'intégration d'un outil d'analyse statique plus robuste (comme [_Snyk_](https://snyk.io/fr/)). Ce scan sera implémenté sous forme d'action GitHub (GitHub Actions) exécutée à chaque _push_. Il agira comme une _Quality Gate_, conditionnant l'acceptation de la _Pull Request_ et bloquant la fusion du code si une vulnérabilité critique ou haute est détectée.
