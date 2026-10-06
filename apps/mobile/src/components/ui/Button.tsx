import type { ReactElement } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import type { TouchableOpacityProps } from 'react-native';
import { colors } from '../../theme/tokens';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  loadingLabel?: string;
}

export function Button({
  label,
  isLoading,
  variant = 'primary',
  size = 'md',
  leftIcon,
  loadingLabel,
  disabled,
  style,
  ...rest
}: ButtonProps): ReactElement {
  const sizeClasses = {
    sm: 'px-4 min-h-11 rounded-xl',
    md: 'px-5 min-h-12 rounded-xl',
    lg: 'px-6 min-h-[52px] rounded-2xl',
  }[size];

  const bgClass = {
    primary: 'bg-blue-700',
    secondary: 'bg-blue-50',
    ghost: 'bg-transparent',
    danger: 'bg-red-50',
  }[variant];

  const textClass = {
    primary: 'text-white font-semibold',
    secondary: 'text-blue-700 font-semibold',
    ghost: 'text-blue-700 font-semibold',
    danger: 'text-red-600 font-semibold',
  }[variant];

  const textSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-base',
  }[size];

  const isDisabled = disabled || isLoading;
  const indicatorColor =
    variant === 'primary' ? colors.white : variant === 'danger' ? colors.error : colors.primary;

  return (
    <TouchableOpacity
      className={`${sizeClasses} ${bgClass} flex-row items-center justify-center gap-2 ${
        isDisabled ? 'opacity-50' : 'active:opacity-80'
      }`}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={isLoading ? `${label}, cargando` : label}
      accessibilityState={{ disabled: Boolean(isDisabled), busy: Boolean(isLoading) }}
      style={style}
      {...rest}
    >
      {isLoading ? <ActivityIndicator size="small" color={indicatorColor} /> : null}
      {!isLoading && leftIcon ? <View>{leftIcon}</View> : null}
      <Text className={`${textClass} ${textSize}`}>
        {isLoading ? (loadingLabel ?? label) : label}
      </Text>
    </TouchableOpacity>
  );
}
