export const colors = {
  primary: '#1D4ED8',
  primaryPressed: '#1E40AF',
  primaryContainer: '#DBEAFE',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  border: '#CBD5E1',
  borderSubtle: '#E2E8F0',
  success: '#15803D',
  successContainer: '#DCFCE7',
  warning: '#B45309',
  warningContainer: '#FEF3C7',
  error: '#B91C1C',
  errorContainer: '#FEE2E2',
  transfer: '#7E22CE',
  walk: '#B45309',
  destination: '#B91C1C',
  white: '#FFFFFF',
} as const;

export const mapPathColors = {
  walkOutline: '#FFFFFF',
  walkCenter: '#111827',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 38 },
  title: { fontSize: 22, lineHeight: 28 },
  subtitle: { fontSize: 18, lineHeight: 24 },
  body: { fontSize: 16, lineHeight: 24 },
  bodySmall: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
} as const;

export const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

export const shadows = {
  floating: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
} as const;
