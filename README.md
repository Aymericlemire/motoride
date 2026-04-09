# MotoTrack PWA

Application PWA mobile-first pour riders moto: carte, social temps reel, tracking, meteo, Bluetooth intercom et mode offline.

## Lien du projet

- Repo GitHub: [Aymericlemire/motoride](https://github.com/Aymericlemire/motoride.git)

## Demarrage local

Comme c'est une PWA (Service Worker + modules ES), lance un serveur HTTP local:

```bash
# exemple Python
python -m http.server 8080
```

Puis ouvre:

- `http://localhost:8080/`

## Deploiement GitHub Pages

1. Ouvrir le repo sur GitHub.
2. Aller dans `Settings` -> `Pages`.
3. Dans `Build and deployment`:
   - `Source`: **Deploy from a branch**
   - `Branch`: **main** + **/ (root)**
4. Cliquer **Save**.
5. Attendre 1-2 minutes, puis verifier l'URL:
   - `https://aymericlemire.github.io/motoride/`

## Config Firebase / API

Mettre vos vraies cles dans `firebase-config.js`:

- `apiKey`
- `authDomain`
- `databaseURL`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`
- `WEATHER_API_KEY`

## Checklist de test rapide

- [ ] Ouvrir l'app sur 2 telephones (Android + Chrome recommande).
- [ ] Autoriser GPS sur les deux.
- [ ] Onglet `Social` -> `Partager ma position ON`.
- [ ] Onglet `Carte` -> verifier les deux riders + traces.
- [ ] Tester `Profil` -> Bluetooth + diagnostic.
- [ ] Installer la PWA via bouton `Installer`.
- [ ] Couper internet pour verifier le mode offline de base.

## Notes

- Certains intercoms restent en mode `audio-only` cote web (normal).
- Le mode `Intercom Hub` permet d'ouvrir les apps constructeurs (fallback).
- Pour la publication publique, preferer une instance Firebase de prod avec regles securisees.
