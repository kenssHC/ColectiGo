import type { ReactElement } from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GoogleAuthButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function GoogleAuthButton({
  onPress,
  isLoading = false,
  disabled = false,
}: GoogleAuthButtonProps): ReactElement {
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      className={`min-h-[52px] rounded-2xl border border-slate-300 bg-white px-5 flex-row items-center justify-center gap-3 ${
        isDisabled ? 'opacity-50' : 'active:bg-slate-50'
      }`}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel="Continuar con Google"
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#4285F4" />
      ) : (
        <Ionicons name="logo-google" size={20} color="#4285F4" />
      )}
      <Text className="text-slate-700 text-base font-semibold">
        {isLoading ? 'Conectando con Google…' : 'Continuar con Google'}
      </Text>
    </TouchableOpacity>
  );
}
