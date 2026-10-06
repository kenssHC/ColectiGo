import type { ReactElement } from 'react';
import { Pressable, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/tokens';

interface ErrorBannerProps {
  message: string;
  variant?: 'error' | 'info';
  actionLabel?: string;
  onAction?: () => void;
}

const VARIANT_STYLES = {
  error: {
    container: 'bg-red-50 border-red-100',
    text: 'text-red-800',
    icon: 'alert-circle-outline' as const,
    iconColor: colors.error,
  },
  info: {
    container: 'bg-blue-50 border-blue-100',
    text: 'text-blue-800',
    icon: 'information-circle-outline' as const,
    iconColor: colors.primary,
  },
};

export function ErrorBanner({
  message,
  variant = 'error',
  actionLabel,
  onAction,
}: ErrorBannerProps): ReactElement {
  const styles = VARIANT_STYLES[variant];

  return (
    <View
      className={`flex-row items-center gap-2 rounded-xl px-3 py-2.5 border ${styles.container}`}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={styles.icon} size={16} color={styles.iconColor} />
      <Text className={`${styles.text} text-sm flex-1`}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          className="min-h-11 px-2 items-center justify-center"
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text className={`${styles.text} text-sm font-bold`}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
