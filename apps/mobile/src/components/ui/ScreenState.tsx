import type { ReactElement } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors } from '../../theme/tokens';

interface ScreenStateProps {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isLoading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

export function ScreenState({
  title,
  message,
  icon = 'information-circle-outline',
  isLoading = false,
  actionLabel,
  onAction,
}: ScreenStateProps): ReactElement {
  return (
    <View className="flex-1 min-h-64 items-center justify-center px-8 py-12 gap-3">
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel={title} />
      ) : (
        <View className="w-14 h-14 rounded-full bg-slate-100 items-center justify-center">
          <Ionicons name={icon} size={28} color={colors.textSecondary} />
        </View>
      )}
      <Text className="text-lg font-bold text-slate-900 text-center">{title}</Text>
      <Text className="text-sm leading-5 text-slate-600 text-center">{message}</Text>
      {actionLabel && onAction ? (
        <View className="mt-2 min-w-52">
          <Button label={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
