# Components CSS Library - Figma Mapping

**Source de vérité:** Layer "Components" (node-id: 9-113)
**URL Figma:** https://www.figma.com/design/DbO797g9F8eM3JBZFe3kpN/DataShare--Copy---Copy-?node-id=9-113

## Architecture

6 fichiers CSS indépendants, un par composant. Chaque classe suit une approche simple sans préfixes.

---

## 📋 Composants disponibles

### 1. **buttonComponent.css**

**Classe principale:** `.button`

**Variantes disponibles:**

- **Tailles:** `.button--small` (8px 12px padding) | `.button--medium` (12px 16px padding)
- **Styles:**
  - `.button--primary` (orange beige bg + orange border)
  - `.button--secondary` (transparent + orange border + orange text)
  - `.button--tertiary` (transparent + orange text)
  - `.button--dark` (#2c2c2c + light text)
  - `.button--disabled` (gray disabled state)

**États intégrés:** `:hover` pour tous

**Style par défaut (Figma):**

- border-radius: 8px
- font-family: DM Sans
- font-weight: 400

---

### 2. **inputComponent.css**

**Classe principale:** `.input`

**Structure:**

- `.input__label` - Étiquette
- `.input__control` - Input field
- `.input__description` - Description optionnelle
- `.input__error-message` - Message d'erreur

**Variantes:**

- `.input--with-description` - Affiche la description
- `.input--error` - État erreur (border rouge + fond light rouge)

**Style par défaut (Figma):**

- border-radius: 8px
- min-height: 44px
- padding: 12px 14px
- border: 1px solid #e6e7eb
- font-family: DM Sans
- font-size: 16px

---

### 3. **selectComponent.css**

**Classe principale:** `.select`

**Structure:**

- `.select__label` - Étiquette
- `.select__control` - Conteneur du select
- `.select__input` - Input select
- `.select__arrow` - Chevron dropdown
- `.select__description` - Description optionnelle
- `.select__error-message` - Message d'erreur

**Variantes:**

- `.select--with-description` - Affiche la description
- `.select--error` - État erreur

**Style par défaut (Figma):**

- border-radius: 8px
- min-height: 44px
- padding: 12px 14px
- border: 1px solid #e6e7eb
- font-family: DM Sans

---

### 4. **headerComponent.css**

**Classe principale:** `.header`

**Structure:**

- `.header__inner` - Conteneur interne max-width 1280px
- `.header__title` - Logo/titre "DataShare"
- `.header__actions` - Conteneur des boutons
- `.header__action-button` - Bouton d'action
- `.header__action-icon` - Icône du bouton

**Variantes:**

- `.header--mobile` - Ajustements mobiles (future use)
- `.header--logged` - État connecté (future use)

**Style par défaut (Figma):**

- gap: 10px
- padding: 16px
- max-width: 1280px
- font-size: 32px (titre)
- Button: background #2c2c2c, color #f3eeea

---

### 5. **switchComponent.css**

**Classe principale:** `.switch`

**Structure:**

- `.switch__item` - Élément du switch
- `.switch__item--active` - État actif (background #e77a6e)

**États possibles:** All, True, False (seul un item active à la fois)

**Style par défaut (Figma):**

- border-radius: 24px
- border: 1px solid rgba(215, 99, 11, 0.2)
- background: rgba(255, 193, 145, 0.16)
- padding: 8px 16px par item
- Active: background #e77a6e, color white

---

### 6. **calloutComponent.css**

**Classe principale:** `.callout`

**Structure:**

- `.callout__icon` - Icône
- `.callout__text` - Texte du message
- `.callout__icon-info|alert|error` - Classes pour les icônes spécifiques

**Types (variantes):**

- `.callout--info` (bleu #e2ecff)
- `.callout--alert` (orange #fff5ed)
- `.callout--error` (rouge #ffe2e2)

**Style par défaut (Figma):**

- border-radius: 8px
- padding: 8px
- gap: 8px
- font-size: 14px
- border: 1px solid (couleur spécifique par type)

---

## 🎨 Palette de couleurs extraite (Figma)

| Variable             | Hex     | Usage                             |
| -------------------- | ------- | --------------------------------- |
| Primary Orange       | #e27f29 | Texte secondary buttons, tertiary |
| Primary Orange Light | #ffa569 | Border secondary buttons          |
| Primary Dark Brown   | #ba681f | Texte primary buttons             |
| Dark Background      | #2c2c2c | Buttons dark                      |
| Light Text           | #f3eeea | Texte sur dark                    |
| Border               | #e6e7eb | Input/select borders              |
| Text Default         | #111111 | Texte input                       |
| Text Muted           | #9b9ba4 | Placeholders                      |
| Error Red            | #9c3333 | Error states                      |
| Info Blue            | #2a3f72 | Callout info                      |
| Alert Orange         | #aa642b | Callout alert                     |
| Switch Active        | #e77a6e | Switch active state               |

---

## 📏 Dimensions communes (Figma)

- **border-radius standard:** 8px
- **border-radius large (switch):** 24px
- **gap standard:** 8px
- **padding button small:** 8px 12px
- **padding button medium:** 12px 16px
- **padding input/select:** 12px 14px
- **min-height input/select:** 44px
- **min-height button small:** auto
- **min-height button medium:** auto

---

## 🔗 Imports pour les pages

Quand tu crées une nouvelle page, importe UNIQUEMENT les CSS des composants que tu utilises:

```css
/* Importer dans ta page CSS */
@import "../components/buttonComponent.css";
@import "../components/inputComponent.css";
@import "../components/headerComponent.css";
```

**N'importe PAS** `components-ui.css` ou d'autres anciens fichiers - utilise uniquement cette librairie.

---

## ✅ Vérification

Chaque classe a été créée en lisant exclusivement le layer Components (node-id: 9-113) de Figma.
Aucune valeur n'a été prise de `components-ui.css` ou du design system générique.
