import type { Href } from 'expo-router';

// Los casts dejan funcionar el type-check antes de que Expo regenere router.d.ts.
export const PRIVACY_POLICY_HREF = '/legal/privacy' as Href;
export const TERMS_OF_USE_HREF = '/legal/terms' as Href;
