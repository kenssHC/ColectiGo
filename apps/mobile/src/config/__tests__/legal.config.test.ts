import { createLegalConfig } from '../legal.config';

describe('legal config', () => {
  it('uses a non-personal development fallback', () => {
    const config = createLegalConfig({});

    expect(config.responsibleName).toBe('ColectiGO');
    expect(config.privacyEmail).toBe('');
    expect(config.audienceLabel).toBe('18+');
  });

  it('normalizes public contact values supplied by the environment', () => {
    const config = createLegalConfig({
      EXPO_PUBLIC_LEGAL_RESPONSIBLE_NAME: ' ColectiGO S.A.C. ',
      EXPO_PUBLIC_PRIVACY_EMAIL: ' privacidad@example.com ',
      EXPO_PUBLIC_SUPPORT_EMAIL: ' soporte@example.com ',
      EXPO_PUBLIC_PRIVACY_POLICY_URL: ' https://example.com/privacidad ',
      EXPO_PUBLIC_ACCOUNT_DELETION_URL: ' https://example.com/eliminar-cuenta ',
    });

    expect(config).toMatchObject({
      responsibleName: 'ColectiGO S.A.C.',
      privacyEmail: 'privacidad@example.com',
      supportEmail: 'soporte@example.com',
      privacyPolicyUrl: 'https://example.com/privacidad',
      accountDeletionUrl: 'https://example.com/eliminar-cuenta',
    });
  });
});
