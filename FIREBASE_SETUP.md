# Configuration Firebase MotoTrack

Suivre ces etapes dans la console Firebase pour activer la localisation riders en temps reel.

## 1) Creer le projet

1. Ouvrir [Firebase Console](https://firebase.google.com/).
2. Creer un projet `motoride` (ou ton nom prefere).
3. Ajouter une application **Web**.
4. Copier les cles de configuration.

## 2) Remplir `firebase-config.js`

Remplacer toutes les valeurs `YOUR_*`:

- `apiKey`
- `authDomain`
- `databaseURL`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

## 3) Activer les services

- **Authentication**
  - Activer `Google` et/ou `Email/Password`.
- **Realtime Database**
  - Creer la base en mode test (pour dev).
- **Firestore**
  - Activer en mode test.
- **Storage**
  - Activer en mode test.

## 4) Regles Realtime Database (dev)

Utiliser temporairement:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

Ensuite securiser en prod avec auth.

## 5) Test rapide

1. Lancer l'app en HTTPS (GitHub Pages).
2. Autoriser GPS.
3. Ouvrir l'onglet Social.
4. Activer `Partager ma position`.
5. Verifier:
   - marqueur live sur la carte,
   - section `Riders a cote de moi`,
   - noeuds `presence/global/*` dans Realtime Database.
