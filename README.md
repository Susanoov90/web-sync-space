# WebSyncSpace

WebSyncSpace est une extension Chrome qui permet de **projeter l’écran d’un onglet** et de le partager **en temps réel** avec plusieurs clients, directement dans leur navigateur.
Elle repose sur **Firebase Realtime Database** (signalisation) et **WebRTC** (transport audio/vidéo).

---

## ✨ Fonctionnalités

- Création d’une **session unique** avec un code à partager.
- Capture d’un onglet Chrome et diffusion en direct (audio + vidéo).
- Plusieurs spectateurs peuvent rejoindre la même session simultanément.
- Reconnexion facile via un bouton **Resume session**.
- Architecture **host (hôte)** et **viewer (client)** :
  - Hôte : choisit un onglet, lance le partage.
  - Viewers : rejoignent en entrant un code et voient l’écran projeté.
- Préparation future : canal de **contrôle** (les viewers pourront interagir sur l’onglet partagé).

---

## 📂 Structure du projet

```
src/
 ├── background.ts          # Service worker, signalisation WebRTC via Firebase
 ├── Pages/
 │    ├── HostTab.tsx       # Page plein écran de l’hôte (capture onglet + diffusion)
 │    └── ViewerTab.tsx     # Page plein écran des clients (lecture du flux)
 ├── Popups/
 │    ├── Welcome.tsx       # Écran d’accueil avec Resume/Create/Join
 │    ├── BridgeToCreateSession.tsx # Prépare une session, ouvre la page Host
 │    └── JoinSession.tsx   # Vérifie un code et ouvre la page Viewer
 ├── TabLogic/
 │    └── SelectTab.tsx     # Liste les onglets ouverts pour l’hôte
 ├── types/
 │    └── Tab.ts            # Typage des onglets Chrome
 └── App.tsx                # Routage principal (React Router)
```

---

## 🔨 Build

Le projet utilise **Vite + Rollup** pour compiler TypeScript.

---

## 🚀 Installation dans Chrome

1. Ouvrir `chrome://extensions/`.
2. Activer le **mode développeur**.
3. Cliquer sur **Charger l’extension non empaquetée**.
4. Sélectionner le dossier du projet (qui contient `manifest.json`).

---

## 🖥️ Utilisation

1. **Créer une session (hôte)** :

   - Ouvre la popup de l’extension.
   - Clique sur **Create a sharing session**.
   - Sélectionne l’onglet à partager.
   - Une page `Host — WebSyncSpace` s’ouvre, affiche le code.
   - Clique sur **Start sharing** pour diffuser.
2. **Rejoindre une session (viewer)** :

   - Ouvre la popup de l’extension.
   - Clique sur **Join an existing sharing session**.
   - Entre le code donné par l’hôte.
   - Une page `Viewer — WebSyncSpace` s’ouvre et affiche le flux projeté.
3. **Reprendre une session (Resume)** :

   - Si une session est encore active, l’écran d’accueil affiche un bouton **Resume**.

---



## 🚧 Limitations actuelles

- Le partage fonctionne uniquement sur **Google Chrome** (API `tabCapture`).
- Pas encore de support pour le partage d’écran complet ou multi-fenêtres.
- Les viewers sont en **lecture seule** (pas encore de contrôle à distance).
- La popup doit être ouverte pour créer/join, mais le partage se poursuit dans les pages ouvertes.

---



## 👨‍💻 Auteur

Projet développé par **Georgio K `<KGV/>`**.
