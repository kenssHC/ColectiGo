import type { ReactElement } from 'react';
import { Redirect } from 'expo-router';

/** Compatibilidad con enlaces y builds anteriores que abrían el historial. */
export default function SuggestionsRedirect(): ReactElement {
  return <Redirect href="/profile/new-suggestion" />;
}
