import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import type { TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
}

export function Button({
  label,
  isLoading,
  variant = 'primary',
  size = 'md',
  leftIcon,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const sizeClasses = {
    sm: 'px-4 py-2.5 rounded-xl',
    md: 'px-5 py-3.5 rounded-xl',
    lg: 'px-6 py-4 rounded-2xl',
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

  return (
    <TouchableOpacity
      className={`${sizeClasses} ${bgClass} flex-row items-center justify-center gap-2 ${
        isDisabled ? 'opacity-50' : 'active:opacity-80'
      }`}
      disabled={isDisabled}
      style={style}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#ffffff' : '#1D4ED8'}
        />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text className={`${textClass} ${textSize}`}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
