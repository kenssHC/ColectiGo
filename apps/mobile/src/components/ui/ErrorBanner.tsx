import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorBannerProps {
  message: string;
  variant?: 'error' | 'info';
}

const VARIANT_STYLES = {
  error: {
    container: 'bg-red-50 border-red-100',
    text: 'text-red-600',
    icon: 'alert-circle-outline' as const,
    iconColor: '#DC2626',
  },
  info: {
    container: 'bg-blue-50 border-blue-100',
    text: 'text-blue-700',
    icon: 'information-circle-outline' as const,
    iconColor: '#1D4ED8',
  },
};

export function ErrorBanner({ message, variant = 'error' }: ErrorBannerProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <View
      className={`flex-row items-center gap-2 rounded-xl px-3 py-2.5 border ${styles.container}`}
      accessibilityRole="alert"
    >
      <Ionicons name={styles.icon} size={16} color={styles.iconColor} />
      <Text className={`${styles.text} text-sm flex-1`}>{message}</Text>
    </View>
  );
}
