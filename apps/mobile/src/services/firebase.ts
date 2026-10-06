import { Platform } from 'react-native';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/**
 * En nativo la sesión se persiste en AsyncStorage. `getReactNativePersistence`
 * solo existe en el entry react-native de firebase/auth (que Metro resuelve),
 * por eso se carga con require y no con un import estático.
 *
 * Si Auth ya fue inicializado (hot reload), se reutiliza con getAuth.
 */
function createAuth(firebaseApp: FirebaseApp): Auth {
  if (Platform.OS === 'web') {
    return getAuth(firebaseApp);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getReactNativePersistence } = require('firebase/auth') as {
      getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
    };

    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(firebaseApp);
  }
}

export const firebaseAuth: Auth = createAuth(app);
