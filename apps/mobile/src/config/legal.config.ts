import { LEGAL_EFFECTIVE_DATE_LABEL, LEGAL_POLICY_VERSION } from '@collectigo/shared';

const DEVELOPMENT_RESPONSIBLE_NAME = 'ColectiGO';

export interface LegalEnvironment {
  EXPO_PUBLIC_LEGAL_RESPONSIBLE_NAME?: string;
  EXPO_PUBLIC_PRIVACY_EMAIL?: string;
  EXPO_PUBLIC_SUPPORT_EMAIL?: string;
  EXPO_PUBLIC_PRIVACY_POLICY_URL?: string;
  EXPO_PUBLIC_ACCOUNT_DELETION_URL?: string;
}

export interface LegalConfig {
  responsibleName: string;
  privacyEmail: string;
  supportEmail: string;
  privacyPolicyUrl: string;
  accountDeletionUrl: string;
  audienceLabel: '18+';
  policyVersion: typeof LEGAL_POLICY_VERSION;
  effectiveDateLabel: typeof LEGAL_EFFECTIVE_DATE_LABEL;
}

function clean(value: string | undefined): string {
  return value?.trim() ?? '';
}

export function createLegalConfig(environment: LegalEnvironment): LegalConfig {
  return {
    responsibleName:
      clean(environment.EXPO_PUBLIC_LEGAL_RESPONSIBLE_NAME) || DEVELOPMENT_RESPONSIBLE_NAME,
    privacyEmail: clean(environment.EXPO_PUBLIC_PRIVACY_EMAIL),
    supportEmail: clean(environment.EXPO_PUBLIC_SUPPORT_EMAIL),
    privacyPolicyUrl: clean(environment.EXPO_PUBLIC_PRIVACY_POLICY_URL),
    accountDeletionUrl: clean(environment.EXPO_PUBLIC_ACCOUNT_DELETION_URL),
    audienceLabel: '18+',
    policyVersion: LEGAL_POLICY_VERSION,
    effectiveDateLabel: LEGAL_EFFECTIVE_DATE_LABEL,
  };
}

export const legalConfig = createLegalConfig({
  EXPO_PUBLIC_LEGAL_RESPONSIBLE_NAME: process.env.EXPO_PUBLIC_LEGAL_RESPONSIBLE_NAME,
  EXPO_PUBLIC_PRIVACY_EMAIL: process.env.EXPO_PUBLIC_PRIVACY_EMAIL,
  EXPO_PUBLIC_SUPPORT_EMAIL: process.env.EXPO_PUBLIC_SUPPORT_EMAIL,
  EXPO_PUBLIC_PRIVACY_POLICY_URL: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL,
  EXPO_PUBLIC_ACCOUNT_DELETION_URL: process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL,
});
