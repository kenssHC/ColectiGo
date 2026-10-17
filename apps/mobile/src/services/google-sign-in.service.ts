import { Platform } from 'react-native';
import type * as GoogleSignInExports from 'react-native-nitro-google-signin';

type GoogleSignInModule = typeof GoogleSignInExports;

let configuredClientId: string | null = null;

function loadModule(): GoogleSignInModule {
  // La carga diferida evita inicializar el módulo nativo en web.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-nitro-google-signin') as GoogleSignInModule;
}

function clientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';
}

function configure(module: GoogleSignInModule): void {
  const webClientId = clientId();
  if (!webClientId) {
    throw new Error('El inicio con Google todavía no está configurado en esta aplicación');
  }
  if (configuredClientId === webClientId) return;

  module.GoogleOneTapSignIn.configure({
    webClientId,
    offlineAccess: false,
    autoSelectOnSignIn: false,
  });
  configuredClientId = webClientId;
}

function friendlyNativeError(error: unknown, module: GoogleSignInModule): Error {
  if (module.isErrorWithCode(error)) {
    if (error.code === module.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return new Error('Actualiza Google Play Services para continuar con Google');
    }
    if (error.code === module.statusCodes.DEVELOPER_ERROR) {
      return new Error(
        'Google Sign-In no está configurado para la firma de esta aplicación (package/SHA-1)',
      );
    }
    if (error.code === module.statusCodes.IN_PROGRESS) {
      return new Error('Ya hay un inicio con Google en curso');
    }
    if (error.code === module.statusCodes.SIGN_IN_CANCELLED) {
      return new Error('Inicio con Google cancelado');
    }
  }
  return new Error('No se pudo iniciar sesión con Google. Intenta nuevamente');
}

export const googleSignInService = {
  isConfigured(): boolean {
    return Platform.OS !== 'web' && clientId().length > 0;
  },

  async requestIdToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      throw new Error('El inicio con Google nativo no está disponible en la versión web');
    }

    const module = loadModule();
    configure(module);

    try {
      await module.GoogleOneTapSignIn.checkPlayServices();
      let response = await module.GoogleOneTapSignIn.signIn();

      if (module.isCancelledResponse(response)) return null;
      if (module.isNoSavedCredentialFoundResponse(response)) {
        response = await module.GoogleOneTapSignIn.createAccount();
      }
      if (module.isCancelledResponse(response)) return null;
      if (module.isNoSavedCredentialFoundResponse(response)) {
        response = await module.GoogleOneTapSignIn.presentExplicitSignIn();
      }
      if (module.isCancelledResponse(response)) return null;
      if (!module.isSuccessResponse(response) || !response.data.idToken) {
        throw new Error('Google no devolvió una credencial válida');
      }

      return response.data.idToken;
    } catch (error) {
      throw friendlyNativeError(error, module);
    }
  },

  async signOut(): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      const module = loadModule();
      configure(module);
      await module.GoogleOneTapSignIn.signOut();
    } catch {
      // Firebase se cierra igualmente. El estado Google local no debe bloquear logout.
    }
  },
};
