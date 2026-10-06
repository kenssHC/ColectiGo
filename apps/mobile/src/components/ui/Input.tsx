import type { ReactElement } from 'react';
import { TextInput, View, Text } from 'react-native';
import type { TextInputProps } from 'react-native';
import { colors } from '../../theme/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  errorMessage?: string;
  hint?: string;
}

export function Input({ label, errorMessage, hint, ...rest }: InputProps): ReactElement {
  const hasError = Boolean(errorMessage);

  return (
    <View className="gap-1.5">
      {label ? <Text className="text-sm font-medium text-gray-700">{label}</Text> : null}
      <TextInput
        {...rest}
        className={`min-h-12 rounded-xl border px-4 py-3 text-base text-slate-900 bg-white ${
          hasError ? 'border-red-600 bg-red-50' : 'border-slate-300'
        }`}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={rest.accessibilityLabel ?? label}
        accessibilityHint={rest.accessibilityHint ?? hint}
      />
      {hasError ? (
        <Text className="text-xs text-red-700 ml-1" accessibilityLiveRegion="polite">
          {errorMessage}
        </Text>
      ) : null}
      {hint && !hasError ? <Text className="text-xs text-slate-600 ml-1">{hint}</Text> : null}
    </View>
  );
}
