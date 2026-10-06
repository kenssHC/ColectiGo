import type { ReactElement, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, iconSizes } from '../../theme/tokens';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  rightAction?: ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  backLabel = 'Volver',
  rightAction,
}: ScreenHeaderProps): ReactElement {
  return (
    <View className="min-h-16 bg-white border-b border-slate-200 px-4 py-2 flex-row items-center gap-3">
      {onBack ? (
        <Pressable
          className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
        >
          <Ionicons name="arrow-back-outline" size={iconSizes.md} color={colors.textSecondary} />
        </Pressable>
      ) : null}
      <View className="flex-1 py-1">
        <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-sm text-slate-600" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightAction}
    </View>
  );
}
