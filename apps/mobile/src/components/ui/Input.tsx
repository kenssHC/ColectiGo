import { TextInput, View, Text } from 'react-native';
import type { TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  errorMessage?: string;
  hint?: string;
}

export function Input({ label, errorMessage, hint, ...rest }: InputProps) {
  const hasError = Boolean(errorMessage);

  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-sm font-medium text-gray-700">{label}</Text>
      ) : null}
      <TextInput
        className={`rounded-xl border px-4 py-3.5 text-base text-gray-900 bg-white ${
          hasError ? 'border-red-400 bg-red-50' : 'border-gray-200'
        }`}
        placeholderTextColor="#9CA3AF"
        {...rest}
      />
      {hasError ? (
        <Text className="text-xs text-red-500 ml-1">{errorMessage}</Text>
      ) : null}
      {hint && !hasError ? (
        <Text className="text-xs text-gray-400 ml-1">{hint}</Text>
      ) : null}
    </View>
  );
}
