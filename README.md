# StoicFit

StoicFit est une application mobile de suivi de musculation et de nutrition. Elle permet d'organiser ses programmes d'entraînement, de suivre ses exercices et ses séries, puis de consulter ses statistiques et records personnels. Un module Nutrition sert à enregistrer les repas, les macros et l'hydratation.

Les données de séances et de nutrition sont sauvegardées localement sur l'appareil avec AsyncStorage. Elles restent disponibles après la fermeture et le redémarrage de l'application, mais ne sont pas synchronisées entre appareils ni sauvegardées sur un compte cloud.

## Technologies

- React Native avec Expo SDK 54
- TypeScript
- React Navigation
- Zustand pour l'état de l'application
- AsyncStorage pour la persistance locale

## Prérequis

- Node.js (version LTS recommandée)
- npm
- Expo Go sur un téléphone pour tester l'application, ou un émulateur Android/iOS configuré

## Installation

À la racine du projet, installe les dépendances:

```bash
npm ci
```

## Lancer avec Expo Go

Démarre le serveur de développement:

```bash
npx expo start
```

Scanne ensuite le QR code affiché dans le terminal avec Expo Go sur Android. Sur iPhone, scanne-le avec l'appareil photo puis ouvre le lien dans Expo Go. Le téléphone et l'ordinateur doivent généralement être connectés au même réseau Wi-Fi.

Si le réseau local empêche la connexion, démarre Expo en mode tunnel:

```bash
npx expo start --tunnel
```

Le projet utilise Expo SDK 54. Si Expo Go installé sur le téléphone ne prend plus en charge cette version du SDK, utilise un émulateur ou crée un development build compatible avec le projet.

## Autres commandes

```bash
npm start          # Démarrer Expo
npm run android    # Compiler et lancer sur un émulateur/appareil Android configuré
npm run ios        # Compiler et lancer sur un simulateur iOS (macOS requis)
npm run web        # Démarrer la version web
```

Pour vider le cache Metro en cas de problème de chargement:

```bash
npx expo start --clear
```

## Générer un APK de test

Le profil EAS `preview` génère un APK Android distribuable en interne. Il faut être connecté à un compte Expo/EAS:

```bash
npx eas-cli login
npm run build:apk
```

Le lien de téléchargement apparaît dans la page du build EAS une fois la compilation terminée.

## Structure du projet

```text
src/
  components/   Composants réutilisables
  data/         Catalogue d'exercices
  models/       Types du domaine
  navigation/   Navigation entre les écrans
  screens/      Écrans de l'application
  store/        État et stockage local
  theme/        Couleurs et thème
  utils/        Fonctions de calcul
```

## Vérification TypeScript

```bash
npx tsc --noEmit
```