import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocalUser } from '../types/user.types';

const USER_STORAGE_KEY = '@collectigo:user';

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

async function persistUser(user: LocalUser): Promise<void> {
  await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export const localAuthService = {
  async signIn(email: string, _password: string): Promise<LocalUser> {
    const user: LocalUser = {
      id: generateId(),
      displayName: email.split('@')[0],
      email: email.trim().toLowerCase(),
    };
    await persistUser(user);
    return user;
  },

  async register(email: string, _password: string, displayName: string): Promise<LocalUser> {
    const user: LocalUser = {
      id: generateId(),
      displayName: displayName.trim(),
      email: email.trim().toLowerCase(),
    };
    await persistUser(user);
    return user;
  },

  async getCurrentUser(): Promise<LocalUser | null> {
    const stored = await AsyncStorage.getItem(USER_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as LocalUser;
  },

  async signOut(): Promise<void> {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  },
};
